import { getAppState, setAppState, updateAppSettings } from '../installed';
import {
  ACTIVITY_KIND_BY_APP,
  DEFAULT_BOOKING_SETTINGS,
  DEFAULT_FNB_SETTINGS,
  DEFAULT_TAILORING_SETTINGS,
  KITCHEN_STATES,
  MEASUREMENT_FIELDS,
  activityId,
  isActivityAppId,
  type ActivityAppId,
  type ActivityKind,
  type ActivitySettings,
  type ActivitySubmission,
  type BookingSettings,
  type FnbSettings,
  type FnbSubmission,
  type KitchenState,
  type MeasurementField,
  type TailoringSettings,
  type TailoringStorage,
} from './types';

/**
 * Activities runtime. Settings + submissions live in `app_state`
 * (slug, appId, 'settings' | 'submissions') so the storefront and the
 * merchant board read each in a single round-trip. Settings are also
 * mirrored into `installed_apps.settings` so the generic dashboard
 * "installed settings" surface stays in sync — the same dual-write
 * pattern Mawid and Taqim use.
 */

const SETTINGS_KEY = 'settings';
const SUBMISSIONS_KEY = 'submissions';
const MAX_SUBMISSIONS = 500;

/* ------------------------------ coercion ------------------------------ */

function str(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}
function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/* ----------------------------- normalisers ---------------------------- */

export function normalizeBookingSettings(raw: unknown): BookingSettings {
  const o = asObj(raw);
  const services = arr(o.services)
    .slice(0, 40)
    .map((s) => {
      const so = asObj(s);
      return {
        id: str(so.id, 40) || activityId('svc'),
        nameEn: str(so.nameEn, 80),
        nameAr: str(so.nameAr, 80),
        priceQar: num(so.priceQar, 0, 100000, 0),
        durationMin: num(so.durationMin, 5, 600, 30),
      };
    })
    .filter((s) => s.nameEn || s.nameAr);
  const openDays = arr(o.openDays)
    .map((d) => num(d, 0, 6, -1))
    .filter((d, i, a) => d >= 0 && a.indexOf(d) === i);
  return {
    services: services.length ? services : DEFAULT_BOOKING_SETTINGS.services,
    openDays: openDays.length ? openDays : DEFAULT_BOOKING_SETTINGS.openDays,
    openTime: normalizeTime(o.openTime, DEFAULT_BOOKING_SETTINGS.openTime),
    closeTime: normalizeTime(o.closeTime, DEFAULT_BOOKING_SETTINGS.closeTime),
    slotMinutes: num(o.slotMinutes, 5, 240, DEFAULT_BOOKING_SETTINGS.slotMinutes),
    requirePhone: bool(o.requirePhone, true),
  };
}

function normalizeTime(v: unknown, fallback: string): string {
  const s = str(v, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : fallback;
}

export function normalizeFnbSettings(raw: unknown): FnbSettings {
  const o = asObj(raw);
  const menu = arr(o.menu)
    .slice(0, 200)
    .map((m) => {
      const mo = asObj(m);
      return {
        id: str(mo.id, 40) || activityId('itm'),
        nameEn: str(mo.nameEn, 80),
        nameAr: str(mo.nameAr, 80),
        priceQar: num(mo.priceQar, 0, 100000, 0),
        category: str(mo.category, 40) || undefined,
        prepMinutes: mo.prepMinutes == null ? undefined : num(mo.prepMinutes, 0, 240, 10),
      };
    })
    .filter((m) => m.nameEn || m.nameAr);
  return {
    menu: menu.length ? menu : DEFAULT_FNB_SETTINGS.menu,
    acceptNotes: bool(o.acceptNotes, true),
    requirePhone: bool(o.requirePhone, true),
  };
}

export function normalizeTailoringSettings(raw: unknown): TailoringSettings {
  const o = asObj(raw);
  const fields = arr(o.fields)
    .map((f) => str(f, 20))
    .filter((f, i, a): f is MeasurementField =>
      (MEASUREMENT_FIELDS as readonly string[]).includes(f) && a.indexOf(f) === i,
    );
  const storageRaw = str(o.storage, 10);
  const storage: TailoringStorage =
    storageRaw === 'local' || storageRaw === 'online' || storageRaw === 'ask'
      ? storageRaw
      : DEFAULT_TAILORING_SETTINGS.storage;
  return {
    fields: fields.length ? fields : DEFAULT_TAILORING_SETTINGS.fields,
    storage,
    requirePhone: bool(o.requirePhone, true),
  };
}

export function normalizeSettings(kind: ActivityKind, raw: unknown): ActivitySettings {
  switch (kind) {
    case 'booking':
      return normalizeBookingSettings(raw);
    case 'fnb':
      return normalizeFnbSettings(raw);
    case 'tailoring':
      return normalizeTailoringSettings(raw);
  }
}

/* ------------------------------ settings ------------------------------ */

export async function getActivitySettings(
  storefrontSlug: string,
  appId: ActivityAppId,
): Promise<ActivitySettings> {
  const kind = ACTIVITY_KIND_BY_APP[appId];
  const row = await getAppState(storefrontSlug, appId, SETTINGS_KEY);
  return normalizeSettings(kind, row?.value ?? {});
}

export async function saveActivitySettings(
  storefrontSlug: string,
  appId: ActivityAppId,
  raw: unknown,
): Promise<ActivitySettings> {
  const kind = ACTIVITY_KIND_BY_APP[appId];
  const settings = normalizeSettings(kind, raw);
  await setAppState(storefrontSlug, appId, SETTINGS_KEY, settings as unknown as Record<string, unknown>);
  // Mirror into installed_apps.settings for the generic dashboard view.
  await updateAppSettings(storefrontSlug, appId, settings as unknown as Record<string, unknown>);
  return settings;
}

/* ----------------------------- submissions ---------------------------- */

export async function listSubmissions(
  storefrontSlug: string,
  appId: ActivityAppId,
): Promise<ActivitySubmission[]> {
  const row = await getAppState(storefrontSlug, appId, SUBMISSIONS_KEY);
  const list = arr(asObj(row?.value).list) as ActivitySubmission[];
  return list;
}

export async function addSubmission(
  storefrontSlug: string,
  appId: ActivityAppId,
  submission: ActivitySubmission,
): Promise<void> {
  const current = await listSubmissions(storefrontSlug, appId);
  const next = [submission, ...current].slice(0, MAX_SUBMISSIONS);
  await setAppState(storefrontSlug, appId, SUBMISSIONS_KEY, { list: next });
}

/** Advance / set a Matbakh order's kitchen state. Returns updated list. */
export async function setOrderState(
  storefrontSlug: string,
  orderId: string,
  state: KitchenState,
): Promise<ActivitySubmission[]> {
  const list = await listSubmissions(storefrontSlug, 'matbakh');
  const now = new Date().toISOString();
  const next = list.map((s) =>
    'state' in s && s.id === orderId ? ({ ...s, state, updatedAt: now } as FnbSubmission) : s,
  );
  await setAppState(storefrontSlug, 'matbakh', SUBMISSIONS_KEY, { list: next });
  return next;
}

export function isKitchenState(v: string): v is KitchenState {
  return (KITCHEN_STATES as readonly string[]).includes(v);
}

export function activityAppIdOrNull(id: string): ActivityAppId | null {
  return isActivityAppId(id) ? id : null;
}
