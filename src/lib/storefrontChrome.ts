import type { Plan } from './plans';

export const STOREFRONT_NAVBAR_VARIANTS = [
  'navbar-simple',
  'navbar-clean',
  'navbar-compact',
  'navbar-market',
  'navbar-ecommerce-2',
  'navbar-ecommerce-4',
  'navbar-ecommerce-6',
  'navbar-editorial',
  'navbar-center-logo',
  'navbar-command',
  'navbar-mega-menu',
  'navbar-floating',
  'navbar-split',
  'navbar-capsule',
  'navbar-announcement',
  'navbar-category-rail',
  'navbar-search-first',
  'navbar-luxury',
  'navbar-sidebar-hybrid',
  'navbar-max-command',
] as const;

export const STOREFRONT_FOOTER_VARIANTS = [
  'footer-minimal',
  'footer-links',
  'footer-commerce',
  'footer-newsletter',
  'footer-brand-story',
  'footer-social-proof',
  'footer-policy-grid',
  'footer-support',
  'footer-marketplace',
  'footer-luxury',
  'footer-editorial',
  'footer-max-directory',
] as const;

export const STOREFRONT_SIDEBAR_VARIANTS = [
  'sidebar-none',
  'sidebar-category-rail',
  'sidebar-filter-drawer',
  'sidebar-floating-menu',
  'sidebar-account-style',
  'sidebar-max-catalog',
] as const;

export const STOREFRONT_CART_VARIANTS = [
  'cart-floating-bag',
  'cart-inline-bag',
  'cart-bottom-bar',
  'cart-mini-drawer',
  'cart-checkout-rail',
  'cart-luxury-sheet',
  'cart-max-summary',
  'cart-command-cart',
] as const;

export type StorefrontNavbarVariant = (typeof STOREFRONT_NAVBAR_VARIANTS)[number];
export type StorefrontFooterVariant = (typeof STOREFRONT_FOOTER_VARIANTS)[number];
export type StorefrontSidebarVariant = (typeof STOREFRONT_SIDEBAR_VARIANTS)[number];
export type StorefrontCartVariant = (typeof STOREFRONT_CART_VARIANTS)[number];

export type StorefrontChromeConfig = {
  navbar?: StorefrontNavbarVariant;
  footer?: StorefrontFooterVariant;
  sidebar?: StorefrontSidebarVariant;
  cart?: StorefrontCartVariant;
  navAnnouncement?: string;
  navCtaLabel?: string;
  navCtaHref?: string;
  showSearch?: boolean;
  showPolicyLinks?: boolean;
  footerHeadline?: string;
  footerText?: string;
  footerShowNewsletter?: boolean;
  sidebarLabel?: string;
  cartLabel?: string;
  cartCheckoutLabel?: string;
  cartEmptyTitle?: string;
  cartEmptyText?: string;
};

export type StorefrontChromeOption<T extends string> = {
  id: T;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  tier: Plan;
};

export const NAVBAR_OPTIONS: StorefrontChromeOption<StorefrontNavbarVariant>[] = [
  option('navbar-simple', 'Simple pages', 'تنقل بسيط', 'Free, quiet store links for small catalogues.', 'روابط متجر هادئة للكتالوجات الصغيرة.', 'free'),
  option('navbar-clean', 'Clean commerce', 'تجاري نظيف', 'Free logo, product page, and cart route.', 'شعار وروابط منتجات وسلة بسيطة.', 'free'),
  option('navbar-compact', 'Compact header', 'رأس مختصر', 'Free compact header for mobile-first stores.', 'رأس متجر مختصر مناسب للجوال.', 'free'),
  option('navbar-market', 'Market strip', 'شريط سوق', 'Free dense navigation for quick buying.', 'تنقل كثيف للشراء السريع.', 'free'),
  option('navbar-ecommerce-2', 'Commerce navbar 2', 'تجاري ٢', 'Pro commerce navbar with product routes, cart, and system pages.', '\u0634\u0631\u064a\u0637 \u062a\u062c\u0627\u0631\u064a \u0628\u0631\u0648\u0627\u0628\u0637 \u0645\u0646\u062a\u062c\u0627\u062a \u0648\u0633\u0644\u0629 \u0648\u0635\u0641\u062d\u0627\u062a \u0646\u0638\u0627\u0645.', 'starter'),
  option('navbar-ecommerce-4', 'Commerce navbar 4', 'تجاري ٤', 'Pro catalogue links with stronger product focus.', 'روابط كتالوج بتركيز أوضح على المنتجات.', 'starter'),
  option('navbar-ecommerce-6', 'Commerce navbar 6', 'تجاري ٦', 'Pro balanced desktop and mobile commerce chrome.', 'تنقل تجاري متوازن للديسكتوب والجوال.', 'starter'),
  option('navbar-editorial', 'Editorial navbar', 'تحريري', 'Pro brand-led navigation for premium pages.', 'تنقل يقود بالعلامة للصفحات الفاخرة.', 'starter'),
  option('navbar-center-logo', 'Centered logo', 'شعار في الوسط', 'Pro centered identity with balanced links.', 'هوية في الوسط مع روابط متوازنة.', 'starter'),
  option('navbar-command', 'Command search', 'بحث سريع', 'Pro+ search-forward navigation for larger stores.', 'تنقل يركز على البحث للمتاجر الأكبر.', 'pro'),
  option('navbar-mega-menu', 'Mega menu', 'قائمة ضخمة', 'Pro+ category-heavy navigation shell.', 'تنقل مناسب للفئات الكثيرة.', 'pro'),
  option('navbar-floating', 'Floating capsule', 'كبسولة عائمة', 'Pro+ floating header for premium landing pages.', 'رأس عائم للصفحات الفاخرة.', 'pro'),
  option('navbar-split', 'Split actions', 'إجراءات مقسومة', 'Pro+ splits shopping links from service CTAs.', 'يفصل روابط التسوق عن إجراءات الخدمة.', 'pro'),
  option('navbar-capsule', 'Capsule nav', 'تنقل كبسولة', 'Pro+ rounded capsule chrome for refined brands.', 'تنقل دائري للعلامات الراقية.', 'pro'),
  option('navbar-announcement', 'Announcement nav', 'تنقل إعلان', 'Pro+ includes promo strip and store routes.', 'يتضمن شريط عرض وروابط المتجر.', 'pro'),
  option('navbar-category-rail', 'Category rail', 'مسار فئات', 'Max+ category rail for broad catalogues.', 'مسار فئات للكتالوجات الكبيرة.', 'atelier'),
  option('navbar-search-first', 'Search first', 'البحث أولاً', 'Max+ search-first layout for product depth.', 'واجهة تضع البحث أولاً للمنتجات الكثيرة.', 'atelier'),
  option('navbar-luxury', 'Luxury header', 'رأس فاخر', 'Max+ high-contrast premium navigation.', 'تنقل فاخر بتباين أعلى.', 'atelier'),
  option('navbar-sidebar-hybrid', 'Sidebar hybrid', 'تنقل جانبي', 'Max+ desktop sidebar plus mobile header pattern.', 'شريط جانبي للديسكتوب ورأس للجوال.', 'atelier'),
  option('navbar-max-command', 'Max command', 'أوامر ماكس', 'Max+ command-center shopping navigation.', 'تنقل تسوق بأسلوب مركز أوامر.', 'atelier'),
];

export const FOOTER_OPTIONS: StorefrontChromeOption<StorefrontFooterVariant>[] = [
  option('footer-minimal', 'Minimal footer', 'تذييل بسيط', 'Simple policies and attribution.', 'سياسات وتوقيع بسيط.', 'free'),
  option('footer-links', 'Link columns', 'أعمدة روابط', 'Structured page and policy links.', 'روابط صفحات وسياسات منظمة.', 'free'),
  option('footer-commerce', 'Commerce footer', 'تذييل تجاري', 'Pro contact, policies, products, and WhatsApp support.', 'تواصل وسياسات ومنتجات وواتساب.', 'starter'),
  option('footer-newsletter', 'Newsletter footer', 'تذييل نشرة', 'Pro footer with campaign-ready signup area.', 'تذييل مع منطقة تسجيل للحملات.', 'starter'),
  option('footer-brand-story', 'Brand story', 'قصة العلامة', 'Pro richer brand story and store promise.', 'قصة علامة ووعد متجر أوضح.', 'starter'),
  option('footer-social-proof', 'Social proof', 'إثبات اجتماعي', 'Pro footer with trust notes and social routes.', 'تذييل مع نقاط ثقة وروابط اجتماعية.', 'starter'),
  option('footer-policy-grid', 'Policy grid', 'شبكة سياسات', 'Pro+ policy-forward footer for serious merchants.', 'تذييل يبرز السياسات للمتاجر الجادة.', 'pro'),
  option('footer-support', 'Support footer', 'تذييل دعم', 'Pro+ support and service-focused footer.', 'تذييل يركز على الدعم والخدمة.', 'pro'),
  option('footer-marketplace', 'Marketplace footer', 'تذييل سوق', 'Pro+ dense footer for larger catalogues.', 'تذييل كثيف للكتالوجات الكبيرة.', 'pro'),
  option('footer-luxury', 'Luxury footer', 'تذييل فاخر', 'Max+ premium closing section with strong brand depth.', 'قسم ختامي فاخر بعمق أكبر للعلامة.', 'atelier'),
  option('footer-editorial', 'Editorial footer', 'تذييل تحريري', 'Max+ story-led footer for signature templates.', 'تذييل يقود بالقصة للقوالب المميزة.', 'atelier'),
  option('footer-max-directory', 'Max directory', 'دليل ماكس', 'Max+ directory footer for multi-page stores.', 'تذييل دليل للمتاجر متعددة الصفحات.', 'atelier'),
];

export const SIDEBAR_OPTIONS: StorefrontChromeOption<StorefrontSidebarVariant>[] = [
  option('sidebar-none', 'No sidebar', 'بدون شريط جانبي', 'Keep storefront navigation header-only.', 'يبقى التنقل من الرأس فقط.', 'free'),
  option('sidebar-category-rail', 'Category rail', 'مسار فئات', 'Pro+ sticky category rail for product browsing.', 'مسار فئات ثابت لتصفح المنتجات.', 'pro'),
  option('sidebar-filter-drawer', 'Filter drawer', 'درج فلاتر', 'Pro+ off-canvas filters for product pages.', 'فلاتر جانبية لصفحات المنتجات.', 'pro'),
  option('sidebar-floating-menu', 'Floating menu', 'قائمة عائمة', 'Max+ floating store menu for premium templates.', 'قائمة متجر عائمة للقوالب الفاخرة.', 'atelier'),
  option('sidebar-account-style', 'Account style', 'أسلوب حساب', 'Max+ dashboard-like storefront navigation.', 'تنقل متجر بأسلوب لوحة تحكم.', 'atelier'),
  option('sidebar-max-catalog', 'Max catalogue rail', 'مسار كتالوج ماكس', 'Max+ deep catalogue rail for large stores.', 'مسار كتالوج عميق للمتاجر الكبيرة.', 'atelier'),
];

export const CART_OPTIONS: StorefrontChromeOption<StorefrontCartVariant>[] = [
  option('cart-floating-bag', 'Floating bag', 'حقيبة عائمة', 'Free floating cart icon.', 'أيقونة سلة عائمة.', 'free'),
  option('cart-inline-bag', 'Inline bag', 'حقيبة داخلية', 'Free cart action inside the navbar.', 'زر سلة داخل شريط التنقل.', 'free'),
  option('cart-bottom-bar', 'Mobile bottom bar', 'شريط سفلي', 'Pro mobile-first cart bar.', 'شريط سلة للجوال.', 'starter'),
  option('cart-mini-drawer', 'Mini drawer', 'درج مختصر', 'Pro compact cart drawer for fast checkout.', 'درج سلة مختصر للدفع السريع.', 'starter'),
  option('cart-checkout-rail', 'Checkout rail', 'مسار دفع', 'Pro+ order-summary inspired cart rail.', 'سلة مستوحاة من ملخص الطلب.', 'pro'),
  option('cart-luxury-sheet', 'Luxury sheet', 'لوحة فاخرة', 'Pro+ richer sheet with stronger visual hierarchy.', 'لوحة أغنى بتسلسل بصري أقوى.', 'pro'),
  option('cart-max-summary', 'Max summary', 'ملخص ماكس', 'Max+ high-density cart summary for larger baskets.', 'ملخص سلة كثيف للسلات الكبيرة.', 'atelier'),
  option('cart-command-cart', 'Command cart', 'سلة أوامر', 'Max+ command-style cart for power shoppers.', 'سلة بأسلوب الأوامر للمتسوقين المحترفين.', 'atelier'),
];

export const DEFAULT_STOREFRONT_CHROME: Required<StorefrontChromeConfig> = {
  navbar: 'navbar-clean',
  footer: 'footer-minimal',
  sidebar: 'sidebar-none',
  cart: 'cart-floating-bag',
  navAnnouncement: '',
  navCtaLabel: '',
  navCtaHref: '',
  showSearch: true,
  showPolicyLinks: true,
  footerHeadline: '',
  footerText: '',
  footerShowNewsletter: false,
  sidebarLabel: '',
  cartLabel: '',
  cartCheckoutLabel: '',
  cartEmptyTitle: '',
  cartEmptyText: '',
};

export function normalizeStorefrontChromeConfig(
  value: StorefrontChromeConfig | null | undefined,
): Required<StorefrontChromeConfig> {
  return {
    navbar: isNavbarVariant(value?.navbar) ? value.navbar : DEFAULT_STOREFRONT_CHROME.navbar,
    footer: isFooterVariant(value?.footer) ? value.footer : DEFAULT_STOREFRONT_CHROME.footer,
    sidebar: isSidebarVariant(value?.sidebar) ? value.sidebar : DEFAULT_STOREFRONT_CHROME.sidebar,
    cart: isCartVariant(value?.cart) ? value.cart : DEFAULT_STOREFRONT_CHROME.cart,
    navAnnouncement: cleanChromeText(value?.navAnnouncement, 120),
    navCtaLabel: cleanChromeText(value?.navCtaLabel, 48),
    navCtaHref: cleanChromeText(value?.navCtaHref, 240),
    showSearch: value?.showSearch ?? DEFAULT_STOREFRONT_CHROME.showSearch,
    showPolicyLinks: value?.showPolicyLinks ?? DEFAULT_STOREFRONT_CHROME.showPolicyLinks,
    footerHeadline: cleanChromeText(value?.footerHeadline, 100),
    footerText: cleanChromeText(value?.footerText, 260),
    footerShowNewsletter: value?.footerShowNewsletter ?? DEFAULT_STOREFRONT_CHROME.footerShowNewsletter,
    sidebarLabel: cleanChromeText(value?.sidebarLabel, 80),
    cartLabel: cleanChromeText(value?.cartLabel, 40),
    cartCheckoutLabel: cleanChromeText(value?.cartCheckoutLabel, 60),
    cartEmptyTitle: cleanChromeText(value?.cartEmptyTitle, 80),
    cartEmptyText: cleanChromeText(value?.cartEmptyText, 180),
  };
}

export function optionMinPlan(id: string): Plan {
  const option =
    NAVBAR_OPTIONS.find((item) => item.id === id) ??
    FOOTER_OPTIONS.find((item) => item.id === id) ??
    SIDEBAR_OPTIONS.find((item) => item.id === id) ??
    CART_OPTIONS.find((item) => item.id === id);
  return option?.tier ?? 'free';
}

function isNavbarVariant(value: unknown): value is StorefrontNavbarVariant {
  return typeof value === 'string' && (STOREFRONT_NAVBAR_VARIANTS as readonly string[]).includes(value);
}

function isFooterVariant(value: unknown): value is StorefrontFooterVariant {
  return typeof value === 'string' && (STOREFRONT_FOOTER_VARIANTS as readonly string[]).includes(value);
}

function isSidebarVariant(value: unknown): value is StorefrontSidebarVariant {
  return typeof value === 'string' && (STOREFRONT_SIDEBAR_VARIANTS as readonly string[]).includes(value);
}

function isCartVariant(value: unknown): value is StorefrontCartVariant {
  return typeof value === 'string' && (STOREFRONT_CART_VARIANTS as readonly string[]).includes(value);
}

function cleanChromeText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function option<T extends string>(
  id: T,
  label: string,
  labelAr: string,
  description: string,
  descriptionAr: string,
  tier: Plan,
): StorefrontChromeOption<T> {
  return { id, label, labelAr, description, descriptionAr, tier };
}
