# Souqna Homepage Redesign — Anti-AI-Slop + Distinctive Motion Plan

> **Status:** Plan mode only. No code changes. For subagent-driven execution later.

**Goal:** Evolve the souqna.qa marketing homepage from "high-quality but partially templated" to unmistakably Souqna — a calm, premium, culturally rooted GCC commerce surface with signature motion and interaction that cannot be mistaken for generic AI tooling marketing.

**Current State Assessment (based on code review):**

**Strengths (non-slop):**
- Custom `HalftoneWave` (Three.js FBM noise, dual light/dark layers, cursor interaction capable, Perlin-based) — already highly distinctive.
- Strong design system ( `#0A0A0A / #2A2A2A / #E8DCC4 / #D1C7B2` + Exo 2 + Thmanyah).
- Bilingual-first copy and RTL awareness.
- `MetalFrame` primitive and `RotatingText`.
- Monochrome integration marquee.

**AI Slop Risks Identified:**
- Onboarding section uses static GIF cards (`/videos/onboarding/*.gif`) — feels like placeholder content.
- `sq-pillars` and `sq-process-grid` are classic vertical/horizontal card grids (very common in 2025–2026 AI landing pages).
- AI studio value is **described** ("Drop one image and one sentence") rather than **demonstrated live**.
- Integration marquee is a standard infinite loop (no variation in speed, direction, or interaction).
- Limited scroll-synced or physics-based micro-interactions beyond the hero.
- Sections share similar `sq-section-head` + grid patterns → visual repetition.
- Transformation story (messy input → beautiful bilingual storefront) is told, not shown.

**X Research Findings (unique homepage animations/effects, June 2025+):**
- **Granola AI hero** (highly praised): Shows the *transformation* in real time (messy notes → polished output) rather than just the final beautiful state. Strong lesson for AI products.
- **Apple Mexico Día de los Muertos**: Culturally resonant seasonal animation performs extremely well and feels premium.
- Responsive smooth interactions (Restate.dev) praised for technical + aesthetic quality.
- Warning: Long animation delays (800ms+) feel broken.
- Framer templates popular, but custom Three.js + SVG work (like our halftone) stands out more.

**Proposed Redesign Direction:**
Make the homepage feel like a **living Qatar/GCC surface** — quiet, trustworthy, bilingual, with motion that feels hand-crafted rather than generated. Prioritize "show the magic" over "tell the features."

---

## Phase 1: Hero Evolution (Most Impact)

### Task 1.1: Cursor-reactive + transformation-aware halftone

**Objective:** Turn the already-strong hero into an interactive demonstration of the product.

**Changes:**
- Enable `cursorInteraction` on `HalftoneWave`.
- Add a subtle live text transformation layer: when user types in a small input or hovers certain words, the halftone field "responds" with localized noise bursts while sample Arabic/English copy appears in the cream overlay.
- Add a small floating "Live preview" badge that hints at the AI studio.

**Files to modify:**
- `src/components/souqna/SouqnaHomeExperience.tsx` (hero section)
- `src/components/halftone-wave.tsx` (ensure cursorInteraction is fully wired)

### Task 1.2: Hero copy refinement — show transformation

Replace static hero body with a short, animated sequence that demonstrates the core promise:
- Start: "A workplace for home businesses"
- On scroll or interaction: text evolves into bilingual storefront copy example.

---

## Phase 2: Replace Onboarding GIFs with Living Intake Simulator

**Objective:** Kill the static GIF feeling.

**Idea:** Build a small interactive 3-step simulator in the `#work` section that lets visitors actually experience the "three small questions" flow with live bilingual output preview.

**Files:**
- New component: `src/components/souqna-motion/OnboardingSimulator.tsx`
- Replace the current `OnboardingVideoCard` grid.

**Motion:**
- Step transitions use a custom curved path (inspired by `CurvedLoopBlock`).
- Output panel shows real-time Arabic + English text generation with subtle typewriter + Thmanyah font weight shift.

---

## Phase 3: Distinctive Process & Atelier Sections

### Task 3.1: Living Process Flow (instead of static 4-column grid)

**Objective:** Replace `sq-process-grid` with a scroll-synced narrative.

**Concept:**
- A horizontal or vertical "river" of four phases.
- As user scrolls, an SVG path animates (using Framer Motion or Three.js), and each phase lights up with a culturally inspired micro-interaction (e.g., oud scent line, fabric texture, coffee steam — abstract and monochrome).
- Use the existing `PremiumSurfaces` or new layered cream surfaces.

### Task 3.2: Atelier Live Mini-Demo

**Objective:** The strongest anti-slop move — let visitors actually use a constrained version of the AI studio on the homepage.

**Implementation:**
- A contained prompt area: upload one image (or use preset) + one sentence.
- On submit (client-side or lightweight server action), stream a realistic bilingual output preview (product page, caption, reply) using the existing model catalog logic if possible, or mocked high-fidelity output.
- This directly addresses the "show transformation" insight from Granola.

**Risk / Constraint:** Must stay lightweight and not trigger full Souqy generation cost on marketing page.

---

## Phase 4: Motion & Interaction Language

### Unique effects to add (inspired by X research + Souqna identity):

1. **Bilingual Marquee Evolution**
   - Different scroll speeds for Arabic vs English rows.
   - On hover, individual pills "lift" with a subtle 3D metal-frame effect.
   - Occasional direction reversal on one row for organic feel.

2. **Thmanyah Serif Kinetic Typography**
   - Key Arabic headlines get micro weight/kerning animation on scroll into view (respecting `prefers-reduced-motion`).

3. **Culturally resonant micro-details**
   - Very subtle geometric patterns (inspired by Qatar/Muslim geometric art) that appear in negative space or as scroll progress indicators — kept extremely quiet.
   - Cream-to-charcoal "heat" transitions on interactive elements.

4. **Scroll-synced surface depth**
   - Use the existing `MetalFrame` and `PremiumSurfaces` more aggressively with parallax or layered depth on scroll.

---

## Phase 5: Measurement & QA

- Lighthouse + Core Web Vitals on mobile + desktop (especially Arabic).
- Test with real GCC founders (slow connection, RTL).
- Verify no motion causes discomfort (reduced-motion respect is already in AGENTS.md).
- Compare before/after "distinctiveness" — the goal is that a screenshot of the new homepage should be instantly recognizable as Souqna, not "another AI commerce tool."

---

## Open Questions for Refinement

- How interactive should the homepage Atelier demo be? (fully functional vs high-fidelity mock)
- Budget for new Three.js / Framer Motion work vs leveraging existing `HalftoneWave` + `CurvedLoop` primitives.
- Should we add a "founder stories" or real-time stats ticker in the journal section?
- Preferred primary CTA evolution?

---

**This plan turns the homepage from "very good AI marketing site" into "the calm, premium GCC commerce surface" it claims to be.**

Ready for discussion or a narrower plan focused on one phase first.