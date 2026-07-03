/**
 * Souqy subscription tiers — a product axis separate from the storefront
 * commerce plans in `src/lib/plans.ts`.
 *
 * Prices are authored in USD (the number the user sees) but SkipCash can
 * only charge in QAR, so every charge converts at the fixed peg. Volume
 * is a per-tier monthly generation allotment (1 credit = 1 generation),
 * enforced by `reserveSouqyGeneration` in `./credits`.
 */

export type SouqyTier = 'free' | 'souqy' | 'team';
export const SOUQY_TIERS: readonly SouqyTier[] = ['free', 'souqy', 'team'] as const;

/** QAR is pegged to USD at 3.64. Charges are computed from USD via this. */
export const USD_TO_QAR = 3.64;

export type SouqyTierConfig = {
  id: SouqyTier;
  rank: number;
  label: string;
  labelAr: string;
  blurb: string;
  blurbAr: string;
  priceUsd: number;
  /** Souqy generations included per month. */
  monthlyGenerations: number;
  /** Team seats included (1 = solo). */
  seats: number;
  team: boolean;
};

export const SOUQY_TIER_CONFIG: Record<SouqyTier, SouqyTierConfig> = {
  free: {
    id: 'free',
    rank: 0,
    label: 'Free',
    labelAr: 'مجاني',
    blurb: 'Try Souqy — 5 generations every month.',
    blurbAr: 'جرّب سوقي — ٥ توليدات كل شهر.',
    priceUsd: 0,
    monthlyGenerations: 5,
    seats: 1,
    team: false,
  },
  souqy: {
    id: 'souqy',
    rank: 1,
    label: 'Souqy',
    labelAr: 'سوقي',
    blurb: 'For active builders — 150 generations every month.',
    blurbAr: 'للمنشئين النشطين — ١٥٠ توليدة كل شهر.',
    priceUsd: 50,
    monthlyGenerations: 150,
    seats: 1,
    team: false,
  },
  team: {
    id: 'team',
    rank: 2,
    label: 'Team',
    labelAr: 'فريق',
    blurb: 'For agencies — 500 generations and team seats.',
    blurbAr: 'للوكالات — ٥٠٠ توليدة ومقاعد للفريق.',
    priceUsd: 125,
    monthlyGenerations: 500,
    seats: 5,
    team: true,
  },
};

export const SOUQY_PAID_TIERS: readonly SouqyTier[] = ['souqy', 'team'] as const;

export function isSouqyTier(value: unknown): value is SouqyTier {
  return value === 'free' || value === 'souqy' || value === 'team';
}

export function souqyTierConfig(tier: SouqyTier): SouqyTierConfig {
  return SOUQY_TIER_CONFIG[tier];
}

/** Monthly generation allowance for a tier. */
export function souqyMonthlyCap(tier: SouqyTier): number {
  return SOUQY_TIER_CONFIG[tier].monthlyGenerations;
}

/** Whole-QAR amount SkipCash charges for a tier (0 for Free). */
export function souqyPriceQar(tier: SouqyTier): number {
  return Math.round(SOUQY_TIER_CONFIG[tier].priceUsd * USD_TO_QAR);
}

export function souqyTierLabel(tier: SouqyTier, locale?: string): string {
  const config = SOUQY_TIER_CONFIG[tier];
  return locale === 'ar' ? config.labelAr : config.label;
}

/** Higher of two tiers by rank — used to grandfather storefront-plan access. */
export function higherSouqyTier(a: SouqyTier, b: SouqyTier): SouqyTier {
  return SOUQY_TIER_CONFIG[a].rank >= SOUQY_TIER_CONFIG[b].rank ? a : b;
}
