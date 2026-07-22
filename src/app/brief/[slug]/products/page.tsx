import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStorefront, type Storefront as StorefrontData } from '@/lib/brief';
import { getCategories, getStorefrontCategoryProductMap } from '@/lib/categories';
import { getPublicProducts } from '@/lib/products';
import { listInstalledApps } from '@/lib/apps/installed';
import { normaliseSettings as normaliseWhatsApp, whatsappDigits } from '@/lib/apps/whatsapp';
import { getPlan, planUnlocksBrandingRemoval } from '@/lib/billing';
import {
  getStorefrontPolicies,
  POLICY_KEYS,
  type PolicyKey,
  type StorefrontPolicies,
} from '@/lib/storefrontSettings';
import { resolvePolicyBody } from '@/lib/storefrontPolicies';
import { listPages, type StorefrontPage } from '@/lib/storefrontPages';
import { getServerTheme } from '@/components/theme/ServerThemeScript';
import { TrackPageView } from '@/components/storefront/TrackPageView';
import { Storefront } from '@/components/storefront/Storefront';
import type {
  ChromeLegalPolicy,
  ChromeNavPage,
} from '@/components/storefront/StorefrontChrome';
import { AllProductsPage } from '@/components/storefront/AllProductsPage';
import {
  buildProductIndexCategories,
  buildProductIndexProducts,
} from '@/lib/productIndexCatalog';
import { storefrontBaseUrl } from '@/lib/storefrontUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

function deriveNavPages(pages: StorefrontPage[]): ChromeNavPage[] {
  return pages
    .filter((p) => p.showInNav && !p.isHome && p.status === 'published')
    .map((p) => ({ slug: p.slug, title: p.title }));
}

function localizedPolicyTitle(key: PolicyKey, locale: StorefrontData['locale']) {
  const en: Record<PolicyKey, string> = {
    terms: 'Terms',
    privacy: 'Privacy',
    refund: 'Refunds',
    shipping: 'Shipping',
  };
  const ar: Record<PolicyKey, string> = {
    terms: 'الشروط',
    privacy: 'الخصوصية',
    refund: 'الاسترجاع',
    shipping: 'الشحن',
  };
  return locale === 'ar' ? ar[key] : en[key];
}

function deriveLegalPolicies(
  policies: StorefrontPolicies,
  locale: StorefrontData['locale'],
  businessName: string,
): ChromeLegalPolicy[] {
  return POLICY_KEYS.filter((key) => {
    const body = resolvePolicyBody({ policies, key, locale, businessName });
    return typeof body === 'string' && body.trim().length > 0;
  }).map((key) => ({ key, title: localizedPolicyTitle(key, locale) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await getStorefront(slug).catch(() => null);
  if (!storefront) return { title: 'Products · Souqna', robots: { index: false, follow: false } };
  return {
    title: `${storefront.productIndex.title ?? 'Products'} · ${storefront.businessName}`,
    description:
      storefront.productIndex.subtitle ?? storefront.tagline ?? storefront.businessName,
    robots: { index: false, follow: false },
  };
}

export default async function ProductsPage({ params }: Props) {
  const { slug } = await params;
  const storefront = await getStorefront(slug).catch(() => null);
  if (!storefront || !storefront.isPublished) notFound();
  if (!storefront.productIndex.enabled) notFound();

  const [
    products,
    categories,
    categoriesBySlug,
    visitorTheme,
    installed,
    allPages,
    policies,
    ownerPlan,
  ] = await Promise.all([
    getPublicProducts(slug),
    getCategories(slug).catch(() => []),
    getStorefrontCategoryProductMap(slug).catch(() => new Map<string, Set<string>>()),
    getServerTheme(),
    listInstalledApps(slug).catch(() => []),
    listPages(slug).catch(() => [] as StorefrontPage[]),
    getStorefrontPolicies(slug),
    getPlan(storefront.clerkUserId),
  ]);

  const installedAppIds = installed.filter((app) => app.enabled).map((app) => app.appId);
  const whatsapp = installed.find(
    (app) => app.enabled && app.appId === 'whatsapp-business',
  );
  const whatsappSettings = whatsapp ? normaliseWhatsApp(whatsapp.settings) : null;
  const whatsappPhone =
    whatsappSettings?.storefrontInquiryMode === 'whatsapp' ? whatsappDigits(whatsapp) : null;
  const storefrontData = whatsappPhone ? { ...storefront, phone: whatsappPhone } : storefront;
  const productIndexProducts = buildProductIndexProducts({
    products,
    categories,
    categoriesBySlug,
  });
  const productIndexCategories = buildProductIndexCategories({
    products,
    categories,
    categoriesBySlug,
  });

  return (
    <>
      <TrackPageView storefrontSlug={slug} />
      <Storefront
        data={storefrontData}
        products={products}
        visitorTheme={visitorTheme}
        installedApps={installedAppIds}
        categoriesBySlug={categoriesBySlug}
        navPages={deriveNavPages(allPages)}
        legalPolicies={deriveLegalPolicies(policies, storefront.locale, storefront.businessName)}
        overrideMain={
          <AllProductsPage
            storefrontBaseHref={storefrontBaseUrl(slug)}
            businessName={storefront.businessName}
            logoUrl={storefront.logoUrl}
            locale={storefront.locale}
            currency={storefront.checkout.currency}
            settings={storefront.productIndex}
            products={productIndexProducts}
            categories={productIndexCategories}
          />
        }
        showSouqnaSignature={!planUnlocksBrandingRemoval(ownerPlan)}
      />
    </>
  );
}
