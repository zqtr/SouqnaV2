'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { recordAudit } from '@/lib/audit';
import {
  ensureEasyDraftManifest,
  getStorefrontSnapshot,
  restoreEasySnapshotToDraft,
  type EasyDraftManifest,
} from '@/lib/easySnapshots';
import { assertStorefrontOwner } from '@/lib/products';
import { rateLimit } from '@/lib/rate-limit';

const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/u);
const ManifestVersionSchema = z.object({ slug: SlugSchema }).strict();
const RestoreSchema = z
  .object({
    slug: SlugSchema,
    snapshotId: z.string().uuid(),
    expectedEasyVersion: z.number().int().positive(),
  })
  .strict();

export type EasySnapshotActionError =
  | 'invalid_request'
  | 'unauthorized'
  | 'disabled'
  | 'plan_required'
  | 'not_owner'
  | 'rate_limited'
  | 'snapshot_not_found'
  | 'snapshot_stale'
  | 'write_failed';

export type EasySnapshotActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: EasySnapshotActionError; message: string };

function failure(
  error: EasySnapshotActionError,
  message: string,
): Extract<EasySnapshotActionResult<never>, { ok: false }> {
  return { ok: false, error, message };
}

async function requireOwner(slug: string) {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false as const, result: failure('unauthorized', 'Sign in to continue.') };
  }
  const storefront = await assertStorefrontOwner(slug, userId);
  if (!storefront) {
    return { ok: false as const, result: failure('not_owner', 'Storefront not found.') };
  }
  return { ok: true as const, userId, storefront };
}

export async function getEasyManifestVersionAction(
  input: z.input<typeof ManifestVersionSchema>,
): Promise<EasySnapshotActionResult<{ version: number; stateHash: string }>> {
  const parsed = ManifestVersionSchema.safeParse(input);
  if (!parsed.success) return failure('invalid_request', 'Invalid storefront request.');
  const owner = await requireOwner(parsed.data.slug);
  if (!owner.ok) return owner.result;
  try {
    const manifest = await ensureEasyDraftManifest(parsed.data.slug, owner.userId);
    return {
      ok: true,
      data: { version: manifest.version, stateHash: manifest.stateHash },
    };
  } catch {
    return failure('write_failed', 'Could not prepare the Easy recovery point.');
  }
}

export async function restoreEasySnapshotToDraftAction(
  input: z.input<typeof RestoreSchema>,
): Promise<
  EasySnapshotActionResult<{
    manifest: Pick<EasyDraftManifest, 'version' | 'stateHash' | 'sourceSnapshotId'>;
    redirectTo: string;
  }>
> {
  const parsed = RestoreSchema.safeParse(input);
  if (!parsed.success) return failure('invalid_request', 'Invalid restore request.');
  const { slug, snapshotId, expectedEasyVersion } = parsed.data;
  const owner = await requireOwner(slug);
  if (!owner.ok) return owner.result;
  if (!rateLimit(`easy-snapshot-restore:${owner.userId}:${slug}`, 12, 60_000).ok) {
    return failure('rate_limited', 'Please wait before restoring another backup.');
  }

  try {
    await ensureEasyDraftManifest(slug, owner.userId);
    const snapshot = await getStorefrontSnapshot({
      storefrontSlug: slug,
      snapshotId,
      clerkUserId: owner.userId,
    });
    if (!snapshot) return failure('snapshot_not_found', 'Backup not found.');
    const restored = await restoreEasySnapshotToDraft({
      storefrontSlug: slug,
      clerkUserId: owner.userId,
      snapshot,
      expectedEasyVersion,
    });
    if (!restored.ok) {
      return failure(
        'snapshot_stale',
        'Easy changed in another tab. Refresh Storage before restoring this backup.',
      );
    }
    await recordAudit({
      storefrontSlug: slug,
      clerkUserId: owner.userId,
      action: 'easy.snapshot_restore',
      targetId: snapshot.id,
      summary: 'Restored an Easy backup as a draft',
      meta: {
        manifestVersion: restored.manifest.version,
        sourceWasPublished: snapshot.wasPublished,
        liveStorefrontChanged: false,
      },
    });
    const redirectTo = `/account/builder?store=${encodeURIComponent(slug)}&easy=1&restored=1`;
    revalidatePath('/account/builder');
    revalidatePath(`/account/${slug}/preview`);
    revalidatePath('/account/storage');
    revalidatePath('/account/storage-library');
    return {
      ok: true,
      data: {
        manifest: {
          version: restored.manifest.version,
          stateHash: restored.manifest.stateHash,
          sourceSnapshotId: restored.manifest.sourceSnapshotId,
        },
        redirectTo,
      },
    };
  } catch {
    return failure('write_failed', 'Could not restore this Easy backup.');
  }
}
