'use client';

import { useId, useMemo, useState, useTransition } from 'react';
/* eslint-disable @next/next/no-img-element */
import { useLocale } from 'next-intl';
import { Surface } from '@/components/admin/primitives';
import { Field, inputStyle, textareaStyle } from '@/components/admin/SettingsForm';
import { adminPhrase } from '@/components/admin/adminLocale';
import { updateCheckoutSettings, type CheckoutActionState } from '@/app/actions/storefrontSettings';
import {
  CHECKOUT_ADDRESS_DESIGNS,
  CONFIGURABLE_PAYMENT_METHODS,
  POLICY_KEYS,
  SOUQNA_CITY_PRESETS,
  SOUQNA_CITY_REGIONS,
  checkoutPaymentMethodsForPlan,
  isOnlinePaymentMethod,
  type CheckoutAddressDesign,
  type CheckoutSettings as CheckoutSettingsValue,
  type PaymentMethod,
  type PolicyKey,
  type SouqnaCityRegion,
  type SouqnaCityRule,
  type SouqnaCitySettings,
} from '@/lib/storefrontSettings';

type OnlineProviderId = 'skipcash' | 'sadad' | 'tap' | 'myfatoorah' | 'paytabs' | 'hyperpay';

const ONLINE_PROVIDERS: Array<{
  id: OnlineProviderId;
  name: string;
  logo: string;
  status: 'live' | 'setup';
  summary: string;
  credentials: string[];
  docsEn: string;
  docsAr: string;
}> = [
  {
    id: 'skipcash',
    name: 'SkipCash',
    logo: '/apps/skipcash/mark.svg',
    status: 'live',
    summary: 'Live integration. Uses merchant API keys to create hosted checkout sessions.',
    credentials: ['Client ID', 'Key ID', 'Key secret', 'Webhook key (optional)'],
    docsEn:
      'Add the merchant keys from your SkipCash dashboard. Confirm the CR before enabling checkout.',
    docsAr:
      'أضف مفاتيح التاجر من لوحة SkipCash. أكّد السجل التجاري قبل تفعيل الدفع عند إتمام الطلب.',
  },
  {
    id: 'sadad',
    name: 'SADAD',
    logo: '/apps/sadad/mark.svg',
    status: 'live',
    summary: 'Live integration. Souqna verifies credentials with SADAD before activation.',
    credentials: ['SADAD ID / merchant ID', 'Registered website/domain', 'Secret key'],
    docsEn:
      'Use the SADAD merchant ID, the exact website/domain registered with SADAD, and the secret key.',
    docsAr: 'استخدم رقم تاجر SADAD، والدومين المسجل لديهم بنفس الصيغة، والمفتاح السري.',
  },
  {
    id: 'tap',
    name: 'Tap Payments',
    logo: '/apps/tap-payments/logo.svg',
    status: 'setup',
    summary:
      'Popular GCC gateway. Credential storage can be added before the charge flow is wired.',
    credentials: [
      'Merchant ID',
      'Secret API key',
      'Public API key',
      'Encryption key (if using card entry)',
    ],
    docsEn:
      'In Tap Dashboard, open Accounts, then the merchant/operator account to copy Merchant ID, Secret Key, Public Key, and encryption key if needed.',
    docsAr:
      'من لوحة Tap افتح Accounts ثم حساب التاجر لنسخ Merchant ID و Secret Key و Public Key ومفتاح التشفير عند الحاجة.',
  },
  {
    id: 'myfatoorah',
    name: 'MyFatoorah',
    logo: '/apps/myfatoorah/mark.svg',
    status: 'setup',
    summary: 'GCC gateway with invoice and direct-payment APIs.',
    credentials: ['API token', 'Country / API environment', 'Webhook secret key'],
    docsEn:
      'Use your MyFatoorah API token for server calls, choose the correct country/environment, then generate a webhook secret key in Integration Settings.',
    docsAr:
      'استخدم API Token من MyFatoorah للطلبات من الخادم، واختر الدولة/البيئة الصحيحة، ثم أنشئ Webhook Secret Key من إعدادات التكامل.',
  },
  {
    id: 'paytabs',
    name: 'PayTabs',
    logo: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://site.paytabs.com',
    status: 'setup',
    summary: 'MENA/GCC payment gateway for hosted payment pages.',
    credentials: ['Profile ID', 'Server key', 'Region code', 'Client key (if using client SDK)'],
    docsEn:
      'For PayTabs hosted/backend integration, copy Profile ID, Server Key, and Region from the merchant dashboard API key area.',
    docsAr:
      'لتكامل PayTabs المستضاف/الخلفي، انسخ Profile ID و Server Key و Region من منطقة مفاتيح API في لوحة التاجر.',
  },
  {
    id: 'hyperpay',
    name: 'HyperPay',
    logo: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://www.hyperpay.com',
    status: 'setup',
    summary: 'Regional gateway used by larger GCC merchants.',
    credentials: ['Entity ID', 'Access token', 'Webhook secret', 'Mode / endpoint'],
    docsEn:
      'Add the HyperPay Entity ID and Access Token for the correct test or production endpoint, plus webhook secret when configured.',
    docsAr:
      'أضف Entity ID و Access Token من HyperPay للبيئة الصحيحة، وأضف Webhook Secret عند تفعيله.',
  },
];

type Props = {
  slug: string;
  initial: CheckoutSettingsValue;
  storefrontBaseUrl: string;
  /**
   * Whether each policy currently has text on the briefs row. The
   * server action also re-checks this, but we surface it inline so the
   * founder can't accidentally require an empty policy at checkout.
   */
  policiesPresent: Record<PolicyKey, boolean>;
  skipCashEligible: boolean;
  skipCashBlockedReason: string;
  crNumber: string | null;
  canAcceptOnlinePayments: boolean;
};

const PAYMENT_LABELS: Record<PaymentMethod, { title: string; body: string }> = {
  cod: {
    title: 'Cash on delivery',
    body: 'Buyer pays the courier in cash on hand-off.',
  },
  bank_transfer: {
    title: 'Bank transfer',
    body: 'Buyer wires you the order total before you ship.',
  },
  fawran: {
    title: 'Fawran',
    body: 'Use the Fawran number or CR configured during setup.',
  },
  skipcash: {
    title: 'SkipCash online payments',
    body: 'Redirect buyers to SkipCash checkout using your merchant credentials.',
  },
  sadad: {
    title: 'SADAD online payments',
    body: 'Redirect buyers to SADAD Web Checkout using your merchant credentials.',
  },
  pay_link: {
    title: 'Hosted payment link',
    body: 'Send buyers to a Tap, bank, invoice, or hosted gateway payment page.',
  },
};

const POLICY_LABELS: Record<PolicyKey, string> = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
  refund: 'Refund policy',
  shipping: 'Shipping policy',
};

const CURRENCIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'QAR', label: 'QAR · Qatari Riyal' },
  { code: 'USD', label: 'USD · US Dollar' },
  { code: 'SAR', label: 'SAR · Saudi Riyal' },
  { code: 'AED', label: 'AED · UAE Dirham' },
  { code: 'KWD', label: 'KWD · Kuwaiti Dinar' },
];

const ADDRESS_DESIGN_META: Record<
  CheckoutAddressDesign,
  { titleEn: string; titleAr: string; bodyEn: string; bodyAr: string }
> = {
  qatar_plate: {
    titleEn: 'Qatar address plate',
    titleAr: 'لوحة عنوان قطر',
    bodyEn: 'Blue plate layout for house/building number, zone, and street.',
    bodyAr: 'تصميم اللوحة الزرقاء لرقم المنزل أو المبنى والمنطقة والشارع.',
  },
  soft_card: {
    titleEn: 'Souqna soft card',
    titleAr: 'بطاقة سوقنا الهادئة',
    bodyEn: 'Minimal grouped fields with the same Qatar address order.',
    bodyAr: 'حقول هادئة ومجمعة بنفس ترتيب عنوان قطر.',
  },
  classic: {
    titleEn: 'Classic checkout fields',
    titleAr: 'حقول الدفع التقليدية',
    bodyEn: 'Standard address form for stores that prefer a neutral layout.',
    bodyAr: 'نموذج العنوان المعتاد للمتاجر التي تفضل شكلا محايدا.',
  },
};

const IBAN_HINT = 'Two-letter country code + up to 32 alphanumerics. Spaces are stripped on save.';

function cloneSouqnaCitySettings(value: SouqnaCitySettings): SouqnaCitySettings {
  return {
    enabled: value.enabled,
    autoMatchNearest: value.autoMatchNearest,
    rules: value.rules.map((rule) => ({
      ...rule,
      paymentMethods: [...rule.paymentMethods],
    })),
  };
}

function createCityRule(city = ''): SouqnaCityRule {
  const cleanCity = city.trim();
  return {
    id: `souqna-city-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    city: cleanCity,
    region: 'custom',
    enabled: true,
    paymentMethods: ['cod'],
    deliveryFeeQar: null,
  };
}

export function CheckoutSettings({
  slug,
  initial,
  storefrontBaseUrl,
  policiesPresent,
  skipCashEligible,
  skipCashBlockedReason,
  crNumber,
  canAcceptOnlinePayments,
}: Props) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    checkoutPaymentMethodsForPlan(
      (initial.paymentMethods.length > 0 ? initial.paymentMethods : (['cod'] as PaymentMethod[]))
        .filter((method) => method !== 'skipcash' || skipCashEligible),
      canAcceptOnlinePayments,
    ),
  );
  const [bankAccountName, setBankAccountName] = useState(initial.bankDetails?.accountName ?? '');
  const [bankIban, setBankIban] = useState(initial.bankDetails?.iban ?? '');
  const [bankName, setBankName] = useState(initial.bankDetails?.bankName ?? '');
  const [bankSwift, setBankSwift] = useState(initial.bankDetails?.swift ?? '');
  const [bankNotes, setBankNotes] = useState(initial.bankDetails?.notes ?? '');
  const [payLinkLabel, setPayLinkLabel] = useState(initial.payLink?.label ?? 'Pay online');
  const [payLinkUrl, setPayLinkUrl] = useState(initial.payLink?.url ?? '');
  const [skipCashClientId, setSkipCashClientId] = useState('');
  const [skipCashKeyId, setSkipCashKeyId] = useState('');
  const [skipCashKeySecret, setSkipCashKeySecret] = useState('');
  const [skipCashWebhookKey, setSkipCashWebhookKey] = useState('');
  const [skipCashCrConfirmed, setSkipCashCrConfirmed] = useState(
    Boolean(initial.skipCash?.crConfirmedAt),
  );
  const [sadadMerchantId, setSadadMerchantId] = useState('');
  const [sadadWebsite, setSadadWebsite] = useState('');
  const [sadadSecretKey, setSadadSecretKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<OnlineProviderId | null>(
    !canAcceptOnlinePayments
      ? null
      : initial.sadad?.hasCredentials || initial.paymentMethods.includes('sadad')
        ? 'sadad'
        : initial.skipCash?.hasCredentials || initial.paymentMethods.includes('skipcash')
          ? 'skipcash'
          : null,
  );
  const [requiredPolicies, setRequiredPolicies] = useState<PolicyKey[]>(initial.requiredPolicies);
  const [currency, setCurrency] = useState(initial.currency);
  const [minOrderQar, setMinOrderQar] = useState<string>(
    initial.minOrderQar == null ? '' : String(initial.minOrderQar),
  );
  const [shippingFlatQar, setShippingFlatQar] = useState<string>(
    initial.shippingFlatQar == null ? '' : String(initial.shippingFlatQar),
  );
  const [souqnaCity, setSouqnaCity] = useState<SouqnaCitySettings>(() =>
    cloneSouqnaCitySettings(initial.experience.souqnaCity),
  );
  const [addressDesign, setAddressDesign] = useState<CheckoutAddressDesign>(
    initial.addressDesign ?? 'qatar_plate',
  );
  const [thankYouTitle, setThankYouTitle] = useState(initial.thankYou.title ?? '');
  const [thankYouMessage, setThankYouMessage] = useState(initial.thankYou.message ?? '');
  const [thankYouCtaLabel, setThankYouCtaLabel] = useState(initial.thankYou.ctaLabel ?? '');
  const [thankYouCtaUrl, setThankYouCtaUrl] = useState(initial.thankYou.ctaUrl ?? '');
  const [thankYouShowOrderSummary, setThankYouShowOrderSummary] = useState(
    initial.thankYou.showOrderSummary,
  );

  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<CheckoutActionState>({ status: 'idle' });
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);

  const bankSelected = paymentMethods.includes('bank_transfer');
  const payLinkSelected = paymentMethods.includes('pay_link');
  const skipCashSelected = paymentMethods.includes('skipcash');
  const sadadSelected = paymentMethods.includes('sadad');
  const sadadFieldsTouched = Boolean(
    sadadMerchantId.trim() || sadadWebsite.trim() || sadadSecretKey.trim(),
  );
  const noneSelected = paymentMethods.length === 0;
  const normalizedStorefrontBaseUrl = storefrontBaseUrl.replace(/\/+$/, '');
  const skipCashReturnUrl = `${normalizedStorefrontBaseUrl}/api/checkout/skipcash-return`;

  const togglePayment = (method: PaymentMethod) => {
    if (!canAcceptOnlinePayments && isOnlinePaymentMethod(method)) return;
    if (method === 'skipcash' && !skipCashEligible) return;
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  };

  const togglePolicy = (key: PolicyKey) => {
    if (!policiesPresent[key] && !requiredPolicies.includes(key)) return;
    setRequiredPolicies((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const normalizeIban = () => {
    setBankIban((v) => v.replace(/\s+/g, '').toUpperCase());
  };

  const parseIntOrNull = (v: string): number | null => {
    const t = v.trim();
    if (t === '') return null;
    const n = Number.parseInt(t, 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const submit = () => {
    if (noneSelected) return;
    setState({ status: 'idle' });
    startTransition(async () => {
      const submittedPaymentMethods = checkoutPaymentMethodsForPlan(
        paymentMethods,
        canAcceptOnlinePayments,
      );
      const result = await updateCheckoutSettings({
        slug,
        paymentMethods: submittedPaymentMethods,
        bankDetails:
          canAcceptOnlinePayments && bankSelected
            ? {
                accountName: bankAccountName,
                iban: bankIban,
                bankName,
                swift: bankSwift.trim() === '' ? null : bankSwift,
                notes: bankNotes.trim() === '' ? null : bankNotes,
              }
            : null,
        payLink:
          canAcceptOnlinePayments && payLinkSelected
            ? {
                label: payLinkLabel,
                url: payLinkUrl,
              }
            : null,
        skipCash:
          canAcceptOnlinePayments && skipCashSelected
            ? {
                clientId: skipCashClientId,
                keyId: skipCashKeyId,
                keySecret: skipCashKeySecret,
                webhookKey: skipCashWebhookKey,
                confirmCr: skipCashCrConfirmed,
              }
            : null,
        sadad:
          canAcceptOnlinePayments && (sadadSelected || sadadFieldsTouched)
            ? {
                merchantId: sadadMerchantId,
                website: sadadWebsite,
                secretKey: sadadSecretKey,
              }
            : null,
        requiredPolicies,
        currency,
        minOrderQar: parseIntOrNull(minOrderQar),
        shippingFlatQar: parseIntOrNull(shippingFlatQar),
        addressDesign,
        experience: {
          souqnaCity,
        },
        thankYou: {
          title: thankYouTitle,
          message: thankYouMessage,
          ctaLabel: thankYouCtaLabel,
          ctaUrl: thankYouCtaUrl,
          showOrderSummary: thankYouShowOrderSummary,
        },
      });
      setState(result);
    });
  };

  const errorState = state.status === 'error' ? state : null;
  const errorField = errorState?.field;
  const topLevelError = errorState && !errorField ? errorState.message : null;
  const fieldErrorMessage = (field: string): string | null =>
    errorState && errorState.field === field ? errorState.message : null;
  const skipCashDraftCredentialsReady = Boolean(
    skipCashClientId.trim() && skipCashKeyId.trim() && skipCashKeySecret.trim(),
  );
  const skipCashHasUsableCredentials = Boolean(
    initial.skipCash?.hasCredentials || skipCashDraftCredentialsReady,
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      aria-describedby="checkout-form-help"
      noValidate
    >
      <p
        id="checkout-form-help"
        style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--ink-muted)',
          lineHeight: 1.55,
          maxWidth: 720,
        }}
      >
        {canAcceptOnlinePayments
          ? t(
              'Configure how customers pay you and which policies they accept. Online providers only reveal their credential setup after you click their logo.',
            )
          : t(
              'Free and Pro can use cash on delivery and Fawran. Upgrade to Pro+ or Max+ to unlock SADAD, SkipCash, Tap Payments, and provider credentials.',
            )}
      </p>

      <CheckoutReadinessPanel
        paymentMethods={paymentMethods}
        canAcceptOnlinePayments={canAcceptOnlinePayments}
        currency={currency}
        shippingFlatQar={shippingFlatQar}
        minOrderQar={minOrderQar}
        crNumber={crNumber}
        skipCashCrConfirmed={skipCashCrConfirmed}
        skipCashHasCredentials={skipCashHasUsableCredentials}
        skipCashCurrentlyLive={Boolean(initial.skipCash?.enabled)}
      />

      <PaymentMethodsSection
        selected={paymentMethods}
        onToggle={togglePayment}
        invalid={noneSelected}
        canAcceptOnlinePayments={canAcceptOnlinePayments}
      />

      <OnlineProvidersSection
        selected={selectedProvider}
        enabledMethods={paymentMethods}
        onSelect={setSelectedProvider}
        onToggle={(method) => togglePayment(method)}
        skipCashEligible={skipCashEligible}
        skipCashBlockedReason={skipCashBlockedReason}
        canAcceptOnlinePayments={canAcceptOnlinePayments}
      />

      {bankSelected ? (
        <BankDetailsSection
          accountName={bankAccountName}
          setAccountName={setBankAccountName}
          iban={bankIban}
          setIban={setBankIban}
          onIbanBlur={normalizeIban}
          bankName={bankName}
          setBankName={setBankName}
          swift={bankSwift}
          setSwift={setBankSwift}
          notes={bankNotes}
          setNotes={setBankNotes}
          ibanError={fieldErrorMessage('iban')}
          sectionError={fieldErrorMessage('bankDetails')}
        />
      ) : null}

      {payLinkSelected ? (
        <PayLinkSection
          label={payLinkLabel}
          setLabel={setPayLinkLabel}
          url={payLinkUrl}
          setUrl={setPayLinkUrl}
          sectionError={fieldErrorMessage('payLink')}
        />
      ) : null}

      {selectedProvider === 'skipcash' ? (
        <SkipCashSection
          clientId={skipCashClientId}
          setClientId={setSkipCashClientId}
          keyId={skipCashKeyId}
          setKeyId={setSkipCashKeyId}
          keySecret={skipCashKeySecret}
          setKeySecret={setSkipCashKeySecret}
          webhookKey={skipCashWebhookKey}
          setWebhookKey={setSkipCashWebhookKey}
          crConfirmed={skipCashCrConfirmed}
          setCrConfirmed={setSkipCashCrConfirmed}
          crNumber={crNumber}
          hasStoredCredentials={Boolean(initial.skipCash?.hasCredentials)}
          clientIdHint={initial.skipCash?.clientIdHint ?? null}
          returnUrl={skipCashReturnUrl}
          sectionError={fieldErrorMessage('skipCash')}
        />
      ) : null}

      {selectedProvider === 'sadad' ? (
        <SadadSection
          enabled={sadadSelected}
          onToggleEnabled={() => togglePayment('sadad')}
          merchantId={sadadMerchantId}
          setMerchantId={setSadadMerchantId}
          website={sadadWebsite}
          setWebsite={setSadadWebsite}
          secretKey={sadadSecretKey}
          setSecretKey={setSadadSecretKey}
          hasStoredCredentials={Boolean(initial.sadad?.hasCredentials)}
          merchantIdHint={initial.sadad?.merchantIdHint ?? null}
          websiteHint={initial.sadad?.websiteHint ?? null}
          verifiedMode={initial.sadad?.verifiedMode ?? null}
          verifiedAt={initial.sadad?.verifiedAt ?? null}
          sectionError={fieldErrorMessage('sadad')}
        />
      ) : null}

      {selectedProvider && selectedProvider !== 'skipcash' && selectedProvider !== 'sadad' ? (
        <ProviderPendingSection providerId={selectedProvider} />
      ) : null}

      <RequiredPoliciesSection
        selected={requiredPolicies}
        present={policiesPresent}
        onToggle={togglePolicy}
        sectionError={fieldErrorMessage('requiredPolicies')}
      />

      <OrderRulesSection
        currency={currency}
        setCurrency={setCurrency}
        minOrderQar={minOrderQar}
        setMinOrderQar={setMinOrderQar}
        shippingFlatQar={shippingFlatQar}
        setShippingFlatQar={setShippingFlatQar}
      />

      <SouqnaCitySection
        value={souqnaCity}
        onChange={setSouqnaCity}
        currency={currency}
        enabledPaymentMethods={paymentMethods}
      />

      <AddressDesignSection selected={addressDesign} onSelect={setAddressDesign} />

      <ThankYouSection
        title={thankYouTitle}
        setTitle={setThankYouTitle}
        message={thankYouMessage}
        setMessage={setThankYouMessage}
        ctaLabel={thankYouCtaLabel}
        setCtaLabel={setThankYouCtaLabel}
        ctaUrl={thankYouCtaUrl}
        setCtaUrl={setThankYouCtaUrl}
        showOrderSummary={thankYouShowOrderSummary}
        setShowOrderSummary={setThankYouShowOrderSummary}
        sectionError={fieldErrorMessage('thankYou')}
      />

      <SaveBar
        pending={pending}
        state={state}
        topLevelError={topLevelError}
        disabled={noneSelected}
      />
    </form>
  );
}

function SectionCard({
  title,
  description,
  legend,
  children,
}: {
  title: string;
  description?: string;
  /** Render the section's heading inside a `<legend>` for fieldsets. */
  legend?: boolean;
  children: React.ReactNode;
}) {
  if (legend) {
    return (
      <Surface padding={20}>
        <fieldset
          style={{
            margin: 0,
            padding: 0,
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <legend style={{ padding: 0 }}>
            <SectionHeading title={title} description={description} />
          </legend>
          {children}
        </fieldset>
      </Surface>
    );
  }
  return (
    <Surface padding={20}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionHeading title={title} description={description} />
        {children}
      </div>
    </Surface>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif, var(--font-sans))',
          fontWeight: 500,
          fontSize: 16,
          letterSpacing: '-0.005em',
          color: 'var(--ink-strong)',
        }}
      >
        {t(title)}
      </h2>
      {description ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--ink-muted)',
            lineHeight: 1.55,
            maxWidth: 640,
          }}
        >
          {t(description)}
        </p>
      ) : null}
    </div>
  );
}

function CheckoutReadinessPanel({
  paymentMethods,
  canAcceptOnlinePayments,
  currency,
  shippingFlatQar,
  minOrderQar,
  crNumber,
  skipCashCrConfirmed,
  skipCashHasCredentials,
  skipCashCurrentlyLive,
}: {
  paymentMethods: PaymentMethod[];
  canAcceptOnlinePayments: boolean;
  currency: string;
  shippingFlatQar: string;
  minOrderQar: string;
  crNumber: string | null;
  skipCashCrConfirmed: boolean;
  skipCashHasCredentials: boolean;
  skipCashCurrentlyLive: boolean;
}) {
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  const skipCashSelected = paymentMethods.includes('skipcash');
  const deliveryFee = shippingFlatQar.trim() === '' ? 0 : Number.parseInt(shippingFlatQar, 10);
  const minimumOrder = minOrderQar.trim() === '' ? null : Number.parseInt(minOrderQar, 10);
  const deliveryLabel =
    Number.isFinite(deliveryFee) && deliveryFee > 0
      ? `${currency} ${deliveryFee}`
      : t('Free delivery fee');
  const minimumLabel =
    minimumOrder !== null && Number.isFinite(minimumOrder) && minimumOrder > 0
      ? `${currency} ${minimumOrder}`
      : t('No minimum');
  const skipCashStatus = skipCashReadinessLabel({
    selected: skipCashSelected,
    canAcceptOnlinePayments,
    hasCr: Boolean(crNumber),
    crConfirmed: skipCashCrConfirmed,
    hasCredentials: skipCashHasCredentials,
    currentlyLive: skipCashCurrentlyLive,
  });
  const liveMethods = paymentMethods.map((method) => PAYMENT_LABELS[method]?.title ?? method);

  return (
    <Surface padding={18}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionHeading
          title="Checkout readiness"
          description="Confirm what buyers will actually see before saving changes."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 10,
          }}
        >
          <ReadinessMetric
            label="Buyer methods"
            value={liveMethods.length > 0 ? liveMethods.join(', ') : 'None selected'}
            tone={liveMethods.length > 0 ? 'ready' : 'warning'}
          />
          <ReadinessMetric
            label="SkipCash"
            value={skipCashStatus.label}
            tone={skipCashStatus.tone}
          />
          <ReadinessMetric label="Delivery fee" value={deliveryLabel} tone="ready" />
          <ReadinessMetric label="Minimum order" value={minimumLabel} tone="neutral" />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--ink-muted)',
          }}
        >
          {t(
            'After saving, open the storefront checkout to confirm the payment method and delivery fee shown to buyers.',
          )}
        </p>
      </div>
    </Surface>
  );
}

function skipCashReadinessLabel(input: {
  selected: boolean;
  canAcceptOnlinePayments: boolean;
  hasCr: boolean;
  crConfirmed: boolean;
  hasCredentials: boolean;
  currentlyLive: boolean;
}): { label: string; tone: 'ready' | 'warning' | 'neutral' } {
  if (!input.selected) return { label: 'Not selected', tone: 'neutral' };
  if (!input.canAcceptOnlinePayments) return { label: 'Pro+ required', tone: 'warning' };
  if (!input.hasCr) return { label: 'Add CR number', tone: 'warning' };
  if (!input.crConfirmed) return { label: 'Confirm CR ownership', tone: 'warning' };
  if (!input.hasCredentials) return { label: 'Add merchant keys', tone: 'warning' };
  if (input.currentlyLive) return { label: 'Live on checkout', tone: 'ready' };
  return { label: 'Ready after saving', tone: 'ready' };
}

function ReadinessMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ready' | 'warning' | 'neutral';
}) {
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  const color =
    tone === 'ready'
      ? 'var(--admin-accent, #8a6a2a)'
      : tone === 'warning'
        ? 'var(--color-maroon, #8b3a3a)'
        : 'var(--ink-muted)';
  return (
    <div
      style={{
        display: 'grid',
        gap: 6,
        padding: 12,
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--ink-strong) 12%, transparent)',
        background: 'color-mix(in srgb, var(--surface-overlay) 82%, transparent)',
        minHeight: 84,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        {t(label)}
      </span>
      <strong style={{ color, fontSize: 14, lineHeight: 1.35 }}>{t(value)}</strong>
    </div>
  );
}

function PaymentMethodsSection({
  selected,
  onToggle,
  invalid,
  canAcceptOnlinePayments,
}: {
  selected: PaymentMethod[];
  onToggle: (m: PaymentMethod) => void;
  invalid: boolean;
  canAcceptOnlinePayments: boolean;
}) {
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  return (
    <SectionCard
      title="Payment methods"
      description="Pick at least one checkout method. Free and Pro keep cash on delivery and Fawran; provider payment links unlock on Pro+ and Max+."
      legend
    >
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {CONFIGURABLE_PAYMENT_METHODS.filter((m) => m !== 'skipcash' && m !== 'sadad').map((m) => {
          const checked = selected.includes(m);
          const meta = PAYMENT_LABELS[m];
          const locked = !canAcceptOnlinePayments && isOnlinePaymentMethod(m);
          return (
            <li key={m}>
              <CheckboxRow
                id={`payment-${m}`}
                checked={checked}
                onChange={() => onToggle(m)}
                title={meta.title}
                description={meta.body}
                disabled={locked}
                badge={locked ? 'Pro+ required' : null}
              />
            </li>
          );
        })}
      </ul>
      {invalid ? (
        <span
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--color-maroon, #8b3a3a)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {t('Pick at least one payment method.')}
        </span>
      ) : null}
    </SectionCard>
  );
}

function OnlineProvidersSection({
  selected,
  enabledMethods,
  onSelect,
  onToggle,
  skipCashEligible,
  skipCashBlockedReason,
  canAcceptOnlinePayments,
}: {
  selected: OnlineProviderId | null;
  enabledMethods: PaymentMethod[];
  onSelect: (id: OnlineProviderId) => void;
  onToggle: (method: PaymentMethod) => void;
  skipCashEligible: boolean;
  skipCashBlockedReason: string;
  canAcceptOnlinePayments: boolean;
}) {
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  return (
    <SectionCard
      title="Online payment providers"
      description={
        canAcceptOnlinePayments
          ? 'Click a provider logo to reveal its credential setup. Only live integrations can be enabled at checkout.'
          : 'Payment providers unlock on Pro+ and Max+. Free and Pro stay on Fawran, cash on delivery, and WhatsApp notifications.'
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
        }}
      >
        {ONLINE_PROVIDERS.map((provider) => {
          const isSelected = selected === provider.id;
          const method = provider.id === 'skipcash' || provider.id === 'sadad' ? provider.id : null;
          const enabled = method ? enabledMethods.includes(method) : false;
          const locked = !canAcceptOnlinePayments;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => {
                if (!locked) onSelect(provider.id);
              }}
              disabled={locked}
              style={{
                minHeight: 122,
                borderRadius: 10,
                border: `1px solid ${
                  isSelected
                    ? 'var(--admin-accent, #b58a3a)'
                    : 'color-mix(in srgb, var(--ink-muted) 18%, transparent)'
                }`,
                background: isSelected
                  ? 'color-mix(in srgb, var(--admin-accent, #b58a3a) 10%, transparent)'
                  : 'var(--surface-overlay)',
                color: 'var(--ink-strong)',
                display: 'grid',
                gridTemplateRows: '62px auto auto',
                alignItems: 'center',
                justifyItems: 'start',
                gap: 8,
                padding: 14,
                textAlign: 'start',
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.58 : 1,
              }}
              aria-pressed={isSelected}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: 62,
                  borderRadius: 8,
                  background: '#fff',
                  border: '1px solid var(--surface-rule)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={provider.logo}
                  alt={`${provider.name} logo`}
                  width={160}
                  height={54}
                  style={{ maxWidth: '88%', maxHeight: 54, objectFit: 'contain' }}
                />
              </span>
              <strong style={{ fontSize: 13 }}>{provider.name}</strong>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color:
                    provider.status === 'live'
                      ? 'var(--admin-accent, #8a6a2a)'
                      : 'var(--ink-muted)',
                }}
              >
                {enabled
                  ? t('enabled')
                  : locked
                    ? t('Pro+ required')
                    : provider.status === 'live'
                      ? t('available')
                      : t('credentials guide')}
              </span>
            </button>
          );
        })}
      </div>
      {canAcceptOnlinePayments && selected ? (
        <ProviderSummary
          provider={ONLINE_PROVIDERS.find((p) => p.id === selected)!}
          enabledMethods={enabledMethods}
          onToggle={onToggle}
          skipCashEligible={skipCashEligible}
          skipCashBlockedReason={skipCashBlockedReason}
        />
      ) : null}
    </SectionCard>
  );
}

function ProviderSummary({
  provider,
  enabledMethods,
  onToggle,
  skipCashEligible,
  skipCashBlockedReason,
}: {
  provider: (typeof ONLINE_PROVIDERS)[number];
  enabledMethods: PaymentMethod[];
  onToggle: (method: PaymentMethod) => void;
  skipCashEligible: boolean;
  skipCashBlockedReason: string;
}) {
  const method = provider.id === 'skipcash' || provider.id === 'sadad' ? provider.id : null;
  const enabled = method ? enabledMethods.includes(method) : false;
  const blockedSkipCash = provider.id === 'skipcash' && !skipCashEligible;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 14,
        borderRadius: 10,
        border: '1px solid color-mix(in srgb, var(--ink-muted) 16%, transparent)',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
        {provider.summary}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 10,
        }}
      >
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
          {provider.docsEn}
        </p>
        <p
          dir="rtl"
          lang="ar"
          style={{
            margin: 0,
            fontSize: 12.5,
            color: 'var(--ink-muted)',
            lineHeight: 1.65,
            textAlign: 'right',
          }}
        >
          {provider.docsAr}
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {provider.credentials.map((credential) => (
          <span
            key={credential}
            style={{
              padding: '6px 9px',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              background: 'color-mix(in srgb, currentColor 7%, transparent)',
            }}
          >
            {credential}
          </span>
        ))}
      </div>
      {method ? (
        <CheckboxRow
          id={`${provider.id}-enabled-from-tile`}
          checked={enabled}
          onChange={() => onToggle(method)}
          title={`Enable ${provider.name} at checkout`}
          description="Requires valid saved credentials."
          disabled={blockedSkipCash}
          badge={blockedSkipCash ? 'Setup required' : null}
          titleSuffixHint={
            blockedSkipCash
              ? `Finish "${skipCashBlockedReason}" before accepting SkipCash payments.`
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function ProviderPendingSection({
  providerId,
}: {
  providerId: Exclude<OnlineProviderId, 'skipcash' | 'sadad'>;
}) {
  const provider = ONLINE_PROVIDERS.find((p) => p.id === providerId)!;
  return (
    <SectionCard
      title={`${provider.name} credentials`}
      description="These are the official merchant credentials this provider uses. Checkout activation stays off until Souqna’s charge/refund/webhook flow for this provider is implemented."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {provider.credentials.map((credential) => (
          <Field
            key={credential}
            label={credential}
            hint="Not saved yet. Provider integration pending."
          >
            <input
              value=""
              disabled
              style={{ ...inputStyle, opacity: 0.62 }}
              aria-label={credential}
            />
          </Field>
        ))}
      </div>
    </SectionCard>
  );
}

function BankDetailsSection({
  accountName,
  setAccountName,
  iban,
  setIban,
  onIbanBlur,
  bankName,
  setBankName,
  swift,
  setSwift,
  notes,
  setNotes,
  ibanError,
  sectionError,
}: {
  accountName: string;
  setAccountName: (v: string) => void;
  iban: string;
  setIban: (v: string) => void;
  onIbanBlur: () => void;
  bankName: string;
  setBankName: (v: string) => void;
  swift: string;
  setSwift: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  ibanError: string | null;
  sectionError: string | null;
}) {
  return (
    <SectionCard
      title="Bank details"
      description="Shown to buyers who pick bank transfer. Stored on your storefront row only — never logged."
    >
      {sectionError ? (
        <span
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--color-maroon, #8b3a3a)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {sectionError}
        </span>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Field label="Account name">
          <input
            required
            maxLength={120}
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            style={inputStyle}
            aria-label="Bank account holder name"
            autoComplete="off"
          />
        </Field>
        <Field label="Bank name">
          <input
            required
            maxLength={120}
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            style={inputStyle}
            aria-label="Bank name"
            autoComplete="off"
          />
        </Field>
      </div>
      <Field label="IBAN" hint={ibanError ?? IBAN_HINT}>
        <input
          required
          maxLength={42}
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          onBlur={onIbanBlur}
          style={{
            ...inputStyle,
            ...(ibanError ? { borderColor: 'var(--color-maroon, #8b3a3a)' } : {}),
            letterSpacing: '0.04em',
            fontFamily: 'var(--font-mono)',
          }}
          aria-label="IBAN"
          aria-invalid={ibanError ? true : undefined}
          autoComplete="off"
          inputMode="text"
        />
      </Field>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Field label="SWIFT / BIC" hint="Optional. Required only for cross-border transfers.">
          <input
            maxLength={11}
            value={swift}
            onChange={(e) => setSwift(e.target.value.toUpperCase())}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
            aria-label="SWIFT or BIC code"
            autoComplete="off"
          />
        </Field>
      </div>
      <Field
        label="Notes for the buyer"
        hint="Optional. Anything else they need to know — payment reference format, branch, etc."
      >
        <textarea
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ ...textareaStyle, minHeight: 96 }}
          aria-label="Bank transfer notes"
        />
      </Field>
    </SectionCard>
  );
}

function PayLinkSection({
  label,
  setLabel,
  url,
  setUrl,
  sectionError,
}: {
  label: string;
  setLabel: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  sectionError: string | null;
}) {
  return (
    <SectionCard
      title="Hosted payment link"
      description="Use this for Tap, bank invoice links, or any hosted payment page while a full gateway integration is not required."
    >
      {sectionError ? (
        <span
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--color-maroon, #8b3a3a)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {sectionError}
        </span>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Field label="Button label" hint="Shown to buyers at checkout.">
          <input
            required
            maxLength={80}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={inputStyle}
            aria-label="Payment link button label"
            autoComplete="off"
          />
        </Field>
        <Field label="Payment URL" hint="Must be a valid hosted payment link.">
          <input
            required
            maxLength={2048}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              ...inputStyle,
              ...(sectionError ? { borderColor: 'var(--color-maroon, #8b3a3a)' } : {}),
            }}
            aria-label="Payment link URL"
            aria-invalid={sectionError ? true : undefined}
            autoComplete="off"
            inputMode="url"
            placeholder="https://pay.example.com/checkout"
          />
        </Field>
      </div>
    </SectionCard>
  );
}

function SkipCashSection({
  clientId,
  setClientId,
  keyId,
  setKeyId,
  keySecret,
  setKeySecret,
  webhookKey,
  setWebhookKey,
  crConfirmed,
  setCrConfirmed,
  crNumber,
  hasStoredCredentials,
  clientIdHint,
  returnUrl,
  sectionError,
}: {
  clientId: string;
  setClientId: (v: string) => void;
  keyId: string;
  setKeyId: (v: string) => void;
  keySecret: string;
  setKeySecret: (v: string) => void;
  webhookKey: string;
  setWebhookKey: (v: string) => void;
  crConfirmed: boolean;
  setCrConfirmed: (v: boolean) => void;
  crNumber: string | null;
  hasStoredCredentials: boolean;
  clientIdHint: string | null;
  returnUrl: string;
  sectionError: string | null;
}) {
  return (
    <SectionCard
      title="SkipCash merchant setup"
      description="Store your merchant credentials once. Souqna encrypts them and uses them only to create buyer checkout sessions."
    >
      {sectionError ? (
        <span
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--color-maroon, #8b3a3a)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {sectionError}
        </span>
      ) : null}
      {hasStoredCredentials ? (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Stored credentials active{clientIdHint ? ` · client ${clientIdHint}` : ''}. Fill the
          fields again only to replace them.
        </p>
      ) : null}
      <div
        aria-label="SkipCash setup checklist"
        style={{
          display: 'grid',
          gap: 8,
          paddingInlineStart: 12,
          borderInlineStart: '3px solid color-mix(in srgb, var(--ink) 18%, transparent)',
        }}
      >
        <strong style={{ fontSize: 13 }}>SkipCash setup checklist</strong>
        <ol
          style={{
            margin: 0,
            paddingInlineStart: 18,
            display: 'grid',
            gap: 6,
            color: 'var(--ink-muted)',
            fontSize: 12.5,
            lineHeight: 1.55,
          }}
        >
          <li>Confirm the business CR ownership below.</li>
          <li>Enter the Client ID, Key ID, and Key Secret from SkipCash Merchant Portal.</li>
          <li>
            Copy the return URL below into SkipCash Merchant Portal → Online Payments → Return URL.
          </li>
          <li>
            Save this page. Successful SkipCash payments will return buyers to the thank-you page
            and mark the order paid.
          </li>
        </ol>
      </div>
      <CheckboxRow
        id="skipcash-cr-confirmed"
        checked={crConfirmed}
        onChange={() => setCrConfirmed(!crConfirmed)}
        title="Confirm CR ownership"
        description={
          crNumber
            ? `I confirm CR ${crNumber} belongs to this business.`
            : 'Add your CR number in Brand settings before enabling online payments.'
        }
        disabled={!crNumber}
        badge={!crNumber ? 'CR required' : null}
      />
      <Field
        label="Required SkipCash return URL"
        hint="This must be saved in SkipCash Merchant Portal so paid buyers come back to this store's thank-you page."
      >
        <input
          readOnly
          value={returnUrl}
          style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
          aria-label="SkipCash return URL"
          onFocus={(e) => e.currentTarget.select()}
        />
      </Field>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Field label="Client ID" hint={hasStoredCredentials ? 'Leave blank to keep current.' : ''}>
          <input
            maxLength={240}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={inputStyle}
            aria-label="SkipCash client id"
            autoComplete="off"
          />
        </Field>
        <Field label="Key ID">
          <input
            maxLength={240}
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            style={inputStyle}
            aria-label="SkipCash key id"
            autoComplete="off"
          />
        </Field>
      </div>
      <Field label="Key secret" hint={hasStoredCredentials ? 'Leave blank to keep current.' : ''}>
        <input
          type="password"
          maxLength={2000}
          value={keySecret}
          onChange={(e) => setKeySecret(e.target.value)}
          style={inputStyle}
          aria-label="SkipCash key secret"
          autoComplete="off"
        />
      </Field>
      <Field label="Webhook key" hint="Optional, if SkipCash provides one for webhook signing.">
        <input
          type="password"
          maxLength={2000}
          value={webhookKey}
          onChange={(e) => setWebhookKey(e.target.value)}
          style={inputStyle}
          aria-label="SkipCash webhook key"
          autoComplete="off"
        />
      </Field>
    </SectionCard>
  );
}

function SadadSection({
  enabled,
  onToggleEnabled,
  merchantId,
  setMerchantId,
  website,
  setWebsite,
  secretKey,
  setSecretKey,
  hasStoredCredentials,
  merchantIdHint,
  websiteHint,
  verifiedMode,
  verifiedAt,
  sectionError,
}: {
  enabled: boolean;
  onToggleEnabled: () => void;
  merchantId: string;
  setMerchantId: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  secretKey: string;
  setSecretKey: (v: string) => void;
  hasStoredCredentials: boolean;
  merchantIdHint: string | null;
  websiteHint: string | null;
  verifiedMode: 'live' | 'sandbox' | null;
  verifiedAt: string | null;
  sectionError: string | null;
}) {
  return (
    <SectionCard
      title="SADAD merchant setup / إعداد تاجر سداد"
      description="SADAD is enabled only after Souqna verifies the credentials with SADAD. يتم تفعيل سداد فقط بعد التحقق من البيانات مع سداد."
    >
      <CheckboxRow
        id="sadad-enabled"
        checked={enabled}
        onChange={onToggleEnabled}
        title="Enable SADAD at checkout"
        description="Turn this on after adding valid credentials. أضف بيانات صحيحة ثم فعّل سداد في صفحة الدفع."
        badge={enabled ? 'Enabled' : 'Disabled'}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          padding: 14,
          borderRadius: 10,
          border: '1px solid color-mix(in srgb, var(--ink-muted) 18%, transparent)',
          background: 'color-mix(in srgb, var(--surface-overlay) 78%, transparent)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong style={{ fontSize: 13 }}>What to enter</strong>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-muted)' }}>
            From the SADAD merchant dashboard, copy the SADAD ID, the registered website/domain, and
            the API secret key for live or test mode.
          </p>
        </div>
        <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong style={{ fontSize: 13 }}>ما البيانات المطلوبة؟</strong>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-muted)' }}>
            من لوحة تاجر سداد، انسخ رقم سداد، الموقع أو النطاق المسجل، ومفتاح API السري لبيئة
            الاختبار أو البيئة الحية.
          </p>
        </div>
      </div>
      {sectionError ? (
        <span
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--color-maroon, #8b3a3a)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {sectionError}
        </span>
      ) : null}
      {hasStoredCredentials ? (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Stored credentials active{merchantIdHint ? ` · merchant ${merchantIdHint}` : ''}
          {websiteHint ? ` · ${websiteHint}` : ''}
          {verifiedMode ? ` · verified ${verifiedMode}` : ''}
          {verifiedAt ? ` · ${new Date(verifiedAt).toLocaleDateString('en-GB')}` : ''}. Fill the
          fields again only to replace them.
        </p>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Field
          label="Merchant ID / SADAD ID"
          hint={hasStoredCredentials ? 'Leave blank to keep current.' : 'رقم سداد الخاص بالتاجر.'}
        >
          <input
            maxLength={120}
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            style={inputStyle}
            aria-label="SADAD merchant id"
            autoComplete="off"
          />
        </Field>
        <Field
          label="Website / Domain"
          hint="The domain registered with SADAD. النطاق المسجل في سداد."
        >
          <input
            maxLength={240}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            style={inputStyle}
            aria-label="SADAD website"
            autoComplete="off"
          />
        </Field>
      </div>
      <Field
        label="Secret key"
        hint={
          hasStoredCredentials
            ? 'Leave blank to keep current.'
            : 'Generated in SADAD for test or live mode. المفتاح السري من لوحة سداد.'
        }
      >
        <input
          type="password"
          maxLength={2000}
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          style={inputStyle}
          aria-label="SADAD secret key"
          autoComplete="off"
        />
      </Field>
    </SectionCard>
  );
}

function RequiredPoliciesSection({
  selected,
  present,
  onToggle,
  sectionError,
}: {
  selected: PolicyKey[];
  present: Record<PolicyKey, boolean>;
  onToggle: (k: PolicyKey) => void;
  sectionError: string | null;
}) {
  return (
    <SectionCard
      title="Required policies at checkout"
      description="Buyers must tick a box accepting each of these before placing an order."
      legend
    >
      {sectionError ? (
        <span
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--color-maroon, #8b3a3a)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {sectionError}
        </span>
      ) : null}
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {POLICY_KEYS.map((k) => {
          const checked = selected.includes(k);
          const empty = !present[k];
          const disabled = empty && !checked;
          return (
            <li key={k}>
              <CheckboxRow
                id={`policy-${k}`}
                checked={checked}
                onChange={() => onToggle(k)}
                title={POLICY_LABELS[k]}
                disabled={disabled}
                badge={empty ? 'Empty' : null}
                titleSuffixHint={
                  disabled ? 'Add this policy first in Settings → Policies' : undefined
                }
              />
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function OrderRulesSection({
  currency,
  setCurrency,
  minOrderQar,
  setMinOrderQar,
  shippingFlatQar,
  setShippingFlatQar,
}: {
  currency: string;
  setCurrency: (v: string) => void;
  minOrderQar: string;
  setMinOrderQar: (v: string) => void;
  shippingFlatQar: string;
  setShippingFlatQar: (v: string) => void;
}) {
  const knownCurrency = useMemo(
    () => CURRENCIES.some((c) => c.code === currency.toUpperCase()),
    [currency],
  );
  const quickDeliveryFees = [0, 10, 15, 20, 25, 30];
  const parsedDeliveryFee =
    shippingFlatQar.trim() === '' ? 0 : Number.parseInt(shippingFlatQar, 10);
  const deliveryPreview =
    Number.isFinite(parsedDeliveryFee) && parsedDeliveryFee > 0
      ? `${currency} ${parsedDeliveryFee}`
      : 'Free';
  return (
    <SectionCard
      title="Order rules and delivery fee"
      description="Set the buyer currency, minimum order, and the delivery fee shown in checkout."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <Field label="Currency" hint="Display currency. Stored as a 3-letter ISO 4217 code.">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={inputStyle}
            aria-label="Storefront currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
            {!knownCurrency ? <option value={currency}>{currency} (legacy)</option> : null}
          </select>
        </Field>
        <Field label="Minimum order (QAR)" hint="Optional. Block orders below this amount.">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={minOrderQar}
            onChange={(e) => setMinOrderQar(e.target.value)}
            style={inputStyle}
            placeholder="100"
            aria-label="Minimum order amount in QAR"
          />
        </Field>
        <Field
          label="Delivery fee (QAR)"
          hint={`Current buyer preview: ${deliveryPreview}. Use 0 or blank for free delivery.`}
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={shippingFlatQar}
            onChange={(e) => setShippingFlatQar(e.target.value)}
            style={inputStyle}
            placeholder="25"
            aria-label="Delivery fee in QAR"
          />
        </Field>
      </div>
      <div
        aria-label="Quick delivery fee presets"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {quickDeliveryFees.map((fee) => {
          const active = (shippingFlatQar.trim() === '' ? 0 : Number(shippingFlatQar)) === fee;
          return (
            <button
              key={fee}
              type="button"
              onClick={() => setShippingFlatQar(fee === 0 ? '' : String(fee))}
              style={{
                padding: '7px 10px',
                borderRadius: 999,
                border: active
                  ? '1px solid var(--admin-accent, #8a6a2a)'
                  : '1px solid color-mix(in srgb, var(--ink-strong) 14%, transparent)',
                background: active
                  ? 'color-mix(in srgb, var(--admin-accent, #8a6a2a) 12%, transparent)'
                  : 'var(--surface-bg)',
                color: active ? 'var(--admin-accent, #8a6a2a)' : 'var(--ink-strong)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {fee === 0 ? 'Free' : `QAR ${fee}`}
            </button>
          );
        })}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.55,
          color: 'var(--ink-muted)',
        }}
      >
        Delivery fee and minimum order apply after you press Save changes. The confirmation below
        shows when checkout settings are saved.
      </p>
    </SectionCard>
  );
}

function SouqnaCitySection({
  value,
  onChange,
  currency,
  enabledPaymentMethods,
}: {
  value: SouqnaCitySettings;
  onChange: (next: SouqnaCitySettings) => void;
  currency: string;
  enabledPaymentMethods: PaymentMethod[];
}) {
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  const paymentCandidates =
    enabledPaymentMethods.length > 0 ? enabledPaymentMethods : (['cod'] as PaymentMethod[]);

  function patch(patchValue: Partial<SouqnaCitySettings>) {
    onChange({ ...value, ...patchValue });
  }

  function patchRule(id: string, patchValue: Partial<SouqnaCityRule>) {
    onChange({
      ...value,
      rules: value.rules.map((rule) => (rule.id === id ? { ...rule, ...patchValue } : rule)),
    });
  }

  function toggleRulePayment(rule: SouqnaCityRule, method: PaymentMethod) {
    const current = rule.paymentMethods;
    const next = current.includes(method)
      ? current.length > 1
        ? current.filter((item) => item !== method)
        : current
      : [...current, method];
    patchRule(rule.id, { paymentMethods: next });
  }

  function addPreset(preset: SouqnaCityRule) {
    const existing = value.rules.find(
      (rule) => rule.city.trim().toLowerCase() === preset.city.trim().toLowerCase(),
    );
    if (existing) {
      patchRule(existing.id, { enabled: true });
      return;
    }
    onChange({
      ...value,
      rules: [...value.rules, { ...preset, paymentMethods: [...preset.paymentMethods] }],
    });
  }

  function addCustomCity() {
    onChange({
      ...value,
      rules: [...value.rules, createCityRule('Custom city')],
    });
  }

  function removeRule(id: string) {
    onChange({
      ...value,
      rules: value.rules.filter((rule) => rule.id !== id),
    });
  }

  return (
    <SectionCard
      title="Souqna City"
      description="City-specific checkout controls for payment methods and delivery amounts. Exact city matches win; nearest region fallback can cover northern, western, eastern, southern, and central areas."
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <CheckboxRow
          id="souqna-city-enabled"
          checked={value.enabled}
          onChange={() => patch({ enabled: !value.enabled })}
          title="Enable Souqna City"
          description="Apply city payment and delivery rules during buyer checkout."
        />
        <CheckboxRow
          id="souqna-city-nearest"
          checked={value.autoMatchNearest}
          onChange={() => patch({ autoMatchNearest: !value.autoMatchNearest })}
          title="Automatically pick nearest region"
          description="If the buyer types a city without an exact rule, use the first matching regional rule."
          disabled={!value.enabled}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SOUQNA_CITY_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => addPreset(preset)}
            style={chipButtonStyle()}
          >
            {t('Add')} {cityDisplayName(preset.city, locale)}
          </button>
        ))}
        <button type="button" onClick={addCustomCity} style={chipButtonStyle()}>
          {t('Add custom city')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {value.rules.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 13 }}>
            {t('No city rules yet. Add a preset or custom city.')}
          </p>
        ) : null}
        {value.rules.map((rule) => {
          const effectiveFee =
            rule.deliveryFeeQar === null ? t('Default delivery fee') : `${currency} ${rule.deliveryFeeQar}`;
          return (
            <section
              key={rule.id}
              style={{
                display: 'grid',
                gap: 12,
                padding: 14,
                borderRadius: 10,
                border: '1px solid color-mix(in srgb, var(--ink-strong) 12%, transparent)',
                background: rule.enabled
                  ? 'color-mix(in srgb, var(--admin-accent, #8a6a2a) 5%, var(--surface-bg))'
                  : 'color-mix(in srgb, var(--ink-strong) 3%, var(--surface-bg))',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(160px, 1.2fr) minmax(140px, .8fr) minmax(140px, .8fr) auto',
                  gap: 10,
                  alignItems: 'end',
                }}
                className="checkout-city-rule-grid"
              >
                <Field label="City" hint={effectiveFee}>
                  <input
                    value={rule.city}
                    onChange={(event) => patchRule(rule.id, { city: event.target.value })}
                    style={inputStyle}
                    placeholder={cityDisplayName('Al Wakrah', locale)}
                    disabled={!value.enabled}
                  />
                </Field>
                <Field label="Region" hint="Used for nearest fallback.">
                  <select
                    value={rule.region}
                    onChange={(event) =>
                      patchRule(rule.id, { region: event.target.value as SouqnaCityRegion })
                    }
                    style={inputStyle}
                    disabled={!value.enabled}
                  >
                    {SOUQNA_CITY_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {t(regionLabel(region))}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Delivery amount" hint="Blank uses the default fee.">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={rule.deliveryFeeQar ?? ''}
                    onChange={(event) =>
                      patchRule(rule.id, {
                        deliveryFeeQar:
                          event.target.value.trim() === ''
                            ? null
                            : Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                      })
                    }
                    style={inputStyle}
                    placeholder={t('Default')}
                    disabled={!value.enabled}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  style={removeButtonStyle()}
                >
                  {t('Remove')}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <label style={miniToggleStyle(!value.enabled)}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => patchRule(rule.id, { enabled: !rule.enabled })}
                    disabled={!value.enabled}
                  />
                  {t('Active')}
                </label>
                {paymentCandidates.map((method) => {
                  const checked = rule.paymentMethods.includes(method);
                  const title = PAYMENT_LABELS[method]?.title ?? method;
                  return (
                    <button
                      key={`${rule.id}:${method}`}
                      type="button"
                      onClick={() => toggleRulePayment(rule, method)}
                      disabled={!value.enabled || !rule.enabled}
                      aria-pressed={checked}
                      style={paymentChipStyle(checked, !value.enabled || !rule.enabled)}
                    >
                      {t(title)}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 760px) {
          .checkout-city-rule-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </SectionCard>
  );
}

function cityDisplayName(city: string, locale: string | undefined): string {
  if (locale !== 'ar') return city;
  const names: Record<string, string> = {
    'Al Khor': 'الخور',
    'Al Wakrah': 'الوكرة',
    'Al Thumamah': 'الثمامة',
    'Custom city': 'مدينة مخصصة',
  };
  return names[city] ?? city;
}

function regionLabel(region: SouqnaCityRegion): string {
  switch (region) {
    case 'northern':
      return 'Northern areas';
    case 'western':
      return 'Western areas';
    case 'eastern':
      return 'Eastern areas';
    case 'southern':
      return 'Southern areas';
    case 'central':
      return 'Central areas';
    case 'custom':
      return 'Custom';
  }
}

function chipButtonStyle(): React.CSSProperties {
  return {
    border: '1px solid color-mix(in srgb, var(--ink-strong) 14%, transparent)',
    borderRadius: 999,
    background: 'var(--surface-bg)',
    color: 'var(--ink-strong)',
    padding: '7px 11px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

function removeButtonStyle(): React.CSSProperties {
  return {
    border: '1px solid color-mix(in srgb, var(--color-maroon, #8b3a3a) 30%, transparent)',
    borderRadius: 8,
    background: 'transparent',
    color: 'var(--color-maroon, #8b3a3a)',
    padding: '10px 12px',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

function miniToggleStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--ink-muted)',
    fontSize: 12,
    opacity: disabled ? 0.55 : 1,
  };
}

function paymentChipStyle(checked: boolean, disabled: boolean): React.CSSProperties {
  return {
    border: checked
      ? '1px solid var(--admin-accent, #8a6a2a)'
      : '1px solid color-mix(in srgb, var(--ink-strong) 14%, transparent)',
    borderRadius: 999,
    background: checked
      ? 'color-mix(in srgb, var(--admin-accent, #8a6a2a) 12%, transparent)'
      : 'transparent',
    color: checked ? 'var(--admin-accent, #8a6a2a)' : 'var(--ink-strong)',
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
  };
}

function AddressDesignSection({
  selected,
  onSelect,
}: {
  selected: CheckoutAddressDesign;
  onSelect: (design: CheckoutAddressDesign) => void;
}) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  return (
    <SectionCard
      title={isAr ? 'تصميم عنوان التوصيل' : 'Delivery address design'}
      description={
        isAr
          ? 'اختر شكل حقول رقم المنزل والمنطقة والشارع في صفحة الدفع.'
          : 'Choose how house number, zone, and street appear during buyer checkout.'
      }
      legend
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 12,
        }}
      >
        {CHECKOUT_ADDRESS_DESIGNS.map((design) => {
          const meta = ADDRESS_DESIGN_META[design];
          const active = selected === design;
          return (
            <button
              key={design}
              type="button"
              onClick={() => onSelect(design)}
              aria-pressed={active}
              style={{
                display: 'grid',
                gridTemplateRows: 'auto 1fr',
                gap: 12,
                minHeight: 224,
                padding: 12,
                borderRadius: 14,
                border: active
                  ? '1.5px solid color-mix(in srgb, var(--color-maroon, #8b3a3a) 70%, var(--color-gold, #c7a45b))'
                  : '1px solid color-mix(in srgb, var(--ink-strong) 12%, transparent)',
                background: active
                  ? 'linear-gradient(135deg, color-mix(in srgb, var(--color-gold, #c7a45b) 13%, var(--surface-bg)), var(--surface-bg))'
                  : 'var(--surface-bg)',
                color: 'var(--ink-strong)',
                cursor: 'pointer',
                textAlign: isAr ? 'right' : 'left',
                boxShadow: active
                  ? '0 16px 34px color-mix(in srgb, var(--color-maroon, #8b3a3a) 16%, transparent)'
                  : '0 10px 24px color-mix(in srgb, #000 5%, transparent)',
                transition:
                  'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease, transform 180ms ease',
              }}
            >
              <AddressDesignPreview design={design} active={active} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <strong style={{ fontSize: 14.5, fontWeight: 650 }}>
                  {isAr ? meta.titleAr : meta.titleEn}
                </strong>
                <span style={{ color: 'var(--ink-muted)', fontSize: 12.5, lineHeight: 1.5 }}>
                  {isAr ? meta.bodyAr : meta.bodyEn}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

function AddressDesignPreview({
  design,
  active,
}: {
  design: CheckoutAddressDesign;
  active: boolean;
}) {
  if (design === 'classic') {
    return (
      <span
        aria-hidden
        style={{
          display: 'grid',
          gap: 7,
          padding: 12,
          borderRadius: 12,
          border: '1px solid color-mix(in srgb, var(--ink-strong) 12%, transparent)',
          background: 'color-mix(in srgb, var(--surface-bg) 82%, var(--ink-strong) 4%)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              height: 24,
              borderRadius: 8,
              background:
                i === 0
                  ? 'color-mix(in srgb, var(--ink-strong) 15%, transparent)'
                  : 'color-mix(in srgb, var(--ink-strong) 9%, transparent)',
            }}
          />
        ))}
      </span>
    );
  }

  if (design === 'soft_card') {
    return (
      <span
        aria-hidden
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          padding: 10,
          borderRadius: 12,
          border: '1px solid color-mix(in srgb, var(--color-gold, #c7a45b) 28%, transparent)',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-gold, #c7a45b) 18%, var(--surface-bg)), var(--surface-bg))',
        }}
      >
        {[
          ['House', '4'],
          ['Zone', '38'],
          ['Street', '856'],
        ].map(([label, value], i) => (
          <span
            key={label}
            style={{
              gridColumn: i === 0 ? '1 / -1' : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              minHeight: 30,
              padding: '7px 8px',
              borderRadius: 9,
              background: 'color-mix(in srgb, var(--surface-bg) 88%, var(--color-gold, #c7a45b) 10%)',
              color: 'var(--ink-strong)',
              fontSize: 11,
            }}
          >
            <span>{label}</span>
            <strong style={{ fontSize: 15, fontFamily: 'var(--font-mono)' }}>{value}</strong>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      style={{
        position: 'relative',
        display: 'grid',
        gap: 4,
        padding: 8,
        borderRadius: 12,
        background: '#d8c59d',
        border: '1px solid #8f7f61',
        boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.45)' : undefined,
      }}
    >
      <span style={addressPreviewScrewStyle('start', 'start')} />
      <span style={addressPreviewScrewStyle('end', 'start')} />
      <span style={addressPreviewScrewStyle('start', 'end')} />
      <span style={addressPreviewScrewStyle('end', 'end')} />
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: 70,
          borderRadius: 8,
          background: 'linear-gradient(180deg, #07539c, #043b75)',
          color: '#fff',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
        }}
      >
        <span style={{ fontSize: 11, opacity: 0.92 }}>رقم المنزل</span>
        <strong style={{ fontSize: 30, lineHeight: 1, fontFamily: 'var(--font-serif)' }}>4</strong>
        <span style={{ fontSize: 10, opacity: 0.86 }}>House No.</span>
      </span>
      <span
        style={{
          display: 'grid',
          gridTemplateColumns: '0.85fr 1.15fr',
          gap: 4,
        }}
      >
        {[
          ['Zone', 'منطقة', '38'],
          ['Street', 'شارع', '856'],
        ].map(([en, ar, value]) => (
          <span
            key={en}
            style={{
              display: 'grid',
              gap: 2,
              padding: '7px 8px',
              borderRadius: 7,
              background: '#06488a',
              color: '#fff',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
            }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5 }}>
              <span>{en}</span>
              <span>{ar}</span>
            </span>
            <strong style={{ fontSize: 17, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
              {value}
            </strong>
          </span>
        ))}
      </span>
    </span>
  );
}

function addressPreviewScrewStyle(
  inline: 'start' | 'end',
  block: 'start' | 'end',
): React.CSSProperties {
  return {
    position: 'absolute',
    [inline === 'start' ? 'left' : 'right']: 8,
    [block === 'start' ? 'top' : 'bottom']: 8,
    width: 7,
    height: 7,
    borderRadius: 999,
    background: '#6f6656',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35)',
  };
}

function ThankYouSection({
  title,
  setTitle,
  message,
  setMessage,
  ctaLabel,
  setCtaLabel,
  ctaUrl,
  setCtaUrl,
  showOrderSummary,
  setShowOrderSummary,
  sectionError,
}: {
  title: string;
  setTitle: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  ctaLabel: string;
  setCtaLabel: (v: string) => void;
  ctaUrl: string;
  setCtaUrl: (v: string) => void;
  showOrderSummary: boolean;
  setShowOrderSummary: (v: boolean) => void;
  sectionError: string | null;
}) {
  return (
    <SectionCard
      title="Thank-you page"
      description="Customize the page buyers see after an order or after returning from an online payment."
    >
      {sectionError ? (
        <span
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--color-maroon, #8b3a3a)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {sectionError}
        </span>
      ) : null}
      <Field
        label="Headline"
        hint="Shown on successful and received orders. Payment failures keep the safety message."
      >
        <input
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
          placeholder="Thank you for shopping with us."
          aria-label="Thank-you page headline"
        />
      </Field>
      <Field label="Message">
        <textarea
          maxLength={600}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...textareaStyle, minHeight: 110 }}
          placeholder="Your order is confirmed. We will contact you with delivery updates soon."
          aria-label="Thank-you page message"
        />
      </Field>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Field label="CTA label" hint="Optional. Example: Continue shopping.">
          <input
            maxLength={80}
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            style={inputStyle}
            aria-label="Thank-you page CTA label"
          />
        </Field>
        <Field label="CTA link" hint="Use a store path like / or a full https:// link.">
          <input
            maxLength={500}
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            style={inputStyle}
            placeholder="/"
            aria-label="Thank-you page CTA link"
          />
        </Field>
      </div>
      <CheckboxRow
        id="thank-you-show-summary"
        checked={showOrderSummary}
        onChange={() => setShowOrderSummary(!showOrderSummary)}
        title="Show order summary"
        description="Keep item, total, and delivery details visible on the thank-you page."
      />
    </SectionCard>
  );
}

function CheckboxRow({
  id,
  checked,
  onChange,
  title,
  description,
  disabled,
  badge,
  titleSuffixHint,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  disabled?: boolean;
  badge?: string | null;
  titleSuffixHint?: string;
}) {
  const tipId = useId();
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked
          ? 'color-mix(in srgb, var(--admin-accent) 8%, transparent)'
          : 'var(--surface-bg)',
        border: checked
          ? '1px solid var(--admin-accent)'
          : '1px solid color-mix(in srgb, var(--ink-strong) 12%, transparent)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-describedby={titleSuffixHint ? tipId : undefined}
        style={{
          marginTop: 3,
          width: 16,
          height: 16,
          accentColor: 'var(--admin-accent)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <strong
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--ink-strong)',
            }}
          >
            {t(title)}
          </strong>
          {badge ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                padding: '1px 6px',
                borderRadius: 999,
                border: '1px solid color-mix(in srgb, var(--ink-strong) 14%, transparent)',
              }}
            >
              {t(badge)}
            </span>
          ) : null}
        </div>
        {description ? (
          <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
            {t(description)}
          </span>
        ) : null}
        {titleSuffixHint ? (
          <span
            id={tipId}
            role="note"
            style={{ fontSize: 12, color: 'var(--ink-muted)', fontStyle: 'italic' }}
          >
            {t(titleSuffixHint)}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function SaveBar({
  pending,
  state,
  topLevelError,
  disabled,
}: {
  pending: boolean;
  state: CheckoutActionState;
  topLevelError: string | null;
  disabled: boolean;
}) {
  const locale = useLocale();
  const t = (text: string) => adminPhrase(locale, text);
  return (
    <footer
      style={{
        position: 'sticky',
        bottom: 16,
        zIndex: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
        padding: 12,
        borderRadius: 14,
        border: '1px solid color-mix(in srgb, var(--ink-strong) 12%, transparent)',
        background: 'color-mix(in srgb, var(--surface-overlay) 92%, transparent)',
        boxShadow: '0 14px 38px color-mix(in srgb, #000 14%, transparent)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {topLevelError ? (
        <span
          role="alert"
          style={{
            fontSize: 12.5,
            color: 'var(--color-maroon, #8b3a3a)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {topLevelError}
        </span>
      ) : state.status === 'success' ? (
        <span
          role="status"
          style={{
            fontSize: 12.5,
            color: 'var(--admin-accent)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {t('Saved')}{' '}
          {new Date(state.updatedAt).toLocaleTimeString(locale === 'ar' ? 'ar-QA' : 'en-GB')}
        </span>
      ) : null}
      <button
        type="submit"
        disabled={pending || disabled}
        style={{
          padding: '9px 18px',
          borderRadius: 8,
          background:
            pending || disabled
              ? 'color-mix(in srgb, var(--ink-strong) 50%, transparent)'
              : 'var(--ink-strong)',
          color: 'var(--surface-bg)',
          border: 'none',
          fontSize: 13.5,
          fontWeight: 500,
          cursor: pending ? 'progress' : disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {pending ? t('Saving…') : t('Save changes')}
      </button>
    </footer>
  );
}
