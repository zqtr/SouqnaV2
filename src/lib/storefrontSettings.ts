import { unstable_noStore as noStore } from 'next/cache';
import { db } from './db';
import { getStorefront } from './brief';

/**
 * Data layer for the M2 Settings panels: store policies and checkout
 * settings. Both live as columns on `briefs` (see migration 016) and
 * are mapped onto the wide `Storefront` type by `fromRow` in
 * `brief.ts`. The accessors here are typed projections that delegate
 * to `getStorefront` so they share its per-request `cache()`.
 *
 * The `CheckoutSettings` type is intentionally distinct from
 * `Storefront` because checkout will likely be normalised into its
 * own table (per-channel checkout, A/B variants, multi-currency)
 * later — UI consumers should depend on this narrow shape rather
 * than read straight off `Storefront.checkout`.
 */

export type StorefrontPolicies = {
  terms: string | null;
  privacy: string | null;
  refund: string | null;
  shipping: string | null;
};

export type PolicyKey = keyof StorefrontPolicies;
export const POLICY_KEYS = [
  'terms',
  'privacy',
  'refund',
  'shipping',
] as const satisfies readonly PolicyKey[];

export type PaymentMethod = 'cod' | 'bank_transfer' | 'fawran' | 'skipcash' | 'sadad' | 'pay_link';
export const PAYMENT_METHODS = [
  'cod',
  'bank_transfer',
  'fawran',
  'skipcash',
  'sadad',
  'pay_link',
] as const satisfies readonly PaymentMethod[];
export const CONFIGURABLE_PAYMENT_METHODS = [
  'cod',
  'bank_transfer',
  'fawran',
  'skipcash',
  'sadad',
  'pay_link',
] as const satisfies readonly PaymentMethod[];
export const BASE_CHECKOUT_PAYMENT_METHODS = [
  'cod',
  'fawran',
] as const satisfies readonly PaymentMethod[];
export const ONLINE_PAYMENT_METHODS = [
  'bank_transfer',
  'skipcash',
  'sadad',
  'pay_link',
] as const satisfies readonly PaymentMethod[];

export type CheckoutPaymentAvailabilityRule = {
  method: PaymentMethod;
  mode: 'allow_only';
  cities: string[];
};

export type CheckoutPaymentAvailabilityInput = {
  city?: string | null;
  rules?: readonly CheckoutPaymentAvailabilityRule[] | null;
  souqnaCity?: SouqnaCitySettings | null;
};

export type SouqnaCityRegion = 'northern' | 'western' | 'eastern' | 'southern' | 'central' | 'custom';

export type SouqnaCityRule = {
  id: string;
  city: string;
  region: SouqnaCityRegion;
  enabled: boolean;
  paymentMethods: PaymentMethod[];
  deliveryFeeQar: number | null;
};

export type SouqnaCitySettings = {
  enabled: boolean;
  autoMatchNearest: boolean;
  rules: SouqnaCityRule[];
};

export const SOUQNA_CITY_REGIONS = [
  'northern',
  'western',
  'eastern',
  'southern',
  'central',
  'custom',
] as const satisfies readonly SouqnaCityRegion[];

export const SOUQNA_CITY_PRESETS: readonly SouqnaCityRule[] = [
  {
    id: 'souqna-city-al-khor',
    city: 'Al Khor',
    region: 'northern',
    enabled: true,
    paymentMethods: ['cod', 'fawran'],
    deliveryFeeQar: null,
  },
  {
    id: 'souqna-city-al-wakrah',
    city: 'Al Wakrah',
    region: 'southern',
    enabled: true,
    paymentMethods: ['cod'],
    deliveryFeeQar: null,
  },
  {
    id: 'souqna-city-al-thumamah',
    city: 'Al Thumamah',
    region: 'central',
    enabled: true,
    paymentMethods: ['cod', 'fawran'],
    deliveryFeeQar: null,
  },
] as const;

export const DEFAULT_SOUQNA_CITY_SETTINGS: SouqnaCitySettings = {
  enabled: false,
  autoMatchNearest: true,
  rules: SOUQNA_CITY_PRESETS.map((rule) => ({ ...rule, paymentMethods: [...rule.paymentMethods] })),
};

export function isOnlinePaymentMethod(method: PaymentMethod): boolean {
  return (ONLINE_PAYMENT_METHODS as readonly PaymentMethod[]).includes(method);
}

export function checkoutPaymentMethodsForPlan(
  methods: readonly PaymentMethod[],
  canAcceptOnlinePayments: boolean,
): PaymentMethod[] {
  const allowed = canAcceptOnlinePayments ? PAYMENT_METHODS : BASE_CHECKOUT_PAYMENT_METHODS;
  const unique = methods.filter(
    (method, index, all) =>
      (allowed as readonly PaymentMethod[]).includes(method) &&
      all.indexOf(method) === index,
  );
  return unique.length > 0 ? unique : ['cod'];
}

export function checkoutPaymentMethodsForBuyer(
  methods: readonly PaymentMethod[],
  canAcceptOnlinePayments: boolean,
  availability?: CheckoutPaymentAvailabilityInput,
): PaymentMethod[] {
  const allowed = canAcceptOnlinePayments ? PAYMENT_METHODS : BASE_CHECKOUT_PAYMENT_METHODS;
  const cityRule = matchSouqnaCityRule(availability?.city, availability?.souqnaCity);
  const cityAllowedMethods = cityRule?.paymentMethods;
  return methods.filter(
    (method, index, all) =>
      (allowed as readonly PaymentMethod[]).includes(method) &&
      all.indexOf(method) === index &&
      paymentMethodAvailableForCheckout(method, availability) &&
      (!cityAllowedMethods || cityAllowedMethods.includes(method)),
  );
}

export function paymentMethodAvailableForCheckout(
  method: PaymentMethod,
  availability?: CheckoutPaymentAvailabilityInput,
): boolean {
  const rules = availability?.rules?.filter((rule) => rule.method === method) ?? [];
  if (rules.length === 0) return true;
  const city = normalizeCheckoutCity(availability?.city);
  return rules.some((rule) => {
    if (rule.mode !== 'allow_only') return true;
    if (!city) return false;
    return rule.cities.map(normalizeCheckoutCity).includes(city);
  });
}

function normalizeCheckoutCity(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function checkoutDeliveryFeeForBuyer(
  fallbackFeeQar: number,
  city: string | null | undefined,
  souqnaCity?: SouqnaCitySettings | null,
): number {
  const rule = matchSouqnaCityRule(city, souqnaCity);
  if (!rule || rule.deliveryFeeQar === null) return fallbackFeeQar;
  return Math.max(0, Math.floor(rule.deliveryFeeQar));
}

export function matchSouqnaCityRule(
  city: string | null | undefined,
  souqnaCity?: SouqnaCitySettings | null,
): SouqnaCityRule | null {
  if (!souqnaCity?.enabled) return null;
  const normalizedCity = normalizeCheckoutCity(city);
  if (!normalizedCity) return null;
  const enabledRules = souqnaCity.rules.filter((rule) => rule.enabled && rule.city.trim());
  const exact = enabledRules.find((rule) => normalizeCheckoutCity(rule.city) === normalizedCity);
  if (exact) return exact;
  if (!souqnaCity.autoMatchNearest) return null;
  const inferredRegion = souqnaCityRegionForCity(normalizedCity);
  if (!inferredRegion) return null;
  return enabledRules.find((rule) => rule.region === inferredRegion) ?? null;
}

export function souqnaCityRegionForCity(city: string | null | undefined): SouqnaCityRegion | null {
  const normalized = normalizeCheckoutCity(city);
  if (!normalized) return null;
  if (
    [
      'al khor',
      'alkhor',
      'al shamal',
      'shamal',
      'madinat ash shamal',
      'umm salal',
      'lusail',
      'al daayen',
      'سميسمة',
      'الشمال',
      'الخور',
    ].includes(normalized)
  ) {
    return 'northern';
  }
  if (
    [
      'al shahaniya',
      'shahaniya',
      'dukhan',
      'al rayyan',
      'rayyan',
      'abu samra',
      'الشحانية',
      'دخان',
      'الريان',
    ].includes(normalized)
  ) {
    return 'western';
  }
  if (
    ['the pearl', 'pearl', 'west bay', 'lusail marina', 'old airport', 'الؤلؤة', 'الخليج الغربي'].includes(
      normalized,
    )
  ) {
    return 'eastern';
  }
  if (
    [
      'al wakrah',
      'wakrah',
      'al wukair',
      'wukair',
      'mesaieed',
      'mesaieed',
      'al thumamah',
      'thumamah',
      'الوكرة',
      'الوكير',
      'مسيعيد',
      'الثمامة',
    ].includes(normalized)
  ) {
    return 'southern';
  }
  if (
    [
      'doha',
      'msheireb',
      'musherib',
      'bin mahmoud',
      'najma',
      'muntazah',
      'al sadd',
      'madinat khalifa',
      'الدوجة',
      'الدوحة',
      'مشيرب',
      'السد',
      'نجمة',
    ].includes(normalized)
  ) {
    return 'central';
  }
  return null;
}

export type BankDetails = {
  accountName: string;
  iban: string;
  bankName: string;
  swift?: string | null;
  notes?: string | null;
};

export type PayLink = {
  url: string;
  label: string;
};

export type ThankYouSettings = {
  title: string | null;
  message: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  showOrderSummary: boolean;
};

export type CheckoutAddressDesign = 'qatar_plate' | 'soft_card' | 'classic';
export const CHECKOUT_ADDRESS_DESIGNS = [
  'qatar_plate',
  'soft_card',
  'classic',
] as const satisfies readonly CheckoutAddressDesign[];

export type CheckoutButtonStyle = 'solid' | 'maroon' | 'gold' | 'outline';
export const CHECKOUT_BUTTON_STYLES = [
  'solid',
  'maroon',
  'gold',
  'outline',
] as const satisfies readonly CheckoutButtonStyle[];

export type CheckoutTrustBadge =
  | 'secure_checkout'
  | 'fast_confirmation'
  | 'whatsapp_support'
  | 'local_delivery';
export const CHECKOUT_TRUST_BADGES = [
  'secure_checkout',
  'fast_confirmation',
  'whatsapp_support',
  'local_delivery',
] as const satisfies readonly CheckoutTrustBadge[];

export type CheckoutCustomTrustBadge = {
  labelEn: string;
  labelAr: string;
};

export type CheckoutBackgroundPreset = 'sand' | 'pearl' | 'midnight' | 'plate' | 'custom';
export const CHECKOUT_BACKGROUND_PRESETS = [
  'sand',
  'pearl',
  'midnight',
  'plate',
  'custom',
] as const satisfies readonly CheckoutBackgroundPreset[];

export type CheckoutCustomColors = {
  background: string | null;
  surface: string | null;
  accent: string | null;
  text: string | null;
  buttonText: string | null;
};

export type CheckoutPaymentCardStyle = 'soft' | 'bordered' | 'compact';
export const CHECKOUT_PAYMENT_CARD_STYLES = [
  'soft',
  'bordered',
  'compact',
] as const satisfies readonly CheckoutPaymentCardStyle[];

export type CheckoutOrderSummaryLayout = 'side' | 'bottom' | 'compact';
export const CHECKOUT_ORDER_SUMMARY_LAYOUTS = [
  'side',
  'bottom',
  'compact',
] as const satisfies readonly CheckoutOrderSummaryLayout[];

export type CheckoutThankYouStyle = 'warm' | 'minimal' | 'celebration';
export const CHECKOUT_THANK_YOU_STYLES = [
  'warm',
  'minimal',
  'celebration',
] as const satisfies readonly CheckoutThankYouStyle[];

export type CheckoutExperienceSettings = {
  heroTitle: string | null;
  heroSubtitle: string | null;
  backgroundPreset: CheckoutBackgroundPreset;
  customColors: CheckoutCustomColors;
  customCss: string | null;
  buttonStyle: CheckoutButtonStyle;
  trustBadges: CheckoutTrustBadge[];
  customTrustBadges: CheckoutCustomTrustBadge[];
  deliveryNotes: string | null;
  paymentCardStyle: CheckoutPaymentCardStyle;
  orderSummaryLayout: CheckoutOrderSummaryLayout;
  thankYouStyle: CheckoutThankYouStyle;
  paymentAvailabilityRules: CheckoutPaymentAvailabilityRule[];
  souqnaCity: SouqnaCitySettings;
};

export const DEFAULT_CHECKOUT_EXPERIENCE: CheckoutExperienceSettings = {
  heroTitle: null,
  heroSubtitle: null,
  backgroundPreset: 'sand',
  customColors: {
    background: null,
    surface: null,
    accent: null,
    text: null,
    buttonText: null,
  },
  customCss: null,
  buttonStyle: 'solid',
  trustBadges: ['secure_checkout', 'whatsapp_support'],
  customTrustBadges: [],
  deliveryNotes: null,
  paymentCardStyle: 'soft',
  orderSummaryLayout: 'side',
  thankYouStyle: 'warm',
  paymentAvailabilityRules: [],
  souqnaCity: { ...DEFAULT_SOUQNA_CITY_SETTINGS, rules: DEFAULT_SOUQNA_CITY_SETTINGS.rules.map((rule) => ({ ...rule, paymentMethods: [...rule.paymentMethods] })) },
};

export type SkipCashSettings = {
  hasCredentials: boolean;
  clientIdHint: string | null;
  enabled: boolean;
  crConfirmedAt: string | null;
};

export type SadadSettings = {
  hasCredentials: boolean;
  merchantIdHint: string | null;
  websiteHint: string | null;
  verifiedMode: 'live' | 'sandbox' | null;
  verifiedAt: string | null;
  enabled: boolean;
};

export type CheckoutSettings = {
  enabled: boolean;
  paymentMethods: PaymentMethod[];
  bankDetails: BankDetails | null;
  payLink: PayLink | null;
  skipCash: SkipCashSettings | null;
  sadad: SadadSettings | null;
  requiredPolicies: PolicyKey[];
  currency: string;
  minOrderQar: number | null;
  shippingFlatQar: number | null;
  addressDesign: CheckoutAddressDesign;
  experience: CheckoutExperienceSettings;
  thankYou: ThankYouSettings;
};

export const EMPTY_POLICIES: StorefrontPolicies = {
  terms: null,
  privacy: null,
  refund: null,
  shipping: null,
};

export const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = {
  enabled: true,
  paymentMethods: ['cod'],
  bankDetails: null,
  payLink: null,
  skipCash: null,
  sadad: null,
  requiredPolicies: ['terms', 'privacy', 'refund'],
  currency: 'QAR',
  minOrderQar: null,
  shippingFlatQar: null,
  addressDesign: 'qatar_plate',
  experience: { ...DEFAULT_CHECKOUT_EXPERIENCE },
  thankYou: {
    title: null,
    message: null,
    ctaLabel: null,
    ctaUrl: null,
    showOrderSummary: true,
  },
};

/**
 * Both accessors delegate to `getStorefront` so they share the
 * per-request `cache()` with every other code path that already loaded
 * the row (settings layout, builder, public page). The dedicated
 * fields live as plain columns on `briefs` and are mapped in
 * `fromRow`, so this is just a typed projection.
 */
export async function getStorefrontPolicies(slug: string): Promise<StorefrontPolicies> {
  noStore();
  const sf = await getStorefront(slug);
  if (!sf) return { ...EMPTY_POLICIES };
  return sf.policies;
}

export async function getStorefrontCheckoutSettings(slug: string): Promise<CheckoutSettings> {
  noStore();
  const sf = await getStorefront(slug);
  if (!sf) return { ...DEFAULT_CHECKOUT_SETTINGS };
  return sf.checkout;
}

/**
 * Internal-only writers. The public action surface lives in
 * `src/app/actions/storefrontSettings.ts`; these are colocated with
 * the loaders so the SQL stays in one file and keeps tagged-template
 * usage uniform.
 */
export async function writeStorefrontPolicies(
  slug: string,
  patch: StorefrontPolicies,
): Promise<void> {
  await db()`
    update briefs set
      policies_terms    = ${patch.terms},
      policies_privacy  = ${patch.privacy},
      policies_refund   = ${patch.refund},
      policies_shipping = ${patch.shipping}
    where slug = ${slug} and expires_at > now()
  `;
}

export async function writeStorefrontCheckoutSettings(
  slug: string,
  patch: CheckoutSettings,
): Promise<void> {
  const bankJson = patch.bankDetails ? JSON.stringify(patch.bankDetails) : null;
  const thankYouJson = JSON.stringify(patch.thankYou);
  const experienceJson = JSON.stringify({
    ...patch.experience,
    enabled: true,
  });
  await db()`
    update briefs set
      checkout_payment_methods   = ${patch.paymentMethods as unknown as string},
      checkout_bank_details      = ${bankJson}::jsonb,
      checkout_pay_link_url      = ${patch.payLink?.url ?? null},
      checkout_pay_link_label    = ${patch.payLink?.label ?? null},
      checkout_required_policies = ${patch.requiredPolicies as unknown as string},
      checkout_currency          = ${patch.currency},
      checkout_min_order_qar     = ${patch.minOrderQar},
      checkout_shipping_flat_qar = ${patch.shippingFlatQar},
      checkout_address_design    = ${patch.addressDesign},
      checkout_experience        = ${experienceJson}::jsonb,
      checkout_thank_you         = ${thankYouJson}::jsonb
    where slug = ${slug} and expires_at > now()
  `;
}

export type EncryptedSkipCashCredentials = {
  v: 1;
  ct: string;
  clientIdHint: string | null;
  updatedAt: string;
};

export type EncryptedSadadCredentials = {
  v: 1;
  ct: string;
  merchantIdHint: string | null;
  websiteHint: string | null;
  verifiedMode?: 'live' | 'sandbox';
  verifiedAt?: string;
  updatedAt: string;
};

export async function writeStorefrontSkipCashSetup(
  slug: string,
  input: {
    credentials?: EncryptedSkipCashCredentials | null;
    confirmCr?: boolean;
  },
): Promise<void> {
  const credentialsJson =
    input.credentials === undefined
      ? undefined
      : input.credentials
        ? JSON.stringify(input.credentials)
        : null;
  if (credentialsJson !== undefined && input.confirmCr) {
    await db()`
      update briefs set
        checkout_skipcash_credentials = ${credentialsJson}::jsonb,
        cr_confirmed_at = coalesce(cr_confirmed_at, now())
      where slug = ${slug} and expires_at > now()
    `;
    return;
  }
  if (credentialsJson !== undefined) {
    await db()`
      update briefs set checkout_skipcash_credentials = ${credentialsJson}::jsonb
      where slug = ${slug} and expires_at > now()
    `;
    return;
  }
  if (input.confirmCr) {
    await db()`
      update briefs set cr_confirmed_at = coalesce(cr_confirmed_at, now())
      where slug = ${slug} and expires_at > now()
    `;
  }
}

export async function writeStorefrontSadadSetup(
  slug: string,
  credentials: EncryptedSadadCredentials | null,
): Promise<void> {
  const credentialsJson = credentials ? JSON.stringify(credentials) : null;
  await db()`
    update briefs set checkout_sadad_credentials = ${credentialsJson}::jsonb
    where slug = ${slug} and expires_at > now()
  `;
}
