import 'server-only';
import { put } from '@vercel/blob';
import type { IgFetchResult, IgPost } from './types';

/**
 * Instagram scontent CDN URLs are signed and expire within hours. Every
 * image the import touches is re-hosted to Vercel Blob the moment the
 * fetch completes, so the vision call, the chat preview, and the final
 * `insertProduct` all work from stable URLs — the signed originals never
 * leave the server. Mirrors the validation in
 * `src/lib/apps/souqnasource/image.ts` (5MB cap, raster allowlist).
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const CONCURRENCY = 4;

export async function rehostInstagramImage(opts: {
  imageUrl: string;
  importId: string;
  /** e.g. 'profile' | 'post-<id>' | 'manual-<uuid>' */
  name: string;
}): Promise<string | null> {
  try {
    const res = await fetch(opts.imageUrl);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (!ALLOWED.has(ct)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return null;
    const ext = ct === 'image/jpeg' ? 'jpg' : ct === 'image/webp' ? 'webp' : 'png';
    const path = `instagram-imports/${opts.importId}/${opts.name}.${ext}`;
    const blob = await put(path, buf, { access: 'public', contentType: ct });
    return blob.url;
  } catch {
    return null;
  }
}

/**
 * Re-host the profile picture and every post image, concurrency-capped.
 * Posts whose image fails to re-host are dropped — a post without an
 * image can't be analyzed or sold. ~21 images at concurrency 4 stays
 * well inside one server-action invocation.
 */
export async function rehostFetchResult(
  raw: IgFetchResult,
  importId: string,
): Promise<IgFetchResult> {
  const jobs: Array<() => Promise<void>> = [];
  let profilePicUrl: string | null = null;
  const rehostedPosts = new Map<string, string>();

  if (raw.profile.profilePicUrl) {
    const source = raw.profile.profilePicUrl;
    jobs.push(async () => {
      profilePicUrl = await rehostInstagramImage({ imageUrl: source, importId, name: 'profile' });
    });
  }
  for (const post of raw.posts) {
    if (!post.imageUrl) continue;
    const source = post.imageUrl;
    jobs.push(async () => {
      const url = await rehostInstagramImage({
        imageUrl: source,
        importId,
        name: `post-${post.id}`,
      });
      if (url) rehostedPosts.set(post.id, url);
    });
  }

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    await Promise.all(jobs.slice(i, i + CONCURRENCY).map((job) => job()));
  }

  const posts: IgPost[] = raw.posts
    .map((post) => ({ ...post, imageUrl: rehostedPosts.get(post.id) ?? null }))
    .filter((post) => post.imageUrl !== null);

  return { profile: { ...raw.profile, profilePicUrl }, posts };
}
