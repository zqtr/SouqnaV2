/**
 * Souqna Activities — shared domain for the three service-business
 * plugins that all render through one UI system but install separately:
 *
 *   - booking   (salons/barbers/spa/clinic)  → time-slot appointments
 *   - matbakh   (cafe / F&B)                  → orders + kitchen board
 *   - tailoring (tailors)                     → body measurements saved
 *                                               to the buyer's name
 *
 * This module is pure data + types (no server imports) so both the
 * client configure forms and the storefront shell can import it. The
 * server runtime lives in `./settings.ts`.
 */
import type { ActivityKind } from '../types';

export type { ActivityKind };

export type Bilingual = { en: string; ar: string };

/** Marketplace ids for the three activity plugins (stable DB keys). */
export const ACTIVITY_APP_IDS = ['booking', 'matbakh', 'tailoring'] as const;
export type ActivityAppId = (typeof ACTIVITY_APP_IDS)[number];

export const ACTIVITY_KIND_BY_APP: Record<ActivityAppId, ActivityKind> = {
  booking: 'booking',
  matbakh: 'fnb',
  tailoring: 'tailoring',
};

/** Monthly add-on price (QAR) billed on the merchant's Souqna plan. */
export const ACTIVITY_PRICE_QAR: Record<ActivityAppId, number> = {
  booking: 75,
  matbakh: 110,
  tailoring: 150,
};

export function isActivityAppId(id: string): id is ActivityAppId {
  return (ACTIVITY_APP_IDS as readonly string[]).includes(id);
}

export function activityKindForApp(id: string): ActivityKind | null {
  return isActivityAppId(id) ? ACTIVITY_KIND_BY_APP[id] : null;
}

/* ------------------------------------------------------------------ */
/* Booking                                                            */
/* ------------------------------------------------------------------ */

export type BookingService = {
  id: string;
  nameEn: string;
  nameAr: string;
  priceQar: number;
  durationMin: number;
};

export type BookingSettings = {
  services: BookingService[];
  /** Days the shop takes bookings. 0=Sunday … 6=Saturday. */
  openDays: number[];
  openTime: string; // 'HH:MM' 24h
  closeTime: string; // 'HH:MM' 24h
  /** Slot granularity in minutes. */
  slotMinutes: number;
  requirePhone: boolean;
};

export type BookingSubmission = {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  customerName: string;
  phone: string;
  priceQar: number;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/* F&B / Matbakh                                                      */
/* ------------------------------------------------------------------ */

export type MenuItem = {
  id: string;
  nameEn: string;
  nameAr: string;
  priceQar: number;
  category?: string;
  prepMinutes?: number;
};

export type FnbSettings = {
  menu: MenuItem[];
  acceptNotes: boolean;
  requirePhone: boolean;
};

export const KITCHEN_STATES = ['submitted', 'preparing', 'ready', 'served'] as const;
export type KitchenState = (typeof KITCHEN_STATES)[number];

export const KITCHEN_STATE_LABELS: Record<KitchenState, Bilingual> = {
  submitted: { en: 'Submitted', ar: 'تم الإرسال' },
  preparing: { en: 'Preparing', ar: 'قيد التحضير' },
  ready: { en: 'Ready', ar: 'جاهز' },
  served: { en: 'Served', ar: 'تم التقديم' },
};

export function nextKitchenState(state: KitchenState): KitchenState {
  const idx = KITCHEN_STATES.indexOf(state);
  return KITCHEN_STATES[Math.min(idx + 1, KITCHEN_STATES.length - 1)]!;
}

export type FnbOrderItem = { menuId: string; name: string; qty: number; priceQar: number };

export type FnbSubmission = {
  id: string;
  items: FnbOrderItem[];
  notes: string;
  state: KitchenState;
  customerName: string;
  phone: string;
  totalQar: number;
  createdAt: string;
  updatedAt: string;
};

/* ------------------------------------------------------------------ */
/* Tailoring                                                          */
/* ------------------------------------------------------------------ */

export const MEASUREMENT_FIELDS = [
  'height',
  'weight',
  'chest',
  'waist',
  'hips',
  'shoulder',
  'sleeve',
  'inseam',
  'neck',
] as const;
export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

export const MEASUREMENT_LABELS: Record<MeasurementField, Bilingual> = {
  height: { en: 'Height', ar: 'الطول' },
  weight: { en: 'Weight', ar: 'الوزن' },
  chest: { en: 'Chest', ar: 'الصدر' },
  waist: { en: 'Waist', ar: 'الخصر' },
  hips: { en: 'Hips', ar: 'الورك' },
  shoulder: { en: 'Shoulder', ar: 'الكتف' },
  sleeve: { en: 'Sleeve', ar: 'الكم' },
  inseam: { en: 'Inseam', ar: 'الساق الداخلية' },
  neck: { en: 'Neck', ar: 'الرقبة' },
};

/** Unit each measurement is captured in. */
export const MEASUREMENT_UNIT: Record<MeasurementField, 'cm' | 'kg'> = {
  height: 'cm',
  weight: 'kg',
  chest: 'cm',
  waist: 'cm',
  hips: 'cm',
  shoulder: 'cm',
  sleeve: 'cm',
  inseam: 'cm',
  neck: 'cm',
};

/**
 * Where a completed measurement profile is stored:
 *   - 'local'  → kept only in the shop's records (merchant board)
 *   - 'online' → also retained for the buyer to reuse on return visits
 *   - 'ask'    → let the buyer choose at submit time
 */
export type TailoringStorage = 'local' | 'online' | 'ask';

export type TailoringSettings = {
  fields: MeasurementField[];
  storage: TailoringStorage;
  requirePhone: boolean;
};

export type TailoringSubmission = {
  id: string;
  customerName: string;
  phone: string;
  measurements: Partial<Record<MeasurementField, number>>;
  /** Resolved storage choice (never 'ask' — the buyer picked). */
  storage: 'local' | 'online';
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/* Unions + defaults                                                  */
/* ------------------------------------------------------------------ */

export type ActivitySettings = BookingSettings | FnbSettings | TailoringSettings;
export type ActivitySubmission = BookingSubmission | FnbSubmission | TailoringSubmission;

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  services: [
    { id: 'svc-1', nameEn: 'Haircut', nameAr: 'قص شعر', priceQar: 50, durationMin: 30 },
  ],
  openDays: [0, 1, 2, 3, 4, 6], // Sun–Thu + Sat (Fri off)
  openTime: '10:00',
  closeTime: '22:00',
  slotMinutes: 30,
  requirePhone: true,
};

export const DEFAULT_FNB_SETTINGS: FnbSettings = {
  menu: [
    { id: 'itm-1', nameEn: 'Karak tea', nameAr: 'شاي كرك', priceQar: 5, prepMinutes: 5 },
  ],
  acceptNotes: true,
  requirePhone: true,
};

export const DEFAULT_TAILORING_SETTINGS: TailoringSettings = {
  fields: ['height', 'weight', 'chest', 'waist', 'hips', 'shoulder', 'sleeve'],
  storage: 'ask',
  requirePhone: true,
};

export function defaultSettingsForKind(kind: ActivityKind): ActivitySettings {
  switch (kind) {
    case 'booking':
      return DEFAULT_BOOKING_SETTINGS;
    case 'fnb':
      return DEFAULT_FNB_SETTINGS;
    case 'tailoring':
      return DEFAULT_TAILORING_SETTINGS;
  }
}

/** Short id for services / menu items / submissions (no crypto dep). */
export function activityId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
