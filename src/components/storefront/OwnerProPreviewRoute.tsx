import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { DashboardDocument } from '@/components/dashboard/DashboardDocument';
import { getCategories, getStorefrontCategoryProductMap } from '@/lib/categories';
import { requireStorefrontOwner } from '@/lib/dashboard-auth';
import { buildProductIndexCategories, buildProductIndexProducts } from '@/lib/productIndexCatalog';
import { getProAccess } from '@/lib/pro/entitlement';
import { getProWorkspace } from '@/lib/proState';
import { getAllProducts, getProduct } from '@/lib/products';
import { resolvePolicyBody } from '@/lib/storefrontPolicies';
import {
  getStorefrontPolicies,
  POLICY_KEYS,
  type PolicyKey,
  type StorefrontPolicies,
} from '@/lib/storefrontSettings';
import { listPages, type StorefrontPage } from '@/lib/storefrontPages';
import type { ChromeLegalPolicy, ChromeNavPage } from './StorefrontChrome';
import { AllProductsPage } from './AllProductsPage';
import { ProductDetailPage } from './ProductDetailPage';
import { Storefront } from './Storefront';

type RouteKind =
  | { kind: 'home' }
  | { kind: 'products' }
  | { kind: 'product'; productId: string }
  | { kind: 'checkout' }
  | { kind: 'legal'; key: PolicyKey }
  | { kind: 'page'; slug: string }
  | { kind: 'not-found' };

const LEGAL_KEYS = new Set<string>(POLICY_KEYS as readonly string[]);

export async function OwnerProPreviewRoute({
  slug,
  path = [],
}: {
  slug: string;
  path?: string[];
}): Promise<JSX.Element> {
  const baseHref = `/account/${encodeURIComponent(slug)}/pro-preview`;
  const returnTo =
    path.length > 0 ? `${baseHref}/${path.map(encodeURIComponent).join('/')}` : baseHref;
  const owner = await requireStorefrontOwner(slug, returnTo);
  if (!owner.ok) return <DashboardDocument>{owner.panel}</DashboardDocument>;

  const access = await getProAccess(owner.userId);
  // Downgrades lock Pro mutations, but owners keep read-only access to the
  // workspace and its last successful private preview.
  if (!access.enabled) notFound();

  const [workspace, products, categories, categoriesBySlug, allPages, policies] = await Promise.all(
    [
      getProWorkspace(slug),
      getAllProducts(slug),
      getCategories(slug).catch(() => []),
      getStorefrontCategoryProductMap(slug).catch(() => new Map<string, Set<string>>()),
      listPages(slug).catch(() => [] as StorefrontPage[]),
      getStorefrontPolicies(slug),
    ],
  );

  if (!workspace?.builtRevision || !workspace.builtBlobUrl || !workspace.builtSource) {
    return (
      <DashboardDocument bare lang={owner.storefront.locale} theme="light">
        <PreviewState
          locale={owner.storefront.locale}
          titleEn="Preview not built yet"
          titleAr="لم تُبنَ المعاينة بعد"
          bodyEn="Return to Pro Builder and build the current source to create a private preview."
          bodyAr="ارجع إلى منشئ برو وابنِ المصدر الحالي لإنشاء معاينة خاصة."
        />
      </DashboardDocument>
    );
  }

  const data = {
    ...owner.storefront,
    souqyRevision: workspace.builtRevision,
    souqyBlobUrl: workspace.builtBlobUrl,
    souqySource: workspace.builtSource,
  };
  const navPages = deriveNavPages(allPages);
  const legalPolicies = deriveLegalPolicies(policies, data.locale, data.businessName);
  const surface = { kind: 'owner-pro-preview' as const, baseHref };
  const route = deriveRoute(path);

  const common = {
    data,
    products,
    visitorTheme: 'light' as const,
    categoriesBySlug,
    navPages,
    legalPolicies,
    surface,
    showSouqnaSignature: false,
  };

  if (route.kind === 'home') {
    return (
      <DashboardDocument bare lang={data.locale} theme="light">
        <Storefront {...common} />
      </DashboardDocument>
    );
  }

  if (route.kind === 'products') {
    const indexProducts = buildProductIndexProducts({ products, categories, categoriesBySlug });
    const indexCategories = buildProductIndexCategories({ products, categories, categoriesBySlug });
    return (
      <DashboardDocument bare lang={data.locale} theme="light">
        <Storefront
          {...common}
          overrideMain={
            <AllProductsPage
              storefrontBaseHref={baseHref}
              businessName={data.businessName}
              logoUrl={data.logoUrl}
              locale={data.locale}
              currency={data.checkout.currency}
              settings={data.productIndex}
              products={indexProducts}
              categories={indexCategories}
              showCartButtons={false}
            />
          }
        />
      </DashboardDocument>
    );
  }

  if (route.kind === 'product') {
    const product = await getProduct(slug, route.productId).catch(() => null);
    if (!product) notFound();
    return (
      <DashboardDocument bare lang={data.locale} theme="light">
        <Storefront
          {...common}
          overrideMain={
            <ProductDetailPage
              storefront={data}
              product={product}
              storefrontBaseHref={baseHref}
              allowCart={false}
            />
          }
        />
      </DashboardDocument>
    );
  }

  if (route.kind === 'checkout') {
    return renderPrivateState({
      common,
      locale: data.locale,
      titleEn: 'Checkout is disabled in preview',
      titleAr: 'الدفع معطل في المعاينة',
      bodyEn:
        'You can review navigation and presentation here. No cart, order, payment, or customer action will run.',
      bodyAr:
        'يمكنك مراجعة التنقل والعرض هنا. لن تعمل السلة أو الطلبات أو الدفع أو أي إجراء للعميل.',
    });
  }

  if (route.kind === 'legal') {
    const page = allPages.find((candidate) => candidate.slug === route.key);
    if (page) {
      return renderPage({ common, page });
    }
    const body = resolvePolicyBody({
      policies,
      key: route.key,
      locale: data.locale,
      businessName: data.businessName,
    });
    if (body) {
      return (
        <DashboardDocument bare lang={data.locale} theme="light">
          <Storefront
            {...common}
            overrideMain={<PolicyArticle locale={data.locale} policyKey={route.key} body={body} />}
          />
        </DashboardDocument>
      );
    }
  }

  if (route.kind === 'page') {
    const page = allPages.find((candidate) => candidate.slug === route.slug);
    if (page) return renderPage({ common, page });
  }

  notFound();
}

function deriveRoute(path: readonly string[]): RouteKind {
  if (path.length === 0) return { kind: 'home' };
  const first = path[0]?.toLowerCase() ?? '';
  if (first === 'checkout' || first === 'cart') return { kind: 'checkout' };
  if (first === 'products' && path.length === 1) return { kind: 'products' };
  if (first === 'p' && path.length === 2 && path[1]) {
    return { kind: 'product', productId: path[1] };
  }
  if (path.length !== 1) return { kind: 'not-found' };
  if (LEGAL_KEYS.has(first)) return { kind: 'legal', key: first as PolicyKey };
  return first ? { kind: 'page', slug: first } : { kind: 'not-found' };
}

function deriveNavPages(pages: StorefrontPage[]): ChromeNavPage[] {
  return pages
    .filter((page) => page.showInNav && !page.isHome)
    .map((page) => ({ slug: page.slug, title: page.title }));
}

function deriveLegalPolicies(
  policies: StorefrontPolicies,
  locale: 'en' | 'ar',
  businessName: string,
): ChromeLegalPolicy[] {
  return POLICY_KEYS.filter((key) =>
    Boolean(resolvePolicyBody({ policies, key, locale, businessName })),
  ).map((key) => ({ key, title: policyTitle(key, locale) }));
}

function policyTitle(key: PolicyKey, locale: 'en' | 'ar'): string {
  const titles = {
    terms: { en: 'Terms of Service', ar: 'شروط الخدمة' },
    privacy: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
    refund: { en: 'Refund Policy', ar: 'سياسة الاسترجاع' },
    shipping: { en: 'Shipping Policy', ar: 'سياسة الشحن' },
  } satisfies Record<PolicyKey, Record<'en' | 'ar', string>>;
  return titles[key][locale];
}

type PreviewCommon = Parameters<typeof Storefront>[0];

function renderPage({ common, page }: { common: PreviewCommon; page: StorefrontPage }) {
  return (
    <DashboardDocument bare lang={common.data.locale} theme="light">
      <Storefront {...common} overrideBlocks={page.publishedBlocks ?? page.draftBlocks} />
    </DashboardDocument>
  );
}

function renderPrivateState({
  common,
  locale,
  titleEn,
  titleAr,
  bodyEn,
  bodyAr,
}: {
  common: PreviewCommon;
  locale: 'en' | 'ar';
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}) {
  return (
    <DashboardDocument bare lang={locale} theme="light">
      <Storefront
        {...common}
        overrideMain={
          <PreviewState
            locale={locale}
            titleEn={titleEn}
            titleAr={titleAr}
            bodyEn={bodyEn}
            bodyAr={bodyAr}
          />
        }
      />
    </DashboardDocument>
  );
}

function PreviewState({
  locale,
  titleEn,
  titleAr,
  bodyEn,
  bodyAr,
}: {
  locale: 'en' | 'ar';
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}): JSX.Element {
  const isRtl = locale === 'ar';
  return (
    <main
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ minHeight: '72dvh', display: 'grid', placeItems: 'center', padding: 32 }}
    >
      <div style={{ maxWidth: 620, textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#d4b06a', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {isRtl ? 'معاينة خاصة · سوقنا برو' : 'PRIVATE PREVIEW · SOUQNA PRO'}
        </p>
        <h1
          style={{
            margin: '14px 0 0',
            fontFamily: 'var(--font-serif), serif',
            fontSize: 'clamp(30px, 6vw, 58px)',
            lineHeight: 1.05,
          }}
        >
          {isRtl ? titleAr : titleEn}
        </h1>
        <p style={{ margin: '16px auto 0', maxWidth: 520, opacity: 0.68, lineHeight: 1.7 }}>
          {isRtl ? bodyAr : bodyEn}
        </p>
      </div>
    </main>
  );
}

function PolicyArticle({
  locale,
  policyKey,
  body,
}: {
  locale: 'en' | 'ar';
  policyKey: PolicyKey;
  body: string;
}): ReactNode {
  const isRtl = locale === 'ar';
  return (
    <main
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        maxWidth: 'min(760px, 92vw)',
        marginInline: 'auto',
        paddingBlock: 'clamp(40px, 6vw, 96px)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif), serif',
          fontSize: 'clamp(30px, 6vw, 52px)',
          lineHeight: 1.1,
        }}
      >
        {policyTitle(policyKey, locale)}
      </h1>
      <article style={{ marginBlockStart: 28, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
        {body}
      </article>
    </main>
  );
}
