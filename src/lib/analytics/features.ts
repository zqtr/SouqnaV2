import type { Plan } from '@/lib/plans';

export type AnalyticsAccessLevel = 'basic' | 'advanced';
export type AnalyticsModuleTier = 'basic' | 'advanced' | 'enterprise';

export type AnalyticsFeatureModule = {
  id: string;
  tier: AnalyticsModuleTier;
  title: string;
  titleAr: string;
  summary: string;
  summaryAr: string;
  metrics: string[];
};

export const BASIC_ANALYTICS_MODULES = [
  {
    id: 'sales-performance',
    tier: 'basic',
    title: 'Sales performance',
    titleAr: 'أداء المبيعات',
    summary: 'Revenue, orders, average order value, paid and pending order health.',
    summaryAr: 'الإيرادات والطلبات ومتوسط الطلب وصحة الطلبات المدفوعة والمعلقة.',
    metrics: ['total-revenue', 'orders-count', 'average-order-value', 'order-status'],
  },
  {
    id: 'product-performance',
    tier: 'basic',
    title: 'Product performance',
    titleAr: 'أداء المنتجات',
    summary: 'Top sellers, product views, add-to-cart activity, purchases per product, and basic product conversion.',
    summaryAr: 'الأكثر مبيعاً ومشاهدات المنتجات والإضافة للسلة ومشتريات كل منتج والتحويل الأساسي.',
    metrics: ['top-selling-products', 'product-views', 'cart-adds', 'product-conversion'],
  },
  {
    id: 'visitor-sources',
    tier: 'basic',
    title: 'Visitors and sources',
    titleAr: 'الزوار والمصادر',
    summary: 'Total visitors, unique visitors, returning visitors, devices, browsers, and traffic sources.',
    summaryAr: 'إجمالي الزوار والزوار الفريدون والعائدون والأجهزة والمتصفحات ومصادر الزيارات.',
    metrics: ['total-visitors', 'unique-visitors', 'new-vs-returning', 'devices', 'browsers', 'traffic-sources'],
  },
  {
    id: 'search-realtime',
    tier: 'basic',
    title: 'Search and live activity',
    titleAr: 'البحث والنشاط المباشر',
    summary: 'Search terms, searches with no results, live visitors, active carts, and recent order feed.',
    summaryAr: 'كلمات البحث والبحث بدون نتائج والزوار المباشرون والسلال النشطة وأحدث الطلبات.',
    metrics: ['search-keywords', 'no-result-searches', 'live-visitors', 'active-carts', 'realtime-order-feed'],
  },
] as const satisfies readonly AnalyticsFeatureModule[];

export const ADVANCED_ANALYTICS_MODULES = [
  {
    id: 'conversion-funnel',
    tier: 'advanced',
    title: 'Conversion funnel',
    titleAr: 'مسار التحويل',
    summary: 'Full funnel analytics, drop-off tracking, checkout steps, and payment abandonment.',
    summaryAr: 'تحليل كامل لمسار التحويل والتسرب وخطوات الدفع والتخلي عند الدفع.',
    metrics: ['full-funnel', 'drop-off', 'checkout-steps', 'payment-abandonment'],
  },
  {
    id: 'customer-intelligence',
    tier: 'advanced',
    title: 'Customer intelligence',
    titleAr: 'ذكاء العملاء',
    summary: 'Customer lifetime value, repeat purchase rate, retention, segmentation, and cohorts.',
    summaryAr: 'قيمة عمر العميل وتكرار الشراء والاحتفاظ والتقسيم والتحليل حسب الدفعات.',
    metrics: ['clv', 'revenue-per-customer', 'retention', 'repeat-rate', 'segments', 'cohorts'],
  },
  {
    id: 'behavior-tracking',
    tier: 'advanced',
    title: 'Behavior tracking',
    titleAr: 'تتبع السلوك',
    summary: 'Clicks, scroll depth, banners, exit pages, heatmaps, rage clicks, dead clicks, and recordings.',
    summaryAr: 'النقرات وعمق التمرير والبنرات وصفحات الخروج والخرائط الحرارية والنقرات الغاضبة والميتة والتسجيلات.',
    metrics: ['clicks', 'scroll-depth', 'banners', 'exit-pages', 'heatmaps', 'rage-clicks', 'dead-clicks', 'recordings'],
  },
  {
    id: 'marketing-attribution',
    tier: 'advanced',
    title: 'Marketing attribution',
    titleAr: 'نسب التسويق',
    summary: 'Campaign tracking, ROAS, influencer code performance, and source quality.',
    summaryAr: 'تتبع الحملات والعائد الإعلاني وأداء أكواد المؤثرين وجودة المصادر.',
    metrics: ['campaigns', 'roas', 'influencer-codes', 'source-quality'],
  },
  {
    id: 'inventory-intelligence',
    tier: 'advanced',
    title: 'Inventory intelligence',
    titleAr: 'ذكاء المخزون',
    summary: 'Inventory turnover, low stock alerts, stock depletion prediction, and overstock detection.',
    summaryAr: 'دوران المخزون والتنبيه للمخزون المنخفض وتوقع نفاد المخزون واكتشاف التكدس.',
    metrics: ['inventory-turnover', 'low-stock', 'depletion-prediction', 'overstock'],
  },
  {
    id: 'ai-forecasting',
    tier: 'enterprise',
    title: 'AI forecasting',
    titleAr: 'توقعات الذكاء الاصطناعي',
    summary: 'Revenue forecasts, sales forecasts, churn prediction, LTV prediction, inventory forecasting, and Store Health Score.',
    summaryAr: 'توقعات الإيرادات والمبيعات واحتمال خسارة العملاء وقيمة العمر والمخزون ودرجة صحة المتجر.',
    metrics: ['revenue-forecast', 'sales-forecast', 'churn-prediction', 'ltv-prediction', 'inventory-forecast', 'store-health-score'],
  },
] as const satisfies readonly AnalyticsFeatureModule[];

export const ANALYTICS_FEATURE_MODULES = [
  ...BASIC_ANALYTICS_MODULES,
  ...ADVANCED_ANALYTICS_MODULES,
] as const satisfies readonly AnalyticsFeatureModule[];

export const ANALYTICS_PLAN_FEATURES: Record<
  Plan,
  {
    accessLevel: AnalyticsAccessLevel;
    historyDays: number;
    canExport: boolean;
    enterpriseDepth: boolean;
    moduleIds: string[];
  }
> = {
  free: {
    accessLevel: 'basic',
    historyDays: 30,
    canExport: false,
    enterpriseDepth: false,
    moduleIds: BASIC_ANALYTICS_MODULES.map((module) => module.id),
  },
  starter: {
    accessLevel: 'basic',
    historyDays: 365,
    canExport: true,
    enterpriseDepth: false,
    moduleIds: BASIC_ANALYTICS_MODULES.map((module) => module.id),
  },
  pro: {
    accessLevel: 'advanced',
    historyDays: 730,
    canExport: true,
    enterpriseDepth: false,
    moduleIds: ANALYTICS_FEATURE_MODULES.filter((module) => module.tier !== 'enterprise').map(
      (module) => module.id,
    ),
  },
  atelier: {
    accessLevel: 'advanced',
    historyDays: Number.POSITIVE_INFINITY,
    canExport: true,
    enterpriseDepth: true,
    moduleIds: ANALYTICS_FEATURE_MODULES.map((module) => module.id),
  },
};

export function analyticsModuleTitle(module: AnalyticsFeatureModule, locale?: string): string {
  return locale === 'ar' ? module.titleAr : module.title;
}

export function analyticsModuleSummary(module: AnalyticsFeatureModule, locale?: string): string {
  return locale === 'ar' ? module.summaryAr : module.summary;
}
