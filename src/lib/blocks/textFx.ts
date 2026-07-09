/**
 * Colorion text FX — 57 pure-CSS text effects adapted from
 * https://text-effects.colorion.co (MIT licensed). This module is the
 * editorial layer: display labels, one-line blurbs, picker categories,
 * plan tiers, and the markup recipe the renderer needs. The CSS itself
 * lives in `src/components/storefront/blocks/text-fx.css` (generated —
 * see its header for the transforms applied to the upstream sheet).
 *
 * `tier` uses INTERNAL plan ids (`free`/`starter`/`pro`/`atelier`); the
 * customer-facing labels are Free / Pro / Pro+ / Max+ per the 2026-04
 * rebrand (see the PLAN_RANK note in `src/lib/plans.ts`). Re-tiering an
 * effect is a one-word edit here — nothing else needs to move.
 *
 * Markup recipes (how TextEffectRenderer builds the DOM for a recipe):
 *   plain      text sits directly inside the effect element
 *   data-text  the element repeats its copy in a `data-text` attribute
 *              (consumed by ::before/::after ghost layers)
 *   letters    each glyph is wrapped in `<b aria-hidden style="--i:n">`
 *              so keyframes can stagger per letter; Arabic/RTL copy is
 *              split per word instead to preserve contextual shaping
 */
import type { Plan } from '@/lib/plans';
import type { TextEffect } from './types';

export type TextFxMarkup = 'plain' | 'data-text' | 'letters';
export type TextFxCategory = 'glow' | 'glitch' | 'motion' | 'material' | 'liquid' | 'editorial';

export type TextFxDef = {
  id: TextEffect;
  slug: string;
  label: string;
  blurb: string;
  category: TextFxCategory;
  tier: Plan;
  markup: TextFxMarkup;
};

export const TEXT_FX_CATEGORY_LABELS: Record<TextFxCategory, string> = {
  glow: 'Glow & Color',
  glitch: 'Glitch & Tech',
  motion: 'Motion & Kinetic',
  material: 'Material & Depth',
  liquid: 'Liquid & Blur',
  editorial: 'Editorial & Print',
};

export const TEXT_FX: readonly TextFxDef[] = [
  { id: 'fx-aurora', slug: 'aurora', label: "Borealis", blurb: "Aurora gradient drifting through the letters.", category: 'glow', tier: 'starter', markup: 'plain' },
  { id: 'fx-glitch', slug: 'glitch', label: "Glitchcore", blurb: "RGB channel-split glitch with sliced jumps.", category: 'glitch', tier: 'pro', markup: 'data-text' },
  { id: 'fx-typewriter', slug: 'typewriter', label: "Teletype", blurb: "Typewriter reveal with a blinking caret.", category: 'motion', tier: 'free', markup: 'plain' },
  { id: 'fx-neon', slug: 'neon', label: "Neon Haus", blurb: "Buzzing neon sign with unstable tube flicker.", category: 'glow', tier: 'pro', markup: 'plain' },
  { id: 'fx-liquid', slug: 'liquid', label: "Aqua Fill", blurb: "The word fills with liquid that rises and drains.", category: 'liquid', tier: 'pro', markup: 'plain' },
  { id: 'fx-chrome', slug: 'chrome', label: "Chromia", blurb: "Brushed-metal letters with a passing sheen.", category: 'material', tier: 'pro', markup: 'plain' },
  { id: 'fx-focus', slug: 'focus', label: "Lens Drift", blurb: "Letters slip in and out of focus, one after another.", category: 'liquid', tier: 'starter', markup: 'letters' },
  { id: 'fx-wave', slug: 'wave', label: "Tidal Type", blurb: "Letters ride a rolling sine wave.", category: 'motion', tier: 'starter', markup: 'letters' },
  { id: 'fx-sliced', slug: 'sliced', label: "Bisect", blurb: "The word is sliced horizontally; halves drift apart and re-align.", category: 'material', tier: 'starter', markup: 'data-text' },
  { id: 'fx-decoder', slug: 'decoder', label: "Cipher", blurb: "Scrambled characters decode into the word, then re-encrypt.", category: 'glitch', tier: 'pro', markup: 'data-text' },
  { id: 'fx-scanner', slug: 'scanner', label: "Redactor", blurb: "A scanning bar sweeps the word, lighting letters as it passes.", category: 'glitch', tier: 'pro', markup: 'plain' },
  { id: 'fx-ember', slug: 'ember', label: "Emberglow", blurb: "Letters smoulder under rising fire light.", category: 'glow', tier: 'pro', markup: 'plain' },
  { id: 'fx-echo', slug: 'echo', label: "Echo Verse", blurb: "Ghost copies of the word ripple outward.", category: 'material', tier: 'free', markup: 'data-text' },
  { id: 'fx-extrude', slug: 'extrude', label: "Deep Type", blurb: "Extruded 3D block letters rocking on their axis.", category: 'material', tier: 'starter', markup: 'plain' },
  { id: 'fx-contour', slug: 'contour', label: "Wireframe", blurb: "A dashed outline endlessly traces the letterforms.", category: 'editorial', tier: 'free', markup: 'plain' },
  { id: 'fx-spectrum', slug: 'spectrum', label: "Prisma", blurb: "Each letter refracts a different band of the spectrum.", category: 'glow', tier: 'starter', markup: 'letters' },
  { id: 'fx-jitter', slug: 'jitter', label: "Jitterbug", blurb: "Nervous analogue jitter: skews, jumps and dropped frames.", category: 'motion', tier: 'starter', markup: 'plain' },
  { id: 'fx-anaglyph', slug: 'anaglyph', label: "Anaglyph 3D", blurb: "Red/cyan stereo channels drift apart and snap back.", category: 'material', tier: 'starter', markup: 'plain' },
  { id: 'fx-flap', slug: 'flap', label: "Split Flap", blurb: "Airport departure board; letters flip on their plates.", category: 'motion', tier: 'pro', markup: 'letters' },
  { id: 'fx-crt', slug: 'crt', label: "Phosphor", blurb: "CRT terminal: green glow, rolling scanlines, tube flicker.", category: 'glitch', tier: 'pro', markup: 'plain' },
  { id: 'fx-pop', slug: 'pop', label: "Pop Riot", blurb: "Letters leap with a hard comic-book drop shadow.", category: 'motion', tier: 'starter', markup: 'letters' },
  { id: 'fx-spotlight', slug: 'spotlight', label: "Limelight", blurb: "A spotlight sweeps across otherwise unlit letters.", category: 'editorial', tier: 'free', markup: 'plain' },
  { id: 'fx-elastic', slug: 'elastic', label: "Rubber Band", blurb: "The word squashes and stretches like an elastic band.", category: 'motion', tier: 'starter', markup: 'plain' },
  { id: 'fx-mirror', slug: 'mirror', label: "Still Water", blurb: "Animated text treatment.", category: 'material', tier: 'free', markup: 'plain' },
  { id: 'fx-ransom', slug: 'ransom', label: "Ransom Note", blurb: "Mismatched cut-out letters shifting on the page.", category: 'editorial', tier: 'starter', markup: 'letters' },
  { id: 'fx-melt', slug: 'melt', label: "Meltdown", blurb: "Letters sag, stretch and drip before snapping back.", category: 'liquid', tier: 'starter', markup: 'letters' },
  { id: 'fx-heartbeat', slug: 'heartbeat', label: "Cardio", blurb: "A lub-dub heartbeat with a systolic glow.", category: 'motion', tier: 'starter', markup: 'plain' },
  { id: 'fx-marker', slug: 'marker', label: "Hi Liter", blurb: "A marker pen paints across the word, then lifts off.", category: 'editorial', tier: 'free', markup: 'plain' },
  { id: 'fx-sundial', slug: 'sundial', label: "Sundial", blurb: "A long cast shadow circles the letters like a passing sun.", category: 'editorial', tier: 'free', markup: 'plain' },
  { id: 'fx-negative', slug: 'negative', label: "Negativ", blurb: "Animated text treatment.", category: 'editorial', tier: 'free', markup: 'plain' },
  { id: 'fx-hologram', slug: 'hologram', label: "Holograph", blurb: "Translucent scanline projection with drifting chroma edges.", category: 'glow', tier: 'atelier', markup: 'data-text' },
  { id: 'fx-foil', slug: 'foil', label: "Gold Foil", blurb: "Embossed metallic letters with a diagonal specular sweep.", category: 'glow', tier: 'pro', markup: 'plain' },
  { id: 'fx-pixel', slug: 'pixel', label: "Pixel Sort", blurb: "Blocky offsets smear the word into stepped digital columns.", category: 'glitch', tier: 'pro', markup: 'data-text' },
  { id: 'fx-starlight', slug: 'starlight', label: "Starlight", blurb: "A constellation shimmer twinkles across frosted letter faces.", category: 'glow', tier: 'pro', markup: 'plain' },
  { id: 'fx-blueprint', slug: 'blueprint', label: "Blueprint", blurb: "Technical outline letters over a moving drafting grid.", category: 'glitch', tier: 'starter', markup: 'plain' },
  { id: 'fx-vapor', slug: 'vapor', label: "Vapor Trail", blurb: "Soft neon copies trail behind a drifting word.", category: 'liquid', tier: 'pro', markup: 'data-text' },
  { id: 'fx-kinetic', slug: 'kinetic', label: "Kinetic Type", blurb: "Characters slide on staggered rails and lock into place.", category: 'motion', tier: 'pro', markup: 'letters' },
  { id: 'fx-blackout', slug: 'blackout', label: "Blackout", blurb: "Redaction strips repeatedly hide and reveal classified text.", category: 'glitch', tier: 'pro', markup: 'data-text' },
  { id: 'fx-magnetic', slug: 'magnetic', label: "Magnetic", blurb: "Letters attract into a tight field, then repel outward.", category: 'motion', tier: 'pro', markup: 'letters' },
  { id: 'fx-mesh', slug: 'mesh', label: "Luma Mesh", blurb: "Animated mesh-gradient ink with a soft luminous edge.", category: 'glow', tier: 'pro', markup: 'plain' },
  { id: 'fx-iridescent', slug: 'iridescent', label: "Iridescent", blurb: "Pearlescent text whose colour shifts with a moving angle.", category: 'glow', tier: 'pro', markup: 'plain' },
  { id: 'fx-glass', slug: 'glass', label: "Glass Type", blurb: "Translucent frosted letters with an offset refraction layer.", category: 'material', tier: 'atelier', markup: 'data-text' },
  { id: 'fx-datastream', slug: 'datastream', label: "Datastream", blurb: "Matrix-like data bands flow through clipped letterforms.", category: 'glitch', tier: 'atelier', markup: 'plain' },
  { id: 'fx-orbit', slug: 'orbit', label: "Orbitals", blurb: "Letters circle tiny invisible tracks before settling back.", category: 'motion', tier: 'atelier', markup: 'letters' },
  { id: 'fx-prismcut', slug: 'prismcut', label: "Prism Cut", blurb: "Diagonal glass shards refract the word into colour offsets.", category: 'material', tier: 'atelier', markup: 'data-text' },
  { id: 'fx-softblur', slug: 'softblur', label: "Soft Blur", blurb: "A modern bloom effect that breathes between crisp and hazy.", category: 'liquid', tier: 'free', markup: 'plain' },
  { id: 'fx-laser', slug: 'laser', label: "Laser Cut", blurb: "A hot scanning blade carves a bright split through the word.", category: 'glow', tier: 'atelier', markup: 'data-text' },
  { id: 'fx-microchip', slug: 'microchip', label: "Microchip", blurb: "Circuit-board traces scroll beneath monospaced letter masks.", category: 'glitch', tier: 'atelier', markup: 'plain' },
  { id: 'fx-heatmap', slug: 'heatmap', label: "Heatmap", blurb: "Thermal colour blooms migrate across dense letter shapes.", category: 'glow', tier: 'pro', markup: 'plain' },
  { id: 'fx-parallax', slug: 'parallax', label: "Parallax", blurb: "Coloured shadow layers drift at different speeds per letter.", category: 'motion', tier: 'pro', markup: 'letters' },
  { id: 'fx-inktrap', slug: 'inktrap', label: "Ink Trap", blurb: "Editorial serif-like traps pulse as heavy ink floods corners.", category: 'editorial', tier: 'starter', markup: 'data-text' },
  { id: 'fx-topographic', slug: 'topographic', label: "Topographic", blurb: "Contour-map lines crawl through the text fill.", category: 'editorial', tier: 'starter', markup: 'plain' },
  { id: 'fx-signal', slug: 'signal', label: "Signal Noise", blurb: "Broadcast interference bends the word into noisy bands.", category: 'glitch', tier: 'pro', markup: 'data-text' },
  { id: 'fx-portal', slug: 'portal', label: "Portal", blurb: "A conic vortex opens inside the letters and rotates behind them.", category: 'material', tier: 'atelier', markup: 'data-text' },
  { id: 'fx-tiltshift', slug: 'tiltshift', label: "Tilt Shift", blurb: "A sharp focal strip travels through blurred duplicate text.", category: 'liquid', tier: 'starter', markup: 'data-text' },
  { id: 'fx-duotone', slug: 'duotone', label: "Duotone", blurb: "Two offset colour plates slide across a crisp centre layer.", category: 'editorial', tier: 'free', markup: 'data-text' },
  { id: 'fx-glyphrain', slug: 'glyphrain', label: "Glyph Rain", blurb: "Characters fall in staggered vertical trails and re-form.", category: 'glitch', tier: 'atelier', markup: 'letters' },
];

const BY_ID = new Map(TEXT_FX.map((fx) => [fx.id, fx]));

/** Look up a Colorion FX definition; undefined for the classic studio effects. */
export function getTextFx(effect: string | undefined): TextFxDef | undefined {
  return effect ? BY_ID.get(effect as TextEffect) : undefined;
}
