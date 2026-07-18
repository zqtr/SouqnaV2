import type { IgFetchResult } from '../types';
import type { InstagramProvider } from '../provider';

/**
 * Deterministic fixture provider (`IG_IMPORT_USE_MOCK=1`) so the whole
 * /begin import flow — fetch, vision analysis, chat review, final
 * insert — can be exercised without an Apify account or a real profile.
 * The six posts intentionally cover every review-chat branch: English
 * price, Arabic-Indic price, DM-for-price, a lifestyle non-product, a
 * priceless product, and a sized product. Image URLs are Unsplash photos
 * already used elsewhere in the repo (stable, no re-hosting needed).
 * Exported for the unit tests.
 */

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

export const MOCK_FETCH_RESULT: IgFetchResult = {
  profile: {
    handle: 'mock.souq.studio',
    fullName: 'Mock Souq Studio',
    bio: 'Curated accessories & modest wear, made in Doha. إكسسوارات وأزياء محتشمة. Worldwide shipping.',
    profilePicUrl: img('1438761681033-6461ffad8d80'),
    isPrivate: false,
    followers: 12400,
    externalUrl: null,
  },
  // Images must plausibly *be* product shots or the vision model
  // (correctly) marks them non-products and the review chat has
  // nothing to ask.
  posts: [
    {
      id: 'mock-1',
      shortcode: 'MOCKAAA1',
      caption: 'Minimal leather-strap watch, sapphire glass. 250 QR — DM to order 🖤',
      imageUrl: img('1523275335684-37898b6baf30'),
      takenAt: '2026-07-01T10:00:00.000Z',
    },
    {
      id: 'mock-2',
      shortcode: 'MOCKAAA2',
      caption: 'عطر عود فاخر ٥٠ مل، تركيبة خاصة. السعر ٣٥٠ ر.ق. متوفر الآن.',
      imageUrl: img('1541643600914-78b084683601'),
      takenAt: '2026-06-24T10:00:00.000Z',
    },
    {
      id: 'mock-3',
      shortcode: 'MOCKAAA3',
      caption: 'New drop ✨ limited pieces. السعر بالخاص',
      imageUrl: img('1584917865442-de89df76afd3'),
      takenAt: '2026-06-18T10:00:00.000Z',
    },
    {
      id: 'mock-4',
      shortcode: 'MOCKAAA4',
      caption: 'Behind the scenes from our summer shoot 🎬 thank you Doha!',
      imageUrl: img('1492684223066-81342ee5ff30'),
      takenAt: '2026-06-10T10:00:00.000Z',
    },
    {
      id: 'mock-5',
      shortcode: 'MOCKAAA5',
      caption: 'Handpicked linen two-piece set — limited pieces, each one unique.',
      imageUrl: img('1445205170230-053b83016050'),
      takenAt: '2026-06-02T10:00:00.000Z',
    },
    {
      id: 'mock-6',
      shortcode: 'MOCKAAA6',
      caption: 'Runner sneaker in crimson. QAR 120. متوفر الآن',
      imageUrl: img('1542291026-7eec264c27ff'),
      takenAt: '2026-05-27T10:00:00.000Z',
    },
  ],
};

export const mockProvider: InstagramProvider = {
  id: 'mock',
  async start(handle, maxPosts) {
    return {
      kind: 'immediate',
      result: {
        profile: { ...MOCK_FETCH_RESULT.profile, handle },
        posts: MOCK_FETCH_RESULT.posts.slice(0, maxPosts),
      },
    };
  },
  async poll() {
    // start() is always immediate; polling a mock run is a caller bug.
    return { status: 'failed', reason: 'mock provider does not poll' };
  },
};
