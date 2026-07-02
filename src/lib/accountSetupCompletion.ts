import 'server-only';
import type { Storefront } from './brief';
import { getAllProducts, type Product } from './products';
import { listInstalledApps } from './apps/installed';
import type { CheckoutSettings, PaymentMethod } from './storefrontSettings';

export type AccountSetupTaskId =
  | 'logo'
  | 'seo'
  | 'checkout'
  | 'products'
  | 'install-app'
  | 'publish';

export type AccountSetupTask = {
  id: AccountSetupTaskId;
  title: string;
  arTitle: string;
  body: string;
  arBody: string;
  href: string;
  done: boolean;
};

type Input = {
  storefront: Pick<Storefront, 'slug' | 'isPublished' | 'logoUrl' | 'tagline' | 'checkout'>;
  products?: readonly Pick<
    Product,
    | 'title'
    | 'subtitle'
    | 'description'
    | 'priceQar'
    | 'imageUrl'
    | 'category'
    | 'handle'
    | 'seoTitle'
    | 'seoDescription'
    | 'status'
  >[];
  productsCount: number;
  installedAppIds?: readonly string[];
};

/**
 * Single source of truth for the dashboard checklist and for the
 * hosted-pay-link gate. Card-like checkout only unlocks once every
 * visible `/account` setup row is complete, so founders cannot accept
 * online payments on a half-configured storefront.
 */
export function evaluateSetupCompletion(input: Input): {
  tasks: AccountSetupTask[];
  pct: number;
  completeForPayLink: boolean;
} {
  const slug = input.storefront.slug;
  const products = input.products ?? [];
  const productsReady =
    products.length > 0
      ? products.some(
          (product) =>
            product.status === 'active' &&
            Boolean(product.imageUrl) &&
            product.priceQar !== null &&
            hasText(product.category),
        )
      : input.productsCount > 0;
  const seoReady =
    hasText(input.storefront.tagline) &&
    products.some(
      (product) =>
        hasText(product.handle) &&
        (hasText(product.seoTitle) || hasText(product.title)) &&
        (hasText(product.seoDescription) ||
          hasText(product.description) ||
          hasText(product.subtitle)),
    );
  const checkoutReady = isCheckoutReady(input.storefront.checkout);
  const hasInstalledApp = (input.installedAppIds?.length ?? 0) > 0;
  const tasks: AccountSetupTask[] = [
    {
      id: 'logo',
      title: 'Upload logo',
      arTitle: 'ارفع الشعار',
      body: 'Adds a professional touch to the storefront and order emails.',
      arBody: 'يعطي المتجر وإيميلات الطلبات لمسة احترافية.',
      href: `/account/settings/brand?store=${slug}`,
      done: Boolean(input.storefront.logoUrl),
    },
    {
      id: 'seo',
      title: 'SEO basics',
      arTitle: 'أساسيات SEO',
      body: 'Use a tagline, product handle, and searchable product description.',
      arBody: 'أضف شعاراً نصياً ورابط منتج ووصفاً قابلاً للبحث.',
      href: `/account/products?store=${slug}`,
      done: seoReady,
    },
    {
      id: 'checkout',
      title: 'Edit checkout',
      arTitle: 'عدّل الدفع',
      body: 'Keep at least one selected payment method usable for buyers.',
      arBody: 'اجعل طريقة دفع واحدة على الأقل جاهزة للمشترين.',
      href: `/account/settings/checkout?store=${slug}`,
      done: checkoutReady,
    },
    {
      id: 'products',
      title: 'Add a sellable product',
      arTitle: 'أضف منتجاً جاهزاً للبيع',
      body: 'Needs an active product with image, price, and category.',
      arBody: 'يحتاج منتجاً مفعلاً مع صورة وسعر وتصنيف.',
      href: `/account/products?store=${slug}`,
      done: productsReady,
    },
    {
      id: 'install-app',
      title: 'Install an app',
      arTitle: 'ثبّت تطبيقاً',
      body: 'Connect one storefront app, like Souqna Reviews.',
      arBody: 'اربط تطبيقاً واحداً للمتجر، مثل Souqna Reviews.',
      href: `/account/apps?store=${slug}`,
      done: hasInstalledApp,
    },
    {
      id: 'publish',
      title: 'Publish storefront',
      arTitle: 'انشر المتجر',
      body: 'Make the public page reachable from the storefront URL.',
      arBody: 'اجعل الصفحة العامة متاحة من رابط المتجر.',
      href: `/account/builder?store=${slug}`,
      done: input.storefront.isPublished,
    },
  ];
  const done = tasks.filter((t) => t.done).length;
  return {
    tasks,
    pct: Math.round((done / tasks.length) * 100),
    completeForPayLink: done === tasks.length,
  };
}

export async function evaluateSetupCompletionForStorefront(
  storefront: Storefront,
): Promise<ReturnType<typeof evaluateSetupCompletion>> {
  const [products, installedApps] = await Promise.all([
    getAllProducts(storefront.slug).catch(() => []),
    listInstalledApps(storefront.slug).catch(() => []),
  ]);
  return evaluateSetupCompletion({
    storefront,
    products,
    productsCount: products.length,
    installedAppIds: installedApps.map((app) => app.appId),
  });
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCheckoutReady(checkout: CheckoutSettings): boolean {
  if (
    !checkout.enabled ||
    checkout.paymentMethods.length === 0 ||
    checkout.requiredPolicies.length === 0
  ) {
    return false;
  }
  return checkout.paymentMethods.some((method) => isPaymentMethodReady(method, checkout));
}

function isPaymentMethodReady(method: PaymentMethod, checkout: CheckoutSettings): boolean {
  if (method === 'cod' || method === 'fawran') return true;
  if (method === 'bank_transfer') {
    return Boolean(
      checkout.bankDetails &&
        hasText(checkout.bankDetails.accountName) &&
        hasText(checkout.bankDetails.iban) &&
        hasText(checkout.bankDetails.bankName),
    );
  }
  if (method === 'pay_link') {
    return Boolean(
      checkout.payLink && hasText(checkout.payLink.url) && hasText(checkout.payLink.label),
    );
  }
  if (method === 'skipcash') {
    return Boolean(checkout.skipCash?.enabled && checkout.skipCash.hasCredentials);
  }
  if (method === 'sadad') {
    return Boolean(checkout.sadad?.enabled && checkout.sadad.hasCredentials);
  }
  return false;
}
