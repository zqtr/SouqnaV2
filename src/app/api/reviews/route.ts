import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { getInstalledApp } from '@/lib/apps/installed';
import {
  DEFAULT_REVIEWS_SETTINGS,
  REVIEWS_APP_ID,
  createStorefrontReview,
  listPublishedReviews,
  normaliseReviewsSettings,
} from '@/lib/apps/reviews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ReviewPostSchema = z.object({
  store: z.string().trim().min(1).max(64),
  productId: z
    .preprocess((value) => (value === '' ? null : value), z.string().uuid().nullable().optional()),
  customerName: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(4).max(1200),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storefrontSlug = url.searchParams.get('store')?.trim();
  const productId = url.searchParams.get('productId')?.trim() || null;
  if (!storefrontSlug) {
    return NextResponse.json({ ok: false, error: 'store param required' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  const rl = rateLimit(`reviews:get:${ip}:${storefrontSlug}`, 90, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate limited' },
      { status: 429, headers: { 'retry-after': String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  const app = await getInstalledApp(storefrontSlug, REVIEWS_APP_ID);
  if (!app || !app.enabled) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      settings: { ...DEFAULT_REVIEWS_SETTINGS, enabled: false },
      reviews: [],
    });
  }

  const settings = normaliseReviewsSettings(app.settings);
  if (!settings.enabled) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      settings: { ...settings, enabled: false },
      reviews: [],
    });
  }

  const reviews = await listPublishedReviews(storefrontSlug, settings, productId);
  return NextResponse.json(
    { ok: true, enabled: true, settings, reviews },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  const body = await request.json().catch(() => null);
  const parsed = ReviewPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid review.' }, { status: 400 });
  }

  const storefrontSlug = parsed.data.store;
  const rl = rateLimit(`reviews:post:${ip}:${storefrontSlug}`, 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'Please wait before sending another review.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  const app = await getInstalledApp(storefrontSlug, REVIEWS_APP_ID);
  if (!app || !app.enabled) {
    return NextResponse.json(
      { ok: false, error: 'Reviews are not enabled on this storefront.' },
      { status: 404 },
    );
  }
  const settings = normaliseReviewsSettings(app.settings);
  if (!settings.enabled || !settings.allowVisitorSubmissions) {
    return NextResponse.json(
      { ok: false, error: 'Review submissions are not open right now.' },
      { status: 403 },
    );
  }

  const status = settings.autoPublish ? 'published' : 'pending';
  const review = await createStorefrontReview({
    storefrontSlug,
    productId: parsed.data.productId ?? null,
    customerName: parsed.data.customerName,
    rating: parsed.data.rating,
    title: parsed.data.title ?? null,
    body: parsed.data.body,
    status,
  });

  return NextResponse.json({
    ok: true,
    status,
    review: status === 'published' ? review : null,
  });
}
