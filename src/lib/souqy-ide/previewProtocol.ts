/**
 * Typed message protocol between the Souqy IDE / Builder and the storefront
 * preview iframe (Master Plan Phase 3).
 *
 * The wire format predates this module (see `PreviewBridge.tsx`), so the
 * shapes here document the existing contract rather than invent a new one:
 *
 *   parent → iframe: `souqna:reload`, `souqna:highlight { blockId }`
 *   iframe → parent: `souqna:select { blockId }`
 *
 * New senders/receivers should go through these helpers so the protocol has
 * one home. Client-safe, dependency-free.
 */

export type PreviewParentMessage =
  | { type: 'souqna:reload' }
  | { type: 'souqna:highlight'; blockId: string | null };

export type PreviewChildMessage = { type: 'souqna:select'; blockId: string };

export function parsePreviewChildMessage(data: unknown): PreviewChildMessage | null {
  if (!data || typeof data !== 'object') return null;
  const candidate = data as { type?: unknown; blockId?: unknown };
  if (candidate.type !== 'souqna:select') return null;
  if (typeof candidate.blockId !== 'string' || !candidate.blockId) return null;
  return { type: 'souqna:select', blockId: candidate.blockId };
}

export function postToPreview(
  iframe: HTMLIFrameElement | null,
  message: PreviewParentMessage,
): void {
  iframe?.contentWindow?.postMessage(message, window.location.origin);
}
