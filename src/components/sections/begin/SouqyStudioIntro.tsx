/**
 * Souqy Studio entry point. The Studio was redesigned into a
 * Cursor/Codex-style agent workspace; the implementation now lives in
 * colocated pieces under `./souqy-studio/` with `StudioShell` as the
 * orchestrator. This module keeps the historical import path used by
 * `/begin/souqy` and `/[locale]/begin/souqy`.
 */
export { StudioShell as SouqyStudioIntro } from './souqy-studio/StudioShell';
