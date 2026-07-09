#!/usr/bin/env python3
"""Generate src/components/storefront/blocks/text-fx.css and
src/lib/blocks/textFx.ts from the vendored colorion effect data
(scripts/text-fx-source.json - snapshot of text-effects.colorion.co
effect-data.json + per-effect stage markup, MIT licensed).

Usage: python3 scripts/generate-text-fx.py (from anywhere)."""
import json, re, collections

ROOT = '/Users/abm/Desktop/SouqnaV2'
import os
fxd = json.load(open(os.path.join(os.path.dirname(__file__), 'text-fx-source.json')))
effects = fxd['effects']; snippets = fxd['snippets']

TIER = {}
for s in ['typewriter','marker','softblur','echo','contour','negative','sundial','mirror','duotone','spotlight']: TIER[s]='free'
for s in ['aurora','wave','elastic','heartbeat','jitter','pop','extrude','anaglyph','sliced','ransom','melt','spectrum','focus','tiltshift','inktrap','blueprint','topographic']: TIER[s]='starter'
for s in ['neon','ember','liquid','chrome','glitch','crt','decoder','scanner','foil','starlight','iridescent','mesh','vapor','pixel','kinetic','magnetic','flap','parallax','blackout','heatmap','signal']: TIER[s]='pro'
for s in ['hologram','glass','laser','prismcut','portal','datastream','microchip','orbit','glyphrain']: TIER[s]='atelier'

CAT = {}
for s in ['aurora','neon','ember','starlight','foil','iridescent','mesh','spectrum','hologram','laser','heatmap']: CAT[s]='glow'
for s in ['glitch','crt','pixel','decoder','scanner','datastream','signal','microchip','blueprint','blackout','glyphrain']: CAT[s]='glitch'
for s in ['typewriter','wave','elastic','jitter','heartbeat','kinetic','magnetic','flap','orbit','parallax','pop']: CAT[s]='motion'
for s in ['chrome','extrude','anaglyph','glass','prismcut','portal','sliced','echo','mirror']: CAT[s]='material'
for s in ['liquid','melt','vapor','softblur','tiltshift','focus']: CAT[s]='liquid'
for s in ['marker','ransom','negative','spotlight','sundial','duotone','inktrap','contour','topographic']: CAT[s]='editorial'

# Effects whose upstream CSS hardcodes the demo word / word length were
# rewritten to be text-agnostic; keep their overrides in sync with the
# markup recipes below.
MARKUP_OVERRIDES = {'decoder': 'data-text'}
BLURB_OVERRIDES = {'typewriter': 'Typewriter reveal with a blinking caret.'}

CSS_OVERRIDES = {
    # Upstream hardcodes `width: 10ch` for the demo word. The renderer
    # stamps `--fx-chars` (character count) on every FX root; 1.24ch per
    # char covers proportional fonts, and animating max-width over a
    # fit-content width keeps the caret flush with the revealed text.
    'typewriter': '''.fx-typewriter {
  letter-spacing: 0;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  display: inline-block;
  width: fit-content;
  max-width: calc(var(--fx-chars, 10) * 1.24ch);
  border-right: .55ch solid var(--ink-2);
  animation: fx-type 3.6s steps(var(--fx-chars, 10)) infinite,
             fx-caret .65s steps(1) infinite;
}
@keyframes fx-type {
  0%, 8%    { max-width: 0; }
  55%, 100% { max-width: calc(var(--fx-chars, 10) * 1.24ch); }
}
@keyframes fx-caret {
  50% { border-color: transparent; }
}''',
    # Upstream scrambles between hardcoded "DECODER" frames. The base
    # text sizes the box invisibly; ::after overlays neutral cipher
    # noise and settles on attr(data-text) — the merchant's own copy.
    # The resting `content` is also attr(data-text) so browsers that
    # can't animate `content` still show real text, never stuck noise.
    'decoder': '''.fx-decoder {
  letter-spacing: .08em;
  color: transparent;
  position: relative;
}
.fx-decoder::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  color: var(--ink);
  animation: fx-decoder 4s steps(1) infinite;
}
@keyframes fx-decoder {
  0%   { content: "#K1%R&Q0X"; color: var(--ink-3); }
  8%   { content: "X7#Q$1&%K"; color: var(--ink-3); }
  16%  { content: "K3#D9%O$4"; color: var(--ink-3); }
  24%  { content: "8$#Q0&X1%"; color: var(--ink-3); }
  32%  { content: "%4K#7$Q&D"; color: var(--ink-3); }
  40%, 82% { content: attr(data-text); color: var(--ink); }
  88%  { content: "D3#0*&R$7"; color: var(--ink-3); }
  94%  { content: "%#C0D1Q&K"; color: var(--ink-3); }
}'''
}

slugs = [e['slug'] for e in effects]
assert set(TIER) == set(slugs) and set(CAT) == set(slugs)

def markup_kind(e):
    if e['slug'] in MARKUP_OVERRIDES: return MARKUP_OVERRIDES[e['slug']]
    if 'data-text' in e['stage']: return 'data-text'
    if '<b' in e['stage']: return 'letters'
    return 'plain'

def blurb(slug):
    if slug in BLURB_OVERRIDES: return BLURB_OVERRIDES[slug]
    m = re.search(r'/\*\s*\d+\s+[^—]+—\s*(.*?)\s*\*/', snippets[slug])
    b = m.group(1) if m else ''
    return (b[:1].upper() + b[1:]).rstrip('.') + '.' if b else 'Animated text treatment.'

# ————— CSS —————
clip_classes, parts = [], []
for e in effects:
    slug = e['slug']; css = snippets[slug]
    c = re.sub(r'<!--.*?-->\s*', '', css, flags=re.S)
    c = re.sub(r'/\*\s*Colour tokens.*?\*/\s*', '', c, flags=re.S)
    c = re.sub(r':root\s*\{[^}]*\}\s*', '', c)
    if slug in ('inktrap', 'portal'):
        c = re.sub(r'\bpulse\b', f'souqna-pulse-{slug}', c)
    c = re.sub(r'^\s*font:[^;]*;\s*$\n?', '', c, flags=re.M)
    c = re.sub(r'^\s*font-family:[^;]*;\s*$\n?', '', c, flags=re.M)
    if slug in CSS_OVERRIDES:
        # keep the upstream header comment, swap the body
        head = re.match(r'\s*(/\*.*?\*/)', c, re.S)
        c = (head.group(1) + '\n' if head else '') + CSS_OVERRIDES[slug]
    # Speed control: every time value inside animation declarations is
    # divided by --fx-speed (1 = designed pace, 2 = twice as fast,
    # 0.5 = half speed). Durations AND delays scale together so
    # per-letter staggers keep their rhythm at any speed. Times already
    # inside calc() simply nest another calc, which is valid CSS.
    def _scale_times(decl: 're.Match[str]') -> str:
        # The optional sign is captured INTO the calc: `* -.14s` must
        # become `* calc(-.14s / …)` — a prefixed `-calc()` is invalid.
        return re.sub(
            r'(?<![\w.])(-?\d*\.?\d+m?s)\b',
            r'calc(\1 / var(--fx-speed, 1))',
            decl.group(0),
        )
    c = re.sub(
        r'(?:animation|animation-delay|animation-duration)\s*:[^;]*;',
        _scale_times,
        c,
        flags=re.S,
    )
    if 'background-clip' in c or 'text-fill-color' in c:
        clip_classes.append('.fx-' + slug)
    parts.append(c.strip())

header = '''/*
 * GENERATED — Colorion text FX stylesheet. 57 pure-CSS text effects
 * adapted from https://text-effects.colorion.co (MIT licensed).
 * Generated from the upstream effect-data.json with these transforms:
 *   - `font` / `font-family` declarations stripped so effects inherit
 *     the block's own typography instead of the demo's JetBrains Mono;
 *   - upstream `:root` colour tokens replaced by the `.souqna-tfx`
 *     mapping below, locking every effect to the merchant palette;
 *   - the duplicate `pulse` keyframes (inktrap / portal) namespaced;
 *   - `typewriter` and `decoder` rewritten to be text-agnostic (the
 *     upstream versions hardcode the demo word / its character count).
 * Metadata (labels, tiers, categories, markup recipes) lives in
 * `src/lib/blocks/textFx.ts`. Regenerate rather than hand-edit.
 */

/* Palette lock — upstream tokens mapped onto the storefront palette.
 * `--ink` prefers the palette ink over currentColor: several clip-based
 * effects (chrome, foil, …) set `color: transparent` on themselves, so
 * riding currentColor would dissolve their own gradients. The accents
 * derive from --sf-accent so effects re-skin per merchant, with the
 * upstream neon pair as fallback for surfaces that never set --sf-*. */
.souqna-tfx {
  --ink: var(--sf-ink, currentColor);
  /* Founder overrides (style.fxColor / fxColor2 → BlockFrame vars) win
   * over the palette accent; --ink-3 defaults to an accent/ink blend
   * when no explicit second colour is chosen. */
  --ink-2: var(--fx-accent, var(--sf-accent, #FF4FD8));
  --ink-3: var(--fx-accent-2, color-mix(in srgb, var(--fx-accent, var(--sf-accent, #4FF8FF)) 45%, var(--sf-ink, #4FF8FF)));
  /* Shrink-to-fit like the upstream demos: headings are block-level in
   * the storefront, and background-driven effects (marker, spotlight,
   * blueprint, …) would otherwise paint the full row instead of the
   * text. Effects that need another display declare their own. */
  display: inline-block;
  max-width: 100%;
}
'''

fallback = '''

/* Legibility floor — browsers without gradient-clipped text get solid
 * ink instead of transparent glyphs (same rule as SHINE_STYLES in
 * TextEffectRenderer). */
@supports not ((-webkit-background-clip: text) or (background-clip: text)) {
  ''' + ',\n  '.join(clip_classes) + ''' {
    background: none !important;
    -webkit-text-fill-color: currentColor !important;
    color: var(--sf-ink, #1f1b16) !important;
  }
}
'''
css_out = header + '\n' + '\n\n'.join(parts) + fallback
open(ROOT + '/src/components/storefront/blocks/text-fx.css', 'w').write(css_out)

# ————— textFx.ts —————
rows = []
for e in effects:
    slug = e['slug']
    rows.append("  { id: 'fx-%s', slug: '%s', label: %s, blurb: %s, category: '%s', tier: '%s', markup: '%s' }," % (
        slug, slug, json.dumps(e['name'].replace('-', ' ')), json.dumps(blurb(slug)),
        CAT[slug], TIER[slug], markup_kind(e)))

ts = '''/**
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
''' + '\n'.join(rows) + '''
];

const BY_ID = new Map(TEXT_FX.map((fx) => [fx.id, fx]));

/** Look up a Colorion FX definition; undefined for the classic studio effects. */
export function getTextFx(effect: string | undefined): TextFxDef | undefined {
  return effect ? BY_ID.get(effect as TextEffect) : undefined;
}
'''
open(ROOT + '/src/lib/blocks/textFx.ts', 'w').write(ts)
print('css bytes:', len(css_out), '| clip-based:', len(clip_classes),
      '| tiers:', dict(collections.Counter(TIER.values())))
