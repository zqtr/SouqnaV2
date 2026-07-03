'use server';

import { auth } from '@clerk/nextjs/server';
import { hasDb } from '@/lib/db';
import { getStorefront } from '@/lib/brief';
import { listPages } from '@/lib/storefrontPages';
import type { Block } from '@/lib/blocks/types';

/**
 * Read side of the Souqy IDE code view (Master Plan Phase 2).
 *
 * Loads the block document for a storefront page the signed-in founder
 * owns. Writes go through the existing `saveDraftBlocks` action in
 * `actions/builder.ts` — the IDE deliberately has no write path of its own.
 */

export type IdePageSummary = {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
};

export type IdeBlocksState =
  | {
      status: 'success';
      pages: IdePageSummary[];
      pageId: string;
      blocks: Block[];
    }
  | { status: 'error'; code: 'auth' | 'not_found' | 'unavailable' };

export async function loadIdeBlocks(
  storefrontSlug: string,
  pageId?: string,
): Promise<IdeBlocksState> {
  if (!hasDb()) return { status: 'error', code: 'unavailable' };

  const { userId } = await auth();
  if (!userId) return { status: 'error', code: 'auth' };

  const storefront = await getStorefront(storefrontSlug);
  if (!storefront) return { status: 'error', code: 'not_found' };
  if (storefront.clerkUserId !== userId) return { status: 'error', code: 'auth' };

  const pages = await listPages(storefrontSlug);
  if (!pages.length) return { status: 'error', code: 'not_found' };

  const page =
    (pageId ? pages.find((item) => item.id === pageId) : undefined) ??
    pages.find((item) => item.isHome) ??
    pages[0]!;

  return {
    status: 'success',
    pages: pages.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      isHome: item.isHome,
    })),
    pageId: page.id,
    blocks: page.draftBlocks,
  };
}
