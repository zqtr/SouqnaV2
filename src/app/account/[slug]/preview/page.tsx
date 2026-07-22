import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getAllProducts } from '@/lib/products';
import { getStorefrontCategoryProductMap } from '@/lib/categories';
import { requireStorefrontOwner } from '@/lib/dashboard-auth';
import { Storefront } from '@/components/storefront/Storefront';
import { DashboardDocument } from '@/components/dashboard/DashboardDocument';
import { PreviewBridge } from '@/components/builder/PreviewBridge';
import { isLocale } from '@/i18n/locales';
import { normalizePageSlug } from '@/lib/storefrontPages';
import {
  POLICY_KEYS,
} from '@/lib/storefrontSettings';
import { resolvePolicyBody } from '@/lib/storefrontPolicies';
import { localizedPolicyTitle } from '@/components/storefront/LegalPageRenderer';
import type {
  ChromeLegalPolicy,
  ChromeNavPage,
} from '@/components/storefront/StorefrontChrome';
import { ensureEasyDraftManifest } from '@/lib/easySnapshots';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string | string[] }>;
};

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: 'Preview · Souqna',
};

/**
 * Owner-gated draft preview, rendered inside the builder's iframe. The
 * Storefront dispatcher is fed `draft_blocks` directly (via `overrideBlocks`)
 * so the founder sees their unsaved edits while the public storefront still
 * shows whatever was last published.
 *
 * Renders a bare document (no dashboard chrome) so the iframe contents look
 * identical to the published page.
 *
 * Note on theming: we pass `visitorTheme="light"` (not the founder's
 * dashboard theme cookie) so the storefront preview reflects what a
 * real visitor would see by default — a dark builder chrome must not
 * silently flip the previewed storefront to dark too. Founders who
 * want to preview their dark variant can lock `themeBehaviour` to
 * "Dark" in the Site inspector, which honours its own override.
 */
export default async function StorefrontPreviewPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const requestedPageSlug = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const auth = await requireStorefrontOwner(slug, `/account/${slug}/preview`);
  if (!auth.ok) return <DashboardDocument>{auth.panel}</DashboardDocument>;

  const storefront = auth.storefront;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const previewPolicyLocale =
    cookieLocale && isLocale(cookieLocale) ? cookieLocale : storefront.locale;
  const [products, categoriesBySlug, manifest] = await Promise.all([
    getAllProducts(slug),
    getStorefrontCategoryProductMap(slug).catch(() => new Map<string, Set<string>>()),
    ensureEasyDraftManifest(slug, auth.userId),
  ]);
  const presentation = manifest.presentation;
  const policies = presentation.policies;
  const previewStorefront = {
    ...storefront,
    templateId: presentation.templateId,
    design: presentation.design,
    palette: presentation.palette,
    themeOverrides: presentation.themeOverrides,
    policies,
    productIndex: presentation.productIndex,
    checkout: {
      ...storefront.checkout,
      addressDesign: presentation.checkoutPresentation.addressDesign,
      experience: presentation.checkoutPresentation.experience,
      thankYou: presentation.checkoutPresentation.thankYou,
    },
    souqyRevision: null,
    souqyBlobUrl: null,
    souqySource: null,
  };

  // Builder previews mirror the public chrome so the founder sees
  // their nav + legal footer exactly as a buyer would. Both are
  // derived locally; the chrome itself never queries the DB.
  const navPages: ChromeNavPage[] = presentation.pages
    .filter((p) => p.showInNav && !p.isHome)
    .map((p) => ({ slug: p.slug, title: p.title }));
  const legalPolicies: ChromeLegalPolicy[] = POLICY_KEYS.filter((key) => {
    const body = resolvePolicyBody({
      policies,
      key,
      locale: previewPolicyLocale,
      businessName: storefront.businessName,
    });
    return typeof body === 'string' && body.trim().length > 0;
  }).map((key) => ({ key, title: localizedPolicyTitle(key, previewPolicyLocale) }));

  // Multi-page draft preview: when the builder asks for a specific
  // page, load that page's draft tree out of `storefront_pages` and
  // hand it to the dispatcher via `overrideBlocks`. The home page (and
  // any unknown slug) falls back to `briefs.draft_blocks` — that's
  // the legacy single-page behaviour and is kept for compatibility
  // with anything that still hits `/account/{slug}/preview` without a
  // `?page=` parameter.
  let overrideBlocks =
    presentation.pages.find((page) => page.isHome)?.blocks ?? storefront.draftBlocks;
  if (requestedPageSlug) {
    const wanted = normalizePageSlug(requestedPageSlug);
    if (wanted && wanted !== 'home') {
      const page = presentation.pages.find((candidate) => candidate.slug === wanted);
      if (page) overrideBlocks = page.blocks;
    }
  }

  return (
    <DashboardDocument bare lang={storefront.locale}>
      <PreviewBridge />
      <Storefront
        data={previewStorefront}
        products={products}
        overrideBlocks={overrideBlocks}
        selectable
        visitorTheme="light"
        categoriesBySlug={categoriesBySlug}
        navPages={navPages}
        legalPolicies={legalPolicies}
        policyLocale={previewPolicyLocale}
      />
    </DashboardDocument>
  );
}
