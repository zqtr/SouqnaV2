'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { assertStorefrontOwner } from '@/lib/products';
import { recordAudit } from '@/lib/audit';
import {
  PRODUCT_INDEX_AVAILABILITY,
  PRODUCT_INDEX_LAYOUTS,
  PRODUCT_INDEX_SORTS,
  normalizeProductIndexSettings,
  type ProductIndexAvailability,
  type ProductIndexLayout,
  type ProductIndexSettings,
  type ProductIndexSort,
} from '@/lib/productIndexSettings';
import { ensureEasyDraftManifest, updateEasyManifestProductIndex } from '@/lib/easySnapshots';

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null));

const ProductIndexInputSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  settings: z.object({
    enabled: z.boolean(),
    title: nullableText(120),
    subtitle: nullableText(260),
    layout: z.enum(
      PRODUCT_INDEX_LAYOUTS as unknown as [ProductIndexLayout, ...ProductIndexLayout[]],
    ),
    showSearch: z.boolean(),
    showCategoryFilters: z.boolean(),
    showPriceFilter: z.boolean(),
    showAvailabilityFilter: z.boolean(),
    visibleCategorySlugs: z.array(z.string().trim().min(1).max(120)).max(80),
    hiddenProductIds: z.array(z.string().trim().min(1).max(80)).max(600),
    defaultSort: z.enum(
      PRODUCT_INDEX_SORTS as unknown as [ProductIndexSort, ...ProductIndexSort[]],
    ),
    defaultAvailability: z.enum(
      PRODUCT_INDEX_AVAILABILITY as unknown as [
        ProductIndexAvailability,
        ...ProductIndexAvailability[],
      ],
    ),
  }),
});

export type UpdateProductIndexSettingsInput = z.input<typeof ProductIndexInputSchema>;

export type ProductIndexActionState =
  | { status: 'idle' }
  | { status: 'success'; updatedAt: string; settings: ProductIndexSettings }
  | { status: 'error'; message: string; field?: string };

export async function updateProductIndexSettings(
  input: UpdateProductIndexSettingsInput,
): Promise<ProductIndexActionState> {
  const parsed = ProductIndexInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: 'error',
      message: issue?.message ?? 'Invalid product page settings.',
      field: issue?.path?.join('.'),
    };
  }

  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to save changes.' };

  const owner = await assertStorefrontOwner(parsed.data.slug, userId);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  const settings = normalizeProductIndexSettings(parsed.data.settings);

  try {
    await ensureEasyDraftManifest(parsed.data.slug, userId);
    const manifest = await updateEasyManifestProductIndex({
      storefrontSlug: parsed.data.slug,
      clerkUserId: userId,
      settings,
    });
    if (!manifest.ok) throw new Error('Easy manifest conflict');
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: userId,
      action: 'storefront.products_index.update',
      targetId: parsed.data.slug,
      summary: 'All Products system page updated from Builder',
      meta: {
        enabled: settings.enabled,
        layout: settings.layout,
        visibleCategoryCount: settings.visibleCategorySlugs.length,
        hiddenProductCount: settings.hiddenProductIds.length,
        filters: {
          search: settings.showSearch,
          categories: settings.showCategoryFilters,
          price: settings.showPriceFilter,
          availability: settings.showAvailabilityFilter,
        },
      },
    });
  } catch {
    return { status: 'error', message: 'Save failed. Try again.' };
  }

  revalidatePath('/account', 'layout');
  revalidatePath(`/${parsed.data.slug}/products`);
  revalidatePath(`/brief/${parsed.data.slug}/products`);
  revalidatePath(`/brief/${parsed.data.slug}`, 'layout');

  return { status: 'success', updatedAt: new Date().toISOString(), settings };
}
