# design-sync notes — souqna

Repo-specific facts a future sync needs. First sync: 2026-07-02, project "Souqna Design System" (`e159e787-2e64-4fb4-9029-c3d6624aba66`).

## Shape / build

- This is a Next.js **app**, not a packaged DS. No dist. The bundle entry is a **generated barrel** `.design-sync/ds-entry.tsx` (explicit named re-exports from every `src/components/ui/*.tsx` + `SouqyLogo` + `DitherWave`). Regenerate it when ui/ modules are added/removed — the generator recipe: scan `src/components/ui/*.tsx` for value exports, dedupe (first wins), emit explicit `export { … } from '@/components/ui/<file>'` lines; primary export per file (PascalCase of filename) also goes into `componentSrcMap`.
- `componentSrcMap` is a **full enumeration** (40 entries) because synth/dist discovery has no `.d.ts` tree here — pins suppress src-derivation, so the map must name every card component. Keep it in step with the barrel.
- CSS comes from compiling the app's real `src/app/globals.css` (Tailwind v4, CSS-config) via `buildCmd` → `.design-sync/.cache/ds-tailwind.css`. Repo pins tailwindcss 4.0.7; the staged CLI compiled with 4.3.2 — no visible drift in renders, but check here first if utilities go missing.
- Fonts: next/font injects `--font-*` vars at runtime, so `.design-sync/fonts.css` declares @font-face for Exo 2 / JetBrains Mono / Thmanyah (from `src/assets/fonts/`) AND binds the `--font-exo-2` etc. vars. Wired via `extraFonts`.
- Deps were already installed (npm, package-lock.json); `npm ci` skipped on first sync because the user's dev server was running from node_modules. Note: node_modules showed `.pnpm/` paths in old error stacks — history of mixed package managers; the tree works, don't "fix" it casually.
- Playwright: cache had chromium-1228 → playwright **1.61.0** (verified via browsers.json). Installed into `.ds-sync/`.

## Known render warns (triaged legitimate)

- `[TOKENS_MISSING]` ~38 vars: Tailwind-v4 derived pairs (`--font-sans--font-feature-settings`…) plus app-runtime layout vars (`--primary-nav-height`, `--x-mob`, `--menu-margin-bottom`…) set by JS/layout at runtime. Renders confirmed styled — not a tokens gap.
- Floor-card `[RENDER_BLANK]/[RENDER_THIN]` on empty-children components (Button, Badge, Input, InputGroup, Textarea, Avatar, Progress, AspectRatio, Spinner) — replaced by authored previews in the core-25 scope.

## Preview idioms that worked (solo round)

- Import from `'souqna'`; inline styles for layout glue; realistic Qatar-commerce content.
- Portal/overlay components: render the TRUE open state and frame with `cfg.overrides.<Name> = {cardMode:'single', viewport}` — do NOT hack `position:static` onto DialogContent (clips the panel and strands the overlay).
- Card overrides set: Dialog/Sheet/DropdownMenu/Select/Tooltip (single + viewport), Table/PromptInput/Sidebar (column).

## Component/API quirks (from preview waves, 2026-07-02)

- **TextShimmer upstream footgun**: it spreads `{...props}` AFTER its own `style` (which carries the shimmer `backgroundImage`), so any external `style` prop wipes the gradient and the label renders invisible. Set font-size on a wrapper, never `style` on TextShimmer. Candidate upstream fix: merge styles.
- **Loader `classic` variant** captures blank in static frames (spokes start at inline `opacity:0`, keyframes-only reveal) — avoid in screenshots/docs; use `pulse-dot`.
- Dark cells in previews: `data-theme="dark"` on a wrapper remaps ALL tokens (globals.css binds to `[data-theme='dark']`, not `.dark`).
- `Field` error state needs BOTH `data-invalid` on `<Field>` (label tint) and `aria-invalid` on the control (destructive border).
- RadioGroup disabled items don't fade their sibling Labels — fade manually.
- Screenshot/review sheets group by source dir: SouqyLogo is `admin__SouqyLogo.png` (component dir `components/admin/SouqyLogo/`), not `general__`.
- WebGL (DitherWave three.js, SouqyLogo portal canvas) paints fine in headless capture — no waits needed.
- Config `cardMode single/viewport` override edits AFTER a full build trip `[CONFIG_STALE]` on targeted preview-rebuilds — run `package-build.mjs` once to re-stamp before scoped rebuilds.
- Inline `var(--destructive)` / `var(--muted-foreground)` resolve in previews; pravatar remote images load in capture.
- **`asChild` + `Button` breaks Radix poppers on React 18**: the ui kit is the React-19-style shadcn flavor (plain function components, no forwardRef), so `<DropdownMenuTrigger asChild><Button/>` / `<TooltipTrigger asChild><Button/>` can't attach the anchor ref → popper positions at negative Y (offscreen). In previews (and any React-18 consumer) use the trigger element directly with utility classes instead of `asChild`. This likely affects the app too wherever `asChild` wraps these function components.

## Re-sync risks

- The barrel + componentSrcMap enumeration go stale when components are added/renamed in `src/components/ui/` — regenerate both (recipe above) before rebuilding.
- Tailwind CLI version skew (repo 4.0.7 vs staged latest) could change emitted utilities.
- `.design-sync/.cache/ds-tailwind.css` is gitignored machine state — a fresh clone must run `buildCmd` before `package-build.mjs`.
- Authored previews reference current component APIs (e.g. `showCloseButton` on DialogContent); an API change breaks the preview compile → floor card until the .tsx is updated.
- App build gotcha (unrelated to sync): `npm run build` fails at scripts/migrate.mjs (@next/env resolution); use `npx next build`.
