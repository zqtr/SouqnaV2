import type { DraftGap, DraftProduct } from './types';

/**
 * Deterministic review-question queue for the import chat. Pure and
 * client-safe on purpose: when the AI gateway is unconfigured the chat
 * still walks the merchant through every gap using only this module plus
 * the regex price parser. Question *text* is localized in the component
 * copy — this module only decides what to ask, about which post, in
 * which order.
 */

export type ReviewQuestionKind = 'is_product' | 'price' | 'title' | 'category';

export type ReviewQuestion = {
  /** Stable id: `${postId}:${kind}` — doubles as the chat message key. */
  id: string;
  postId: string;
  kind: ReviewQuestionKind;
  /** Price questions acknowledge a "DM for price" caption. */
  dmForPrice: boolean;
  allowFreeText: boolean;
};

const LOW_CONFIDENCE = 0.6;
const MAX_PER_PRODUCT = 3;
const MAX_TOTAL = 15;

/** Recomputed after every model pass and every merchant answer — the
 *  model's own gap output is never trusted. */
export function computeGaps(draft: Omit<DraftProduct, 'gaps'>): DraftGap[] {
  if (!draft.isProduct) {
    // An uncertain "not a product" gets asked rather than silently
    // dropped — losing real merchandise is worse than one extra
    // question. A confident exclusion stays silent.
    return draft.confidence < LOW_CONFIDENCE ? ['is_product'] : [];
  }
  const gaps: DraftGap[] = [];
  if (draft.confidence < LOW_CONFIDENCE) gaps.push('is_product');
  if (draft.priceQar === null) gaps.push('price');
  if (draft.titleEn === null && draft.titleAr === null) gaps.push('title');
  if (draft.category === null) gaps.push('category');
  return gaps;
}

const KIND_ORDER: ReviewQuestionKind[] = ['is_product', 'price', 'title', 'category'];

export function buildReviewQuestions(drafts: DraftProduct[]): ReviewQuestion[] {
  const perDraft: ReviewQuestion[][] = drafts
    .filter((draft) => draft.isProduct || draft.gaps.includes('is_product'))
    .map((draft) => {
      const questions: ReviewQuestion[] = [];
      for (const kind of KIND_ORDER) {
        if (!draft.gaps.includes(kind)) continue;
        if (questions.length >= MAX_PER_PRODUCT) break;
        questions.push({
          id: `${draft.postId}:${kind}`,
          postId: draft.postId,
          kind,
          dmForPrice: kind === 'price' && draft.dmForPrice,
          allowFreeText: kind !== 'is_product',
        });
      }
      return questions;
    });

  const all = perDraft.flat();
  if (all.length <= MAX_TOTAL) return all;
  // Over budget: keep the highest-value kinds across all products, in
  // feed order within each kind, until the cap.
  const kept: ReviewQuestion[] = [];
  for (const kind of KIND_ORDER) {
    for (const question of all) {
      if (question.kind !== kind) continue;
      if (kept.length >= MAX_TOTAL) break;
      kept.push(question);
    }
  }
  // Preserve feed-then-kind order for a natural conversation flow.
  const keptIds = new Set(kept.map((q) => q.id));
  return all.filter((q) => keptIds.has(q.id));
}

function clampText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Merge a merchant answer (chip tap, free text parse, or inline edit)
 * into a draft, sanitizing values and recomputing gaps. Declaring a post
 * "not a product" is final: confidence pins to 1 so it never re-asks.
 */
export function applyAnswerPatch(draft: DraftProduct, patch: Partial<DraftProduct>): DraftProduct {
  const next: Omit<DraftProduct, 'gaps'> = {
    ...draft,
    ...patch,
    titleEn: 'titleEn' in patch ? clampText(patch.titleEn, 120) : draft.titleEn,
    titleAr: 'titleAr' in patch ? clampText(patch.titleAr, 120) : draft.titleAr,
    description: 'description' in patch ? clampText(patch.description, 1000) : draft.description,
    category: 'category' in patch ? clampText(patch.category, 60) : draft.category,
    priceQar:
      'priceQar' in patch
        ? patch.priceQar !== null && patch.priceQar !== undefined
          ? Math.min(Math.max(patch.priceQar, 0.01), 1_000_000)
          : null
        : draft.priceQar,
  };
  if ('isProduct' in patch) next.confidence = 1;
  return { ...next, gaps: computeGaps(next) };
}
