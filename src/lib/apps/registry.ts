import type { AppDescriptor } from './types';
import { ACTIVITY_PRICE_QAR } from './activities/types';

/**
 * Single source of truth for the plugin Souqna lists in Souqna
 * Marketplace. Keep descriptors aligned with their real installation
 * and configuration paths so an available tile is never a dead end.
 */
export const APP_REGISTRY: AppDescriptor[] = [
  {
    id: 'reviews',
    name: 'Souqna Reviews',
    vendor: 'by Souqna',
    tagline: 'Collect bilingual customer proof on your storefront',
    description:
      'Let visitors submit Arabic or English reviews from storefront review sections. Founders can publish, hide, feature, delete, and control what appears publicly.',
    category: 'sales',
    authKind: 'none',
    available: true,
    customizable: true,
    surfacesInBuilder: true,
    glyph: 'R',
    accentVar: '--color-gold-deep',
    connectCopy: {
      headline: 'Enable Souqna Reviews',
      body:
        'Add live review components in Builder, collect visitor feedback in Arabic or English, and approve what appears on the public storefront.',
      ctaLabel: 'Enable Souqna Reviews',
    },
  },
  {
    id: 'booking',
    name: 'Souqna Booking',
    nameAr: 'حجوزات سوقنا',
    vendor: 'by Souqna',
    tagline: 'Take salon & appointment bookings on your storefront',
    taglineAr: 'استقبل حجوزات المواعيد على متجرك',
    description:
      'For salons, barbers, spas, clinics and any by-appointment service. Buyers pick a service and a time slot from your storefront; each booking flows into checkout and lands on your dashboard.',
    descriptionAr:
      'لصالونات التجميل والحلاقة والعيادات وأي خدمة بموعد. يختار العميل الخدمة والوقت من متجرك، وتنتقل كل حجز إلى الدفع وتظهر في لوحتك.',
    category: 'sales',
    authKind: 'none',
    priceQar: ACTIVITY_PRICE_QAR.booking,
    activityKind: 'booking',
    available: true,
    customizable: true,
    surfacesInBuilder: true,
    glyph: '◷',
    accentVar: '--color-gold-deep',
    connectCopy: {
      headline: 'Enable Souqna Booking',
      body:
        'Add the booking panel in Builder, set your services and hours, and take appointments straight into checkout — in Arabic or English.',
      ctaLabel: 'Enable Booking',
    },
  },
  {
    id: 'matbakh',
    name: 'Matbakh',
    nameAr: 'مطبخ',
    vendor: 'by Souqna',
    tagline: 'Cafe & F&B orders with a live kitchen board',
    taglineAr: 'طلبات المقاهي والمطاعم مع شاشة مطبخ مباشرة',
    description:
      'For cafes and F&B. Buyers order from your menu and you track every ticket through the kitchen — submitted, preparing, ready, served. Orders flow into checkout.',
    descriptionAr:
      'للمقاهي والمطاعم. يطلب العملاء من قائمتك وتتابع كل طلب في المطبخ — تم الإرسال، قيد التحضير، جاهز، تم التقديم. وتنتقل الطلبات إلى الدفع.',
    category: 'sales',
    authKind: 'none',
    priceQar: ACTIVITY_PRICE_QAR.matbakh,
    activityKind: 'fnb',
    available: true,
    customizable: true,
    surfacesInBuilder: true,
    glyph: '◍',
    accentVar: '--color-gold-deep',
    connectCopy: {
      headline: 'Enable Matbakh',
      body:
        'Add the order panel in Builder, load your menu, and run every ticket through the kitchen board — bilingual, straight into checkout.',
      ctaLabel: 'Enable Matbakh',
    },
  },
  {
    id: 'tailoring',
    name: 'Souqna Tailoring',
    nameAr: 'خياطة سوقنا',
    vendor: 'by Souqna',
    tagline: 'Capture body measurements saved to each buyer',
    taglineAr: 'سجّل قياسات الجسم واحفظها لكل عميل',
    description:
      'For tailors and made-to-measure. Buyers submit height, weight and body measurements; save them to their name — in-shop only, or online so they carry over to the next visit.',
    descriptionAr:
      'للخياطين والتفصيل حسب المقاس. يُدخل العميل الطول والوزن وقياسات الجسم، فتُحفظ باسمه — داخل المتجر فقط أو أونلاين لتنتقل معه للزيارة القادمة.',
    category: 'sales',
    authKind: 'none',
    priceQar: ACTIVITY_PRICE_QAR.tailoring,
    activityKind: 'tailoring',
    available: true,
    customizable: true,
    surfacesInBuilder: true,
    glyph: '✂',
    accentVar: '--color-gold-deep',
    connectCopy: {
      headline: 'Enable Souqna Tailoring',
      body:
        'Add the measurement panel in Builder, choose which measurements to collect, and save each buyer’s profile locally or online — in Arabic or English.',
      ctaLabel: 'Enable Tailoring',
    },
  },
  {
    id: 'aramex',
    name: 'Aramex Shipping',
    nameAr: 'الشحن مع أرامكس',
    vendor: 'Aramex',
    tagline: 'Prepare domestic and GCC deliveries from your Aramex account',
    taglineAr: 'جهّز الشحنات المحلية والخليجية من حسابك في أرامكس',
    description:
      'Connect your Aramex business account, configure your pickup address, and choose separate parcel services for domestic and cross-border orders. Credentials stay encrypted and private to this storefront.',
    descriptionAr:
      'اربط حساب أرامكس التجاري، وحدد عنوان الاستلام، واختر خدمات منفصلة للشحنات المحلية والعابرة للحدود. تبقى بيانات الدخول مشفّرة وخاصة بهذا المتجر.',
    category: 'logistics',
    authKind: 'none',
    available: true,
    customizable: true,
    glyph: 'A',
    markSrc: '/apps/aramex/mark.svg',
    accentVar: '--color-gold-deep',
    docs: [
      {
        label: 'Aramex developer solutions',
        href: 'https://www.aramex.com/qa/en/developers-solution-center',
      },
    ],
    connectCopy: {
      headline: 'Set up Aramex Shipping',
      body:
        'Start the private setup, then add the credentials supplied with your Aramex business account and your pickup details.',
      ctaLabel: 'Set up Aramex',
    },
  },
];

const REGISTRY_BY_ID = new Map(APP_REGISTRY.map((a) => [a.id, a]));

export function getAppDescriptor(id: string): AppDescriptor | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function listAvailableApps(): AppDescriptor[] {
  return APP_REGISTRY.filter((a) => a.available);
}
