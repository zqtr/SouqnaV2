import type { SouqySourceFiles } from '@/lib/souqy/source';

export const PRO_COMPILER_VERSION = '0.28.1';

export type ProRuntimeDiagnostic = {
  file: string;
  line: number | null;
  column: number | null;
  message: string;
};

export type ProCompilerRequest = {
  type: 'compile';
  requestId: number;
  files: SouqySourceFiles;
};

export type ProCompilerResponse =
  | { type: 'ready' }
  | {
      type: 'compiled';
      requestId: number;
      code: string;
      css: string;
      diagnostics: ProRuntimeDiagnostic[];
    }
  | {
      type: 'compile_error';
      requestId: number;
      diagnostics: ProRuntimeDiagnostic[];
    };

export type ProFrameParentMessage = {
  type: 'souqna:pro-runtime:update';
  channelId: string;
  requestId: number;
  code: string;
  css: string;
};

export const PRO_RUNTIME_IMPORTS = ['react', 'react/jsx-runtime', '@souqna/sdk'] as const;

export function isAllowedProRuntimeImport(value: string): boolean {
  return (PRO_RUNTIME_IMPORTS as readonly string[]).includes(value);
}

export function isCurrentProCompilerResponse(
  response: Exclude<ProCompilerResponse, { type: 'ready' }>,
  latestRequestId: number,
): boolean {
  return response.requestId === latestRequestId;
}

export function parseProFrameParentMessage(
  value: unknown,
  channelId: string,
): ProFrameParentMessage | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (
    message.type !== 'souqna:pro-runtime:update' ||
    message.channelId !== channelId ||
    typeof message.requestId !== 'number' ||
    typeof message.code !== 'string' ||
    typeof message.css !== 'string'
  ) {
    return null;
  }
  return {
    type: message.type,
    channelId,
    requestId: message.requestId,
    code: message.code,
    css: message.css,
  };
}

export type ProFrameChildMessage =
  | { type: 'souqna:pro-runtime:ready'; channelId: string }
  | { type: 'souqna:pro-runtime:rendered'; channelId: string; requestId: number }
  | {
      type: 'souqna:pro-runtime:runtime_error';
      channelId: string;
      requestId: number;
      message: string;
    };

export function parseProFrameChildMessage(value: unknown): ProFrameChildMessage | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (typeof message.channelId !== 'string') return null;
  if (message.type === 'souqna:pro-runtime:ready') {
    return { type: message.type, channelId: message.channelId };
  }
  if (
    message.type === 'souqna:pro-runtime:rendered' &&
    typeof message.requestId === 'number'
  ) {
    return { type: message.type, channelId: message.channelId, requestId: message.requestId };
  }
  if (
    message.type === 'souqna:pro-runtime:runtime_error' &&
    typeof message.requestId === 'number' &&
    typeof message.message === 'string'
  ) {
    return {
      type: message.type,
      channelId: message.channelId,
      requestId: message.requestId,
      message: message.message,
    };
  }
  return null;
}
