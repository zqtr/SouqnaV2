import type { ReactNode } from 'react';
import { palettes, paletteCssVars, type PaletteId } from '@/lib/palettes';
import type { Theme } from '@/lib/theme';
import type { Storefront as StorefrontData } from '@/lib/brief';
import type { Product } from '@/lib/products';
import { getCopy } from '@/content/copy';
import { getVocabulary } from '@/lib/storefront-vocabulary';
import type { Block } from '@/lib/blocks/types';
import type { Locale } from '@/i18n/locales';
import { bootBlocksFromStorefront } from '@/lib/blocks/boot';
import { resolveStorefrontSurface, type StorefrontSurface } from '@/lib/storefrontSurface';
import { SouqyMount as RawSouqyMount } from './SouqyMount';

// React 18 ambient types still flag async server components as
// `Promise<ReactNode>` returns; Next.js handles them correctly at
// runtime. The cast here is the standard interim fix used throughout
// the App Router ecosystem until the React 19 types land.
type SouqyMountProps = {
  data: StorefrontData;
  products: Product[];
  fallback: ReactNode;
  storefrontBaseHref: string;
  isPreview?: boolean;
  categoriesBySlug?: Map<string, Set<string>>;
  navPages?: ChromeNavPage[];
  legalPolicies?: ChromeLegalPolicy[];
};
const SouqyMount = RawSouqyMount as unknown as (props: SouqyMountProps) => JSX.Element;
import { BlockRenderer } from './BlockRenderer';
import { SouqnaSignature } from './SouqnaSignature';
import { FloatingInquireButton } from './FloatingInquireButton';
import { SouqyCustomerChat } from './SouqyCustomerChat';
import { CurrencyToggle } from './CurrencyToggle';
import { AppScripts as RawAppScripts } from './AppScripts';
import { MawidBanner as RawMawidBanner } from './MawidBanner';
import { StorefrontChrome, type ChromeLegalPolicy, type ChromeNavPage } from './StorefrontChrome';
import type { BlockContext } from './blocks/BlockContext';
import { BlockBackgroundFrame } from './blocks/BlockBackgroundFrame';
import { PremiumCursor } from './PremiumCursor';
import { StorefrontPoliciesPanel } from './StorefrontPoliciesPanel';
import { parseSouqySource } from '@/lib/souqy/source';
import { extractSouqyThemeOverrides } from '@/lib/souqy/validate';

type AppScriptsProps = { storefrontSlug: string; installedAppIds: string[] };
const AppScripts = RawAppScripts as unknown as (props: AppScriptsProps) => JSX.Element;
type MawidBannerProps = {
  storefrontSlug: string;
  installedAppIds: string[];
  locale: string;
};
const MawidBanner = RawMawidBanner as unknown as (props: MawidBannerProps) => JSX.Element;

type Props = {
  data: StorefrontData;
  products: Product[];
  /** Override the rendered blocks (used by the dashboard preview route to
   * show `draft_blocks` instead of `published_blocks`). */
  overrideBlocks?: Block[];
  /** When true, every block gets a `data-block-id` for postMessage selection. */
  selectable?: boolean;
  /**
   * Active theme used to pick the palette's light/dark sister triplet.
   * The storefront wrapper reconciles this with the owner's
   * `themeOverrides.themeBehaviour` lock — owners can keep their public
   * site visually anchored to a single theme even if the visitor prefers
   * the other.
   */
  visitorTheme?: Theme;
  /** App ids the founder has installed on this storefront. Used to
   * conditionally mount client islands like the Currency Toggle. */
  installedApps?: string[];
  /** First-class category slug → product-id set. Loaded once per
   * request by the brief page and threaded down so every product-
   * bearing block can resolve `categorySlug` against real categories. */
  categoriesBySlug?: Map<string, Set<string>>;
  /** Pages with `showInNav=true` (excluding home), loaded once at the
   * route boundary and threaded into the chrome. Defaults to empty so
   * older callers that haven't been migrated still render. */
  navPages?: ChromeNavPage[];
  /** Non-empty policies (terms / privacy / refund / shipping) the
   * footer should expose. Same defaulting story as `navPages`. */
  legalPolicies?: ChromeLegalPolicy[];
  /**
   * Optional escape hatch: when provided, replaces the entire
   * templated/block-pipeline main with a caller-supplied node (e.g.
   * the Markdown body for legal pages). Chrome — cart, header nav,
   * footer links, signature, app scripts — still mounts, so policy
   * pages stay visually anchored to the rest of the storefront.
   */
  overrideMain?: ReactNode;
  /** Optional preview-only override for policy fallback copy/titles. */
  policyLocale?: Locale;
  /** Resolves navigation and side-effect policy for public and private renders. */
  surface?: StorefrontSurface;
  showSouqnaSignature?: boolean;
};

export type TemplateProps = {
  data: StorefrontData;
  copy: ReturnType<typeof getCopy>;
  vocabulary: ReturnType<typeof getVocabulary>;
  products: Product[];
};

/**
 * Storefront dispatcher.
 *
 * Storefronts render through the template block pipeline. If a row is
 * missing saved blocks, we synthesize the selected template's seed
 * layout on the fly instead of falling back to the retired archetype
 * templates. That keeps /begin, builder previews, and the public
 * webstore visually aligned to the same template choice.
 *
 * The palette the founder chose is always injected as CSS vars
 * (--sf-ink / --sf-ground / --sf-accent) on a wrapper, so every template
 * and block stays palette-agnostic.
 */
export function Storefront({
  data,
  products,
  overrideBlocks,
  selectable = false,
  visitorTheme = 'light',
  installedApps = [],
  categoriesBySlug,
  navPages = [],
  legalPolicies = [],
  overrideMain,
  policyLocale,
  surface = { kind: 'public' },
  showSouqnaSignature = true,
}: Props) {
  const categories = categoriesBySlug ?? new Map<string, Set<string>>();
  const resolvedSurface = resolveStorefrontSurface(data.slug, surface);
  const customerEffectsEnabled = resolvedSurface.allowsCustomerEffects;
  const effectiveInstalledApps = customerEffectsEnabled ? installedApps : [];
  const hasCurrency = customerEffectsEnabled && installedApps.includes('currency-converter');
  const cartEnabled = customerEffectsEnabled && data.checkout.paymentMethods.length > 0;
  const cartCurrency = data.checkout.currency;
  const savedBlocks = overrideBlocks ?? data.publishedBlocks;
  const blocks = savedBlocks.length > 0 ? savedBlocks : bootBlocksFromStorefront(data);
  // Souqy wins over the block pipeline whenever a revision is published
  // AND the caller didn't explicitly pass `overrideBlocks` (preview
  // routes still want to see the JSON draft, not the AI artifact).
  const useSouqy =
    resolvedSurface.kind !== 'owner-snapshot-preview' &&
    data.souqyRevision != null &&
    !overrideBlocks;
  const shouldApplySouqyTheme = useSouqy || resolvedSurface.kind === 'owner-pro-preview';
  const souqyFiles =
    shouldApplySouqyTheme && data.souqySource ? parseSouqySource(data.souqySource) : null;
  const souqyTheme = souqyFiles ? extractSouqyThemeOverrides(souqyFiles['theme.ts']) : null;
  // Pro theme.ts is applied at render time only. It never overwrites the
  // Easy theme row, so switching modes and building remain non-destructive.
  const themeOverrides = souqyTheme ?? data.themeOverrides;
  const renderData = souqyTheme ? { ...data, themeOverrides } : data;
  const chromeStorefront = customerEffectsEnabled
    ? renderData
    : { ...renderData, phone: null, instagram: null };
  const chromeProps = {
    storefront: chromeStorefront,
    storefrontSlug: data.slug,
    storefrontBaseHref: resolvedSurface.baseHref,
    enabled: cartEnabled,
    currency: cartCurrency,
    navPages,
    legalPolicies,
    chrome: themeOverrides.commerceChrome,
  };
  // Theme overrides win over the founder's palette pick (the Theme page
  // is the more recent, more granular surface).
  const paletteId = (themeOverrides.palette ??
    (shouldApplySouqyTheme ? 'sand_gold' : data.palette)) as PaletteId;
  const palette = palettes[paletteId] ?? palettes.sand_gold;
  const copy = getCopy(data.locale);
  const vocabulary = getVocabulary(data.locale, data.businessType);

  // Owner theme-lock wins over visitor preference. Default = follow visitor.
  const behaviour = themeOverrides.themeBehaviour ?? 'auto';
  const effectiveTheme: Theme =
    behaviour === 'light' ? 'light' : behaviour === 'dark' ? 'dark' : visitorTheme;

  const headingWeight = themeOverrides.headingWeight;
  const sectionSpacing =
    themeOverrides.sectionSpacing === 'tight'
      ? 'clamp(20px, 3vw, 36px)'
      : themeOverrides.sectionSpacing === 'spacious'
        ? 'clamp(56px, 8vw, 112px)'
        : 'clamp(36px, 5vw, 64px)';

  const wrapperStyle: React.CSSProperties = {
    ...paletteCssVars(palette, effectiveTheme),
    ['--sf-section-y' as string]: sectionSpacing,
    ...(headingWeight ? { ['--sf-heading-weight' as string]: String(headingWeight) } : {}),
    background: themeOverrides.pageBg ?? 'var(--sf-ground)',
    color: 'var(--sf-ink)',
    minHeight: '100dvh',
    colorScheme: effectiveTheme,
  };

  if (overrideMain != null) {
    return (
      <div style={wrapperStyle} dir={data.locale === 'ar' ? 'rtl' : 'ltr'}>
        <PremiumCursor effect={themeOverrides.cursorEffect} />
        <BlockBackgroundFrame effect={themeOverrides.backgroundEffect}>
          <StorefrontChrome {...chromeProps}>
            {overrideMain}
            {showSouqnaSignature ? (
              <SouqnaSignature locale={data.locale} verified={Boolean(data.crNumber)} />
            ) : null}
            <CustomerTools data={data} enabled={customerEffectsEnabled} />
            {hasCurrency ? <CurrencyToggle storefrontSlug={data.slug} /> : null}
            {customerEffectsEnabled ? (
              <>
                <AppScripts storefrontSlug={data.slug} installedAppIds={effectiveInstalledApps} />
                <MawidBanner
                  storefrontSlug={data.slug}
                  installedAppIds={effectiveInstalledApps}
                  locale={data.locale}
                />
              </>
            ) : null}
          </StorefrontChrome>
        </BlockBackgroundFrame>
      </div>
    );
  }

  if (useSouqy) {
    return (
      <div style={wrapperStyle} dir={data.locale === 'ar' ? 'rtl' : 'ltr'}>
        <PremiumCursor effect={themeOverrides.cursorEffect} />
        <BlockBackgroundFrame effect={themeOverrides.backgroundEffect}>
          <StorefrontChrome {...chromeProps}>
            <SouqyMount
              data={renderData}
              products={products}
              storefrontBaseHref={resolvedSurface.baseHref}
              isPreview={!customerEffectsEnabled}
              categoriesBySlug={categories}
              navPages={navPages}
              legalPolicies={legalPolicies}
              fallback={
                resolvedSurface.fallsBackToEasy ? (
                  <FallbackToBlockPipeline
                    data={data}
                    products={products}
                    copy={copy}
                    vocabulary={vocabulary}
                    blocks={blocks}
                    selectable={selectable}
                    categoriesBySlug={categories}
                    navPages={navPages}
                    legalPolicies={legalPolicies}
                    installedApps={effectiveInstalledApps}
                    storefrontBaseHref={resolvedSurface.baseHref}
                    isPreview={!customerEffectsEnabled || selectable}
                  />
                ) : (
                  <PreviewUnavailable locale={data.locale} />
                )
              }
            />
            <StorefrontPoliciesPanel storefront={renderData} locale={policyLocale} />
            {showSouqnaSignature ? (
              <SouqnaSignature locale={data.locale} verified={Boolean(data.crNumber)} />
            ) : null}
            <CustomerTools data={data} enabled={customerEffectsEnabled} />
            {hasCurrency ? <CurrencyToggle storefrontSlug={data.slug} /> : null}
            {customerEffectsEnabled ? (
              <>
                <AppScripts storefrontSlug={data.slug} installedAppIds={effectiveInstalledApps} />
                <MawidBanner
                  storefrontSlug={data.slug}
                  installedAppIds={effectiveInstalledApps}
                  locale={data.locale}
                />
              </>
            ) : null}
          </StorefrontChrome>
        </BlockBackgroundFrame>
      </div>
    );
  }

  {
    const ctx: BlockContext = {
      storefront: data,
      storefrontBaseHref: chromeProps.storefrontBaseHref,
      products,
      theme: data.themeOverrides,
      copy,
      vocabulary,
      isRtl: data.locale === 'ar',
      isPreview: selectable || !customerEffectsEnabled,
      categoriesBySlug: categories,
      navPages,
      legalPolicies,
      installedAppIds: effectiveInstalledApps,
    };
    return (
      <div style={wrapperStyle} dir={data.locale === 'ar' ? 'rtl' : 'ltr'}>
        <PremiumCursor effect={data.themeOverrides.cursorEffect} />
        <BlockBackgroundFrame effect={data.themeOverrides.backgroundEffect}>
          <StorefrontChrome {...chromeProps}>
            <main
              style={{
                maxWidth: 'min(1280px, 92vw)',
                marginInline: 'auto',
                paddingBlock: 'clamp(24px, 4vw, 56px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sf-section-y)',
              }}
            >
              <BlockRenderer blocks={blocks} ctx={ctx} selectable={selectable} />
            </main>
            <StorefrontPoliciesPanel storefront={data} locale={policyLocale} />
            {showSouqnaSignature ? (
              <SouqnaSignature locale={data.locale} verified={Boolean(data.crNumber)} />
            ) : null}
            <CustomerTools data={data} enabled={customerEffectsEnabled} />
            {hasCurrency ? <CurrencyToggle storefrontSlug={data.slug} /> : null}
            {customerEffectsEnabled ? (
              <>
                <AppScripts storefrontSlug={data.slug} installedAppIds={effectiveInstalledApps} />
                <MawidBanner
                  storefrontSlug={data.slug}
                  installedAppIds={effectiveInstalledApps}
                  locale={data.locale}
                />
              </>
            ) : null}
          </StorefrontChrome>
        </BlockBackgroundFrame>
      </div>
    );
  }
}

function CustomerTools({ data, enabled }: { data: StorefrontData; enabled: boolean }): ReactNode {
  if (!enabled) return null;
  return (
    <>
      <SouqyCustomerChat
        storefrontSlug={data.slug}
        locale={data.locale}
        businessName={data.businessName}
      />
      <FloatingInquireButton
        storefrontSlug={data.slug}
        locale={data.locale}
        whatsappPhone={data.phone}
        businessName={data.businessName}
      />
    </>
  );
}

/**
 * Fallback render path used when Souqy is published BUT the bundle
 * fails to load at request time (network error, eval failure). We
 * gracefully degrade to whatever the founder had in `published_blocks`
 * — usually the seed layout from the time of `souqyKickoff` — so the
 * storefront stays alive while Souqna ops investigates.
 */
function FallbackToBlockPipeline({
  data,
  products,
  copy,
  vocabulary,
  blocks,
  selectable,
  categoriesBySlug,
  navPages,
  legalPolicies,
  installedApps,
  storefrontBaseHref,
  isPreview,
}: {
  data: StorefrontData;
  products: Product[];
  copy: ReturnType<typeof getCopy>;
  vocabulary: ReturnType<typeof getVocabulary>;
  blocks: Block[];
  selectable: boolean;
  categoriesBySlug: Map<string, Set<string>>;
  navPages: ChromeNavPage[];
  legalPolicies: ChromeLegalPolicy[];
  installedApps: string[];
  storefrontBaseHref: string;
  isPreview: boolean;
}): ReactNode {
  const ctx: BlockContext = {
    storefront: data,
    storefrontBaseHref,
    products,
    theme: data.themeOverrides,
    copy,
    vocabulary,
    isRtl: data.locale === 'ar',
    isPreview,
    categoriesBySlug,
    navPages,
    legalPolicies,
    installedAppIds: installedApps,
  };
  if (blocks.length === 0) {
    blocks = bootBlocksFromStorefront(data);
  }
  return (
    <main
      style={{
        maxWidth: 'min(1280px, 92vw)',
        marginInline: 'auto',
        paddingBlock: 'clamp(24px, 4vw, 56px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sf-section-y)',
      }}
    >
      <BlockRenderer blocks={blocks} ctx={ctx} selectable={selectable} />
    </main>
  );
}

function PreviewUnavailable({ locale }: { locale: StorefrontData['locale'] }): JSX.Element {
  const isRtl = locale === 'ar';
  return (
    <main
      dir={isRtl ? 'rtl' : 'ltr'}
      role="status"
      style={{
        minHeight: '70dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <p
          style={{
            margin: 0,
            color: 'var(--sf-accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {isRtl ? 'معاينة سوقنا برو' : 'Souqna Pro preview'}
        </p>
        <h1
          style={{
            margin: '14px 0 0',
            fontFamily: 'var(--font-serif), serif',
            fontSize: 'clamp(30px, 5vw, 52px)',
            lineHeight: 1.05,
          }}
        >
          {isRtl ? 'المعاينة غير متاحة — أعد البناء' : 'Preview unavailable — rebuild'}
        </h1>
        <p style={{ margin: '14px 0 0', opacity: 0.68, lineHeight: 1.65 }}>
          {isRtl
            ? 'تعذر تحميل آخر نسخة مبنية. ارجع إلى منشئ برو وأعد بناء المعاينة.'
            : 'The latest build could not be loaded. Return to Pro Builder and rebuild the preview.'}
        </p>
      </div>
    </main>
  );
}
