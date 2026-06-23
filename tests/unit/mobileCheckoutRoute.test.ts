import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireMobileStoreAccess: vi.fn(),
  updateStorefront: vi.fn(),
  recordAudit: vi.fn(),
  encryptToken: vi.fn((value: string) => `encrypted:${value}`),
  getPlan: vi.fn(),
  verifySadadCredentials: vi.fn(),
  writeStorefrontCheckoutSettings: vi.fn(),
  writeStorefrontSkipCashSetup: vi.fn(),
  writeStorefrontSadadSetup: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: routeMocks.revalidatePath,
}));

vi.mock('@/lib/mobile/auth', () => ({
  mobileJson: (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    }),
  mobileError: (status: number, code: string, message: string) =>
    new Response(JSON.stringify({ error: code, message }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  mobileOptions: () => new Response(null, { status: 204 }),
  requireMobileStoreAccess: routeMocks.requireMobileStoreAccess,
  searchParam: (req: Request, key: string) => {
    const value = new URL(req.url).searchParams.get(key)?.trim();
    return value || null;
  },
}));

vi.mock('@/lib/brief', () => ({
  updateStorefront: routeMocks.updateStorefront,
}));

vi.mock('@/lib/audit', () => ({
  recordAudit: routeMocks.recordAudit,
}));

vi.mock('@/lib/apps/crypto', () => ({
  encryptToken: routeMocks.encryptToken,
}));

vi.mock('@/lib/storefrontSettings', () => ({
  PAYMENT_METHODS: ['cod', 'bank_transfer', 'fawran', 'skipcash', 'sadad', 'pay_link'],
  POLICY_KEYS: ['terms', 'privacy', 'refund', 'shipping'],
  checkoutPaymentMethodsForPlan: (methods: string[], canAcceptOnlinePayments: boolean) =>
    canAcceptOnlinePayments ? Array.from(new Set(methods)) : ['cod'],
  isOnlinePaymentMethod: (method: string) => method !== 'cod',
  writeStorefrontCheckoutSettings: routeMocks.writeStorefrontCheckoutSettings,
  writeStorefrontSkipCashSetup: routeMocks.writeStorefrontSkipCashSetup,
  writeStorefrontSadadSetup: routeMocks.writeStorefrontSadadSetup,
}));

vi.mock('@/lib/billing', () => ({
  getPlan: routeMocks.getPlan,
  planUnlocksOnlinePayments: (plan: string) => ['pro', 'atelier'].includes(plan),
}));

vi.mock('@/lib/sadad', () => ({
  verifySadadCredentials: routeMocks.verifySadadCredentials,
}));

function makeStorefront(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'souqna-preview',
    founderName: 'Preview Founder',
    businessName: 'Souqna Preview',
    ownership: 'solo',
    experience: 'new',
    businessType: 'retail',
    marketVolume: 'small',
    payments: 'cash',
    tagline: 'Preview store',
    phone: null,
    area: null,
    hours: null,
    instagram: null,
    logoUrl: null,
    faviconUrl: null,
    design: 'minimal',
    palette: 'souqna',
    templateId: 'fast-market',
    crNumber: null,
    crConfirmedAt: null,
    checkout: {
      paymentMethods: ['cod'],
      bankDetails: null,
      payLink: null,
      skipCash: null,
      sadad: null,
      requiredPolicies: ['terms', 'privacy', 'refund'],
      currency: 'QAR',
      minOrderQar: null,
      shippingFlatQar: null,
      thankYou: {
        title: null,
        message: null,
        ctaLabel: null,
        ctaUrl: null,
        showOrderSummary: true,
      },
    },
    ...overrides,
  };
}

async function loadRoute() {
  vi.resetModules();
  return import('@/app/api/mobile/v1/storefront/checkout/route');
}

function patchRequest(body: unknown): Request {
  return new Request('https://souqna.qa/api/mobile/v1/storefront/checkout', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('mobile storefront checkout route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireMobileStoreAccess.mockResolvedValue({
      ok: true,
      user: { userId: 'user_123' },
      access: { storefront: makeStorefront() },
    });
    routeMocks.updateStorefront.mockImplementation(
      (_slug: string, input: Record<string, unknown>) =>
        Promise.resolve(makeStorefront({ ...input, crConfirmedAt: null })),
    );
    routeMocks.writeStorefrontCheckoutSettings.mockResolvedValue(undefined);
    routeMocks.writeStorefrontSkipCashSetup.mockResolvedValue(undefined);
    routeMocks.writeStorefrontSadadSetup.mockResolvedValue(undefined);
    routeMocks.recordAudit.mockResolvedValue(undefined);
    routeMocks.getPlan.mockResolvedValue('pro');
    routeMocks.verifySadadCredentials.mockResolvedValue({ ok: true, mode: 'live' });
  });

  it('returns checkout settings for the authorized mobile store', async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      new Request('https://souqna.qa/api/mobile/v1/storefront/checkout?store=souqna-preview'),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(routeMocks.requireMobileStoreAccess).toHaveBeenCalledWith(
      'souqna-preview',
      'settings.manage',
    );
    expect(body.checkout).toMatchObject({
      paymentMethods: ['cod'],
      currency: 'QAR',
      skipCash: { hasCredentials: false, enabled: false },
      sadad: { hasCredentials: false, enabled: false },
    });
    expect(body).toMatchObject({ canAcceptOnlinePayments: true });
  });

  it('locks online payment methods for Pro/starter mobile stores', async () => {
    routeMocks.getPlan.mockResolvedValue('starter');
    routeMocks.requireMobileStoreAccess.mockResolvedValue({
      ok: true,
      user: { userId: 'user_123' },
      access: {
        storefront: makeStorefront({
          checkout: {
            ...makeStorefront().checkout,
            paymentMethods: ['cod', 'bank_transfer', 'skipcash'],
          },
        }),
      },
    });
    const { GET, PATCH } = await loadRoute();

    const getResponse = await GET(
      new Request('https://souqna.qa/api/mobile/v1/storefront/checkout?store=souqna-preview'),
    );
    const getBody = await json(getResponse);

    expect(getResponse.status).toBe(200);
    expect(getBody).toMatchObject({
      canAcceptOnlinePayments: false,
      checkout: { paymentMethods: ['cod'] },
    });

    const patchResponse = await PATCH(
      patchRequest({
        store: 'souqna-preview',
        paymentMethods: ['cod', 'bank_transfer'],
        bankDetails: {
          accountName: 'Souqna Preview Trading',
          iban: 'QA58DOHB00001234567890',
          bankName: 'Doha Bank',
        },
      }),
    );
    const patchBody = await json(patchResponse);

    expect(patchResponse.status).toBe(402);
    expect(patchBody).toMatchObject({ error: 'online_payments_plan_required' });
    expect(routeMocks.writeStorefrontCheckoutSettings).not.toHaveBeenCalled();
  });

  it('saves native provider choices with normalized bank details and payment link', async () => {
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      patchRequest({
        store: 'souqna-preview',
        paymentMethods: ['cod', 'bank_transfer', 'pay_link', 'pay_link'],
        bankDetails: {
          accountName: 'Souqna Preview Trading',
          iban: 'qa58 dohb 0000 1234 5678 90',
          bankName: 'Doha Bank',
          swift: '',
          notes: 'Reference the order number.',
        },
        payLink: {
          label: 'Pay by secure link',
          url: 'https://pay.souqna.qa/preview',
        },
        requiredPolicies: ['terms', 'refund'],
        minOrderQar: 25,
        shippingFlatQar: 15,
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(routeMocks.writeStorefrontCheckoutSettings).toHaveBeenCalledWith(
      'souqna-preview',
      expect.objectContaining({
        paymentMethods: ['cod', 'bank_transfer', 'pay_link'],
        bankDetails: expect.objectContaining({
          accountName: 'Souqna Preview Trading',
          iban: 'QA58DOHB00001234567890',
          bankName: 'Doha Bank',
        }),
        payLink: {
          label: 'Pay by secure link',
          url: 'https://pay.souqna.qa/preview',
        },
        requiredPolicies: ['terms', 'refund'],
        minOrderQar: 25,
        shippingFlatQar: 15,
      }),
    );
    expect(routeMocks.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'storefront.checkout.mobile_payments',
        meta: expect.objectContaining({
          source: 'mobile',
          paymentMethods: ['cod', 'bank_transfer', 'pay_link'],
        }),
      }),
    );
    expect(body.checkout).toMatchObject({
      paymentMethods: ['cod', 'bank_transfer', 'pay_link'],
      payLink: { label: 'Pay by secure link', url: 'https://pay.souqna.qa/preview' },
    });
  });

  it('rejects bank transfer when bank details are missing', async () => {
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      patchRequest({
        store: 'souqna-preview',
        paymentMethods: ['bank_transfer'],
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: 'missing_bank_details' });
    expect(routeMocks.writeStorefrontCheckoutSettings).not.toHaveBeenCalled();
  });

  it('keeps SkipCash inside the app by returning CR/setup validation instead of saving partial setup', async () => {
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      patchRequest({
        store: 'souqna-preview',
        enableSkipCash: true,
        paymentMethods: ['cod'],
        skipCash: {
          clientId: 'client_1234',
          keyId: 'key_1234',
          keySecret: 'secret',
          confirmCr: true,
        },
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: 'missing_cr' });
    expect(routeMocks.writeStorefrontCheckoutSettings).not.toHaveBeenCalled();
    expect(routeMocks.writeStorefrontSkipCashSetup).not.toHaveBeenCalled();
  });

  it('saves SkipCash credentials after CR confirmation and returns an enabled provider payload', async () => {
    routeMocks.requireMobileStoreAccess.mockResolvedValue({
      ok: true,
      user: { userId: 'user_123' },
      access: {
        storefront: makeStorefront({
          crNumber: '123456',
          crConfirmedAt: null,
        }),
      },
    });
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      patchRequest({
        store: 'souqna-preview',
        enableSkipCash: true,
        paymentMethods: ['cod'],
        skipCash: {
          clientId: 'client_1234',
          keyId: 'key_1234',
          keySecret: 'secret',
          webhookKey: 'webhook',
          confirmCr: true,
        },
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(routeMocks.writeStorefrontCheckoutSettings).toHaveBeenCalledWith(
      'souqna-preview',
      expect.objectContaining({ paymentMethods: ['cod', 'skipcash'] }),
    );
    expect(routeMocks.writeStorefrontSkipCashSetup).toHaveBeenCalledWith(
      'souqna-preview',
      expect.objectContaining({
        confirmCr: true,
        credentials: expect.objectContaining({
          v: 1,
          ct: expect.stringContaining('client_1234'),
          clientIdHint: expect.stringContaining('1234'),
        }),
      }),
    );
    expect(body.checkout).toMatchObject({
      paymentMethods: ['cod', 'skipcash'],
      skipCash: {
        hasCredentials: true,
        enabled: true,
      },
    });
  });

  it('verifies and saves SADAD credentials before enabling the provider', async () => {
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      patchRequest({
        store: 'souqna-preview',
        paymentMethods: ['cod', 'sadad'],
        sadad: {
          merchantId: '987654',
          website: 'souqna-preview.souqna.qa',
          secretKey: 'sadad-secret',
        },
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(routeMocks.verifySadadCredentials).toHaveBeenCalledWith({
      merchantId: '987654',
      website: 'souqna-preview.souqna.qa',
      secretKey: 'sadad-secret',
    });
    expect(routeMocks.writeStorefrontSadadSetup).toHaveBeenCalledWith(
      'souqna-preview',
      expect.objectContaining({
        v: 1,
        ct: expect.stringContaining('987654'),
        merchantIdHint: expect.stringContaining('7654'),
        websiteHint: 'souqna-preview.souqna.qa',
        verifiedMode: 'live',
      }),
    );
    expect(body.checkout).toMatchObject({
      paymentMethods: ['cod', 'sadad'],
      sadad: {
        hasCredentials: true,
        enabled: true,
        websiteHint: 'souqna-preview.souqna.qa',
      },
    });
  });

  it('rejects SADAD when credential verification fails', async () => {
    routeMocks.verifySadadCredentials.mockResolvedValue({
      ok: false,
      reason: 'SADAD rejected these credentials.',
    });
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      patchRequest({
        store: 'souqna-preview',
        paymentMethods: ['sadad'],
        sadad: {
          merchantId: '987654',
          website: 'souqna-preview.souqna.qa',
          secretKey: 'bad-secret',
        },
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: 'sadad_verification_failed',
      message: 'SADAD rejected these credentials.',
    });
    expect(routeMocks.writeStorefrontCheckoutSettings).not.toHaveBeenCalled();
    expect(routeMocks.writeStorefrontSadadSetup).not.toHaveBeenCalled();
  });
});
