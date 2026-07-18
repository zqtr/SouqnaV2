import 'server-only';
import { env } from '@/lib/env';
import type { IgFetchResult } from './types';
import { mockProvider } from './providers/mock';
import { apifyProvider } from './providers/apify';

/**
 * Pluggable Instagram fetch. Two implementations today — a deterministic
 * mock (dev/tests, `IG_IMPORT_USE_MOCK=1`) and an Apify scraper actor.
 * A future official Meta Graph provider slots in here without touching
 * anything downstream: implement the interface, add a branch to
 * `resolveInstagramProvider`.
 *
 * `start` is non-blocking on purpose: a live scrape takes 30–90s, far
 * beyond a server action's budget, so real providers return a `runId`
 * the client polls. Result images are raw provider URLs — the poll
 * *action* re-hosts them to Blob before anything reaches the client.
 */

export type InstagramFetchStart =
  | { kind: 'immediate'; result: IgFetchResult }
  | { kind: 'polling'; runId: string };

export type InstagramPollResult =
  | { status: 'running' }
  | { status: 'done'; result: IgFetchResult }
  | { status: 'private' }
  | { status: 'failed'; reason: string };

export interface InstagramProvider {
  id: 'apify' | 'mock';
  start(handle: string, maxPosts: number): Promise<InstagramFetchStart>;
  poll(runId: string, handle: string): Promise<InstagramPollResult>;
}

/** null → no fetch capability; the UI offers manual upload only. */
export function resolveInstagramProvider(): InstagramProvider | null {
  if (env.IG_IMPORT_USE_MOCK) return mockProvider;
  if (env.APIFY_TOKEN || process.env.APIFY_TOKEN) return apifyProvider;
  return null;
}
