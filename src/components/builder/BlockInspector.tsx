'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  Block,
  BlockStyle,
  BlockVariant,
  CardEffect,
  CommerceCardConfig,
  EcommerceCategory,
  FilterableShopConfig,
  GalleryEffect,
  GalleryItem,
  Showcase1Item,
  Showcase2Image,
  Showcase3Item,
  Showcase4Project,
  Showcase5Tab,
  SocialProofReview,
  TabbedProductsConfig,
  TaqimBlockProps,
  TextEffect,
  VisualCategoryTile,
  VisualCategoryTilesConfig,
} from '@/lib/blocks/types';
import {
  normalizeCommerceProductSource,
  type CommerceFilterGroup,
  type CommerceProductSource,
  type CommerceProductSourceKind,
  type CommerceProductSort,
} from '@/lib/blocks/commerce';
import { CARD_EFFECTS, GALLERY_EFFECTS, TEXT_EFFECTS, isVariantBlock } from '@/lib/blocks/types';
import { useIsSimple, useEditorMode, AdvancedReveal } from './EditorModeContext';
import { BACKGROUND_EFFECT_PICKER_OPTIONS } from '@/lib/blocks/backgroundPicker';
import { TEXT_FX, TEXT_FX_CATEGORY_LABELS, getTextFx, type TextFxCategory } from '@/lib/blocks/textFx';
import { TextEffectRenderer } from '@/components/storefront/blocks/TextEffectRenderer';
import { palettes } from '@/lib/palettes';
import { PLAN_LIMITS, planAtLeast, type Plan } from '@/lib/plans';
import { MediaUploader } from './MediaUploader';
import { BackgroundPatternPicker } from './BackgroundPatternPicker';
import { useBuilderCopy } from './BuilderCopyContext';

export type ProductOption = {
  id: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
  priceQar: number | null;
  status: 'active' | 'draft' | 'sold_out';
  createdAt: string;
  isCustomizable: boolean;
  customizationLabel: string | null;
  allowCustomSize: boolean;
  requiresHeightInput: boolean;
  heightInputLabel: string | null;
  heightOptions: string[];
};

/**
 * Lightweight per-block outline entry. Supplied by the builder shell so
 * inline-anchor pickers (CTA → Scroll to) can list the page's blocks.
 */
export type BlockOutlineEntry = {
  id: string;
  index: number;
  label: string;
};

type Props = {
  block: Block | null;
  onChange: (props: Record<string, unknown>) => void;
  onChangeStyle: (style: BlockStyle | undefined) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  productOptions: ProductOption[];
  categoryOptions: string[];
  storefrontSlug: string;
  /** Outline of every block on the current page, used by anchor pickers. */
  blockOutline?: BlockOutlineEntry[];
  /** When the Giphy app is installed for this storefront, every image
   *  picker grows a "Pick a GIF" button. Set to the active storefront
   *  slug to enable. */
  giphyStorefrontSlug?: string;
  /** Caller's billing tier. Visual variants are free; this remains for
   *  surrounding builder surfaces that still receive the active plan. */
  currentPlan?: Plan;
  /** Effect id the shell is still waiting to see rendered in the preview
   *  iframe — the matching picker tile shows a small spinner until the
   *  saved draft round-trip lands on the canvas. */
  pendingTextEffect?: string;
};

/**
 * Maps each block type to a coarse category. Drives the small colored
 * dot prefix on the inspector header — at a glance the founder reads
 * "this is a commerce block" vs "this is a layout block" without
 * scanning the title text. Categories chosen to mirror the LIBRARY
 * groups in BuilderShell.tsx so dot color stays consistent with where
 * the founder picked the block from.
 */
const BLOCK_CATEGORY: Record<
  Block['type'],
  'layout' | 'commerce' | 'contact' | 'motion' | 'spacing'
> = {
  hero: 'layout',
  banner: 'layout',
  text: 'layout',
  image: 'layout',
  gallery: 'layout',
  productGrid: 'commerce',
  productList: 'commerce',
  featuredProduct: 'commerce',
  productCardStack: 'commerce',
  productPromoCard: 'commerce',
  ecommerce1: 'commerce',
  ecommerce2: 'commerce',
  ecommerce3: 'commerce',
  ecommerce4: 'commerce',
  ecommerce5: 'commerce',
  ecommerce6: 'commerce',
  ecommerce7: 'commerce',
  ecommerce9: 'commerce',
  shadcnNavbar: 'commerce',
  shadcnHero: 'commerce',
  shadcnTrustStrip: 'commerce',
  shadcnCategories: 'commerce',
  shadcnProductCard: 'commerce',
  shadcnProductList: 'commerce',
  shadcnProductDetail: 'commerce',
  shadcnQuickView: 'commerce',
  shadcnReviews: 'commerce',
  shadcnOrderSummary: 'commerce',
  shadcnOfferModal: 'commerce',
  shadcnFooter: 'commerce',
  menu: 'commerce',
  serviceList: 'commerce',
  calendar: 'commerce',
  contactCard: 'contact',
  inquireCta: 'contact',
  activityPanel: 'commerce',
  drop: 'commerce',
  mawid: 'commerce',
  taqim: 'commerce',
  animatedText: 'motion',
  animatedImage: 'motion',
  tiltImage: 'motion',
  spotlightCard: 'motion',
  depthShowcase: 'motion',
  auroraRibbon: 'motion',
  portalHero: 'motion',
  shaderHero: 'motion',
  productSpotlight3d: 'commerce',
  socialProofWall: 'motion',
  parallaxStoryHero: 'motion',
  curvedLoop: 'motion',
  showcase1: 'motion',
  showcase2: 'motion',
  showcase3: 'motion',
  showcase4: 'motion',
  showcase5: 'motion',
  spacer: 'spacing',
  divider: 'spacing',
};

const CATEGORY_COLOR: Record<'layout' | 'commerce' | 'contact' | 'motion' | 'spacing', string> = {
  layout: '#E8DCC4',
  commerce: '#D8CCB4',
  contact: '#CFC2A7',
  motion: '#BDB19A',
  spacing: 'rgba(232,220,196,0.45)',
};

const INSPECTOR_INLINE_AR: Record<string, string> = {
  'Describe the image': '\u0635\u0641 \u0627\u0644\u0635\u0648\u0631\u0629',
  'Optional small line above': '\u0633\u0637\u0631 \u0635\u063a\u064a\u0631 \u0627\u062e\u062a\u064a\u0627\u0631\u064a \u0628\u0627\u0644\u0623\u0639\u0644\u0649',
  Required: '\u0645\u0637\u0644\u0648\u0628',
  'Optional supporting paragraph': '\u0641\u0642\u0631\u0629 \u0645\u0633\u0627\u0646\u062f\u0629 \u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629',
  'Defaults to your storefront accent': '\u064a\u0633\u062a\u062e\u062f\u0645 \u0644\u0648\u0646 \u0627\u0644\u0644\u0645\u0633\u0629 \u0641\u064a \u0627\u0644\u0645\u062a\u062c\u0631 \u062a\u0644\u0642\u0627\u0626\u064a\u0627',
  'See more': '\u0639\u0631\u0636 \u0627\u0644\u0645\u0632\u064a\u062f',
  'https://… or # for none': 'https://... \u0623\u0648 # \u0628\u062f\u0648\u0646 \u0631\u0627\u0628\u0637',
  'Describe the image for assistive tech': '\u0635\u0641 \u0627\u0644\u0635\u0648\u0631\u0629 \u0644\u0642\u0627\u0631\u0626\u0627\u062a \u0627\u0644\u0634\u0627\u0634\u0629',
  'Optional overlay headline': '\u0639\u0646\u0648\u0627\u0646 \u0627\u062e\u062a\u064a\u0627\u0631\u064a \u0641\u0648\u0642 \u0627\u0644\u0635\u0648\u0631\u0629',
  'Optional supporting line': '\u0633\u0637\u0631 \u0645\u0633\u0627\u0646\u062f \u0627\u062e\u062a\u064a\u0627\u0631\u064a',
  "Falls back to the product's category": '\u064a\u0633\u062a\u062e\u062f\u0645 \u0641\u0626\u0629 \u0627\u0644\u0645\u0646\u062a\u062c \u0639\u0646\u062f \u062a\u0631\u0643\u0647 \u0641\u0627\u0631\u063a\u0627',
  View: '\u0639\u0631\u0636',
  Services: '\u0627\u0644\u062e\u062f\u0645\u0627\u062a',
  'Visit us': '\u0632\u0631\u0646\u0627',
  'From profile': '\u0645\u0646 \u0645\u0644\u0641 \u0627\u0644\u0645\u062a\u062c\u0631',
  'From profile (handle without @)': '\u0645\u0646 \u0645\u0644\u0641 \u0627\u0644\u0645\u062a\u062c\u0631 (\u0627\u0644\u0645\u0639\u0631\u0641 \u0628\u062f\u0648\u0646 @)',
  'Headline on the card': '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0628\u0637\u0627\u0642\u0629',
  'Main line': '\u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u0631\u0626\u064a\u0633\u064a',
  'Add Text Here': '\u0623\u0636\u0641 \u0627\u0644\u0646\u0635 \u0647\u0646\u0627',
  'Featured paths': '\u0645\u0633\u0627\u0631\u0627\u062a \u0645\u0645\u064a\u0632\u0629',
  'Featured Work': '\u0623\u0639\u0645\u0627\u0644 \u0645\u0645\u064a\u0632\u0629',
  'Leave empty to use product + launch time': '\u0627\u062a\u0631\u0643\u0647 \u0641\u0627\u0631\u063a\u0627 \u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0646\u062a\u062c \u0648\u0648\u0642\u062a \u0627\u0644\u0625\u0637\u0644\u0627\u0642',
  "Falls back to the event's bilingual label": '\u064a\u0633\u062a\u062e\u062f\u0645 \u062a\u0633\u0645\u064a\u0629 \u0627\u0644\u0641\u0639\u0627\u0644\u064a\u0629 \u0627\u0644\u062b\u0646\u0627\u0626\u064a\u0629 \u0639\u0646\u062f \u062a\u0631\u0643\u0647 \u0641\u0627\u0631\u063a\u0627',
  'Optional app bundle id': '\u0645\u0639\u0631\u0641 \u0628\u0627\u0642\u0629 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0627\u062e\u062a\u064a\u0627\u0631\u064a',
  "Falls back to the bundle's bilingual title": '\u064a\u0633\u062a\u062e\u062f\u0645 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u062b\u0646\u0627\u0626\u064a \u0639\u0646\u062f \u062a\u0631\u0643\u0647 \u0641\u0627\u0631\u063a\u0627',
  'Category label': '\u062a\u0633\u0645\u064a\u0629 \u0627\u0644\u0641\u0626\u0629',
  Tag: '\u0648\u0633\u0645',
  'Item title': '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0639\u0646\u0635\u0631',
  'Card title': '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0628\u0637\u0627\u0642\u0629',
  'Project title': '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
  Client: '\u0627\u0644\u0639\u0645\u064a\u0644',
  Year: '\u0627\u0644\u0633\u0646\u0629',
  'Tags, comma separated': '\u0648\u0633\u0648\u0645 \u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0648\u0627\u0635\u0644',
  'Tab label': '\u062a\u0633\u0645\u064a\u0629 \u0627\u0644\u062a\u0628\u0648\u064a\u0628',
  'Service name': '\u0627\u0633\u0645 \u0627\u0644\u062e\u062f\u0645\u0629',
  'Price (QAR)': '\u0627\u0644\u0633\u0639\u0631 (QAR)',
  All: '\u0627\u0644\u0643\u0644',
  JUNE: '\u064a\u0648\u0646\u064a\u0648',
  'Optional small caps line': '\u0633\u0637\u0631 \u0635\u063a\u064a\u0631 \u0628\u062d\u0631\u0648\u0641 \u0628\u0627\u0631\u0632\u0629 \u0627\u062e\u062a\u064a\u0627\u0631\u064a',
  'Optional supporting copy': '\u0646\u0635 \u0645\u0633\u0627\u0646\u062f \u0627\u062e\u062a\u064a\u0627\u0631\u064a',
  'Optional eyebrow': '\u0639\u0628\u0627\u0631\u0629 \u0639\u0644\u0648\u064a\u0629 \u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629',
  'Optional caption': '\u062a\u0639\u0644\u064a\u0642 \u0627\u062e\u062a\u064a\u0627\u0631\u064a',
  'Alt text (accessibility)': '\u0646\u0635 \u0628\u062f\u064a\u0644 (\u0644\u0625\u062a\u0627\u062d\u0629 \u0627\u0644\u0648\u0635\u0648\u0644)',
  'Alt text': '\u0646\u0635 \u0628\u062f\u064a\u0644',
  'Caption (optional)': '\u062a\u0639\u0644\u064a\u0642 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)',
  Kicker: '\u0639\u0628\u0627\u0631\u0629 \u062a\u0645\u0647\u064a\u062f\u064a\u0629',
  Link: '\u0631\u0627\u0628\u0637',
  Shop: '\u062a\u0633\u0648\u0642',
  Category: '\u0627\u0644\u0641\u0626\u0629',
  'Future-ready tag or collection': '\u0648\u0633\u0645 \u0623\u0648 \u0645\u062c\u0645\u0648\u0639\u0629 \u0645\u0633\u062a\u0639\u062f\u0629',
  'Search products': '\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c\u0627\u062a',
  Value: '\u0627\u0644\u0642\u064a\u0645\u0629',
  'Tab slug': '\u0631\u0627\u0628\u0637 \u0627\u0644\u062a\u0628\u0648\u064a\u0628',
  'Page slug': '\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0641\u062d\u0629',
  'Tag / collection': '\u0648\u0633\u0645 / \u0645\u062c\u0645\u0648\u0639\u0629',
  'Default option, if needed': '\u062e\u064a\u0627\u0631 \u0627\u0641\u062a\u0631\u0627\u0636\u064a \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629',
  'Product badge EN': '\u0634\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u062a\u062c EN',
  'Product badge AR': '\u0634\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u062a\u062c AR',
  'Add bundle to cart': '\u0623\u0636\u0641 \u0627\u0644\u0628\u0627\u0642\u0629 \u0644\u0644\u0633\u0644\u0629',
  'All, Travel, Home, Gifts': '\u0627\u0644\u0643\u0644\u060c \u0633\u0641\u0631\u060c \u0645\u0646\u0632\u0644\u060c \u0647\u062f\u0627\u064a\u0627',
  'Launch edit': '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0625\u0637\u0644\u0627\u0642',
  NEW: '\u062c\u062f\u064a\u062f',
  'bg colour': '\u0644\u0648\u0646 \u0627\u0644\u062e\u0644\u0641\u064a\u0629',
  'text colour': '\u0644\u0648\u0646 \u0627\u0644\u0646\u0635',
};

const TITLES: Record<Block['type'], string> = {
  hero: 'Hero',
  banner: 'Banner',
  text: 'Text',
  image: 'Image',
  gallery: 'Gallery',
  productGrid: 'Product grid',
  productList: 'Product list',
  featuredProduct: 'Featured product',
  serviceList: 'Service list',
  menu: 'Menu',
  calendar: 'Calendar',
  contactCard: 'Contact card',
  inquireCta: 'Inquire CTA',
  activityPanel: 'Activity panel',
  spacer: 'Spacer',
  divider: 'Divider',
  drop: 'Drop',
  mawid: 'Mawid · countdown',
  taqim: 'Taqim · bundle',
  animatedText: 'Animated text',
  animatedImage: 'Animated image',
  productCardStack: 'Product card stack',
  tiltImage: 'Tilt image',
  spotlightCard: 'Spotlight card',
  productPromoCard: 'Product promo card',
  ecommerce1: 'Product gallery',
  ecommerce2: 'Shop filters',
  ecommerce3: 'Color detail',
  ecommerce4: 'Drop product',
  ecommerce5: 'Editorial shelf',
  ecommerce6: 'Category shop',
  ecommerce7: 'Category tiles',
  ecommerce9: 'Quick-add grid',
  shadcnNavbar: 'Premium navbar',
  shadcnHero: 'Premium hero',
  shadcnTrustStrip: 'Trust strip',
  shadcnCategories: 'Premium categories',
  shadcnProductCard: 'Premium product cards',
  shadcnProductList: 'Premium product list',
  shadcnProductDetail: 'Premium product detail',
  shadcnQuickView: 'Quick view',
  shadcnReviews: 'Souqna Reviews',
  shadcnOrderSummary: 'Order summary',
  shadcnOfferModal: 'Offer module',
  shadcnFooter: 'Premium footer',
  depthShowcase: 'Depth showcase',
  auroraRibbon: 'Aurora ribbon',
  portalHero: 'Souqy Portal',
  shaderHero: 'Shader hero',
  productSpotlight3d: 'Product spotlight 3D',
  socialProofWall: 'Social proof wall',
  parallaxStoryHero: 'Parallax story hero',
  curvedLoop: 'Curved loop',
  showcase1: 'Case switcher',
  showcase2: 'Image marquee',
  showcase3: '3D story wheel',
  showcase4: 'Filter portfolio',
  showcase5: 'Tabbed image rail',
};

const VARIANT_OPTIONS: Array<{
  id: BlockVariant;
  label: string;
  blurb: string;
  pro: boolean;
}> = [
  { id: 'classic', label: 'Classic', blurb: 'Clean, neutral. The default.', pro: false },
  {
    id: 'pro-aurora',
    label: 'Aurora',
    blurb: 'Animated gradient mesh backdrop.',
    pro: false,
  },
  {
    id: 'pro-magnetic',
    label: 'Magnetic',
    blurb: 'Cursor-following parallax tilt.',
    pro: false,
  },
  {
    id: 'pro-neon',
    label: 'Neon',
    blurb: 'Glowing gradient frame.',
    pro: false,
  },
  {
    id: 'pro-silk',
    label: 'Silk',
    blurb: 'Premium silk-wave surface.',
    pro: false,
  },
  {
    id: 'pro-grain',
    label: 'Grain',
    blurb: 'Soft grain-wave editorial motion.',
    pro: false,
  },
  {
    id: 'pro-halftone',
    label: 'Halftone',
    blurb: 'Animated dot-wave texture.',
    pro: false,
  },
  {
    id: 'pro-metallic',
    label: 'Metallic',
    blurb: 'Premium swirl and sheen surface.',
    pro: false,
  },
  {
    id: 'pro-bars',
    label: 'Bars',
    blurb: 'Moving gradient bar system.',
    pro: false,
  },
  {
    id: 'pro-chroma',
    label: 'Chroma',
    blurb: 'Depth card with chromatic edge.',
    pro: false,
  },
];

const BACKGROUND_EFFECT_OPTIONS = BACKGROUND_EFFECT_PICKER_OPTIONS;

// The classic studio effects keep the flat grid; the Colorion FX library
// (`fx-*` ids) renders below it as categorised, tier-badged groups.
const TEXT_EFFECT_OPTIONS: Array<{ id: TextEffect; label: string; blurb: string }> =
  TEXT_EFFECTS.filter((id) => !id.startsWith('fx-')).map((id) => ({
    id,
    label: labelFromId(id),
    blurb: id === 'none' ? 'Use normal text.' : `${labelFromId(id)} motion treatment.`,
  }));

const CARD_EFFECT_OPTIONS: Array<{ id: CardEffect; label: string; blurb: string }> =
  CARD_EFFECTS.map((id) => ({
    id,
    label: labelFromId(id),
    blurb: id === 'none' ? 'Use normal cards.' : `${labelFromId(id)} card treatment.`,
  }));

const GALLERY_EFFECT_OPTIONS: Array<{ id: GalleryEffect; label: string; blurb: string }> =
  GALLERY_EFFECTS.map((id) => ({
    id,
    label: labelFromId(id),
    blurb: id === 'none' ? 'Use normal grid.' : `${labelFromId(id)} gallery layout.`,
  }));

function labelFromId(id: string) {
  return id
    .split('-')
    .map((part) =>
      part === '3d' ? '3D' : part === 'ai' ? 'AI' : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ');
}

/**
 * Right-pane inspector. Renders a hand-tuned form per block type so the
 * fields read like prose — eyebrow, title, tagline — instead of a generic
 * JSON tree. Each form delegates to `onChange` with the new props object;
 * the parent debounces saves.
 */
export function BlockInspector({
  block,
  onChange,
  onChangeStyle,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  productOptions,
  categoryOptions,
  storefrontSlug,
  blockOutline,
  giphyStorefrontSlug,
  // Default to the most restrictive tier so a call site that forgets to
  // pass the plan locks premium FX rather than giving them away.
  currentPlan = 'free',
  pendingTextEffect,
}: Props) {
  const { builder: copy } = useBuilderCopy();
  const blockLabels = copy.blockLabels as Record<Block['type'], string>;
  // View toggle is hoisted before the empty-state guard so React keeps
  // the same hook order whether or not a block is selected.
  const [view, setView] = useState<'content' | 'style'>('content');
  // New selection always lands on Content — that's where 90% of edits
  // start. The Style tab stickies for the lifetime of one selection so
  // founders can tweak padding across two adjacent fields without
  // re-toggling.
  useEffect(() => {
    setView('content');
  }, [block?.id]);

  if (!block) {
    return (
      <Section label={copy.inspector.emptyTitle}>
        <p style={{ fontSize: 13, color: 'var(--bld-text-muted)', lineHeight: 1.55 }}>
          {copy.inspector.emptyBody}
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--bld-text-faint)',
            lineHeight: 1.55,
            marginTop: 12,
          }}
        >
          {copy.inspector.emptySiteHint}
        </p>
      </Section>
    );
  }
  const props = block.props as Record<string, unknown>;
  const set = (k: string, v: unknown) => onChange({ ...props, [k]: v });
  // Use this whenever you need to update more than one key in the same tick.
  // Sequential `set` calls all close over the same stale `props` so only the
  // last one wins — `setMany` merges everything into a single onChange.
  const setMany = (patch: Record<string, unknown>) => onChange({ ...props, ...patch });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 8,
          borderBottom: '1px solid var(--bld-divider)',
          gap: 8,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
          }}
        >
          {/* Leading category dot — color reads the block's family
              (layout / commerce / motion / contact / spacing) so the
              founder gets a coarse "what kind of block am I editing"
              cue without having to parse the title. */}
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: CATEGORY_COLOR[BLOCK_CATEGORY[block.type]],
              boxShadow: `0 0 0 2px ${CATEGORY_COLOR[BLOCK_CATEGORY[block.type]]}22`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--bld-accent)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {blockLabels[block.type] ?? TITLES[block.type]}
          </span>
        </span>
        <span style={{ display: 'inline-flex', gap: 2 }}>
          <IconBtn onClick={onMoveUp} title={copy.inspector.actions.moveUp}>
            <ArrowUpGlyph />
          </IconBtn>
          <IconBtn onClick={onMoveDown} title={copy.inspector.actions.moveDown}>
            <ArrowDownGlyph />
          </IconBtn>
          <IconBtn onClick={onDuplicate} title={copy.inspector.actions.duplicateShortcut}>
            <DuplicateGlyph />
          </IconBtn>
          <IconBtn onClick={onDelete} title={copy.inspector.actions.delete} danger>
            <TrashGlyph />
          </IconBtn>
        </span>
      </header>

      <ViewTabs value={view} onChange={setView} />

      {view === 'content' ? (
        renderForm(block, set, setMany, {
          productOptions,
          categoryOptions,
          blockOutline,
          giphyStorefrontSlug,
          storefrontSlug,
        })
      ) : (
        <StyleControls
          blockType={block.type}
          style={block.style}
          onChange={onChangeStyle}
          currentPlan={currentPlan}
          pendingTextEffect={pendingTextEffect}
        />
      )}
    </div>
  );
}

function renderForm(
  block: Block,
  set: (k: string, v: unknown) => void,
  setMany: (patch: Record<string, unknown>) => void,
  ctx: {
    productOptions: ProductOption[];
    categoryOptions: string[];
    blockOutline?: BlockOutlineEntry[];
    giphyStorefrontSlug?: string;
    storefrontSlug: string;
  },
): ReactNode {
  const p = block.props as Record<string, unknown>;
  const giphyStorefrontSlug = ctx.giphyStorefrontSlug;
  const storefrontSlug = ctx.storefrontSlug;
  // Anchor pickers exclude the current block (you can't scroll to yourself)
  // and any block whose id is missing.
  const anchorTargets = (ctx.blockOutline ?? []).filter((b) => b.id && b.id !== block.id);
  switch (block.type) {
    case 'hero':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
          </Field>
          <Field label="Title">
            <TextInput value={str(p.title)} onChange={(v) => set('title', v)} />
          </Field>
          <Field label="Tagline">
            <TextArea value={str(p.tagline)} onChange={(v) => set('tagline', v)} rows={3} />
          </Field>
          <Field label="Layout">
            <SegmentedControl
              value={str(p.layout) || 'centered'}
              onChange={(v) => set('layout', v)}
              options={[
                { value: 'centered', label: 'Centered' },
                { value: 'inline', label: 'Inline' },
                { value: 'banner', label: 'Banner' },
              ]}
            />
          </Field>
          <HeroBackgroundField
            backgroundUrl={str(p.backgroundUrl)}
            backgroundCss={str(p.backgroundCss)}
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
            onUploadChange={(v) =>
              // Picking an upload clears any active pattern so the
              // renderer never has to break ties between the two
              // background sources at render time.
              setMany({
                backgroundUrl: v,
                backgroundCss: undefined,
                backgroundCssSize: undefined,
              })
            }
            onPatternPick={(css) =>
              setMany({
                backgroundCss: css,
                backgroundCssSize: undefined,
                backgroundUrl: undefined,
              })
            }
            onClearPattern={() =>
              setMany({
                backgroundCss: undefined,
                backgroundCssSize: undefined,
              })
            }
          />
          <LogoModeField
            mode={resolveLogoMode(p)}
            url={str(p.logoUrl)}
            storefrontSlug={storefrontSlug}
            onModeChange={(v) => setMany({ logoMode: v, showLogo: v !== 'hide' })}
            onUrlChange={(v) => setMany({ logoMode: 'custom', showLogo: true, logoUrl: v })}
          />
          <GlyphModeField
            mode={resolveGlyphMode(p)}
            url={str(p.glyphUrl)}
            text={str(p.glyphText)}
            storefrontSlug={storefrontSlug}
            onModeChange={(v) => setMany({ glyphMode: v, showGlyph: v !== 'hide' })}
            onUrlChange={(v) => setMany({ glyphMode: 'custom', showGlyph: true, glyphUrl: v })}
            onTextChange={(v) => set('glyphText', v)}
          />
          <CtaForm
            cta={p.cta as Cta}
            onChange={(v) => set('cta', v)}
            anchorTargets={anchorTargets}
          />
        </Section>
      );
    case 'banner':
      return (
        <Section>
          <Field label="Image">
            <MediaUploader
              value={str(p.imageUrl)}
              onChange={(v) => set('imageUrl', v)}
              namespace="banner"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={giphyStorefrontSlug}
            />
          </Field>
          <Field label="Alt text">
            <TextInput
              value={str(p.alt)}
              onChange={(v) => set('alt', v)}
              placeholder="Describe the image"
            />
          </Field>
          <Field label="Title">
            <TextInput value={str(p.overlayTitle)} onChange={(v) => set('overlayTitle', v)} />
          </Field>
          <Field label="Subtitle">
            <TextArea
              value={str(p.overlaySubtitle)}
              onChange={(v) => set('overlaySubtitle', v)}
              rows={3}
            />
          </Field>
          <Field label="Alignment">
            <SegmentedControl
              value={str(p.align) || 'center'}
              onChange={(v) => set('align', v)}
              options={[
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' },
              ]}
            />
          </Field>
          <Field label="Scrim">
            <SegmentedControl
              value={str(p.scrim) || 'soft'}
              onChange={(v) => set('scrim', v)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'soft', label: 'Soft' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Field>
          <CtaForm
            cta={p.cta as Cta}
            onChange={(v) => set('cta', v)}
            anchorTargets={anchorTargets}
          />
        </Section>
      );
    case 'text':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
          </Field>
          <Field label="Heading">
            <TextInput value={str(p.heading)} onChange={(v) => set('heading', v)} />
          </Field>
          <Field label="Body">
            <TextArea value={str(p.body)} onChange={(v) => set('body', v)} rows={6} />
          </Field>
          <Field label="Alignment">
            <SegmentedControl
              value={str(p.align) || 'start'}
              onChange={(v) => set('align', v)}
              options={[
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' },
              ]}
            />
          </Field>
        </Section>
      );
    case 'image':
      return (
        <Section>
          <Field label="Image">
            <MediaUploader
              value={str(p.imageUrl)}
              onChange={(v) => set('imageUrl', v)}
              namespace="image"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={giphyStorefrontSlug}
            />
          </Field>
          <Field label="Caption">
            <TextInput value={str(p.caption)} onChange={(v) => set('caption', v)} />
          </Field>
          <Field label="Aspect ratio">
            <SegmentedControl
              value={str(p.aspect) || '4/3'}
              onChange={(v) => set('aspect', v)}
              options={[
                { value: '1/1', label: '1:1' },
                { value: '4/3', label: '4:3' },
                { value: '3/4', label: '3:4' },
                { value: '16/9', label: '16:9' },
                { value: '21/9', label: '21:9' },
              ]}
            />
          </Field>
        </Section>
      );
    case 'gallery':
      return (
        <Section>
          <GalleryEditor
            items={(p.items as GalleryItem[]) ?? []}
            onChange={(items) => set('items', items)}
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
          <Field label="Columns">
            <SegmentedControl
              value={String(p.columns ?? 3)}
              onChange={(v) => set('columns', Number(v))}
              options={[
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
              ]}
            />
          </Field>
          <Field label="Aspect">
            <SegmentedControl
              value={str(p.aspect) || '1/1'}
              onChange={(v) => set('aspect', v)}
              options={[
                { value: '1/1', label: '1:1' },
                { value: '4/3', label: '4:3' },
                { value: '3/4', label: '3:4' },
              ]}
            />
          </Field>
        </Section>
      );
    case 'productGrid':
      return (
        <Section>
          <Field label="Layout">
            <LayoutThumbPicker
              value={str(p.layout) || 'cards'}
              onChange={(v) => set('layout', v)}
              options={[
                { value: 'cards', label: 'Cards', glyph: <CardsThumb /> },
                { value: 'minimal', label: 'Minimal', glyph: <MinimalThumb /> },
                { value: 'lookbook', label: 'Lookbook', glyph: <LookbookThumb /> },
              ]}
            />
          </Field>
          <Field label="Columns">
            <SegmentedControl
              value={String(p.columns ?? 3)}
              onChange={(v) => set('columns', Number(v))}
              options={[
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
              ]}
            />
          </Field>
          <Field label="Filter by category">
            <CategoryPicker
              value={str(p.category)}
              options={ctx.categoryOptions}
              onChange={(v) => set('category', v)}
            />
          </Field>
          <Field label="Limit">
            <NumberInput value={num(p.limit)} onChange={(v) => set('limit', v)} placeholder="All" />
          </Field>
        </Section>
      );
    case 'productList':
      return (
        <Section>
          <Field label="Show images">
            <Toggle checked={bool(p.showImages, true)} onChange={(v) => set('showImages', v)} />
          </Field>
          <Field label="Show prices">
            <Toggle checked={bool(p.showPrices, true)} onChange={(v) => set('showPrices', v)} />
          </Field>
          <Field label="Group by category">
            <Toggle checked={bool(p.groupByCategory)} onChange={(v) => set('groupByCategory', v)} />
          </Field>
          <Field label="Filter by category">
            <CategoryPicker
              value={str(p.category)}
              options={ctx.categoryOptions}
              onChange={(v) => set('category', v)}
            />
          </Field>
          <Field label="Limit">
            <NumberInput value={num(p.limit)} onChange={(v) => set('limit', v)} placeholder="All" />
          </Field>
        </Section>
      );
    case 'featuredProduct':
      return (
        <Section>
          <Field label="Product">
            <ProductPicker
              value={str(p.productId)}
              options={ctx.productOptions}
              onChange={(v) => set('productId', v)}
            />
          </Field>
          <Field label="Layout">
            <SegmentedControl
              value={str(p.layout) || 'split'}
              onChange={(v) => set('layout', v)}
              options={[
                { value: 'split', label: 'Split' },
                { value: 'stacked', label: 'Stacked' },
              ]}
            />
          </Field>
        </Section>
      );
    case 'spotlightCard':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput
              value={str(p.eyebrow)}
              onChange={(v) => set('eyebrow', v)}
              placeholder="Optional small line above"
            />
          </Field>
          <Field label="Headline">
            <TextInput
              value={str(p.title)}
              onChange={(v) => set('title', v)}
              placeholder="Required"
            />
          </Field>
          <Field label="Body">
            <TextInput
              value={str(p.body)}
              onChange={(v) => set('body', v)}
              placeholder="Optional supporting paragraph"
            />
          </Field>
          <Field label="Show date badge">
            <Toggle checked={bool(p.showDate, true)} onChange={(v) => set('showDate', v)} />
          </Field>
          <Field label="Date · top line">
            <TextInput
              value={str(p.dateMonth)}
              onChange={(v) => set('dateMonth', v)}
              placeholder="JUNE"
            />
          </Field>
          <Field label="Date · bottom line">
            <TextInput
              value={str(p.dateDay)}
              onChange={(v) => set('dateDay', v)}
              placeholder="29"
            />
          </Field>
          <Field label="Pattern">
            <SegmentedControl
              value={str(p.pattern) || 'stripes'}
              onChange={(v) => set('pattern', v)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'stripes', label: 'Stripes' },
                { value: 'dots', label: 'Dots' },
                { value: 'grid', label: 'Grid' },
              ]}
            />
          </Field>
          <Field label="Tilt direction">
            <SegmentedControl
              value={str(p.tiltDirection) || 'right'}
              onChange={(v) => set('tiltDirection', v)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'none', label: 'Lift only' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </Field>
          <Field label="Intensity">
            <SegmentedControl
              value={str(p.intensity) || 'medium'}
              onChange={(v) => set('intensity', v)}
              options={[
                { value: 'subtle', label: 'Subtle' },
                { value: 'medium', label: 'Med' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Field>
          <Field label="Accent colour">
            <TextInput
              value={str(p.accentColor)}
              onChange={(v) => set('accentColor', v)}
              placeholder="Defaults to your storefront accent"
            />
          </Field>
          <Field label="Width">
            <SegmentedControl
              value={str(p.width) || 'wide'}
              onChange={(v) => set('width', v)}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'wide', label: 'Wide' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </Field>
          <Field label="CTA label">
            <TextInput
              value={str((p.cta as { label?: string } | undefined)?.label)}
              onChange={(label) => {
                const cur = (p.cta as { label?: string; href?: string } | undefined) ?? {};
                if (!label.trim()) {
                  set('cta', undefined);
                  return;
                }
                set('cta', { label: label.trim(), href: cur.href ?? '#' });
              }}
              placeholder="See more"
            />
          </Field>
          <Field label="CTA link">
            <TextInput
              value={str((p.cta as { href?: string } | undefined)?.href)}
              onChange={(href) => {
                const cur = (p.cta as { label?: string; href?: string } | undefined) ?? {};
                if (!cur.label?.trim()) return;
                set('cta', { label: cur.label, href: href || '#' });
              }}
              placeholder="https://… or # for none"
            />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            On hover the card lifts and tilts in your chosen direction; the inner copy rises in a
            soft cascade. Reduced-motion visitors get only the shadow lift.
          </p>
        </Section>
      );
    case 'tiltImage':
      return (
        <Section>
          <Field label="Image">
            <MediaUploader
              value={str(p.imageUrl)}
              onChange={(url) => set('imageUrl', url)}
              namespace="tilt-image"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={ctx.giphyStorefrontSlug}
            />
          </Field>
          <Field label="Alt text">
            <TextInput
              value={str(p.alt)}
              onChange={(v) => set('alt', v)}
              placeholder="Describe the image for assistive tech"
            />
          </Field>
          <Field label="Headline">
            <TextInput
              value={str(p.title)}
              onChange={(v) => set('title', v)}
              placeholder="Optional overlay headline"
            />
          </Field>
          <Field label="Subhead">
            <TextInput
              value={str(p.subtitle)}
              onChange={(v) => set('subtitle', v)}
              placeholder="Optional supporting line"
            />
          </Field>
          <Field label="Tilt direction">
            <SegmentedControl
              value={str(p.tiltDirection) || 'right'}
              onChange={(v) => set('tiltDirection', v)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'none', label: 'Lift only' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </Field>
          <Field label="Intensity">
            <SegmentedControl
              value={str(p.intensity) || 'medium'}
              onChange={(v) => set('intensity', v)}
              options={[
                { value: 'subtle', label: 'Subtle' },
                { value: 'medium', label: 'Med' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Field>
          <Field label="Scrim">
            <SegmentedControl
              value={str(p.scrim) || 'soft'}
              onChange={(v) => set('scrim', v)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'soft', label: 'Soft' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Field>
          <Field label="Aspect">
            <SegmentedControl
              value={str(p.aspect) || '16/9'}
              onChange={(v) => set('aspect', v)}
              options={[
                { value: '1/1', label: '1:1' },
                { value: '4/5', label: '4:5' },
                { value: '4/3', label: '4:3' },
                { value: '16/9', label: '16:9' },
                { value: 'auto', label: 'Auto' },
              ]}
            />
          </Field>
          <Field label="Width">
            <SegmentedControl
              value={str(p.width) || 'wide'}
              onChange={(v) => set('width', v)}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'wide', label: 'Wide' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            The card lifts and tilts on hover. Reduced-motion visitors see only a soft shadow lift;
            the tilt is suppressed.
          </p>
        </Section>
      );
    case 'productPromoCard': {
      const tags = Array.isArray(p.tags)
        ? (p.tags as Array<{
            id: string;
            label: string;
            color?: string;
            background?: string;
          }>)
        : [];
      return (
        <Section>
          <Field label="Product">
            <ProductPicker
              value={str(p.productId)}
              options={ctx.productOptions}
              onChange={(v) => set('productId', v)}
            />
          </Field>
          <PromoTagsEditor
            tags={tags}
            onChange={(next) => set('tags', next.length === 0 ? undefined : next)}
          />
          <Field label="Tag position">
            <SegmentedControl
              value={str(p.tagPosition) || 'top-end'}
              onChange={(v) => set('tagPosition', v)}
              options={[
                { value: 'top-start', label: 'Top start' },
                { value: 'top-end', label: 'Top end' },
              ]}
            />
          </Field>
          <Field label="Tag reveal">
            <SegmentedControl
              value={str(p.tagReveal) || 'on-hover'}
              onChange={(v) => set('tagReveal', v)}
              options={[
                { value: 'always', label: 'Always' },
                { value: 'on-hover', label: 'On hover' },
              ]}
            />
          </Field>
          <Field label="Add to cart button">
            <Toggle
              checked={bool(p.showAddToCart, true)}
              onChange={(v) => set('showAddToCart', v)}
            />
          </Field>
          <Field label="Intensity">
            <SegmentedControl
              value={str(p.intensity) || 'medium'}
              onChange={(v) => set('intensity', v)}
              options={[
                { value: 'subtle', label: 'Subtle' },
                { value: 'medium', label: 'Med' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Field>
          <Field label="Accent colour">
            <TextInput
              value={str(p.accentColor)}
              onChange={(v) => set('accentColor', v)}
              placeholder="Defaults to your storefront accent"
            />
          </Field>
          <Field label="Width">
            <SegmentedControl
              value={str(p.width) || 'wide'}
              onChange={(v) => set('width', v)}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'wide', label: 'Wide' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            Pick a product, add up to three tags ("NEW", "SALE", …), and the card lifts on hover.
            The "+" button hits the cart island when your storefront has payments wired.
          </p>
        </Section>
      );
    }
    case 'productCardStack': {
      const backCardsRaw = num(p.backCards);
      const backCardsValue = backCardsRaw === 2 ? '2' : '1';
      return (
        <Section>
          <Field label="Product">
            <ProductPicker
              value={str(p.productId)}
              options={ctx.productOptions}
              onChange={(v) => set('productId', v)}
            />
          </Field>
          <Field label="Back cards">
            <SegmentedControl
              value={backCardsValue}
              onChange={(v) => set('backCards', v === '2' ? 2 : 1)}
              options={[
                { value: '1', label: 'One' },
                { value: '2', label: 'Two' },
              ]}
            />
          </Field>
          <Field label="Eyebrow">
            <TextInput
              value={str(p.eyebrow)}
              onChange={(v) => set('eyebrow', v)}
              placeholder="Falls back to the product's category"
            />
          </Field>
          <Field label="CTA label">
            <TextInput
              value={str(p.ctaLabel)}
              onChange={(v) => set('ctaLabel', v)}
              placeholder="View"
            />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            Hovering the front card fans the back card outward. The arrow links to the product page;
            replace it with an in-page anchor by adding a scroll target later.
          </p>
        </Section>
      );
    }
    case 'serviceList': {
      const items = Array.isArray(p.items)
        ? (p.items as Array<{
            id: string;
            title: string;
            description?: string;
            priceQar?: number;
            status?: 'active' | 'sold_out';
          }>)
        : [];
      const usingInline = items.length > 0;
      return (
        <Section>
          <Field label="Heading">
            <TextInput
              value={str(p.heading)}
              onChange={(v) => set('heading', v)}
              placeholder="Services"
            />
          </Field>
          <ServiceItemsEditor
            items={items}
            onChange={(next) => set('items', next.length === 0 ? undefined : next)}
          />
          {!usingInline ? (
            <Field label="Filter by category">
              <CategoryPicker
                value={str(p.category)}
                options={ctx.categoryOptions}
                onChange={(v) => set('category', v)}
              />
            </Field>
          ) : null}
          {!usingInline ? (
            <Field label="Limit">
              <NumberInput
                value={num(p.limit)}
                onChange={(v) => set('limit', v)}
                placeholder="All"
              />
            </Field>
          ) : null}
          <Field label="Show inquire button">
            <Toggle checked={bool(p.showInquire, true)} onChange={(v) => set('showInquire', v)} />
          </Field>
          {usingInline ? (
            <p
              style={{
                fontSize: 11,
                color: 'var(--bld-text-muted)',
                margin: '4px 0 0',
                lineHeight: 1.55,
              }}
            >
              Inline rows skip the inquire button — they're not backed by a product row. Clear the
              list above to fall back to your products table.
            </p>
          ) : null}
        </Section>
      );
    }
    case 'menu':
      return (
        <Section>
          <Field label="Group by category">
            <Toggle
              checked={bool(p.groupByCategory, true)}
              onChange={(v) => set('groupByCategory', v)}
            />
          </Field>
          <Field label="Limit">
            <NumberInput value={num(p.limit)} onChange={(v) => set('limit', v)} placeholder="All" />
          </Field>
        </Section>
      );
    case 'calendar':
      return (
        <Section>
          <Field label="Filter by category">
            <CategoryPicker
              value={str(p.category)}
              options={ctx.categoryOptions}
              onChange={(v) => set('category', v)}
            />
          </Field>
          <Field label="Limit">
            <NumberInput value={num(p.limit)} onChange={(v) => set('limit', v)} placeholder="All" />
          </Field>
        </Section>
      );
    case 'contactCard':
      return (
        <Section>
          <Field label="Heading">
            <TextInput
              value={str(p.heading)}
              onChange={(v) => set('heading', v)}
              placeholder="Visit us"
            />
          </Field>
          <Field label="Body">
            <TextArea value={str(p.body)} onChange={(v) => set('body', v)} rows={3} />
          </Field>
          <Field label="Phone">
            <TextInput
              value={str(p.phone)}
              onChange={(v) => set('phone', v)}
              placeholder="From profile"
            />
          </Field>
          <Field label="Show phone">
            <Toggle checked={bool(p.showPhone, true)} onChange={(v) => set('showPhone', v)} />
          </Field>
          <Field label="Area">
            <TextInput
              value={str(p.area)}
              onChange={(v) => set('area', v)}
              placeholder="From profile"
            />
          </Field>
          <Field label="Show area">
            <Toggle checked={bool(p.showArea, true)} onChange={(v) => set('showArea', v)} />
          </Field>
          <Field label="Hours">
            <TextInput
              value={str(p.hours)}
              onChange={(v) => set('hours', v)}
              placeholder="From profile"
            />
          </Field>
          <Field label="Show hours">
            <Toggle checked={bool(p.showHours, true)} onChange={(v) => set('showHours', v)} />
          </Field>
          <Field label="Instagram">
            <TextInput
              value={str(p.instagram)}
              onChange={(v) => set('instagram', v)}
              placeholder="From profile (handle without @)"
            />
          </Field>
          <Field label="Show Instagram">
            <Toggle
              checked={bool(p.showInstagram, true)}
              onChange={(v) => set('showInstagram', v)}
            />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            Leave a field blank to fall back to the value from your storefront profile (Account →
            Account information).
          </p>
        </Section>
      );
    case 'inquireCta':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
          </Field>
          <Field label="Title">
            <TextInput value={str(p.title)} onChange={(v) => set('title', v)} />
          </Field>
          <Field label="Body">
            <TextArea value={str(p.body)} onChange={(v) => set('body', v)} rows={3} />
          </Field>
          <Field label="Alignment">
            <SegmentedControl
              value={str(p.align) || 'center'}
              onChange={(v) => set('align', v)}
              options={[
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' },
              ]}
            />
          </Field>
        </Section>
      );
    case 'spacer':
      return (
        <Section>
          <Field label="Height">
            <SegmentedControl
              value={str(p.size) || 'md'}
              onChange={(v) => set('size', v)}
              options={[
                { value: 'sm', label: 'Sm' },
                { value: 'md', label: 'Md' },
                { value: 'lg', label: 'Lg' },
                { value: 'xl', label: 'XL' },
              ]}
            />
          </Field>
        </Section>
      );
    case 'divider':
      return (
        <Section>
          <Field label="Width">
            <SegmentedControl
              value={str(p.width) || 'wide'}
              onChange={(v) => set('width', v)}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'wide', label: 'Wide' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </Field>
          <Field label="Show monogram">
            <Toggle checked={bool(p.glyph)} onChange={(v) => set('glyph', v)} />
          </Field>
        </Section>
      );
    case 'depthShowcase':
      return (
        <Section>
          <Field label="Image">
            <MediaUploader
              value={str(p.imageUrl)}
              onChange={(url) => set('imageUrl', url)}
              namespace="depth-showcase"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={ctx.giphyStorefrontSlug}
            />
          </Field>
          <Field label="Alt text">
            <TextInput
              value={str(p.imageAlt)}
              onChange={(v) => set('imageAlt', v)}
              placeholder="Describe the image"
            />
          </Field>
          <Field label="Title">
            <TextInput
              value={str(p.title)}
              onChange={(v) => set('title', v)}
              placeholder="Headline on the card"
            />
          </Field>
          <Field label="Description">
            <TextInput
              value={str(p.description)}
              onChange={(v) => set('description', v)}
              placeholder="Optional supporting line"
            />
          </Field>
          <Field label="Width">
            <SegmentedControl
              value={str(p.width) || 'wide'}
              onChange={(v) => set('width', v)}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'wide', label: 'Wide' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            Premium parallax depth. Prefer at most one per page; 3D is reduced on small screens
            for visitors who prefer motion safety.
          </p>
        </Section>
      );
    case 'auroraRibbon':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput
              value={str(p.eyebrow)}
              onChange={(v) => set('eyebrow', v)}
              placeholder="Optional small caps line"
            />
          </Field>
          <Field label="Title">
            <TextInput
              value={str(p.title)}
              onChange={(v) => set('title', v)}
              placeholder="Main line"
            />
          </Field>
          <Field label="Subtitle">
            <TextInput
              value={str(p.subtitle)}
              onChange={(v) => set('subtitle', v)}
              placeholder="Optional supporting copy"
            />
          </Field>
          <Field label="Height (px)">
            <NumberInput
              min={120}
              value={num(p.heightPx)}
              onChange={(v) => set('heightPx', v)}
              placeholder="200"
            />
          </Field>
          <Field label="Brightness">
            <NumberInput
              min={0.3}
              step={0.05}
              value={num(p.brightness)}
              onChange={(v) => set('brightness', v)}
              placeholder="0.85"
            />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            WebGL aurora strip. Use one short ribbon per page; heavy on mobile GPUs.
          </p>
        </Section>
      );
    case 'shaderHero':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
          </Field>
          <Field label="Title">
            <TextInput value={str(p.title)} onChange={(v) => set('title', v)} />
          </Field>
          <Field label="Subtitle">
            <TextArea value={str(p.subtitle)} onChange={(v) => set('subtitle', v)} rows={2} />
          </Field>
          <Field label="Tone">
            <SegmentedControl
              value={str(p.tone) || 'ink'}
              onChange={(v) => set('tone', v)}
              options={[
                { value: 'cream', label: 'Cream' },
                { value: 'ink', label: 'Ink' },
                { value: 'gold', label: 'Gold' },
              ]}
            />
          </Field>
          <Field label="Layout">
            <SegmentedControl
              value={str(p.layout) || 'immersive'}
              onChange={(v) => set('layout', v)}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'immersive', label: 'Immersive' },
              ]}
            />
          </Field>
        </Section>
      );
    case 'parallaxStoryHero':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
          </Field>
          <Field label="Title">
            <TextInput value={str(p.title)} onChange={(v) => set('title', v)} />
          </Field>
          <Field label="Subtitle">
            <TextArea value={str(p.subtitle)} onChange={(v) => set('subtitle', v)} rows={2} />
          </Field>
          <Field label="Tone">
            <SegmentedControl
              value={str(p.tone) || 'ink'}
              onChange={(v) => set('tone', v)}
              options={[
                { value: 'cream', label: 'Cream' },
                { value: 'ink', label: 'Ink' },
                { value: 'gold', label: 'Gold' },
              ]}
            />
          </Field>
          <Field label="Layout">
            <SegmentedControl
              value={str(p.layout) || 'immersive'}
              onChange={(v) => set('layout', v)}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'immersive', label: 'Immersive' },
              ]}
            />
          </Field>
          <Field label="Parallax strength">
            <SegmentedControl
              value={str(p.intensity) || 'medium'}
              onChange={(v) => set('intensity', v)}
              options={[
                { value: 'subtle', label: 'Subtle' },
                { value: 'medium', label: 'Medium' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Field>
          <Field label="Background photo (optional)">
            <MediaUploader
              value={str(p.backgroundImage)}
              onChange={(url) => set('backgroundImage', url)}
              namespace="parallax-hero-bg"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={ctx.giphyStorefrontSlug}
            />
          </Field>
          <Field label="Midground cutout (optional)">
            <MediaUploader
              value={str(p.midgroundImage)}
              onChange={(url) => set('midgroundImage', url)}
              namespace="parallax-hero-mid"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={ctx.giphyStorefrontSlug}
            />
          </Field>
          <Field label="Foreground cutout (optional)">
            <MediaUploader
              value={str(p.foregroundImage)}
              onChange={(url) => set('foregroundImage', url)}
              namespace="parallax-hero-fg"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={ctx.giphyStorefrontSlug}
            />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            Layers move at different speeds as visitors scroll; the headline scatters per letter.
            Cutouts work best as transparent PNGs. Static under reduced-motion.
          </p>
        </Section>
      );
    case 'productSpotlight3d':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
          </Field>
          <Field label="Title">
            <TextInput value={str(p.title)} onChange={(v) => set('title', v)} />
          </Field>
          <Field label="Subtitle">
            <TextArea value={str(p.subtitle)} onChange={(v) => set('subtitle', v)} rows={2} />
          </Field>
          <Field label="Category filter">
            <TextInput
              value={str(p.category)}
              onChange={(v) => set('category', v)}
              placeholder="e.g. featured"
            />
          </Field>
          <Field label="How many">
            <NumberInput min={1} step={1} value={num(p.limit)} onChange={(v) => set('limit', v)} placeholder="3" />
          </Field>
          <Field label="Tilt strength">
            <SegmentedControl
              value={str(p.intensity) || 'medium'}
              onChange={(v) => set('intensity', v)}
              options={[
                { value: 'subtle', label: 'Subtle' },
                { value: 'medium', label: 'Medium' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Field>
        </Section>
      );
    case 'socialProofWall':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
          </Field>
          <Field label="Title">
            <TextInput value={str(p.title)} onChange={(v) => set('title', v)} />
          </Field>
          <Field label="Speed">
            <SegmentedControl
              value={str(p.speed) || 'medium'}
              onChange={(v) => set('speed', v)}
              options={[
                { value: 'slow', label: 'Slow' },
                { value: 'medium', label: 'Medium' },
                { value: 'fast', label: 'Fast' },
              ]}
            />
          </Field>
          <SocialProofReviewsEditor
            items={(p.reviews as SocialProofReview[]) ?? []}
            onChange={(reviews) => set('reviews', reviews)}
          />
        </Section>
      );
    case 'curvedLoop':
      return (
        <Section>
          <Field label="Loop text">
            <TextArea
              value={str(p.marqueeText) || 'Add Text Here'}
              onChange={(v) => set('marqueeText', v)}
              rows={2}
            />
          </Field>
          <Field label="Size">
            <SegmentedControl
              value={str(p.size) || 'standard'}
              onChange={(v) => set('size', v)}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'standard', label: 'Standard' },
                { value: 'hero', label: 'Hero' },
              ]}
            />
          </Field>
          <Field label="Tone">
            <SegmentedControl
              value={str(p.tone) || 'accent'}
              onChange={(v) => set('tone', v)}
              options={[
                { value: 'accent', label: 'Accent' },
                { value: 'ink', label: 'Ink' },
                { value: 'gold', label: 'Gold' },
                { value: 'muted', label: 'Muted' },
              ]}
            />
          </Field>
          <Field label="Direction">
            <SegmentedControl
              value={str(p.direction) || 'left'}
              onChange={(v) => set('direction', v)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </Field>
          <Field label="Speed">
            <NumberInput
              min={0.2}
              step={0.1}
              value={num(p.speed)}
              onChange={(v) => set('speed', v)}
              placeholder="1.6"
            />
          </Field>
          <Field label="Curve">
            <NumberInput
              min={120}
              value={num(p.curveAmount)}
              onChange={(v) => set('curveAmount', v)}
              placeholder="360"
            />
          </Field>
          <Field label="Draggable">
            <Toggle checked={p.interactive !== false} onChange={(v) => set('interactive', v)} />
          </Field>
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-muted)',
              margin: '4px 0 0',
              lineHeight: 1.55,
            }}
          >
            Curved marquee. It automatically softens the curve on tablet and mobile.
          </p>
        </Section>
      );
    case 'showcase1':
      return (
        <>
          <Section>
            <Field label="Eyebrow">
              <TextInput
                value={str(p.eyebrow)}
                onChange={(v) => set('eyebrow', v)}
                placeholder="Featured paths"
              />
            </Field>
            <Field label="Title">
              <TextArea value={str(p.title)} onChange={(v) => set('title', v)} rows={3} />
            </Field>
            <Field label="Description">
              <TextArea
                value={str(p.description)}
                onChange={(v) => set('description', v)}
                rows={3}
              />
            </Field>
          </Section>
          <Showcase1ItemsEditor
            items={Array.isArray(p.items) ? (p.items as Showcase1Item[]) : []}
            onChange={(items) => set('items', items)}
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
        </>
      );
    case 'showcase2':
      return (
        <>
          <Section>
            <Field label="Eyebrow">
              <TextInput
                value={str(p.eyebrow)}
                onChange={(v) => set('eyebrow', v)}
                placeholder="Featured Work"
              />
            </Field>
            <Field label="Title">
              <TextArea value={str(p.title)} onChange={(v) => set('title', v)} rows={3} />
            </Field>
          </Section>
          <CtaForm
            cta={p.cta as Cta}
            onChange={(v) => set('cta', v)}
            anchorTargets={anchorTargets}
          />
          <Showcase2ImagesEditor
            items={Array.isArray(p.items) ? (p.items as Showcase2Image[]) : []}
            onChange={(items) => set('items', items)}
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
        </>
      );
    case 'showcase3':
      return (
        <>
          <Section>
            <Field label="Title">
              <TextInput value={str(p.title)} onChange={(v) => set('title', v)} />
            </Field>
            <Field label="Subtitle">
              <TextInput value={str(p.subtitle)} onChange={(v) => set('subtitle', v)} />
            </Field>
          </Section>
          <Showcase3ItemsEditor
            items={Array.isArray(p.items) ? (p.items as Showcase3Item[]) : []}
            onChange={(items) => set('items', items)}
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
        </>
      );
    case 'showcase4':
      return (
        <>
          <Section>
            <Field label="Eyebrow">
              <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
            </Field>
            <Field label="Title">
              <TextArea value={str(p.title)} onChange={(v) => set('title', v)} rows={3} />
            </Field>
          </Section>
          <Showcase4ProjectsEditor
            projects={Array.isArray(p.projects) ? (p.projects as Showcase4Project[]) : []}
            onChange={(projects) => set('projects', projects)}
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
        </>
      );
    case 'showcase5':
      return (
        <>
          <Section>
            <Field label="Eyebrow">
              <TextInput value={str(p.eyebrow)} onChange={(v) => set('eyebrow', v)} />
            </Field>
            <Field label="Title">
              <TextArea value={str(p.title)} onChange={(v) => set('title', v)} rows={3} />
            </Field>
            <Field label="Description">
              <TextArea
                value={str(p.description)}
                onChange={(v) => set('description', v)}
                rows={3}
              />
            </Field>
          </Section>
          <Showcase5TabsEditor
            tabs={Array.isArray(p.tabs) ? (p.tabs as Showcase5Tab[]) : []}
            onChange={(tabs) => set('tabs', tabs)}
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
        </>
      );
    case 'ecommerce1':
    case 'ecommerce2':
    case 'ecommerce3':
    case 'ecommerce4':
    case 'ecommerce5':
    case 'ecommerce6':
    case 'ecommerce7':
    case 'ecommerce9':
      return (
        <EcommerceBlockEditor
          props={p}
          onSet={set}
          onSetMany={setMany}
          anchorTargets={anchorTargets}
          giphyStorefrontSlug={giphyStorefrontSlug}
          storefrontSlug={storefrontSlug}
          blockType={block.type}
          productOptions={ctx.productOptions}
          categoryOptions={ctx.categoryOptions}
        />
      );
    case 'shadcnNavbar':
    case 'shadcnHero':
    case 'shadcnTrustStrip':
    case 'shadcnCategories':
    case 'shadcnProductCard':
    case 'shadcnProductList':
    case 'shadcnProductDetail':
    case 'shadcnQuickView':
    case 'shadcnReviews':
    case 'shadcnOrderSummary':
    case 'shadcnOfferModal':
    case 'shadcnFooter':
      return (
        <ShadcnCommerceEditor
          props={p}
          onSet={set}
          onSetMany={setMany}
          anchorTargets={anchorTargets}
          blockType={block.type}
          productOptions={ctx.productOptions}
          categoryOptions={ctx.categoryOptions}
        />
      );
    case 'animatedText':
      return (
        <Section>
          <Field label="Eyebrow">
            <TextInput
              value={str(p.eyebrow)}
              onChange={(v) => set('eyebrow', v)}
              placeholder="Optional eyebrow"
            />
          </Field>
          <Field label="Text">
            <TextArea value={str(p.text)} onChange={(v) => set('text', v)} rows={3} />
          </Field>
          <Field label="Effect">
            <SegmentedControl
              value={str(p.effect) || 'reveal'}
              onChange={(v) => set('effect', v)}
              options={[
                { value: 'reveal', label: 'Reveal' },
                { value: 'kinetic', label: 'Kinetic' },
                { value: 'wave', label: 'Wave' },
                { value: 'typewriter', label: 'Typewriter' },
                { value: 'glitch', label: 'Glitch' },
              ]}
            />
          </Field>
          <Field label="Speed">
            <SegmentedControl
              value={str(p.speed) || 'medium'}
              onChange={(v) => set('speed', v)}
              options={[
                { value: 'slow', label: 'Slow' },
                { value: 'medium', label: 'Med' },
                { value: 'fast', label: 'Fast' },
              ]}
            />
          </Field>
          <Field label="Emphasis">
            <SegmentedControl
              value={str(p.emphasis) || 'display'}
              onChange={(v) => set('emphasis', v)}
              options={[
                { value: 'display', label: 'Display' },
                { value: 'body', label: 'Body' },
              ]}
            />
          </Field>
          <Field label="Align">
            <SegmentedControl
              value={str(p.align) || 'center'}
              onChange={(v) => set('align', v)}
              options={[
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' },
              ]}
            />
          </Field>
          <Field label="Loop">
            <Toggle checked={bool(p.loop)} onChange={(v) => set('loop', v)} />
          </Field>
        </Section>
      );
    case 'animatedImage':
      return (
        <Section>
          <Field label="Image">
            <MediaUploader
              value={str(p.imageUrl)}
              onChange={(url) => set('imageUrl', url)}
              namespace="animated-image"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={ctx.giphyStorefrontSlug}
            />
          </Field>
          <Field label="Alt text">
            <TextInput
              value={str(p.alt)}
              onChange={(v) => set('alt', v)}
              placeholder="Describe the image for assistive tech"
            />
          </Field>
          <Field label="Effect">
            <SegmentedControl
              value={str(p.effect) || 'parallax'}
              onChange={(v) => set('effect', v)}
              options={[
                { value: 'parallax', label: 'Parallax' },
                { value: 'magnetic', label: 'Magnetic' },
                { value: 'kenburns', label: 'Ken Burns' },
                { value: 'tilt', label: 'Tilt' },
              ]}
            />
          </Field>
          <Field label="Intensity">
            <SegmentedControl
              value={str(p.intensity) || 'medium'}
              onChange={(v) => set('intensity', v)}
              options={[
                { value: 'subtle', label: 'Subtle' },
                { value: 'medium', label: 'Med' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Field>
          <Field label="Aspect">
            <SegmentedControl
              value={str(p.aspect) || '16/9'}
              onChange={(v) => set('aspect', v)}
              options={[
                { value: '1/1', label: '1:1' },
                { value: '4/5', label: '4:5' },
                { value: '4/3', label: '4:3' },
                { value: '16/9', label: '16:9' },
                { value: 'auto', label: 'Auto' },
              ]}
            />
          </Field>
          <Field label="Width">
            <SegmentedControl
              value={str(p.width) || 'wide'}
              onChange={(v) => set('width', v)}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'wide', label: 'Wide' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </Field>
          <Field label="Caption">
            <TextInput
              value={str(p.caption)}
              onChange={(v) => set('caption', v)}
              placeholder="Optional caption"
            />
          </Field>
        </Section>
      );
    case 'mawid':
      return (
        <Section>
          <Field label="Design style">
            <SegmentedControl
              value={(str(p.variant) || 'boxed') as 'boxed' | 'inline' | 'banner'}
              onChange={(v) => set('variant', v)}
              options={[
                { value: 'boxed', label: 'Boxed' },
                { value: 'inline', label: 'Inline' },
                { value: 'banner', label: 'Banner' },
              ]}
            />
          </Field>
          <Field label="Product">
            <ProductPicker
              value={str(p.productId)}
              options={ctx.productOptions}
              onChange={(v) => set('productId', v)}
            />
          </Field>
          <Field label="Launch time">
            <DateTimeInput value={str(p.startsAt)} onChange={(v) => set('startsAt', v)} />
          </Field>
          <Field label="Event id (optional · from Apps → Mawid)">
            <TextInput
              value={str(p.eventId)}
              onChange={(v) => set('eventId', v)}
              placeholder="Leave empty to use product + launch time"
            />
          </Field>
          <Field label="Heading override">
            <TextInput
              value={str(p.heading)}
              onChange={(v) => set('heading', v)}
              placeholder="Falls back to the event's bilingual label"
            />
          </Field>
          <Field label="Subheading">
            <TextArea value={str(p.subheading)} onChange={(v) => set('subheading', v)} rows={2} />
          </Field>
        </Section>
      );
    case 'drop':
      return (
        <Section>
          <Field label="Drop ID">
            <TextInput
              value={str(p.dropId)}
              onChange={(v) => set('dropId', v.trim() || 'component-showcase')}
              placeholder="component-showcase"
            />
          </Field>
          <Field label="Heading override">
            <TextInput
              value={str(p.heading)}
              onChange={(v) => set('heading', v)}
              placeholder="Falls back to the Drop Manager title"
            />
          </Field>
          <Field label="Subheading">
            <TextArea value={str(p.subheading)} onChange={(v) => set('subheading', v)} rows={2} />
          </Field>
          <p style={helpTextStyle()}>
            Use <strong>component-showcase</strong> for a safe preview, then replace it with the
            real Drop Manager ID before publishing a real launch.
          </p>
        </Section>
      );
    case 'taqim':
      return (
        <>
          <Section>
            <Field label="Design style">
              <SegmentedControl
                value={(str(p.variant) || 'cards') as 'stack' | 'cards' | 'carousel'}
                onChange={(v) => set('variant', v)}
                options={[
                  { value: 'stack', label: 'Stack' },
                  { value: 'cards', label: 'Cards' },
                  { value: 'carousel', label: 'Carousel' },
                ]}
              />
            </Field>
            <Field label="Bundle id (empty = Builder controlled)">
              <TextInput
                value={str(p.bundleId)}
                onChange={(v) => set('bundleId', v)}
                placeholder="Optional app bundle id"
              />
            </Field>
            <Field label="Anchor product">
              <ProductPicker
                value={str(p.anchorProductId)}
                options={ctx.productOptions}
                onChange={(v) => set('anchorProductId', v)}
              />
            </Field>
            <Field label="Heading override">
              <TextInput
                value={str(p.heading)}
                onChange={(v) => set('heading', v)}
                placeholder="Falls back to the bundle's bilingual title"
              />
            </Field>
          </Section>
          <TaqimBundleEditor
            value={(p.bundle as TaqimBlockProps['bundle']) ?? {}}
            onChange={(bundle) => set('bundle', bundle)}
            productOptions={ctx.productOptions}
          />
        </>
      );
  }
}

// =========================================================================
// Style controls (per-block) — Framer-style icon-driven sub-panels
// =========================================================================

// Resolve a stored padding (legacy named token OR raw px number) to a
// concrete pixel value the stepper can edit. Keeps existing seeds working.
const PAD_Y_PX: Record<string, number> = { none: 0, sm: 16, md: 28, lg: 56, xl: 96 };
const PAD_X_PX: Record<string, number> = { none: 0, sm: 12, md: 22, lg: 36 };

function paddingToPx(v: unknown, map: Record<string, number>, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === 'string' && v in map) return map[v]!;
  return fallback;
}

// ── Primitives ───────────────────────────────────────────────────────────

/** Dark chip strip from the Framer screenshot — 36px tall, icon-only,
 *  active chip flips to Souqna maroon background + sand ink. Generic so
 *  every panel reuses the same active-state visual language. */
function IconChipGroup<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  fill = false,
}: {
  value?: T;
  options: Array<{ id: T; icon: ReactNode; label: string }>;
  onChange: (v: T | undefined) => void;
  ariaLabel?: string;
  /** When true the strip stretches to fill its container (one chip / col). */
  fill?: boolean;
}) {
  const text = useInspectorText();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: fill ? 'grid' : 'inline-flex',
        gridTemplateColumns: fill ? `repeat(${options.length}, 1fr)` : undefined,
        gap: 2,
        padding: 3,
        background: 'var(--bld-tile-bg)',
        border: '1px solid rgba(201,169,97,0.18)',
        borderRadius: 8,
      }}
    >
      {options.map((o) => {
        const active = o.id === value;
        const label = text.option(o.label);
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(active ? undefined : o.id)}
            style={{
              height: 32,
              minWidth: 32,
              padding: '0 8px',
              border: 'none',
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: active ? 'var(--bld-chip-bg-active)' : 'transparent',
              color: active ? 'var(--bld-text)' : 'var(--bld-text-muted)',
              boxShadow: active ? 'inset 0 0 0 1px var(--bld-input-border)' : undefined,
              cursor: 'pointer',
              transition: 'background 120ms, color 120ms',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = 'var(--bld-divider)';
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = 'transparent';
            }}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}

/** Compact pixel input — small icon + bare number with `px` suffix.
 *  Designed for the 2-column spacing grid where four of these stack. */
function PixelInput({
  value,
  onChange,
  icon,
  ariaLabel,
  placeholder = '—',
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  icon?: ReactNode;
  ariaLabel?: string;
  placeholder?: string;
}) {
  // Controlled input: render value directly. An empty string commits
  // `undefined` so callers can distinguish "unset" (use legacy token) from
  // "explicitly 0px".
  const display = value == null ? '' : String(value);
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
        height: 32,
        background: 'var(--bld-tile-bg)',
        border: '1px solid rgba(201,169,97,0.18)',
        borderRadius: 8,
        color: 'var(--bld-text-muted)',
      }}
    >
      {icon ? (
        <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0 }}>
          {icon}
        </span>
      ) : null}
      <input
        type="number"
        min={0}
        aria-label={ariaLabel}
        value={display}
        placeholder={placeholder}
        onChange={(e) => {
          const t = e.target.value;
          if (t === '') {
            onChange(undefined);
            return;
          }
          const n = Number(t);
          if (Number.isFinite(n)) onChange(Math.max(0, Math.round(n)));
        }}
        style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--bld-input-text)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          textAlign: 'right',
          padding: 0,
          MozAppearance: 'textfield',
        }}
      />
      <span
        aria-hidden
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.06em',
          color: 'var(--bld-text-faint)',
          flexShrink: 0,
        }}
      >
        px
      </span>
    </label>
  );
}

/** 9-point alignment grid (3×3) — the dot-grid widget from the Framer
 *  screenshot. Active dot snaps to maroon. */
function AlignmentGrid({
  hAlign,
  vAlign,
  onChange,
}: {
  hAlign?: 'start' | 'center' | 'end';
  vAlign?: 'start' | 'center' | 'end';
  onChange: (h: 'start' | 'center' | 'end', v: 'start' | 'center' | 'end') => void;
}) {
  const cols: Array<'start' | 'center' | 'end'> = ['start', 'center', 'end'];
  const rows: Array<'start' | 'center' | 'end'> = ['start', 'center', 'end'];
  return (
    <div
      role="grid"
      aria-label="Alignment"
      style={{
        width: 76,
        height: 76,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        background: 'var(--bld-tile-bg)',
        border: '1px solid rgba(201,169,97,0.18)',
        borderRadius: 8,
        padding: 4,
        gap: 0,
      }}
    >
      {rows.flatMap((r) =>
        cols.map((c) => {
          const active = r === vAlign && c === hAlign;
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              role="gridcell"
              aria-selected={active}
              aria-label={`${r} ${c}`}
              onClick={() => onChange(c, r)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: active ? 8 : 4,
                  height: active ? 8 : 4,
                  borderRadius: '50%',
                  background: active ? 'var(--bld-accent)' : 'var(--bld-text-faint)',
                  transition: 'all 120ms',
                }}
              />
            </button>
          );
        }),
      )}
    </div>
  );
}

// ── Glyph icons (16px, currentColor) ─────────────────────────────────────

function IconBlock() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <rect x={2} y={3} width={12} height={3} rx={0.6} fill="currentColor" opacity={0.9} />
      <rect x={2} y={7} width={12} height={3} rx={0.6} fill="currentColor" opacity={0.55} />
      <rect x={2} y={11} width={12} height={2} rx={0.6} fill="currentColor" opacity={0.35} />
    </svg>
  );
}
function IconFlex() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <rect x={2} y={3} width={3} height={10} rx={0.6} fill="currentColor" opacity={0.9} />
      <rect x={6.5} y={3} width={3} height={10} rx={0.6} fill="currentColor" opacity={0.7} />
      <rect x={11} y={3} width={3} height={10} rx={0.6} fill="currentColor" opacity={0.5} />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={2 + c * 4.5}
            y={2 + r * 4.5}
            width={3.5}
            height={3.5}
            rx={0.5}
            fill="currentColor"
            opacity={0.7}
          />
        )),
      )}
    </svg>
  );
}
function IconHidden() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <circle cx={8} cy={8} r={6.2} />
      <path d="M3.5 12.5l9-9" strokeLinecap="round" />
    </svg>
  );
}
function IconRow() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10" />
      <path d="M10 5l3 3-3 3" />
    </svg>
  );
}
function IconRowReverse() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10" />
      <path d="M6 5l-3 3 3 3" />
    </svg>
  );
}
function IconColumn() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v10" />
      <path d="M5 10l3 3 3-3" />
    </svg>
  );
}
function IconColumnReverse() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v10" />
      <path d="M5 6l3-3 3 3" />
    </svg>
  );
}
function IconPadTop() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M2 3h12" strokeLinecap="round" />
      <rect x={4} y={6} width={8} height={7} rx={0.6} opacity={0.5} />
    </svg>
  );
}
function IconPadBottom() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M2 13h12" strokeLinecap="round" />
      <rect x={4} y={3} width={8} height={7} rx={0.6} opacity={0.5} />
    </svg>
  );
}
function IconPadLeft() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M3 2v12" strokeLinecap="round" />
      <rect x={6} y={4} width={7} height={8} rx={0.6} opacity={0.5} />
    </svg>
  );
}
function IconPadRight() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M13 2v12" strokeLinecap="round" />
      <rect x={3} y={4} width={7} height={8} rx={0.6} opacity={0.5} />
    </svg>
  );
}
function IconGap() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <rect x={2} y={3} width={5} height={10} rx={0.6} opacity={0.65} />
      <rect x={9} y={3} width={5} height={10} rx={0.6} opacity={0.65} />
      <path d="M7.5 6v4" opacity={0.5} />
    </svg>
  );
}

// ── Style panels ─────────────────────────────────────────────────────────

function StyleControls({
  blockType,
  style,
  onChange,
  currentPlan,
  pendingTextEffect,
}: {
  blockType: Block['type'];
  style: BlockStyle | undefined;
  onChange: (s: BlockStyle | undefined) => void;
  /** Billing tier — drives the locked state on premium Colorion FX. */
  currentPlan: Plan;
  /** FX id still making its way onto the canvas — spins its tile. */
  pendingTextEffect?: string;
}) {
  const text = useInspectorText();
  const isSimple = useIsSimple();
  const { setMode } = useEditorMode();
  const s = style ?? {};
  const set = (patch: Partial<BlockStyle>) => {
    const next = { ...s, ...patch };
    const cleaned: BlockStyle = {};
    for (const [k, v] of Object.entries(next)) {
      if (v != null && v !== '') (cleaned as Record<string, unknown>)[k] = v;
    }
    onChange(Object.keys(cleaned).length === 0 ? undefined : cleaned);
  };

  const display = s.display ?? 'block';
  const isLayout = display === 'flex' || display === 'grid';
  const showVariantPicker = isVariantBlock(blockType);
  const showTextEffects = [
    'hero',
    'banner',
    'text',
    'animatedText',
    'inquireCta',
    'spotlightCard',
  ].includes(blockType);
  const showCardEffects = [
    'featuredProduct',
    'productGrid',
    'productList',
    'productCardStack',
    'productPromoCard',
    'spotlightCard',
    'contactCard',
    'depthShowcase',
  ].includes(blockType);
  const showGalleryEffects = ['gallery', 'image', 'animatedImage', 'tiltImage'].includes(blockType);

  // Per-side padding falls back to the legacy axis token so the inspector
  // always shows a concrete value the founder can scrub. Editing a side
  // commits the override field; the legacy paddingX/paddingY keeps its
  // value so axes that haven't been overridden still resolve.
  const py = paddingToPx(s.paddingY, PAD_Y_PX, 28);
  const px = paddingToPx(s.paddingX, PAD_X_PX, 22);
  const pt = s.paddingTop ?? py;
  const pb = s.paddingBottom ?? py;
  const pl = s.paddingLeft ?? px;
  const pr = s.paddingRight ?? px;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Variant ----------------------------------------------------- */}
      {!isSimple && showVariantPicker ? (
        <Section label="Variant">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 6,
            }}
          >
            {VARIANT_OPTIONS.map((opt) => {
              const active = (s.variant ?? 'classic') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    set({ variant: opt.id === 'classic' ? undefined : opt.id });
                  }}
                  title={text.option(opt.blurb)}
                  style={{
                    position: 'relative',
                    padding: '8px 10px',
                    border: `1px solid ${active ? 'var(--bld-accent)' : 'var(--bld-input-border)'}`,
                    borderRadius: 6,
                    background: active ? 'var(--bld-accent-soft)' : 'var(--bld-tile-bg)',
                    color: 'var(--bld-input-text)',
                    cursor: 'pointer',
                    opacity: 1,
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 500,
                      color: active ? 'var(--bld-accent)' : 'var(--bld-input-text)',
                    }}
                  >
                    {text.option(opt.label)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--bld-text-muted)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {text.option(opt.blurb)}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      ) : null}

      {!isSimple ? (
      <Section label="Backgrounds">
        <Field label="Motion">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 6,
            }}
          >
            {BACKGROUND_EFFECT_OPTIONS.map((opt) => {
              const active = (s.backgroundEffect ?? 'none') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    set({
                      backgroundEffect: opt.id === 'none' ? undefined : opt.id,
                      backgroundCss: undefined,
                      backgroundCssSize: undefined,
                    })
                  }
                  title={text.option(opt.blurb)}
                  style={{
                    minHeight: 44,
                    padding: 8,
                    borderRadius: 6,
                    border: active
                      ? '1px solid var(--bld-accent)'
                      : '1px solid var(--bld-input-border)',
                    background: opt.preview,
                    color: opt.dark ? '#f8f1df' : 'var(--bld-input-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    boxShadow: active ? '0 0 0 2px var(--bld-accent-soft)' : undefined,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{text.option(opt.label)}</span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 2,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      opacity: 0.72,
                    }}
                  >
                    {text.option(opt.group)}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Patterns">
          <BackgroundPatternPicker
            value={s.backgroundCss}
            onPick={(pattern) =>
              set({
                backgroundCss: pattern.css,
                backgroundCssSize: pattern.size,
                backgroundEffect: undefined,
              })
            }
            onClear={() =>
              set({
                backgroundCss: undefined,
                backgroundCssSize: undefined,
                backgroundEffect: undefined,
              })
            }
          />
        </Field>
      </Section>
      ) : null}

      {!isSimple && showCardEffects ? (
        <Section label="Card treatment">
          <OptionGrid
            value={s.cardEffect ?? 'none'}
            options={CARD_EFFECT_OPTIONS}
            onChange={(value) =>
              set({ cardEffect: value === 'none' ? undefined : (value as CardEffect) })
            }
          />
        </Section>
      ) : null}

      {!isSimple && showGalleryEffects ? (
        <Section label="Gallery layout">
          <OptionGrid
            value={s.galleryEffect ?? 'none'}
            options={GALLERY_EFFECT_OPTIONS}
            onChange={(value) =>
              set({ galleryEffect: value === 'none' ? undefined : (value as GalleryEffect) })
            }
          />
        </Section>
      ) : null}

      {/* Display ----------------------------------------------------- */}
      <Section label="Display">
        <IconChipGroup<NonNullable<BlockStyle['display']>>
          value={display}
          fill
          ariaLabel="Display mode"
          onChange={(v) => set({ display: v === 'block' ? undefined : v })}
          options={[
            { id: 'block', label: 'Block', icon: <IconBlock /> },
            { id: 'flex', label: 'Flex', icon: <IconFlex /> },
            { id: 'grid', label: 'Grid', icon: <IconGrid /> },
            { id: 'hidden', label: 'Hidden', icon: <IconHidden /> },
          ]}
        />
      </Section>

      {/* Layout (only when flex / grid) ------------------------------ */}
      {isLayout ? (
        <Section label="Layout">
          {display === 'flex' ? (
            <>
              <Field label="Direction">
                <IconChipGroup<NonNullable<BlockStyle['flexDirection']>>
                  value={s.flexDirection ?? 'row'}
                  ariaLabel="Flex direction"
                  onChange={(v) => set({ flexDirection: v ?? undefined })}
                  options={[
                    { id: 'row', label: 'Row', icon: <IconRow /> },
                    { id: 'column', label: 'Column', icon: <IconColumn /> },
                    { id: 'row-reverse', label: 'Row reverse', icon: <IconRowReverse /> },
                    { id: 'column-reverse', label: 'Column reverse', icon: <IconColumnReverse /> },
                  ]}
                />
              </Field>
              <Field label="Wrap">
                <select
                  value={s.flexWrap ?? 'nowrap'}
                  onChange={(e) =>
                    set({
                      flexWrap:
                        e.target.value === 'nowrap'
                          ? undefined
                          : (e.target.value as NonNullable<BlockStyle['flexWrap']>),
                    })
                  }
                  style={selectStyle()}
                >
                  <option value="nowrap">{text.option('No wrap')}</option>
                  <option value="wrap">{text.option('Wrap')}</option>
                  <option value="wrap-reverse">{text.option('Wrap reverse')}</option>
                </select>
              </Field>
            </>
          ) : null}
        </Section>
      ) : null}

      {/* Alignment -------------------------------------------------- */}
      <Section label="Alignment">
        {isLayout ? (
          <>
            <Field label="Justify (main axis)">
              <select
                value={s.justifyContent ?? 'start'}
                onChange={(e) =>
                  set({
                    justifyContent:
                      e.target.value === 'start'
                        ? undefined
                        : (e.target.value as NonNullable<BlockStyle['justifyContent']>),
                  })
                }
                style={selectStyle()}
              >
                <option value="start">{text.option('Start')}</option>
                <option value="center">{text.option('Center')}</option>
                <option value="end">{text.option('End')}</option>
                <option value="between">{text.option('Space between')}</option>
                <option value="around">{text.option('Space around')}</option>
                <option value="evenly">{text.option('Space evenly')}</option>
              </select>
            </Field>
            <Field label="Align items (cross axis)">
              <select
                value={s.alignItems ?? 'stretch'}
                onChange={(e) =>
                  set({
                    alignItems:
                      e.target.value === 'stretch'
                        ? undefined
                        : (e.target.value as NonNullable<BlockStyle['alignItems']>),
                  })
                }
                style={selectStyle()}
              >
                <option value="stretch">{text.option('Stretch')}</option>
                <option value="start">{text.option('Start')}</option>
                <option value="center">{text.option('Center')}</option>
                <option value="end">{text.option('End')}</option>
                <option value="baseline">{text.option('Baseline')}</option>
              </select>
            </Field>
          </>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 12,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Field label="Text align">
                <AlignPicker value={s.align ?? 'start'} onChange={(v) => set({ align: v })} />
              </Field>
            </div>
            <AlignmentGrid hAlign={s.align ?? 'start'} onChange={(h) => set({ align: h })} />
          </div>
        )}
        {showTextEffects ? (
          <Field label="Text size">
            <TextSizeStepper
              value={s.fontScale ?? 1}
              onChange={(v) => set({ fontScale: v === 1 ? undefined : v })}
            />
          </Field>
        ) : null}
      </Section>

      {/* Text motion — available in Simple mode too, right under
          Alignment, so effects are one click away when editing text. */}
      {showTextEffects ? (
        <Section label="Text motion">
          {!isSimple ? (
            <OptionGrid
              value={s.textEffect ?? 'none'}
              options={TEXT_EFFECT_OPTIONS}
              onChange={(value) =>
                set({ textEffect: value === 'none' ? undefined : (value as TextEffect) })
              }
            />
          ) : null}
          <TextFxPicker
            value={s.textEffect ?? 'none'}
            currentPlan={currentPlan}
            fxColor={s.fxColor}
            fxColor2={s.fxColor2}
            fxSpeed={s.fxSpeed}
            pendingId={pendingTextEffect}
            onChange={(value) => set({ textEffect: value === 'none' ? undefined : value })}
          />
          {getTextFx(s.textEffect) ? (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Field label="Effect colours">
                <FxColorRow
                  fxColor={s.fxColor}
                  fxColor2={s.fxColor2}
                  onChange={(patch) => set(patch)}
                />
              </Field>
              <Field label="Effect speed">
                <FxSpeedStepper
                  value={s.fxSpeed ?? 1}
                  onChange={(v) => set({ fxSpeed: v === 1 ? undefined : v })}
                />
              </Field>
            </div>
          ) : null}
          {isSimple && (s.textEffect ?? 'none') !== 'none' ? (
            <button
              type="button"
              onClick={() => set({ textEffect: undefined })}
              style={{
                marginTop: 8,
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid var(--bld-input-border)',
                background: 'var(--bld-tile-bg)',
                color: 'var(--bld-text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {text.option('Remove effect')}
            </button>
          ) : null}
        </Section>
      ) : null}

      {/* Spacing ---------------------------------------------------- */}
      <Section label="Spacing">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
          }}
        >
          <PixelInput
            value={pt}
            ariaLabel="Padding top"
            icon={<IconPadTop />}
            onChange={(v) => set({ paddingTop: v })}
          />
          <PixelInput
            value={pr}
            ariaLabel="Padding right"
            icon={<IconPadRight />}
            onChange={(v) => set({ paddingRight: v })}
          />
          <PixelInput
            value={pb}
            ariaLabel="Padding bottom"
            icon={<IconPadBottom />}
            onChange={(v) => set({ paddingBottom: v })}
          />
          <PixelInput
            value={pl}
            ariaLabel="Padding left"
            icon={<IconPadLeft />}
            onChange={(v) => set({ paddingLeft: v })}
          />
        </div>
        {isLayout ? (
          <Field label="Gap">
            <PixelInput
              value={s.gap}
              ariaLabel="Gap between children"
              icon={<IconGap />}
              onChange={(v) => set({ gap: v })}
            />
          </Field>
        ) : null}
      </Section>

      {/* Surface ---------------------------------------------------- */}
      <Section label="Surface">
        <Field label="Color scheme">
          <SegmentedControl
            value={s.colorScheme ?? 'inherit'}
            onChange={(v) =>
              set({ colorScheme: v === 'inherit' ? undefined : (v as 'light' | 'dark') })
            }
            options={[
              { value: 'inherit', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Field>
        <Field label="Text colour">
          <SwatchPicker
            value={s.textColor ?? 'ink'}
            onChange={(v) => set({ textColor: v })}
            options={[
              { value: 'ink', label: 'Ink', swatch: 'var(--sf-ink, #2a2418)' },
              { value: 'sand', label: 'Sand', swatch: 'var(--sf-ground, #e8dcc4)' },
              { value: 'gold', label: 'Gold', swatch: 'var(--sf-accent, #c9a961)' },
            ]}
          />
        </Field>
        <Field label="Background">
          <SwatchPicker
            value={s.bg ?? 'transparent'}
            onChange={(v) => set({ bg: v })}
            options={[
              { value: 'transparent', label: 'None', swatch: 'transparent' },
              { value: 'sand', label: 'Sand', swatch: 'var(--sf-ground, #e8dcc4)' },
              { value: 'ink', label: 'Ink', swatch: 'var(--sf-ink, #2a2418)' },
              { value: 'gold', label: 'Gold', swatch: 'var(--sf-accent, #c9a961)' },
            ]}
          />
        </Field>
      </Section>

      {isSimple ? (
        <AdvancedReveal
          onReveal={() => setMode('advanced')}
          label="Show advanced style options"
        />
      ) : null}
    </div>
  );
}

/**
 * Visual alignment picker — three glyph buttons showing left / centre /
 * right alignment via stacked bars. Cleaner than the word-based segmented
 * control for a control whose meaning is fundamentally graphical.
 */
function AlignPicker({
  value,
  onChange,
}: {
  value: 'start' | 'center' | 'end';
  onChange: (v: 'start' | 'center' | 'end') => void;
}) {
  const opts: Array<{ value: 'start' | 'center' | 'end'; glyph: ReactNode; label: string }> = [
    { value: 'start', label: 'Start', glyph: <AlignGlyph anchor="start" /> },
    { value: 'center', label: 'Center', glyph: <AlignGlyph anchor="center" /> },
    { value: 'end', label: 'End', glyph: <AlignGlyph anchor="end" /> },
  ];
  return (
    <div role="radiogroup" style={pickerRowStyle()}>
      {opts.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            onClick={() => onChange(o.value)}
            style={pickerCellStyle(active)}
          >
            {o.glyph}
          </button>
        );
      })}
    </div>
  );
}

function AlignGlyph({ anchor }: { anchor: 'start' | 'center' | 'end' }) {
  const widths = [16, 11, 14];
  const offsets =
    anchor === 'start'
      ? [0, 0, 0]
      : anchor === 'end'
        ? widths.map((w) => 18 - w)
        : widths.map((w) => (18 - w) / 2);
  return (
    <svg width={20} height={14} viewBox="0 0 20 14" aria-hidden>
      {widths.map((w, i) => (
        <rect
          key={i}
          x={1 + offsets[i]!}
          y={1 + i * 4}
          width={w}
          height={2}
          rx={1}
          fill="currentColor"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

/**
 * Visual layout picker — renders a 3-up grid of mini thumbnails with the
 * label below. Used by productGrid (cards / minimal / lookbook) and any
 * other future "pick a visual layout" scenarios.
 */
function LayoutThumbPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; glyph: ReactNode }>;
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 6,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '8px 6px',
              borderRadius: 4,
              border: `1px solid ${active ? 'var(--bld-accent)' : 'var(--bld-input-border)'}`,
              background: active ? 'var(--bld-accent-soft)' : 'var(--bld-tile-bg)',
              color: 'var(--bld-input-text)',
              cursor: 'pointer',
              transition: 'all 140ms',
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'block',
                width: '100%',
                aspectRatio: '4 / 3',
                background: 'var(--bld-input-bg)',
                borderRadius: 3,
                padding: 5,
                color: active ? 'var(--bld-accent)' : 'var(--bld-text-muted)',
              }}
            >
              {o.glyph}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? 'var(--bld-accent)' : 'var(--bld-text-muted)',
              }}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CardsThumb() {
  // Three cards with image + caption — the default catalogue look.
  return (
    <svg viewBox="0 0 60 45" width="100%" height="100%" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${2 + i * 19}, 4)`}>
          <rect width={17} height={24} rx={1.5} fill="currentColor" opacity={0.18} />
          <rect width={17} height={16} rx={1.5} fill="currentColor" opacity={0.45} />
          <rect x={2} y={28} width={13} height={1.6} rx={0.8} fill="currentColor" opacity={0.7} />
          <rect x={2} y={32} width={9} height={1.4} rx={0.7} fill="currentColor" opacity={0.45} />
        </g>
      ))}
    </svg>
  );
}

function MinimalThumb() {
  // Tighter rows, no card chrome — labels under bare images.
  return (
    <svg viewBox="0 0 60 45" width="100%" height="100%" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${2 + (i % 4) * 14.5}, 6)`}>
          <rect width={12.5} height={18} fill="currentColor" opacity={0.4} />
          <rect y={20} width={9} height={1.2} fill="currentColor" opacity={0.6} />
        </g>
      ))}
    </svg>
  );
}

function LookbookThumb() {
  // Larger asymmetric tiles like an editorial spread.
  return (
    <svg viewBox="0 0 60 45" width="100%" height="100%" aria-hidden>
      <rect x={3} y={4} width={26} height={37} rx={1.5} fill="currentColor" opacity={0.5} />
      <rect x={32} y={4} width={25} height={17} rx={1.5} fill="currentColor" opacity={0.35} />
      <rect x={32} y={24} width={25} height={17} rx={1.5} fill="currentColor" opacity={0.22} />
    </svg>
  );
}

function SwatchPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; swatch: string }>;
}) {
  const custom = !options.some((o) => o.value === value);
  const colorValue = colorInputValue(value, options);
  const [hexDraft, setHexDraft] = useState(custom && isHexColor(value) ? value : colorValue);

  useEffect(() => {
    setHexDraft(custom && isHexColor(value) ? value : colorValue);
  }, [colorValue, custom, value]);

  const applyHex = (raw: string) => {
    const normalized = normalizeHexColor(raw);
    setHexDraft(raw);
    if (normalized) onChange(normalized);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div role="radiogroup" style={pickerRowStyle()}>
        {options.map((o) => {
          const active = o.value === value;
          const isTransparent = o.value === 'transparent';
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={o.label}
              onClick={() => onChange(o.value)}
              style={pickerCellStyle(active)}
            >
              <span
                aria-hidden
                style={{
                  display: 'block',
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  background: isTransparent
                    ? 'repeating-linear-gradient(45deg, rgba(232,220,196,0.18) 0 3px, transparent 3px 6px)'
                    : o.swatch,
                  border: '1px solid var(--bld-input-border)',
                }}
              />
            </button>
          );
        })}
        {custom ? (
          <button
            type="button"
            role="radio"
            aria-checked
            title={`Custom ${value}`}
            style={pickerCellStyle(true)}
          >
            <span
              aria-hidden
              style={{
                display: 'block',
                width: 18,
                height: 18,
                borderRadius: 3,
                background: isHexColor(value) ? value : colorValue,
                border: '1px solid var(--bld-input-border)',
              }}
            />
          </button>
        ) : null}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '42px minmax(0, 1fr)',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <input
          type="color"
          aria-label="Pick custom colour"
          value={colorValue}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 42,
            height: 34,
            padding: 2,
            borderRadius: 6,
            border: '1px solid var(--bld-input-border)',
            background: 'var(--bld-input-bg)',
            cursor: 'pointer',
          }}
        />
        <input
          type="text"
          inputMode="text"
          aria-label="Hex colour"
          placeholder="#E8DCC4"
          value={hexDraft}
          onChange={(e) => applyHex(e.target.value)}
          onBlur={() => setHexDraft(normalizeHexColor(hexDraft) ?? colorValue)}
          style={{
            width: '100%',
            minWidth: 0,
            border: '1px solid var(--bld-input-border)',
            borderRadius: 6,
            background: 'var(--bld-input-bg)',
            color: 'var(--bld-input-text)',
            padding: '8px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}

function colorInputValue(value: string, options: Array<{ value: string; swatch: string }>): string {
  if (isHexColor(value)) return expandHexColor(value);
  const swatch = options.find((o) => o.value === value)?.swatch;
  const fallback = swatch?.match(/#[0-9a-fA-F]{6}\b/u)?.[0];
  return fallback ?? '#2a2418';
}

function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u.test(value.trim());
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!isHexColor(trimmed)) return null;
  return expandHexColor(trimmed).toUpperCase();
}

function expandHexColor(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return trimmed;
}

function pickerRowStyle(): React.CSSProperties {
  return {
    display: 'inline-flex',
    gap: 4,
    border: '1px solid var(--bld-divider)',
    padding: 3,
    borderRadius: 5,
  };
}

function pickerCellStyle(active: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    border: 'none',
    background: active ? 'var(--bld-accent-soft)' : 'transparent',
    boxShadow: active ? 'inset 0 0 0 1px var(--bld-accent)' : 'none',
    color: active ? 'var(--bld-accent)' : 'var(--bld-text-muted)',
    cursor: 'pointer',
    transition: 'background 120ms',
  };
}

// =========================================================================
// Hero logo / monogram fields (three-state: hide · default · custom)
// =========================================================================

type LogoMode = 'hide' | 'default' | 'custom';

const MODE_OPTIONS: { value: LogoMode; label: string }[] = [
  { value: 'hide', label: 'Hide' },
  { value: 'default', label: 'Default' },
  { value: 'custom', label: 'Custom' },
];

/** Backward-compat: if `logoMode` is unset, derive it from the legacy `showLogo`. */
function resolveLogoMode(p: Record<string, unknown>): LogoMode {
  const mode = p.logoMode;
  if (mode === 'hide' || mode === 'default' || mode === 'custom') return mode;
  return p.showLogo === false ? 'hide' : 'default';
}

/** Backward-compat: if `glyphMode` is unset, derive it from the legacy `showGlyph`. */
function resolveGlyphMode(p: Record<string, unknown>): LogoMode {
  const mode = p.glyphMode;
  if (mode === 'hide' || mode === 'default' || mode === 'custom') return mode;
  return p.showGlyph === false ? 'hide' : 'default';
}

type HeroBgSource = 'image' | 'pattern';

/**
 * Hero background editor. Three-state: image upload, CSS pattern from
 * the library, or neither (the renderer falls back to the layout's
 * default chrome). The two sources are mutually exclusive — picking a
 * pattern clears any uploaded URL and vice-versa, enforced by the
 * caller's `setMany` handlers — so the founder never sees both
 * controls competing for the canvas.
 *
 * The mode tab is purely a UI hint; it auto-resolves from whichever
 * source has a non-empty value, defaulting to `image` for new heros.
 */
function HeroBackgroundField({
  backgroundUrl,
  backgroundCss,
  storefrontSlug,
  giphyStorefrontSlug,
  onUploadChange,
  onPatternPick,
  onClearPattern,
}: {
  backgroundUrl: string;
  backgroundCss: string;
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
  onUploadChange: (v: string) => void;
  onPatternPick: (css: string) => void;
  onClearPattern: () => void;
}) {
  const initialSource: HeroBgSource = backgroundCss ? 'pattern' : 'image';
  const [source, setSource] = useState<HeroBgSource>(initialSource);
  return (
    <Field label="Background">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SegmentedControl<HeroBgSource>
          value={source}
          onChange={setSource}
          options={[
            { value: 'image', label: 'Image' },
            { value: 'pattern', label: 'Pattern' },
          ]}
        />
        {source === 'image' ? (
          <MediaUploader
            value={backgroundUrl}
            onChange={onUploadChange}
            namespace="hero"
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
        ) : (
          <BackgroundPatternPicker
            value={backgroundCss || undefined}
            onPick={(p) => onPatternPick(p.css)}
            onClear={onClearPattern}
          />
        )}
      </div>
    </Field>
  );
}

function LogoModeField({
  mode,
  url,
  storefrontSlug,
  onModeChange,
  onUrlChange,
}: {
  mode: LogoMode;
  url: string;
  storefrontSlug: string;
  onModeChange: (v: LogoMode) => void;
  onUrlChange: (v: string) => void;
}) {
  const inspectorText = useInspectorText();
  return (
    <Field label="Logo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SegmentedControl<LogoMode> value={mode} onChange={onModeChange} options={MODE_OPTIONS} />
        {mode === 'custom' ? (
          <MediaUploader
            value={url}
            onChange={onUrlChange}
            namespace="hero-logo"
            storefrontSlug={storefrontSlug}
          />
        ) : null}
        {mode === 'default' ? (
          <ModeHint>
            {inspectorText.option('Uses the storefront logo (or auto monogram if none uploaded).')}
          </ModeHint>
        ) : null}
      </div>
    </Field>
  );
}

function GlyphModeField({
  mode,
  url,
  text,
  storefrontSlug,
  onModeChange,
  onUrlChange,
  onTextChange,
}: {
  mode: LogoMode;
  url: string;
  text: string;
  storefrontSlug: string;
  onModeChange: (v: LogoMode) => void;
  onUrlChange: (v: string) => void;
  onTextChange: (v: string) => void;
}) {
  const inspectorText = useInspectorText();
  return (
    <Field label="Monogram">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SegmentedControl<LogoMode> value={mode} onChange={onModeChange} options={MODE_OPTIONS} />
        {mode === 'custom' ? (
          <>
            <MediaUploader
              value={url}
              onChange={onUrlChange}
              namespace="hero-glyph"
              storefrontSlug={storefrontSlug}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--bld-text-faint)',
                }}
              >
                {inspectorText.option('Or letters (1-4)')}
              </span>
              <TextInput
                value={text}
                onChange={(v) => onTextChange(v.slice(0, 4))}
                placeholder="ZQ"
              />
            </div>
            <ModeHint>
              {inspectorText.option('An uploaded image takes precedence over letters.')}
            </ModeHint>
          </>
        ) : null}
        {mode === 'default' ? (
          <ModeHint>
            {inspectorText.option('Uses the auto type-glyph for your business category.')}
          </ModeHint>
        ) : null}
      </div>
    </Field>
  );
}

function ModeHint({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.04em',
        color: 'var(--bld-text-faint)',
        lineHeight: 1.5,
      }}
    >
      {children}
    </p>
  );
}

// =========================================================================
// Cta + gallery sub-editors
// =========================================================================

type Cta = { label?: string; href?: string; scrollTo?: string } | undefined;

function CtaForm({
  cta,
  onChange,
  anchorTargets,
}: {
  cta: Cta;
  onChange: (c: Cta) => void;
  anchorTargets: BlockOutlineEntry[];
}) {
  const text = useInspectorText();
  const label = cta?.label ?? '';
  const href = cta?.href ?? '';
  const scrollTo = cta?.scrollTo ?? '';
  // A CTA is preserved as long as any of its three fields has a value.
  const buildNext = (next: { label: string; href: string; scrollTo: string }): Cta =>
    next.label || next.href || next.scrollTo
      ? {
          label: next.label,
          href: next.href,
          ...(next.scrollTo ? { scrollTo: next.scrollTo } : {}),
        }
      : undefined;
  return (
    <Section label="CTA">
      <Field label="Label">
        <TextInput
          value={label}
          onChange={(v) => onChange(buildNext({ label: v, href, scrollTo }))}
        />
      </Field>
      <Field label="Link">
        <TextInput
          value={href}
          onChange={(v) => onChange(buildNext({ label, href: v, scrollTo }))}
          placeholder="https://…"
        />
      </Field>
      <Field label="Scroll to">
        <select
          value={scrollTo}
          onChange={(e) => onChange(buildNext({ label, href, scrollTo: e.target.value }))}
          style={selectStyle()}
        >
          <option value="">{text.option('External link')}</option>
          {anchorTargets.map((b) => (
            <option key={b.id} value={b.id}>
              {String(b.index + 1).padStart(2, '0')} · {b.label}
            </option>
          ))}
        </select>
      </Field>
      {scrollTo ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.04em',
            color: 'var(--bld-text-muted)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {text.option(
            'On the live storefront the button smooth-scrolls to that block. The Link field is ignored while this is set. In this preview, clicking selects the block instead.',
          )}
        </p>
      ) : null}
    </Section>
  );
}

function GalleryEditor({
  items,
  onChange,
  storefrontSlug,
  giphyStorefrontSlug,
}: {
  items: GalleryItem[];
  onChange: (next: GalleryItem[]) => void;
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
}) {
  return (
    <Section label="Items">
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid var(--bld-divider)',
            padding: 10,
            borderRadius: 4,
            display: 'grid',
            gap: 8,
          }}
        >
          <MediaUploader
            value={item.imageUrl}
            onChange={(v) =>
              onChange(items.map((it, i) => (i === idx ? { ...it, imageUrl: v } : it)))
            }
            namespace="gallery"
            storefrontSlug={storefrontSlug}
            giphyStorefrontSlug={giphyStorefrontSlug}
          />
          <TextInput
            value={item.alt ?? ''}
            onChange={(v) => onChange(items.map((it, i) => (i === idx ? { ...it, alt: v } : it)))}
            placeholder="Alt text (accessibility)"
          />
          <TextInput
            value={item.caption ?? ''}
            onChange={(v) =>
              onChange(items.map((it, i) => (i === idx ? { ...it, caption: v } : it)))
            }
            placeholder="Caption (optional)"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            style={inlineGhostBtn()}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { imageUrl: '' }])}
        style={inlineGhostBtn()}
      >
        + Add image
      </button>
    </Section>
  );
}

/**
 * Review list editor for the social proof wall. Each review pairs the
 * English quote/author with optional Arabic variants (edited RTL) so a
 * bilingual storefront never shows a half-translated marquee. Capped at
 * the schema's 24-review limit.
 */
function SocialProofReviewsEditor({
  items,
  onChange,
}: {
  items: SocialProofReview[];
  onChange: (next: SocialProofReview[]) => void;
}) {
  const update = (idx: number, patch: Partial<SocialProofReview>) =>
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { quote: '', author: '' }]);

  return (
    <Section label="Reviews">
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 10,
              borderRadius: 4,
              display: 'grid',
              gap: 8,
            }}
          >
            <Field label="Quote">
              <TextArea value={item.quote} onChange={(v) => update(idx, { quote: v })} rows={2} />
            </Field>
            <TextInput
              value={item.author}
              onChange={(v) => update(idx, { author: v })}
              placeholder="Author"
            />
            <TextInput
              value={item.role ?? ''}
              onChange={(v) => update(idx, { role: v })}
              placeholder="Role or city (optional)"
            />
            <Field label="Arabic (optional)">
              <div dir="rtl" style={{ display: 'grid', gap: 8 }}>
                <TextArea
                  value={item.quoteAr ?? ''}
                  onChange={(v) => update(idx, { quoteAr: v })}
                  rows={2}
                />
                <TextInput
                  value={item.authorAr ?? ''}
                  onChange={(v) => update(idx, { authorAr: v })}
                  placeholder="الاسم"
                />
                <TextInput
                  value={item.roleAr ?? ''}
                  onChange={(v) => update(idx, { roleAr: v })}
                  placeholder="المدينة أو الصفة"
                />
              </div>
            </Field>
            <button type="button" onClick={() => remove(idx)} style={inlineGhostBtn()}>
              Remove
            </button>
          </div>
        ))}
        {items.length < 24 ? (
          <button type="button" onClick={add} style={inlineGhostBtn()}>
            + Add review
          </button>
        ) : null}
      </div>
    </Section>
  );
}

function Showcase1ItemsEditor({
  items,
  onChange,
  storefrontSlug,
  giphyStorefrontSlug,
}: {
  items: Showcase1Item[];
  onChange: (next: Showcase1Item[]) => void;
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
}) {
  const rows = items.length
    ? items
    : [{ id: makeServiceId().slice(0, 8), title: '', imageUrl: '' }];
  const update = (idx: number, patch: Partial<Showcase1Item>) =>
    onChange(rows.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const add = () =>
    onChange([...rows, { id: makeServiceId().slice(0, 8), title: '', imageUrl: '' }]);

  return (
    <Section label="Switcher items">
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((item, idx) => (
          <div
            key={item.id ?? idx}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 10,
              borderRadius: 4,
              display: 'grid',
              gap: 8,
            }}
          >
            <MediaUploader
              value={item.imageUrl ?? ''}
              onChange={(v) => update(idx, { imageUrl: v })}
              namespace="showcase-1"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={giphyStorefrontSlug}
            />
            <TextInput
              value={item.title ?? ''}
              onChange={(v) => update(idx, { title: v })}
              placeholder="Item title"
            />
            <TextInput
              value={item.kicker ?? ''}
              onChange={(v) => update(idx, { kicker: v })}
              placeholder="Kicker"
            />
            <TextArea
              value={item.subtitle ?? ''}
              onChange={(v) => update(idx, { subtitle: v })}
              rows={2}
            />
            <TextInput
              value={item.href ?? ''}
              onChange={(v) => update(idx, { href: v })}
              placeholder="Link"
            />
            <button type="button" onClick={() => remove(idx)} style={inlineGhostBtn()}>
              Remove
            </button>
          </div>
        ))}
        {rows.length < 8 ? (
          <button type="button" onClick={add} style={inlineGhostBtn()}>
            + Add item
          </button>
        ) : null}
      </div>
    </Section>
  );
}

const SHADCN_PRODUCT_SOURCE_BLOCKS = new Set<Block['type']>([
  'shadcnHero',
  'shadcnCategories',
  'shadcnProductCard',
  'shadcnProductList',
  'shadcnProductDetail',
  'shadcnQuickView',
  'shadcnOrderSummary',
  'shadcnOfferModal',
]);

function ShadcnCommerceEditor({
  props,
  onSet,
  onSetMany,
  anchorTargets,
  blockType,
  productOptions,
  categoryOptions,
}: {
  props: Record<string, unknown>;
  onSet: (key: string, value: unknown) => void;
  onSetMany: (patch: Record<string, unknown>) => void;
  anchorTargets: BlockOutlineEntry[];
  blockType: Block['type'];
  productOptions: ProductOption[];
  categoryOptions: string[];
}) {
  const text = useInspectorText();
  const legacyIds = Array.isArray(props.productIds) ? (props.productIds as string[]) : [];
  const source = normalizeCommerceProductSource(props.productSource, legacyIds);
  const setSource = (next: CommerceProductSource) => {
    onSetMany({
      productSource: next,
      productIds: next.source === 'manual' && next.productIds?.length ? next.productIds : undefined,
    });
  };
  const trustMetrics = Array.isArray(props.metrics)
    ? (props.metrics as Array<Record<string, unknown>>)
    : [];

  return (
    <>
      <Section>
        <Field label="Kicker">
          <TextInput
            value={str(props.kicker)}
            onChange={(v) => onSet('kicker', v)}
            placeholder="Souqna Max+"
          />
        </Field>
        <Field label="Title">
          <TextArea value={str(props.title)} onChange={(v) => onSet('title', v)} rows={3} />
        </Field>
        <Field label="Subtitle">
          <TextArea value={str(props.subtitle)} onChange={(v) => onSet('subtitle', v)} rows={3} />
        </Field>
        <Field label="Note">
          <TextArea value={str(props.note)} onChange={(v) => onSet('note', v)} rows={2} />
        </Field>
        <Field label="Density">
          <SegmentedControl
            value={str(props.density) || 'balanced'}
            onChange={(v) => onSet('density', v)}
            options={[
              { value: 'compact', label: text.option('Compact') },
              { value: 'balanced', label: text.option('Balanced') },
              { value: 'editorial', label: text.option('Editorial') },
            ]}
          />
        </Field>
        <Field label="Tone">
          <SegmentedControl
            value={str(props.tone) || 'sand'}
            onChange={(v) => onSet('tone', v)}
            options={[
              { value: 'sand', label: text.option('Sand') },
              { value: 'maroon', label: text.option('Maroon') },
              { value: 'charcoal', label: text.option('Charcoal') },
              { value: 'gold', label: text.option('Gold') },
            ]}
          />
        </Field>
      </Section>
      {blockType === 'shadcnNavbar' ? (
        <Section label="Navigation">
          <Field label="Sticky">
            <Toggle checked={props.sticky !== false} onChange={(v) => onSet('sticky', v)} />
          </Field>
          <Field label="Announcement">
            <TextInput
              value={str(props.announcement)}
              onChange={(v) => onSet('announcement', v)}
              placeholder="Secure checkout and local delivery"
            />
          </Field>
          <Field label="CTA label">
            <TextInput
              value={str(props.ctaLabel)}
              onChange={(v) => onSet('ctaLabel', v)}
              placeholder="Shop products"
            />
          </Field>
          <Field label="CTA link">
            <TextInput
              value={str(props.ctaHref)}
              onChange={(v) => onSet('ctaHref', v)}
              placeholder="/products"
            />
          </Field>
          <Field label="Search link">
            <Toggle
              checked={props.showSearch !== false}
              onChange={(v) => onSet('showSearch', v)}
            />
          </Field>
          <Field label="Policy links">
            <Toggle
              checked={props.showPolicyLinks !== false}
              onChange={(v) => onSet('showPolicyLinks', v)}
            />
          </Field>
          <Field label="Cart label">
            <TextInput
              value={str(props.cartLabel)}
              onChange={(v) => onSet('cartLabel', v)}
              placeholder="Cart"
            />
          </Field>
          <p style={helpTextStyle()}>
            {text.option(
              'Uses the real storefront logo, store name, system pages, custom pages, policy links, and cart route.',
            )}
          </p>
        </Section>
      ) : null}
      {blockType === 'shadcnFooter' ? (
        <Section label="Footer behavior">
          <Field label="Updates CTA">
            <Toggle
              checked={props.showNewsletter === true}
              onChange={(v) => onSet('showNewsletter', v)}
            />
          </Field>
          <p style={helpTextStyle()}>
            {text.option(
              'Uses real storefront pages, policies, and WhatsApp contact when the store phone is configured.',
            )}
          </p>
        </Section>
      ) : null}
      {[
        'shadcnHero',
        'shadcnCategories',
        'shadcnProductCard',
        'shadcnProductList',
        'shadcnOrderSummary',
        'shadcnOfferModal',
      ].includes(blockType) ? (
        <CtaForm
          cta={props.cta as Cta}
          onChange={(v) => onSet('cta', v)}
          anchorTargets={anchorTargets}
        />
      ) : null}
      {SHADCN_PRODUCT_SOURCE_BLOCKS.has(blockType) ? (
        <ProductSourceEditor
          label="Product source"
          source={source}
          productOptions={productOptions}
          categoryOptions={categoryOptions}
          onChange={setSource}
        />
      ) : null}
      {blockType === 'shadcnProductDetail' || blockType === 'shadcnQuickView' ? (
        <Section label="Selected product">
          <Field label="Product">
            <ProductPicker
              value={str(props.productId)}
              options={productOptions}
              onChange={(v) => onSet('productId', v)}
            />
          </Field>
        </Section>
      ) : null}
      {blockType === 'shadcnOfferModal' ? (
        <Section label="Offer">
          <Field label="Offer label">
            <TextInput
              value={str(props.discountLabel)}
              onChange={(v) => onSet('discountLabel', v)}
              placeholder="Launch edit"
            />
          </Field>
          <Field label="Delay (ms)">
            <NumberInput
              value={num(props.delayMs)}
              min={0}
              onChange={(v) => onSet('delayMs', v)}
              placeholder="1200"
            />
          </Field>
        </Section>
      ) : null}
      {blockType === 'shadcnTrustStrip' ? (
        <Section label="Trust metrics">
          <div style={{ display: 'grid', gap: 8 }}>
            {trustMetrics.slice(0, 6).map((metric, index) => (
              <div key={index} style={editorCardStyle()}>
                <Field label="Value">
                  <TextInput
                    value={str(metric.value)}
                    onChange={(value) =>
                      onSet(
                        'metrics',
                        trustMetrics.map((item, idx) =>
                          idx === index ? { ...item, value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Label EN">
                  <TextInput
                    value={str(metric.labelEn)}
                    onChange={(labelEn) =>
                      onSet(
                        'metrics',
                        trustMetrics.map((item, idx) =>
                          idx === index ? { ...item, labelEn } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Label AR">
                  <TextInput
                    value={str(metric.labelAr)}
                    onChange={(labelAr) =>
                      onSet(
                        'metrics',
                        trustMetrics.map((item, idx) =>
                          idx === index ? { ...item, labelAr } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Icon">
                  <select
                    value={str(metric.icon) || 'shield'}
                    onChange={(event) =>
                      onSet(
                        'metrics',
                        trustMetrics.map((item, idx) =>
                          idx === index ? { ...item, icon: event.target.value } : item,
                        ),
                      )
                    }
                    style={selectStyle()}
                  >
                    <option value="shield">{text.option('Shield')}</option>
                    <option value="truck">{text.option('Truck')}</option>
                    <option value="boxes">{text.option('Boxes')}</option>
                    <option value="card">{text.option('Card')}</option>
                    <option value="heart">{text.option('Heart')}</option>
                    <option value="filter">{text.option('Filter')}</option>
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={() => onSet('metrics', trustMetrics.filter((_, idx) => idx !== index))}
                  style={inlineGhostBtn()}
                >
                  {text.option('Remove')}
                </button>
              </div>
            ))}
            {trustMetrics.length < 6 ? (
              <button
                type="button"
                onClick={() =>
                  onSet('metrics', [
                    ...trustMetrics,
                    { value: 'New', labelEn: 'Trust point', labelAr: 'نقطة ثقة', icon: 'shield' },
                  ])
                }
                style={inlineGhostBtn()}
              >
                {text.option('+ Add metric')}
              </button>
            ) : null}
          </div>
        </Section>
      ) : null}
    </>
  );
}

function EcommerceBlockEditor({
  props,
  onSet,
  onSetMany,
  anchorTargets,
  giphyStorefrontSlug,
  storefrontSlug,
  blockType,
  productOptions,
  categoryOptions,
}: {
  props: Record<string, unknown>;
  onSet: (key: string, value: unknown) => void;
  onSetMany: (patch: Record<string, unknown>) => void;
  anchorTargets: BlockOutlineEntry[];
  giphyStorefrontSlug?: string;
  storefrontSlug: string;
  blockType: Block['type'];
  productOptions: ProductOption[];
  categoryOptions: string[];
}) {
  const legacyIds = Array.isArray(props.productIds) ? (props.productIds as string[]) : [];
  const source = normalizeCommerceProductSource(props.productSource, legacyIds);
  const setSource = (next: CommerceProductSource) => {
    const patch: Record<string, unknown> = {
      productSource: next,
      productIds: next.source === 'manual' && next.productIds?.length ? next.productIds : undefined,
    };
    if (blockType === 'ecommerce2') {
      const current = (props.filterable as FilterableShopConfig | undefined) ?? {};
      patch.filterable = { ...current, productSource: next };
    }
    onSetMany(patch);
  };

  return (
    <>
      <Section>
        <Field label="Eyebrow">
          <TextInput
            value={str(props.eyebrow)}
            onChange={(v) => onSet('eyebrow', v)}
            placeholder="Shop"
          />
        </Field>
        <Field label="Title">
          <TextArea value={str(props.title)} onChange={(v) => onSet('title', v)} rows={3} />
        </Field>
        <Field label="Subtitle">
          <TextArea value={str(props.subtitle)} onChange={(v) => onSet('subtitle', v)} rows={3} />
        </Field>
        {blockType === 'ecommerce6' || blockType === 'ecommerce7' ? null : (
          <Field label="Tabs">
            <TextInput
              value={Array.isArray(props.tabs) ? (props.tabs as string[]).join(', ') : ''}
              onChange={(v) =>
                onSet(
                  'tabs',
                  v
                    .split(',')
                    .map((tab) => tab.trim())
                    .filter(Boolean),
                )
              }
              placeholder="All, Travel, Home, Gifts"
            />
          </Field>
        )}
      </Section>
      <CtaForm
        cta={props.cta as Cta}
        onChange={(v) => onSet('cta', v)}
        anchorTargets={anchorTargets}
      />
      <ProductSourceEditor
        label="Product source"
        source={source}
        productOptions={productOptions}
        categoryOptions={categoryOptions}
        onChange={setSource}
      />
      {blockType === 'ecommerce2' ? (
        <FilterableShopEditor
          value={(props.filterable as FilterableShopConfig | undefined) ?? {}}
          onChange={(value) => onSet('filterable', value)}
          productOptions={productOptions}
          categoryOptions={categoryOptions}
        />
      ) : null}
      {blockType === 'ecommerce6' ? (
        <TabbedProductsEditor
          value={(props.tabbed as TabbedProductsConfig | undefined) ?? {}}
          onChange={(value) => onSet('tabbed', value)}
          productOptions={productOptions}
          categoryOptions={categoryOptions}
        />
      ) : null}
      {blockType === 'ecommerce7' ? (
        <>
          <VisualCategoryTilesEditor
            value={(props.tilesConfig as VisualCategoryTilesConfig | undefined) ?? {}}
            onChange={(value) => onSet('tilesConfig', value)}
            productOptions={productOptions}
            categoryOptions={categoryOptions}
            giphyStorefrontSlug={giphyStorefrontSlug}
            storefrontSlug={storefrontSlug}
          />
          <EcommerceCategoriesEditor
            categories={
              Array.isArray(props.categories) ? (props.categories as EcommerceCategory[]) : []
            }
            onChange={(categories) => onSet('categories', categories)}
            giphyStorefrontSlug={giphyStorefrontSlug}
            storefrontSlug={storefrontSlug}
          />
        </>
      ) : null}
    </>
  );
}

function ProductSourceEditor({
  label,
  source,
  productOptions,
  categoryOptions,
  onChange,
}: {
  label: string;
  source: CommerceProductSource;
  productOptions: ProductOption[];
  categoryOptions: string[];
  onChange: (next: CommerceProductSource) => void;
}) {
  const text = useInspectorText();
  const update = (patch: Partial<CommerceProductSource>) => onChange({ ...source, ...patch });
  return (
    <Section label={label}>
      <div style={{ display: 'grid', gap: 10 }}>
        <Field label="Source">
          <select
            value={source.source}
            onChange={(event) =>
              update({
                source: event.target.value as CommerceProductSourceKind,
                sort: event.target.value === 'latest' ? 'newest' : source.sort,
              })
            }
            style={selectStyle()}
          >
            <option value="all">{text.option('All products')}</option>
            <option value="manual">{text.option('Manual selection')}</option>
            <option value="category">{text.option('Category')}</option>
            <option value="tag">{text.option('Tag / collection')}</option>
            <option value="latest">{text.option('Latest products')}</option>
          </select>
        </Field>
        {source.source === 'manual' ? (
          <OrderedProductPicker
            value={source.productIds ?? []}
            options={productOptions}
            onChange={(productIds) => update({ productIds })}
          />
        ) : null}
        {source.source === 'category' ? (
          <Field label="Category">
            <select
              value={source.category ?? ''}
              onChange={(event) => update({ category: event.target.value || null })}
              style={selectStyle()}
            >
              <option value="">{text.option('Choose category')}</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {source.source === 'tag' ? (
          <Field label="Tag / collection">
            <TextInput
              value={source.tag ?? ''}
              onChange={(tag) => update({ tag: tag || null })}
              placeholder={text.option('Future-ready tag or collection')}
            />
          </Field>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Limit">
            <NumberInput
              value={source.limit ?? 8}
              min={1}
              onChange={(limit) => update({ limit: limit ?? 8 })}
            />
          </Field>
          <Field label="Sort">
            <select
              value={source.sort ?? 'manual'}
              onChange={(event) => update({ sort: event.target.value as CommerceProductSort })}
              style={selectStyle()}
            >
              <option value="manual">{text.option('Manual')}</option>
              <option value="newest">{text.option('Newest')}</option>
              <option value="price_low">{text.option('Price low to high')}</option>
              <option value="price_high">{text.option('Price high to low')}</option>
              <option value="title_az">{text.option('Title A-Z')}</option>
            </select>
          </Field>
        </div>
        <Field label="Hide unavailable">
          <Toggle
            checked={source.hideUnavailable !== false}
            onChange={(hideUnavailable) => update({ hideUnavailable })}
          />
        </Field>
      </div>
    </Section>
  );
}

function OrderedProductPicker({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: ProductOption[];
  onChange: (next: string[]) => void;
}) {
  const text = useInspectorText();
  const [query, setQuery] = useState('');
  const byId = new Map(options.map((product) => [product.id, product]));
  const selectedProducts = value
    .map((id) => byId.get(id))
    .filter((product): product is ProductOption => Boolean(product));
  const selected = new Set(value);
  const results = options
    .filter((product) => product.status !== 'draft' && !selected.has(product.id))
    .filter((product) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${product.title} ${product.category ?? ''}`.toLowerCase().includes(q);
    })
    .slice(0, 8);
  const move = (id: string, direction: -1 | 1) => {
    const index = value.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    onChange(next);
  };

  if (options.length === 0) {
    return (
      <p style={helpTextStyle()}>
        {text.option('Add products from the founder dashboard, then pick them here for this section.')}
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <TextInput value={query} onChange={setQuery} placeholder={text.option('Search products')} />
      {selectedProducts.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {selectedProducts.map((product) => (
            <ProductPickerRow
              key={product.id}
              product={product}
              trailing={
                <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => move(product.id, -1)} style={miniBtnStyle()}>
                    {text.option('Up')}
                  </button>
                  <button type="button" onClick={() => move(product.id, 1)} style={miniBtnStyle()}>
                    {text.option('Down')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((id) => id !== product.id))}
                    style={miniBtnStyle()}
                  >
                    {text.option('Remove')}
                  </button>
                </span>
              }
            />
          ))}
        </div>
      ) : (
        <p style={helpTextStyle()}>{text.option('No manual products selected yet.')}</p>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {results.map((product) => (
          <ProductPickerRow
            key={product.id}
            product={product}
            trailing={
              <button
                type="button"
                onClick={() => onChange([...value, product.id])}
                style={miniBtnStyle()}
              >
                {text.option('Add')}
              </button>
            }
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() =>
            onChange(
              options.filter((product) => product.status === 'active').map((product) => product.id),
            )
          }
          style={inlineGhostBtn()}
        >
          {text.option('Select active')}
        </button>
        <button type="button" onClick={() => onChange([])} style={inlineGhostBtn()}>
          {text.option('Clear')}
        </button>
      </div>
    </div>
  );
}

function ProductPickerRow({ product, trailing }: { product: ProductOption; trailing: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '44px minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        border: '1px solid var(--bld-divider)',
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--bld-surface) 84%, transparent)',
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--bld-surface-strong)',
          border: '1px solid var(--bld-divider)',
        }}
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            color: 'var(--bld-text)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.title}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 2,
            color: 'var(--bld-text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {product.status === 'draft'
            ? 'Draft - hidden'
            : product.category ||
              (product.priceQar !== null ? `QAR ${product.priceQar}` : 'Product')}
        </span>
      </span>
      {trailing}
    </div>
  );
}

function FilterableShopEditor({
  value,
  onChange,
  productOptions,
  categoryOptions,
}: {
  value: FilterableShopConfig;
  onChange: (next: FilterableShopConfig) => void;
  productOptions: ProductOption[];
  categoryOptions: string[];
}) {
  const text = useInspectorText();
  const filters = value.filters ?? {};
  const groups = filters.groups?.length ? filters.groups : [defaultFilterGroup('category')];
  const setFilters = (patch: Partial<NonNullable<FilterableShopConfig['filters']>>) =>
    onChange({ ...value, filters: { ...filters, ...patch } });
  const updateGroup = (index: number, patch: Partial<CommerceFilterGroup>) =>
    setFilters({
      groups: groups.map((group, idx) => (idx === index ? { ...group, ...patch } : group)),
    });

  return (
    <Section label="Filterable grid">
      <Field label="Filters enabled">
        <Toggle
          checked={filters.enabled !== false}
          onChange={(enabled) => setFilters({ enabled })}
        />
      </Field>
      <Field label="Layout">
        <SegmentedControl
          value={filters.layout ?? 'sidebar'}
          onChange={(layout) => setFilters({ layout: layout as 'sidebar' | 'topbar' })}
          options={[
            { value: 'sidebar', label: 'Sidebar' },
            { value: 'topbar', label: 'Topbar' },
          ]}
        />
      </Field>
      <Field label="Hide empty options">
        <Toggle
          checked={filters.hideEmptyOptions !== false}
          onChange={(hideEmptyOptions) => setFilters({ hideEmptyOptions })}
        />
      </Field>
      <div style={{ display: 'grid', gap: 10 }}>
        {groups.map((group, index) => (
          <div key={group.id} style={editorCardStyle()}>
            <Field label="Group label EN">
              <TextInput
                value={group.labelEn ?? ''}
                onChange={(labelEn) => updateGroup(index, { labelEn })}
              />
            </Field>
            <Field label="Group label AR">
              <TextInput
                value={group.labelAr ?? ''}
                onChange={(labelAr) => updateGroup(index, { labelAr })}
              />
            </Field>
            <Field label="Source">
              <select
                value={group.source}
                onChange={(event) =>
                  updateGroup(index, {
                    source: event.target.value as CommerceFilterGroup['source'],
                    id: event.target.value,
                  })
                }
                style={selectStyle()}
              >
                <option value="category">{text.option('Category')}</option>
                <option value="brand">{text.option('Brand')}</option>
                <option value="tag">{text.option('Tag / collection')}</option>
                <option value="price">{text.option('Price')}</option>
                <option value="availability">{text.option('Availability')}</option>
                <option value="manual">{text.option('Manual')}</option>
              </select>
            </Field>
            <Field label="Auto-generate options">
              <Toggle
                checked={group.autoGenerate !== false}
                onChange={(autoGenerate) => updateGroup(index, { autoGenerate })}
              />
            </Field>
            {group.autoGenerate === false ? (
              <FilterOptionsEditor
                group={group}
                onChange={(options) => updateGroup(index, { options })}
                productOptions={productOptions}
                categoryOptions={categoryOptions}
              />
            ) : null}
            <button
              type="button"
              onClick={() => setFilters({ groups: groups.filter((_, idx) => idx !== index) })}
              style={inlineGhostBtn()}
            >
              {text.option('Remove group')}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFilters({ groups: [...groups, defaultFilterGroup('category')] })}
          style={inlineGhostBtn()}
        >
          {text.option('+ Add filter group')}
        </button>
      </div>
      <CardConfigEditor
        value={value.card ?? {}}
        onChange={(card) => onChange({ ...value, card })}
      />
    </Section>
  );
}

function FilterOptionsEditor({
  group,
  onChange,
  productOptions,
  categoryOptions,
}: {
  group: CommerceFilterGroup;
  onChange: (options: NonNullable<CommerceFilterGroup['options']>) => void;
  productOptions: ProductOption[];
  categoryOptions: string[];
}) {
  const text = useInspectorText();
  const options = group.options?.length ? group.options : [defaultFilterOption(group.source)];
  const update = (
    index: number,
    patch: Partial<NonNullable<CommerceFilterGroup['options']>[number]>,
  ) => onChange(options.map((option, idx) => (idx === index ? { ...option, ...patch } : option)));
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {options.map((option, index) => (
        <div key={option.id} style={editorNestedCardStyle()}>
          <TextInput
            value={option.labelEn ?? ''}
            onChange={(labelEn) => update(index, { labelEn })}
            placeholder={text.option('Label EN')}
          />
          <TextInput
            value={option.labelAr ?? ''}
            onChange={(labelAr) => update(index, { labelAr })}
            placeholder={text.option('Label AR')}
          />
          {group.source === 'manual' ? (
            <OrderedProductPicker
              value={option.productIds ?? []}
              options={productOptions}
              onChange={(productIds) => update(index, { productIds })}
            />
          ) : group.source === 'category' ? (
            <select
              value={option.category ?? option.value ?? ''}
              onChange={(event) =>
                update(index, { category: event.target.value, value: event.target.value })
              }
              style={selectStyle()}
            >
              <option value="">{text.option('Choose category')}</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          ) : (
            <TextInput
              value={option.value ?? ''}
              onChange={(value) => update(index, { value })}
              placeholder={text.option('Value')}
            />
          )}
          <button
            type="button"
            onClick={() => onChange(options.filter((_, idx) => idx !== index))}
            style={inlineGhostBtn()}
          >
            {text.option('Remove option')}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, defaultFilterOption(group.source)])}
        style={inlineGhostBtn()}
      >
        {text.option('+ Add option')}
      </button>
    </div>
  );
}

function CardConfigEditor({
  value,
  onChange,
}: {
  value: CommerceCardConfig;
  onChange: (next: CommerceCardConfig) => void;
}) {
  const text = useInspectorText();
  const update = (patch: Partial<CommerceCardConfig>) => onChange({ ...value, ...patch });
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Field label="Show description">
        <Toggle
          checked={value.showDescription !== false}
          onChange={(showDescription) => update({ showDescription })}
        />
      </Field>
      <Field label="Show category / brand">
        <Toggle
          checked={value.showCategory !== false}
          onChange={(showCategory) => update({ showCategory, showBrand: showCategory })}
        />
      </Field>
      <Field label="CTA behavior">
        <select
          value={value.ctaMode ?? 'direct_add'}
          onChange={(event) =>
            update({ ctaMode: event.target.value as CommerceCardConfig['ctaMode'] })
          }
          style={selectStyle()}
        >
          <option value="direct_add">{text.option('Direct add')}</option>
          <option value="quick_view">{text.option('Quick view')}</option>
          <option value="product_page">{text.option('Product page')}</option>
        </select>
      </Field>
    </div>
  );
}

function TabbedProductsEditor({
  value,
  onChange,
  productOptions,
  categoryOptions,
}: {
  value: TabbedProductsConfig;
  onChange: (next: TabbedProductsConfig) => void;
  productOptions: ProductOption[];
  categoryOptions: string[];
}) {
  const text = useInspectorText();
  const tabs = value.tabs?.length ? value.tabs : [defaultCommerceTab('new')];
  const updateTab = (
    index: number,
    patch: Partial<NonNullable<TabbedProductsConfig['tabs']>[number]>,
  ) =>
    onChange({
      ...value,
      tabs: tabs.map((tab, idx) => (idx === index ? { ...tab, ...patch } : tab)),
    });
  const moveTab = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tabs.length) return;
    const next = [...tabs];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    onChange({ ...value, tabs: next });
  };
  return (
    <Section label="Curated tabs">
      <Field label="All tab">
        <Toggle
          checked={value.allTab?.enabled !== false}
          onChange={(enabled) => onChange({ ...value, allTab: { ...value.allTab, enabled } })}
        />
      </Field>
      <Field label="All tab source">
        <select
          value={value.allTab?.mode ?? 'combined_tabs'}
          onChange={(event) =>
            onChange({
              ...value,
              allTab: {
                ...value.allTab,
                mode: event.target.value as NonNullable<TabbedProductsConfig['allTab']>['mode'],
              },
            })
          }
          style={selectStyle()}
        >
          <option value="combined_tabs">{text.option('Combine tab products')}</option>
          <option value="all_products">{text.option('All store products')}</option>
          <option value="manual">{text.option('Manual All products')}</option>
        </select>
      </Field>
      {value.allTab?.mode === 'manual' ? (
        <OrderedProductPicker
          value={value.allTab.productIds ?? []}
          options={productOptions}
          onChange={(productIds) => onChange({ ...value, allTab: { ...value.allTab, productIds } })}
        />
      ) : null}
      <Field label="Empty tab behavior">
        <select
          value={value.emptyTabBehavior ?? 'empty_state'}
          onChange={(event) =>
            onChange({
              ...value,
              emptyTabBehavior: event.target.value as TabbedProductsConfig['emptyTabBehavior'],
            })
          }
          style={selectStyle()}
        >
          <option value="empty_state">{text.option('Show empty state')}</option>
          <option value="hide">{text.option('Hide empty tab')}</option>
          <option value="fallback_all">{text.option('Fallback to all products')}</option>
        </select>
      </Field>
      <div style={{ display: 'grid', gap: 10 }}>
        {tabs.map((tab, index) => (
          <div key={tab.id} style={editorCardStyle()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <TextInput
                value={tab.labelEn ?? ''}
                onChange={(labelEn) => updateTab(index, { labelEn })}
                placeholder={text.option('Label EN')}
              />
              <TextInput
                value={tab.labelAr ?? ''}
                onChange={(labelAr) => updateTab(index, { labelAr })}
                placeholder={text.option('Label AR')}
              />
            </div>
            <TextInput
              value={tab.value ?? tab.id}
              onChange={(value) => updateTab(index, { value, id: slugForBuilder(value) })}
              placeholder={text.option('Tab slug')}
            />
            <ProductSourceEditor
              label="Tab products"
              source={normalizeCommerceProductSource(tab.productSource)}
              productOptions={productOptions}
              categoryOptions={categoryOptions}
              onChange={(productSource) => updateTab(index, { productSource })}
            />
            <button
              type="button"
              onClick={() => onChange({ ...value, tabs: tabs.filter((_, idx) => idx !== index) })}
              style={inlineGhostBtn()}
            >
              {text.option('Remove tab')}
            </button>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => moveTab(index, -1)} style={miniBtnStyle()}>
                {text.option('Move up')}
              </button>
              <button type="button" onClick={() => moveTab(index, 1)} style={miniBtnStyle()}>
                {text.option('Move down')}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({ ...value, tabs: [...tabs, defaultCommerceTab(`tab-${tabs.length + 1}`)] })
          }
          style={inlineGhostBtn()}
        >
          {text.option('+ Add tab')}
        </button>
      </div>
      <CardConfigEditor
        value={value.card ?? {}}
        onChange={(card) => onChange({ ...value, card })}
      />
    </Section>
  );
}

function VisualCategoryTilesEditor({
  value,
  onChange,
  productOptions,
  categoryOptions,
  storefrontSlug,
  giphyStorefrontSlug,
}: {
  value: VisualCategoryTilesConfig;
  onChange: (next: VisualCategoryTilesConfig) => void;
  productOptions: ProductOption[];
  categoryOptions: string[];
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
}) {
  const text = useInspectorText();
  const tiles = value.tiles?.length ? value.tiles : [defaultVisualTile()];
  const behavior = value.behavior ?? {};
  const updateTile = (index: number, patch: Partial<VisualCategoryTile>) =>
    onChange({
      ...value,
      tiles: tiles.map((tile, idx) => (idx === index ? { ...tile, ...patch } : tile)),
    });
  const moveTile = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tiles.length) return;
    const next = [...tiles];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    onChange({ ...value, tiles: next });
  };
  const updateDestination = (
    index: number,
    patch: NonNullable<VisualCategoryTile['destination']>,
  ) => {
    const current = tiles[index]?.destination ?? {};
    updateTile(index, { destination: { ...current, ...patch } });
  };

  return (
    <Section label="Visual category tiles">
      <Field label="Tile tabs">
        <Toggle
          checked={behavior.showTabs !== false}
          onChange={(showTabs) => onChange({ ...value, behavior: { ...behavior, showTabs } })}
        />
      </Field>
      <Field label="Click behavior">
        <select
          value={behavior.clickAction ?? 'navigate'}
          onChange={(event) =>
            onChange({
              ...value,
              behavior: {
                ...behavior,
                clickAction: event.target.value as NonNullable<
                  VisualCategoryTilesConfig['behavior']
                >['clickAction'],
              },
            })
          }
          style={selectStyle()}
        >
          <option value="navigate">{text.option('Navigate')}</option>
          <option value="filter_products">{text.option('Filter products below')}</option>
          <option value="scroll_to_products">{text.option('Scroll to product grid')}</option>
          <option value="open_collection_drawer">{text.option('Open collection drawer')}</option>
        </select>
      </Field>
      <Field label="Overlay">
        <select
          value={behavior.overlayStyle ?? 'dark_gradient'}
          onChange={(event) =>
            onChange({
              ...value,
              behavior: {
                ...behavior,
                overlayStyle: event.target.value as NonNullable<
                  VisualCategoryTilesConfig['behavior']
                >['overlayStyle'],
              },
            })
          }
          style={selectStyle()}
        >
          <option value="dark_gradient">{text.option('Dark gradient')}</option>
          <option value="light_overlay">{text.option('Light overlay')}</option>
          <option value="minimal">{text.option('Minimal text')}</option>
          <option value="framed">{text.option('Framed')}</option>
        </select>
      </Field>
      <div style={{ display: 'grid', gap: 10 }}>
        {tiles.map((tile, index) => (
          <div key={tile.id} style={editorCardStyle()}>
            <MediaUploader
              value={tile.imageUrl ?? ''}
              onChange={(imageUrl) => updateTile(index, { imageUrl })}
              namespace="ecommerce-tile"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={giphyStorefrontSlug}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <TextInput
                value={tile.labelEn ?? ''}
                onChange={(labelEn) => updateTile(index, { labelEn })}
                placeholder={text.option('Label EN')}
              />
              <TextInput
                value={tile.labelAr ?? ''}
                onChange={(labelAr) => updateTile(index, { labelAr })}
                placeholder={text.option('Label AR')}
              />
              <TextInput
                value={tile.eyebrowEn ?? ''}
                onChange={(eyebrowEn) => updateTile(index, { eyebrowEn })}
                placeholder={text.option('Eyebrow EN')}
              />
              <TextInput
                value={tile.eyebrowAr ?? ''}
                onChange={(eyebrowAr) => updateTile(index, { eyebrowAr })}
                placeholder={text.option('Eyebrow AR')}
              />
            </div>
            <TextInput
              value={tile.badge?.labelEn ?? ''}
              onChange={(labelEn) => updateTile(index, { badge: { ...tile.badge, labelEn } })}
              placeholder={text.option('Badge EN')}
            />
            <Field label="Destination">
              <select
                value={tile.destination?.type ?? 'category'}
                onChange={(event) =>
                  updateDestination(index, {
                    type: event.target.value as NonNullable<
                      VisualCategoryTile['destination']
                    >['type'],
                  })
                }
                style={selectStyle()}
              >
                <option value="category">{text.option('Category')}</option>
                <option value="tag">{text.option('Tag / collection')}</option>
                <option value="manual_products">{text.option('Manual products')}</option>
                <option value="page">{text.option('Store page')}</option>
                <option value="external">{text.option('External link')}</option>
              </select>
            </Field>
            {tile.destination?.type === 'manual_products' ? (
              <OrderedProductPicker
                value={tile.destination.productIds ?? []}
                options={productOptions}
                onChange={(productIds) => updateDestination(index, { productIds })}
              />
            ) : tile.destination?.type === 'category' || !tile.destination?.type ? (
              <select
                value={tile.destination?.category ?? ''}
                onChange={(event) =>
                  updateDestination(index, { category: event.target.value || null })
                }
                style={selectStyle()}
              >
                <option value="">{text.option('Choose category')}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            ) : tile.destination?.type === 'external' ? (
              <TextInput
                value={tile.destination.url ?? ''}
                onChange={(url) => updateDestination(index, { url })}
                placeholder="https://..."
              />
            ) : tile.destination?.type === 'page' ? (
              <TextInput
                value={tile.destination.pageSlug ?? ''}
                onChange={(pageSlug) => updateDestination(index, { pageSlug })}
                placeholder={text.option('Page slug')}
              />
            ) : (
              <TextInput
                value={tile.destination?.tag ?? ''}
                onChange={(tag) => updateDestination(index, { tag })}
                placeholder={text.option('Tag / collection')}
              />
            )}
            <button
              type="button"
              onClick={() => onChange({ ...value, tiles: tiles.filter((_, idx) => idx !== index) })}
              style={inlineGhostBtn()}
            >
              {text.option('Remove tile')}
            </button>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => moveTile(index, -1)} style={miniBtnStyle()}>
                {text.option('Move up')}
              </button>
              <button type="button" onClick={() => moveTile(index, 1)} style={miniBtnStyle()}>
                {text.option('Move down')}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...value, tiles: [...tiles, defaultVisualTile()] })}
          style={inlineGhostBtn()}
        >
          {text.option('+ Add tile')}
        </button>
      </div>
    </Section>
  );
}

function TaqimBundleEditor({
  value,
  onChange,
  productOptions,
}: {
  value: NonNullable<TaqimBlockProps['bundle']>;
  onChange: (next: NonNullable<TaqimBlockProps['bundle']>) => void;
  productOptions: ProductOption[];
}) {
  const text = useInspectorText();
  const items = value.items?.length ? value.items : [];
  const pricing = value.pricing ?? {};
  const cta = value.cta ?? {};
  const updateItem = (
    index: number,
    patch: Partial<NonNullable<NonNullable<TaqimBlockProps['bundle']>['items']>[number]>,
  ) =>
    onChange({
      ...value,
      items: items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    });
  const selectedIds = items.map((item) => item.productId).filter(Boolean);

  return (
    <Section label="Builder bundle">
      <Field label="Title EN">
        <TextInput
          value={value.titleEn ?? ''}
          onChange={(titleEn) => onChange({ ...value, titleEn })}
        />
      </Field>
      <Field label="Title AR">
        <TextInput
          value={value.titleAr ?? ''}
          onChange={(titleAr) => onChange({ ...value, titleAr })}
        />
      </Field>
      <Field label="Badge EN">
        <TextInput
          value={value.badge?.labelEn ?? ''}
          onChange={(labelEn) => onChange({ ...value, badge: { ...value.badge, labelEn } })}
          placeholder="50% OFF"
        />
      </Field>
      <OrderedProductPicker
        value={selectedIds}
        options={productOptions}
        onChange={(productIds) =>
          onChange({
            ...value,
            items: productIds.map((productId) => {
              const existing = items.find((item) => item.productId === productId);
              return existing ?? { productId, required: true, buyerCanChooseOption: true };
            }),
          })
        }
      />
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, index) => {
          const product = productOptions.find((option) => option.id === item.productId);
          return (
            <div key={item.productId || index} style={editorCardStyle()}>
              <p style={helpTextStyle()}>{product?.title ?? text.option('Bundle product')}</p>
              <Field label="Required item">
                <Toggle
                  checked={item.required !== false}
                  onChange={(required) => updateItem(index, { required })}
                />
              </Field>
              <Field label="Buyer chooses option">
                <Toggle
                  checked={item.buyerCanChooseOption !== false}
                  onChange={(buyerCanChooseOption) => updateItem(index, { buyerCanChooseOption })}
                />
              </Field>
              <TextInput
                value={item.defaultOptionValue ?? ''}
                onChange={(defaultOptionValue) => updateItem(index, { defaultOptionValue })}
                placeholder={text.option('Default option, if needed')}
              />
              <TextInput
                value={item.badgeEn ?? ''}
                onChange={(badgeEn) => updateItem(index, { badgeEn })}
                placeholder={text.option('Product badge EN')}
              />
              <TextInput
                value={item.badgeAr ?? ''}
                onChange={(badgeAr) => updateItem(index, { badgeAr })}
                placeholder={text.option('Product badge AR')}
              />
            </div>
          );
        })}
      </div>
      <Field label="Discount mode">
        <select
          value={pricing.mode ?? 'auto_total'}
          onChange={(event) =>
            onChange({
              ...value,
              pricing: {
                ...pricing,
                mode: event.target.value as NonNullable<
                  NonNullable<TaqimBlockProps['bundle']>['pricing']
                >['mode'],
              },
            })
          }
          style={selectStyle()}
        >
          <option value="auto_total">{text.option('Auto total')}</option>
          <option value="percent_discount">{text.option('Percent discount')}</option>
          <option value="fixed_discount">{text.option('Fixed amount discount')}</option>
          <option value="fixed_bundle_price">{text.option('Fixed bundle price')}</option>
          <option value="display_only">{text.option('Display-only badge')}</option>
        </select>
      </Field>
      {pricing.mode === 'percent_discount' ? (
        <Field label="Percent off">
          <NumberInput
            value={pricing.percentOff ?? ''}
            min={0}
            onChange={(percentOff) => onChange({ ...value, pricing: { ...pricing, percentOff } })}
          />
        </Field>
      ) : null}
      {pricing.mode === 'fixed_discount' ? (
        <Field label="Fixed discount QAR">
          <NumberInput
            value={pricing.fixedDiscountQar ?? ''}
            min={0}
            onChange={(fixedDiscountQar) =>
              onChange({ ...value, pricing: { ...pricing, fixedDiscountQar } })
            }
          />
        </Field>
      ) : null}
      {pricing.mode === 'fixed_bundle_price' ? (
        <Field label="Bundle price QAR">
          <NumberInput
            value={pricing.fixedBundlePriceQar ?? ''}
            min={0}
            onChange={(fixedBundlePriceQar) =>
              onChange({ ...value, pricing: { ...pricing, fixedBundlePriceQar } })
            }
          />
        </Field>
      ) : null}
      <Field label="Show savings">
        <Toggle
          checked={pricing.showSavings !== false}
          onChange={(showSavings) => onChange({ ...value, pricing: { ...pricing, showSavings } })}
        />
      </Field>
      <Field label="Cart CTA mode">
        <SegmentedControl
          value={cta.mode ?? 'add_all'}
          onChange={(mode) =>
            onChange({ ...value, cta: { ...cta, mode: mode as 'add_all' | 'add_selected' } })
          }
          options={[
            { value: 'add_all', label: 'Add all' },
            { value: 'add_selected', label: 'Selected' },
          ]}
        />
      </Field>
      <TextInput
        value={cta.labelEn ?? ''}
        onChange={(labelEn) => onChange({ ...value, cta: { ...cta, labelEn } })}
        placeholder="Add bundle to cart"
      />
      <TextInput
        value={cta.labelAr ?? ''}
        onChange={(labelAr) => onChange({ ...value, cta: { ...cta, labelAr } })}
        placeholder="أضف الباقة للسلة"
      />
      <Field label="Per-product add buttons">
        <Toggle
          checked={Boolean(cta.showPerProductButtons)}
          onChange={(showPerProductButtons) =>
            onChange({ ...value, cta: { ...cta, showPerProductButtons } })
          }
        />
      </Field>
    </Section>
  );
}

function defaultFilterGroup(source: CommerceFilterGroup['source']): CommerceFilterGroup {
  const labels: Record<CommerceFilterGroup['source'], { en: string; ar: string }> = {
    category: { en: 'Category', ar: 'التصنيف' },
    brand: { en: 'Brand', ar: 'العلامة' },
    tag: { en: 'Tag', ar: 'الوسم' },
    price: { en: 'Price', ar: 'السعر' },
    availability: { en: 'Availability', ar: 'التوفر' },
    manual: { en: 'Custom filter', ar: 'فلتر مخصص' },
  };
  return {
    id: `${source}-${makeServiceId().slice(0, 5)}`,
    source,
    labelEn: labels[source].en,
    labelAr: labels[source].ar,
    autoGenerate: source !== 'manual',
    options: source === 'manual' ? [defaultFilterOption('manual')] : [],
  };
}

function defaultFilterOption(
  source: CommerceFilterGroup['source'],
): NonNullable<CommerceFilterGroup['options']>[number] {
  return {
    id: `option-${makeServiceId().slice(0, 5)}`,
    labelEn: source === 'price' ? 'Under 100 QAR' : 'Option',
    labelAr: source === 'price' ? 'أقل من 100 ر.ق' : 'خيار',
    value: source === 'price' ? 'under_100' : '',
    productIds: [],
  };
}

function defaultCommerceTab(seed: string): NonNullable<TabbedProductsConfig['tabs']>[number] {
  const id = slugForBuilder(seed);
  return {
    id,
    labelEn: labelFromId(id),
    labelAr: labelFromId(id),
    value: id,
    productSource: {
      source: 'latest',
      productIds: [],
      category: null,
      tag: null,
      limit: 8,
      sort: 'newest',
      hideUnavailable: true,
    },
  };
}

function defaultVisualTile(): VisualCategoryTile {
  const id = `tile-${makeServiceId().slice(0, 5)}`;
  return {
    id,
    labelEn: 'Collection',
    labelAr: 'مجموعة',
    eyebrowEn: 'Shop',
    eyebrowAr: 'تسوق',
    imageUrl: '',
    badge: { labelEn: '', labelAr: '', tone: 'gold', position: 'top-right' },
    destination: {
      type: 'category',
      category: null,
      tag: null,
      productIds: [],
      pageSlug: null,
      url: null,
    },
  };
}

function slugForBuilder(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || `item-${makeServiceId().slice(0, 5)}`
  );
}

function editorCardStyle(): React.CSSProperties {
  return {
    display: 'grid',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    border: '1px solid var(--bld-divider)',
    background: 'color-mix(in srgb, var(--bld-surface) 88%, transparent)',
  };
}

function editorNestedCardStyle(): React.CSSProperties {
  return {
    display: 'grid',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    border: '1px solid var(--bld-divider)',
    background: 'color-mix(in srgb, var(--bld-surface-strong) 74%, transparent)',
  };
}

function miniBtnStyle(): React.CSSProperties {
  return {
    border: '1px solid var(--bld-divider)',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--bld-text-muted)',
    fontSize: 10,
    padding: '5px 7px',
    cursor: 'pointer',
  };
}

function EcommerceCategoriesEditor({
  categories,
  onChange,
  storefrontSlug,
  giphyStorefrontSlug,
}: {
  categories: EcommerceCategory[];
  onChange: (next: EcommerceCategory[]) => void;
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
}) {
  const rows = categories.length
    ? categories
    : [{ id: makeServiceId().slice(0, 8), label: '', imageUrl: '' }];
  const update = (idx: number, patch: Partial<EcommerceCategory>) =>
    onChange(rows.map((category, i) => (i === idx ? { ...category, ...patch } : category)));
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const add = () =>
    onChange([...rows, { id: makeServiceId().slice(0, 8), label: '', imageUrl: '' }]);

  return (
    <Section label="Categories">
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((category, idx) => (
          <div
            key={category.id ?? idx}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 10,
              borderRadius: 4,
              display: 'grid',
              gap: 8,
            }}
          >
            <MediaUploader
              value={category.imageUrl ?? ''}
              onChange={(v) => update(idx, { imageUrl: v })}
              namespace="ecommerce-category"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={giphyStorefrontSlug}
            />
            <TextInput
              value={category.label ?? ''}
              onChange={(v) => update(idx, { label: v })}
              placeholder="Category label"
            />
            <TextInput
              value={category.tag ?? ''}
              onChange={(v) => update(idx, { tag: v })}
              placeholder="Tag"
            />
            <TextInput
              value={category.href ?? ''}
              onChange={(v) => update(idx, { href: v })}
              placeholder="Link"
            />
            <button type="button" onClick={() => remove(idx)} style={inlineGhostBtn()}>
              Remove
            </button>
          </div>
        ))}
        {rows.length < 12 ? (
          <button type="button" onClick={add} style={inlineGhostBtn()}>
            + Add category
          </button>
        ) : null}
      </div>
    </Section>
  );
}

function Showcase2ImagesEditor({
  items,
  onChange,
  storefrontSlug,
  giphyStorefrontSlug,
}: {
  items: Showcase2Image[];
  onChange: (next: Showcase2Image[]) => void;
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
}) {
  const update = (idx: number, patch: Partial<Showcase2Image>) =>
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () =>
    onChange([...items, { id: makeServiceId().slice(0, 8), imageUrl: '', height: 'md' }]);

  return (
    <Section label="Carousel images">
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, idx) => (
          <div
            key={item.id ?? idx}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 10,
              borderRadius: 4,
              display: 'grid',
              gap: 8,
            }}
          >
            <MediaUploader
              value={item.imageUrl ?? ''}
              onChange={(v) => update(idx, { imageUrl: v })}
              namespace="showcase-2"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={giphyStorefrontSlug}
            />
            <TextInput
              value={item.alt ?? ''}
              onChange={(v) => update(idx, { alt: v })}
              placeholder="Alt text"
            />
            <SegmentedControl
              value={item.height ?? 'md'}
              onChange={(v) => update(idx, { height: v as Showcase2Image['height'] })}
              options={[
                { value: 'sm', label: 'Short' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Tall' },
              ]}
            />
            <button type="button" onClick={() => remove(idx)} style={inlineGhostBtn()}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={add} style={inlineGhostBtn()}>
          + Add image
        </button>
      </div>
    </Section>
  );
}

function Showcase3ItemsEditor({
  items,
  onChange,
  storefrontSlug,
  giphyStorefrontSlug,
}: {
  items: Showcase3Item[];
  onChange: (next: Showcase3Item[]) => void;
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
}) {
  const rows = items.length
    ? items
    : [
        { id: makeServiceId().slice(0, 8), title: '', category: '', imageUrl: '' },
        { id: makeServiceId().slice(0, 8), title: '', category: '', imageUrl: '' },
        { id: makeServiceId().slice(0, 8), title: '', category: '', imageUrl: '' },
      ];
  const commit = (next: Showcase3Item[]) => onChange(next);
  const update = (idx: number, patch: Partial<Showcase3Item>) =>
    commit(rows.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  const remove = (idx: number) => commit(rows.filter((_, i) => i !== idx));
  const add = () =>
    commit([...rows, { id: makeServiceId().slice(0, 8), title: '', category: '', imageUrl: '' }]);

  return (
    <Section label="Carousel cards">
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((item, idx) => (
          <div
            key={item.id ?? idx}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 10,
              borderRadius: 4,
              display: 'grid',
              gap: 8,
            }}
          >
            <MediaUploader
              value={item.imageUrl ?? ''}
              onChange={(v) => update(idx, { imageUrl: v })}
              namespace="showcase-3"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={giphyStorefrontSlug}
            />
            <TextInput
              value={item.title ?? ''}
              onChange={(v) => update(idx, { title: v })}
              placeholder="Card title"
            />
            <TextInput
              value={item.category ?? ''}
              onChange={(v) => update(idx, { category: v })}
              placeholder="Category"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              style={inlineGhostBtn()}
              disabled={rows.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}
        {rows.length < 6 ? (
          <button type="button" onClick={add} style={inlineGhostBtn()}>
            + Add card
          </button>
        ) : null}
      </div>
    </Section>
  );
}

function Showcase4ProjectsEditor({
  projects,
  onChange,
  storefrontSlug,
  giphyStorefrontSlug,
}: {
  projects: Showcase4Project[];
  onChange: (next: Showcase4Project[]) => void;
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
}) {
  const update = (idx: number, patch: Partial<Showcase4Project>) =>
    onChange(projects.map((project, i) => (i === idx ? { ...project, ...patch } : project)));
  const remove = (idx: number) => onChange(projects.filter((_, i) => i !== idx));
  const add = () =>
    onChange([...projects, { id: makeServiceId().slice(0, 8), title: '', tags: [] }]);

  return (
    <Section label="Projects">
      <div style={{ display: 'grid', gap: 10 }}>
        {projects.map((project, idx) => (
          <div
            key={project.id ?? idx}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 10,
              borderRadius: 4,
              display: 'grid',
              gap: 8,
            }}
          >
            <MediaUploader
              value={project.imageUrl ?? ''}
              onChange={(v) => update(idx, { imageUrl: v })}
              namespace="showcase-4"
              storefrontSlug={storefrontSlug}
              giphyStorefrontSlug={giphyStorefrontSlug}
            />
            <TextInput
              value={project.title ?? ''}
              onChange={(v) => update(idx, { title: v })}
              placeholder="Project title"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <TextInput
                value={project.client ?? ''}
                onChange={(v) => update(idx, { client: v })}
                placeholder="Client"
              />
              <TextInput
                value={project.year ?? ''}
                onChange={(v) => update(idx, { year: v })}
                placeholder="Year"
              />
            </div>
            <TextInput
              value={(project.tags ?? []).join(', ')}
              onChange={(v) =>
                update(idx, {
                  tags: v
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Tags, comma separated"
            />
            <TextInput
              value={project.href ?? ''}
              onChange={(v) => update(idx, { href: v })}
              placeholder="Link"
            />
            <button type="button" onClick={() => remove(idx)} style={inlineGhostBtn()}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={add} style={inlineGhostBtn()}>
          + Add project
        </button>
      </div>
    </Section>
  );
}

function Showcase5TabsEditor({
  tabs,
  onChange,
  storefrontSlug,
  giphyStorefrontSlug,
}: {
  tabs: Showcase5Tab[];
  onChange: (next: Showcase5Tab[]) => void;
  storefrontSlug: string;
  giphyStorefrontSlug?: string;
}) {
  const updateTab = (idx: number, patch: Partial<Showcase5Tab>) =>
    onChange(tabs.map((tab, i) => (i === idx ? { ...tab, ...patch } : tab)));
  const removeTab = (idx: number) => onChange(tabs.filter((_, i) => i !== idx));
  const addTab = () =>
    onChange([...tabs, { id: makeServiceId().slice(0, 8), label: 'New tab', images: [] }]);
  const updateImage = (tabIdx: number, imageIdx: number, value: string) => {
    const tab = tabs[tabIdx];
    if (!tab) return;
    const images = [...(tab.images ?? [])];
    images[imageIdx] = value;
    updateTab(tabIdx, { images });
  };
  const addImage = (tabIdx: number) => {
    const tab = tabs[tabIdx];
    if (!tab) return;
    updateTab(tabIdx, { images: [...(tab.images ?? []), ''] });
  };
  const removeImage = (tabIdx: number, imageIdx: number) => {
    const tab = tabs[tabIdx];
    if (!tab) return;
    updateTab(tabIdx, { images: (tab.images ?? []).filter((_, i) => i !== imageIdx) });
  };

  return (
    <Section label="Tabs">
      <div style={{ display: 'grid', gap: 10 }}>
        {tabs.map((tab, tabIdx) => (
          <div
            key={tab.id ?? tabIdx}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 10,
              borderRadius: 4,
              display: 'grid',
              gap: 8,
            }}
          >
            <TextInput
              value={tab.label ?? ''}
              onChange={(v) => updateTab(tabIdx, { label: v })}
              placeholder="Tab label"
            />
            <div style={{ display: 'grid', gap: 8 }}>
              {(tab.images ?? []).map((src, imageIdx) => (
                <div key={`${tab.id ?? tabIdx}-${imageIdx}`} style={{ display: 'grid', gap: 6 }}>
                  <MediaUploader
                    value={src}
                    onChange={(v) => updateImage(tabIdx, imageIdx, v)}
                    namespace={`showcase-5-${tab.id ?? tabIdx}`}
                    storefrontSlug={storefrontSlug}
                    giphyStorefrontSlug={giphyStorefrontSlug}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(tabIdx, imageIdx)}
                    style={inlineGhostBtn()}
                  >
                    Remove image
                  </button>
                </div>
              ))}
              {(tab.images ?? []).length < 12 ? (
                <button type="button" onClick={() => addImage(tabIdx)} style={inlineGhostBtn()}>
                  + Add image
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeTab(tabIdx)}
              style={inlineGhostBtn()}
              disabled={tabs.length <= 1}
            >
              Remove tab
            </button>
          </div>
        ))}
        {tabs.length < 5 ? (
          <button type="button" onClick={addTab} style={inlineGhostBtn()}>
            + Add tab
          </button>
        ) : null}
      </div>
    </Section>
  );
}

type ServiceEditorItem = {
  id: string;
  title: string;
  description?: string;
  priceQar?: number;
  status?: 'active' | 'sold_out';
};

/**
 * Inline service rows authored on a ServiceList block. Each row carries
 * a stable nanoid `id` for React keys and to keep drag/duplicate stable.
 * Empty list → the renderer falls back to the products-table mode.
 */
function ServiceItemsEditor({
  items,
  onChange,
}: {
  items: ServiceEditorItem[];
  onChange: (next: ServiceEditorItem[]) => void;
}) {
  const update = (idx: number, patch: Partial<ServiceEditorItem>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[next]] = [copy[next]!, copy[idx]!];
    onChange(copy);
  };
  const add = () =>
    onChange([...items, { id: makeServiceId(), title: '', description: '', status: 'active' }]);

  return (
    <Field label="Services">
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 10,
              borderRadius: 4,
              display: 'grid',
              gap: 8,
            }}
          >
            <TextInput
              value={item.title}
              onChange={(v) => update(idx, { title: v })}
              placeholder="Service name"
            />
            <TextArea
              value={item.description ?? ''}
              onChange={(v) => update(idx, { description: v })}
              rows={2}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumberInput
                value={item.priceQar ?? ''}
                onChange={(v) => update(idx, { priceQar: v })}
                placeholder="Price (QAR)"
                min={0}
                step="any"
              />
              <SegmentedControl
                value={item.status ?? 'active'}
                onChange={(v) => update(idx, { status: v as 'active' | 'sold_out' })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'sold_out', label: 'Paused' },
                ]}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  style={inlineGhostBtn()}
                  disabled={idx === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  style={inlineGhostBtn()}
                  disabled={idx === items.length - 1}
                >
                  ↓
                </button>
              </div>
              <button type="button" onClick={() => remove(idx)} style={inlineGhostBtn()}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={add} style={inlineGhostBtn()}>
          + Add service
        </button>
      </div>
    </Field>
  );
}

function makeServiceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

type PromoTagEditorRow = {
  id: string;
  label: string;
  color?: string;
  background?: string;
};

/**
 * Inline editor for the `productPromoCard` tag chips. Caps at 3 rows
 * (the renderer's stack height) and writes directly to the block's
 * `tags[]` array. Each row exposes label + optional text/background
 * colour overrides; empty colour fields fall back to the storefront
 * accent on the public render.
 */
function PromoTagsEditor({
  tags,
  onChange,
}: {
  tags: PromoTagEditorRow[];
  onChange: (next: PromoTagEditorRow[]) => void;
}) {
  const update = (idx: number, patch: Partial<PromoTagEditorRow>) =>
    onChange(tags.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  const remove = (idx: number) => onChange(tags.filter((_, i) => i !== idx));
  const add = () => {
    if (tags.length >= 3) return;
    onChange([...tags, { id: makeServiceId().slice(0, 8), label: '' }]);
  };

  return (
    <Field label="Tags">
      <div style={{ display: 'grid', gap: 8 }}>
        {tags.map((tag, idx) => (
          <div
            key={tag.id}
            style={{
              border: '1px solid var(--bld-divider)',
              padding: 8,
              borderRadius: 4,
              display: 'grid',
              gap: 6,
            }}
          >
            <TextInput
              value={tag.label}
              onChange={(v) => update(idx, { label: v })}
              placeholder="NEW"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <TextInput
                value={tag.background ?? ''}
                onChange={(v) => update(idx, { background: v || undefined })}
                placeholder="bg colour"
              />
              <TextInput
                value={tag.color ?? ''}
                onChange={(v) => update(idx, { color: v || undefined })}
                placeholder="text colour"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => remove(idx)} style={inlineGhostBtn()}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {tags.length < 3 ? (
          <button type="button" onClick={add} style={inlineGhostBtn()}>
            + Add tag
          </button>
        ) : (
          <p
            style={{
              fontSize: 11,
              color: 'var(--bld-text-faint)',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            Max 3 tags — remove one to add another.
          </p>
        )}
      </div>
    </Field>
  );
}

function ProductPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ProductOption[];
  onChange: (v: string) => void;
}) {
  // Group options by category so the dropdown reads as a sorted index
  // rather than a flat list. Categories are surfaced alphabetically;
  // an unlabeled "Uncategorised" group catches products with no
  // category. Within each group, products keep their incoming order
  // (the parent supplies them already-sorted by recency / position).
  const groups = new Map<string, ProductOption[]>();
  for (const p of options) {
    const key = p.category?.trim() || '';
    const arr = groups.get(key);
    if (arr) arr.push(p);
    else groups.set(key, [p]);
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    // Empty / "Uncategorised" sinks to the bottom; everything else is
    // alphabetic. Locale-aware so Arabic categories collate correctly.
    if (!a && b) return 1;
    if (a && !b) return -1;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
  const text = useInspectorText();

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle()}>
      <option value="">{text.option('Pick a product')}</option>
      {sortedKeys.map((key) => (
        <optgroup key={key || '__uncat__'} label={key || text.option('Uncategorised')}>
          {groups.get(key)!.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function CategoryPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const text = useInspectorText();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle()}>
      <option value="">{text.option('All categories')}</option>
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

// =========================================================================
// Primitives
// =========================================================================

function useInspectorText() {
  const { builder, locale } = useBuilderCopy();
  const labels = builder.inspector.labels as Record<string, string>;
  const options = builder.inspector.options as Record<string, string>;
  const inline = locale === 'ar' ? INSPECTOR_INLINE_AR : {};
  const resolve = (value: string) => labels[value] ?? options[value] ?? inline[value] ?? value;
  return {
    label: (value: string | undefined) => (value ? resolve(value) : value),
    option: (value: string) => options[value] ?? resolve(value),
  };
}

function Section({ label, children }: { label?: string; children: ReactNode }) {
  const text = useInspectorText();
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {label ? (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--bld-text-faint)',
          }}
        >
          {text.label(label)}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function helpTextStyle(): React.CSSProperties {
  return {
    margin: 0,
    color: 'var(--bld-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.04em',
    lineHeight: 1.5,
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const text = useInspectorText();
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--bld-text-muted)',
        }}
      >
        {text.label(label)}
      </span>
      {children}
    </label>
  );
}

function OptionGrid<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string; blurb: string }>;
  onChange: (value: T) => void;
}) {
  const text = useInspectorText();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 6,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.blurb}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: active ? '1px solid var(--bld-accent)' : '1px solid var(--bld-input-border)',
              background: active ? 'var(--bld-accent-soft)' : 'var(--bld-tile-bg)',
              color: 'var(--bld-input-text)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              minHeight: 48,
            }}
          >
            <span style={{ display: 'block', fontWeight: 600 }}>{text.option(opt.label)}</span>
            <span
              style={{
                display: 'block',
                marginTop: 3,
                color: 'var(--bld-text-muted)',
                fontSize: 10,
                lineHeight: 1.3,
              }}
            >
              {text.option(opt.blurb)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Text size stepper — A− / percentage / A+ over `style.fontScale`
 * (0.6–1.8 in 0.1 steps, 1 = the block's designed size). Clicking the
 * percentage resets to 100%. Kept deliberately simpler than a px input:
 * blocks size type with responsive clamp() expressions, so a multiplier
 * is the only honest control.
 */
function TextSizeStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const text = useInspectorText();
  const step = (dir: -1 | 1) => {
    const next = Math.round((value + dir * 0.1) * 10) / 10;
    onChange(Math.min(1.8, Math.max(0.6, next)));
  };
  const btnStyle: React.CSSProperties = {
    width: 34,
    padding: '7px 0',
    borderRadius: 6,
    border: '1px solid var(--bld-input-border)',
    background: 'var(--bld-tile-bg)',
    color: 'var(--bld-input-text)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontWeight: 650,
    lineHeight: 1,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
      <button
        type="button"
        aria-label="Smaller text"
        disabled={value <= 0.6}
        onClick={() => step(-1)}
        style={{ ...btnStyle, fontSize: 11, opacity: value <= 0.6 ? 0.45 : 1 }}
      >
        A−
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        title={text.option('Reset to 100%')}
        style={{
          flex: 1,
          padding: '7px 0',
          borderRadius: 6,
          border: '1px solid var(--bld-input-border)',
          background: 'var(--bld-input-bg, transparent)',
          color: value === 1 ? 'var(--bld-text-muted)' : 'var(--bld-input-text)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.04em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Math.round(value * 100)}%
      </button>
      <button
        type="button"
        aria-label="Larger text"
        disabled={value >= 1.8}
        onClick={() => step(1)}
        style={{ ...btnStyle, fontSize: 14, opacity: value >= 1.8 ? 0.45 : 1 }}
      >
        A+
      </button>
    </div>
  );
}

/**
 * Effect speed stepper — − / multiplier / + over `style.fxSpeed`
 * (preset stops from ¼× to 3×, 1× = the effect's designed pace).
 * Clicking the multiplier resets to 1×. Mirrors TextSizeStepper.
 */
const FX_SPEED_STOPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3] as const;

function FxSpeedStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const text = useInspectorText();
  const idx = FX_SPEED_STOPS.reduce(
    (best, stop, i) =>
      Math.abs(stop - value) < Math.abs((FX_SPEED_STOPS[best] ?? 1) - value) ? i : best,
    0,
  );
  const step = (dir: -1 | 1) => {
    onChange(
      FX_SPEED_STOPS[Math.min(FX_SPEED_STOPS.length - 1, Math.max(0, idx + dir))] ?? 1,
    );
  };
  const btnStyle: React.CSSProperties = {
    width: 34,
    padding: '7px 0',
    borderRadius: 6,
    border: '1px solid var(--bld-input-border)',
    background: 'var(--bld-tile-bg)',
    color: 'var(--bld-input-text)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontWeight: 650,
    fontSize: 13,
    lineHeight: 1,
  };
  const label = `${FX_SPEED_STOPS[idx]}×`.replace('0.', '.');
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
      <button
        type="button"
        aria-label="Slower"
        disabled={idx === 0}
        onClick={() => step(-1)}
        style={{ ...btnStyle, opacity: idx === 0 ? 0.45 : 1 }}
      >
        −
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        title={text.option('Reset to 1×')}
        style={{
          flex: 1,
          padding: '7px 0',
          borderRadius: 6,
          border: '1px solid var(--bld-input-border)',
          background: 'var(--bld-input-bg, transparent)',
          color: idx === 3 ? 'var(--bld-text-muted)' : 'var(--bld-input-text)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.04em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {label}
      </button>
      <button
        type="button"
        aria-label="Faster"
        disabled={idx === FX_SPEED_STOPS.length - 1}
        onClick={() => step(1)}
        style={{ ...btnStyle, opacity: idx === FX_SPEED_STOPS.length - 1 ? 0.45 : 1 }}
      >
        +
      </button>
    </div>
  );
}

/* Pause the live FX previews while their tile is scrolled out of view —
 * 57 concurrent CSS animations would tax the GPU for tiles nobody sees.
 * `content-visibility` additionally skips layout/paint entirely. */
const TEXT_FX_TILE_STYLES = `
[data-fx-tile] { content-visibility: auto; contain-intrinsic-size: auto 78px; }
[data-fx-tile][data-fx-offscreen] .souqna-tfx,
[data-fx-tile][data-fx-offscreen] .souqna-tfx *,
[data-fx-tile][data-fx-offscreen] .souqna-tfx::before,
[data-fx-tile][data-fx-offscreen] .souqna-tfx::after,
[data-fx-tile][data-fx-offscreen] .souqna-tfx *::before,
[data-fx-tile][data-fx-offscreen] .souqna-tfx *::after {
  animation-play-state: paused !important;
}
@keyframes fx-tile-spin { to { transform: rotate(360deg); } }
.fx-tile-spinner {
  position: absolute;
  top: 5px;
  inset-inline-end: 5px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--sf-ink) 25%, transparent);
  border-top-color: var(--sf-ink);
  animation: fx-tile-spin .7s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .fx-tile-spinner { animation-duration: 1.6s; }
}
`;

/**
 * Colorion FX picker — the 57-effect library rendered as categorised
 * groups with a live animated preview per tile (the effect applied to a
 * sample word on the storefront palette ground, so it reads the way it
 * will on canvas — deliberately our own skin, not colorion's dark demo
 * cards). Tiles carry the same tier pill + locked treatment as the
 * chrome pickers in SiteInspector; locked tiles still preview (that's
 * the upsell) but are disabled with a "{tier} required" tooltip.
 * Clicking the active tile toggles the effect back off.
 */
function TextFxPicker({
  value,
  currentPlan,
  onChange,
  fxColor,
  fxColor2,
  fxSpeed,
  pendingId,
}: {
  value: string;
  currentPlan: Plan;
  onChange: (value: TextEffect | 'none') => void;
  /** Founder colour/speed overrides — previews honour them live. */
  fxColor?: string;
  fxColor2?: string;
  fxSpeed?: number;
  /** FX id still travelling to the canvas — its tile shows a spinner. */
  pendingId?: string;
}) {
  const text = useInspectorText();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [hideLocked, setHideLocked] = useState(false);

  const anyLocked = useMemo(
    () => TEXT_FX.some((fx) => !planAtLeast(currentPlan, fx.tier)),
    [currentPlan],
  );

  // Filtered view — search matches label, slug, blurb and category
  // name; "My plan" trims the list to what the current plan unlocks.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEXT_FX.filter((fx) => {
      if (hideLocked && !planAtLeast(currentPlan, fx.tier)) return false;
      if (!q) return true;
      return (
        fx.label.toLowerCase().includes(q) ||
        fx.slug.includes(q) ||
        fx.blurb.toLowerCase().includes(q) ||
        TEXT_FX_CATEGORY_LABELS[fx.category].toLowerCase().includes(q)
      );
    });
  }, [query, hideLocked, currentPlan]);

  // Re-observe whenever the filtered set changes — filtering remounts
  // tiles, and an unobserved tile would animate forever offscreen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries)
          en.target.toggleAttribute('data-fx-offscreen', !en.isIntersecting);
      },
      { rootMargin: '100px' },
    );
    root.querySelectorAll('[data-fx-tile]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visible]);

  // Preview stages render on the storefront palette (same sand_gold
  // default as BackgroundPatternPicker) so effects read in context, and
  // pick up the founder's effect-colour/speed overrides immediately.
  const stageVars = useMemo(() => {
    const triplet = palettes.sand_gold.light;
    const vars: Record<string, string> = {
      '--sf-ground': triplet.ground,
      '--sf-ink': triplet.ink,
      '--sf-accent': triplet.accent,
    };
    if (fxColor) vars['--fx-accent'] = fxColor;
    if (fxColor2) vars['--fx-accent-2'] = fxColor2;
    if (typeof fxSpeed === 'number' && fxSpeed !== 1) vars['--fx-speed'] = String(fxSpeed);
    return vars as React.CSSProperties;
  }, [fxColor, fxColor2, fxSpeed]);

  return (
    <div
      ref={rootRef}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, ...stageVars }}
    >
      <style>{TEXT_FX_TILE_STYLES}</style>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={text.label('Search effects…')}
          aria-label="Search text effects"
          style={{ ...inputStyle(), flex: 1, minWidth: 0 }}
        />
        {anyLocked ? (
          <button
            type="button"
            aria-pressed={hideLocked}
            onClick={() => setHideLocked((v) => !v)}
            title={text.option('Only show effects your plan includes')}
            style={{
              flexShrink: 0,
              padding: '0 10px',
              borderRadius: 6,
              border: hideLocked
                ? '1px solid var(--bld-accent)'
                : '1px solid var(--bld-input-border)',
              background: hideLocked ? 'var(--bld-accent-soft)' : 'var(--bld-tile-bg)',
              color: hideLocked ? 'var(--bld-input-text)' : 'var(--bld-text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 10.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {text.option('My plan')}
          </button>
        ) : null}
      </div>
      {visible.length === 0 ? (
        <div
          style={{
            padding: '14px 4px',
            textAlign: 'center',
            fontFamily: 'var(--font-sans)',
            fontSize: 11.5,
            color: 'var(--bld-text-muted)',
          }}
        >
          {text.option('No effects match')}
        </div>
      ) : null}
      {(Object.keys(TEXT_FX_CATEGORY_LABELS) as TextFxCategory[])
        .filter((cat) => visible.some((fx) => fx.category === cat))
        .map((cat) => (
        <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--bld-text-muted)',
            }}
          >
            {text.option(TEXT_FX_CATEGORY_LABELS[cat])}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 6,
            }}
          >
            {visible.filter((fx) => fx.category === cat).map((fx) => {
              const active = value === fx.id;
              const locked = !planAtLeast(currentPlan, fx.tier);
              const tierLabel = PLAN_LIMITS[fx.tier].label;
              return (
                <button
                  key={fx.id}
                  data-fx-tile=""
                  type="button"
                  disabled={locked}
                  aria-busy={pendingId === fx.id || undefined}
                  onClick={() => onChange(active ? 'none' : fx.id)}
                  title={locked ? `${fx.blurb} ${tierLabel} required.` : fx.blurb}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    padding: 5,
                    borderRadius: 7,
                    border: active
                      ? '1px solid var(--bld-accent)'
                      : '1px solid var(--bld-input-border)',
                    background: active ? 'var(--bld-accent-soft)' : 'var(--bld-tile-bg)',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    opacity: locked ? 0.6 : 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'relative',
                      display: 'grid',
                      placeItems: 'center',
                      height: 44,
                      width: '100%',
                      borderRadius: 5,
                      background: 'var(--sf-ground)',
                      color: 'var(--sf-ink)',
                      overflow: 'hidden',
                    }}
                  >
                    {pendingId === fx.id ? <span className="fx-tile-spinner" /> : null}
                    <TextEffectRenderer
                      as="span"
                      effect={fx.id}
                      style={{
                        fontSize: 15,
                        fontWeight: 650,
                        lineHeight: 1.15,
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Souqna
                    </TextEffectRenderer>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      width: '100%',
                      minWidth: 0,
                      paddingInline: 3,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'start',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: locked ? 'var(--bld-text-faint)' : 'var(--bld-input-text)',
                      }}
                    >
                      {fx.label}
                    </span>
                    {fx.tier !== 'free' ? (
                      <span
                        style={{
                          flexShrink: 0,
                          borderRadius: 999,
                          padding: '2px 6px',
                          border: '1px solid var(--bld-accent-line)',
                          background: active ? 'var(--bld-accent)' : 'var(--bld-chip-bg)',
                          color: active ? 'var(--bld-accent-ink)' : 'var(--bld-text-muted)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 8,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {tierLabel}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Effect colour override row — two swatches over `style.fxColor` /
 * `fxColor2` (the FX accent pair) plus a reset back to the palette
 * defaults. Native colour inputs; state updates are synchronous local
 * builder state, so controlled values don't fight the drag.
 */
function FxColorRow({
  fxColor,
  fxColor2,
  onChange,
}: {
  fxColor?: string;
  fxColor2?: string;
  onChange: (patch: { fxColor?: string; fxColor2?: string }) => void;
}) {
  const text = useInspectorText();
  const swatch = (
    label: string,
    val: string | undefined,
    fallback: string,
    commit: (v: string) => void,
  ) => (
    <label
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 8px',
        borderRadius: 6,
        border: '1px solid var(--bld-input-border)',
        background: 'var(--bld-tile-bg)',
        cursor: 'pointer',
        minWidth: 0,
      }}
    >
      <input
        type="color"
        value={val ?? fallback}
        onChange={(e) => commit(e.target.value)}
        aria-label={label}
        style={{
          width: 24,
          height: 24,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 10.5,
          fontWeight: 600,
          color: val ? 'var(--bld-input-text)' : 'var(--bld-text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text.option(label)}
      </span>
    </label>
  );
  const paletteAccent = palettes.sand_gold.light.accent;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
      {swatch('Colour A', fxColor, paletteAccent, (v) => onChange({ fxColor: v }))}
      {swatch('Colour B', fxColor2, paletteAccent, (v) => onChange({ fxColor2: v }))}
      {fxColor || fxColor2 ? (
        <button
          type="button"
          onClick={() => onChange({ fxColor: undefined, fxColor2: undefined })}
          title={text.option('Back to palette colours')}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: '1px solid var(--bld-input-border)',
            background: 'var(--bld-tile-bg)',
            color: 'var(--bld-text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: 10.5,
            fontWeight: 600,
          }}
        >
          {text.option('Reset')}
        </button>
      ) : null}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const text = useInspectorText();
  return (
    <input
      type="text"
      value={value}
      placeholder={text.label(placeholder)}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle()}
    />
  );
}

function DateTimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const localValue = toDateTimeLocal(value);
  return (
    <input
      type="datetime-local"
      value={localValue}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next ? new Date(next).toISOString() : '');
      }}
      style={inputStyle()}
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  min = 1,
  step,
}: {
  value: number | '';
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  min?: number;
  step?: number | 'any';
}) {
  const text = useInspectorText();
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value === '' ? '' : value}
      placeholder={text.label(placeholder)}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Number(v));
      }}
      style={inputStyle()}
    />
  );
}

function toDateTimeLocal(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function TextArea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'var(--font-sans)' }}
    />
  );
}

/**
 * Top-level Content / Style switcher for the Block view. Reads as a
 * pair of full-width tab buttons sitting on a hairline so the active
 * half is clearly the focused surface — unlike the inline
 * `SegmentedControl` below which is meant for in-form choices.
 */
function ViewTabs({
  value,
  onChange,
}: {
  value: 'content' | 'style';
  onChange: (v: 'content' | 'style') => void;
}) {
  const text = useInspectorText();
  const tabs: Array<{ id: 'content' | 'style'; label: string }> = [
    { id: 'content', label: text.label('Content') ?? 'Content' },
    { id: 'style', label: text.label('Style') ?? 'Style' },
  ];
  return (
    <div
      role="tablist"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        borderBottom: '1px solid var(--bld-divider)',
      }}
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            style={{
              padding: '10px 0 12px',
              border: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: active ? 'var(--bld-accent)' : 'var(--bld-text-muted)',
              cursor: 'pointer',
              borderBottom: active ? '2px solid var(--bld-accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 140ms, border-color 140ms',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  const text = useInspectorText();
  return (
    <div
      role="radiogroup"
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: 4,
        border: '1px solid var(--bld-divider)',
        padding: 2,
        borderRadius: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '5px 10px',
              border: 'none',
              borderRadius: 3,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: active ? 'var(--bld-text)' : 'var(--bld-text-muted)',
              background: active ? 'var(--bld-chip-bg-active)' : 'transparent',
              boxShadow: active ? 'inset 0 0 0 1px var(--bld-input-border)' : undefined,
              cursor: 'pointer',
            }}
          >
            {text.option(opt.label)}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        border: '1px solid var(--bld-input-border)',
        background: checked ? 'var(--bld-accent)' : 'var(--bld-tile-bg)',
        position: 'relative',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: checked ? 'var(--bld-accent-ink)' : 'var(--bld-text)',
          transition: 'left 140ms ease',
        }}
      />
    </button>
  );
}

/**
 * Circular ghost button used by the inspector header. No border at
 * rest — the button reads as a glyph only — and fills on hover with a
 * sand tint (or a red wash for the destructive variant). The .souqna-
 * inspector-icon CSS rules in BuilderShell's <style> block paint the
 * hover state; falling back to inline styles only for the static
 * resting look.
 */
function IconBtn({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  title?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`souqna-inspector-icon${danger ? ' souqna-inspector-icon--danger' : ''}`}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        color: danger ? '#E68A8A' : 'var(--bld-text-muted)',
        borderRadius: 999,
        cursor: 'pointer',
        padding: 0,
        transition: 'background 160ms ease, color 160ms ease, transform 160ms ease',
      }}
    >
      {children}
    </button>
  );
}

function ArrowUpGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 11V3" />
      <path d="M3.5 6.5L7 3l3.5 3.5" />
    </svg>
  );
}

function ArrowDownGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 3v8" />
      <path d="M3.5 7.5L7 11l3.5-3.5" />
    </svg>
  );
}

function DuplicateGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="7" height="7" rx="1.4" />
      <rect x="5" y="5" width="7" height="7" rx="1.4" />
    </svg>
  );
}

function TrashGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.8 4h8.4" />
      <path d="M5.6 4V2.6h2.8V4" />
      <path d="M4.2 4l.5 7.4h4.6L9.8 4" />
      <path d="M5.8 6.5v3.4M8.2 6.5v3.4" />
    </svg>
  );
}

// =========================================================================
// Helpers
// =========================================================================

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown): number | '' {
  return typeof v === 'number' && Number.isFinite(v) ? v : '';
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  return fallback;
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bld-input-bg)',
    border: '1px solid var(--bld-divider)',
    color: 'var(--bld-input-text)',
    borderRadius: 3,
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    appearance: 'none',
    backgroundImage:
      'linear-gradient(45deg, transparent 50%, rgba(232,220,196,0.6) 50%), linear-gradient(135deg, rgba(232,220,196,0.6) 50%, transparent 50%)',
    backgroundPosition: 'calc(100% - 14px) 50%, calc(100% - 9px) 50%',
    backgroundSize: '5px 5px',
    backgroundRepeat: 'no-repeat',
    paddingRight: 28,
  };
}

function inlineGhostBtn(): React.CSSProperties {
  return {
    padding: '6px 10px',
    background: 'var(--bld-tile-bg)',
    border: '1px solid var(--bld-input-border)',
    color: 'var(--bld-text)',
    borderRadius: 3,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  };
}
