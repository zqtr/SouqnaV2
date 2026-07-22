import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { DashboardDocument } from '@/components/dashboard/DashboardDocument';
import { getCategories, getStorefrontCategoryProductMap } from '@/lib/categories';
import { requireStorefrontOwner } from '@/lib/dashboard-auth';
import { getStorefrontSnapshot, type EasyPresentationPage } from '@/lib/easySnapshots';
import { buildProductIndexCategories, buildProductIndexProducts } from '@/lib/productIndexCatalog';
import { getAllProducts, getProduct } from '@/lib/products';
import { resolvePolicyBody } from '@/lib/storefrontPolicies';
import { POLICY_KEYS, type PolicyKey } from '@/lib/storefrontSettings';
import { AllProductsPage } from './AllProductsPage';
import { ProductDetailPage } from './ProductDetailPage';
import { Storefront } from './Storefront';
import type { ChromeLegalPolicy, ChromeNavPage } from './StorefrontChrome';

type SnapshotRoute =
  | { kind: 'home' }
  | { kind: 'products' }
  | { kind: 'product'; productId: string }
  | { kind: 'checkout' }
  | { kind: 'legal'; key: PolicyKey }
  | { kind: 'page'; slug: string }
  | { kind: 'not-found' };

const LEGAL_KEYS = new Set<string>(POLICY_KEYS as readonly string[]);

export async function OwnerSnapshotPreviewRoute({
  slug,
  snapshotId,
  path = [],
}: {
  slug: string;
  snapshotId: string;
  path?: string[];
}): Promise<JSX.Element> {
  const baseHref = `/account/${encodeURIComponent(slug)}/snapshot-preview/${encodeURIComponent(snapshotId)}`;
  const returnTo =
    path.length > 0 ? `${baseHref}/${path.map(encodeURIComponent).join('/')}` : baseHref;
  const owner = await requireStorefrontOwner(slug, returnTo);
  if (!owner.ok) return <DashboardDocument>{owner.panel}</DashboardDocument>;

  const [snapshot, products, categories, categoriesBySlug] = await Promise.all([
    getStorefrontSnapshot({ storefrontSlug: slug, snapshotId, clerkUserId: owner.userId }),
    getAllProducts(slug),
    getCategories(slug).catch(() => []),
    getStorefrontCategoryProductMap(slug).catch(() => new Map<string, Set<string>>()),
  ]);
  if (!snapshot) notFound();

  const presentation = snapshot.wasPublished ? snapshot.payload.published : snapshot.payload.draft;
  const home = presentation.pages.find((page) => page.isHome) ?? presentation.pages[0];
  if (!home) notFound();

  const data = {
    ...owner.storefront,
    templateId: presentation.templateId,
    design: presentation.design,
    palette: presentation.palette,
    themeOverrides: presentation.themeOverrides,
    draftBlocks: home.blocks,
    publishedBlocks: home.blocks,
    policies: presentation.policies,
    productIndex: presentation.productIndex,
    checkout: {
      ...owner.storefront.checkout,
      addressDesign: presentation.checkoutPresentation.addressDesign,
      experience: presentation.checkoutPresentation.experience,
      thankYou: presentation.checkoutPresentation.thankYou,
    },
    souqyRevision: null,
    souqyBlobUrl: null,
    souqySource: null,
  };
  const navPages: ChromeNavPage[] = presentation.pages
    .filter((page) => page.showInNav && !page.isHome)
    .map((page) => ({ slug: page.slug, title: page.title }));
  const legalPolicies: ChromeLegalPolicy[] = POLICY_KEYS.filter((key) =>
    Boolean(
      resolvePolicyBody({
        policies: presentation.policies,
        key,
        locale: data.locale,
        businessName: data.businessName,
      }),
    ),
  ).map((key) => ({ key, title: policyTitle(key, data.locale) }));
  const surface = { kind: 'owner-snapshot-preview' as const, baseHref };
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

  if (route.kind === 'home') return renderPage(common, home);

  if (route.kind === 'products') {
    if (!data.productIndex.enabled) notFound();
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
              products={buildProductIndexProducts({ products, categories, categoriesBySlug })}
              categories={buildProductIndexCategories({ products, categories, categoriesBySlug })}
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
    return (
      <DashboardDocument bare lang={data.locale} theme="light">
        <Storefront
          {...common}
          overrideMain={
            <PreviewNotice
              locale={data.locale}
              titleEn="Checkout is disabled in backup preview"
              titleAr="الدفع معطل في معاينة النسخة"
              bodyEn="This recovery point is read-only. No cart, order, payment, analytics, or customer action will run."
              bodyAr="نقطة الاسترجاع هذه للقراءة فقط. لن تعمل السلة أو الطلبات أو الدفع أو التحليلات أو أي إجراء للعميل."
            />
          }
        />
      </DashboardDocument>
    );
  }

  if (route.kind === 'legal') {
    const customPage = presentation.pages.find((page) => page.slug === route.key);
    if (customPage) return renderPage(common, customPage);
    const body = resolvePolicyBody({
      policies: presentation.policies,
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
    const page = presentation.pages.find((candidate) => candidate.slug === route.slug);
    if (page) return renderPage(common, page);
  }

  notFound();
}

function deriveRoute(path: readonly string[]): SnapshotRoute {
  if (path.length === 0) return { kind: 'home' };
  const first = path[0]?.toLowerCase() ?? '';
  if ((first === 'checkout' || first === 'cart') && path.length === 1) {
    return { kind: 'checkout' };
  }
  if (first === 'products' && path.length === 1) return { kind: 'products' };
  if (first === 'p' && path.length === 2 && path[1]) {
    return { kind: 'product', productId: path[1] };
  }
  if (path.length !== 1) return { kind: 'not-found' };
  if (LEGAL_KEYS.has(first)) return { kind: 'legal', key: first as PolicyKey };
  return first ? { kind: 'page', slug: first } : { kind: 'not-found' };
}

type PreviewCommon = Parameters<typeof Storefront>[0];

function renderPage(common: PreviewCommon, page: EasyPresentationPage): JSX.Element {
  return (
    <DashboardDocument bare lang={common.data.locale} theme="light">
      <Storefront {...common} overrideBlocks={page.blocks} />
    </DashboardDocument>
  );
}

function PreviewNotice({
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
          {isRtl ? 'معاينة نسخة خاصة' : 'PRIVATE BACKUP PREVIEW'}
        </p>
        <h1 style={{ margin: '14px 0 0', fontSize: 'clamp(30px, 6vw, 58px)', lineHeight: 1.05 }}>
          {isRtl ? titleAr : titleEn}
        </h1>
        <p style={{ margin: '16px auto 0', maxWidth: 520, opacity: 0.68, lineHeight: 1.7 }}>
          {isRtl ? bodyAr : bodyEn}
        </p>
      </div>
    </main>
  );
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
      <h1 style={{ margin: 0, fontSize: 'clamp(30px, 6vw, 52px)', lineHeight: 1.1 }}>
        {policyTitle(policyKey, locale)}
      </h1>
      <article style={{ marginBlockStart: 28, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
        {body}
      </article>
    </main>
  );
}
