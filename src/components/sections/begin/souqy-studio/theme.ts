/**
 * Souqy Studio agent-workspace theme. Every rule is scoped under
 * `.sqs-shell` (plus `body:has(.sqs-shell)` chrome hiding) so nothing
 * leaks into the marketing site or the admin dashboard, and none of the
 * global dashboard dither classes are reused here.
 *
 * Palette is intentionally restricted to black / charcoal / cream /
 * white. Type: Exo 2 for the Latin UI, Thmanyah for Arabic, JetBrains
 * Mono for command/status metadata.
 */
export const studioTheme = `
.sqs-shell * { box-sizing: border-box; }
body:has(.sqs-shell) nav:not(.sqs-shell nav),
body:has(.sqs-shell) footer,
body:has(.sqs-shell) [data-public-chrome],
body:has(.sqs-shell) > .fixed,
body:has(.sqs-shell) [data-homepage-blank] { display: none !important; }

.sqs-shell {
  --sqs-black: #030303;
  --sqs-coal: #131211;
  --sqs-coal-soft: #1c1a18;
  --sqs-cream: #f4ead6;
  --sqs-white: #ffffff;
  --sqs-ink: var(--sqs-cream);
  --sqs-muted: rgba(244, 234, 214, .6);
  --sqs-faint: rgba(244, 234, 214, .34);
  --sqs-line: rgba(244, 234, 214, .1);
  --sqs-line-strong: rgba(244, 234, 214, .22);
  --sqs-panel: rgba(19, 18, 17, .78);
  --sqs-panel-strong: rgba(28, 26, 24, .94);
  --sqs-panel-soft: rgba(244, 234, 214, .05);
  --sqs-font-ui: var(--font-exo-2), 'Exo 2', ui-sans-serif, system-ui, sans-serif;
  --sqs-font-display: var(--font-exo-2), 'Exo 2', ui-sans-serif, system-ui, sans-serif;
  --sqs-font-mono: var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace;
  --sqs-speed: 1;
  min-block-size: 100dvh;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 324px;
  background: var(--sqs-black);
  color: var(--sqs-ink);
  font-family: var(--sqs-font-ui);
  overflow: hidden;
  isolation: isolate;
}
.sqs-shell[dir='rtl'] {
  --sqs-font-ui: var(--font-thmanyah-sans), ui-sans-serif, system-ui, sans-serif;
  --sqs-font-display: var(--font-thmanyah-serif-display), ui-serif, Georgia, serif;
}
.sqs-shell button,
.sqs-shell input,
.sqs-shell select,
.sqs-shell textarea { font: inherit; color: inherit; }
.sqs-shell button { cursor: pointer; }
.sqs-shell button:disabled { cursor: not-allowed; opacity: .55; }
.sqs-shell :focus-visible {
  outline: 2px solid rgba(244, 234, 214, .65);
  outline-offset: 2px;
  border-radius: 6px;
}
.sqs-shell ::selection { background: rgba(244, 234, 214, .28); }

/* ------------------------------------------------------------------ */
/* Atmosphere: dither wave + pixel + scanline layers, Studio only      */
/* ------------------------------------------------------------------ */
.sqs-atmosphere {
  position: fixed;
  inset: 0;
  z-index: -2;
  overflow: hidden;
  background: linear-gradient(180deg, #000 0%, var(--sqs-black) 55%, #010101 100%);
}
.sqs-dither {
  position: absolute !important;
  inset: 0;
  mix-blend-mode: screen;
  pointer-events: none;
  filter: saturate(.7) contrast(1.05);
}
.sqs-dither canvas { inline-size: 100% !important; block-size: 100% !important; }
.sqs-selection-dither-layer {
  position: absolute !important;
  inset: 0;
  mix-blend-mode: screen;
  pointer-events: none;
  opacity: .75;
}
.sqs-selection-dither-layer canvas {
  inline-size: 100% !important;
  block-size: 100% !important;
}
.sqs-pixel-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .5;
  background-image:
    radial-gradient(rgba(244, 234, 214, .05) 1px, transparent 1px);
  background-size: 3px 3px;
  mix-blend-mode: overlay;
}
.sqs-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .35;
  background: repeating-linear-gradient(
    180deg,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, .28) 3px,
    transparent 4px
  );
}
.sqs-vignette {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, .035), transparent 34%),
    linear-gradient(180deg, rgba(0, 0, 0, .3), rgba(0, 0, 0, .74));
}

/* ------------------------------------------------------------------ */
/* Mode rail                                                           */
/* ------------------------------------------------------------------ */
.sqs-rail {
  position: relative;
  z-index: 14;
  block-size: calc(100dvh - 20px);
  margin: 10px 0 10px 10px;
  padding: 12px 8px;
  border: 1px solid var(--sqs-line);
  border-radius: 20px;
  background: rgba(0, 0, 0, .74);
  backdrop-filter: blur(24px) saturate(1.1);
  -webkit-backdrop-filter: blur(24px) saturate(1.1);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 16px;
  box-shadow: 0 22px 80px rgba(0, 0, 0, .4), inset 0 1px rgba(255, 255, 255, .04);
}
.sqs-shell[dir='rtl'] .sqs-rail { margin: 10px 10px 10px 0; }
.sqs-rail-brand {
  inline-size: 52px;
  block-size: 52px;
  margin-inline: auto;
  border: 1px solid var(--sqs-line-strong);
  border-radius: 15px;
  display: grid;
  place-items: center;
  background: linear-gradient(150deg, rgba(244, 234, 214, .12), rgba(244, 234, 214, .02));
  box-shadow: inset 0 1px rgba(255, 255, 255, .08);
}
.sqs-rail-modes {
  display: grid;
  align-content: start;
  gap: 6px;
}
.sqs-rail-btn {
  position: relative;
  min-block-size: 56px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--sqs-muted);
  display: grid;
  place-items: center;
  gap: 4px;
  padding: 8px 4px;
}
.sqs-rail-btn::before {
  content: '';
  position: absolute;
  inset-inline-start: -8px;
  inset-block-start: 50%;
  translate: 0 -50%;
  inline-size: 3px;
  block-size: 0;
  border-radius: 999px;
  background: var(--sqs-cream);
  opacity: 0;
}
.sqs-rail-btn:hover {
  border-color: var(--sqs-line);
  background: var(--sqs-panel-soft);
  color: var(--sqs-ink);
}
.sqs-rail-btn.is-active {
  border-color: var(--sqs-line-strong);
  background: linear-gradient(160deg, var(--sqs-cream), #e6dcc4);
  color: var(--sqs-black);
}
.sqs-rail-btn.is-active::before { block-size: 26px; opacity: 1; }
.sqs-rail-btn span {
  max-inline-size: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .02em;
  line-height: 1.1;
}
.sqs-rail-foot {
  display: grid;
  place-items: center;
  padding-block: 6px;
  color: var(--sqs-faint);
  font-family: var(--sqs-font-mono);
  font-size: 9px;
  letter-spacing: .14em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
}

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */
.sqs-stage {
  position: relative;
  z-index: 4;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  block-size: 100dvh;
  min-inline-size: 0;
  padding: 10px 12px;
  gap: 10px;
}
.sqs-stage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 16px;
  border: 1px solid var(--sqs-line);
  border-radius: 16px;
  background: var(--sqs-panel);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.sqs-stage-title { display: grid; gap: 1px; min-inline-size: 0; }
.sqs-stage-title small {
  font-family: var(--sqs-font-mono);
  font-size: 9px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--sqs-faint);
}
.sqs-stage-title h1 {
  margin: 0;
  font-family: var(--sqs-font-display);
  font-size: 17px;
  font-weight: 650;
  letter-spacing: .01em;
  line-height: 1.2;
  color: var(--sqs-white);
}
.sqs-stage-title p {
  margin: 0;
  font-size: 11.5px;
  color: var(--sqs-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-stage-tools { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.sqs-stage-status {
  display: flex;
  align-items: center;
  gap: 8px;
  max-inline-size: 340px;
  padding: 7px 12px;
  border: 1px solid var(--sqs-line);
  border-radius: 999px;
  background: rgba(0, 0, 0, .5);
  font-family: var(--sqs-font-mono);
  font-size: 10.5px;
  color: var(--sqs-muted);
}
.sqs-stage-status span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-status-dot {
  inline-size: 7px;
  block-size: 7px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--sqs-faint);
}
.sqs-stage-status.is-busy .sqs-status-dot { background: var(--sqs-cream); }
.sqs-stage-status.is-done .sqs-status-dot { background: var(--sqs-white); }
.sqs-stage-status.is-error { border-color: rgba(255, 255, 255, .3); color: var(--sqs-ink); }
.sqs-stage-status.is-error .sqs-status-dot { background: var(--sqs-white); }
.sqs-context-toggle {
  display: none;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--sqs-line);
  border-radius: 999px;
  background: transparent;
  color: var(--sqs-muted);
  font-size: 11.5px;
  font-weight: 650;
}
.sqs-context-toggle:hover { color: var(--sqs-ink); border-color: var(--sqs-line-strong); }
.sqs-stage-body {
  position: relative;
  min-block-size: 0;
  display: grid;
}

/* ------------------------------------------------------------------ */
/* Hero empty state                                                    */
/* ------------------------------------------------------------------ */
.sqs-hero {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  text-align: center;
  padding: 24px;
  pointer-events: none;
}
.sqs-hero small {
  font-family: var(--sqs-font-mono);
  font-size: 10px;
  letter-spacing: .3em;
  text-transform: uppercase;
  color: var(--sqs-faint);
}
.sqs-hero h2 {
  margin: 0;
  font-family: var(--sqs-font-display);
  font-size: clamp(26px, 4vw, 40px);
  font-weight: 600;
  color: var(--sqs-white);
}
.sqs-hero p { margin: 0; font-size: 13.5px; color: var(--sqs-muted); }
.sqs-hero.is-exiting { opacity: 0; visibility: hidden; }

/* ------------------------------------------------------------------ */
/* Agent thread                                                        */
/* ------------------------------------------------------------------ */
.sqs-thread {
  position: relative;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(244, 234, 214, .28) transparent;
  padding: 12px 4px;
}
.sqs-thread-stream {
  max-inline-size: 860px;
  margin-inline: auto;
  display: grid;
  gap: 16px;
  padding-block-end: 12px;
}
.sqs-msg {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.sqs-msg.is-user { flex-direction: row-reverse; }
.sqs-msg-avatar {
  inline-size: 30px;
  block-size: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--sqs-line);
  border-radius: 10px;
  background: var(--sqs-coal);
}
.sqs-msg-bubble {
  position: relative;
  overflow: hidden;
  max-inline-size: min(78%, 660px);
  padding: 12px 15px;
  border: 1px solid var(--sqs-line);
  border-radius: 16px;
  background: var(--sqs-panel);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.sqs-msg.is-user .sqs-msg-bubble {
  background: linear-gradient(165deg, rgba(244, 234, 214, .14), rgba(244, 234, 214, .05));
  border-color: var(--sqs-line-strong);
}
.sqs-msg.is-error .sqs-msg-bubble { border-color: rgba(255, 255, 255, .34); }
.sqs-msg-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-block-end: 5px;
}
.sqs-msg-meta strong {
  font-size: 11px;
  font-weight: 750;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--sqs-ink);
}
.sqs-msg-meta span {
  font-family: var(--sqs-font-mono);
  font-size: 9.5px;
  color: var(--sqs-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-msg-bubble > p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.62;
  color: var(--sqs-ink);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
/* streaming scanline on the working bubble */
.sqs-msg.is-creating .sqs-msg-bubble::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  block-size: 46px;
  inset-block-start: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(244, 234, 214, .07) 48%, transparent);
  opacity: 0;
}
.sqs-msg-progress {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-block-start: 10px;
  padding-block-start: 10px;
  border-block-start: 1px dashed var(--sqs-line);
  font-family: var(--sqs-font-mono);
  font-size: 10.5px;
  color: var(--sqs-muted);
}
.sqs-progress-percent { margin-inline-start: auto; color: var(--sqs-ink); }
.sqs-progress-track {
  position: absolute;
  inset-inline: 0;
  inset-block-end: -6px;
  block-size: 2px;
  border-radius: 999px;
  background: var(--sqs-line);
  overflow: hidden;
}
.sqs-progress-bar {
  display: block;
  block-size: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(244, 234, 214, .5), var(--sqs-white));
  transition: inline-size .5s ease;
}
.sqs-status-shimmer { font-family: var(--sqs-font-mono); font-size: 10.5px; }

/* Edit shelf */
.sqs-edit-shelf {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px 16px;
  border: 1px dashed var(--sqs-line-strong);
  border-radius: 16px;
  background: var(--sqs-panel-soft);
}
.sqs-edit-shelf > div:first-child { display: grid; gap: 2px; min-inline-size: 0; }
.sqs-edit-shelf small {
  font-family: var(--sqs-font-mono);
  font-size: 9px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--sqs-faint);
}
.sqs-edit-shelf strong { font-size: 13.5px; color: var(--sqs-white); }
.sqs-edit-shelf p { margin: 0; font-size: 11.5px; color: var(--sqs-muted); }
.sqs-edit-picks { display: flex; gap: 8px; flex-shrink: 0; }
.sqs-edit-picks button {
  inline-size: 46px;
  block-size: 46px;
  padding: 0;
  border: 1px solid var(--sqs-line);
  border-radius: 11px;
  overflow: hidden;
  background: var(--sqs-coal);
}
.sqs-edit-picks button:hover { border-color: var(--sqs-cream); }
.sqs-edit-picks img { inline-size: 100%; block-size: 100%; object-fit: cover; display: block; }

/* ------------------------------------------------------------------ */
/* Asset cards                                                         */
/* ------------------------------------------------------------------ */
.sqs-msg-assets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
  margin-block-start: 12px;
}
.sqs-asset-card {
  display: grid;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--sqs-line);
  border-radius: 14px;
  background: rgba(0, 0, 0, .42);
}
.sqs-asset-preview {
  display: block;
  overflow: hidden;
  border-radius: 9px;
  border: 1px solid var(--sqs-line);
  background:
    repeating-conic-gradient(rgba(244, 234, 214, .04) 0% 25%, transparent 0% 50%)
    0 0 / 14px 14px,
    var(--sqs-coal);
  aspect-ratio: var(--sqs-preview-aspect, 1 / 1);
  max-block-size: 300px;
}
.sqs-asset-preview img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
  display: block;
}
.sqs-asset-meta { display: grid; gap: 1px; padding-inline: 3px; min-inline-size: 0; }
.sqs-asset-meta strong {
  font-size: 12px;
  color: var(--sqs-white);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-asset-meta small {
  font-family: var(--sqs-font-mono);
  font-size: 9.5px;
  color: var(--sqs-faint);
}
.sqs-asset-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.sqs-asset-actions a,
.sqs-asset-actions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  border: 1px solid var(--sqs-line);
  border-radius: 8px;
  background: transparent;
  color: var(--sqs-muted);
  font-size: 10.5px;
  font-weight: 650;
  text-decoration: none;
}
.sqs-asset-actions a:hover,
.sqs-asset-actions button:hover {
  color: var(--sqs-black);
  background: var(--sqs-cream);
  border-color: var(--sqs-cream);
}

/* ------------------------------------------------------------------ */
/* Command deck                                                        */
/* ------------------------------------------------------------------ */
.sqs-deck {
  position: relative;
  z-index: 8;
  max-inline-size: 860px;
  inline-size: 100%;
  margin-inline: auto;
  display: grid;
  gap: 8px;
}
.sqs-deck-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-inline: 6px;
}
.sqs-deck-head div { display: flex; align-items: baseline; gap: 10px; min-inline-size: 0; }
.sqs-deck-head small {
  font-family: var(--sqs-font-mono);
  font-size: 9px;
  letter-spacing: .24em;
  text-transform: uppercase;
  color: var(--sqs-faint);
}
.sqs-deck-head strong {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--sqs-ink);
  white-space: nowrap;
}
.sqs-deck-head > small { flex-shrink: 0; }
.sqs-quick-prompts {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-inline: 2px;
}
.sqs-quick-prompts::-webkit-scrollbar { display: none; }
.sqs-quick-prompts button {
  flex-shrink: 0;
  max-inline-size: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 7px 12px;
  border: 1px solid var(--sqs-line);
  border-radius: 999px;
  background: rgba(0, 0, 0, .44);
  color: var(--sqs-muted);
  font-size: 11px;
}
.sqs-quick-prompts button:hover {
  color: var(--sqs-ink);
  border-color: var(--sqs-line-strong);
  background: var(--sqs-panel-soft);
}
.sqs-composer-frame {
  position: relative;
  border: 1px solid var(--sqs-line-strong);
  border-radius: 22px;
  background: var(--sqs-panel-strong);
  backdrop-filter: blur(26px) saturate(1.1);
  -webkit-backdrop-filter: blur(26px) saturate(1.1);
  box-shadow: 0 26px 90px rgba(0, 0, 0, .5), inset 0 1px rgba(255, 255, 255, .05);
  transition: border-color .22s ease, box-shadow .22s ease;
}
.sqs-composer-frame::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  border: 1px solid rgba(244, 234, 214, .4);
  opacity: 0;
  transition: opacity .25s ease;
}
.sqs-composer-frame:focus-within { border-color: rgba(244, 234, 214, .38); }
.sqs-composer-frame:focus-within::after { opacity: 1; }
.sqs-composer { background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 6px 8px; }
.sqs-composer textarea {
  background: transparent;
  border: 0;
  color: var(--sqs-ink);
  font-size: 13.5px;
}
.sqs-composer textarea::placeholder { color: var(--sqs-faint); }
.sqs-composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 4px 4px;
}
.sqs-composer-actions { display: flex; align-items: center; gap: 6px; }
.sqs-attach-btn {
  inline-size: 34px;
  block-size: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--sqs-line);
  border-radius: 10px;
  background: transparent;
  color: var(--sqs-muted);
}
.sqs-attach-btn:hover { color: var(--sqs-ink); border-color: var(--sqs-line-strong); }
.sqs-ref-count {
  font-family: var(--sqs-font-mono);
  font-size: 10px;
  color: var(--sqs-faint);
  padding-inline: 4px;
}
.sqs-selector { position: relative; }
.sqs-selector-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border: 1px solid var(--sqs-line);
  border-radius: 10px;
  background: transparent;
  color: var(--sqs-muted);
  font-size: 11.5px;
  font-weight: 650;
}
.sqs-selector-trigger:hover { color: var(--sqs-ink); border-color: var(--sqs-line-strong); }
.sqs-selector-menu {
  position: absolute;
  inset-block-end: calc(100% + 8px);
  inset-inline-start: 0;
  z-index: 30;
  min-inline-size: 236px;
  max-block-size: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: 6px;
  border: 1px solid var(--sqs-line-strong);
  border-radius: 14px;
  background: var(--sqs-panel-strong);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  box-shadow: 0 24px 70px rgba(0, 0, 0, .55);
  display: grid;
  gap: 2px;
}
.sqs-selector-title {
  padding: 6px 9px 4px;
  font-family: var(--sqs-font-mono);
  font-size: 9px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--sqs-faint);
}
.sqs-selector-menu button {
  display: flex;
  align-items: center;
  gap: 9px;
  inline-size: 100%;
  padding: 8px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--sqs-muted);
  font-size: 12px;
  text-align: start;
}
.sqs-selector-menu button:hover { background: var(--sqs-panel-soft); color: var(--sqs-ink); }
.sqs-selector-menu button.is-selected {
  background: linear-gradient(160deg, rgba(244, 234, 214, .16), rgba(244, 234, 214, .06));
  border-color: var(--sqs-line-strong);
  color: var(--sqs-white);
}
.sqs-selector-menu button small {
  margin-inline-start: auto;
  font-family: var(--sqs-font-mono);
  font-size: 9.5px;
  color: var(--sqs-faint);
}
.sqs-submit-metal button {
  inline-size: 38px;
  block-size: 38px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: var(--sqs-cream);
  color: var(--sqs-black);
}
.sqs-deck-status {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 12px 9px;
  border-block-start: 1px solid var(--sqs-line);
  font-family: var(--sqs-font-mono);
  font-size: 10.5px;
  color: var(--sqs-muted);
  overflow: hidden;
}
.sqs-deck-status span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sqs-deck-status .sqs-progress-percent { margin-inline-start: auto; flex-shrink: 0; }
.sqs-deck-status .sqs-progress-track { inset-block-end: 0; }

/* ------------------------------------------------------------------ */
/* Context inspector                                                   */
/* ------------------------------------------------------------------ */
.sqs-context {
  position: relative;
  z-index: 12;
  block-size: calc(100dvh - 20px);
  margin: 10px 10px 10px 0;
  border: 1px solid var(--sqs-line);
  border-radius: 20px;
  background: rgba(0, 0, 0, .72);
  backdrop-filter: blur(26px) saturate(1.1);
  -webkit-backdrop-filter: blur(26px) saturate(1.1);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(244, 234, 214, .28) transparent;
  padding: 16px 14px 20px;
  display: grid;
  align-content: start;
  gap: 14px;
}
.sqs-shell[dir='rtl'] .sqs-context { margin: 10px 0 10px 10px; }
.sqs-context-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-inline: 4px;
}
.sqs-context-head strong {
  font-size: 12px;
  font-weight: 750;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: var(--sqs-ink);
}
.sqs-context-close {
  display: none;
  border: 1px solid var(--sqs-line);
  border-radius: 8px;
  background: transparent;
  color: var(--sqs-muted);
  padding: 5px 9px;
  font-size: 11px;
}
.sqs-context-section {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--sqs-line);
  border-radius: 14px;
  background: var(--sqs-panel);
}
.sqs-context-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--sqs-font-mono);
  font-size: 9px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--sqs-faint);
}
.sqs-model-list { display: grid; gap: 5px; }
.sqs-model-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--sqs-muted);
  text-align: start;
}
.sqs-model-row:hover { background: var(--sqs-panel-soft); color: var(--sqs-ink); }
.sqs-model-row.is-active {
  border-color: var(--sqs-line-strong);
  background: linear-gradient(160deg, rgba(244, 234, 214, .15), rgba(244, 234, 214, .05));
  color: var(--sqs-white);
}
.sqs-model-copy { display: grid; gap: 1px; min-inline-size: 0; }
.sqs-model-copy strong { font-size: 12px; }
.sqs-model-copy small {
  font-family: var(--sqs-font-mono);
  font-size: 9px;
  color: var(--sqs-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-model-cost {
  margin-inline-start: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--sqs-font-mono);
  font-size: 10.5px;
  color: var(--sqs-ink);
}
.sqs-model-row.is-active .sqs-model-cost::before {
  content: '';
  inline-size: 6px;
  block-size: 6px;
  border-radius: 999px;
  background: var(--sqs-cream);
}
.sqs-format-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}
.sqs-format-chip {
  display: grid;
  justify-items: center;
  gap: 3px;
  padding: 8px 4px;
  border: 1px solid var(--sqs-line);
  border-radius: 10px;
  background: transparent;
  color: var(--sqs-muted);
}
.sqs-format-chip:hover { color: var(--sqs-ink); border-color: var(--sqs-line-strong); }
.sqs-format-chip.is-active {
  background: linear-gradient(160deg, var(--sqs-cream), #e6dcc4);
  border-color: var(--sqs-cream);
  color: var(--sqs-black);
}
.sqs-format-chip span {
  font-size: 9.5px;
  font-weight: 700;
  max-inline-size: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-format-chip small { font-family: var(--sqs-font-mono); font-size: 8px; opacity: .75; }
.sqs-field { display: grid; gap: 5px; }
.sqs-field > span {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--sqs-muted);
}
.sqs-field select,
.sqs-field textarea,
.sqs-field input[type='text'] {
  inline-size: 100%;
  padding: 8px 10px;
  border: 1px solid var(--sqs-line);
  border-radius: 9px;
  background: rgba(0, 0, 0, .5);
  color: var(--sqs-ink);
  font-size: 12px;
}
.sqs-field textarea { min-block-size: 62px; resize: vertical; }
.sqs-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 650;
  color: var(--sqs-muted);
}
.sqs-toggle-row input { accent-color: var(--sqs-cream); }
.sqs-slider { display: grid; gap: 5px; }
.sqs-slider input { inline-size: 100%; accent-color: var(--sqs-cream); }
.sqs-slider div {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--sqs-muted);
}
.sqs-slider small { font-family: var(--sqs-font-mono); color: var(--sqs-faint); }
.sqs-product-list { display: grid; gap: 5px; }
.sqs-product-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  border: 1px solid var(--sqs-line);
  border-radius: 10px;
  background: transparent;
  color: var(--sqs-muted);
  text-align: start;
}
.sqs-product-row:hover { color: var(--sqs-ink); border-color: var(--sqs-line-strong); }
.sqs-product-row.is-active {
  border-color: var(--sqs-cream);
  background: rgba(244, 234, 214, .1);
  color: var(--sqs-white);
}
.sqs-product-row i {
  inline-size: 30px;
  block-size: 30px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid var(--sqs-line);
  background-size: cover;
  background-position: center;
  background-color: var(--sqs-coal);
}
.sqs-product-row span {
  font-size: 11.5px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-product-row small {
  margin-inline-start: auto;
  flex-shrink: 0;
  font-family: var(--sqs-font-mono);
  font-size: 9.5px;
  color: var(--sqs-faint);
}
.sqs-ref-list { display: grid; gap: 6px; }
.sqs-ref-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px;
  border: 1px solid var(--sqs-line);
  border-radius: 10px;
  background: rgba(0, 0, 0, .4);
}
.sqs-ref-item img {
  inline-size: 36px;
  block-size: 36px;
  border-radius: 7px;
  object-fit: cover;
  border: 1px solid var(--sqs-line);
}
.sqs-ref-item span {
  flex: 1;
  min-inline-size: 0;
  font-size: 11px;
  color: var(--sqs-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-ref-item button {
  border: 1px solid var(--sqs-line);
  border-radius: 7px;
  background: transparent;
  color: var(--sqs-muted);
  inline-size: 26px;
  block-size: 26px;
  display: grid;
  place-items: center;
  font-size: 12px;
  line-height: 1;
}
.sqs-ref-item button:hover { color: var(--sqs-white); border-color: var(--sqs-line-strong); }
.sqs-ref-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 1px dashed var(--sqs-line-strong);
  border-radius: 10px;
  background: transparent;
  color: var(--sqs-muted);
  font-size: 11px;
  font-weight: 650;
}
.sqs-ref-add:hover { color: var(--sqs-ink); border-color: var(--sqs-cream); }
.sqs-selected-asset { display: grid; gap: 8px; }
.sqs-selected-asset .sqs-asset-preview { max-block-size: 220px; }
.sqs-context-empty {
  margin: 0;
  font-size: 11px;
  color: var(--sqs-faint);
}
.sqs-context-status {
  font-family: var(--sqs-font-mono);
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--sqs-muted);
  overflow-wrap: anywhere;
}
.sqs-context-backdrop { display: none; }

/* ------------------------------------------------------------------ */
/* Workspace panels (projects / history)                               */
/* ------------------------------------------------------------------ */
.sqs-panel {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(244, 234, 214, .28) transparent;
  padding: 4px 4px 16px;
  display: grid;
  align-content: start;
  gap: 12px;
}
.sqs-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.sqs-panel-head button,
.sqs-panel-head a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--sqs-line);
  border-radius: 999px;
  background: transparent;
  color: var(--sqs-muted);
  font-size: 11.5px;
  font-weight: 650;
  text-decoration: none;
}
.sqs-panel-head button:hover,
.sqs-panel-head a:hover { color: var(--sqs-ink); border-color: var(--sqs-line-strong); }
.sqs-project-start {
  display: flex;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--sqs-line);
  border-radius: 14px;
  background: var(--sqs-panel);
}
.sqs-project-start input {
  flex: 1;
  min-inline-size: 0;
  padding: 9px 12px;
  border: 1px solid var(--sqs-line);
  border-radius: 10px;
  background: rgba(0, 0, 0, .5);
  color: var(--sqs-ink);
  font-size: 12.5px;
}
.sqs-project-start input::placeholder { color: var(--sqs-faint); }
.sqs-project-start button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1px solid var(--sqs-cream);
  border-radius: 10px;
  background: var(--sqs-cream);
  color: var(--sqs-black);
  font-size: 12px;
  font-weight: 750;
}
.sqs-project-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 9px;
}
.sqs-project-card {
  display: flex;
  align-items: center;
  gap: 11px;
  inline-size: 100%;
  padding: 11px;
  border: 1px solid var(--sqs-line);
  border-radius: 14px;
  background: var(--sqs-panel);
  color: var(--sqs-ink);
  text-align: start;
}
.sqs-project-card:hover { border-color: var(--sqs-line-strong); background: var(--sqs-panel-soft); }
.sqs-project-card.is-active { border-color: var(--sqs-cream); }
.sqs-project-card i,
.sqs-project-card > span {
  inline-size: 44px;
  block-size: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 11px;
  border: 1px solid var(--sqs-line);
  background-color: var(--sqs-coal);
  background-size: cover;
  background-position: center;
  color: var(--sqs-muted);
}
.sqs-project-card div { display: grid; gap: 1px; min-inline-size: 0; }
.sqs-project-card strong {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sqs-project-card small {
  font-family: var(--sqs-font-mono);
  font-size: 9.5px;
  color: var(--sqs-faint);
}
.sqs-project-card em {
  margin-inline-start: auto;
  flex-shrink: 0;
  font-style: normal;
  font-family: var(--sqs-font-mono);
  font-size: 10px;
  color: var(--sqs-faint);
}
.sqs-history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 10px;
}
.sqs-empty {
  margin: 0;
  padding: 26px;
  border: 1px dashed var(--sqs-line);
  border-radius: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--sqs-faint);
}

/* ------------------------------------------------------------------ */
/* Web preview                                                         */
/* ------------------------------------------------------------------ */
.sqs-web {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 10px;
  min-block-size: 0;
}
.sqs-browser {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid var(--sqs-line-strong);
  border-radius: 18px;
  overflow: hidden;
  background: var(--sqs-coal);
  box-shadow: 0 30px 90px rgba(0, 0, 0, .5);
}
.sqs-browser-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 13px;
  border-block-end: 1px solid var(--sqs-line);
  background: rgba(0, 0, 0, .55);
}
.sqs-browser-bar span {
  inline-size: 9px;
  block-size: 9px;
  border-radius: 999px;
  background: rgba(244, 234, 214, .22);
}
.sqs-browser-bar strong {
  margin-inline: auto;
  padding: 3px 14px;
  border: 1px solid var(--sqs-line);
  border-radius: 999px;
  background: rgba(0, 0, 0, .5);
  font-family: var(--sqs-font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--sqs-muted);
}
.sqs-browser-actions { display: flex; gap: 6px; }
.sqs-browser-actions button,
.sqs-browser-actions a,
.sqs-browser-actions select {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid var(--sqs-line);
  border-radius: 8px;
  background: transparent;
  color: var(--sqs-muted);
  font-size: 10.5px;
  font-weight: 650;
  text-decoration: none;
}
.sqs-browser-actions button:hover,
.sqs-browser-actions a:hover { color: var(--sqs-ink); border-color: var(--sqs-line-strong); }
.sqs-web-frame {
  inline-size: 100%;
  block-size: 100%;
  border: 0;
  background: var(--sqs-white);
}
.sqs-web .sqs-deck { max-inline-size: none; }

/* ------------------------------------------------------------------ */
/* Animations (motion-safe only)                                       */
/* ------------------------------------------------------------------ */
@media (prefers-reduced-motion: no-preference) {
  .sqs-rail-btn {
    transition:
      background .2s ease,
      border-color .2s ease,
      color .2s ease,
      border-radius .28s cubic-bezier(.3, 1.4, .4, 1),
      transform .2s cubic-bezier(.2, .8, .2, 1);
  }
  .sqs-rail-btn:hover { transform: translateY(-1px); }
  .sqs-rail-btn.is-active { border-radius: 18px 10px 18px 10px; }
  .sqs-rail-btn::before {
    transition: block-size .3s cubic-bezier(.3, 1.4, .4, 1), opacity .2s ease;
  }
  .sqs-hero { transition: opacity .45s ease, visibility .45s ease; }
  .sqs-hero h2 { animation: sqs-materialize .7s cubic-bezier(.2, .8, .2, 1) both; }
  .sqs-hero p { animation: sqs-materialize .7s .08s cubic-bezier(.2, .8, .2, 1) both; }
  .sqs-msg { animation: sqs-materialize .5s cubic-bezier(.2, .8, .2, 1) both; }
  .sqs-msg.is-creating .sqs-msg-bubble::after {
    opacity: 1;
    animation: sqs-scanline 2.4s linear infinite;
  }
  .sqs-status-dot { transition: background .3s ease; }
  .sqs-stage-status.is-busy .sqs-status-dot,
  .sqs-deck-status.is-generating .sqs-status-dot {
    animation: sqs-pulse 1.5s ease-in-out infinite;
  }
  .sqs-model-row.is-active .sqs-model-cost::before {
    animation: sqs-pulse 2.2s ease-in-out infinite;
  }
  .sqs-msg-assets .sqs-asset-card { animation: sqs-asset-reveal .6s cubic-bezier(.2, .8, .2, 1) both; }
  .sqs-msg-assets .sqs-asset-card:nth-child(2) { animation-delay: .09s; }
  .sqs-msg-assets .sqs-asset-card:nth-child(3) { animation-delay: .18s; }
  .sqs-msg-assets .sqs-asset-card:nth-child(4) { animation-delay: .27s; }
  .sqs-history-grid .sqs-asset-card { animation: sqs-asset-reveal .5s cubic-bezier(.2, .8, .2, 1) both; }
  .sqs-composer-frame:focus-within {
    animation: sqs-wake .55s cubic-bezier(.2, .8, .2, 1);
    box-shadow:
      0 26px 90px rgba(0, 0, 0, .5),
      0 0 0 4px rgba(244, 234, 214, .06),
      inset 0 1px rgba(255, 255, 255, .06);
  }
  .sqs-web-frame { animation: sqs-crossfade .6s ease both; }
  .sqs-selector-menu { animation: sqs-menu-in .22s cubic-bezier(.2, .8, .2, 1) both; }
  .sqs-shell.is-generating .sqs-thread::before {
    content: '';
    position: absolute;
    inset-inline: 0;
    block-size: 1px;
    z-index: 2;
    pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(244, 234, 214, .35), transparent);
    animation: sqs-thread-scan 3.2s ease-in-out infinite;
  }
}
@keyframes sqs-materialize {
  from { opacity: 0; translate: 0 10px; filter: blur(5px); }
  to { opacity: 1; translate: 0 0; filter: blur(0); }
}
@keyframes sqs-asset-reveal {
  0% { opacity: 0; scale: .94; filter: contrast(1.6) brightness(1.4) blur(6px); }
  60% { filter: contrast(1.15) brightness(1.08) blur(1px); }
  100% { opacity: 1; scale: 1; filter: contrast(1) brightness(1) blur(0); }
}
@keyframes sqs-scanline {
  from { transform: translateY(-52px); }
  to { transform: translateY(220px); }
}
@keyframes sqs-thread-scan {
  0% { inset-block-start: 4%; opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { inset-block-start: 92%; opacity: 0; }
}
@keyframes sqs-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(244, 234, 214, .4); opacity: 1; }
  55% { box-shadow: 0 0 0 5px rgba(244, 234, 214, 0); opacity: .68; }
}
@keyframes sqs-wake {
  0% { box-shadow: 0 26px 90px rgba(0, 0, 0, .5), 0 0 0 0 rgba(244, 234, 214, .22); }
  100% {
    box-shadow:
      0 26px 90px rgba(0, 0, 0, .5),
      0 0 0 4px rgba(244, 234, 214, .06);
  }
}
@keyframes sqs-crossfade {
  from { opacity: 0; filter: saturate(.4) brightness(.7); }
  to { opacity: 1; filter: saturate(1) brightness(1); }
}
@keyframes sqs-menu-in {
  from { opacity: 0; translate: 0 6px; scale: .98; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .sqs-shell *,
  .sqs-shell *::before,
  .sqs-shell *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
  .sqs-dither { display: none; }
  .sqs-hero { transition: none; }
}

/* ------------------------------------------------------------------ */
/* Responsive                                                          */
/* ------------------------------------------------------------------ */
@media (max-width: 1240px) {
  .sqs-shell { grid-template-columns: 76px minmax(0, 1fr); }
  .sqs-context-toggle { display: inline-flex; }
  .sqs-context {
    position: fixed;
    z-index: 60;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: min(354px, calc(100vw - 56px));
    block-size: 100dvh;
    margin: 0;
    border-radius: 0;
    border-block: 0;
    border-inline-end: 0;
    translate: 100% 0;
    transition: translate .3s cubic-bezier(.2, .8, .2, 1);
  }
  .sqs-shell[dir='rtl'] .sqs-context { translate: -100% 0; }
  .sqs-shell.is-context-open .sqs-context { translate: 0 0; }
  .sqs-context-close { display: inline-flex; }
  .sqs-context-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 55;
    border: 0;
    background: rgba(0, 0, 0, .55);
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s ease;
  }
  .sqs-shell.is-context-open .sqs-context-backdrop { opacity: 1; pointer-events: auto; }
  @media (prefers-reduced-motion: reduce) {
    .sqs-context { transition: none; }
  }
}
@media (max-width: 760px) {
  .sqs-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    block-size: 100dvh;
  }
  .sqs-rail {
    block-size: auto;
    margin: 8px 8px 0;
    padding: 8px;
    grid-template-rows: none;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }
  .sqs-shell[dir='rtl'] .sqs-rail { margin: 8px 8px 0; }
  .sqs-rail-brand { inline-size: 40px; block-size: 40px; margin-inline: 0; border-radius: 11px; }
  .sqs-rail-modes {
    grid-auto-flow: column;
    grid-auto-columns: minmax(52px, 1fr);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .sqs-rail-modes::-webkit-scrollbar { display: none; }
  .sqs-rail-btn { min-block-size: 46px; padding: 5px 2px; }
  .sqs-rail-btn::before {
    inset-inline-start: 50%;
    inset-block-start: auto;
    inset-block-end: -6px;
    translate: -50% 0;
    inline-size: 0;
    block-size: 3px;
  }
  .sqs-rail-btn.is-active::before { inline-size: 22px; block-size: 3px; }
  .sqs-rail-foot { display: none; }
  .sqs-stage { block-size: auto; min-block-size: 0; padding: 8px; gap: 8px; }
  .sqs-stage-head { flex-wrap: wrap; padding: 10px 12px; }
  .sqs-stage-status { max-inline-size: 100%; }
  .sqs-msg-bubble { max-inline-size: 88%; }
  .sqs-msg-assets { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .sqs-edit-shelf { flex-direction: column; align-items: stretch; }
  .sqs-history-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .sqs-project-list { grid-template-columns: minmax(0, 1fr); }
  .sqs-deck-head strong { white-space: normal; }
  .sqs-browser-bar strong { display: none; }
  .sqs-context { inline-size: min(340px, calc(100vw - 34px)); }
|}

/* ------------------------------------------------------------------ */
/* Dither/Halftone System — IDE state extensions (loading, selection, transition) */
/* These compose with DitherHalftoneSystem and .sqs-atmosphere          */
/* ------------------------------------------------------------------ */
.sqs-dither-loading {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(3, 3, 3, 0.72);
  backdrop-filter: blur(2px);
  pointer-events: none;
}
.sqs-dither-loading .sqs-progress {
  font-family: var(--sqs-font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--sqs-faint);
  text-transform: uppercase;
}

.sqs-selection-dither {
  position: relative;
  isolation: isolate;
  transition: border-color 120ms ease, box-shadow 180ms ease;
}
.sqs-selection-dither::after {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: 1px solid rgba(244, 234, 214, 0.0);
  pointer-events: none;
  transition: border-color 180ms ease;
}
.sqs-selection-dither.is-selected::after {
  border-color: rgba(244, 234, 214, 0.55);
  box-shadow: 0 0 0 1px rgba(244, 234, 214, 0.12) inset;
}

.sqs-component-dither {
  position: relative;
  background: var(--sqs-coal-soft);
  border: 1px solid var(--sqs-line);
  border-radius: 12px;
  overflow: hidden;
}
.sqs-component-dither .dither-layer {
  mix-blend-mode: screen;
  opacity: 0.14;
}

.sqs-transition-veil {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(3,3,3,0.6) 0%,
    rgba(3,3,3,0.15) 35%,
    rgba(3,3,3,0.15) 65%,
    rgba(3,3,3,0.6) 100%
  );
  opacity: 0;
  transition: opacity 280ms cubic-bezier(0.23, 1, 0.32, 1);
}
.sqs-transition-veil.is-active {
  opacity: 1;
}

/* Reduced motion: flatten all dither layers */
@media (prefers-reduced-motion: reduce) {
  .sqs-dither,
  .sqs-atmosphere > canvas,
  .sqs-dither-loading,
  .sqs-selection-dither::after {
    animation: none !important;
    transition: none !important;
    filter: saturate(0.6) contrast(0.95);
    opacity: 0.6;
  }
}
`;
