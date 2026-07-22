/// <reference lib="webworker" />

import * as esbuild from 'esbuild-wasm';
import {
  compileProRuntimeFiles,
  compilerErrorDiagnostics,
} from '@/lib/proCompiler';
import {
  PRO_COMPILER_VERSION,
  type ProCompilerRequest,
  type ProCompilerResponse,
} from '@/lib/proRuntime';

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;
let initialized: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = esbuild.initialize({
      wasmURL: `/api/pro/compiler/${PRO_COMPILER_VERSION}/esbuild.wasm`,
      worker: false,
    });
  }
  return initialized;
}

workerScope.addEventListener('message', (event: MessageEvent<ProCompilerRequest>) => {
  if (event.data?.type !== 'compile') return;
  void compile(event.data);
});

async function compile(request: ProCompilerRequest): Promise<void> {
  try {
    await ensureInitialized();
    const artifact = await compileProRuntimeFiles(request.files);
    const response: ProCompilerResponse = {
      type: 'compiled',
      requestId: request.requestId,
      ...artifact,
    };
    workerScope.postMessage(response);
  } catch (error) {
    const response: ProCompilerResponse = {
      type: 'compile_error',
      requestId: request.requestId,
      diagnostics: compilerErrorDiagnostics(error),
    };
    workerScope.postMessage(response);
  }
}

void ensureInitialized()
  .then(() => workerScope.postMessage({ type: 'ready' } satisfies ProCompilerResponse))
  .catch((error) => {
    workerScope.postMessage({ type: 'compile_error', requestId: 0, diagnostics: compilerErrorDiagnostics(error) } satisfies ProCompilerResponse);
  });
