'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { recordAudit } from '@/lib/audit';
import {
  UPGRADE_GROWTH_TOOLS_COPY,
  getPlan,
  planUnlocksIntegrations,
} from '@/lib/billing';
import { getInstalledApp, updateAppSettings } from '@/lib/apps/installed';
import {
  REVIEWS_APP_ID,
  deleteReview as deleteReviewRow,
  normaliseReviewsSettings,
  updateReviewFeatured,
  updateReviewStatus,
  type ReviewStatus,
} from '@/lib/apps/reviews';
import { assertStorefrontOwner } from '@/lib/products';

type ReviewActionState =
  | { status: 'success'; appId: 'reviews' }
  | { status: 'error'; message: string };

const ReviewsSettingsSchema = z.object({
  storefrontSlug: z.string().trim().min(1).max(64),
  settings: z.object({
    enabled: z.boolean(),
    allowVisitorSubmissions: z.boolean(),
    autoPublish: z.boolean(),
    showReviewerName: z.boolean(),
    showReviewTitle: z.boolean(),
    showReviewDate: z.boolean(),
    showAverageRating: z.boolean(),
    minimumRating: z.number().int().min(1).max(5),
    maxVisible: z.number().int().min(1).max(24),
    sort: z.enum(['featured_first', 'newest', 'highest_rating']),
  }),
});

const ReviewModerationSchema = z.object({
  storefrontSlug: z.string().trim().min(1).max(64),
  reviewId: z.string().uuid(),
  status: z.enum(['pending', 'published', 'hidden']),
});

const ReviewFeaturedSchema = z.object({
  storefrontSlug: z.string().trim().min(1).max(64),
  reviewId: z.string().uuid(),
  isFeatured: z.boolean(),
});

const ReviewDeleteSchema = z.object({
  storefrontSlug: z.string().trim().min(1).max(64),
  reviewId: z.string().uuid(),
});

export async function saveReviewsSettingsAction(
  input: z.input<typeof ReviewsSettingsSchema>,
): Promise<ReviewActionState> {
  const parsed = ReviewsSettingsSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid settings.' };
  const gate = await authoriseReviews(parsed.data.storefrontSlug);
  if ('status' in gate) return gate;

  const settings = normaliseReviewsSettings(parsed.data.settings);
  await updateAppSettings(parsed.data.storefrontSlug, REVIEWS_APP_ID, settings);
  await recordAudit({
    storefrontSlug: parsed.data.storefrontSlug,
    clerkUserId: gate.userId,
    action: 'app.update',
    targetId: REVIEWS_APP_ID,
    summary: 'Updated Souqna Reviews settings',
  });
  revalidateReviews(parsed.data.storefrontSlug);
  return { status: 'success', appId: REVIEWS_APP_ID };
}

export async function moderateReviewAction(
  input: z.input<typeof ReviewModerationSchema>,
): Promise<ReviewActionState> {
  const parsed = ReviewModerationSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid review.' };
  const gate = await authoriseReviews(parsed.data.storefrontSlug);
  if ('status' in gate) return gate;

  const updated = await updateReviewStatus(
    parsed.data.storefrontSlug,
    parsed.data.reviewId,
    parsed.data.status as ReviewStatus,
  );
  if (!updated) return { status: 'error', message: 'Review was not found.' };
  await recordAudit({
    storefrontSlug: parsed.data.storefrontSlug,
    clerkUserId: gate.userId,
    action: 'review.moderate',
    targetId: parsed.data.reviewId,
    summary: `Set review status to ${parsed.data.status}`,
  });
  revalidateReviews(parsed.data.storefrontSlug);
  return { status: 'success', appId: REVIEWS_APP_ID };
}

export async function toggleReviewFeaturedAction(
  input: z.input<typeof ReviewFeaturedSchema>,
): Promise<ReviewActionState> {
  const parsed = ReviewFeaturedSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid review.' };
  const gate = await authoriseReviews(parsed.data.storefrontSlug);
  if ('status' in gate) return gate;

  const updated = await updateReviewFeatured(
    parsed.data.storefrontSlug,
    parsed.data.reviewId,
    parsed.data.isFeatured,
  );
  if (!updated) return { status: 'error', message: 'Review was not found.' };
  await recordAudit({
    storefrontSlug: parsed.data.storefrontSlug,
    clerkUserId: gate.userId,
    action: 'review.feature',
    targetId: parsed.data.reviewId,
    summary: parsed.data.isFeatured ? 'Featured review' : 'Unfeatured review',
  });
  revalidateReviews(parsed.data.storefrontSlug);
  return { status: 'success', appId: REVIEWS_APP_ID };
}

export async function deleteReviewAction(
  input: z.input<typeof ReviewDeleteSchema>,
): Promise<ReviewActionState> {
  const parsed = ReviewDeleteSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid review.' };
  const gate = await authoriseReviews(parsed.data.storefrontSlug);
  if ('status' in gate) return gate;

  const deleted = await deleteReviewRow(parsed.data.storefrontSlug, parsed.data.reviewId);
  if (!deleted) return { status: 'error', message: 'Review was not found.' };
  await recordAudit({
    storefrontSlug: parsed.data.storefrontSlug,
    clerkUserId: gate.userId,
    action: 'review.delete',
    targetId: parsed.data.reviewId,
    summary: 'Deleted review',
  });
  revalidateReviews(parsed.data.storefrontSlug);
  return { status: 'success', appId: REVIEWS_APP_ID };
}

async function authoriseReviews(
  storefrontSlug: string,
): Promise<{ ok: true; userId: string } | ReviewActionState> {
  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in.' };
  const owner = await assertStorefrontOwner(storefrontSlug, userId);
  if (!owner) return { status: 'error', message: 'Forbidden.' };
  const plan = await getPlan(owner.clerkUserId);
  if (!planUnlocksIntegrations(plan)) {
    return { status: 'error', message: `${UPGRADE_GROWTH_TOOLS_COPY}.` };
  }
  const installed = await getInstalledApp(storefrontSlug, REVIEWS_APP_ID);
  if (!installed) return { status: 'error', message: 'Install Souqna Reviews first.' };
  return { ok: true, userId };
}

function revalidateReviews(storefrontSlug: string) {
  revalidatePath('/account/apps');
  revalidatePath('/account/apps/reviews/configure');
  revalidatePath(`/account/${storefrontSlug}/preview`);
  revalidatePath(`/brief/${storefrontSlug}`, 'layout');
}
