/**
 * Instagram import — shared types.
 *
 * The import pipeline is: fetch (provider) → re-host images to Blob →
 * vision analysis → chat review → insert products after createBrief.
 * Everything downstream of the fetch only ever sees Blob URLs; the
 * signed scontent CDN URLs expire and never leave the server.
 */

export type IgProfile = {
  handle: string;
  fullName: string | null;
  bio: string | null;
  /** Re-hosted Blob URL once the fetch completes; never a scontent URL. */
  profilePicUrl: string | null;
  isPrivate: boolean;
  followers: number | null;
  externalUrl: string | null;
};

export type IgPost = {
  id: string;
  shortcode: string;
  caption: string | null;
  /** Re-hosted Blob URL (first image of a sidecar; video posts are skipped). */
  imageUrl: string | null;
  takenAt: string | null;
};

export type IgFetchResult = {
  profile: IgProfile;
  posts: IgPost[];
};

/** A gap in a draft that the review chat should ask the merchant about. */
export type DraftGap = 'price' | 'title' | 'category' | 'sizes' | 'is_product';

export type DraftProduct = {
  postId: string;
  isProduct: boolean;
  /** Model's 0..1 confidence that this post is a sellable product. */
  confidence: number;
  titleEn: string | null;
  titleAr: string | null;
  description: string | null;
  priceQar: number | null;
  /** Caption says "DM for price" / "السعر بالخاص" — priced privately. */
  dmForPrice: boolean;
  category: string | null;
  sizeOptions: string[];
  variantOptions: string[];
  imageUrl: string | null;
  sourceUrl: string | null;
  gaps: DraftGap[];
};

/** Aggregate suggestions derived from the whole feed (batch 1 only). */
export type StoreSuggestions = {
  /** One of createBrief's businessType enum values, or null. */
  businessType: string | null;
  /** One of TEMPLATE_IDS, or null. */
  templateId: string | null;
  brandNote: string | null;
};

export const MAX_IG_POSTS = 20;
export const ANALYZE_BATCH_SIZE = 4;
