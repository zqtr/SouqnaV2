import 'server-only';
import { apify } from '@/lib/apps/souqnasource/clients/apify-base';
import { env } from '@/lib/env';
import type { IgFetchResult, IgPost } from '../types';
import { MAX_IG_POSTS } from '../types';
import type { InstagramProvider } from '../provider';

/**
 * Apify-backed fetch. Reuses the souqnasource `apify()` singleton but NOT
 * its blocking `runActor` — an Instagram scrape runs 30–90s, so `start`
 * kicks the actor off and the client polls `poll` until the run settles.
 *
 * The default actor is `apify/instagram-scraper` with
 * `resultsType:'details'`, which returns one profile item per requested
 * URL with a `latestPosts` array. Item shapes drift across actor
 * versions, so all mapping lives in the exported, fixture-tested
 * `mapApifyItems` and reads fields defensively.
 */

type ApifyItem = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function isVideoItem(item: ApifyItem): boolean {
  if (item.isVideo === true) return true;
  const type = str(item.type) ?? str(item.productType);
  return type !== null && /video|reel|clips/iu.test(type);
}

function toPost(item: ApifyItem): IgPost | null {
  if (isVideoItem(item)) return null;
  const shortcode = str(item.shortCode) ?? str(item.shortcode) ?? str(item.code);
  const id = str(item.id) ?? shortcode;
  if (!id) return null;
  // Sidecar posts: prefer the first child image; fall back to the cover.
  let imageUrl = str(item.displayUrl) ?? str(item.display_url) ?? str(item.imageUrl);
  const children = Array.isArray(item.childPosts) ? (item.childPosts as ApifyItem[]) : [];
  const firstImageChild = children.find((child) => !isVideoItem(child));
  if (firstImageChild) {
    imageUrl = str(firstImageChild.displayUrl) ?? str(firstImageChild.display_url) ?? imageUrl;
  }
  if (!imageUrl) return null;
  return {
    id,
    shortcode: shortcode ?? id,
    caption: str(item.caption) ?? str(item.text),
    imageUrl,
    takenAt: str(item.timestamp) ?? str(item.taken_at) ?? null,
  };
}

export function mapApifyItems(
  items: ApifyItem[],
  handle: string,
  maxPosts = MAX_IG_POSTS,
):
  | { status: 'done'; result: IgFetchResult }
  | { status: 'private' }
  | { status: 'failed'; reason: string } {
  const errorItem = items.find((item) => str(item.error) ?? str(item.errorDescription));
  const profileItem = items.find(
    (item) =>
      str(item.username) !== null &&
      (Array.isArray(item.latestPosts) || item.biography !== undefined),
  );

  if (!profileItem) {
    const reason = str(errorItem?.errorDescription) ?? str(errorItem?.error) ?? 'no profile data';
    if (/private/iu.test(reason)) return { status: 'private' };
    return { status: 'failed', reason };
  }
  if (profileItem.private === true || profileItem.isPrivate === true) {
    return { status: 'private' };
  }

  // resultsType:'details' nests posts under latestPosts; resultsType:'posts'
  // returns them as top-level items instead. Support both.
  const rawPosts = Array.isArray(profileItem.latestPosts)
    ? (profileItem.latestPosts as ApifyItem[])
    : items.filter((item) => item !== profileItem && (item.shortCode ?? item.displayUrl));

  const posts: IgPost[] = [];
  for (const raw of rawPosts) {
    const post = toPost(raw);
    if (post) posts.push(post);
    if (posts.length >= maxPosts) break;
  }

  return {
    status: 'done',
    result: {
      profile: {
        handle: str(profileItem.username) ?? handle,
        fullName: str(profileItem.fullName) ?? str(profileItem.full_name),
        bio: str(profileItem.biography),
        profilePicUrl:
          str(profileItem.profilePicUrlHD) ??
          str(profileItem.profilePicUrl) ??
          str(profileItem.profile_pic_url),
        isPrivate: false,
        followers: num(profileItem.followersCount) ?? num(profileItem.followers),
        externalUrl: str(profileItem.externalUrl) ?? str(profileItem.external_url),
      },
      posts,
    },
  };
}

export const apifyProvider: InstagramProvider = {
  id: 'apify',
  async start(handle, maxPosts) {
    const run = await apify()
      .actor(env.APIFY_INSTAGRAM_ACTOR_ID)
      .start({
        directUrls: [`https://www.instagram.com/${handle}/`],
        resultsType: 'details',
        resultsLimit: maxPosts,
        addParentData: false,
      });
    return { kind: 'polling', runId: run.id };
  },
  async poll(runId, handle) {
    const run = await apify().run(runId).get();
    if (!run) return { status: 'failed', reason: 'run not found' };
    if (run.status === 'READY' || run.status === 'RUNNING') return { status: 'running' };
    if (run.status !== 'SUCCEEDED') {
      return { status: 'failed', reason: `actor run ${run.status}` };
    }
    const { items } = await apify().dataset(run.defaultDatasetId).listItems();
    return mapApifyItems(items as ApifyItem[], handle, env.IG_IMPORT_MAX_POSTS);
  },
};
