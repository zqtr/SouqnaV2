import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PRO_COMPILER_VERSION } from '@/lib/proRuntime';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { version: string } },
): Promise<Response> {
  if (params.version !== PRO_COMPILER_VERSION) {
    return new Response('Compiler version not found.', { status: 404 });
  }
  const path = join(process.cwd(), 'node_modules', 'esbuild-wasm', 'esbuild.wasm');
  const bytes = await readFile(path);
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/wasm',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
