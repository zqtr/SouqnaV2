# Souqna documentation (repository)

**Audience:** contributors · **Arabic:** [README.ar.md](README.ar.md)

This folder holds contributor-facing documentation for the Souqna codebase. For developer conventions (stack, DO / DON'T), see the repo root [README.md](../README.md) and [AGENTS.md](../AGENTS.md).

End-user help also ships **inside the product** at `/en/docs` and `/ar/docs` (see `src/app/[locale]/docs/`). The bilingual **marketing landing** (apex) is `src/app/[locale]/page.tsx` composed in `src/components/souqna/SouqnaHomeExperience.tsx`. Keep marketplace facts aligned with [`src/lib/apps/registry.ts`](../src/lib/apps/registry.ts); when you change an app there, audit the in-app docs copy.

Docs, policies, journal pages, and repository Markdown should follow the renewed Souqna homepage system:

- Black `#0A0A0A`, charcoal `#2A2A2A`, cream `#E8DCC4`, quiet border `#D1C7B2`, pale text `#F7F7F3`, and white `#FFFFFF`.
- Exo 2 for English, Thmanyah Serif Display Bold for Arabic headlines, Thmanyah Sans / Thmanyah Serif Text for Arabic body, and JetBrains Mono for labels.
- Subtle grid surfaces, halftone texture only where it is intentionally part of the section, monochrome SVG integration logos, 8px content cards, pill controls, and no negative letter spacing.
- Avoid orange, purple, neon gradients, and generic blue SaaS color. Souqna should feel grayscale, cream, local, and operational.
- Current public plan prices: Free, Pro `QR 49/mo`, Pro+ `QR 145/mo`, Max+ `QR 235/mo`.

## Merchants

Short pointer only — detailed merchant prose lives in-app: [merchants/README.md](merchants/README.md).
