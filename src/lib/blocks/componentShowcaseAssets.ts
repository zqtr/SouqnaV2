import type { Block } from './types';

export const COMPONENT_SHOWCASE_SLUG = 'components';

export const COMPONENT_SHOWCASE_IMAGES = {
  identityWide:
    'https://hqtcvaiou8qkkqhl.public.blob.vercel-storage.com/brand/components/souqna-identity-wide.png',
  newChapter:
    'https://hqtcvaiou8qkkqhl.public.blob.vercel-storage.com/brand/components/souqna-new-chapter.png',
  revealExcellence:
    'https://hqtcvaiou8qkkqhl.public.blob.vercel-storage.com/brand/components/souqna-reveal-excellence.png',
} as const;

const BLOB_ORIGIN = 'https://hqtcvaiou8qkkqhl.public.blob.vercel-storage.com';

const IMAGE_URL_BY_FILE = {
  'souqna-identity-wide.png': COMPONENT_SHOWCASE_IMAGES.identityWide,
  'souqna-new-chapter.png': COMPONENT_SHOWCASE_IMAGES.newChapter,
  'souqna-reveal-excellence.png': COMPONENT_SHOWCASE_IMAGES.revealExcellence,
} as const;

const LOCAL_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'] as const;

export function normalizeComponentShowcaseAssetUrl(value: string): string {
  let next = value;

  for (const [fileName, blobUrl] of Object.entries(IMAGE_URL_BY_FILE)) {
    for (const origin of LOCAL_ORIGINS) {
      next = next.split(`${origin}/brand/components/${fileName}`).join(blobUrl);
    }

    if (next === `/brand/components/${fileName}`) {
      next = blobUrl;
    }

    const doubledBlobUrl = `${BLOB_ORIGIN}${blobUrl}`;
    while (next.includes(doubledBlobUrl)) {
      next = next.split(doubledBlobUrl).join(blobUrl);
    }
  }

  return next;
}

export function normalizeComponentShowcaseAssets<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeComponentShowcaseAssetUrl(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeComponentShowcaseAssets(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeComponentShowcaseAssets(entry)]),
    ) as T;
  }

  return value;
}

export function normalizeComponentShowcaseBlocks(blocks: Block[]): Block[] {
  return normalizeComponentShowcaseAssets(blocks);
}

export function hasLegacyComponentShowcaseAssets(value: unknown): boolean {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return (
    text.includes('localhost:3000/brand/components/souqna-') ||
    text.includes('localhost:3001/brand/components/souqna-') ||
    text.includes('"/brand/components/souqna-') ||
    text.includes(`'${'/brand/components/souqna-'}`) ||
    text.includes(`${BLOB_ORIGIN}${BLOB_ORIGIN}/brand/components/souqna-`)
  );
}
