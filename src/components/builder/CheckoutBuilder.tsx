'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  BadgeCheck,
  Clock3,
  CreditCard,
  ExternalLink,
  Home,
  LayoutPanelTop,
  Palette,
  Plus,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { updateCheckoutExperienceSettings } from '@/app/actions/storefrontSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  CheckoutAddressDesign,
  CheckoutBackgroundPreset,
  CheckoutButtonStyle,
  CheckoutCustomColors,
  CheckoutCustomTrustBadge,
  CheckoutExperienceSettings,
  CheckoutOrderSummaryLayout,
  CheckoutPaymentCardStyle,
  CheckoutSettings,
  CheckoutThankYouStyle,
  CheckoutTrustBadge,
  PaymentMethod,
  ThankYouSettings,
} from '@/lib/storefrontSettings';
import {
  checkoutExperienceBackground,
  checkoutExperienceVars,
  getConfirmedPaymentProvider,
  isRedirectPaymentMethod,
} from '@/lib/checkoutExperience';

type BuilderLocale = 'en' | 'ar';
type Device = 'desktop' | 'tablet' | 'mobile';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type InspectorProps = {
  slug: string;
  checkout: CheckoutSettings;
  businessName: string;
  logoUrl: string | null;
  locale: BuilderLocale;
  onChange: (checkout: CheckoutSettings) => void;
};

type PreviewProps = {
  checkout: CheckoutSettings;
  businessName: string;
  logoUrl: string | null;
  locale: BuilderLocale;
  device: Device;
};

const ADDRESS_OPTIONS: CheckoutAddressDesign[] = ['qatar_plate', 'soft_card', 'classic'];
const BACKGROUND_OPTIONS: CheckoutBackgroundPreset[] = ['sand', 'pearl', 'plate', 'midnight', 'custom'];
const BUTTON_OPTIONS: CheckoutButtonStyle[] = ['solid', 'maroon', 'gold', 'outline'];
const PAYMENT_CARD_OPTIONS: CheckoutPaymentCardStyle[] = ['soft', 'bordered', 'compact'];
const SUMMARY_OPTIONS: CheckoutOrderSummaryLayout[] = ['side', 'bottom', 'compact'];
const THANK_YOU_OPTIONS: CheckoutThankYouStyle[] = ['warm', 'minimal', 'celebration'];
const TRUST_BADGE_OPTIONS: Array<{ id: CheckoutTrustBadge; icon: LucideIcon }> = [
  { id: 'secure_checkout', icon: ShieldCheck },
  { id: 'fast_confirmation', icon: Clock3 },
  { id: 'whatsapp_support', icon: MessageCircle },
  { id: 'local_delivery', icon: Truck },
];

const SAVE_DELAY_MS = 520;

function copy(locale: BuilderLocale) {
  if (locale === 'ar') {
    return {
      pageTitle: 'صفحة الدفع',
      pageBody: 'تحكم آمن في تجربة الدفع بدون تغيير منطق الطلبات أو الدفع.',
      saved: 'تم الحفظ',
      saving: 'جار الحفظ',
      error: 'تعذر الحفظ',
      ready: 'جاهز',
      hero: 'نص البداية',
      heroTitle: 'عنوان صفحة الدفع',
      heroTitlePlaceholder: 'إتمام الطلب من {store}',
      heroSubtitle: 'وصف قصير',
      heroSubtitlePlaceholder: 'أدخل بياناتك وسنؤكد الطلب بسرعة.',
      background: 'الخلفية والألوان',
      backgroundBody: 'غيّر خلفية الدفع وألوانها بدون تغيير منطق الطلب.',
      customColors: 'الألوان المخصصة',
      customCss: 'CSS مخصص',
      customCssPlaceholder: '.souqna-checkout-experience { border-radius: 24px; }',
      customTrust: 'شارات ثقة مخصصة',
      customTrustHint: 'اكتب الشارة بالإنجليزية والعربية. ستظهر حسب لغة المتجر.',
      addTrustBadge: 'إضافة شارة',
      removeTrustBadge: 'حذف الشارة',
      continuePayment: 'متابعة الدفع',
      providerReady: 'زر الدفع يظهر عند اختيار مزود دفع مفعّل.',
      providerPending: 'لم يتم تفعيل مزود دفع إلكتروني بعد.',
      logoAlt: 'شعار المتجر',
      colors: {
        background: 'الخلفية',
        surface: 'البطاقة',
        accent: 'اللون الرئيسي',
        text: 'النص',
        buttonText: 'نص الزر',
      },
      backgroundOptions: {
        sand: 'رملي',
        pearl: 'لؤلؤي',
        plate: 'لوحة قطر',
        midnight: 'داكن',
        custom: 'مخصص',
      } satisfies Record<CheckoutBackgroundPreset, string>,
      address: 'شكل حقول العنوان',
      button: 'شكل الأزرار',
      trust: 'شارات الثقة',
      delivery: 'ملاحظات التسليم',
      deliveryPlaceholder: 'مثال: التوصيل داخل الدوحة خلال 24 ساعة.',
      payment: 'بطاقات طرق الدفع',
      summary: 'ملخص الطلب',
      thankYou: 'صفحة الشكر',
      thankYouTitle: 'عنوان الشكر',
      thankYouMessage: 'رسالة الشكر',
      showSummary: 'إظهار ملخص الطلب في صفحة الشكر',
      addressOptions: {
        qatar_plate: 'لوحة قطر',
        soft_card: 'بطاقات ناعمة',
        classic: 'كلاسيكي',
      } satisfies Record<CheckoutAddressDesign, string>,
      buttonOptions: {
        solid: 'أساسي',
        maroon: 'عنابي',
        gold: 'ذهبي',
        outline: 'إطار فقط',
      } satisfies Record<CheckoutButtonStyle, string>,
      paymentOptions: {
        soft: 'ناعم',
        bordered: 'بحدود واضحة',
        compact: 'مختصر',
      } satisfies Record<CheckoutPaymentCardStyle, string>,
      summaryOptions: {
        side: 'بجانب النموذج',
        bottom: 'أسفل النموذج',
        compact: 'مختصر',
      } satisfies Record<CheckoutOrderSummaryLayout, string>,
      thankYouOptions: {
        warm: 'دافئ',
        minimal: 'هادئ',
        celebration: 'احتفالي',
      } satisfies Record<CheckoutThankYouStyle, string>,
      trustOptions: {
        secure_checkout: 'دفع آمن',
        fast_confirmation: 'تأكيد سريع',
        whatsapp_support: 'دعم واتساب',
        local_delivery: 'توصيل محلي',
      } satisfies Record<CheckoutTrustBadge, string>,
      previewStep: 'الدفع',
      previewContact: 'بيانات العميل',
      previewAddress: 'العنوان',
      previewPayment: 'الدفع',
      previewReview: 'المراجعة',
      previewNext: 'التالي',
      previewPay: 'الدفع عند الاستلام',
      previewSummary: 'ملخص الطلب',
      previewTotal: 'الإجمالي',
      previewThanks: 'تم استلام الطلب',
    };
  }
  return {
    pageTitle: 'Checkout page',
    pageBody: 'Safe checkout experience controls without changing order or payment logic.',
    saved: 'Saved',
    saving: 'Saving',
    error: 'Save failed',
    ready: 'Ready',
    hero: 'Header text',
    heroTitle: 'Checkout title',
    heroTitlePlaceholder: 'Complete your order from {store}',
    heroSubtitle: 'Short subtitle',
    heroSubtitlePlaceholder: 'Add your details and we will confirm your order quickly.',
    background: 'Background changer',
    backgroundBody: 'Tune the checkout backdrop, colors, and controlled custom CSS.',
    customColors: 'Custom colors',
    customCss: 'Custom CSS',
    customCssPlaceholder: '.souqna-checkout-experience { border-radius: 24px; }',
    customTrust: 'Custom trust badges',
    customTrustHint: 'Add English and Arabic labels. Buyers see the label for their storefront language.',
    addTrustBadge: 'Add badge',
    removeTrustBadge: 'Remove badge',
    continuePayment: 'Continue payment',
    providerReady: 'Payment CTA appears when a confirmed provider is selected.',
    providerPending: 'No confirmed online payment provider yet.',
    logoAlt: 'Store logo',
    colors: {
      background: 'Background',
      surface: 'Surface',
      accent: 'Accent',
      text: 'Text',
      buttonText: 'Button text',
    },
    backgroundOptions: {
      sand: 'Sand',
      pearl: 'Pearl',
      plate: 'Qatar plate',
      midnight: 'Midnight',
      custom: 'Custom',
    } satisfies Record<CheckoutBackgroundPreset, string>,
    address: 'Address field style',
    button: 'Button style',
    trust: 'Trust badges',
    delivery: 'Delivery notes',
    deliveryPlaceholder: 'Example: Doha delivery within 24 hours.',
    payment: 'Payment method card style',
    summary: 'Order summary layout',
    thankYou: 'Thank-you page',
    thankYouTitle: 'Thank-you title',
    thankYouMessage: 'Thank-you message',
    showSummary: 'Show order summary on thank-you page',
    addressOptions: {
      qatar_plate: 'Qatar plate',
      soft_card: 'Soft cards',
      classic: 'Classic',
    } satisfies Record<CheckoutAddressDesign, string>,
    buttonOptions: {
      solid: 'Solid',
      maroon: 'Maroon',
      gold: 'Gold',
      outline: 'Outline',
    } satisfies Record<CheckoutButtonStyle, string>,
    paymentOptions: {
      soft: 'Soft',
      bordered: 'Bordered',
      compact: 'Compact',
    } satisfies Record<CheckoutPaymentCardStyle, string>,
    summaryOptions: {
      side: 'Side panel',
      bottom: 'Bottom',
      compact: 'Compact',
    } satisfies Record<CheckoutOrderSummaryLayout, string>,
    thankYouOptions: {
      warm: 'Warm',
      minimal: 'Minimal',
      celebration: 'Celebration',
    } satisfies Record<CheckoutThankYouStyle, string>,
    trustOptions: {
      secure_checkout: 'Secure checkout',
      fast_confirmation: 'Fast confirmation',
      whatsapp_support: 'WhatsApp support',
      local_delivery: 'Local delivery',
    } satisfies Record<CheckoutTrustBadge, string>,
    previewStep: 'Checkout',
    previewContact: 'Customer details',
    previewAddress: 'Address',
    previewPayment: 'Payment',
    previewReview: 'Review',
    previewNext: 'Next',
    previewPay: 'Cash on delivery',
    previewSummary: 'Order summary',
    previewTotal: 'Total',
    previewThanks: 'Order received',
  };
}

export function CheckoutBuilderInspector({
  slug,
  checkout,
  businessName,
  locale,
  onChange,
}: InspectorProps) {
  const t = copy(locale);
  const checkoutRef = useRef(checkout);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    checkoutRef.current = checkout;
  }, [checkout]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  function queueSave(next: CheckoutSettings) {
    checkoutRef.current = next;
    onChange(next);
    setSaveState('saving');
    setSaveMessage(null);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void updateCheckoutExperienceSettings({
        slug,
        addressDesign: next.addressDesign,
        experience: next.experience,
        thankYou: next.thankYou,
      }).then((result) => {
        if (result.status === 'success') {
          checkoutRef.current = result.checkout;
          onChange(result.checkout);
          setSaveState('saved');
          setSaveMessage(null);
          return;
        }
        setSaveState('error');
        setSaveMessage(result.status === 'error' && locale !== 'ar' ? result.message : t.error);
      });
    }, SAVE_DELAY_MS);
  }

  function updateExperience(patch: Partial<CheckoutExperienceSettings>) {
    const current = checkoutRef.current;
    queueSave({
      ...current,
      experience: {
        ...current.experience,
        ...patch,
      },
    });
  }

  function updateThankYou(patch: Partial<ThankYouSettings>) {
    const current = checkoutRef.current;
    queueSave({
      ...current,
      thankYou: {
        ...current.thankYou,
        ...patch,
      },
    });
  }

  function updateAddressDesign(addressDesign: CheckoutAddressDesign) {
    queueSave({ ...checkoutRef.current, addressDesign });
  }

  function toggleTrustBadge(id: CheckoutTrustBadge) {
    const current = checkoutRef.current.experience.trustBadges;
    const next = current.includes(id) ? current.filter((badge) => badge !== id) : [...current, id];
    updateExperience({ trustBadges: next });
  }

  function updateCustomColors(patch: Partial<CheckoutCustomColors>) {
    const current = checkoutRef.current.experience.customColors;
    updateExperience({
      customColors: {
        ...current,
        ...patch,
      },
    });
  }

  function addCustomTrustBadge() {
    const current = checkoutRef.current.experience.customTrustBadges;
    if (current.length >= 6) return;
    updateExperience({
      customTrustBadges: [
        ...current,
        locale === 'ar'
          ? { labelEn: 'Buyer guarantee', labelAr: 'ضمان للعميل' }
          : { labelEn: 'Buyer guarantee', labelAr: 'ضمان للعميل' },
      ],
    });
  }

  function updateCustomTrustBadge(index: number, patch: Partial<CheckoutCustomTrustBadge>) {
    const current = checkoutRef.current.experience.customTrustBadges;
    const next = current.map((badge, i) => (i === index ? { ...badge, ...patch } : badge));
    updateExperience({ customTrustBadges: next });
  }

  function removeCustomTrustBadge(index: number) {
    const current = checkoutRef.current.experience.customTrustBadges;
    updateExperience({ customTrustBadges: current.filter((_, i) => i !== index) });
  }

  const statusLabel =
    saveState === 'saving'
      ? t.saving
      : saveState === 'saved'
        ? t.saved
        : saveState === 'error'
          ? t.error
          : t.ready;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={panelStyle()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={iconShellStyle()}>
            <CreditCard size={15} aria-hidden />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={sectionTitleStyle()}>{t.pageTitle}</h2>
            <p style={sectionBodyStyle()}>{t.pageBody}</p>
          </div>
          <Badge
            variant={saveState === 'error' ? 'destructive' : 'outline'}
            className="shrink-0 border-[var(--bld-input-border)] bg-transparent text-[10px]"
            style={{ color: 'var(--bld-text-muted)' }}
          >
            {statusLabel}
          </Badge>
        </div>
        {saveMessage ? <p style={errorStyle()}>{saveMessage}</p> : null}
      </section>

      <PanelSection title={t.hero} icon={LayoutPanelTop}>
        <FieldLabel label={t.heroTitle}>
          <Input
            value={checkout.experience.heroTitle ?? ''}
            onChange={(event) => updateExperience({ heroTitle: event.target.value || null })}
            maxLength={120}
            placeholder={t.heroTitlePlaceholder.replace('{store}', businessName)}
            className="h-9 border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)] placeholder:text-[var(--bld-text-faint)]"
          />
        </FieldLabel>
        <FieldLabel label={t.heroSubtitle}>
          <Textarea
            value={checkout.experience.heroSubtitle ?? ''}
            onChange={(event) => updateExperience({ heroSubtitle: event.target.value || null })}
            maxLength={240}
            rows={3}
            placeholder={t.heroSubtitlePlaceholder}
            className="min-h-20 resize-none border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)] placeholder:text-[var(--bld-text-faint)]"
          />
        </FieldLabel>
      </PanelSection>

      <PanelSection title={t.background} icon={Palette}>
        <p style={sectionBodyStyle()}>{t.backgroundBody}</p>
        <SegmentedPicker
          ariaLabel={t.background}
          options={BACKGROUND_OPTIONS}
          value={checkout.experience.backgroundPreset}
          labels={t.backgroundOptions}
          onChange={(backgroundPreset) => updateExperience({ backgroundPreset })}
        />
        <div style={{ display: 'grid', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              textTransform: 'uppercase',
              color: 'var(--bld-text-muted)',
            }}
          >
            {t.customColors}
          </span>
          <ColorField
            label={t.colors.background}
            value={checkout.experience.customColors.background}
            fallback="#f2e5cf"
            onChange={(background) => updateCustomColors({ background })}
          />
          <ColorField
            label={t.colors.surface}
            value={checkout.experience.customColors.surface}
            fallback="#fff8ea"
            onChange={(surface) => updateCustomColors({ surface })}
          />
          <ColorField
            label={t.colors.accent}
            value={checkout.experience.customColors.accent}
            fallback="#8b3a3a"
            onChange={(accent) => updateCustomColors({ accent })}
          />
          <ColorField
            label={t.colors.text}
            value={checkout.experience.customColors.text}
            fallback="#241f18"
            onChange={(text) => updateCustomColors({ text })}
          />
          <ColorField
            label={t.colors.buttonText}
            value={checkout.experience.customColors.buttonText}
            fallback="#fff8ea"
            onChange={(buttonText) => updateCustomColors({ buttonText })}
          />
        </div>
        <FieldLabel label={t.customCss}>
          <Textarea
            value={checkout.experience.customCss ?? ''}
            onChange={(event) => updateExperience({ customCss: event.target.value || null })}
            maxLength={2500}
            rows={5}
            placeholder={t.customCssPlaceholder}
            className="min-h-28 resize-none border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] font-mono text-[11px] text-[var(--bld-input-text)] placeholder:text-[var(--bld-text-faint)]"
          />
        </FieldLabel>
      </PanelSection>

      <PanelSection title={t.address} icon={Home}>
        <SegmentedPicker
          ariaLabel={t.address}
          options={ADDRESS_OPTIONS}
          value={checkout.addressDesign}
          labels={t.addressOptions}
          onChange={updateAddressDesign}
        />
      </PanelSection>

      <PanelSection title={t.button} icon={Sparkles}>
        <SegmentedPicker
          ariaLabel={t.button}
          options={BUTTON_OPTIONS}
          value={checkout.experience.buttonStyle}
          labels={t.buttonOptions}
          onChange={(buttonStyle) => updateExperience({ buttonStyle })}
        />
      </PanelSection>

      <PanelSection title={t.trust} icon={ShieldCheck}>
        <div style={{ display: 'grid', gap: 8 }}>
          {TRUST_BADGE_OPTIONS.map(({ id, icon: Icon }) => {
            const selected = checkout.experience.trustBadges.includes(id);
            return (
              <Button
                key={id}
                type="button"
                aria-pressed={selected}
                variant="outline"
                size="sm"
                onClick={() => toggleTrustBadge(id)}
                className="h-auto justify-start rounded-md border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] px-3 py-2 text-[var(--bld-text)] hover:bg-[var(--bld-tile-bg)]"
                style={{
                  borderColor: selected ? 'var(--bld-accent-line)' : 'var(--bld-input-border)',
                  boxShadow: selected ? 'inset 0 0 0 1px var(--bld-accent-line)' : undefined,
                }}
              >
                <Icon size={15} aria-hidden />
                <span style={{ flex: 1, textAlign: 'start' }}>{t.trustOptions[id]}</span>
                {selected ? <BadgeCheck size={15} aria-hidden /> : null}
              </Button>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 6,
            paddingTop: 12,
            borderTop: '1px solid var(--bld-divider)',
            display: 'grid',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <h4 style={{ ...sectionTitleStyle(), fontSize: 14 }}>{t.customTrust}</h4>
              <p style={sectionBodyStyle()}>{t.customTrustHint}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomTrustBadge}
              disabled={checkout.experience.customTrustBadges.length >= 6}
              className="shrink-0 border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-text)] hover:bg-[var(--bld-tile-bg)]"
            >
              <Plus size={14} aria-hidden />
              {t.addTrustBadge}
            </Button>
          </div>
          {checkout.experience.customTrustBadges.map((badge, index) => (
            <div
              key={`${index}-${badge.labelEn}-${badge.labelAr}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto',
                gap: 7,
                alignItems: 'center',
              }}
            >
              <Input
                value={badge.labelEn}
                onChange={(event) =>
                  updateCustomTrustBadge(index, { labelEn: event.target.value })
                }
                maxLength={48}
                placeholder="English"
                className="h-9 border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)]"
              />
              <Input
                value={badge.labelAr}
                onChange={(event) =>
                  updateCustomTrustBadge(index, { labelAr: event.target.value })
                }
                maxLength={48}
                placeholder="العربية"
                className="h-9 border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t.removeTrustBadge}
                onClick={() => removeCustomTrustBadge(index)}
                className="h-9 w-9 border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-text-muted)] hover:bg-[var(--bld-tile-bg)]"
              >
                <Trash2 size={14} aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection title={t.delivery} icon={Truck}>
        <Textarea
          value={checkout.experience.deliveryNotes ?? ''}
          onChange={(event) => updateExperience({ deliveryNotes: event.target.value || null })}
          maxLength={420}
          rows={4}
          placeholder={t.deliveryPlaceholder}
          className="min-h-24 resize-none border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)] placeholder:text-[var(--bld-text-faint)]"
        />
      </PanelSection>

      <PanelSection title={t.payment} icon={CreditCard}>
        <SegmentedPicker
          ariaLabel={t.payment}
          options={PAYMENT_CARD_OPTIONS}
          value={checkout.experience.paymentCardStyle}
          labels={t.paymentOptions}
          onChange={(paymentCardStyle) => updateExperience({ paymentCardStyle })}
        />
      </PanelSection>

      <PanelSection title={t.summary} icon={LayoutPanelTop}>
        <SegmentedPicker
          ariaLabel={t.summary}
          options={SUMMARY_OPTIONS}
          value={checkout.experience.orderSummaryLayout}
          labels={t.summaryOptions}
          onChange={(orderSummaryLayout) => updateExperience({ orderSummaryLayout })}
        />
      </PanelSection>

      <PanelSection title={t.thankYou} icon={Sparkles}>
        <SegmentedPicker
          ariaLabel={t.thankYou}
          options={THANK_YOU_OPTIONS}
          value={checkout.experience.thankYouStyle}
          labels={t.thankYouOptions}
          onChange={(thankYouStyle) => updateExperience({ thankYouStyle })}
        />
        <FieldLabel label={t.thankYouTitle}>
          <Input
            value={checkout.thankYou.title ?? ''}
            onChange={(event) => updateThankYou({ title: event.target.value || null })}
            maxLength={120}
            className="h-9 border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)]"
          />
        </FieldLabel>
        <FieldLabel label={t.thankYouMessage}>
          <Textarea
            value={checkout.thankYou.message ?? ''}
            onChange={(event) => updateThankYou({ message: event.target.value || null })}
            maxLength={600}
            rows={4}
            className="min-h-24 resize-none border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)]"
          />
        </FieldLabel>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--bld-text)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={checkout.thankYou.showOrderSummary}
            onChange={(event) => updateThankYou({ showOrderSummary: event.target.checked })}
          />
          {t.showSummary}
        </label>
      </PanelSection>
    </div>
  );
}

export function CheckoutBuilderPreview({
  checkout,
  businessName,
  logoUrl,
  locale,
  device,
}: PreviewProps) {
  const t = copy(locale);
  const isAr = locale === 'ar';
  const heroTitle =
    checkout.experience.heroTitle ||
    (isAr ? `إتمام الطلب من ${businessName}` : `Complete your order from ${businessName}`);
  const heroSubtitle =
    checkout.experience.heroSubtitle ||
    (isAr
      ? 'تجربة دفع سريعة وواضحة لعملائك.'
      : 'A clear checkout experience for your customers.');
  const summaryBottom = checkout.experience.orderSummaryLayout === 'bottom' || device === 'mobile';
  const compactSummary = checkout.experience.orderSummaryLayout === 'compact';
  const compactPayment = checkout.experience.paymentCardStyle === 'compact';
  const thankYouStyle = checkout.experience.thankYouStyle;
  const confirmedProvider = getConfirmedPaymentProvider(checkout);
  const previewMethod = confirmedProvider ?? checkout.paymentMethods[0] ?? 'cod';
  const paymentPreview = previewPaymentCopy(previewMethod, checkout, locale);
  const previewCustomBadges = checkout.experience.customTrustBadges
    .map((badge) => (isAr ? badge.labelAr : badge.labelEn))
    .filter(Boolean);
  const previewVars = checkoutExperienceVars(checkout.experience) as CSSProperties;

  return (
    <div
      className="souqna-checkout-experience"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        ...previewVars,
        width: '100%',
        minHeight: 'calc(100dvh - 160px)',
        border: '1px solid var(--bld-iframe-border)',
        borderRadius: 16,
        overflow: 'auto',
        background: checkoutExperienceBackground(checkout.experience),
        color: 'var(--sq-checkout-text)',
        boxShadow: '0 22px 70px var(--bld-panel-shadow)',
      }}
    >
      {checkout.experience.customCss ? <style>{checkout.experience.customCss}</style> : null}
      <div
        style={{
          width: 'min(1040px, 100%)',
          margin: '0 auto',
          padding: device === 'mobile' ? 18 : 28,
          display: 'grid',
          gap: 22,
        }}
      >
        <header
          style={{
            display: 'grid',
            gap: 12,
            padding: device === 'mobile' ? '18px 0 4px' : '28px 0 8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              padding: 12,
              borderRadius: 18,
              background: 'color-mix(in srgb, var(--sq-checkout-surface) 78%, transparent)',
              border: '1px solid color-mix(in srgb, var(--sq-checkout-text) 12%, transparent)',
              boxShadow: '0 14px 34px rgba(55, 36, 18, 0.10)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={brandMarkStyle()}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={t.logoAlt}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 12,
                    }}
                  />
                ) : (
                  <Store size={18} aria-hidden />
                )}
              </span>
              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 15,
                  }}
                >
                  {businessName}
                </strong>
                <span style={{ color: 'color-mix(in srgb, currentColor 62%, transparent)', fontSize: 12 }}>
                  {confirmedProvider ? t.providerReady : t.providerPending}
                </span>
              </div>
            </div>
            {confirmedProvider ? (
              <span style={paymentCtaMiniStyle()}>
                <ExternalLink size={13} aria-hidden />
                {t.continuePayment}
              </span>
            ) : null}
          </div>
          <Badge
            variant="outline"
            className="w-fit border-[#8b3a3a33] bg-[#8b3a3a0d] text-[#6d2932]"
          >
            {t.previewStep}
          </Badge>
          <div style={{ display: 'grid', gap: 8, maxWidth: 620 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif, var(--font-sans))',
                fontSize: device === 'mobile' ? 28 : 40,
                lineHeight: 1.08,
                fontWeight: 500,
              }}
            >
              {heroTitle}
            </h1>
            <p style={{ margin: 0, color: '#6b5d4d', fontSize: 15, lineHeight: 1.6 }}>
              {heroSubtitle}
            </p>
          </div>
          {checkout.experience.trustBadges.length > 0 || previewCustomBadges.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {checkout.experience.trustBadges.map((badge) => (
                <span key={badge} style={previewBadgeStyle()}>
                  {t.trustOptions[badge]}
                </span>
              ))}
              {previewCustomBadges.map((badge, index) => (
                <span key={`${badge}-${index}`} style={previewBadgeStyle(true)}>
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: summaryBottom ? '1fr' : 'minmax(0, 1fr) minmax(260px, 330px)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <section style={previewSurfaceStyle()}>
            <div style={stepTabsStyle()}>
              {[t.previewContact, t.previewAddress, t.previewPayment, t.previewReview].map(
                (label, index) => (
                  <span
                    key={label}
                    style={{
                      ...stepPillStyle(index === 1),
                      fontSize: device === 'mobile' ? 11 : 12,
                    }}
                  >
                    {label}
                  </span>
                ),
              )}
            </div>

            <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
              <AddressPreview addressDesign={checkout.addressDesign} locale={locale} />
              {checkout.experience.deliveryNotes ? (
                <div style={deliveryNoteStyle()}>{checkout.experience.deliveryNotes}</div>
              ) : null}
              <div style={previewPaymentCardStyle(checkout.experience.paymentCardStyle, true)}>
                <CreditCard size={compactPayment ? 15 : 18} aria-hidden />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: compactPayment ? 13 : 14 }}>
                    {paymentPreview.title}
                  </strong>
                  {!compactPayment ? (
                    <span style={{ color: '#6b5d4d', fontSize: 12.5 }}>
                      {paymentPreview.body}
                    </span>
                  ) : null}
                </div>
                {isRedirectPaymentMethod(previewMethod) ? (
                  <span style={paymentCtaMiniStyle()}>
                    <ExternalLink size={12} aria-hidden />
                    {t.continuePayment}
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                className="w-fit rounded-full px-5"
                style={previewButtonStyle(checkout.experience.buttonStyle)}
              >
                {isRedirectPaymentMethod(previewMethod) ? t.continuePayment : t.previewNext}
              </Button>
            </div>
          </section>

          <aside style={summarySurfaceStyle(compactSummary)}>
            <h2 style={{ margin: 0, fontSize: 12, color: '#7a6753' }}>{t.previewSummary}</h2>
            <div style={{ display: 'grid', gap: compactSummary ? 6 : 10 }}>
              <PreviewLine label={isAr ? 'منتج تجريبي' : 'Sample product'} value="QAR 180" />
              <PreviewLine label={isAr ? 'التوصيل' : 'Delivery'} value="QAR 20" />
              <PreviewLine strong label={t.previewTotal} value="QAR 200" />
            </div>
          </aside>
        </div>

        <section style={thankYouPreviewStyle(thankYouStyle)}>
          <Sparkles size={18} aria-hidden />
          <div>
            <strong style={{ display: 'block' }}>
              {checkout.thankYou.title || t.previewThanks}
            </strong>
            <span style={{ color: thankYouStyle === 'minimal' ? '#756a5e' : 'inherit' }}>
              {checkout.thankYou.message ||
                (isAr
                  ? 'ستظهر هذه الصفحة بعد تأكيد الطلب.'
                  : 'This is the style buyers see after confirming an order.')}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

function PanelSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={iconShellStyle()}>
          <Icon size={14} aria-hidden />
        </span>
        <h3 style={sectionTitleStyle()}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          textTransform: 'uppercase',
          color: 'var(--bld-text-muted)',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | null;
  fallback: string;
  onChange: (value: string | null) => void;
}) {
  const colorValue = isHexColor(value) ? value : fallback;
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '34px minmax(0, 1fr)',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <input
        type="color"
        value={colorValue}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          border: '1px solid var(--bld-input-border)',
          background: 'transparent',
          padding: 2,
          cursor: 'pointer',
        }}
      />
      <Input
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value.trim();
          onChange(next.length > 0 ? next : null);
        }}
        placeholder={`${label} · ${fallback}`}
        maxLength={9}
        className="h-9 border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] font-mono text-[11px] text-[var(--bld-input-text)] placeholder:text-[var(--bld-text-faint)]"
      />
    </label>
  );
}

function isHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function SegmentedPicker<T extends string>({
  ariaLabel,
  options,
  value,
  labels,
  onChange,
}: {
  ariaLabel: string;
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
        gap: 7,
      }}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <Button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            variant="outline"
            size="sm"
            onClick={() => onChange(option)}
            className="h-auto rounded-md border-[var(--bld-input-border)] px-3 py-2 text-xs"
            style={{
              background: active ? 'var(--bld-accent-soft)' : 'var(--bld-input-bg)',
              color: active ? 'var(--bld-text)' : 'var(--bld-text-muted)',
              borderColor: active ? 'var(--bld-accent-line)' : 'var(--bld-input-border)',
              boxShadow: active ? 'inset 0 0 0 1px var(--bld-accent-line)' : undefined,
            }}
          >
            {labels[option]}
          </Button>
        );
      })}
    </div>
  );
}

function AddressPreview({
  addressDesign,
  locale,
}: {
  addressDesign: CheckoutAddressDesign;
  locale: BuilderLocale;
}) {
  const isAr = locale === 'ar';
  if (addressDesign === 'qatar_plate') {
    return (
      <div style={plateStyle()}>
        <div style={{ gridColumn: '1 / -1', ...plateCellStyle(true) }}>
          <span>{isAr ? 'رقم المنزل' : 'House No.'}</span>
          <strong>12</strong>
        </div>
        <div style={plateCellStyle(false)}>
          <span>{isAr ? 'المنطقة' : 'Zone'}</span>
          <strong>38</strong>
        </div>
        <div style={plateCellStyle(false)}>
          <span>{isAr ? 'الشارع' : 'Street'}</span>
          <strong>856</strong>
        </div>
      </div>
    );
  }

  if (addressDesign === 'soft_card') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[isAr ? 'المنزل' : 'House', isAr ? 'المنطقة' : 'Zone', isAr ? 'الشارع' : 'Street'].map(
          (label, index) => (
            <div key={label} style={softAddressCellStyle()}>
              <span>{label}</span>
              <strong>{index === 0 ? '12' : index === 1 ? '38' : '856'}</strong>
            </div>
          ),
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {[isAr ? 'العنوان' : 'Address', isAr ? 'المدينة' : 'City'].map((label) => (
        <div key={label} style={classicLineStyle()}>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: strong ? 14 : 13,
        fontWeight: strong ? 700 : 500,
        color: strong ? '#241f18' : '#6f604f',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function previewPaymentCopy(
  method: PaymentMethod,
  checkout: CheckoutSettings,
  locale: BuilderLocale,
): { title: string; body: string } {
  const isAr = locale === 'ar';
  switch (method) {
    case 'skipcash':
      return {
        title: isAr ? 'الدفع عبر SkipCash' : 'Pay with SkipCash',
        body: isAr
          ? 'بعد تأكيد الطلب ينتقل العميل إلى SkipCash لإكمال الدفع.'
          : 'After confirming the order, the buyer continues to SkipCash.',
      };
    case 'sadad':
      return {
        title: isAr ? 'الدفع عبر SADAD' : 'Pay with SADAD',
        body: isAr
          ? 'بعد تأكيد الطلب ينتقل العميل إلى SADAD لإكمال الدفع.'
          : 'After confirming the order, the buyer continues to SADAD.',
      };
    case 'pay_link':
      return {
        title: checkout.payLink?.label ?? (isAr ? 'الدفع الإلكتروني' : 'Pay online'),
        body: isAr
          ? 'بعد تأكيد الطلب يظهر رابط متابعة الدفع للعميل.'
          : 'After confirming the order, the buyer gets the hosted payment link.',
      };
    case 'bank_transfer':
      return {
        title: isAr ? 'تحويل بنكي' : 'Bank transfer',
        body: isAr ? 'تظهر تفاصيل التحويل داخل صفحة الدفع.' : 'Bank transfer details appear inside checkout.',
      };
    case 'fawran':
      return {
        title: 'Fawran',
        body: isAr ? 'تعليمات Fawran تظهر للعميل قبل التأكيد.' : 'Fawran instructions appear before confirmation.',
      };
    case 'cod':
    default:
      return {
        title: isAr ? 'الدفع عند الاستلام' : 'Cash on delivery',
        body: isAr ? 'سيتم تأكيد المبلغ عند التسليم.' : 'Amount confirmed on delivery.',
      };
  }
}

function brandMarkStyle(): CSSProperties {
  return {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    color: 'var(--sq-checkout-button-text)',
    background:
      'linear-gradient(135deg, var(--sq-checkout-accent), color-mix(in srgb, var(--sq-checkout-accent) 58%, #d6ad57))',
    border: '1px solid color-mix(in srgb, var(--sq-checkout-accent) 42%, transparent)',
    boxShadow: '0 12px 28px color-mix(in srgb, var(--sq-checkout-accent) 22%, transparent)',
    overflow: 'hidden',
  };
}

function paymentCtaMiniStyle(): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    padding: '7px 10px',
    background: 'color-mix(in srgb, var(--sq-checkout-accent) 14%, transparent)',
    border: '1px solid color-mix(in srgb, var(--sq-checkout-accent) 26%, transparent)',
    color: 'var(--sq-checkout-accent)',
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  };
}

function panelStyle(): CSSProperties {
  return {
    display: 'grid',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    border: '1px solid var(--bld-divider)',
    background: 'color-mix(in srgb, var(--bld-input-bg) 82%, transparent)',
  };
}

function iconShellStyle(): CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 7,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--bld-accent)',
    background: 'var(--bld-accent-soft)',
    border: '1px solid var(--bld-accent-line)',
    flex: '0 0 auto',
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: 0,
    fontFamily: 'var(--font-serif)',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--bld-text)',
  };
}

function sectionBodyStyle(): CSSProperties {
  return {
    margin: '4px 0 0',
    fontSize: 12,
    lineHeight: 1.45,
    color: 'var(--bld-text-muted)',
  };
}

function errorStyle(): CSSProperties {
  return {
    margin: 0,
    color: '#E68A8A',
    fontSize: 12,
    lineHeight: 1.4,
  };
}

function previewSurfaceStyle(): CSSProperties {
  return {
    padding: 18,
    borderRadius: 14,
    border: '1px solid color-mix(in srgb, var(--sq-checkout-text) 14%, transparent)',
    background: 'color-mix(in srgb, var(--sq-checkout-surface) 88%, transparent)',
    boxShadow: '0 18px 50px rgba(77, 48, 22, 0.12)',
  };
}

function stepTabsStyle(): CSSProperties {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  };
}

function stepPillStyle(active: boolean): CSSProperties {
  return {
    padding: '7px 10px',
    borderRadius: 999,
    background: active ? 'var(--sq-checkout-accent)' : 'color-mix(in srgb, var(--sq-checkout-accent) 10%, transparent)',
    color: active ? 'var(--sq-checkout-button-text)' : 'var(--sq-checkout-accent)',
    fontWeight: 700,
  };
}

function previewBadgeStyle(custom = false): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '6px 10px',
    background: custom
      ? 'color-mix(in srgb, var(--sq-checkout-accent) 16%, transparent)'
      : 'rgba(183, 135, 45, 0.12)',
    color: custom ? 'var(--sq-checkout-accent)' : '#6b4417',
    border: custom
      ? '1px solid color-mix(in srgb, var(--sq-checkout-accent) 28%, transparent)'
      : '1px solid rgba(183, 135, 45, 0.22)',
    fontSize: 12,
    fontWeight: 700,
  };
}

function deliveryNoteStyle(): CSSProperties {
  return {
    borderRadius: 12,
    padding: 12,
    border: '1px dashed rgba(139, 58, 58, 0.28)',
    background: 'rgba(139, 58, 58, 0.06)',
    color: '#6d2932',
    fontSize: 13,
    lineHeight: 1.45,
  };
}

function previewPaymentCardStyle(
  style: CheckoutPaymentCardStyle,
  active: boolean,
): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: style === 'compact' ? 9 : 12,
    padding: style === 'compact' ? 12 : 16,
    borderRadius: style === 'compact' ? 10 : 14,
    border: active
      ? '1.5px solid color-mix(in srgb, var(--sq-checkout-accent) 68%, transparent)'
      : '1px solid color-mix(in srgb, var(--sq-checkout-text) 14%, transparent)',
    background:
      style === 'bordered'
        ? 'transparent'
        : active
          ? 'color-mix(in srgb, var(--sq-checkout-accent) 10%, transparent)'
          : 'color-mix(in srgb, var(--sq-checkout-surface) 70%, transparent)',
    color: 'var(--sq-checkout-text)',
  };
}

function previewButtonStyle(style: CheckoutButtonStyle): CSSProperties {
  const styles: Record<CheckoutButtonStyle, CSSProperties> = {
    solid: { background: 'var(--sq-checkout-text)', color: 'var(--sq-checkout-surface)', border: '1px solid var(--sq-checkout-text)' },
    maroon: { background: 'var(--sq-checkout-accent)', color: 'var(--sq-checkout-button-text)', border: '1px solid var(--sq-checkout-accent)' },
    gold: { background: '#b7872d', color: '#241f18', border: '1px solid #b7872d' },
    outline: { background: 'transparent', color: 'var(--sq-checkout-accent)', border: '1px solid var(--sq-checkout-accent)' },
  };
  return styles[style];
}

function summarySurfaceStyle(compact: boolean): CSSProperties {
  return {
    display: 'grid',
    gap: compact ? 10 : 14,
    padding: compact ? 14 : 18,
    borderRadius: compact ? 12 : 14,
    border: '1px solid color-mix(in srgb, var(--sq-checkout-text) 14%, transparent)',
    background: compact
      ? 'color-mix(in srgb, var(--sq-checkout-surface) 74%, transparent)'
      : 'color-mix(in srgb, var(--sq-checkout-surface) 90%, transparent)',
    boxShadow: compact ? 'none' : '0 18px 50px rgba(77, 48, 22, 0.10)',
  };
}

function thankYouPreviewStyle(style: CheckoutThankYouStyle): CSSProperties {
  const map: Record<CheckoutThankYouStyle, CSSProperties> = {
    warm: {
      background: 'linear-gradient(135deg, rgba(183,135,45,0.18), rgba(109,41,50,0.08))',
      border: '1px solid rgba(183,135,45,0.28)',
      color: '#4b2f18',
    },
    minimal: {
      background: 'rgba(255,255,255,0.52)',
      border: '1px solid rgba(82, 60, 34, 0.14)',
      color: '#241f18',
    },
    celebration: {
      background: 'linear-gradient(135deg, rgba(109,41,50,0.95), rgba(183,135,45,0.82))',
      border: '1px solid rgba(255,248,234,0.30)',
      color: '#fff8ea',
    },
  };
  return {
    ...map[style],
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    fontSize: 13,
    lineHeight: 1.5,
  };
}

function plateStyle(): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 4,
    padding: 8,
    borderRadius: 12,
    background: '#efe2c3',
    border: '1px solid #c8b48b',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.38)',
  };
}

function plateCellStyle(large: boolean): CSSProperties {
  return {
    display: 'grid',
    justifyItems: 'center',
    gap: 2,
    minHeight: large ? 74 : 52,
    alignContent: 'center',
    borderRadius: 8,
    background: 'linear-gradient(180deg, #0e4f9f, #06357d)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.58)',
    textShadow: '0 1px 0 rgba(0,0,0,0.28)',
    fontSize: 12,
  };
}

function softAddressCellStyle(): CSSProperties {
  return {
    display: 'grid',
    gap: 4,
    minHeight: 78,
    alignContent: 'center',
    padding: 12,
    borderRadius: 12,
    background: 'rgba(109,41,50,0.08)',
    border: '1px solid rgba(109,41,50,0.14)',
    color: '#6d2932',
  };
}

function classicLineStyle(): CSSProperties {
  return {
    minHeight: 42,
    borderRadius: 9,
    border: '1px solid rgba(82, 60, 34, 0.18)',
    background: 'rgba(255,255,255,0.62)',
    padding: '12px 13px',
    color: '#7a6753',
    fontSize: 13,
  };
}
