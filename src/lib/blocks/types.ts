import type { PaletteId } from '@/lib/palettes';
import type { CommerceFilterGroup, CommerceProductSource, CommerceTab } from './commerce';
import type { StorefrontChromeConfig } from '@/lib/storefrontChrome';

/**
 * The full block taxonomy V1. Each enum member maps 1:1 to:
 *   - a Zod schema in `src/lib/blocks/schemas.ts` (validates `props`)
 *   - a server-rendered component in `src/components/storefront/blocks/`
 *   - an inspector form in `src/components/builder/inspectors/` (Phase 2)
 *   - a library tile in `src/components/builder/library/` (Phase 2)
 *
 * Adding a new block? Add a row everywhere. The renderer falls back to a
 * silent `null` for unknown types so a partially-deployed extension never
 * breaks the public storefront.
 */
export const BLOCK_TYPES = [
  'hero',
  'banner',
  'text',
  'image',
  'gallery',
  'productGrid',
  'productList',
  'featuredProduct',
  'serviceList',
  'menu',
  'calendar',
  'contactCard',
  'inquireCta',
  'activityPanel',
  'spacer',
  'divider',
  'drop',
  // Premium animation primitives. Visual quality is available on every
  // plan; the dispatcher still owns graceful fallbacks for older drafts.
  'animatedText',
  'animatedImage',
  // Premium product treatment. Single product rendered as a layered
  // card with one card peeking behind the front; hover fans the back
  // card outward.
  'productCardStack',
  // Premium image card with hover lift + a configurable directional
  // tilt (left / right / none). Optional headline + subhead overlay
  // sits on top of the image.
  'tiltImage',
  // Premium text-content card with an optional editable date badge,
  // a decorative pattern strip, hover lift+tilt, and a staggered
  // "rise" of inner copy on hover.
  'spotlightCard',
  // Premium single-product promo card. Bound to a product picked
  // from the founder's catalogue, with hover-revealed customizable
  // tag chips (e.g. "NEW", "SALE"), and an Add-to-Cart "+" button.
  'productPromoCard',
  // Plugin-owned blocks. Resolved at render time from `app_state` so
  // the founder can edit the content in the dashboard without
  // republishing the page (same model as `drop`).
  'mawid',
  'taqim',
  /** Parallax depth-card — use at most one per page. */
  'depthShowcase',
  /** Narrow aurora gradient ribbon — use sparingly. */
  'auroraRibbon',
  /** Souqy portal hero — constrained WebGL opener for AI-built storefronts. */
  'portalHero',
  /** Curved loop marquee text. */
  'curvedLoop',
  /** Premium compact active-image showcase switcher. */
  'showcase1',
  /** Premium draggable horizontal showcase carousel. */
  'showcase2',
  /** Premium 3D triangular showcase carousel. */
  'showcase3',
  /** Premium filterable project showcase grid. */
  'showcase4',
  /** Premium tabbed creator/team showcase. */
  'showcase5',
  /** Premium ecommerce product gallery. */
  'ecommerce1',
  /** Premium ecommerce filterable product grid. */
  'ecommerce2',
  /** Premium ecommerce product color detail. */
  'ecommerce3',
  /** Premium ecommerce limited drop product. */
  'ecommerce4',
  /** Premium ecommerce editorial shelf. */
  'ecommerce5',
  /** Premium ecommerce category shop. */
  'ecommerce6',
  /** Premium ecommerce category tile grid. */
  'ecommerce7',
  /** Souqna Pro+/Max+ storefront navbar treatment. */
  'shadcnNavbar',
  /** Souqna Pro+/Max+ ecommerce hero family. */
  'shadcnHero',
  /** Souqna Pro+/Max+ trust strip family. */
  'shadcnTrustStrip',
  /** Souqna Pro+/Max+ category browsing family. */
  'shadcnCategories',
  /** Souqna Pro+/Max+ product card family. */
  'shadcnProductCard',
  /** Souqna Pro+/Max+ product list family. */
  'shadcnProductList',
  /** Souqna Pro+/Max+ product detail family. */
  'shadcnProductDetail',
  /** Souqna Pro+/Max+ quick-view family. */
  'shadcnQuickView',
  /** Souqna Pro+/Max+ reviews family. */
  'shadcnReviews',
  /** Souqna Pro+/Max+ order-summary family. */
  'shadcnOrderSummary',
  /** Souqna Pro+/Max+ offer modal family. */
  'shadcnOfferModal',
  /** Souqna Pro+/Max+ ecommerce footer family. */
  'shadcnFooter',
  /** Max+ shader hero — React Bits Pro SilkWaves behind an editorial hero. */
  'shaderHero',
  /** Pro+ product row with pointer-driven 3D tilt, wired to live products. */
  'productSpotlight3d',
  /** Pro+ animated, hover-pausing marquee of bilingual customer reviews. */
  'socialProofWall',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

/**
 * Editorial style overrides every block accepts. Defaults are picked by
 * the per-archetype seed; the inspector exposes them as numeric steppers
 * (no caps) plus a small palette of named tokens for backwards compat.
 *
 * paddingY / paddingX accept either a named token (legacy) or a raw px
 * number — the renderer normalises both into a CSS px value, so existing
 * stored rows keep rendering without migration.
 */
export type BlockStyle = {
  paddingY?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | number;
  paddingX?: 'none' | 'sm' | 'md' | 'lg' | number;
  bg?: 'sand' | 'ink' | 'gold' | 'transparent' | string;
  textColor?: 'ink' | 'sand' | 'gold' | string;
  /** Full CSS background shorthand from the shared pattern library. */
  backgroundCss?: string;
  backgroundCssSize?: string;
  /** Animated/premium background surface. Free in Souqna; never plan-gated. */
  backgroundEffect?: BackgroundEffect;
  /** Text motion treatment, kept editable as Souqna JSON. */
  textEffect?: TextEffect;
  /** Card/depth treatment for commerce and editorial cards. */
  cardEffect?: CardEffect;
  /** Gallery/layout treatment for image collections. */
  galleryEffect?: GalleryEffect;
  align?: 'start' | 'center' | 'end';
  /**
   * Per-block surface mode. `inherit` (default) follows the storefront's
   * `themeBehaviour`; `light` / `dark` swap the palette triplet for this
   * block only — useful when a single section wants the opposite surface
   * (a dark hero on a light page, or vice-versa).
   */
  colorScheme?: 'inherit' | 'light' | 'dark';

  // ── Framer-style layout primitives (all optional, default = current
  // block-level behaviour). The renderer reads them when set; legacy rows
  // without these fields keep rendering identically.
  /**
   * `block` (default) keeps stacked-section layout. `flex` and `grid`
   * apply CSS flexbox / grid to the block's wrapper. `hidden` removes the
   * block from the rendered output without deleting it from the draft —
   * useful for staging changes the founder doesn't want live yet.
   */
  display?: 'block' | 'flex' | 'grid' | 'hidden';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** Horizontal distribution of children when display=flex/grid. */
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Cross-axis alignment of children when display=flex/grid. */
  alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** Gap (in px) between children when display=flex/grid. */
  gap?: number;

  // ── Per-side padding (px). When set, each side overrides the matching
  // legacy `paddingX` / `paddingY` token. Founders who only set one side
  // (e.g. paddingTop) keep the X token for the unset axis, so old defaults
  // never silently disappear.
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  /**
   * Premium "look" variant for blocks that opt into advanced styling
   * (currently Hero, Banner, Gallery, InquireCta). `'classic'` is the
   * default and matches every storefront pre-2026-04. The `pro-*`
   * variants are visual-only and free for every Souqna founder.
   *
   * The renderer always reads this off `style.variant` and falls back
   * to `'classic'`, so blocks that don't recognise the variant render
   * the default look without throwing.
   */
  variant?: BlockVariant;
};

export const BACKGROUND_EFFECTS = [
  'none',
  'silk-waves',
  'shader-waves',
  'chroma-waves',
  'aurora-blur',
  'gradient-blob',
  'ai-blob',
  'dither-wave',
  'radial-liquid',
  'grain-wave',
  'glass-flow',
  'falling-rays',
  'light-droplets',
  'lightspeed',
  'rising-lines',
  'liquid-bars',
  'liquid-lines',
  'shadow-bars',
  'color-loops',
  'mosaic',
  'flicker',
  'vortex',
  'portal',
  'perspective-grid',
  'glitter-warp',
  'star-burst',
  'rotating-stars',
  'dot-shift',
  'synaptic-shift',
  'ascii-waves',
  'squircle-shift',
  'center-flow',
  'warp-twister',
  'neon-reveal',
  'agentic-ball',
  'black-hole',
  'blurred-rays',
  'flame-paths',
  'frame-border',
  'gradient-bars',
  'halftone-vortex',
  'halftone-wave',
  'liquid-ascii',
  'metallic-swirl',
  'retro-lines',
  'rubber-fluid',
  'simple-swirl',
  'square-matrix',
  'star-swipe',
  'swirl-blend',
  'text-cube',
  'watercolor',
] as const;
export type BackgroundEffect = (typeof BACKGROUND_EFFECTS)[number];

export const TEXT_EFFECTS = [
  'none',
  'staggered-text',
  'glitch-text',
  'text-path',
  '3d-text-reveal',
  'particle-text',
  'text-scatter',
  '3d-letter-swap',
  'blur-highlight',
  'dia-reveal',
  'shine-sweep',
  'gradient-flow',
] as const;
export type TextEffect = (typeof TEXT_EFFECTS)[number];

export const CURSOR_EFFECTS = [
  'none',
  'smooth-cursor',
  'custom-cursor',
  'dither-cursor',
  'ascii-cursor',
  'glass-cursor',
] as const;
export type CursorEffect = (typeof CURSOR_EFFECTS)[number];

export const CARD_EFFECTS = [
  'none',
  'shader-card',
  'chroma-card',
  'credit-card',
  'depth-card',
  'modal-cards',
  'rotating-cards',
  'parallax-cards',
  'click-stack',
  'warped-card',
] as const;
export type CardEffect = (typeof CARD_EFFECTS)[number];

export const GALLERY_EFFECTS = [
  'none',
  'circle-gallery',
  'gradient-carousel',
  'circles',
  'draggable-grid',
  'animated-list',
  'comparison-slider',
  'hover-preview',
  'infinite-gallery',
] as const;
export type GalleryEffect = (typeof GALLERY_EFFECTS)[number];

export const BLOCK_VARIANTS = [
  'classic',
  'pro-aurora',
  'pro-magnetic',
  'pro-neon',
  'pro-silk',
  'pro-grain',
  'pro-halftone',
  'pro-metallic',
  'pro-bars',
  'pro-chroma',
] as const;
export type BlockVariant = (typeof BLOCK_VARIANTS)[number];

export const BLOCK_TYPES_WITH_VARIANTS = [
  'hero',
  'banner',
  'gallery',
  'inquireCta',
] as const satisfies readonly BlockType[];
export type BlockTypeWithVariant = (typeof BLOCK_TYPES_WITH_VARIANTS)[number];

export function isVariantBlock(type: BlockType): type is BlockTypeWithVariant {
  return (BLOCK_TYPES_WITH_VARIANTS as readonly BlockType[]).includes(type);
}

export type Block<T extends BlockType = BlockType> = {
  /** crypto.randomUUID — stable across saves, used for DnD keying */
  id: string;
  type: T;
  /** Type-checked at runtime by the matching schema in `schemas.ts` */
  props: Record<string, unknown>;
  style?: BlockStyle;
};

export type ThemeOverrides = {
  /** Forces a palette swap from the storefront's stored palette. */
  palette?: PaletteId;
  /** Page-wide background override; falls back to palette ground. */
  pageBg?: string;
  backgroundEffect?: BackgroundEffect;
  cursorEffect?: CursorEffect;
  headingWeight?: 400 | 500 | 600;
  sectionSpacing?: 'tight' | 'comfortable' | 'spacious';
  /** Store policy section layout above the storefront footer. */
  policyDisplayMode?: 'full' | 'columns';
  /**
   * How the public storefront should respond to the visitor's theme cookie.
   *  - `auto` (default): storefront follows visitor's light/dark preference.
   *  - `light`: storefront is theme-locked to the light triplet.
   *  - `dark`: storefront is theme-locked to the dark triplet.
   * Only affects the public site; the dashboard always honours the owner's pick.
   */
  themeBehaviour?: 'auto' | 'light' | 'dark';
  /**
   * Storefront-wide buyer chrome selected from Site settings. This controls
   * the public nav/footer/sidebar/cart treatments without needing per-page
   * blocks or a schema migration.
   */
  commerceChrome?: StorefrontChromeConfig;
  seo?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
};

// ============================================================================
// Per-block prop shapes — exported for inspector forms and renderer typing.
// Keep these in lockstep with the Zod schemas in `schemas.ts`.
// ============================================================================

export type HeroProps = {
  eyebrow?: string;
  title: string;
  tagline?: string;
  layout: 'centered' | 'inline' | 'banner';
  /** Optional background image URL, blob-uploaded. */
  backgroundUrl?: string;
  /**
   * Optional CSS `background` shorthand string from the pattern
   * library (`src/lib/blocks/backgroundPatterns.ts`). Wins over
   * `backgroundUrl` when both are present so a freshly-picked pattern
   * never silently competes with an old uploaded image. The inspector
   * mutually clears one when the founder picks the other; this guard
   * is a belt-and-braces fallback for anything that bypassed it.
   */
  backgroundCss?: string;
  /**
   * Optional `background-size` override that pairs with
   * `backgroundCss`. Most patterns embed the size inline via
   * shorthand, so this is rare; supply it when a pattern's shorthand
   * is just an image and you need a separate size declaration.
   */
  backgroundCssSize?: string;
  /** Legacy on/off toggle. Superseded by `logoMode` when present. */
  showLogo?: boolean;
  /** Legacy on/off toggle. Superseded by `glyphMode` when present. */
  showGlyph?: boolean;
  showFounder?: boolean;
  /**
   * Three-state control for the avatar/logo slot rendered at the top of the
   * hero. `default` = use storefront.logoUrl (or auto first-letter monogram);
   * `custom` = use this block's `logoUrl` instead; `hide` = render nothing.
   */
  logoMode?: 'hide' | 'default' | 'custom';
  /** Custom logo image URL when `logoMode === 'custom'`. */
  logoUrl?: string;
  /**
   * Three-state control for the type-glyph slot. `default` = auto type-glyph
   * derived from businessType; `custom` = upload an image OR override with
   * 1–4 letters; `hide` = render nothing.
   */
  glyphMode?: 'hide' | 'default' | 'custom';
  /** Custom monogram image URL when `glyphMode === 'custom'`. */
  glyphUrl?: string;
  /** Custom letters (1–4 chars) when `glyphMode === 'custom'` and no `glyphUrl`. */
  glyphText?: string;
  cta?: Cta;
};

export type Cta = {
  label: string;
  href: string;
  /**
   * Optional in-page anchor target. When set, the CTA renders as `#b-<id>`
   * and wins over `href`. Smooth scroll is handled by the storefront's
   * global `scroll-behavior: smooth`.
   */
  scrollTo?: string;
};

export type BannerProps = {
  imageUrl: string;
  alt?: string;
  overlayTitle?: string;
  overlaySubtitle?: string;
  align?: 'start' | 'center' | 'end';
  /** Tints the image so overlay text stays readable. */
  scrim?: 'none' | 'soft' | 'strong';
  cta?: Cta;
};

export type TextProps = {
  eyebrow?: string;
  heading?: string;
  body: string;
  align?: 'start' | 'center' | 'end';
  /** Wraps the body in a serif italic for editorial pull-quote feel. */
  emphasis?: 'plain' | 'serif';
};

export type ImageProps = {
  imageUrl: string;
  alt?: string;
  caption?: string;
  aspect: '1/1' | '4/3' | '4/5' | '3/4' | '16/9' | 'auto';
  width?: 'narrow' | 'wide' | 'full';
};

export type GalleryItem = {
  imageUrl: string;
  alt?: string;
  caption?: string;
};

export type GalleryProps = {
  items: GalleryItem[];
  columns: 2 | 3 | 4;
  aspect: '1/1' | '4/5' | '3/4' | 'auto';
};

export type ProductGridProps = {
  layout: 'cards' | 'minimal' | 'lookbook';
  columns: 2 | 3 | 4;
  /** Optional category filter — only products matching are shown. */
  category?: string;
  /**
   * Optional category-table filter. When set AND the renderer's
   * categories context resolves the slug to a set of product ids, the
   * grid is filtered by membership in that set — first-class category
   * resolution. Falls back to `category` (free-text) when the slug
   * isn't found, so legacy stored rows keep rendering.
   */
  categorySlug?: string;
  /** Optional cap. Empty/undefined = no cap. */
  limit?: number;
  showInquire?: boolean;
};

export type ProductListProps = {
  groupByCategory?: boolean;
  showImages?: boolean;
  showPrices?: boolean;
  category?: string;
  /** See `ProductGridProps.categorySlug` — same resolution rules. */
  categorySlug?: string;
  limit?: number;
};

export type FeaturedProductProps = {
  /** Product id; if missing the renderer picks the first active product. */
  productId?: string;
  /**
   * Optional category-table filter applied when `productId` is missing.
   * The renderer picks the first active product within the resolved
   * category set; if the slug isn't found in the categories context,
   * falls back to the un-scoped first-active product.
   */
  categorySlug?: string;
  layout: 'split' | 'stacked';
};

/**
 * One row inside a ServiceList block when the founder authors services
 * inline (i.e. without backing them with a Product row). The shape is a
 * deliberate subset of `Product` so the renderer can treat both kinds
 * uniformly. `id` is a stable nanoid generated by the inspector; it is
 * not a UUID and is not joined against the products table.
 */
export type ServiceItem = {
  id: string;
  title: string;
  description?: string;
  priceQar?: number;
  status?: 'active' | 'sold_out';
};

export type ServiceListProps = {
  category?: string;
  limit?: number;
  showInquire?: boolean;
  /**
   * Optional inline service rows authored directly on the block. When
   * non-empty, the renderer ignores `products` + `category` filtering
   * and shows these rows verbatim. Founders without a stocked products
   * table can still ship a service menu this way.
   */
  items?: ServiceItem[];
  /** Optional eyebrow above the rows (defaults to vocabulary.offerLabel). */
  heading?: string;
};

/**
 * One row inside an inline-authored Menu block. When `MenuProps.items`
 * is non-empty the renderer ignores the products table and renders these
 * verbatim — useful for templates (Maison) that want to ship a fully
 * populated menu before any products exist.
 *
 * `titleAlt` is the bilingual companion (e.g. Arabic when `title` is
 * English). Renderers display it as a small caption beneath the primary
 * title; pure-Arabic stores can just leave it blank.
 */
export type MenuItem = {
  id: string;
  title: string;
  titleAlt?: string;
  description?: string;
  category?: string;
  priceQar?: number;
  status?: 'active' | 'sold_out';
};

export type MenuProps = {
  category?: string;
  /** See `ProductGridProps.categorySlug` — same resolution rules. */
  categorySlug?: string;
  groupByCategory?: boolean;
  limit?: number;
  items?: MenuItem[];
  heading?: string;
};

/**
 * One bookable slot inside an inline-authored Calendar block. When
 * `CalendarProps.slots` is non-empty the renderer renders these instead
 * of dated products — used by templates (Studio) that want a real
 * agenda before any product rows exist.
 */
export type CalendarSlot = {
  id: string;
  /** ISO `yyyy-mm-dd`; renderers parse and group by date. */
  date: string;
  /** Free-form clock label, e.g. `09:00` or `09:00 – 10:30`. */
  time?: string;
  label: string;
  capacity?: number;
  status?: 'open' | 'limited' | 'full';
};

export type CalendarProps = {
  category?: string;
  limit?: number;
  slots?: CalendarSlot[];
  heading?: string;
};

export type ContactCardProps = {
  showPhone?: boolean;
  showArea?: boolean;
  showHours?: boolean;
  showInstagram?: boolean;
  /** Optional override of the auto-generated section eyebrow. */
  label?: string;
  /** Optional larger heading rendered above the practical card. */
  heading?: string;
  /** Optional editorial body paragraph rendered above the practical card. */
  body?: string;
  /**
   * Per-block content overrides. Each one wins over the storefront row
   * (set via /account/<slug>/edit) when present. Empty / missing →
   * fall back to the storefront value. Useful for blocks that want to
   * surface a different number, address, or hours from the canonical
   * profile (e.g. an event pop-up, a project-specific contact line).
   */
  phone?: string;
  area?: string;
  hours?: string;
  instagram?: string;
};

export type InquireCtaProps = {
  /** Optional override of the default localized button copy. */
  label?: string;
  variant?: 'primary' | 'ghost';
  /** Optional editorial framing above the CTA button. */
  eyebrow?: string;
  title?: string;
  body?: string;
  align?: 'start' | 'center' | 'end';
};

/**
 * Souqna Activities panel — the storefront surface for the booking /
 * matbakh (F&B) / tailoring plugins. Renders the buyer flow for one
 * installed activity and hands the result to the cart → checkout.
 */
export type ActivityPanelProps = {
  /** Which installed activity plugin this panel drives. When unset, the
   *  first installed activity is used. */
  appId?: 'booking' | 'matbakh' | 'tailoring';
  title?: string;
  titleAr?: string;
};

export type SpacerProps = {
  size: 'sm' | 'md' | 'lg' | 'xl';
};

export type DividerProps = {
  /** When `true`, draws a small accent dot in the middle of the rule. */
  glyph?: boolean;
  width?: 'narrow' | 'wide' | 'full';
};

export type Showcase1Item = {
  id?: string;
  title: string;
  subtitle?: string;
  kicker?: string;
  imageUrl: string;
  href?: string;
};

export type Showcase1Props = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: Showcase1Item[];
};

export type Showcase2Image = {
  id?: string;
  imageUrl: string;
  alt?: string;
  height?: 'sm' | 'md' | 'lg';
};

export type Showcase2Props = {
  eyebrow?: string;
  title?: string;
  cta?: Cta;
  items?: Showcase2Image[];
};

export type Showcase3Item = {
  id?: string;
  title: string;
  category?: string;
  imageUrl: string;
};

export type Showcase3Props = {
  title?: string;
  subtitle?: string;
  items?: Showcase3Item[];
};

export type Showcase4Project = {
  id?: string;
  title: string;
  client?: string;
  year?: string;
  tags?: string[];
  imageUrl?: string;
  href?: string;
};

export type Showcase4Props = {
  eyebrow?: string;
  title?: string;
  projects?: Showcase4Project[];
};

export type Showcase5Tab = {
  id?: string;
  label: string;
  images: string[];
};

export type Showcase5Props = {
  eyebrow?: string;
  title?: string;
  description?: string;
  tabs?: Showcase5Tab[];
};

export type EcommerceColor = {
  name: string;
  value: string;
  imageUrl?: string;
};

export type EcommerceSize = {
  label: string;
  available?: boolean;
};

export type EcommerceProduct = {
  id?: string;
  name: string;
  price?: string;
  priceQar?: number | null;
  brand?: string;
  category?: string;
  tag?: string;
  imageUrl?: string;
  images?: string[];
  description?: string;
  details?: string[];
  colors?: EcommerceColor[];
  sizes?: EcommerceSize[];
  href?: string;
  available?: boolean;
  status?: 'active' | 'draft' | 'sold_out';
  createdAt?: string;
  isCustomizable?: boolean;
  customizationLabel?: string | null;
  allowCustomSize?: boolean;
  variantOptions?: string[];
  sizeOptionPrices?: Array<{ label: string; priceDeltaQar: number }>;
  variantOptionPrices?: Array<{ label: string; priceDeltaQar: number }>;
  requiresHeightInput?: boolean;
  heightInputLabel?: string | null;
  heightOptions?: string[];
};

export type EcommerceCategory = {
  id?: string;
  label: string;
  tag?: string;
  imageUrl?: string;
  href?: string;
};

export type CommerceCardConfig = {
  showCategory?: boolean;
  showBrand?: boolean;
  showDescription?: boolean;
  showWishlist?: boolean;
  showOptions?: boolean;
  showSalePrice?: boolean;
  ctaMode?: 'direct_add' | 'quick_view' | 'product_page';
  ctaStyle?: 'solid' | 'outline' | 'ghost';
};

export type FilterableShopConfig = {
  productSource?: CommerceProductSource;
  filters?: {
    enabled?: boolean;
    layout?: 'sidebar' | 'topbar';
    groups?: CommerceFilterGroup[];
    autoGenerate?: boolean;
    hideEmptyOptions?: boolean;
    showSidebar?: boolean;
    showMobileDrawer?: boolean;
  };
  card?: CommerceCardConfig;
};

export type TabbedProductsConfig = {
  tabs?: CommerceTab[];
  allTab?: {
    enabled?: boolean;
    mode?: 'combined_tabs' | 'all_products' | 'manual';
    productIds?: string[];
  };
  emptyTabBehavior?: 'hide' | 'empty_state' | 'fallback_all';
  card?: CommerceCardConfig;
};

export type VisualCategoryTile = {
  id: string;
  labelEn?: string;
  labelAr?: string;
  eyebrowEn?: string;
  eyebrowAr?: string;
  imageUrl?: string;
  badge?: {
    labelEn?: string;
    labelAr?: string;
    tone?: 'maroon' | 'gold' | 'black' | 'green' | 'red';
    position?: 'top-left' | 'top-right' | 'floating' | 'inline';
  };
  destination?: {
    type?: 'category' | 'tag' | 'manual_products' | 'page' | 'external';
    category?: string | null;
    tag?: string | null;
    productIds?: string[];
    pageSlug?: string | null;
    url?: string | null;
  };
};

export type VisualCategoryTilesConfig = {
  tabs?: Array<{
    id: string;
    labelEn?: string;
    labelAr?: string;
    tileIds?: string[];
  }>;
  tiles?: VisualCategoryTile[];
  behavior?: {
    showTabs?: boolean;
    clickAction?: 'navigate' | 'filter_products' | 'scroll_to_products' | 'open_collection_drawer';
    overlayStyle?: 'dark_gradient' | 'light_overlay' | 'minimal' | 'framed';
    allTab?: 'show_all' | 'combined_tabs' | 'hidden';
  };
};

export type EcommerceBlockProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta?: Cta;
  productIds?: string[];
  products?: EcommerceProduct[];
  categories?: EcommerceCategory[];
  tabs?: string[];
  productSource?: CommerceProductSource;
  filterable?: FilterableShopConfig;
  tabbed?: TabbedProductsConfig;
  tilesConfig?: VisualCategoryTilesConfig;
};

export type Ecommerce1Props = EcommerceBlockProps;
export type Ecommerce2Props = EcommerceBlockProps;
export type Ecommerce3Props = EcommerceBlockProps;
export type Ecommerce4Props = EcommerceBlockProps;
export type Ecommerce5Props = EcommerceBlockProps;
export type Ecommerce6Props = EcommerceBlockProps;
export type Ecommerce7Props = EcommerceBlockProps;

export const SHADCN_NAVBAR_VARIANTS = ['ecommerce-navbar2'] as const;
export const SHADCN_HERO_VARIANTS = ['ecommerce-hero1', 'ecommerce-hero3', 'ecommerce-hero6'] as const;
export const SHADCN_TRUST_STRIP_VARIANTS = ['trust-strip1', 'trust-strip3'] as const;
export const SHADCN_CATEGORY_VARIANTS = [
  'product-categories2',
  'product-categories4',
  'product-categories5',
] as const;
export const SHADCN_PRODUCT_CARD_VARIANTS = ['product-card10', 'product-card24'] as const;
export const SHADCN_PRODUCT_LIST_VARIANTS = [
  'product-list2',
  'product-list3',
  'product-list4',
  'product-list5',
  'product-list6',
  'product-list7',
] as const;
export const SHADCN_PRODUCT_DETAIL_VARIANTS = [
  'product-detail2',
  'product-detail3',
  'product-detail4',
  'product-detail6',
  'product-detail9',
] as const;
export const SHADCN_QUICK_VIEW_VARIANTS = ['product-quick-view7', 'product-quick-view8'] as const;
export const SHADCN_REVIEWS_VARIANTS = ['reviews2', 'reviews9', 'reviews23'] as const;
export const SHADCN_ORDER_SUMMARY_VARIANTS = ['order-summary1', 'order-summary2'] as const;
export const SHADCN_OFFER_MODAL_VARIANTS = ['offer-modal1', 'offer-modal5'] as const;
export const SHADCN_FOOTER_VARIANTS = [
  'ecommerce-footer1',
  'ecommerce-footer2',
  'ecommerce-footer18',
] as const;

export type ShadcnNavbarVariant = (typeof SHADCN_NAVBAR_VARIANTS)[number];
export type ShadcnHeroVariant = (typeof SHADCN_HERO_VARIANTS)[number];
export type ShadcnTrustStripVariant = (typeof SHADCN_TRUST_STRIP_VARIANTS)[number];
export type ShadcnCategoryVariant = (typeof SHADCN_CATEGORY_VARIANTS)[number];
export type ShadcnProductCardVariant = (typeof SHADCN_PRODUCT_CARD_VARIANTS)[number];
export type ShadcnProductListVariant = (typeof SHADCN_PRODUCT_LIST_VARIANTS)[number];
export type ShadcnProductDetailVariant = (typeof SHADCN_PRODUCT_DETAIL_VARIANTS)[number];
export type ShadcnQuickViewVariant = (typeof SHADCN_QUICK_VIEW_VARIANTS)[number];
export type ShadcnReviewsVariant = (typeof SHADCN_REVIEWS_VARIANTS)[number];
export type ShadcnOrderSummaryVariant = (typeof SHADCN_ORDER_SUMMARY_VARIANTS)[number];
export type ShadcnOfferModalVariant = (typeof SHADCN_OFFER_MODAL_VARIANTS)[number];
export type ShadcnFooterVariant = (typeof SHADCN_FOOTER_VARIANTS)[number];

export type ShadcnCommerceBaseProps = EcommerceBlockProps & {
  kicker?: string;
  note?: string;
  density?: 'compact' | 'balanced' | 'editorial';
  tone?: 'sand' | 'maroon' | 'charcoal' | 'gold';
};

export type ShadcnNavbarProps = ShadcnCommerceBaseProps & {
  variant: ShadcnNavbarVariant;
  sticky?: boolean;
  announcement?: string;
  ctaLabel?: string;
  ctaHref?: string;
  showSearch?: boolean;
  showPolicyLinks?: boolean;
  cartLabel?: string;
};
export type ShadcnHeroProps = ShadcnCommerceBaseProps & { variant: ShadcnHeroVariant };
export type ShadcnTrustStripProps = ShadcnCommerceBaseProps & {
  variant: ShadcnTrustStripVariant;
  metrics?: Array<{ labelEn?: string; labelAr?: string; value?: string; icon?: string }>;
};
export type ShadcnCategoriesProps = ShadcnCommerceBaseProps & { variant: ShadcnCategoryVariant };
export type ShadcnProductCardProps = ShadcnCommerceBaseProps & { variant: ShadcnProductCardVariant };
export type ShadcnProductListProps = ShadcnCommerceBaseProps & { variant: ShadcnProductListVariant };
export type ShadcnProductDetailProps = ShadcnCommerceBaseProps & {
  variant: ShadcnProductDetailVariant;
  productId?: string;
};
export type ShadcnQuickViewProps = ShadcnCommerceBaseProps & {
  variant: ShadcnQuickViewVariant;
  productId?: string;
};
export type ShadcnReviewsProps = ShadcnCommerceBaseProps & {
  variant: ShadcnReviewsVariant;
  reviews?: Array<{
    nameEn?: string;
    nameAr?: string;
    quoteEn?: string;
    quoteAr?: string;
    rating?: number;
    productId?: string;
  }>;
};
export type ShadcnOrderSummaryProps = ShadcnCommerceBaseProps & {
  variant: ShadcnOrderSummaryVariant;
};
export type ShadcnOfferModalProps = ShadcnCommerceBaseProps & {
  variant: ShadcnOfferModalVariant;
  discountLabel?: string;
  delayMs?: number;
};
export type ShadcnFooterProps = ShadcnCommerceBaseProps & {
  variant: ShadcnFooterVariant;
  showNewsletter?: boolean;
};

/**
 * Limited-edition / timed-drop block, owned by the `drop-manager`
 * marketplace plugin. The block resolves its content from `app_state`
 * at render time (not from `props`) so the founder can edit drops in
 * the dashboard without re-publishing the page. The `dropId` here is a
 * stable handle into `app_state` rows under (slug, 'drop-manager',
 * 'drop:<dropId>').
 */
export type DropProps = {
  /** Stable id assigned by the dashboard when the drop is created. */
  dropId: string;
  /** Optional in-block override of the heading; falls back to the
   *  drop's own `heroCopy.{en,ar}`. */
  heading?: string;
  /** Optional one-line teaser shown above the countdown. */
  subheading?: string;
};

/**
 * Animated text block — a single headline / paragraph rendered with a
 * framer-motion preset. Pro-tier only; downgraded to a plain `text`
 * block at render time when the founder's plan no longer covers pro+.
 */
export const ANIMATED_TEXT_EFFECTS = ['kinetic', 'typewriter', 'wave', 'reveal', 'glitch'] as const;
export type AnimatedTextEffect = (typeof ANIMATED_TEXT_EFFECTS)[number];

export type AnimatedTextProps = {
  /** The animated copy. Single field — multiline is rendered word-wise. */
  text: string;
  /** Optional eyebrow rendered above the animation. */
  eyebrow?: string;
  effect: AnimatedTextEffect;
  /** Loop continuously vs. play once on enter (default: once on enter). */
  loop?: boolean;
  /** Animation pace. `medium` is the default. */
  speed?: 'slow' | 'medium' | 'fast';
  align?: 'start' | 'center' | 'end';
  /** Visual emphasis. `display` = oversized serif, `body` = sans paragraph. */
  emphasis?: 'display' | 'body';
};

/**
 * Animated image block — a single image with a motion treatment.
 * Pro-tier only; downgraded to a plain `image` block at render time
 * when the founder's plan no longer covers pro+.
 */
export const ANIMATED_IMAGE_EFFECTS = ['parallax', 'magnetic', 'kenburns', 'tilt'] as const;
export type AnimatedImageEffect = (typeof ANIMATED_IMAGE_EFFECTS)[number];

export type AnimatedImageProps = {
  imageUrl: string;
  alt?: string;
  caption?: string;
  effect: AnimatedImageEffect;
  intensity?: 'subtle' | 'medium' | 'strong';
  aspect?: '1/1' | '4/3' | '4/5' | '3/4' | '16/9' | 'auto';
  width?: 'narrow' | 'wide' | 'full';
};

/**
 * Stacked product card. A single product surfaced as a foreground card
 * with one or two cards peeking behind it; on hover the back cards fan
 * outward (rotation + translate along the inline-end axis). Pro-tier
 * only — `saveDraftBlocks` rewrites this to a plain `featuredProduct`
 * (split layout) when the founder's plan can't reach pro, so stored
 * drafts survive a churn-down without breaking the page.
 *
 * `productId` is optional: when missing the renderer falls back to the
 * first active product (same convention as `featuredProduct`), so the
 * block isn't blank on a fresh storefront. `categorySlug` narrows the
 * fallback pool when set.
 */
export type ProductCardStackProps = {
  productId?: string;
  categorySlug?: string;
  /** Number of back cards peeking behind the front card. Default: 1. */
  backCards?: 1 | 2;
  /** Optional eyebrow override. Falls back to the product's category. */
  eyebrow?: string;
  /** Optional CTA label override. Falls back to the localized "View" label. */
  ctaLabel?: string;
  /** Optional in-page anchor target for the arrow CTA. */
  scrollTo?: string;
};

/**
 * Single image rendered as a card that lifts and tilts on hover. The
 * tilt direction is a deliberate authoring choice (left / right /
 * none) rather than a cursor-following 3D parallax — that's what
 * `animatedImage` with `effect: 'tilt'` already covers. Optional
 * headline + subhead overlay sits on top of the image, with a soft
 * scrim so the copy stays legible on busy photography.
 *
 * Pro-tier only — `saveDraftBlocks` rewrites this row to a plain
 * `image` at save time when the founder's plan can't reach pro, so
 * the stored draft never breaks on churn-down.
 */
export type TiltImageProps = {
  /** Image URL — empty allowed while the founder hasn't uploaded yet. */
  imageUrl: string;
  alt?: string;
  /** Optional headline overlaid on the image. */
  title?: string;
  /** Optional subhead rendered below the headline. */
  subtitle?: string;
  /** Tint behind the overlay text so headlines stay legible. */
  scrim?: 'none' | 'soft' | 'strong';
  /** Which corner lifts when the card tilts. `none` = pure lift, no tilt. */
  tiltDirection?: 'left' | 'right' | 'none';
  /** Lift + tilt strength. */
  intensity?: 'subtle' | 'medium' | 'strong';
  aspect?: '1/1' | '4/3' | '4/5' | '3/4' | '16/9' | 'auto';
  width?: 'narrow' | 'wide' | 'full';
  /** Optional CTA — when set, hovering also nudges a small chip in. */
  cta?: Cta;
};

/**
 * Spotlight content card. Bold accent fill, an optional decorative
 * pattern strip (stripes / dots), an optional editable date badge in
 * the top corner, and a staggered "rise" of inner copy on hover. The
 * whole card sits on a slight resting tilt and lifts further on hover
 * — same `tiltDirection` vocabulary as `tiltImage` so the two
 * pro-blocks compose cleanly on a single page.
 *
 * Pro-tier only — `saveDraftBlocks` rewrites this row to a plain
 * `text` at save time when the founder's plan can't reach pro.
 */
/**
 * Single-product promo card. Bound to a product picked from the
 * founder's catalogue (with `categorySlug` to narrow the fallback
 * pool), with hover-revealed tag chips (e.g. `NEW`, `SALE`,
 * `LIMITED`), and an Add-to-Cart "+" button that hits the existing
 * cart island. Pro-tier — `saveDraftBlocks` rewrites this row to a
 * plain `featuredProduct` (split layout) at save time when the
 * founder's plan can't reach pro, preserving the picked product.
 */
export type PromoCardTag = {
  /** Stable nanoid from the inspector — used for React keys. */
  id: string;
  label: string;
  /** Optional CSS colour for the chip text (default white-ish). */
  color?: string;
  /** Optional CSS colour for the chip background (default `--sf-accent`). */
  background?: string;
};

export type ProductPromoCardProps = {
  productId?: string;
  categorySlug?: string;
  /** 0–3 customizable tag chips shown in the image corner. */
  tags?: PromoCardTag[];
  /** Where the tags sit on the image. Default: `top-end`. */
  tagPosition?: 'top-start' | 'top-end';
  /** Reveal the tags `always` (visible at rest) or `on-hover`. */
  tagReveal?: 'always' | 'on-hover';
  /** When false, hides the Add-to-Cart "+" button. Default: true. */
  showAddToCart?: boolean;
  /** Optional CSS colour for the title / price (default `--sf-accent`). */
  accentColor?: string;
  /** Hover-lift strength. Default: `medium`. */
  intensity?: 'subtle' | 'medium' | 'strong';
  width?: 'narrow' | 'wide' | 'full';
};

export type SpotlightCardProps = {
  /** Optional uppercase eyebrow above the headline. */
  eyebrow?: string;
  title: string;
  /** Optional supporting paragraph. */
  body?: string;
  /** Optional CTA — renders as a small dark pill button. */
  cta?: Cta;

  /** When true, renders the corner date badge (default: true if
   *  either dateMonth or dateDay is set). */
  showDate?: boolean;
  /** Top line of the badge — e.g. "JUNE", "JUN 2026", or "MARCH". */
  dateMonth?: string;
  /** Bottom line of the badge — e.g. "29", "T-3", "11:00". */
  dateDay?: string;

  /** Decorative pattern in the top strip. `none` keeps the card flat. */
  pattern?: 'none' | 'stripes' | 'dots' | 'grid';

  /** Which corner lifts when the card tilts. `none` = pure lift. */
  tiltDirection?: 'left' | 'right' | 'none';
  /** Lift + tilt strength. */
  intensity?: 'subtle' | 'medium' | 'strong';

  /** Optional CSS colour override. Empty / unset = `var(--sf-accent)`. */
  accentColor?: string;

  /** Card width (matches the `image` block's vocabulary). */
  width?: 'narrow' | 'wide' | 'full';
};

export type AuroraRibbonProps = {
  eyebrow?: string;
  /** Main line over the aurora (optional). */
  title?: string;
  subtitle?: string;
  /** Viewport height band in px (120–320). */
  heightPx?: number;
  /** Master brightness 0.3–1.4 */
  brightness?: number;
};

export type PortalHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cta?: Cta;
  /** Compact keeps the portal as an editorial medallion; immersive fills more of the first viewport. */
  layout?: 'compact' | 'immersive';
  /** Souqna-owned colourway. Avoids arbitrary neon palettes in generated storefronts. */
  tone?: 'cream' | 'ink' | 'gold';
  /** Master brightness 0.4-1.2. */
  brightness?: number;
};

export type ShaderHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cta?: Cta;
  /** Compact = editorial band; immersive fills more of the first viewport. */
  layout?: 'compact' | 'immersive';
  /** Souqna-owned colourway. Avoids arbitrary neon in generated storefronts. */
  tone?: 'cream' | 'ink' | 'gold';
};

export type ProductSpotlight3dProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Legacy free-text category filter. */
  category?: string;
  /** Stable category handle; resolved against the categories context. */
  categorySlug?: string;
  /** How many products to spotlight. */
  limit?: number;
  /** Tilt + lift strength. */
  intensity?: 'subtle' | 'medium' | 'strong';
};

export type SocialProofReview = {
  quote: string;
  author: string;
  role?: string;
  quoteAr?: string;
  authorAr?: string;
  roleAr?: string;
};

export type SocialProofWallProps = {
  eyebrow?: string;
  title?: string;
  reviews: SocialProofReview[];
  /** Marquee speed. */
  speed?: 'slow' | 'medium' | 'fast';
};

export type CurvedLoopProps = {
  /** Text rendered repeatedly along the animated curve. */
  marqueeText: string;
  /** Animation speed in px per frame. */
  speed?: number;
  /** Curve depth. The renderer scales this down on tablet/mobile. */
  curveAmount?: number;
  direction?: 'left' | 'right';
  /** When true, visitors can drag the loop and reverse direction. */
  interactive?: boolean;
  /** Visual scale for the text band. */
  size?: 'compact' | 'standard' | 'hero';
  /** Souqna palette tone for the text. */
  tone?: 'ink' | 'accent' | 'gold' | 'muted';
};

/** Parallax marketing card — requires a real image URL for depth layers. */
export type DepthShowcaseProps = {
  imageUrl: string;
  title: string;
  description?: string;
  imageAlt?: string;
  /** Card max width vocabulary. */
  width?: 'narrow' | 'wide' | 'full';
};

/**
 * Mapping from BlockType → its props shape. Used by the renderer and
 * inspector to safely narrow a `Block` to its concrete props.
 */
export type BlockPropsByType = {
  hero: HeroProps;
  banner: BannerProps;
  text: TextProps;
  image: ImageProps;
  gallery: GalleryProps;
  productGrid: ProductGridProps;
  productList: ProductListProps;
  featuredProduct: FeaturedProductProps;
  serviceList: ServiceListProps;
  menu: MenuProps;
  calendar: CalendarProps;
  contactCard: ContactCardProps;
  inquireCta: InquireCtaProps;
  activityPanel: ActivityPanelProps;
  spacer: SpacerProps;
  divider: DividerProps;
  drop: DropProps;
  animatedText: AnimatedTextProps;
  animatedImage: AnimatedImageProps;
  productCardStack: ProductCardStackProps;
  tiltImage: TiltImageProps;
  spotlightCard: SpotlightCardProps;
  productPromoCard: ProductPromoCardProps;
  mawid: MawidBlockProps;
  taqim: TaqimBlockProps;
  depthShowcase: DepthShowcaseProps;
  auroraRibbon: AuroraRibbonProps;
  portalHero: PortalHeroProps;
  curvedLoop: CurvedLoopProps;
  showcase1: Showcase1Props;
  showcase2: Showcase2Props;
  showcase3: Showcase3Props;
  showcase4: Showcase4Props;
  showcase5: Showcase5Props;
  ecommerce1: Ecommerce1Props;
  ecommerce2: Ecommerce2Props;
  ecommerce3: Ecommerce3Props;
  ecommerce4: Ecommerce4Props;
  ecommerce5: Ecommerce5Props;
  ecommerce6: Ecommerce6Props;
  ecommerce7: Ecommerce7Props;
  shadcnNavbar: ShadcnNavbarProps;
  shadcnHero: ShadcnHeroProps;
  shadcnTrustStrip: ShadcnTrustStripProps;
  shadcnCategories: ShadcnCategoriesProps;
  shadcnProductCard: ShadcnProductCardProps;
  shadcnProductList: ShadcnProductListProps;
  shadcnProductDetail: ShadcnProductDetailProps;
  shadcnQuickView: ShadcnQuickViewProps;
  shadcnReviews: ShadcnReviewsProps;
  shadcnOrderSummary: ShadcnOrderSummaryProps;
  shadcnOfferModal: ShadcnOfferModalProps;
  shadcnFooter: ShadcnFooterProps;
  shaderHero: ShaderHeroProps;
  productSpotlight3d: ProductSpotlight3dProps;
  socialProofWall: SocialProofWallProps;
};

/**
 * Mawid (scheduled drops + countdowns) — owned by the `mawid`
 * marketplace plugin. The block carries only `eventId`; everything
 * else (target, schedule, countdown style, bilingual labels) is
 * resolved live from `app_state` at (slug, 'mawid', 'settings') so the
 * founder can edit a moment in the dashboard without re-publishing
 * the page.
 */
export type MawidBlockProps = {
  /** Stable id of the Mawid event in `app_state`. Empty means this
   *  block uses its own product/time controls. */
  eventId?: string;
  /** Optional product to spotlight alongside the countdown. */
  productId?: string;
  /** Direct block-level countdown time. Useful for fast builder edits
   *  without opening Apps → Mawid settings. */
  startsAt?: string;
  /** Three block-level visual variants exposed in the builder. */
  variant?: 'boxed' | 'inline' | 'banner';
  /** Optional in-block override of the heading; falls back to the
   *  event's own bilingual label or the default per-phase copy. */
  heading?: string;
  /** Optional in-block subheading rendered above the countdown. */
  subheading?: string;
};

/**
 * Taqim (bundles & complete-the-look) — owned by the `taqim`
 * marketplace plugin. The block carries an optional `bundleId`; when
 * empty, the renderer auto-picks the first bundle whose
 * `anchorProductIds` contains the current page's `featuredProductId`
 * if the founder has set one on the page (otherwise the first enabled
 * bundle wins).
 */
export type TaqimBlockProps = {
  /** Optional bundle id; empty means "auto-pick the first enabled bundle". */
  bundleId?: string;
  /** Optional product id used for "complete the look" anchoring when
   *  the page itself isn't a PDP. The renderer prefers a bundle whose
   *  `anchorProductIds` contains this id. */
  anchorProductId?: string;
  /** Per-block visual variant. Defaults to the app setting when empty. */
  variant?: 'stack' | 'cards' | 'carousel';
  /** Optional in-block override of the headline; falls back to the
   *  bundle's own bilingual title. */
  heading?: string;
  /** Builder-authored bundle with real product IDs and existing cart actions. */
  bundle?: {
    titleEn?: string;
    titleAr?: string;
    badge?: {
      labelEn?: string;
      labelAr?: string;
      tone?: 'maroon' | 'gold' | 'black' | 'green' | 'red';
      position?: 'top-left' | 'top-right' | 'floating' | 'inline';
    };
    items?: Array<{
      productId: string;
      required?: boolean;
      defaultOptionValue?: string | null;
      buyerCanChooseOption?: boolean;
      badgeEn?: string;
      badgeAr?: string;
    }>;
    pricing?: {
      mode?:
        | 'auto_total'
        | 'percent_discount'
        | 'fixed_discount'
        | 'fixed_bundle_price'
        | 'display_only';
      percentOff?: number | null;
      fixedDiscountQar?: number | null;
      fixedBundlePriceQar?: number | null;
      showSavings?: boolean;
    };
    cta?: {
      mode?: 'add_all' | 'add_selected';
      labelEn?: string;
      labelAr?: string;
      showPerProductButtons?: boolean;
    };
  };
};
