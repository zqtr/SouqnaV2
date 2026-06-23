import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
  searchParam,
} from '@/lib/mobile/auth';
import { updateStorefront, type Storefront, type UpdateStorefrontInput } from '@/lib/brief';
import { recordAudit } from '@/lib/audit';
import { encryptToken } from '@/lib/apps/crypto';
import {
  checkoutPaymentMethodsForPlan,
  isOnlinePaymentMethod,
  PAYMENT_METHODS,
  POLICY_KEYS,
  writeStorefrontCheckoutSettings,
  writeStorefrontSadadSetup,
  writeStorefrontSkipCashSetup,
  type BankDetails,
  type CheckoutSettings,
  type PaymentMethod,
  type PolicyKey,
} from '@/lib/storefrontSettings';
import { verifySadadCredentials } from '@/lib/sadad';
import { getPlan, planUnlocksOnlinePayments } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

const SkipCashSchema = z
  .object({
    clientId: z.string().trim().max(240).optional().default(''),
    keyId: z.string().trim().max(240).optional().default(''),
    keySecret: z.string().trim().max(2000).optional().default(''),
    webhookKey: z.string().trim().max(2000).optional().default(''),
    confirmCr: z.boolean().optional().default(false),
  })
  .strict();

const SadadSchema = z
  .object({
    merchantId: z.string().trim().max(120).optional().default(''),
    website: z.string().trim().max(240).optional().default(''),
    secretKey: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

const FawranSchema = z
  .object({
    mode: z.enum(['fawran_number', 'commercial_registration']).optional().default('fawran_number'),
    number: z.string().trim().max(64).optional().default(''),
    commercialRegistration: z.string().trim().max(64).optional().default(''),
    autoCheckout: z.boolean().optional().default(true),
  })
  .strict();

const IBAN_REGEX = /^[A-Z]{2}[0-9A-Z]{13,32}$/i;

const BankDetailsSchema = z
  .object({
    accountName: z.string().trim().min(1).max(160),
    iban: z
      .string()
      .trim()
      .transform((value) => value.replace(/\s+/g, '').toUpperCase())
      .refine((value) => IBAN_REGEX.test(value), {
        message: 'IBAN must be 2 letters followed by 13-32 alphanumerics.',
      }),
    bankName: z.string().trim().min(1).max(160),
    swift: z.string().trim().max(40).nullable().optional(),
    notes: z.string().trim().max(280).nullable().optional(),
  })
  .strict();

const PayLinkSchema = z
  .object({
    url: z.string().trim().url().max(2048),
    label: z.string().trim().min(1).max(80),
  })
  .strict();

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

const ThankYouSchema = z
  .object({
    title: nullableTrimmedText(120).optional(),
    message: nullableTrimmedText(600).optional(),
    ctaLabel: nullableTrimmedText(80).optional(),
    ctaUrl: nullableTrimmedText(500)
      .refine(isValidThankYouCtaUrl, {
        message: 'CTA link must be a relative path or an http(s) URL.',
      })
      .optional(),
    showOrderSummary: z.boolean().optional(),
  })
  .strict();

const PatchSchema = z.object({
  store: z.string().trim().min(1).max(64).optional(),
  enableSkipCash: z.boolean().optional(),
  crNumber: z.string().trim().max(64).nullable().optional(),
  paymentMethods: z
    .array(z.enum(PAYMENT_METHODS as unknown as [PaymentMethod, ...PaymentMethod[]]))
    .optional()
    .transform((arr) => (arr ? (Array.from(new Set(arr)) as PaymentMethod[]) : undefined)),
  skipCash: SkipCashSchema.nullable().optional(),
  sadad: SadadSchema.nullable().optional(),
  fawran: FawranSchema.nullable().optional(),
  bankDetails: BankDetailsSchema.nullable().optional(),
  payLink: PayLinkSchema.nullable().optional(),
  requiredPolicies: z
    .array(z.enum(POLICY_KEYS as unknown as [PolicyKey, ...PolicyKey[]]))
    .optional()
    .transform((arr) => (arr ? (Array.from(new Set(arr)) as PolicyKey[]) : undefined)),
  currency: z
    .string()
    .trim()
    .min(3)
    .max(8)
    .optional()
    .transform((value) => (value ? value.toUpperCase() : undefined)),
  shippingFlatQar: z.number().int().min(0).max(1_000_000).nullable().optional(),
  minOrderQar: z.number().int().min(0).max(1_000_000).nullable().optional(),
  thankYou: ThankYouSchema.optional(),
});

export async function GET(req: Request): Promise<Response> {
  const slug = searchParam(req, 'store');
  const gate = await requireMobileStoreAccess(slug, 'settings.manage');
  if (!gate.ok) return gate.response;
  const plan = await getPlan(gate.access.storefront.clerkUserId);
  return mobileJson(toPayload(gate.access.storefront, planUnlocksOnlinePayments(plan)));
}

export async function PATCH(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(400, 'invalid_checkout', 'Invalid checkout settings.');
  }

  const slug = parsed.data.store ?? searchParam(req, 'store');
  const gate = await requireMobileStoreAccess(slug, 'settings.manage');
  if (!gate.ok) return gate.response;

  const current = gate.access.storefront;
  const ownerPlan = await getPlan(current.clerkUserId);
  const canAcceptOnlinePayments = planUnlocksOnlinePayments(ownerPlan);
  const nextCrNumber =
    'crNumber' in parsed.data ? normalizeNullable(parsed.data.crNumber) : current.crNumber;
  let workingStorefront = current;

  if (nextCrNumber !== current.crNumber) {
    const next: UpdateStorefrontInput = {
      founderName: current.founderName,
      businessName: current.businessName,
      ownership: current.ownership,
      experience: current.experience,
      businessType: current.businessType,
      marketVolume: current.marketVolume,
      payments: current.payments,
      tagline: current.tagline,
      phone: current.phone,
      area: current.area,
      hours: current.hours,
      instagram: current.instagram,
      logoUrl: current.logoUrl,
      faviconUrl: current.faviconUrl,
      design: current.design,
      palette: current.palette,
      templateId: current.templateId,
      crNumber: nextCrNumber,
    };
    const updated = await updateStorefront(current.slug, next);
    if (!updated) {
      return mobileError(500, 'checkout_failed', 'Could not save CR number.');
    }
    workingStorefront = updated;
  }

  const existingMethods = workingStorefront.checkout.paymentMethods.length
    ? workingStorefront.checkout.paymentMethods
    : (['cod'] as PaymentMethod[]);
  const paymentMethods = parsed.data.paymentMethods ?? existingMethods;
  const requestedOnlinePayments = Boolean(
    parsed.data.paymentMethods?.some(isOnlinePaymentMethod) ||
      parsed.data.enableSkipCash === true ||
      parsed.data.skipCash ||
      parsed.data.sadad ||
      parsed.data.fawran ||
      parsed.data.bankDetails ||
      parsed.data.payLink,
  );
  if (!canAcceptOnlinePayments && requestedOnlinePayments) {
    return mobileError(
      402,
      'online_payments_plan_required',
      'Online payments require Pro+ or Max+. Pro can receive orders and WhatsApp notifications with cash on delivery.',
    );
  }
  const shouldEnableSkipCash = canAcceptOnlinePayments
    ? (parsed.data.enableSkipCash ?? paymentMethods.includes('skipcash'))
    : false;
  const requestedPaymentMethods = shouldEnableSkipCash
    ? uniqueMethods([...paymentMethods, 'skipcash'])
    : uniqueMethods(paymentMethods.filter((method) => method !== 'skipcash'));
  const nextPaymentMethods = checkoutPaymentMethodsForPlan(
    requestedPaymentMethods,
    canAcceptOnlinePayments,
  );
  const bankDetails =
    parsed.data.bankDetails === undefined
      ? workingStorefront.checkout.bankDetails
      : parsed.data.bankDetails;
  const fawranFields = parsed.data.fawran ?? null;
  const fawranCredential =
    fawranFields?.mode === 'commercial_registration'
      ? fawranFields.commercialRegistration || nextCrNumber || ''
      : fawranFields?.number || '';
  const fawranBankDetails: BankDetails | null = fawranCredential
    ? {
        accountName: workingStorefront.businessName,
        bankName: 'Fawran',
        iban: 'Fawran',
        notes:
          fawranFields?.mode === 'commercial_registration'
            ? `Commercial Registration: ${fawranCredential}`
            : `Fawran Number: ${fawranCredential}`,
      }
    : null;

  if (nextPaymentMethods.includes('bank_transfer') && !bankDetails) {
    return mobileError(
      400,
      'missing_bank_details',
      'Bank details are required when bank transfer is enabled.',
    );
  }

  const payLink =
    parsed.data.payLink === undefined ? workingStorefront.checkout.payLink : parsed.data.payLink;
  if (nextPaymentMethods.includes('pay_link') && !payLink) {
    return mobileError(
      400,
      'missing_pay_link',
      'Payment link label and URL are required when payment link is enabled.',
    );
  }

  const skipCashFields = parsed.data.skipCash ?? null;
  const providedCredentials = Boolean(
    skipCashFields?.clientId ||
      skipCashFields?.keyId ||
      skipCashFields?.keySecret ||
      skipCashFields?.webhookKey,
  );

  if (shouldEnableSkipCash) {
    if (!workingStorefront.crNumber?.trim()) {
      return mobileError(400, 'missing_cr', 'Add your CR number before enabling SkipCash.');
    }
    if (!workingStorefront.crConfirmedAt && !skipCashFields?.confirmCr) {
      return mobileError(
        400,
        'cr_not_confirmed',
        'Confirm that the CR belongs to this business before enabling SkipCash.',
      );
    }
    const hasExistingCredentials = Boolean(workingStorefront.checkout.skipCash?.hasCredentials);
    const hasNewCredentials = Boolean(
      skipCashFields?.clientId && skipCashFields.keyId && skipCashFields.keySecret,
    );
    if (!hasExistingCredentials && !hasNewCredentials) {
      return mobileError(
        400,
        'missing_skipcash_credentials',
        'Client id, key id, and key secret are required for SkipCash.',
      );
    }
  }

  const sadadFields = parsed.data.sadad ?? null;
  const providedSadadCredentials = Boolean(
    sadadFields?.merchantId || sadadFields?.website || sadadFields?.secretKey,
  );
  const sadadSelected = nextPaymentMethods.includes('sadad');

  if (sadadSelected) {
    const hasExistingCredentials = Boolean(workingStorefront.checkout.sadad?.hasCredentials);
    const hasNewCredentials = Boolean(
      sadadFields?.merchantId && sadadFields.website && sadadFields.secretKey,
    );
    if (!hasExistingCredentials && !hasNewCredentials) {
      return mobileError(
        400,
        'missing_sadad_credentials',
        'Merchant id, website, and secret key are required for SADAD.',
      );
    }
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
  let savedSadad: {
    merchantIdHint: string | null;
    websiteHint: string | null;
    verifiedMode: 'live' | 'sandbox';
    verifiedAt: string;
  } | null = null;

  if (providedSadadCredentials) {
    if (!sadadFields?.merchantId || !sadadFields.website || !sadadFields.secretKey) {
      return mobileError(
        400,
        'missing_sadad_credentials',
        'Merchant id, website, and secret key are required for SADAD.',
      );
    }
    const verification = await verifySadadCredentials({
      merchantId: sadadFields.merchantId,
      website: sadadFields.website,
      secretKey: sadadFields.secretKey,
    });
    if (!verification.ok) {
      return mobileError(400, 'sadad_verification_failed', verification.reason);
    }
    const verifiedAt = new Date().toISOString();
    sadadCredentialsToSave = {
      v: 1,
      ct: encryptToken(
        JSON.stringify({
          merchantId: sadadFields.merchantId,
          website: sadadFields.website,
          secretKey: sadadFields.secretKey,
        }),
      ),
      merchantIdHint:
        sadadFields.merchantId.length > 4 ? `••••${sadadFields.merchantId.slice(-4)}` : '••••',
      websiteHint: sadadFields.website,
      verifiedMode: verification.mode,
      verifiedAt,
      updatedAt: verifiedAt,
    };
    savedSadad = {
      merchantIdHint: sadadCredentialsToSave.merchantIdHint,
      websiteHint: sadadCredentialsToSave.websiteHint,
      verifiedMode: sadadCredentialsToSave.verifiedMode,
      verifiedAt: sadadCredentialsToSave.verifiedAt,
    };
  }

  const settings: CheckoutSettings = {
    ...workingStorefront.checkout,
    paymentMethods: nextPaymentMethods,
    bankDetails: nextPaymentMethods.includes('bank_transfer')
      ? bankDetails
      : nextPaymentMethods.includes('fawran')
        ? (fawranBankDetails ?? bankDetails)
        : null,
    payLink: nextPaymentMethods.includes('pay_link') ? payLink : null,
    requiredPolicies:
      parsed.data.requiredPolicies ??
      workingStorefront.checkout.requiredPolicies.filter((policy): policy is PolicyKey =>
        (POLICY_KEYS as readonly string[]).includes(policy),
      ),
    currency: parsed.data.currency ?? workingStorefront.checkout.currency,
    minOrderQar:
      parsed.data.minOrderQar === undefined
        ? workingStorefront.checkout.minOrderQar
        : parsed.data.minOrderQar,
    shippingFlatQar:
      parsed.data.shippingFlatQar === undefined
        ? workingStorefront.checkout.shippingFlatQar
        : parsed.data.shippingFlatQar,
    thankYou: parsed.data.thankYou
      ? { ...workingStorefront.checkout.thankYou, ...parsed.data.thankYou }
      : workingStorefront.checkout.thankYou,
  };

  let savedClientIdHint: string | null = null;

  try {
    await writeStorefrontCheckoutSettings(workingStorefront.slug, settings);
    if (shouldEnableSkipCash && (providedCredentials || skipCashFields?.confirmCr)) {
      let credentials:
        | {
            v: 1;
            ct: string;
            clientIdHint: string | null;
            updatedAt: string;
          }
        | undefined;
      if (providedCredentials) {
        if (!skipCashFields?.clientId || !skipCashFields.keyId || !skipCashFields.keySecret) {
          return mobileError(
            400,
            'missing_skipcash_credentials',
            'Client id, key id, and key secret are required for SkipCash.',
          );
        }
        credentials = {
          v: 1,
          ct: encryptToken(
            JSON.stringify({
              clientId: skipCashFields.clientId,
              keyId: skipCashFields.keyId,
              keySecret: skipCashFields.keySecret,
              webhookKey: skipCashFields.webhookKey || null,
            }),
          ),
          clientIdHint:
            skipCashFields.clientId.length > 4
              ? `••••${skipCashFields.clientId.slice(-4)}`
              : '••••',
          updatedAt: new Date().toISOString(),
        };
        savedClientIdHint = credentials.clientIdHint;
      }
      await writeStorefrontSkipCashSetup(workingStorefront.slug, {
        credentials,
        confirmCr: Boolean(skipCashFields?.confirmCr),
      });
    }
    if (sadadCredentialsToSave) {
      await writeStorefrontSadadSetup(workingStorefront.slug, sadadCredentialsToSave);
    }

    await recordAudit({
      storefrontSlug: workingStorefront.slug,
      clerkUserId: gate.user.userId,
      action: 'storefront.checkout.mobile_payments',
      targetId: workingStorefront.slug,
      summary: `Online payments updated from mobile · ${nextPaymentMethods.join(', ')}`,
      meta: {
        source: 'mobile',
        skipCashSelected: shouldEnableSkipCash,
        skipCashCredentialsUpdated: providedCredentials,
        sadadSelected,
        sadadCredentialsUpdated: providedSadadCredentials,
        paymentMethods: nextPaymentMethods,
      },
    });

    revalidatePath('/account', 'layout');
    revalidatePath('/account/settings/checkout');
    revalidatePath(`/brief/${workingStorefront.slug}`, 'layout');

    const refreshedSkipCashHasCredentials =
      Boolean(workingStorefront.checkout.skipCash?.hasCredentials) || providedCredentials;
    const refreshedSkipCashCrConfirmedAt =
      (workingStorefront.crConfirmedAt ? workingStorefront.crConfirmedAt.toISOString() : null) ??
      (skipCashFields?.confirmCr ? new Date().toISOString() : null);
    const refreshed: Storefront = {
      ...workingStorefront,
      checkout: {
        ...workingStorefront.checkout,
        ...settings,
        skipCash: {
          hasCredentials: refreshedSkipCashHasCredentials,
          clientIdHint:
            savedClientIdHint ?? workingStorefront.checkout.skipCash?.clientIdHint ?? null,
          enabled:
            canAcceptOnlinePayments &&
            shouldEnableSkipCash &&
            refreshedSkipCashHasCredentials &&
            Boolean(workingStorefront.crNumber) &&
            Boolean(refreshedSkipCashCrConfirmedAt),
          crConfirmedAt: refreshedSkipCashCrConfirmedAt,
        },
        sadad: {
          hasCredentials:
            Boolean(workingStorefront.checkout.sadad?.hasCredentials) || Boolean(savedSadad),
          merchantIdHint:
            savedSadad?.merchantIdHint ?? workingStorefront.checkout.sadad?.merchantIdHint ?? null,
          websiteHint:
            savedSadad?.websiteHint ?? workingStorefront.checkout.sadad?.websiteHint ?? null,
          verifiedMode:
            savedSadad?.verifiedMode ?? workingStorefront.checkout.sadad?.verifiedMode ?? null,
          verifiedAt:
            savedSadad?.verifiedAt ?? workingStorefront.checkout.sadad?.verifiedAt ?? null,
          enabled:
            canAcceptOnlinePayments &&
            nextPaymentMethods.includes('sadad') &&
            (Boolean(workingStorefront.checkout.sadad?.hasCredentials) || Boolean(savedSadad)),
        },
      },
      crConfirmedAt:
        workingStorefront.crConfirmedAt ?? (skipCashFields?.confirmCr ? new Date() : null),
    };
    return mobileJson(toPayload(refreshed, canAcceptOnlinePayments));
  } catch (err) {
    console.error('[mobile/storefront/checkout PATCH] failed', err);
    return mobileError(500, 'checkout_failed', 'Could not save online payment settings.');
  }
}

function normalizeNullable(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueMethods(methods: PaymentMethod[]): PaymentMethod[] {
  const allowed = new Set(PAYMENT_METHODS as readonly PaymentMethod[]);
  return methods.filter(
    (method, index, array) => allowed.has(method) && array.indexOf(method) === index,
  );
}

function toPayload(storefront: Storefront, canAcceptOnlinePayments: boolean) {
  const checkout = storefront.checkout;
  const skipCash = checkout.skipCash ?? {
    hasCredentials: false,
    clientIdHint: null,
    enabled: false,
    crConfirmedAt: storefront.crConfirmedAt ? storefront.crConfirmedAt.toISOString() : null,
  };
  const sadad = checkout.sadad ?? {
    hasCredentials: false,
    merchantIdHint: null,
    websiteHint: null,
    verifiedMode: null,
    verifiedAt: null,
    enabled: false,
  };
  const skipCashReady = Boolean(
    checkout.paymentMethods.includes('skipcash') &&
      skipCash.hasCredentials &&
      storefront.crNumber &&
      (skipCash.crConfirmedAt || storefront.crConfirmedAt),
  );
  const sadadReady = Boolean(
    checkout.paymentMethods.includes('sadad') && sadad.hasCredentials && sadad.verifiedAt,
  );

  const paymentMethods = checkoutPaymentMethodsForPlan(
    checkout.paymentMethods,
    canAcceptOnlinePayments,
  );
  return {
    checkout: {
      paymentMethods,
      bankDetails: checkout.bankDetails,
      payLink: checkout.payLink,
      requiredPolicies: checkout.requiredPolicies,
      currency: checkout.currency,
      minOrderQar: checkout.minOrderQar,
      shippingFlatQar: checkout.shippingFlatQar,
      thankYou: checkout.thankYou,
      skipCash: {
        hasCredentials: skipCash.hasCredentials,
        clientIdHint: skipCash.clientIdHint,
        enabled: canAcceptOnlinePayments && skipCashReady,
        crConfirmedAt:
          skipCash.crConfirmedAt ??
          (storefront.crConfirmedAt ? storefront.crConfirmedAt.toISOString() : null),
      },
      sadad: {
        hasCredentials: sadad.hasCredentials,
        merchantIdHint: sadad.merchantIdHint,
        websiteHint: sadad.websiteHint,
        verifiedMode: sadad.verifiedMode,
        verifiedAt: sadad.verifiedAt,
        enabled: canAcceptOnlinePayments && sadadReady,
      },
    },
    canAcceptOnlinePayments,
    onlinePaymentsPlanRequired: 'pro',
    crNumber: storefront.crNumber,
    skipCashEligible: Boolean(storefront.crNumber),
    skipCashBlockedReason: storefront.crNumber ? 'Confirm CR ownership' : 'Add CR number',
  };
}
