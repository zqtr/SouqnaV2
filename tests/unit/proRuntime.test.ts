import { describe, expect, it } from 'vitest';
import {
  isAllowedProRuntimeImport,
  isCurrentProCompilerResponse,
  parseProFrameChildMessage,
  parseProFrameParentMessage,
} from '@/lib/proRuntime';
import { composeProEditRequest } from '@/lib/proMode';
import { compileProRuntimeFiles, compilerErrorDiagnostics } from '@/lib/proCompiler';

describe('Souqna Code browser runtime contracts', () => {
  it('limits generated modules to the captive browser-safe resolver', () => {
    expect(isAllowedProRuntimeImport('react')).toBe(true);
    expect(isAllowedProRuntimeImport('react/jsx-runtime')).toBe(true);
    expect(isAllowedProRuntimeImport('@souqna/sdk')).toBe(true);
    expect(isAllowedProRuntimeImport('next/navigation')).toBe(false);
    expect(isAllowedProRuntimeImport('node:fs')).toBe(false);
    expect(isAllowedProRuntimeImport('https://example.com/code.js')).toBe(false);
  });

  it('rejects stale compiler responses', () => {
    expect(
      isCurrentProCompilerResponse(
        { type: 'compiled', requestId: 8, code: '', css: '', diagnostics: [] },
        9,
      ),
    ).toBe(false);
    expect(
      isCurrentProCompilerResponse({ type: 'compile_error', requestId: 9, diagnostics: [] }, 9),
    ).toBe(true);
  });

  it('requires the exact per-mount channel on parent and frame messages', () => {
    const parent = {
      type: 'souqna:pro-runtime:update',
      channelId: 'channel-a',
      requestId: 4,
      code: 'module.exports = {}',
      css: '',
    };
    expect(parseProFrameParentMessage(parent, 'channel-a')).toEqual(parent);
    expect(parseProFrameParentMessage(parent, 'channel-b')).toBeNull();
    expect(
      parseProFrameChildMessage({
        type: 'souqna:pro-runtime:rendered',
        channelId: 'channel-a',
        requestId: 4,
      }),
    ).toMatchObject({ channelId: 'channel-a', requestId: 4 });
    expect(parseProFrameChildMessage({ type: 'souqna:pro-runtime:rendered' })).toBeNull();
  });

  it('keeps localized labels out of the canonical model instruction', () => {
    expect(
      composeProEditRequest({
        request: 'وسّع المساحة حول العنوان',
        target: 'hero',
        intent: 'arabic',
      }),
    ).toBe('Edit target: hero.\nEdit intent: arabic.\nوسّع المساحة حول العنوان');
  });

  it('compiles the real three-file module graph with esbuild-wasm', async () => {
    const result = await compileProRuntimeFiles({
      'index.tsx': [
        "import { Hero } from '@souqna/sdk';",
        "import { theme } from './theme';",
        'export default function Storefront() {',
        "  return <main data-palette={theme.palette}><Hero title=\"Test storefront\" /></main>;",
        '}',
      ].join('\n'),
      'theme.ts': "export const theme = { palette: 'sand_gold' } as const;",
      'styles.css': 'main { min-height: 100vh; }',
    });

    expect(result.code).toContain('Test storefront');
    expect(result.code).toContain('sourceMappingURL=data:application/json');
    expect(result.css).toBe('main { min-height: 100vh; }');
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects imports outside the captive runtime', async () => {
    try {
      await compileProRuntimeFiles({
        'index.tsx': "import router from 'next/router'; export default function Storefront(){ return <main>{String(router)}</main> }",
        'theme.ts': 'export const theme = {};',
        'styles.css': '',
      });
      throw new Error('Expected the compiler to reject next/router.');
    } catch (error) {
      expect(compilerErrorDiagnostics(error)[0]?.message).toContain(
        "Import 'next/router' is not allowed",
      );
    }
  });
});
