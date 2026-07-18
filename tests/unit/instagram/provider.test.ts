import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapApifyItems } from '@/lib/instagram/providers/apify';
import { MOCK_FETCH_RESULT, mockProvider } from '@/lib/instagram/providers/mock';

const originalEnv = { ...process.env };

function setEnv(name: string, value: string) {
  (process.env as Record<string, string | undefined>)[name] = value;
}

function unsetEnv(name: string) {
  delete (process.env as Record<string, string | undefined>)[name];
}

/**
 * `mapApifyItems` is the one place the actor's item shape is interpreted;
 * these fixtures pin the `resultsType:'details'` contract (profile item
 * with nested latestPosts) plus the failure rows so a live actor-version
 * drift breaks a test before it breaks onboarding.
 */
describe('mapApifyItems', () => {
  const detailsFixture = [
    {
      username: 'dohathreads',
      fullName: 'Doha Threads',
      biography: 'Modest wear • Doha',
      profilePicUrlHD: 'https://scontent.example/profile-hd.jpg',
      followersCount: 8200,
      externalUrl: 'https://dohathreads.qa',
      private: false,
      latestPosts: [
        {
          id: '101',
          shortCode: 'AbC101',
          caption: 'Linen set — 300 QR',
          displayUrl: 'https://scontent.example/p101.jpg',
          type: 'Image',
          timestamp: '2026-07-01T08:00:00.000Z',
        },
        {
          id: '102',
          shortCode: 'AbC102',
          caption: 'Reel: summer drop',
          displayUrl: 'https://scontent.example/p102.jpg',
          type: 'Video',
        },
        {
          id: '103',
          shortCode: 'AbC103',
          caption: 'Sidecar look',
          type: 'Sidecar',
          displayUrl: 'https://scontent.example/p103-cover.jpg',
          childPosts: [
            { type: 'Video', displayUrl: 'https://scontent.example/p103-video.jpg' },
            { type: 'Image', displayUrl: 'https://scontent.example/p103-child.jpg' },
          ],
        },
      ],
    },
  ];

  it('maps a details item to profile + image posts, skipping videos', () => {
    const mapped = mapApifyItems(detailsFixture, 'dohathreads');
    expect(mapped.status).toBe('done');
    if (mapped.status !== 'done') return;
    expect(mapped.result.profile).toMatchObject({
      handle: 'dohathreads',
      fullName: 'Doha Threads',
      bio: 'Modest wear • Doha',
      profilePicUrl: 'https://scontent.example/profile-hd.jpg',
      followers: 8200,
      isPrivate: false,
    });
    expect(mapped.result.posts.map((p) => p.id)).toEqual(['101', '103']);
    // Sidecar prefers the first non-video child image over the cover.
    expect(mapped.result.posts[1]?.imageUrl).toBe('https://scontent.example/p103-child.jpg');
  });

  it('caps posts at maxPosts', () => {
    const mapped = mapApifyItems(detailsFixture, 'dohathreads', 1);
    if (mapped.status !== 'done') throw new Error('expected done');
    expect(mapped.result.posts).toHaveLength(1);
  });

  it('detects private profiles from the profile flag', () => {
    const mapped = mapApifyItems(
      [{ username: 'hidden', biography: '', private: true, latestPosts: [] }],
      'hidden',
    );
    expect(mapped.status).toBe('private');
  });

  it('detects private profiles from error rows', () => {
    const mapped = mapApifyItems(
      [{ error: 'restricted_page', errorDescription: 'This account is private.' }],
      'hidden',
    );
    expect(mapped.status).toBe('private');
  });

  it('fails with the actor error description when no profile item exists', () => {
    const mapped = mapApifyItems([{ error: 'no_items', errorDescription: 'Page not found' }], 'x');
    expect(mapped).toEqual({ status: 'failed', reason: 'Page not found' });
  });

  it('fails on an empty dataset', () => {
    expect(mapApifyItems([], 'x')).toEqual({ status: 'failed', reason: 'no profile data' });
  });
});

describe('mockProvider', () => {
  it('returns the fixture immediately with the requested handle and cap', async () => {
    const started = await mockProvider.start('my.shop', 3);
    expect(started.kind).toBe('immediate');
    if (started.kind !== 'immediate') return;
    expect(started.result.profile.handle).toBe('my.shop');
    expect(started.result.posts).toHaveLength(3);
    expect(started.result.posts[0]).toEqual(MOCK_FETCH_RESULT.posts[0]);
  });

  it('covers every review branch in its fixtures', () => {
    const captions = MOCK_FETCH_RESULT.posts.map((p) => p.caption ?? '');
    expect(captions.some((c) => c.includes('250 QR'))).toBe(true); // English price
    expect(captions.some((c) => c.includes('٣٥٠ ر.ق'))).toBe(true); // Arabic-Indic price
    expect(captions.some((c) => c.includes('بالخاص'))).toBe(true); // DM for price
    expect(captions.some((c) => c.includes('Behind the scenes'))).toBe(true); // non-product
  });
});

describe('resolveInstagramProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers the mock when IG_IMPORT_USE_MOCK=1', async () => {
    setEnv('IG_IMPORT_USE_MOCK', '1');
    setEnv('APIFY_TOKEN', 'apify_test_token');
    const { resolveInstagramProvider } = await import('@/lib/instagram/provider');
    expect(resolveInstagramProvider()?.id).toBe('mock');
  });

  it('uses apify when only APIFY_TOKEN is set', async () => {
    unsetEnv('IG_IMPORT_USE_MOCK');
    setEnv('APIFY_TOKEN', 'apify_test_token');
    const { resolveInstagramProvider } = await import('@/lib/instagram/provider');
    expect(resolveInstagramProvider()?.id).toBe('apify');
  });

  it('returns null (manual-only mode) when nothing is configured', async () => {
    unsetEnv('IG_IMPORT_USE_MOCK');
    unsetEnv('APIFY_TOKEN');
    const { resolveInstagramProvider } = await import('@/lib/instagram/provider');
    expect(resolveInstagramProvider()).toBeNull();
  });
});
