import { unstable_noStore as noStore } from 'next/cache';
import { db } from '@/lib/db';
import { getInstalledApp } from './installed';

export const REVIEWS_APP_ID = 'reviews';

export type ReviewStatus = 'pending' | 'published' | 'hidden';
export type ReviewsSort = 'featured_first' | 'newest' | 'highest_rating';

export type ReviewsSettings = {
  enabled: boolean;
  allowVisitorSubmissions: boolean;
  autoPublish: boolean;
  showReviewerName: boolean;
  showReviewTitle: boolean;
  showReviewDate: boolean;
  showAverageRating: boolean;
  minimumRating: number;
  maxVisible: number;
  sort: ReviewsSort;
};

export type StorefrontReview = {
  id: string;
  storefrontSlug: string;
  productId: string | null;
  productTitle: string | null;
  customerName: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  isFeatured: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
};

type ReviewRow = {
  id: string;
  storefront_slug: string;
  product_id: string | null;
  product_title?: string | null;
  customer_name: string;
  rating: number | string;
  title: string | null;
  body: string;
  status: ReviewStatus;
  is_featured: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_REVIEWS_SETTINGS: ReviewsSettings = {
  enabled: true,
  allowVisitorSubmissions: true,
  autoPublish: false,
  showReviewerName: true,
  showReviewTitle: true,
  showReviewDate: true,
  showAverageRating: true,
  minimumRating: 1,
  maxVisible: 6,
  sort: 'featured_first',
};

export function normaliseReviewsSettings(value: unknown): ReviewsSettings {
  const raw =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const maxVisible = Number(raw.maxVisible);
  const minimumRating = Number(raw.minimumRating);
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_REVIEWS_SETTINGS.enabled,
    allowVisitorSubmissions:
      typeof raw.allowVisitorSubmissions === 'boolean'
        ? raw.allowVisitorSubmissions
        : DEFAULT_REVIEWS_SETTINGS.allowVisitorSubmissions,
    autoPublish:
      typeof raw.autoPublish === 'boolean' ? raw.autoPublish : DEFAULT_REVIEWS_SETTINGS.autoPublish,
    showReviewerName:
      typeof raw.showReviewerName === 'boolean'
        ? raw.showReviewerName
        : DEFAULT_REVIEWS_SETTINGS.showReviewerName,
    showReviewTitle:
      typeof raw.showReviewTitle === 'boolean'
        ? raw.showReviewTitle
        : DEFAULT_REVIEWS_SETTINGS.showReviewTitle,
    showReviewDate:
      typeof raw.showReviewDate === 'boolean'
        ? raw.showReviewDate
        : DEFAULT_REVIEWS_SETTINGS.showReviewDate,
    showAverageRating:
      typeof raw.showAverageRating === 'boolean'
        ? raw.showAverageRating
        : DEFAULT_REVIEWS_SETTINGS.showAverageRating,
    minimumRating:
      Number.isFinite(minimumRating) && minimumRating >= 1 && minimumRating <= 5
        ? Math.round(minimumRating)
        : DEFAULT_REVIEWS_SETTINGS.minimumRating,
    maxVisible:
      Number.isFinite(maxVisible) && maxVisible >= 1 && maxVisible <= 24
        ? Math.round(maxVisible)
        : DEFAULT_REVIEWS_SETTINGS.maxVisible,
    sort: isReviewsSort(raw.sort) ? raw.sort : DEFAULT_REVIEWS_SETTINGS.sort,
  };
}

export async function getReviewsSettings(storefrontSlug: string): Promise<ReviewsSettings> {
  noStore();
  const app = await getInstalledApp(storefrontSlug, REVIEWS_APP_ID);
  if (!app || !app.enabled) {
    return { ...DEFAULT_REVIEWS_SETTINGS, enabled: false };
  }
  return normaliseReviewsSettings(app.settings);
}

export async function listReviewsForAdmin(storefrontSlug: string): Promise<StorefrontReview[]> {
  noStore();
  const rows = (await db()`
    select
      r.id::text,
      r.storefront_slug,
      r.product_id::text,
      p.title as product_title,
      r.customer_name,
      r.rating,
      r.title,
      r.body,
      r.status,
      r.is_featured,
      r.source,
      r.created_at,
      r.updated_at
    from storefront_reviews r
    left join products p
      on p.id = r.product_id
     and p.storefront_slug = r.storefront_slug
    where r.storefront_slug = ${storefrontSlug}
    order by
      case r.status when 'pending' then 0 when 'published' then 1 else 2 end,
      r.created_at desc
  `) as unknown as ReviewRow[];
  return rows.map(fromReviewRow);
}

export async function listPublishedReviews(
  storefrontSlug: string,
  settings: ReviewsSettings,
  productId?: string | null,
): Promise<StorefrontReview[]> {
  noStore();
  if (!settings.enabled) return [];
  const limit = Math.max(1, Math.min(24, settings.maxVisible));
  const minRating = Math.max(1, Math.min(5, settings.minimumRating));

  if (settings.sort === 'highest_rating') {
    return runPublishedReviewsQuery({
      storefrontSlug,
      productId,
      limit,
      minRating,
      sort: 'highest_rating',
    });
  }
  if (settings.sort === 'newest') {
    return runPublishedReviewsQuery({
      storefrontSlug,
      productId,
      limit,
      minRating,
      sort: 'newest',
    });
  }
  return runPublishedReviewsQuery({
    storefrontSlug,
    productId,
    limit,
    minRating,
    sort: 'featured_first',
  });
}

export async function createStorefrontReview(input: {
  storefrontSlug: string;
  productId?: string | null;
  customerName: string;
  rating: number;
  title?: string | null;
  body: string;
  status: ReviewStatus;
  source?: string;
}): Promise<StorefrontReview> {
  const customerName = cleanText(input.customerName, 80);
  const title = cleanText(input.title ?? '', 120) || null;
  const body = cleanText(input.body, 1200);
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  if (!customerName) throw new Error('customerName is required');
  if (!body) throw new Error('body is required');

  const rows = (await db()`
    insert into storefront_reviews (
      storefront_slug, product_id, customer_name, rating, title, body, status, source
    ) values (
      ${input.storefrontSlug},
      ${input.productId ?? null},
      ${customerName},
      ${rating},
      ${title},
      ${body},
      ${input.status},
      ${input.source ?? 'storefront'}
    )
    returning
      id::text,
      storefront_slug,
      product_id::text,
      null::text as product_title,
      customer_name,
      rating,
      title,
      body,
      status,
      is_featured,
      source,
      created_at,
      updated_at
  `) as unknown as ReviewRow[];
  const row = rows[0];
  if (!row) throw new Error('review insert failed');
  return fromReviewRow(row);
}

export async function updateReviewStatus(
  storefrontSlug: string,
  reviewId: string,
  status: ReviewStatus,
): Promise<StorefrontReview | null> {
  const rows = (await db()`
    update storefront_reviews
    set status = ${status}, updated_at = now()
    where storefront_slug = ${storefrontSlug}
      and id = ${reviewId}
    returning
      id::text,
      storefront_slug,
      product_id::text,
      null::text as product_title,
      customer_name,
      rating,
      title,
      body,
      status,
      is_featured,
      source,
      created_at,
      updated_at
  `) as unknown as ReviewRow[];
  return rows[0] ? fromReviewRow(rows[0]) : null;
}

export async function updateReviewFeatured(
  storefrontSlug: string,
  reviewId: string,
  isFeatured: boolean,
): Promise<StorefrontReview | null> {
  const rows = (await db()`
    update storefront_reviews
    set is_featured = ${isFeatured}, updated_at = now()
    where storefront_slug = ${storefrontSlug}
      and id = ${reviewId}
    returning
      id::text,
      storefront_slug,
      product_id::text,
      null::text as product_title,
      customer_name,
      rating,
      title,
      body,
      status,
      is_featured,
      source,
      created_at,
      updated_at
  `) as unknown as ReviewRow[];
  return rows[0] ? fromReviewRow(rows[0]) : null;
}

export async function deleteReview(storefrontSlug: string, reviewId: string): Promise<boolean> {
  const rows = (await db()`
    delete from storefront_reviews
    where storefront_slug = ${storefrontSlug}
      and id = ${reviewId}
    returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

async function runPublishedReviewsQuery(input: {
  storefrontSlug: string;
  productId?: string | null;
  limit: number;
  minRating: number;
  sort: ReviewsSort;
}): Promise<StorefrontReview[]> {
  const { storefrontSlug, productId, limit, minRating, sort } = input;
  if (productId) {
    if (sort === 'highest_rating') {
      const rows = (await db()`
        select
          r.id::text,
          r.storefront_slug,
          r.product_id::text,
          p.title as product_title,
          r.customer_name,
          r.rating,
          r.title,
          r.body,
          r.status,
          r.is_featured,
          r.source,
          r.created_at,
          r.updated_at
        from storefront_reviews r
        left join products p
          on p.id = r.product_id
         and p.storefront_slug = r.storefront_slug
        where r.storefront_slug = ${storefrontSlug}
          and r.status = 'published'
          and r.rating >= ${minRating}
          and (r.product_id is null or r.product_id::text = ${productId})
        order by r.is_featured desc, r.rating desc, r.created_at desc
        limit ${limit}
      `) as unknown as ReviewRow[];
      return rows.map(fromReviewRow);
    }
    if (sort === 'newest') {
      const rows = (await db()`
        select
          r.id::text,
          r.storefront_slug,
          r.product_id::text,
          p.title as product_title,
          r.customer_name,
          r.rating,
          r.title,
          r.body,
          r.status,
          r.is_featured,
          r.source,
          r.created_at,
          r.updated_at
        from storefront_reviews r
        left join products p
          on p.id = r.product_id
         and p.storefront_slug = r.storefront_slug
        where r.storefront_slug = ${storefrontSlug}
          and r.status = 'published'
          and r.rating >= ${minRating}
          and (r.product_id is null or r.product_id::text = ${productId})
        order by r.created_at desc
        limit ${limit}
      `) as unknown as ReviewRow[];
      return rows.map(fromReviewRow);
    }
    const rows = (await db()`
      select
        r.id::text,
        r.storefront_slug,
        r.product_id::text,
        p.title as product_title,
        r.customer_name,
        r.rating,
        r.title,
        r.body,
        r.status,
        r.is_featured,
        r.source,
        r.created_at,
        r.updated_at
      from storefront_reviews r
      left join products p
        on p.id = r.product_id
       and p.storefront_slug = r.storefront_slug
      where r.storefront_slug = ${storefrontSlug}
        and r.status = 'published'
        and r.rating >= ${minRating}
        and (r.product_id is null or r.product_id::text = ${productId})
      order by r.is_featured desc, r.created_at desc
      limit ${limit}
    `) as unknown as ReviewRow[];
    return rows.map(fromReviewRow);
  }

  if (sort === 'highest_rating') {
    const rows = (await db()`
      select
        r.id::text,
        r.storefront_slug,
        r.product_id::text,
        p.title as product_title,
        r.customer_name,
        r.rating,
        r.title,
        r.body,
        r.status,
        r.is_featured,
        r.source,
        r.created_at,
        r.updated_at
      from storefront_reviews r
      left join products p
        on p.id = r.product_id
       and p.storefront_slug = r.storefront_slug
      where r.storefront_slug = ${storefrontSlug}
        and r.status = 'published'
        and r.rating >= ${minRating}
      order by r.is_featured desc, r.rating desc, r.created_at desc
      limit ${limit}
    `) as unknown as ReviewRow[];
    return rows.map(fromReviewRow);
  }
  if (sort === 'newest') {
    const rows = (await db()`
      select
        r.id::text,
        r.storefront_slug,
        r.product_id::text,
        p.title as product_title,
        r.customer_name,
        r.rating,
        r.title,
        r.body,
        r.status,
        r.is_featured,
        r.source,
        r.created_at,
        r.updated_at
      from storefront_reviews r
      left join products p
        on p.id = r.product_id
       and p.storefront_slug = r.storefront_slug
      where r.storefront_slug = ${storefrontSlug}
        and r.status = 'published'
        and r.rating >= ${minRating}
      order by r.created_at desc
      limit ${limit}
    `) as unknown as ReviewRow[];
    return rows.map(fromReviewRow);
  }
  const rows = (await db()`
    select
      r.id::text,
      r.storefront_slug,
      r.product_id::text,
      p.title as product_title,
      r.customer_name,
      r.rating,
      r.title,
      r.body,
      r.status,
      r.is_featured,
      r.source,
      r.created_at,
      r.updated_at
    from storefront_reviews r
    left join products p
      on p.id = r.product_id
     and p.storefront_slug = r.storefront_slug
    where r.storefront_slug = ${storefrontSlug}
      and r.status = 'published'
      and r.rating >= ${minRating}
    order by r.is_featured desc, r.created_at desc
    limit ${limit}
  `) as unknown as ReviewRow[];
  return rows.map(fromReviewRow);
}

function fromReviewRow(row: ReviewRow): StorefrontReview {
  return {
    id: row.id,
    storefrontSlug: row.storefront_slug,
    productId: row.product_id,
    productTitle: row.product_title ?? null,
    customerName: row.customer_name,
    rating: Number(row.rating) || 0,
    title: row.title,
    body: row.body,
    status: row.status,
    isFeatured: row.is_featured,
    source: row.source,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function cleanText(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function isReviewsSort(value: unknown): value is ReviewsSort {
  return value === 'featured_first' || value === 'newest' || value === 'highest_rating';
}
