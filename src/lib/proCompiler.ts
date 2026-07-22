import * as esbuild from 'esbuild-wasm';
import { isAllowedProRuntimeImport, type ProRuntimeDiagnostic } from '@/lib/proRuntime';
import type { SouqySourceFiles } from '@/lib/souqy/source';

export type ProRuntimeArtifact = {
  code: string;
  css: string;
  diagnostics: ProRuntimeDiagnostic[];
};

export function diagnosticsFromEsbuildMessages(
  messages: esbuild.Message[],
): ProRuntimeDiagnostic[] {
  return messages.map((message) => ({
    file: message.location?.file || 'index.tsx',
    line: message.location?.line ?? null,
    column: message.location?.column ?? null,
    message: message.text,
  }));
}

export function compilerErrorDiagnostics(error: unknown): ProRuntimeDiagnostic[] {
  if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
    return diagnosticsFromEsbuildMessages(error.errors as esbuild.Message[]);
  }
  return [
    {
      file: 'runtime',
      line: null,
      column: null,
      message: error instanceof Error ? error.message : 'The instant draft could not compile.',
    },
  ];
}

export async function compileProRuntimeFiles(
  files: SouqySourceFiles,
): Promise<ProRuntimeArtifact> {
  const result = await esbuild.build({
    stdin: {
      contents: [
        "import Storefront from './index.tsx';",
        "import { theme } from './theme.ts';",
        'export { theme };',
        'export default Storefront;',
      ].join('\n'),
      resolveDir: '/',
      sourcefile: 'entry.tsx',
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'cjs',
    target: ['chrome120', 'safari17'],
    jsx: 'automatic',
    sourcemap: 'inline',
    logLevel: 'silent',
    external: ['react', 'react/jsx-runtime', '@souqna/sdk'],
    plugins: [
      {
        name: 'souqna-pro-virtual-files',
        setup(build) {
          // esbuild plugin filters use Go regular expressions. JavaScript-only
          // flags such as `u` are invalid even though the same RegExp works in
          // the browser, so these filters deliberately have no flags.
          build.onResolve({ filter: /^\.\/(index\.tsx|theme(?:\.ts)?|styles\.css)$/ }, (args) => {
            const raw = args.path.replace(/^\.\//, '');
            const path = raw === 'theme' ? 'theme.ts' : raw;
            return { path, namespace: 'souqna-pro' };
          });
          build.onResolve({ filter: /^[^./]/ }, (args) => {
            if (isAllowedProRuntimeImport(args.path)) {
              return { path: args.path, external: true };
            }
            return { errors: [{ text: `Import '${args.path}' is not allowed in Souqna Code.` }] };
          });
          build.onLoad({ filter: /.*/, namespace: 'souqna-pro' }, (args) => {
            if (args.path === 'index.tsx') {
              return { contents: files['index.tsx'], loader: 'tsx', resolveDir: '/' };
            }
            if (args.path === 'theme.ts') {
              return { contents: files['theme.ts'], loader: 'ts', resolveDir: '/' };
            }
            if (args.path === 'styles.css') {
              return { contents: '', loader: 'css', resolveDir: '/' };
            }
            return { errors: [{ text: `Unknown virtual file '${args.path}'.` }] };
          });
        },
      },
    ],
  });
  const javascript = result.outputFiles.find(
    (file) => file.path.endsWith('.js') || file.path === '<stdout>',
  );
  if (!javascript) throw new Error('The compiler did not produce a JavaScript artifact.');
  return {
    code: javascript.text,
    css: files['styles.css'] ?? '',
    diagnostics: diagnosticsFromEsbuildMessages(result.warnings),
  };
}
