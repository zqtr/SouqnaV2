import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { defaultLocale, isLocale } from '@/i18n/locales';
import { getCopy } from '@/content/copy';
import { getStorefront, getStorefrontsForUser } from '@/lib/brief';
import { getCategories, getStorefrontCategoryProductMap } from '@/lib/categories';
import { getAllProducts } from '@/lib/products';
import { getServerTheme } from '@/components/theme/ServerThemeScript';
import { BuilderShell } from '@/components/builder/BuilderShell';
import { ProBuilder } from '@/components/account/pro/ProBuilder';
import { getProAccess } from '@/lib/pro/entitlement';
import {
  getLatestProJob,
  getLatestProJobForSession,
  getProSessionForOwner,
  getProWorkspace,
  listEarlierProJobs,
  listProSessionEvents,
  listProSessions,
} from '@/lib/proState';
import { seedBuilderIfEmpty } from '@/app/actions/builder';
import { EmptyState, PageHeader } from '@/components/admin/primitives';
import { listInstalledApps } from '@/lib/apps/installed';
import { getPlan } from '@/lib/billing';
import { getStorefrontCheckoutSettings } from '@/lib/storefrontSettings';
import { listPages, normalizePageSlug } from '@/lib/storefrontPages';
import { buildProductIndexCategories, buildProductIndexProducts } from '@/lib/productIndexCatalog';
import { ensureEasyDraftManifest } from '@/lib/easySnapshots';

/**
 * Builder route — full-bleed, lives outside the (chrome) group so the
 * sidebar and topbar don't compete with the 3-pane editor for space.
 *
 * The page resolves the active store via `?store=<slug>`, seeds the
 * draft if empty, then hands off to `<BuilderShell>` which owns its
 * own header + publish bar + side panels.
 */
export default async function BuilderPage({
  searchParams,
}: {
  searchParams?: Promise<{
    store?: string | string[];
    page?: string | string[];
    generated?: string | string[];
    easy?: string | string[];
    restored?: string | string[];
    session?: string | string[];
    view?: string | string[];
  }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/account/builder');

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const builderCopy = getCopy(locale).builder;

  const sp = (await searchParams) ?? {};
  const requested = Array.isArray(sp.store) ? sp.store[0] : sp.store;
  const requestedPageSlug = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const generatedFlag = Array.isArray(sp.generated) ? sp.generated[0] : sp.generated;
  const souqyLivePublishHint = generatedFlag === '1';
  const restoredFlag = Array.isArray(sp.restored) ? sp.restored[0] : sp.restored;
  const restoredEasyDraftHint = restoredFlag === '1';
  const storefronts = await getStorefrontsForUser(userId);
  if (storefronts.length === 0) {
    return (
      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '60px 24px',
        }}
      >
        <PageHeader title={builderCopy.empty.pageTitle} subtitle={builderCopy.empty.pageSubtitle} />
        <EmptyState
          eyebrow={builderCopy.empty.eyebrow}
          title={builderCopy.empty.title}
          body={builderCopy.empty.body}
          action={{ label: builderCopy.empty.cta, href: '/begin' }}
        />
      </main>
    );
  }
  const known = new Set(storefronts.map((s) => s.slug));
  const slug = requested && known.has(requested) ? requested : storefronts[0]!.slug;
  const storefront = await getStorefront(slug);
  if (!storefront) redirect('/account');

  const theme = await getServerTheme();

  // A Pro workspace is entirely separate from the Easy draft. Resolve
  // the preferred authoring mode before seeding the Easy builder so merely
  // opening Pro can never touch `draft_blocks`, theme, or page rows.
  const easyFlag = Array.isArray(sp.easy) ? sp.easy[0] : sp.easy;
  const proAccess = await getProAccess(userId);
  const proWorkspace = proAccess.enabled ? await getProWorkspace(slug).catch(() => null) : null;
  if (easyFlag !== '1' && proAccess.enabled) {
    if (proWorkspace?.preferredMode === 'pro') {
      const requestedSession = Array.isArray(sp.session) ? sp.session[0] : sp.session;
      const requestedView = Array.isArray(sp.view) ? sp.view[0] : sp.view;
      const view =
        requestedView === 'preview' || requestedView === 'code'
          ? requestedView
          : requestedSession
            ? 'code'
            : 'home';
      const [sessions, activeSession, earlierJobs] = await Promise.all([
        listProSessions({ slug, clerkUserId: userId, includeArchived: true }).catch(() => []),
        requestedSession
          ? getProSessionForOwner({ sessionId: requestedSession, slug, clerkUserId: userId }).catch(
              () => null,
            )
          : Promise.resolve(null),
        listEarlierProJobs({ slug, clerkUserId: userId }).catch(() => []),
      ]);
      const latestJob = activeSession
        ? await getLatestProJobForSession({
            sessionId: activeSession.id,
            slug,
            clerkUserId: userId,
          }).catch(() => null)
        : await getLatestProJob(slug).catch(() => null);
      const sessionEvents = activeSession
        ? await listProSessionEvents({
            sessionId: activeSession.id,
            slug,
            clerkUserId: userId,
          }).catch(() => [])
        : [];
      return (
        <ProBuilder
          locale={locale}
          slug={slug}
          businessName={storefront.businessName}
          workspace={proWorkspace}
          initialJob={latestJob}
          eligible={proAccess.eligible && activeSession?.status !== 'archived'}
          publishedRevision={storefront.souqyRevision}
          v2Enabled={process.env.NODE_ENV === 'development' || env.SOUQNA_PRO_IDE_V2_ENABLED}
          codeRuntimeEnabled={
            process.env.NODE_ENV === 'development' || env.SOUQNA_PRO_CODE_RUNTIME_ENABLED
          }
          initialView={activeSession ? (view === 'home' ? 'code' : view) : 'home'}
          sessions={sessions}
          activeSession={activeSession}
          sessionEvents={sessionEvents}
          earlierJobs={earlierJobs}
          storefronts={storefronts.map((item) => ({
            slug: item.slug,
            businessName: item.businessName,
          }))}
          invalidSession={Boolean(requestedSession && !activeSession)}
        />
      );
    }
  }

  // Seed home page (and home-mirrored briefs row) only when Easy is the
  // selected surface. This is the established first-open behaviour.
  await seedBuilderIfEmpty({ slug });

  const [legacyPages, easyManifest] = await Promise.all([
    listPages(slug),
    ensureEasyDraftManifest(slug, userId),
  ]);
  const easyPresentation = easyManifest.presentation;
  const allPages = easyPresentation.pages.flatMap((manifestPage) => {
    const legacy = legacyPages.find(
      (page) => page.id === manifestPage.id || page.slug === manifestPage.slug,
    );
    const id = manifestPage.id ?? legacy?.id;
    if (!id) return [];
    return [
      {
        id,
        storefrontSlug: slug,
        slug: manifestPage.slug,
        title: manifestPage.title,
        draftBlocks: manifestPage.blocks,
        publishedBlocks: legacy?.publishedBlocks ?? null,
        status: manifestPage.status,
        position: manifestPage.position,
        showInNav: manifestPage.showInNav,
        isHome: manifestPage.isHome,
        seo: {
          title: manifestPage.seo.title ?? null,
          description: manifestPage.seo.description ?? null,
          image: manifestPage.seo.image ?? null,
        },
        createdAt: legacy?.createdAt ?? easyManifest.updatedAt,
        updatedAt: easyManifest.updatedAt,
      },
    ];
  });

  // Resolve the active page from `?page=<slug>`, falling back to home.
  // The slug is normalised through the same helper the create action
  // uses so a typo'd querystring doesn't 404 — we coerce to home if
  // the requested slug doesn't resolve.
  const wantedSlug = requestedPageSlug ? normalizePageSlug(requestedPageSlug) : null;
  const activeSystemPage =
    wantedSlug === 'checkout'
      ? ('checkout' as const)
      : wantedSlug === 'products'
        ? ('products' as const)
        : null;
  let activePage =
    (wantedSlug && !activeSystemPage ? allPages.find((page) => page.slug === wantedSlug) : null) ??
    allPages.find((page) => page.isHome) ??
    null;
  if (!activePage) activePage = allPages[0] ?? null;
  if (!activePage) redirect('/account');

  const initialBlocks = activePage.draftBlocks;

  const [products, categories, categoriesBySlug, installed, callerPlan, checkout] =
    await Promise.all([
      getAllProducts(slug),
      getCategories(slug).catch(() => []),
      getStorefrontCategoryProductMap(slug).catch(() => new Map<string, Set<string>>()),
      listInstalledApps(slug).catch(() => []),
      getPlan(userId).catch(() => 'free' as const),
      getStorefrontCheckoutSettings(slug),
    ]);
  const installedAppIds = installed.filter((a) => a.enabled).map((a) => a.appId);
  const productIndexProducts = buildProductIndexProducts({
    products: products.filter((product) => product.status !== 'draft'),
    categories,
    categoriesBySlug,
  });
  const productIndexCategories = buildProductIndexCategories({
    products,
    categories,
    categoriesBySlug,
  });
  const easyCheckout = {
    ...checkout,
    addressDesign: easyPresentation.checkoutPresentation.addressDesign,
    experience: easyPresentation.checkoutPresentation.experience,
    thankYou: easyPresentation.checkoutPresentation.thankYou,
  };

  await currentUser();

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--surface-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {restoredEasyDraftHint ? (
        <aside
          role="status"
          style={{
            position: 'fixed',
            insetBlockStart: 16,
            insetInline: 16,
            zIndex: 120,
            maxWidth: 560,
            marginInline: 'auto',
            border: '1px solid color-mix(in srgb, #d4b06a 54%, transparent)',
            borderRadius: 12,
            background: '#171512',
            color: '#f3ead9',
            boxShadow: '0 18px 55px rgb(0 0 0 / 35%)',
            padding: '12px 16px',
            fontSize: 13,
            lineHeight: 1.5,
            textAlign: locale === 'ar' ? 'right' : 'left',
          }}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        >
          <strong style={{ display: 'block', color: '#d4b06a' }}>
            {locale === 'ar' ? 'تم الاسترجاع كمسودة' : 'Restored as draft'}
          </strong>
          <span>
            {locale === 'ar'
              ? 'متجرك المنشور لم يتغير. راجع المسودة ثم استخدم نشر عندما تصبح جاهزاً.'
              : 'Your live storefront is unchanged. Review this Easy draft, then publish when you are ready.'}
          </span>
        </aside>
      ) : null}
      <BuilderShell
        locale={locale}
        // Remount cleanly when the founder swaps the active page.
        // The shell snapshots `initialBlocks` into local state on
        // mount, so without a fresh key the canvas would still show
        // the previous page's tree even after the URL changed.
        key={`${slug}:${activeSystemPage ?? activePage.id}`}
        slug={slug}
        liveUrl={`https://${slug}.${env.BRIEF_ROOT_DOMAIN}`}
        businessName={storefront.businessName}
        logoUrl={storefront.logoUrl}
        pages={allPages}
        activeSystemPage={activeSystemPage}
        activePageId={activePage.id}
        initialBlocks={initialBlocks}
        publishedAt={storefront.publishedAt ? storefront.publishedAt.toISOString() : null}
        isPublished={storefront.isPublished}
        productOptions={products.map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          imageUrl: p.imageUrl,
          priceQar: p.priceQar,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          isCustomizable: p.isCustomizable,
          customizationLabel: p.customizationLabel,
          allowCustomSize: p.allowCustomSize,
          variantOptions: p.variantOptions,
          requiresHeightInput: p.requiresHeightInput,
          heightInputLabel: p.heightInputLabel,
          heightOptions: p.heightOptions,
        }))}
        categoryOptions={Array.from(
          new Set(
            products.map((p) => (p.category ?? '').trim()).filter((c): c is string => Boolean(c)),
          ),
        ).sort((a, b) => a.localeCompare(b))}
        initialTheme={easyPresentation.themeOverrides}
        initialPalette={easyPresentation.palette}
        initialTemplate={easyPresentation.templateId}
        initialPolicies={easyPresentation.policies}
        initialCheckout={easyCheckout}
        initialProductIndex={easyPresentation.productIndex}
        productIndexProducts={productIndexProducts}
        productIndexCategoryOptions={productIndexCategories}
        currentPlan={callerPlan}
        // The builder chrome follows the founder's account-wide
        // light/dark preference (the same `souqna-theme` cookie that
        // drives the marketing site, /account, etc.) — and *only*
        // that. We deliberately do not consult
        // `themeOverrides.themeBehaviour` here: that setting controls
        // how the public storefront renders (light-locked,
        // dark-locked, or auto), not how the editor chrome renders
        // around it. Coupling them surprised founders — flipping the
        // storefront to "dark" silently darkened the builder UI too.
        effectiveTheme={theme}
        installedAppIds={installedAppIds}
        souqyLivePublishHint={souqyLivePublishHint}
        proEnabled={proAccess.enabled}
        proEligible={proAccess.eligible}
        proHasWorkspace={Boolean(proWorkspace)}
      />
    </main>
  );
}
