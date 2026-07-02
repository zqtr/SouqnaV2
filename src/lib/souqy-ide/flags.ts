/**
 * Souqy IDE feature flags (Master Plan Phase 0).
 *
 * Master switch: `NEXT_PUBLIC_SOUQY_IDE_ENABLED=1` in `.env.local`.
 * Per-slice overrides for local testing: set
 * `localStorage['souqy-ide-flags'] = 'dither-v1,code-v1'` (comma-separated),
 * or `'*'` to enable everything. localStorage can only *add* slices on top of
 * an enabled master switch — it cannot enable the IDE in production builds
 * where the env flag is off... except in development, where localStorage
 * alone works so designers can flip slices without restarting the server.
 *
 * Safe to import from both server and client components; on the server the
 * localStorage override is simply ignored.
 */

export const SOUQY_IDE_SLICES = ['dither-v1', 'code-v1', 'proposals-v1', 'export-v1'] as const;

export type SouqyIdeSlice = (typeof SOUQY_IDE_SLICES)[number];

const STORAGE_KEY = 'souqy-ide-flags';

export function isSouqyIdeEnabled(): boolean {
  if (envFlagEnabled()) return true;
  if (process.env.NODE_ENV !== 'production') return readLocalSlices() !== null;
  return false;
}

export function isSouqyIdeSliceEnabled(slice: SouqyIdeSlice): boolean {
  if (!isSouqyIdeEnabled()) return false;
  const local = readLocalSlices();
  if (local !== null) return local === '*' || local.includes(slice);
  return envFlagEnabled();
}

function envFlagEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_SOUQY_IDE_ENABLED;
  return value === '1' || value === 'true';
}

function readLocalSlices(): SouqyIdeSlice[] | '*' | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw.trim() === '*') return '*';
    const slices = raw
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is SouqyIdeSlice =>
        SOUQY_IDE_SLICES.includes(item as SouqyIdeSlice),
      );
    return slices.length ? slices : null;
  } catch {
    return null;
  }
}
