'use server';

/**
 * Storefront settings actions.
 *
 *   saveStorefrontSettings(input)
 *     Generic per-section save for the dashboard's Settings panels
 *     (general, brand, contact, languages, policies, notifications,
 *     customer-accounts). Validates a per-field schema and writes
 *     either to first-class columns (general / brand / contact /
 *     policies) or to ancillary audit metadata (notifications,
 *     customer-accounts) until those grow dedicated columns.
 *
 *   updateCheckoutSettings(input)
 *     Dedicated checkout configuration writer. Front-end contract:
 *
 *     {
 *       slug: string,
 *       paymentMethods: Array<'cod'|'fawran'|'bank_transfer'|'skipcash'|'sadad'|'pay_link'>,
 *       bankDetails: { accountName, iban, bankName, swift?, notes? } | null,
 *       skipCash: { clientId, keyId, keySecret, webhookKey?, confirmCr? } | null,
 *       sadad: { merchantId, website, secretKey } | null,
 *       requiredPolicies: Array<'terms'|'privacy'|'refund'|'shipping'>,
 *       currency: string,
 *       minOrderQar: number | null,
 *       shippingFlatQar: number | null,
 *       addressDesign: 'qatar_plate'|'soft_card'|'classic',
 *       thankYou: { title?, message?, ctaLabel?, ctaUrl?, showOrderSummary }
 *     }
 *
 *     Returns `{ status: 'success' | 'error', message?, field? }` so
 *     forms can surface per-field validation errors. Validation is
 *     conditional on the selected payment methods (IBAN required when
 *     bank_transfer is in the list, CR confirmation + merchant credentials
 *     required when skipcash is in the list, SADAD credentials required
 *     when sadad is in the list) and on the configured policies (you
 *     can't require a policy you haven't written yet).
 */

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getStorefront, updateStorefront, type UpdateStorefrontInput } from '@/lib/brief';
import { assertStorefrontOwner } from '@/lib/products';
import { recordAudit } from '@/lib/audit';
import { PALETTE_IDS } from '@/lib/palettes';
import {
  CHECKOUT_ADDRESS_DESIGNS,
  CHECKOUT_BACKGROUND_PRESETS,
  CHECKOUT_BUTTON_STYLES,
  CHECKOUT_ORDER_SUMMARY_LAYOUTS,
  CHECKOUT_PAYMENT_CARD_STYLES,
  CHECKOUT_THANK_YOU_STYLES,
  CHECKOUT_TRUST_BADGES,
  CONFIGURABLE_PAYMENT_METHODS,
  SOUQNA_CITY_REGIONS,
  checkoutPaymentMethodsForPlan,
  isOnlinePaymentMethod,
  POLICY_KEYS,
  writeStorefrontCheckoutSettings,
  writeStorefrontSadadSetup,
  writeStorefrontSkipCashSetup,
  writeStorefrontPolicies,
  type CheckoutSettings,
  type CheckoutAddressDesign,
  type CheckoutBackgroundPreset,
  type CheckoutButtonStyle,
  type CheckoutCustomColors,
  type CheckoutCustomTrustBadge,
  type CheckoutOrderSummaryLayout,
  type CheckoutPaymentCardStyle,
  type CheckoutThankYouStyle,
  type CheckoutTrustBadge,
  type PaymentMethod,
  type PolicyKey,
  type SouqnaCityRegion,
  type StorefrontPolicies,
} from '@/lib/storefrontSettings';
import { encryptToken } from '@/lib/apps/crypto';
import { verifySadadCredentials } from '@/lib/sadad';
import { getPlan, planUnlocksOnlinePayments } from '@/lib/billing';

/**
 * Settings actions — the dashboard's update-anything write path. The
 * legacy edit page used a single full-form submit; the new Settings
 * surfaces are split into focused per-section panels (general / brand /
 * contact) and each panel posts only the fields it owns. We collapse
 * those into one action because:
 *
 *   - the persistence is the same (`updateStorefront`)
 *   - the ownership check is the same (active store must belong to the
 *     calling Clerk user)
 *   - the audit-log entry is the same shape
 *
 * The action takes a partial patch + the section name. Fields not
 * present in the patch are read off the current row and re-written
 * unchanged, so the underlying `updateStorefront` (which expects a
 * full record) stays simple.
 */
export type SettingsActionState =
  | { status: 'idle' }
  | { status: 'success'; updatedAt: string }
  | { status: 'error'; message: string };

const PatchSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  section: z.enum([
    'general',
    'brand',
    'contact',
    'languages',
    'policies',
    'notifications',
    'customer-accounts',
  ]),
  // Generic free-form patch. Validated per-field below to give the
  // founder per-field error feedback rather than a single zod blob.
  patch: z.record(z.string(), z.unknown()),
});

const FIELD_SCHEMAS: Record<string, z.ZodTypeAny> = {
  founderName: z.string().trim().min(1).max(120),
  businessName: z.string().trim().min(1).max(120),
  tagline: z
    .string()
    .trim()
    .max(280)
    .nullable()
    .optional()
    .transform((v) => (v == null ? null : v)),
  phone: z.string().trim().max(40).nullable().optional(),
  area: z.string().trim().max(120).nullable().optional(),
  hours: z.string().trim().max(280).nullable().optional(),
  instagram: z.string().trim().max(120).nullable().optional(),
  logoUrl: z
    .string()
    .url()
    .max(2048)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  faviconUrl: z
    .string()
    .url()
    .max(2048)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  crNumber: z.string().trim().max(64).nullable().optional(),
  palette: z.enum(PALETTE_IDS as unknown as [string, ...string[]]),
  notificationsConfig: z.record(z.string(), z.boolean()).optional(),
  policies: z
    .object({
      terms: z.string().trim().max(20000).optional(),
      privacy: z.string().trim().max(20000).optional(),
      refund: z.string().trim().max(20000).optional(),
      shipping: z.string().trim().max(20000).optional(),
    })
    .optional(),
  customerAccounts: z
    .object({
      mode: z.enum(['off', 'optional', 'required']),
    })
    .optional(),
};

function validateField(field: string, value: unknown): unknown {
  const schema = FIELD_SCHEMAS[field];
  if (!schema) {
    throw new Error(`Field '${field}' is not editable from settings.`);
  }
  return schema.parse(value);
}

export async function saveStorefrontSettings(
  input: z.input<typeof PatchSchema>,
): Promise<SettingsActionState> {
  const parsed = PatchSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: 'Invalid request payload.' };
  }

  const { userId } = await auth();
  if (!userId) {
    return { status: 'error', message: 'Sign in to save changes.' };
  }

  const current = await getStorefront(parsed.data.slug);
  if (!current || current.clerkUserId !== userId) {
    return { status: 'error', message: 'Storefront not found.' };
  }

  // Validate every patch field independently. A bad value short-circuits
  // before we touch the DB.
  const validated: Record<string, unknown> = {};
  try {
    for (const [k, v] of Object.entries(parsed.data.patch)) {
      validated[k] = validateField(k, v);
    }
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Invalid field value.',
    };
  }

  // Build the full record `updateStorefront` expects: start with the
  // current row, apply the patch on top.
  const next: UpdateStorefrontInput = {
    founderName: (validated.founderName as string) ?? current.founderName,
    businessName: (validated.businessName as string) ?? current.businessName,
    ownership: current.ownership,
    experience: current.experience,
    businessType: current.businessType,
    marketVolume: current.marketVolume,
    payments: current.payments,
    tagline: 'tagline' in validated ? (validated.tagline as string | null) : current.tagline,
    phone: 'phone' in validated ? (validated.phone as string | null) : current.phone,
    area: 'area' in validated ? (validated.area as string | null) : current.area,
    hours: 'hours' in validated ? (validated.hours as string | null) : current.hours,
    instagram:
      'instagram' in validated ? (validated.instagram as string | null) : current.instagram,
    logoUrl: 'logoUrl' in validated ? (validated.logoUrl as string | null) : current.logoUrl,
    faviconUrl:
      'faviconUrl' in validated ? (validated.faviconUrl as string | null) : current.faviconUrl,
    design: current.design,
    palette:
      'palette' in validated ? (validated.palette as typeof current.palette) : current.palette,
    templateId: current.templateId,
    crNumber: 'crNumber' in validated ? (validated.crNumber as string | null) : current.crNumber,
  };

  // Notifications and customer-accounts still live in audit metadata
  // until they grow dedicated columns. Policies graduate to first-class
  // `policies_*` columns in migration 016 — extract here and write
  // alongside the main `updateStorefront` call so a single section
  // submit is one logical save.
  const ancillary: Record<string, unknown> = {};
  for (const k of ['notificationsConfig', 'customerAccounts']) {
    if (k in validated) ancillary[k] = validated[k];
  }

  let policiesPatch: StorefrontPolicies | null = null;
  if ('policies' in validated && validated.policies) {
    const p = validated.policies as {
      terms?: string;
      privacy?: string;
      refund?: string;
      shipping?: string;
    };
    const norm = (v: string | undefined): string | null => {
      if (typeof v !== 'string') return null;
      const t = v.trim();
      return t.length === 0 ? null : t;
    };
    policiesPatch = {
      terms: 'terms' in p ? norm(p.terms) : current.policies.terms,
      privacy: 'privacy' in p ? norm(p.privacy) : current.policies.privacy,
      refund: 'refund' in p ? norm(p.refund) : current.policies.refund,
      shipping: 'shipping' in p ? norm(p.shipping) : current.policies.shipping,
    };
  }

  try {
    await updateStorefront(parsed.data.slug, next);
    if (policiesPatch) {
      await writeStorefrontPolicies(parsed.data.slug, policiesPatch);
    }
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: userId,
      action: `settings.${parsed.data.section}`,
      targetId: parsed.data.slug,
      summary: `Updated ${parsed.data.section} settings`,
      meta: policiesPatch
        ? {
            ...ancillary,
            policiesPresent: {
              terms: policiesPatch.terms !== null,
              privacy: policiesPatch.privacy !== null,
              refund: policiesPatch.refund !== null,
              shipping: policiesPatch.shipping !== null,
            },
          }
        : { ...validated, ...ancillary },
    });
  } catch {
    return { status: 'error', message: 'Save failed. Try again.' };
  }

  // Revalidate every settings page so the read after the write reflects
  // the change. Cheap because they're all SSR-cached at request scope.
  revalidatePath('/account', 'layout');

  return { status: 'success', updatedAt: new Date().toISOString() };
}

export type CheckoutActionState =
  | { status: 'idle' }
  | { status: 'success'; updatedAt: string }
  | { status: 'error'; message: string; field?: string };

const IBAN_REGEX = /^[A-Z]{2}[0-9A-Z]{13,32}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

const BankDetailsSchema = z.object({
  accountName: z.string().trim().min(1).max(120),
  iban: z
    .string()
    .trim()
    .max(34)
    .transform((v) => v.replace(/\s+/g, '').toUpperCase()),
  bankName: z.string().trim().min(1).max(120),
  swift: z
    .string()
    .trim()
    .max(11)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : null)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

const PayLinkSchema = z.object({
  url: z.string().trim().url().max(2048),
  label: z.string().trim().min(1).max(80),
});

const SkipCashSetupSchema = z.object({
  clientId: z.string().trim().max(240).optional().default(''),
  keyId: z.string().trim().max(240).optional().default(''),
  keySecret: z.string().trim().max(2000).optional().default(''),
  webhookKey: z.string().trim().max(2000).optional().default(''),
  confirmCr: z.boolean().optional().default(false),
});

const SadadSetupSchema = z.object({
  merchantId: z.string().trim().max(120).optional().default(''),
  website: z.string().trim().max(240).optional().default(''),
  secretKey: z.string().trim().max(2000).optional().default(''),
});

const nullableTrimmedText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null));

function isValidThankYouCtaUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const ThankYouSchema = z.object({
  title: nullableTrimmedText(120).optional(),
  message: nullableTrimmedText(600).optional(),
  ctaLabel: nullableTrimmedText(80).optional(),
  ctaUrl: nullableTrimmedText(500)
    .refine(isValidThankYouCtaUrl, {
      message: 'CTA link must be a relative path or an http(s) URL.',
    })
    .optional(),
  showOrderSummary: z.boolean().optional(),
});

const nullableHexColor = z
  .string()
  .trim()
  .max(9)
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine((value) => value === null || /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value), {
    message: 'Use a hex color like #8B3A3A.',
  });

const CustomColorsSchema = z.object({
  background: nullableHexColor.optional(),
  surface: nullableHexColor.optional(),
  accent: nullableHexColor.optional(),
  text: nullableHexColor.optional(),
  buttonText: nullableHexColor.optional(),
}).transform(
  (colors): CheckoutCustomColors => ({
    background: colors.background ?? null,
    surface: colors.surface ?? null,
    accent: colors.accent ?? null,
    text: colors.text ?? null,
    buttonText: colors.buttonText ?? null,
  }),
);

const CustomTrustBadgeSchema = z.object({
  labelEn: z.string().trim().max(48).optional().default(''),
  labelAr: z.string().trim().max(48).optional().default(''),
});

const SouqnaCityRuleSchema = z.object({
  id: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  region: z
    .enum(SOUQNA_CITY_REGIONS as unknown as [SouqnaCityRegion, ...SouqnaCityRegion[]])
    .default('custom'),
  enabled: z.boolean().default(true),
  paymentMethods: z
    .array(z.enum(CONFIGURABLE_PAYMENT_METHODS as unknown as [PaymentMethod, ...PaymentMethod[]]))
    .min(1)
    .max(CONFIGURABLE_PAYMENT_METHODS.length)
    .transform((arr) => Array.from(new Set(arr)) as PaymentMethod[]),
  deliveryFeeQar: z.number().int().min(0).max(1_000_000).nullable(),
});

const SouqnaCitySettingsSchema = z.object({
  enabled: z.boolean().default(false),
  autoMatchNearest: z.boolean().default(true),
  rules: z
    .array(SouqnaCityRuleSchema)
    .max(30)
    .transform((rules) => {
      const seen = new Set<string>();
      return rules.filter((rule) => {
        const key = rule.city.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }),
});

const CheckoutExperienceSchema = z.object({
  heroTitle: nullableTrimmedText(120).optional(),
  heroSubtitle: nullableTrimmedText(240).optional(),
  backgroundPreset: z
    .enum(
      CHECKOUT_BACKGROUND_PRESETS as unknown as [
        CheckoutBackgroundPreset,
        ...CheckoutBackgroundPreset[],
      ],
    )
    .optional(),
  customColors: CustomColorsSchema.optional(),
  customCss: nullableTrimmedText(2500).optional(),
  buttonStyle: z
    .enum(CHECKOUT_BUTTON_STYLES as unknown as [CheckoutButtonStyle, ...CheckoutButtonStyle[]])
    .optional(),
  trustBadges: z
    .array(z.enum(CHECKOUT_TRUST_BADGES as unknown as [CheckoutTrustBadge, ...CheckoutTrustBadge[]]))
    .optional()
    .transform((arr) => (arr ? Array.from(new Set(arr)) : undefined)),
  customTrustBadges: z
    .array(CustomTrustBadgeSchema)
    .max(6)
    .optional()
    .transform((items) =>
      items
        ?.map((item) => ({
          labelEn: (item.labelEn || item.labelAr).trim(),
          labelAr: (item.labelAr || item.labelEn).trim(),
        }))
        .filter((item): item is CheckoutCustomTrustBadge =>
          Boolean(item.labelEn || item.labelAr),
        ),
    ),
  deliveryNotes: nullableTrimmedText(420).optional(),
  paymentCardStyle: z
    .enum(
      CHECKOUT_PAYMENT_CARD_STYLES as unknown as [
        CheckoutPaymentCardStyle,
        ...CheckoutPaymentCardStyle[],
      ],
    )
    .optional(),
  orderSummaryLayout: z
    .enum(
      CHECKOUT_ORDER_SUMMARY_LAYOUTS as unknown as [
        CheckoutOrderSummaryLayout,
        ...CheckoutOrderSummaryLayout[],
      ],
    )
    .optional(),
  thankYouStyle: z
    .enum(CHECKOUT_THANK_YOU_STYLES as unknown as [CheckoutThankYouStyle, ...CheckoutThankYouStyle[]])
    .optional(),
  souqnaCity: SouqnaCitySettingsSchema.optional(),
});

const CheckoutInputSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  paymentMethods: z
    .array(z.enum(CONFIGURABLE_PAYMENT_METHODS as unknown as [PaymentMethod, ...PaymentMethod[]]))
    .min(1, 'Pick at least one payment method.')
    .transform((arr) => Array.from(new Set(arr)) as PaymentMethod[]),
  bankDetails: BankDetailsSchema.nullable(),
  payLink: PayLinkSchema.nullable(),
  skipCash: SkipCashSetupSchema.nullable().optional(),
  sadad: SadadSetupSchema.nullable().optional(),
  requiredPolicies: z
    .array(z.enum(POLICY_KEYS as unknown as [PolicyKey, ...PolicyKey[]]))
    .transform((arr) => Array.from(new Set(arr)) as PolicyKey[]),
  currency: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => CURRENCY_REGEX.test(v), {
      message: 'Currency must be a 3-letter ISO 4217 code.',
    })
    .default('QAR'),
  minOrderQar: z.number().int().min(0).max(1_000_000).nullable(),
  shippingFlatQar: z.number().int().min(0).max(1_000_000).nullable(),
  addressDesign: z
    .enum(CHECKOUT_ADDRESS_DESIGNS as unknown as [CheckoutAddressDesign, ...CheckoutAddressDesign[]])
    .default('qatar_plate'),
  experience: CheckoutExperienceSchema.optional(),
  thankYou: ThankYouSchema.optional(),
});

export type UpdateCheckoutSettingsInput = z.input<typeof CheckoutInputSchema>;

const CheckoutExperienceInputSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  addressDesign: z.enum(
    CHECKOUT_ADDRESS_DESIGNS as unknown as [CheckoutAddressDesign, ...CheckoutAddressDesign[]],
  ),
  experience: CheckoutExperienceSchema,
  thankYou: ThankYouSchema.optional(),
});

export type UpdateCheckoutExperienceInput = z.input<typeof CheckoutExperienceInputSchema>;

export type CheckoutExperienceActionState =
  | { status: 'idle' }
  | { status: 'success'; updatedAt: string; checkout: CheckoutSettings }
  | { status: 'error'; message: string; field?: string };

function maskIban(iban: string): string {
  const trimmed = iban.replace(/\s+/g, '');
  if (trimmed.length <= 4) return '••••';
  return `••••${trimmed.slice(-4)}`;
}

export async function updateCheckoutSettings(
  input: UpdateCheckoutSettingsInput,
): Promise<CheckoutActionState> {
  const parsed = CheckoutInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: 'error',
      message: issue?.message ?? 'Invalid checkout settings.',
      field: issue?.path?.[0] as string | undefined,
    };
  }
  const data = parsed.data;

  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to save changes.' };

  const owner = await assertStorefrontOwner(data.slug, userId);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  const ownerPlan = await getPlan(userId);
  const canAcceptOnlinePayments = planUnlocksOnlinePayments(ownerPlan);
  const requestedOnlinePayments = Boolean(
    data.paymentMethods.some(isOnlinePaymentMethod) ||
      data.bankDetails ||
      data.payLink ||
      data.skipCash ||
      data.sadad,
  );
  if (!canAcceptOnlinePayments && requestedOnlinePayments) {
    return {
      status: 'error',
      message:
        'Provider payments require Pro+ or Max+. Free and Pro can receive orders with cash on delivery and Fawran.',
      field: 'paymentMethods',
    };
  }

  const paymentMethods = checkoutPaymentMethodsForPlan(
    data.paymentMethods,
    canAcceptOnlinePayments,
  );

  if (paymentMethods.includes('bank_transfer')) {
    if (!data.bankDetails) {
      return {
        status: 'error',
        message: 'Bank details are required when bank transfer is enabled.',
        field: 'bankDetails',
      };
    }
    if (!IBAN_REGEX.test(data.bankDetails.iban)) {
      return {
        status: 'error',
        message: 'IBAN must be 2 letters followed by 13–32 alphanumerics.',
        field: 'iban',
      };
    }
  }

  if (paymentMethods.includes('pay_link') && !data.payLink) {
    return {
      status: 'error',
      message: 'Payment link label and URL are required when payment link is enabled.',
      field: 'payLink',
    };
  }

  const skipCashSelected = paymentMethods.includes('skipcash');
  const skipCashFields = data.skipCash ?? null;
  const providedSkipCashCredentials = Boolean(
    skipCashFields?.clientId ||
      skipCashFields?.keyId ||
      skipCashFields?.keySecret ||
      skipCashFields?.webhookKey,
  );

  if (skipCashSelected) {
    if (!owner.crNumber || owner.crNumber.trim().length === 0) {
      return {
        status: 'error',
        message: 'Add your CR number in Brand settings before enabling SkipCash.',
        field: 'paymentMethods',
      };
    }
    const crConfirmed = Boolean(owner.crConfirmedAt || skipCashFields?.confirmCr);
    if (!crConfirmed) {
      return {
        status: 'error',
        message: 'Confirm that the CR belongs to this business before enabling SkipCash.',
        field: 'skipCash',
      };
    }
    const hasExistingCredentials = Boolean(owner.checkout.skipCash?.hasCredentials);
    const hasNewCredentials = Boolean(
      skipCashFields?.clientId && skipCashFields.keyId && skipCashFields.keySecret,
    );
    if (!hasExistingCredentials && !hasNewCredentials) {
      return {
        status: 'error',
        message: 'Save your SkipCash client id, key id, and key secret first.',
        field: 'skipCash',
      };
    }
  }

  const sadadSelected = paymentMethods.includes('sadad');
  const sadadFields = data.sadad ?? null;
  const providedSadadCredentials = Boolean(
    sadadFields?.merchantId || sadadFields?.website || sadadFields?.secretKey,
  );

  if (sadadSelected) {
    const hasExistingCredentials = Boolean(owner.checkout.sadad?.hasCredentials);
    const hasNewCredentials = Boolean(
      sadadFields?.merchantId && sadadFields.website && sadadFields.secretKey,
    );
    if (!hasExistingCredentials && !hasNewCredentials) {
      return {
        status: 'error',
        message: 'Save your SADAD merchant id, website, and secret key first.',
        field: 'sadad',
      };
    }
  }

  // Cross-validate: a required policy must already exist as text on
  // the briefs row. Otherwise the founder would publish a checkout
  // that asks the buyer to accept an empty policy.
  const labels: Record<PolicyKey, string> = {
    terms: 'Terms of service',
    privacy: 'Privacy policy',
    refund: 'Refund policy',
    shipping: 'Shipping policy',
  };
  const missing = data.requiredPolicies.filter((k) => {
    const v = owner.policies[k];
    return !v || v.trim().length === 0;
  });
  if (missing.length > 0) {
    return {
      status: 'error',
      message: `Write the ${labels[missing[0]!]} text first, then require it at checkout.`,
      field: 'requiredPolicies',
    };
  }

  let sadadCredentialsToSave: {
    v: 1;
    ct: string;
    merchantIdHint: string | null;
    websiteHint: string | null;
    verifiedMode: 'live' | 'sandbox';
    verifiedAt: string;
    updatedAt: string;
  } | null = null;
  if (providedSadadCredentials) {
    if (!sadadFields?.merchantId || !sadadFields.website || !sadadFields.secretKey) {
      return {
        status: 'error',
        message: 'Merchant id, website, and secret key are required for SADAD.',
        field: 'sadad',
      };
    }
    const payload = {
      merchantId: sadadFields.merchantId,
      website: sadadFields.website,
      secretKey: sadadFields.secretKey,
    };
    const verification = await verifySadadCredentials(payload);
    if (!verification.ok) {
      return {
        status: 'error',
        message: verification.reason,
        field: 'sadad',
      };
    }
    const verifiedAt = new Date().toISOString();
    sadadCredentialsToSave = {
      v: 1,
      ct: encryptToken(JSON.stringify(payload)),
      merchantIdHint:
        sadadFields.merchantId.length > 4 ? `••••${sadadFields.merchantId.slice(-4)}` : '••••',
      websiteHint: sadadFields.website,
      verifiedMode: verification.mode,
      verifiedAt,
      updatedAt: verifiedAt,
    };
  }

  const experience = data.experience
    ? { ...owner.checkout.experience, ...data.experience }
    : owner.checkout.experience;
  if (data.experience?.souqnaCity) {
    experience.souqnaCity = {
      ...data.experience.souqnaCity,
      rules: data.experience.souqnaCity.rules.map((rule) => ({
        ...rule,
        paymentMethods: checkoutPaymentMethodsForPlan(rule.paymentMethods, canAcceptOnlinePayments),
      })),
    };
  }

  const settings: CheckoutSettings = {
    enabled: true,
    paymentMethods,
    bankDetails: paymentMethods.includes('bank_transfer')
      ? data.bankDetails
      : paymentMethods.includes('fawran')
        ? owner.checkout.bankDetails
        : null,
    payLink: paymentMethods.includes('pay_link') ? data.payLink : null,
    skipCash: owner.checkout.skipCash,
    sadad: owner.checkout.sadad,
    requiredPolicies: data.requiredPolicies,
    currency: data.currency,
    minOrderQar: data.minOrderQar,
    shippingFlatQar: data.shippingFlatQar,
    addressDesign: data.addressDesign,
    experience,
    thankYou: data.thankYou
      ? { ...owner.checkout.thankYou, ...data.thankYou }
      : owner.checkout.thankYou,
  };

  try {
    await writeStorefrontCheckoutSettings(data.slug, settings);
    if (skipCashSelected && (providedSkipCashCredentials || skipCashFields?.confirmCr)) {
      let credentials:
        | {
            v: 1;
            ct: string;
            clientIdHint: string | null;
            updatedAt: string;
          }
        | undefined;
      if (providedSkipCashCredentials) {
        if (!skipCashFields?.clientId || !skipCashFields.keyId || !skipCashFields.keySecret) {
          return {
            status: 'error',
            message: 'Client id, key id, and key secret are required for SkipCash.',
            field: 'skipCash',
          };
        }
        const payload = {
          clientId: skipCashFields.clientId,
          keyId: skipCashFields.keyId,
          keySecret: skipCashFields.keySecret,
          webhookKey: skipCashFields.webhookKey || null,
        };
        credentials = {
          v: 1,
          ct: encryptToken(JSON.stringify(payload)),
          clientIdHint:
            skipCashFields.clientId.length > 4
              ? `••••${skipCashFields.clientId.slice(-4)}`
              : '••••',
          updatedAt: new Date().toISOString(),
        };
      }
      await writeStorefrontSkipCashSetup(data.slug, {
        credentials,
        confirmCr: Boolean(skipCashFields?.confirmCr),
      });
    }
    if (sadadCredentialsToSave) {
      await writeStorefrontSadadSetup(data.slug, sadadCredentialsToSave);
    }
    await recordAudit({
      storefrontSlug: data.slug,
      clerkUserId: userId,
      action: 'storefront.checkout.update',
      targetId: data.slug,
      summary: `Checkout updated · ${settings.paymentMethods.join(', ')}`,
      meta: {
        paymentMethods: settings.paymentMethods,
        requiredPolicies: settings.requiredPolicies,
        currency: settings.currency,
        bankIbanMasked: settings.bankDetails ? maskIban(settings.bankDetails.iban) : null,
        skipCashSelected,
        skipCashCredentialsUpdated: providedSkipCashCredentials,
        sadadSelected,
        sadadCredentialsUpdated: providedSadadCredentials,
        minOrderQar: settings.minOrderQar,
        shippingFlatQar: settings.shippingFlatQar,
        addressDesign: settings.addressDesign,
        checkoutExperienceCustomized: Boolean(
          settings.experience.heroTitle ||
            settings.experience.heroSubtitle ||
            settings.experience.deliveryNotes,
        ),
        thankYouCustomized: Boolean(settings.thankYou.title || settings.thankYou.message),
        thankYouCtaConfigured: Boolean(settings.thankYou.ctaLabel && settings.thankYou.ctaUrl),
      },
    });
  } catch {
    return { status: 'error', message: 'Save failed. Try again.' };
  }

  revalidatePath('/account', 'layout');
  revalidatePath(`/${data.slug}`);

  return { status: 'success', updatedAt: new Date().toISOString() };
}

export async function updateCheckoutExperienceSettings(
  input: UpdateCheckoutExperienceInput,
): Promise<CheckoutExperienceActionState> {
  const parsed = CheckoutExperienceInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: 'error',
      message: issue?.message ?? 'Invalid checkout design settings.',
      field: issue?.path?.[0] as string | undefined,
    };
  }

  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to save changes.' };

  const owner = await assertStorefrontOwner(parsed.data.slug, userId);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  const settings: CheckoutSettings = {
    ...owner.checkout,
    enabled: true,
    addressDesign: parsed.data.addressDesign,
    experience: {
      ...owner.checkout.experience,
      ...parsed.data.experience,
    },
    thankYou: parsed.data.thankYou
      ? { ...owner.checkout.thankYou, ...parsed.data.thankYou }
      : owner.checkout.thankYou,
  };

  try {
    await writeStorefrontCheckoutSettings(parsed.data.slug, settings);
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: userId,
      action: 'storefront.checkout.experience',
      targetId: parsed.data.slug,
      summary: 'Checkout experience updated from Builder',
      meta: {
        addressDesign: settings.addressDesign,
        enabled: settings.enabled,
        backgroundPreset: settings.experience.backgroundPreset,
        customColorsConfigured: Object.values(settings.experience.customColors).some(Boolean),
        customCssConfigured: Boolean(settings.experience.customCss),
        buttonStyle: settings.experience.buttonStyle,
        paymentCardStyle: settings.experience.paymentCardStyle,
        orderSummaryLayout: settings.experience.orderSummaryLayout,
        thankYouStyle: settings.experience.thankYouStyle,
        trustBadges: settings.experience.trustBadges,
        customTrustBadgeCount: settings.experience.customTrustBadges.length,
      },
    });
  } catch {
    return { status: 'error', message: 'Save failed. Try again.' };
  }

  revalidatePath('/account', 'layout');
  revalidatePath(`/${parsed.data.slug}`);
  revalidatePath(`/brief/${parsed.data.slug}`, 'layout');
  return { status: 'success', updatedAt: new Date().toISOString(), checkout: settings };
}
