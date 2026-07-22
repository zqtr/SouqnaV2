'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { recordAudit } from '@/lib/audit';
import { assertStorefrontOwner } from '@/lib/products';
import { normalizeProductIndexSettings } from '@/lib/productIndexSettings';
import { ensureEasyDraftManifest, updateEasyManifestProductIndex } from '@/lib/easySnapshots';
const SystemPageEnabledInputSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  page: z.enum(['products']),
  enabled: z.boolean(),
});

export type UpdateSystemPageEnabledInput = z.input<typeof SystemPageEnabledInputSchema>;

export type SystemPageEnabledActionState =
  | { status: 'success'; page: 'products'; enabled: boolean; updatedAt: string }
  | { status: 'error'; message: string; field?: string };

export async function updateSystemPageEnabled(
  input: UpdateSystemPageEnabledInput,
): Promise<SystemPageEnabledActionState> {
  const parsed = SystemPageEnabledInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: 'error',
      message: issue?.message ?? 'Invalid system page setting.',
      field: issue?.path?.join('.'),
    };
  }

  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to save changes.' };

  const owner = await assertStorefrontOwner(parsed.data.slug, userId);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  try {
    const manifest = await ensureEasyDraftManifest(parsed.data.slug, userId);
    const updated = await updateEasyManifestProductIndex({
      storefrontSlug: parsed.data.slug,
      clerkUserId: userId,
      settings: normalizeProductIndexSettings({
        ...manifest.presentation.productIndex,
        enabled: parsed.data.enabled,
      }),
    });
    if (!updated.ok) throw new Error('Easy manifest conflict');
    revalidatePath(`/${parsed.data.slug}/products`);
    revalidatePath(`/brief/${parsed.data.slug}/products`);

    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: userId,
      action: 'storefront.system_page.visibility',
      targetId: `${parsed.data.slug}:products`,
      summary: `All Products system page ${parsed.data.enabled ? 'enabled' : 'disabled'}`,
      meta: {
        page: 'products',
        enabled: parsed.data.enabled,
      },
    });
  } catch {
    return { status: 'error', message: 'Save failed. Try again.' };
  }

  revalidatePath('/account', 'layout');
  revalidatePath(`/brief/${parsed.data.slug}`, 'layout');
  return {
    status: 'success',
    page: parsed.data.page,
    enabled: parsed.data.enabled,
    updatedAt: new Date().toISOString(),
  };
}
