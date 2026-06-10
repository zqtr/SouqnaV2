import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  getMobileBilling,
  listMobileStores,
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileUser,
} from '@/lib/mobile/auth';
import {
  getStorefrontsForUser,
  insertStorefront,
  publishDraft,
  saveDraft,
  TEMPLATE_IDS,
  type BusinessType,
  type TemplateId,
} from '@/lib/brief';
import { hasDb } from '@/lib/db';
import { isReserved, isTaken, nextAvailable, slugify } from '@/lib/slug';
import { getPlan, PLAN_LIMITS, storefrontCapForPlan } from '@/lib/billing';
import { isTemplateUnlocked, minPlanForTemplate, templatePresets } from '@/lib/templates';
import { bootBlocksFromStorefront } from '@/lib/blocks/boot';
import { seedTemplateDemoProducts } from '@/lib/blocks/demoProducts';
import { ensureHomePage, publishPage, saveDraftBlocks } from '@/lib/storefrontPages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

const CreateStoreSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(3).max(40),
  businessType: z.enum([
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
  ]),
  templateId: z.enum(TEMPLATE_IDS),
  logoUrl: z.string().trim().max(2048).optional().or(z.literal('')).default(''),
  locale: z.enum(['en', 'ar']).default('en'),
});

export async function POST(req: Request): Promise<Response> {
  const user = await requireMobileUser();
  if (!user.ok) return user.response;

  const body = await req.json().catch(() => null);
  const parsed = CreateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(
      400,
      'invalid_store',
      'Enter a store name, subdomain, activity, and template.',
    );
  }

  if (!hasDb()) {
    return mobileError(500, 'database_unavailable', 'Store creation is not available right now.');
  }

  const data = parsed.data;
  const requested = slugify(data.slug);
  if (requested.length < 3 || isReserved(requested)) {
    return mobileError(400, 'reserved_slug', 'Choose another Souqna address.');
  }

  const templateId = data.templateId as TemplateId;
  const plan = await getPlan(user.user.userId);
  if (!isTemplateUnlocked(templateId, plan)) {
    const min = minPlanForTemplate(templateId);
    return mobileError(
      403,
      'template_locked',
      `${templatePresets[templateId]?.label ?? 'This template'} is available on ${PLAN_LIMITS[min].label} and above.`,
    );
  }

  const owned = await getStorefrontsForUser(user.user.userId).catch(() => []);
  const cap = storefrontCapForPlan(plan);
  if (owned.length >= cap) {
    return mobileError(
      403,
      'storefront_limit',
      plan === 'free'
        ? "You've reached the one-storefront limit on Free."
        : `You've reached the ${cap}-storefront limit on ${PLAN_LIMITS[plan].label}.`,
    );
  }

  const finalSlug = (await isTaken(requested).catch(() => false))
    ? await nextAvailable(requested)
    : requested;
  const preset = templatePresets[templateId];
  const founderName = user.user.name ?? user.user.username ?? 'Founder';
  const contactEmail = user.user.email ?? '';

  try {
    const created = await insertStorefront({
      slug: finalSlug,
      locale: data.locale,
      founderName,
      businessName: data.businessName,
      contactEmail,
      ownership: 'want_to_start',
      experience: 'first_time',
      businessType: data.businessType as BusinessType,
      marketVolume: 'qatar',
      payments: 'planning',
      design: 'atrium',
      palette: preset.palette,
      templateId,
      crNumber: null,
      tagline: null,
      phone: null,
      area: null,
      hours: null,
      instagram: null,
      logoUrl: data.logoUrl || null,
      faviconUrl: null,
      clerkUserId: user.user.userId,
    });

    try {
      await seedTemplateDemoProducts(finalSlug, templateId, data.businessType, data.locale);
    } catch (err) {
      console.warn('[mobile/stores] demo product seed failed', err);
    }

    try {
      const blocks = bootBlocksFromStorefront(created);
      const saved = await saveDraft(finalSlug, blocks, preset.theme);
      if (saved) await publishDraft(finalSlug);
      const home = await ensureHomePage(finalSlug, blocks);
      await saveDraftBlocks(home.id, blocks);
      await publishPage(home.id);
    } catch (err) {
      console.warn('[mobile/stores] template publish failed', err);
    }

    revalidatePath('/account', 'layout');
    revalidatePath('/account/builder');
    revalidatePath(`/brief/${finalSlug}`, 'layout');

    const [stores, billing] = await Promise.all([
      listMobileStores(user.user),
      getMobileBilling(user.user.userId),
    ]);

    return mobileJson({
      user: user.user,
      stores,
      billing,
      activeStore: finalSlug,
      createdStore: finalSlug,
    });
  } catch (err) {
    console.error('[mobile/stores POST] failed', err);
    return mobileError(500, 'store_create_failed', 'Could not create the store. Try again.');
  }
}
