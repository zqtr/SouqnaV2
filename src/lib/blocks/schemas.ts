import { z } from 'zod';
import { PALETTE_IDS } from '@/lib/palettes';
import {
  ANIMATED_IMAGE_EFFECTS,
  ANIMATED_TEXT_EFFECTS,
  BACKGROUND_EFFECTS,
  BLOCK_TYPES,
  BLOCK_VARIANTS,
  CARD_EFFECTS,
  CURSOR_EFFECTS,
  GALLERY_EFFECTS,
  SHADCN_CATEGORY_VARIANTS,
  SHADCN_FOOTER_VARIANTS,
  SHADCN_HERO_VARIANTS,
  SHADCN_NAVBAR_VARIANTS,
  SHADCN_OFFER_MODAL_VARIANTS,
  SHADCN_ORDER_SUMMARY_VARIANTS,
  SHADCN_PRODUCT_CARD_VARIANTS,
  SHADCN_PRODUCT_DETAIL_VARIANTS,
  SHADCN_PRODUCT_LIST_VARIANTS,
  SHADCN_QUICK_VIEW_VARIANTS,
  SHADCN_REVIEWS_VARIANTS,
  SHADCN_TRUST_STRIP_VARIANTS,
  TEXT_EFFECTS,
} from './types';
import {
  STOREFRONT_CART_VARIANTS,
  STOREFRONT_FOOTER_VARIANTS,
  STOREFRONT_NAVBAR_VARIANTS,
  STOREFRONT_SIDEBAR_VARIANTS,
} from '@/lib/storefrontChrome';

/**
 * Zod is the single source of truth for what a block's props can look like.
 * Two consumers depend on it:
 *
 *   1. `saveDraftBlocks` server action validates the entire `blocks[]` array
 *      against `blockSchema` before writing to JSONB, so a malicious client
 *      can't smuggle a `{type:'hero', props:{href:'javascript:...'}}` row.
 *   2. The Phase-2 inspector reads the schema for the selected block to
 *      auto-generate fields (which fields are optional, max length, enums).
 *
 * Keep prop names in lockstep with `types.ts`.
 */

// Padding can be a legacy named token OR a raw px number from the
// numeric stepper. Bounded to a generous 2000px so a typo doesn't blow
// out the page, but the inspector itself imposes no soft cap.
const paddingTokenY = z.enum(['none', 'sm', 'md', 'lg', 'xl']);
const paddingTokenX = z.enum(['none', 'sm', 'md', 'lg']);
const paddingValueY = z.union([paddingTokenY, z.number().int().min(0).max(2000)]);
const paddingValueX = z.union([paddingTokenX, z.number().int().min(0).max(2000)]);

// Per-side padding (Framer-style). Same upper bound as the legacy axis
// tokens so a stored row never blows out the page; the inspector imposes
// no soft cap so editorially-large heros remain achievable.
const sidePadding = z.number().int().min(0).max(2000);
// Bounded gap matches the same ceiling — flex/grid blocks rarely go past
// a few hundred px and we want JSON blobs to stay sane.
const gapValue = z.number().int().min(0).max(2000);

const styleSchema = z
  .object({
    paddingY: paddingValueY.optional(),
    paddingX: paddingValueX.optional(),
    bg: z.string().max(64).optional(),
    textColor: z.string().max(64).optional(),
    backgroundCss: z.string().trim().max(4096).optional(),
    backgroundCssSize: z.string().trim().max(120).optional(),
    backgroundEffect: z.enum(BACKGROUND_EFFECTS).optional(),
    textEffect: z.enum(TEXT_EFFECTS).optional(),
    cardEffect: z.enum(CARD_EFFECTS).optional(),
    galleryEffect: z.enum(GALLERY_EFFECTS).optional(),
    align: z.enum(['start', 'center', 'end']).optional(),
    colorScheme: z.enum(['inherit', 'light', 'dark']).optional(),

    // Layout primitives mirror BlockStyle in types.ts. All optional so
    // existing JSONB rows validate unchanged.
    display: z.enum(['block', 'flex', 'grid', 'hidden']).optional(),
    flexDirection: z.enum(['row', 'column', 'row-reverse', 'column-reverse']).optional(),
    flexWrap: z.enum(['nowrap', 'wrap', 'wrap-reverse']).optional(),
    justifyContent: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
    alignItems: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
    gap: gapValue.optional(),

    paddingTop: sidePadding.optional(),
    paddingRight: sidePadding.optional(),
    paddingBottom: sidePadding.optional(),
    paddingLeft: sidePadding.optional(),

    // Pro variant — gated server-side in `saveDraftBlocks` against the
    // caller's plan; here we only validate the shape. A non-Pro caller
    // who smuggles `pro-aurora` past the schema gets it silently
    // downgraded to `'classic'` before the row hits JSONB.
    variant: z.enum(BLOCK_VARIANTS).optional(),
  })
  .strict()
  .optional();

const ctaSchema = z
  .object({
    label: z.string().trim().min(1).max(60),
    href: z.string().trim().max(2048),
    /** Optional in-page anchor target (a block id on the same page). */
    scrollTo: z.string().trim().max(64).optional(),
  })
  .strict();

// ============================================================================
// Per-block prop schemas
// ============================================================================

const heroProps = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().min(1).max(200),
    tagline: z.string().trim().max(280).optional(),
    layout: z.enum(['centered', 'inline', 'banner']).default('centered'),
    backgroundUrl: z.string().trim().max(2048).optional(),
    // Pattern-library CSS background shorthand. Bounded generously to
    // accommodate inline SVG data-URIs (the "noise" patterns clock in
    // around 400 chars; multi-layer mesh patterns ~600). 4 KB leaves
    // headroom for future patterns without bloating JSONB rows.
    backgroundCss: z.string().trim().max(4096).optional(),
    backgroundCssSize: z.string().trim().max(120).optional(),
    showLogo: z.boolean().optional(),
    showGlyph: z.boolean().optional(),
    showFounder: z.boolean().optional(),
    logoMode: z.enum(['hide', 'default', 'custom']).optional(),
    logoUrl: z.string().trim().max(2048).optional(),
    glyphMode: z.enum(['hide', 'default', 'custom']).optional(),
    glyphUrl: z.string().trim().max(2048).optional(),
    glyphText: z.string().trim().max(4).optional(),
    cta: ctaSchema.optional(),
  })
  .strict();

const bannerProps = z
  .object({
    // Allow empty while the user hasn't uploaded yet — the renderer falls
    // back to a neutral placeholder. Required-on-publish is enforced by the
    // editor's draft → publish gate, not the persistence schema.
    imageUrl: z.string().trim().max(2048).default(''),
    alt: z.string().trim().max(200).optional(),
    overlayTitle: z.string().trim().max(160).optional(),
    overlaySubtitle: z.string().trim().max(280).optional(),
    align: z.enum(['start', 'center', 'end']).optional(),
    scrim: z.enum(['none', 'soft', 'strong']).optional(),
    cta: ctaSchema.optional(),
  })
  .strict();

const textProps = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    heading: z.string().trim().max(200).optional(),
    body: z.string().trim().min(1).max(4000),
    align: z.enum(['start', 'center', 'end']).optional(),
    emphasis: z.enum(['plain', 'serif']).optional(),
  })
  .strict();

const imageProps = z
  .object({
    // See bannerProps — empty allowed while the user hasn't uploaded yet.
    imageUrl: z.string().trim().max(2048).default(''),
    alt: z.string().trim().max(200).optional(),
    caption: z.string().trim().max(280).optional(),
    aspect: z.enum(['1/1', '4/3', '4/5', '3/4', '16/9', 'auto']).default('4/3'),
    width: z.enum(['narrow', 'wide', 'full']).optional(),
  })
  .strict();

const galleryProps = z
  .object({
    items: z
      .array(
        z
          .object({
            // Empty allowed while the slot is awaiting upload.
            imageUrl: z.string().trim().max(2048).default(''),
            alt: z.string().trim().max(200).optional(),
            caption: z.string().trim().max(160).optional(),
          })
          .strict(),
      )
      .max(60)
      .default([]),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
    aspect: z.enum(['1/1', '4/5', '3/4', 'auto']).default('1/1'),
  })
  .strict();

const productGridProps = z
  .object({
    layout: z.enum(['cards', 'minimal', 'lookbook']).default('cards'),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
    category: z.string().trim().max(80).optional(),
    categorySlug: z.string().trim().max(120).optional(),
    limit: z.number().int().positive().max(500).optional(),
    showInquire: z.boolean().optional(),
  })
  .strict();

const productListProps = z
  .object({
    groupByCategory: z.boolean().optional(),
    showImages: z.boolean().optional(),
    showPrices: z.boolean().optional(),
    category: z.string().trim().max(80).optional(),
    categorySlug: z.string().trim().max(120).optional(),
    limit: z.number().int().positive().max(500).optional(),
  })
  .strict();

const featuredProductProps = z
  .object({
    productId: z.string().uuid().optional(),
    categorySlug: z.string().trim().max(120).optional(),
    layout: z.enum(['split', 'stacked']).default('split'),
  })
  .strict();

const serviceItem = z
  .object({
    id: z.string().trim().min(1).max(64),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(560).optional(),
    priceQar: z.number().nonnegative().max(10_000_000).optional(),
    status: z.enum(['active', 'sold_out']).optional(),
  })
  .strict();

const serviceListProps = z
  .object({
    category: z.string().trim().max(80).optional(),
    limit: z.number().int().positive().max(500).optional(),
    showInquire: z.boolean().optional(),
    items: z.array(serviceItem).max(60).optional(),
    heading: z.string().trim().max(160).optional(),
  })
  .strict();

const menuItem = z
  .object({
    id: z.string().trim().min(1).max(64),
    title: z.string().trim().min(1).max(160),
    titleAlt: z.string().trim().max(160).optional(),
    description: z.string().trim().max(560).optional(),
    category: z.string().trim().max(80).optional(),
    priceQar: z.number().nonnegative().max(10_000_000).optional(),
    status: z.enum(['active', 'sold_out']).optional(),
  })
  .strict();

const menuProps = z
  .object({
    category: z.string().trim().max(80).optional(),
    categorySlug: z.string().trim().max(120).optional(),
    groupByCategory: z.boolean().optional(),
    limit: z.number().int().positive().max(500).optional(),
    items: z.array(menuItem).max(80).optional(),
    heading: z.string().trim().max(160).optional(),
  })
  .strict();

const calendarSlot = z
  .object({
    id: z.string().trim().min(1).max(64),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    time: z.string().trim().max(40).optional(),
    label: z.string().trim().min(1).max(160),
    capacity: z.number().int().nonnegative().max(10_000).optional(),
    status: z.enum(['open', 'limited', 'full']).optional(),
  })
  .strict();

const calendarProps = z
  .object({
    category: z.string().trim().max(80).optional(),
    limit: z.number().int().positive().max(500).optional(),
    slots: z.array(calendarSlot).max(120).optional(),
    heading: z.string().trim().max(160).optional(),
  })
  .strict();

const contactCardProps = z
  .object({
    showPhone: z.boolean().optional(),
    showArea: z.boolean().optional(),
    showHours: z.boolean().optional(),
    showInstagram: z.boolean().optional(),
    label: z.string().trim().max(80).optional(),
    heading: z.string().trim().max(160).optional(),
    body: z.string().trim().max(560).optional(),
    phone: z.string().trim().max(64).optional(),
    area: z.string().trim().max(120).optional(),
    hours: z.string().trim().max(160).optional(),
    instagram: z.string().trim().max(80).optional(),
  })
  .strict();

const inquireCtaProps = z
  .object({
    label: z.string().trim().max(60).optional(),
    variant: z.enum(['primary', 'ghost']).optional(),
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().max(160).optional(),
    body: z.string().trim().max(560).optional(),
    align: z.enum(['start', 'center', 'end']).optional(),
  })
  .strict();

const spacerProps = z
  .object({
    size: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
  })
  .strict();

const dividerProps = z
  .object({
    glyph: z.boolean().optional(),
    width: z.enum(['narrow', 'wide', 'full']).optional(),
  })
  .strict();

const dropProps = z
  .object({
    dropId: z.string().trim().min(1).max(64),
    heading: z.string().trim().max(160).optional(),
    subheading: z.string().trim().max(280).optional(),
  })
  .strict();

const animatedTextProps = z
  .object({
    text: z.string().trim().min(1).max(1000),
    eyebrow: z.string().trim().max(80).optional(),
    effect: z.enum(ANIMATED_TEXT_EFFECTS).default('reveal'),
    loop: z.boolean().optional(),
    speed: z.enum(['slow', 'medium', 'fast']).optional(),
    align: z.enum(['start', 'center', 'end']).optional(),
    emphasis: z.enum(['display', 'body']).optional(),
  })
  .strict();

const animatedImageProps = z
  .object({
    imageUrl: z.string().trim().max(2048).default(''),
    alt: z.string().trim().max(200).optional(),
    caption: z.string().trim().max(280).optional(),
    effect: z.enum(ANIMATED_IMAGE_EFFECTS).default('parallax'),
    intensity: z.enum(['subtle', 'medium', 'strong']).optional(),
    aspect: z.enum(['1/1', '4/3', '4/5', '3/4', '16/9', 'auto']).optional(),
    width: z.enum(['narrow', 'wide', 'full']).optional(),
  })
  .strict();

const productCardStackProps = z
  .object({
    productId: z.string().uuid().optional(),
    categorySlug: z.string().trim().max(120).optional(),
    backCards: z.union([z.literal(1), z.literal(2)]).optional(),
    eyebrow: z.string().trim().max(80).optional(),
    ctaLabel: z.string().trim().max(60).optional(),
    scrollTo: z.string().trim().max(64).optional(),
  })
  .strict();

const tiltImageProps = z
  .object({
    imageUrl: z.string().trim().max(2048).default(''),
    alt: z.string().trim().max(200).optional(),
    title: z.string().trim().max(160).optional(),
    subtitle: z.string().trim().max(280).optional(),
    scrim: z.enum(['none', 'soft', 'strong']).optional(),
    tiltDirection: z.enum(['left', 'right', 'none']).optional(),
    intensity: z.enum(['subtle', 'medium', 'strong']).optional(),
    aspect: z.enum(['1/1', '4/3', '4/5', '3/4', '16/9', 'auto']).optional(),
    width: z.enum(['narrow', 'wide', 'full']).optional(),
    cta: ctaSchema.optional(),
  })
  .strict();

const promoCardTag = z
  .object({
    id: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1).max(40),
    color: z.string().trim().max(64).optional(),
    background: z.string().trim().max(64).optional(),
  })
  .strict();

const productPromoCardProps = z
  .object({
    productId: z.string().uuid().optional(),
    categorySlug: z.string().trim().max(120).optional(),
    tags: z.array(promoCardTag).max(3).optional(),
    tagPosition: z.enum(['top-start', 'top-end']).optional(),
    tagReveal: z.enum(['always', 'on-hover']).optional(),
    showAddToCart: z.boolean().optional(),
    accentColor: z.string().trim().max(64).optional(),
    intensity: z.enum(['subtle', 'medium', 'strong']).optional(),
    width: z.enum(['narrow', 'wide', 'full']).optional(),
  })
  .strict();

const spotlightCardProps = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().max(560).optional(),
    cta: ctaSchema.optional(),
    showDate: z.boolean().optional(),
    dateMonth: z.string().trim().max(24).optional(),
    dateDay: z.string().trim().max(12).optional(),
    pattern: z.enum(['none', 'stripes', 'dots', 'grid']).optional(),
    tiltDirection: z.enum(['left', 'right', 'none']).optional(),
    intensity: z.enum(['subtle', 'medium', 'strong']).optional(),
    // Bounded so a typo doesn't blow out the JSONB row; CSS colour
    // strings rarely exceed ~32 chars (a hex/rgba/oklch literal).
    accentColor: z.string().trim().max(64).optional(),
    width: z.enum(['narrow', 'wide', 'full']).optional(),
  })
  .strict();

const mawidProps = z
  .object({
    eventId: z.string().trim().max(64).optional().default(''),
    productId: z.string().trim().max(120).optional(),
    startsAt: z.string().trim().max(80).optional(),
    variant: z.enum(['boxed', 'inline', 'banner']).optional(),
    heading: z.string().trim().max(160).optional(),
    subheading: z.string().trim().max(280).optional(),
  })
  .strict();

const taqimControlledBundle = z
  .object({
    titleEn: z.string().trim().max(160).optional(),
    titleAr: z.string().trim().max(160).optional(),
    badge: z
      .object({
        labelEn: z.string().trim().max(60).optional(),
        labelAr: z.string().trim().max(60).optional(),
        tone: z.enum(['maroon', 'gold', 'black', 'green', 'red']).optional(),
        position: z.enum(['top-left', 'top-right', 'floating', 'inline']).optional(),
      })
      .strict()
      .optional(),
    items: z
      .array(
        z
          .object({
            productId: z.string().trim().min(1).max(120),
            required: z.boolean().optional(),
            defaultOptionValue: z.string().trim().max(80).nullable().optional(),
            buyerCanChooseOption: z.boolean().optional(),
            badgeEn: z.string().trim().max(60).optional(),
            badgeAr: z.string().trim().max(60).optional(),
          })
          .strict(),
      )
      .max(12)
      .optional(),
    pricing: z
      .object({
        mode: z
          .enum([
            'auto_total',
            'percent_discount',
            'fixed_discount',
            'fixed_bundle_price',
            'display_only',
          ])
          .optional(),
        percentOff: z.number().min(0).max(100).nullable().optional(),
        fixedDiscountQar: z.number().min(0).max(10_000_000).nullable().optional(),
        fixedBundlePriceQar: z.number().min(0).max(10_000_000).nullable().optional(),
        showSavings: z.boolean().optional(),
      })
      .strict()
      .optional(),
    cta: z
      .object({
        mode: z.enum(['add_all', 'add_selected']).optional(),
        labelEn: z.string().trim().max(80).optional(),
        labelAr: z.string().trim().max(80).optional(),
        showPerProductButtons: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const taqimProps = z
  .object({
    bundleId: z.string().trim().max(64).optional(),
    anchorProductId: z.string().trim().max(120).optional(),
    variant: z.enum(['stack', 'cards', 'carousel']).optional(),
    heading: z.string().trim().max(160).optional(),
    bundle: taqimControlledBundle.optional(),
  })
  .strict();

const depthShowcaseProps = z
  .object({
    imageUrl: z.string().trim().min(1).max(2048),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(560).optional(),
    imageAlt: z.string().trim().max(180).optional(),
    width: z.enum(['narrow', 'wide', 'full']).optional(),
  })
  .strict();

const auroraRibbonProps = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().max(200).optional(),
    subtitle: z.string().trim().max(400).optional(),
    heightPx: z.number().int().min(120).max(320).optional(),
    brightness: z.number().min(0.3).max(1.4).optional(),
  })
  .strict();

const portalHeroProps = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().max(420).optional(),
    cta: ctaSchema.optional(),
    layout: z.enum(['compact', 'immersive']).optional(),
    tone: z.enum(['cream', 'ink', 'gold']).optional(),
    brightness: z.number().min(0.4).max(1.2).optional(),
  })
  .strict();

const curvedLoopProps = z
  .object({
    marqueeText: z.string().trim().min(1).max(260).default('Add Text Here'),
    speed: z.number().min(0.2).max(8).optional(),
    curveAmount: z.number().int().min(120).max(720).optional(),
    direction: z.enum(['left', 'right']).optional(),
    interactive: z.boolean().optional(),
    size: z.enum(['compact', 'standard', 'hero']).optional(),
    tone: z.enum(['ink', 'accent', 'gold', 'muted']).optional(),
  })
  .strict();

const showcase1Item = z
  .object({
    id: z.string().trim().max(64).optional(),
    title: z.string().trim().max(160).default(''),
    subtitle: z.string().trim().max(260).optional(),
    kicker: z.string().trim().max(80).optional(),
    imageUrl: z.string().trim().max(2048).default(''),
    href: z.string().trim().max(2048).optional(),
  })
  .strict();

const showcase1Props = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().max(220).optional(),
    description: z.string().trim().max(420).optional(),
    items: z.array(showcase1Item).max(8).optional(),
  })
  .strict();

const showcase2Image = z
  .object({
    id: z.string().trim().max(64).optional(),
    imageUrl: z.string().trim().max(2048).default(''),
    alt: z.string().trim().max(200).optional(),
    height: z.enum(['sm', 'md', 'lg']).optional(),
  })
  .strict();

const showcase2Props = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().max(220).optional(),
    cta: ctaSchema.optional(),
    items: z.array(showcase2Image).max(12).optional(),
  })
  .strict();

const showcase3Item = z
  .object({
    id: z.string().trim().max(64).optional(),
    title: z.string().trim().max(160).default(''),
    category: z.string().trim().max(80).optional(),
    imageUrl: z.string().trim().max(2048).default(''),
  })
  .strict();

const showcase3Props = z
  .object({
    title: z.string().trim().max(200).optional(),
    subtitle: z.string().trim().max(280).optional(),
    items: z.array(showcase3Item).min(1).max(6).optional(),
  })
  .strict();

const showcase4Project = z
  .object({
    id: z.string().trim().max(64).optional(),
    title: z.string().trim().max(160).default(''),
    client: z.string().trim().max(120).optional(),
    year: z.string().trim().max(24).optional(),
    tags: z.array(z.string().trim().max(40)).max(6).optional(),
    imageUrl: z.string().trim().max(2048).optional(),
    href: z.string().trim().max(2048).optional(),
  })
  .strict();

const showcase4Props = z
  .object({
    eyebrow: z.string().trim().max(120).optional(),
    title: z.string().trim().max(220).optional(),
    projects: z.array(showcase4Project).max(16).optional(),
  })
  .strict();

const showcase5Tab = z
  .object({
    id: z.string().trim().max(64).optional(),
    label: z.string().trim().max(40).default('Tab'),
    images: z.array(z.string().trim().max(2048)).max(12).default([]),
  })
  .strict();

const showcase5Props = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().max(220).optional(),
    description: z.string().trim().max(420).optional(),
    tabs: z.array(showcase5Tab).min(1).max(5).optional(),
  })
  .strict();

const ecommerceColor = z
  .object({
    name: z.string().trim().max(60).default('Color'),
    value: z.string().trim().max(80).default('#111111'),
    imageUrl: z.string().trim().max(2048).optional(),
  })
  .strict();

const ecommerceSize = z
  .object({
    label: z.string().trim().max(40).default('One size'),
    available: z.boolean().optional(),
  })
  .strict();

const ecommerceProduct = z
  .object({
    id: z.string().trim().max(64).optional(),
    name: z.string().trim().max(160).default(''),
    price: z.string().trim().max(60).optional(),
    priceQar: z.number().nonnegative().max(99_999_999).nullable().optional(),
    brand: z.string().trim().max(100).optional(),
    category: z.string().trim().max(80).optional(),
    tag: z.string().trim().max(80).optional(),
    imageUrl: z.string().trim().max(2048).optional(),
    images: z.array(z.string().trim().max(2048)).max(8).optional(),
    description: z.string().trim().max(420).optional(),
    details: z.array(z.string().trim().max(120)).max(8).optional(),
    colors: z.array(ecommerceColor).max(8).optional(),
    sizes: z.array(ecommerceSize).max(12).optional(),
    href: z.string().trim().max(2048).optional(),
    available: z.boolean().optional(),
    status: z.enum(['active', 'draft', 'sold_out']).optional(),
    createdAt: z.string().trim().max(80).optional(),
    isCustomizable: z.boolean().optional(),
    customizationLabel: z.string().trim().max(48).nullable().optional(),
    allowCustomSize: z.boolean().optional(),
    requiresHeightInput: z.boolean().optional(),
    heightInputLabel: z.string().trim().max(40).nullable().optional(),
    heightOptions: z.array(z.string().trim().max(40)).max(24).optional(),
  })
  .strict();

const ecommerceCategory = z
  .object({
    id: z.string().trim().max(64).optional(),
    label: z.string().trim().max(100).default(''),
    tag: z.string().trim().max(100).optional(),
    imageUrl: z.string().trim().max(2048).optional(),
    href: z.string().trim().max(2048).optional(),
  })
  .strict();

const commerceProductSource = z
  .object({
    source: z.enum(['all', 'manual', 'category', 'tag', 'latest']).default('all'),
    productIds: z.array(z.string().trim().max(120)).max(96).optional(),
    category: z.string().trim().max(120).nullable().optional(),
    tag: z.string().trim().max(120).nullable().optional(),
    limit: z.number().int().min(1).max(48).optional(),
    sort: z.enum(['manual', 'newest', 'price_low', 'price_high', 'title_az']).optional(),
    hideUnavailable: z.boolean().optional(),
  })
  .strict();

const commerceFilterOption = z
  .object({
    id: z.string().trim().min(1).max(64),
    labelEn: z.string().trim().max(80).optional(),
    labelAr: z.string().trim().max(80).optional(),
    value: z.string().trim().max(120).optional(),
    productIds: z.array(z.string().trim().max(120)).max(96).optional(),
    category: z.string().trim().max(120).nullable().optional(),
    tag: z.string().trim().max(120).nullable().optional(),
  })
  .strict();

const commerceFilterGroup = z
  .object({
    id: z.string().trim().min(1).max(64),
    labelEn: z.string().trim().max(80).optional(),
    labelAr: z.string().trim().max(80).optional(),
    source: z.enum(['category', 'brand', 'tag', 'price', 'availability', 'manual']),
    autoGenerate: z.boolean().optional(),
    options: z.array(commerceFilterOption).max(24).optional(),
  })
  .strict();

const commerceCardConfig = z
  .object({
    showCategory: z.boolean().optional(),
    showBrand: z.boolean().optional(),
    showDescription: z.boolean().optional(),
    showWishlist: z.boolean().optional(),
    showOptions: z.boolean().optional(),
    showSalePrice: z.boolean().optional(),
    ctaMode: z.enum(['direct_add', 'quick_view', 'product_page']).optional(),
    ctaStyle: z.enum(['solid', 'outline', 'ghost']).optional(),
  })
  .strict();

const filterableShopConfig = z
  .object({
    productSource: commerceProductSource.optional(),
    filters: z
      .object({
        enabled: z.boolean().optional(),
        layout: z.enum(['sidebar', 'topbar']).optional(),
        groups: z.array(commerceFilterGroup).max(12).optional(),
        autoGenerate: z.boolean().optional(),
        hideEmptyOptions: z.boolean().optional(),
        showSidebar: z.boolean().optional(),
        showMobileDrawer: z.boolean().optional(),
      })
      .strict()
      .optional(),
    card: commerceCardConfig.optional(),
  })
  .strict();

const commerceTab = z
  .object({
    id: z.string().trim().min(1).max(64),
    labelEn: z.string().trim().max(80).optional(),
    labelAr: z.string().trim().max(80).optional(),
    value: z.string().trim().max(120).optional(),
    productSource: commerceProductSource.optional(),
  })
  .strict();

const tabbedProductsConfig = z
  .object({
    tabs: z.array(commerceTab).max(12).optional(),
    allTab: z
      .object({
        enabled: z.boolean().optional(),
        mode: z.enum(['combined_tabs', 'all_products', 'manual']).optional(),
        productIds: z.array(z.string().trim().max(120)).max(96).optional(),
      })
      .strict()
      .optional(),
    emptyTabBehavior: z.enum(['hide', 'empty_state', 'fallback_all']).optional(),
    card: commerceCardConfig.optional(),
  })
  .strict();

const visualCategoryTile = z
  .object({
    id: z.string().trim().min(1).max(64),
    labelEn: z.string().trim().max(100).optional(),
    labelAr: z.string().trim().max(100).optional(),
    eyebrowEn: z.string().trim().max(120).optional(),
    eyebrowAr: z.string().trim().max(120).optional(),
    imageUrl: z.string().trim().max(2048).optional(),
    badge: z
      .object({
        labelEn: z.string().trim().max(60).optional(),
        labelAr: z.string().trim().max(60).optional(),
        tone: z.enum(['maroon', 'gold', 'black', 'green', 'red']).optional(),
        position: z.enum(['top-left', 'top-right', 'floating', 'inline']).optional(),
      })
      .strict()
      .optional(),
    destination: z
      .object({
        type: z.enum(['category', 'tag', 'manual_products', 'page', 'external']).optional(),
        category: z.string().trim().max(120).nullable().optional(),
        tag: z.string().trim().max(120).nullable().optional(),
        productIds: z.array(z.string().trim().max(120)).max(96).optional(),
        pageSlug: z.string().trim().max(160).nullable().optional(),
        url: z.string().trim().max(2048).nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const visualCategoryTilesConfig = z
  .object({
    tabs: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(64),
            labelEn: z.string().trim().max(80).optional(),
            labelAr: z.string().trim().max(80).optional(),
            tileIds: z.array(z.string().trim().max(64)).max(48).optional(),
          })
          .strict(),
      )
      .max(12)
      .optional(),
    tiles: z.array(visualCategoryTile).max(32).optional(),
    behavior: z
      .object({
        showTabs: z.boolean().optional(),
        clickAction: z
          .enum(['navigate', 'filter_products', 'scroll_to_products', 'open_collection_drawer'])
          .optional(),
        overlayStyle: z.enum(['dark_gradient', 'light_overlay', 'minimal', 'framed']).optional(),
        allTab: z.enum(['show_all', 'combined_tabs', 'hidden']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const ecommerceBlockProps = z
  .object({
    eyebrow: z.string().trim().max(80).optional(),
    title: z.string().trim().max(220).optional(),
    subtitle: z.string().trim().max(420).optional(),
    cta: ctaSchema.optional(),
    productIds: z.array(z.string().uuid()).max(24).optional(),
    products: z.array(ecommerceProduct).max(12).optional(),
    categories: z.array(ecommerceCategory).max(12).optional(),
    tabs: z.array(z.string().trim().max(40)).max(8).optional(),
    productSource: commerceProductSource.optional(),
    filterable: filterableShopConfig.optional(),
    tabbed: tabbedProductsConfig.optional(),
    tilesConfig: visualCategoryTilesConfig.optional(),
  })
  .strict();

const shadcnCommerceBaseProps = ecommerceBlockProps.extend({
  kicker: z.string().trim().max(120).optional(),
  note: z.string().trim().max(320).optional(),
  density: z.enum(['compact', 'balanced', 'editorial']).optional(),
  tone: z.enum(['sand', 'maroon', 'charcoal', 'gold']).optional(),
});

const shadcnNavbarProps = shadcnCommerceBaseProps
  .extend({
    variant: z.enum(SHADCN_NAVBAR_VARIANTS),
    sticky: z.boolean().optional(),
    announcement: z.string().trim().max(120).optional(),
    ctaLabel: z.string().trim().max(48).optional(),
    ctaHref: z.string().trim().max(240).optional(),
    showSearch: z.boolean().optional(),
    showPolicyLinks: z.boolean().optional(),
    cartLabel: z.string().trim().max(40).optional(),
  })
  .strict();
const shadcnHeroProps = shadcnCommerceBaseProps
  .extend({ variant: z.enum(SHADCN_HERO_VARIANTS) })
  .strict();
const shadcnTrustStripProps = shadcnCommerceBaseProps
  .extend({
    variant: z.enum(SHADCN_TRUST_STRIP_VARIANTS),
    metrics: z
      .array(
        z
          .object({
            labelEn: z.string().trim().max(80).optional(),
            labelAr: z.string().trim().max(80).optional(),
            value: z.string().trim().max(60).optional(),
            icon: z.string().trim().max(40).optional(),
          })
          .strict(),
      )
      .max(6)
      .optional(),
  })
  .strict();
const shadcnCategoriesProps = shadcnCommerceBaseProps
  .extend({ variant: z.enum(SHADCN_CATEGORY_VARIANTS) })
  .strict();
const shadcnProductCardProps = shadcnCommerceBaseProps
  .extend({ variant: z.enum(SHADCN_PRODUCT_CARD_VARIANTS) })
  .strict();
const shadcnProductListProps = shadcnCommerceBaseProps
  .extend({ variant: z.enum(SHADCN_PRODUCT_LIST_VARIANTS) })
  .strict();
const shadcnProductDetailProps = shadcnCommerceBaseProps
  .extend({
    variant: z.enum(SHADCN_PRODUCT_DETAIL_VARIANTS),
    productId: z.string().trim().max(120).optional(),
  })
  .strict();
const shadcnQuickViewProps = shadcnCommerceBaseProps
  .extend({
    variant: z.enum(SHADCN_QUICK_VIEW_VARIANTS),
    productId: z.string().trim().max(120).optional(),
  })
  .strict();
const shadcnReviewsProps = shadcnCommerceBaseProps
  .extend({
    variant: z.enum(SHADCN_REVIEWS_VARIANTS),
    reviews: z
      .array(
        z
          .object({
            nameEn: z.string().trim().max(80).optional(),
            nameAr: z.string().trim().max(80).optional(),
            quoteEn: z.string().trim().max(260).optional(),
            quoteAr: z.string().trim().max(260).optional(),
            rating: z.number().min(1).max(5).optional(),
            productId: z.string().trim().max(120).optional(),
          })
          .strict(),
      )
      .max(9)
      .optional(),
  })
  .strict();
const shadcnOrderSummaryProps = shadcnCommerceBaseProps
  .extend({ variant: z.enum(SHADCN_ORDER_SUMMARY_VARIANTS) })
  .strict();
const shadcnOfferModalProps = shadcnCommerceBaseProps
  .extend({
    variant: z.enum(SHADCN_OFFER_MODAL_VARIANTS),
    discountLabel: z.string().trim().max(80).optional(),
    delayMs: z.number().int().min(0).max(60000).optional(),
  })
  .strict();
const shadcnFooterProps = shadcnCommerceBaseProps
  .extend({
    variant: z.enum(SHADCN_FOOTER_VARIANTS),
    showNewsletter: z.boolean().optional(),
  })
  .strict();

/**
 * Per-block schema map. The discriminated-union schema below pivots on
 * `type` to apply the right `props` validator.
 */
export const blockPropsByType = {
  hero: heroProps,
  banner: bannerProps,
  text: textProps,
  image: imageProps,
  gallery: galleryProps,
  productGrid: productGridProps,
  productList: productListProps,
  featuredProduct: featuredProductProps,
  serviceList: serviceListProps,
  menu: menuProps,
  calendar: calendarProps,
  contactCard: contactCardProps,
  inquireCta: inquireCtaProps,
  spacer: spacerProps,
  divider: dividerProps,
  drop: dropProps,
  animatedText: animatedTextProps,
  animatedImage: animatedImageProps,
  productCardStack: productCardStackProps,
  tiltImage: tiltImageProps,
  spotlightCard: spotlightCardProps,
  productPromoCard: productPromoCardProps,
  mawid: mawidProps,
  taqim: taqimProps,
  depthShowcase: depthShowcaseProps,
  auroraRibbon: auroraRibbonProps,
  portalHero: portalHeroProps,
  curvedLoop: curvedLoopProps,
  showcase1: showcase1Props,
  showcase2: showcase2Props,
  showcase3: showcase3Props,
  showcase4: showcase4Props,
  showcase5: showcase5Props,
  ecommerce1: ecommerceBlockProps,
  ecommerce2: ecommerceBlockProps,
  ecommerce3: ecommerceBlockProps,
  ecommerce4: ecommerceBlockProps,
  ecommerce5: ecommerceBlockProps,
  ecommerce6: ecommerceBlockProps,
  ecommerce7: ecommerceBlockProps,
  shadcnNavbar: shadcnNavbarProps,
  shadcnHero: shadcnHeroProps,
  shadcnTrustStrip: shadcnTrustStripProps,
  shadcnCategories: shadcnCategoriesProps,
  shadcnProductCard: shadcnProductCardProps,
  shadcnProductList: shadcnProductListProps,
  shadcnProductDetail: shadcnProductDetailProps,
  shadcnQuickView: shadcnQuickViewProps,
  shadcnReviews: shadcnReviewsProps,
  shadcnOrderSummary: shadcnOrderSummaryProps,
  shadcnOfferModal: shadcnOfferModalProps,
  shadcnFooter: shadcnFooterProps,
} as const;

const baseBlock = {
  id: z.string().uuid(),
  style: styleSchema,
};

export const blockSchema = z.discriminatedUnion('type', [
  z.object({ ...baseBlock, type: z.literal('hero'), props: heroProps }),
  z.object({ ...baseBlock, type: z.literal('banner'), props: bannerProps }),
  z.object({ ...baseBlock, type: z.literal('text'), props: textProps }),
  z.object({ ...baseBlock, type: z.literal('image'), props: imageProps }),
  z.object({ ...baseBlock, type: z.literal('gallery'), props: galleryProps }),
  z.object({ ...baseBlock, type: z.literal('productGrid'), props: productGridProps }),
  z.object({ ...baseBlock, type: z.literal('productList'), props: productListProps }),
  z.object({ ...baseBlock, type: z.literal('featuredProduct'), props: featuredProductProps }),
  z.object({ ...baseBlock, type: z.literal('serviceList'), props: serviceListProps }),
  z.object({ ...baseBlock, type: z.literal('menu'), props: menuProps }),
  z.object({ ...baseBlock, type: z.literal('calendar'), props: calendarProps }),
  z.object({ ...baseBlock, type: z.literal('contactCard'), props: contactCardProps }),
  z.object({ ...baseBlock, type: z.literal('inquireCta'), props: inquireCtaProps }),
  z.object({ ...baseBlock, type: z.literal('spacer'), props: spacerProps }),
  z.object({ ...baseBlock, type: z.literal('divider'), props: dividerProps }),
  z.object({ ...baseBlock, type: z.literal('drop'), props: dropProps }),
  z.object({ ...baseBlock, type: z.literal('animatedText'), props: animatedTextProps }),
  z.object({ ...baseBlock, type: z.literal('animatedImage'), props: animatedImageProps }),
  z.object({
    ...baseBlock,
    type: z.literal('productCardStack'),
    props: productCardStackProps,
  }),
  z.object({ ...baseBlock, type: z.literal('tiltImage'), props: tiltImageProps }),
  z.object({
    ...baseBlock,
    type: z.literal('spotlightCard'),
    props: spotlightCardProps,
  }),
  z.object({
    ...baseBlock,
    type: z.literal('productPromoCard'),
    props: productPromoCardProps,
  }),
  z.object({ ...baseBlock, type: z.literal('mawid'), props: mawidProps }),
  z.object({ ...baseBlock, type: z.literal('taqim'), props: taqimProps }),
  z.object({
    ...baseBlock,
    type: z.literal('depthShowcase'),
    props: depthShowcaseProps,
  }),
  z.object({
    ...baseBlock,
    type: z.literal('auroraRibbon'),
    props: auroraRibbonProps,
  }),
  z.object({
    ...baseBlock,
    type: z.literal('portalHero'),
    props: portalHeroProps,
  }),
  z.object({
    ...baseBlock,
    type: z.literal('curvedLoop'),
    props: curvedLoopProps,
  }),
  z.object({ ...baseBlock, type: z.literal('showcase1'), props: showcase1Props }),
  z.object({ ...baseBlock, type: z.literal('showcase2'), props: showcase2Props }),
  z.object({ ...baseBlock, type: z.literal('showcase3'), props: showcase3Props }),
  z.object({ ...baseBlock, type: z.literal('showcase4'), props: showcase4Props }),
  z.object({ ...baseBlock, type: z.literal('showcase5'), props: showcase5Props }),
  z.object({ ...baseBlock, type: z.literal('ecommerce1'), props: ecommerceBlockProps }),
  z.object({ ...baseBlock, type: z.literal('ecommerce2'), props: ecommerceBlockProps }),
  z.object({ ...baseBlock, type: z.literal('ecommerce3'), props: ecommerceBlockProps }),
  z.object({ ...baseBlock, type: z.literal('ecommerce4'), props: ecommerceBlockProps }),
  z.object({ ...baseBlock, type: z.literal('ecommerce5'), props: ecommerceBlockProps }),
  z.object({ ...baseBlock, type: z.literal('ecommerce6'), props: ecommerceBlockProps }),
  z.object({ ...baseBlock, type: z.literal('ecommerce7'), props: ecommerceBlockProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnNavbar'), props: shadcnNavbarProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnHero'), props: shadcnHeroProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnTrustStrip'), props: shadcnTrustStripProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnCategories'), props: shadcnCategoriesProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnProductCard'), props: shadcnProductCardProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnProductList'), props: shadcnProductListProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnProductDetail'), props: shadcnProductDetailProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnQuickView'), props: shadcnQuickViewProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnReviews'), props: shadcnReviewsProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnOrderSummary'), props: shadcnOrderSummaryProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnOfferModal'), props: shadcnOfferModalProps }),
  z.object({ ...baseBlock, type: z.literal('shadcnFooter'), props: shadcnFooterProps }),
]);

export const blocksSchema = z.array(blockSchema).max(200);

export const themeOverridesSchema = z
  .object({
    palette: z.enum(PALETTE_IDS).optional(),
    // Bumped from 64 → 4096 in 2026-04 to accept full CSS background
    // shorthand strings from the pattern library (multi-layer
    // gradients + inline SVG data-URIs). Existing storefronts whose
    // `pageBg` is a 7-char hex like `#1f1b16` validate unchanged; the
    // wider bound is a strict superset.
    pageBg: z.string().trim().max(4096).optional(),
    backgroundEffect: z.enum(BACKGROUND_EFFECTS).optional(),
    cursorEffect: z.enum(CURSOR_EFFECTS).optional(),
    headingWeight: z.union([z.literal(400), z.literal(500), z.literal(600)]).optional(),
    sectionSpacing: z.enum(['tight', 'comfortable', 'spacious']).optional(),
    policyDisplayMode: z.enum(['full', 'columns']).optional(),
    themeBehaviour: z.enum(['auto', 'light', 'dark']).optional(),
    commerceChrome: z
      .object({
        navbar: z.enum(STOREFRONT_NAVBAR_VARIANTS).optional(),
        footer: z.enum(STOREFRONT_FOOTER_VARIANTS).optional(),
        sidebar: z.enum(STOREFRONT_SIDEBAR_VARIANTS).optional(),
        cart: z.enum(STOREFRONT_CART_VARIANTS).optional(),
        navAnnouncement: z.string().trim().max(120).optional(),
        navCtaLabel: z.string().trim().max(48).optional(),
        navCtaHref: z.string().trim().max(240).optional(),
        showSearch: z.boolean().optional(),
        showPolicyLinks: z.boolean().optional(),
        footerHeadline: z.string().trim().max(100).optional(),
        footerText: z.string().trim().max(260).optional(),
        footerShowNewsletter: z.boolean().optional(),
        sidebarLabel: z.string().trim().max(80).optional(),
        cartLabel: z.string().trim().max(40).optional(),
        cartCheckoutLabel: z.string().trim().max(60).optional(),
        cartEmptyTitle: z.string().trim().max(80).optional(),
        cartEmptyText: z.string().trim().max(180).optional(),
      })
      .strict()
      .optional(),
    seo: z
      .object({
        title: z.string().trim().max(140).optional(),
        description: z.string().trim().max(260).optional(),
        ogImage: z.string().trim().max(2048).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ParsedBlock = z.infer<typeof blockSchema>;
export type ParsedBlocks = z.infer<typeof blocksSchema>;
export type ParsedThemeOverrides = z.infer<typeof themeOverridesSchema>;

/** Cheap runtime guard for the `BLOCK_TYPES` const. */
export function isBlockType(v: unknown): v is (typeof BLOCK_TYPES)[number] {
  return typeof v === 'string' && (BLOCK_TYPES as readonly string[]).includes(v);
}
