'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { assertStorefrontOwner } from '@/lib/products';
import { getPlan, planUnlocksIntegrations, UPGRADE_GROWTH_TOOLS_COPY } from '@/lib/billing';
import { getInstalledApp } from '@/lib/apps/installed';
import {
  addSubmission,
  getActivitySettings,
  isKitchenState,
  saveActivitySettings,
  setOrderState,
} from '@/lib/apps/activities/settings';
import {
  ACTIVITY_KIND_BY_APP,
  activityId,
  isActivityAppId,
  type ActivityKind,
  type ActivitySettings,
  type BookingSettings,
  type BookingSubmission,
  type FnbSettings,
  type FnbSubmission,
  type TailoringSettings,
  type TailoringSubmission,
} from '@/lib/apps/activities/types';

/**
 * Server actions for the shared Activities engine (booking / matbakh /
 * tailoring). Merchant actions (`saveActivitySettingsAction`,
 * `setKitchenOrderStateAction`) require auth + ownership + a plan that
 * unlocks integrations. `submitActivityAction` is buyer-facing (public,
 * like review/inquiry submits) and only writes to an installed+enabled
 * activity's submission log.
 */

export type ActivityActionState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/* ------------------------------ merchant ------------------------------ */

const SaveSchema = z.object({
  storefrontSlug: z.string().trim().min(1).max(64),
  appId: z.string().trim().min(1).max(64),
  settings: z.record(z.unknown()),
});

export async function saveActivitySettingsAction(
  input: z.input<typeof SaveSchema>,
): Promise<ActivityActionState> {
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request' };
  if (!isActivityAppId(parsed.data.appId))
    return { status: 'error', message: 'Unknown activity.' };

  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to save settings.' };
  const owner = await assertStorefrontOwner(parsed.data.storefrontSlug, userId);
  if (!owner) return { status: 'error', message: 'Forbidden' };
  const plan = await getPlan(owner.clerkUserId);
  if (!planUnlocksIntegrations(plan)) {
    return { status: 'error', message: `${UPGRADE_GROWTH_TOOLS_COPY}.` };
  }

  try {
    await saveActivitySettings(parsed.data.storefrontSlug, parsed.data.appId, parsed.data.settings);
    revalidatePath(`/account/apps/${parsed.data.appId}/configure`);
    return { status: 'success' };
  } catch (err) {
    console.error('[saveActivitySettingsAction] failed', err);
    return { status: 'error', message: 'Save failed. Try again.' };
  }
}

const StateSchema = z.object({
  storefrontSlug: z.string().trim().min(1).max(64),
  orderId: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(20),
});

export async function setKitchenOrderStateAction(
  input: z.input<typeof StateSchema>,
): Promise<ActivityActionState> {
  const parsed = StateSchema.safeParse(input);
  if (!parsed.success || !isKitchenState(parsed.data.state))
    return { status: 'error', message: 'Invalid request' };

  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to update orders.' };
  const owner = await assertStorefrontOwner(parsed.data.storefrontSlug, userId);
  if (!owner) return { status: 'error', message: 'Forbidden' };
  const plan = await getPlan(owner.clerkUserId);
  if (!planUnlocksIntegrations(plan)) {
    return { status: 'error', message: `${UPGRADE_GROWTH_TOOLS_COPY}.` };
  }

  try {
    await setOrderState(parsed.data.storefrontSlug, parsed.data.orderId, parsed.data.state);
    revalidatePath(`/account/apps/matbakh/configure`);
    return { status: 'success' };
  } catch (err) {
    console.error('[setKitchenOrderStateAction] failed', err);
    return { status: 'error', message: 'Update failed. Try again.' };
  }
}

/* -------------------------------- buyer -------------------------------- */

export type ActivityPublicConfig =
  | { status: 'ok'; kind: ActivityKind; settings: ActivitySettings }
  | { status: 'unavailable' };

const ConfigSchema = z.object({
  storefrontSlug: z.string().trim().min(1).max(64),
  appId: z.string().trim().min(1).max(64),
});

/** Public: the storefront flow loads its activity config on mount. */
export async function getActivityPublicConfig(
  input: z.input<typeof ConfigSchema>,
): Promise<ActivityPublicConfig> {
  const parsed = ConfigSchema.safeParse(input);
  if (!parsed.success || !isActivityAppId(parsed.data.appId)) return { status: 'unavailable' };
  const installed = await getInstalledApp(parsed.data.storefrontSlug, parsed.data.appId);
  if (!installed || !installed.enabled) return { status: 'unavailable' };
  const settings = await getActivitySettings(parsed.data.storefrontSlug, parsed.data.appId);
  return { status: 'ok', kind: ACTIVITY_KIND_BY_APP[parsed.data.appId], settings };
}

const SubmitSchema = z.object({
  storefrontSlug: z.string().trim().min(1).max(64),
  appId: z.string().trim().min(1).max(64),
  customerName: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  // booking
  serviceId: z.string().trim().max(60).optional(),
  date: z.string().trim().max(20).optional(),
  time: z.string().trim().max(10).optional(),
  // fnb
  items: z
    .array(z.object({ menuId: z.string().max(60), qty: z.number().int().min(1).max(99) }))
    .max(100)
    .optional(),
  notes: z.string().trim().max(500).optional().default(''),
  // tailoring
  measurements: z.record(z.number()).optional(),
  storage: z.enum(['local', 'online']).optional(),
});

export type SubmitActivityResult =
  | { status: 'ok'; id: string; title: string; priceQar: number; meta: Record<string, string> }
  | { status: 'error'; message: string };

export async function submitActivityAction(
  input: z.input<typeof SubmitSchema>,
): Promise<SubmitActivityResult> {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request' };
  const { storefrontSlug, appId } = parsed.data;
  if (!isActivityAppId(appId)) return { status: 'error', message: 'Unknown activity.' };

  const installed = await getInstalledApp(storefrontSlug, appId);
  if (!installed || !installed.enabled)
    return { status: 'error', message: 'This service is not available right now.' };

  const kind = ACTIVITY_KIND_BY_APP[appId];
  const settings = await getActivitySettings(storefrontSlug, appId);
  const now = new Date().toISOString();
  const name = parsed.data.customerName;
  const phone = parsed.data.phone;

  try {
    if (kind === 'booking') {
      const s = settings as BookingSettings;
      if (s.requirePhone && !phone) return { status: 'error', message: 'Phone number required.' };
      const service = s.services.find((x) => x.id === parsed.data.serviceId);
      if (!service || !parsed.data.date || !parsed.data.time)
        return { status: 'error', message: 'Pick a service and a time.' };
      const sub: BookingSubmission = {
        id: activityId('bkg'),
        serviceId: service.id,
        serviceName: service.nameEn || service.nameAr,
        date: parsed.data.date,
        time: parsed.data.time,
        customerName: name,
        phone,
        priceQar: service.priceQar,
        createdAt: now,
      };
      await addSubmission(storefrontSlug, appId, sub);
      return {
        status: 'ok',
        id: sub.id,
        title: sub.serviceName,
        priceQar: sub.priceQar,
        meta: { date: sub.date, time: sub.time },
      };
    }

    if (kind === 'fnb') {
      const s = settings as FnbSettings;
      if (s.requirePhone && !phone) return { status: 'error', message: 'Phone number required.' };
      const items = (parsed.data.items ?? [])
        .map((it) => {
          const m = s.menu.find((x) => x.id === it.menuId);
          if (!m) return null;
          return { menuId: m.id, name: m.nameEn || m.nameAr, qty: it.qty, priceQar: m.priceQar };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (items.length === 0) return { status: 'error', message: 'Add at least one item.' };
      const totalQar = items.reduce((sum, it) => sum + it.priceQar * it.qty, 0);
      const sub: FnbSubmission = {
        id: activityId('ord'),
        items,
        notes: s.acceptNotes ? parsed.data.notes : '',
        state: 'submitted',
        customerName: name,
        phone,
        totalQar,
        createdAt: now,
        updatedAt: now,
      };
      await addSubmission(storefrontSlug, appId, sub);
      return {
        status: 'ok',
        id: sub.id,
        title: `Order · ${items.reduce((n, it) => n + it.qty, 0)} item(s)`,
        priceQar: totalQar,
        meta: { items: items.map((it) => `${it.qty}× ${it.name}`).join(', ') },
      };
    }

    // tailoring
    const s = settings as TailoringSettings;
    if (s.requirePhone && !phone) return { status: 'error', message: 'Phone number required.' };
    const measurements: Partial<Record<string, number>> = {};
    for (const f of s.fields) {
      const v = parsed.data.measurements?.[f];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) measurements[f] = Math.round(v);
    }
    if (Object.keys(measurements).length === 0)
      return { status: 'error', message: 'Enter your measurements.' };
    const storage: 'local' | 'online' =
      s.storage === 'ask' ? (parsed.data.storage ?? 'local') : s.storage;
    const sub: TailoringSubmission = {
      id: activityId('msr'),
      customerName: name,
      phone,
      measurements: measurements as TailoringSubmission['measurements'],
      storage,
      createdAt: now,
    };
    await addSubmission(storefrontSlug, appId, sub);
    return {
      status: 'ok',
      id: sub.id,
      title: name ? `Measurements · ${name}` : 'Measurements',
      priceQar: 0,
      meta: { saved: storage },
    };
  } catch (err) {
    console.error('[submitActivityAction] failed', err);
    return { status: 'error', message: 'Submission failed. Try again.' };
  }
}
