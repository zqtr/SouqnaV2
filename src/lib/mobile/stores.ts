import 'server-only';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isLocale, type Locale } from '@/i18n/locales';
import { getPlan, PLAN_LIMITS, storefrontCapForPlan } from '@/lib/billing';
import { bootBlocksFromStorefront } from '@/lib/blocks/boot';
import { seedTemplateDemoProducts } from '@/lib/blocks/demoProducts';
import {
  getStorefrontsForUser,
  insertStorefront,
  publishDraft,
  saveDraft,
  TEMPLATE_IDS,
  type Storefront,
  type TemplateId,
} from '@/lib/brief';
import { hasDb } from '@/lib/db';
import { logEvent } from '@/lib/events';
import type { MobileUser } from '@/lib/mobile/auth';
import { pushFirstWebsiteCongratsNotification } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';
import { isReserved, isTaken, nextAvailable, slugify } from '@/lib/slug';
import { ensureHomePage, publishPage, saveDraftBlocks } from '@/lib/storefrontPages';
import {
  DEFAULT_CHECKOUT_SETTINGS,
  writeStorefrontCheckoutSettings,
} from '@/lib/storefrontSettings';
import { isTemplateUnlocked, minPlanForTemplate, templatePresets } from '@/lib/templates';

/**
 * Mobile store provisioning — the /begin core without the web-only
 * concerns (honeypot, locale copy, Fawran intake, WhatsApp/email
 * notifications). Identity arrives resolved from the mobile bearer
 * token, so nothing here may call Clerk's `auth()`/`currentUser()`.
 * Kept step-parallel with `createBrief` in src/app/actions/createBrief.ts —
 * change one, review the other.
 */

const BUSINESS_TYPES = [
  'graphic_design',
  'clothing_store',
  'home_kitchen',
  'salon',
  'cafe',
  'ecommerce',
  'real_estate',
  'photography',
  'tutoring',
  'fitness',
  'perfume_oud',
  'auto_detailing',
  'events_weddings',
  'agriculture',
  'courier_delivery',
  'contracting',
  'art_gallery',
  'tailoring_abaya',
  'fnb_brand',
  'something_else',
] as const;

export const MobileCreateStoreSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(3).max(40),
  businessType: z.enum(BUSINESS_TYPES),
  templateId: z.enum(TEMPLATE_IDS),
  locale: z.string().refine(isLocale, 'invalid locale'),
  logoUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        z.string().url().safeParse(value).success ||
        value.startsWith('data:image/png;base64,'),
      'Invalid logo image',
    )
    .optional()
    .default(''),
});

export type MobileCreateStoreInput = z.infer<typeof MobileCreateStoreSchema>;

export type MobileProvisionResult =
  | { ok: true; slug: string }
  | { ok: false; status: number; code: string; message: string };

export async function provisionMobileStorefront(
  user: MobileUser,
  data: MobileCreateStoreInput,
): Promise<MobileProvisionResult> {
  const locale = data.locale as Locale;

  const limit = rateLimit(`mobile-stores:${user.userId}`, 3, 60_000);
  if (!limit.ok) {
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: 'Too many store creations. Try again in a minute.',
    };
  }

  const callerPlan = await getPlan(user.userId);

  if (!isTemplateUnlocked(data.templateId as TemplateId, callerPlan)) {
    const min = minPlanForTemplate(data.templateId as TemplateId);
    return {
      ok: false,
      status: 403,
      code: 'template_locked',
      message: `${templatePresets[data.templateId as TemplateId]?.label ?? 'This template'} is available on ${PLAN_LIMITS[min].label} and above. Upgrade your plan or pick a Free template.`,
    };
  }

  let existingStorefrontCount: number | null = null;
  try {
    const owned = await getStorefrontsForUser(user.userId);
    existingStorefrontCount = owned.length;
    const cap = storefrontCapForPlan(callerPlan);
    if (owned.length >= cap) {
      return {
        ok: false,
        status: 403,
        code: 'storefront_limit',
        message:
          callerPlan === 'free'
            ? "You've reached the one-storefront limit on Free. Upgrade to add more stores."
            : `You've reached the ${cap}-storefront limit on ${PLAN_LIMITS[callerPlan].label}. Upgrade your plan to add more stores.`,
      };
    }
  } catch (err) {
    console.error('[mobile stores] storefront count check failed', err);
    // Soft-fail like createBrief: the slug uniqueness check below still
    // defends against bad data.
  }

  const requested = slugify(data.slug);
  if (isReserved(requested)) {
    return {
      ok: false,
      status: 409,
      code: 'slug_reserved',
      message: 'That Souqna address is reserved. Pick another one.',
    };
  }
  if (!hasDb()) {
    console.warn('[mobile stores] DATABASE_URL missing — refusing to provision');
    return {
      ok: false,
      status: 503,
      code: 'db_unavailable',
      message: 'Store creation is temporarily unavailable.',
    };
  }

  let finalSlug = requested;
  try {
    if (await isTaken(requested)) {
      finalSlug = await nextAvailable(requested);
    }
  } catch (err) {
    console.error('[mobile stores] slug check failed', err);
    return {
      ok: false,
      status: 500,
      code: 'slug_check_failed',
      message: 'Could not verify the Souqna address. Try again.',
    };
  }

  const preset = templatePresets[data.templateId as TemplateId];
  const founderName = user.name?.trim() || user.username?.trim() || 'Founder';
  const contactEmail = user.email?.trim() || '';

  let createdStorefront: Storefront;
  try {
    createdStorefront = await insertStorefront({
      slug: finalSlug,
      locale,
      founderName,
      businessName: data.businessName,
      contactEmail,
      ownership: 'have_business',
      experience: 'first_time',
      businessType: data.businessType,
      marketVolume: 'qatar',
      payments: 'planning',
      design: 'atrium',
      palette: preset.palette,
      templateId: data.templateId as TemplateId,
      crNumber: null,
      tagline: null,
      phone: null,
      area: null,
      hours: null,
      instagram: null,
      logoUrl: data.logoUrl ? data.logoUrl.trim() : null,
      faviconUrl: null,
      clerkUserId: user.userId,
    });
  } catch (err) {
    console.error('[mobile stores] insert failed', err);
    return {
      ok: false,
      status: 500,
      code: 'store_create_failed',
      message: 'Could not create the store. Try again.',
    };
  }

  try {
    await writeStorefrontCheckoutSettings(finalSlug, {
      ...DEFAULT_CHECKOUT_SETTINGS,
      paymentMethods: ['cod'],
      bankDetails: null,
      requiredPolicies: [],
      currency: 'QAR',
    });
  } catch (err) {
    console.warn('[mobile stores] checkout defaults failed', err);
  }

  try {
    await seedTemplateDemoProducts(
      finalSlug,
      data.templateId as TemplateId,
      data.businessType,
      locale,
    );
  } catch (err) {
    console.warn('[mobile stores] demo product seed failed', err);
  }

  try {
    const blocks = bootBlocksFromStorefront(createdStorefront);
    const saved = await saveDraft(finalSlug, blocks, preset.theme);
    if (saved) {
      await publishDraft(finalSlug);
    }
    const home = await ensureHomePage(finalSlug, blocks);
    await saveDraftBlocks(home.id, blocks);
    await publishPage(home.id);
    revalidatePath(`/brief/${finalSlug}`, 'layout');
    revalidatePath('/account');
    revalidatePath('/account/builder');
  } catch (err) {
    console.warn('[mobile stores] template seed/publish failed', err);
  }

  await logEvent({
    kind: 'storefront.created',
    funnel: 'storefront',
    step: 1,
    userId: user.userId,
    storefront: finalSlug,
    props: {
      template: data.templateId,
      ownership: 'have_business',
      businessType: data.businessType,
      locale,
      source: 'mobile',
    },
  });

  if (existingStorefrontCount === 0) {
    await pushFirstWebsiteCongratsNotification({
      userId: user.userId,
      businessName: data.businessName,
      slug: finalSlug,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://souqna.qa'}/account/builder?store=${encodeURIComponent(finalSlug)}`,
    });
  }

  return { ok: true, slug: finalSlug };
}
