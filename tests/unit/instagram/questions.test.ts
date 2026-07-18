import { describe, expect, it } from 'vitest';
import { applyAnswerPatch, buildReviewQuestions, computeGaps } from '@/lib/instagram/questions';
import type { DraftProduct } from '@/lib/instagram/types';

function makeDraft(overrides: Partial<DraftProduct>): DraftProduct {
  const base: Omit<DraftProduct, 'gaps'> = {
    postId: 'p1',
    isProduct: true,
    confidence: 0.9,
    titleEn: 'Classic Abaya',
    titleAr: 'عباية كلاسيكية',
    description: 'Crepe abaya.',
    priceQar: 250,
    dmForPrice: false,
    category: 'Abayas',
    sizeOptions: [],
    variantOptions: [],
    imageUrl: 'https://blob.example/p1.jpg',
    sourceUrl: 'https://www.instagram.com/p/SC1/',
    ...overrides,
  };
  return { ...base, gaps: computeGaps(base), ...('gaps' in overrides ? { gaps: overrides.gaps! } : {}) };
}

describe('buildReviewQuestions', () => {
  it('asks nothing about complete products or confidently skipped posts', () => {
    expect(buildReviewQuestions([makeDraft({})])).toEqual([]);
    expect(
      buildReviewQuestions([makeDraft({ isProduct: false, priceQar: null, titleEn: null })]),
    ).toEqual([]);
  });

  it('asks about an uncertain "not a product" instead of silently dropping it', () => {
    const questions = buildReviewQuestions([makeDraft({ isProduct: false, confidence: 0.4 })]);
    expect(questions.map((q) => q.kind)).toEqual(['is_product']);
  });

  it('orders questions is_product → price → title → category per product', () => {
    const draft = makeDraft({
      confidence: 0.4,
      priceQar: null,
      titleEn: null,
      titleAr: null,
      category: null,
    });
    const kinds = buildReviewQuestions([draft]).map((q) => q.kind);
    // 4 gaps but MAX_PER_PRODUCT caps at 3, dropping the lowest-value kind
    expect(kinds).toEqual(['is_product', 'price', 'title']);
  });

  it('flags DM-priced products on the price question', () => {
    const [question] = buildReviewQuestions([makeDraft({ priceQar: null, dmForPrice: true })]);
    expect(question).toMatchObject({ kind: 'price', dmForPrice: true, allowFreeText: true });
  });

  it('caps the total at 15, preferring higher-value kinds across products', () => {
    const drafts = Array.from({ length: 12 }, (_, i) =>
      makeDraft({ postId: `p${i}`, priceQar: null, category: null }),
    );
    const questions = buildReviewQuestions(drafts);
    expect(questions).toHaveLength(15);
    expect(questions.filter((q) => q.kind === 'price')).toHaveLength(12);
    expect(questions.filter((q) => q.kind === 'category')).toHaveLength(3);
  });

  it('keeps question ids stable per post+kind', () => {
    const [question] = buildReviewQuestions([makeDraft({ priceQar: null })]);
    expect(question?.id).toBe('p1:price');
  });
});

describe('applyAnswerPatch', () => {
  it('applies a price answer and clears the gap', () => {
    const draft = makeDraft({ priceQar: null });
    expect(draft.gaps).toContain('price');
    const next = applyAnswerPatch(draft, { priceQar: 300 });
    expect(next.priceQar).toBe(300);
    expect(next.gaps).not.toContain('price');
  });

  it('pins confidence when the merchant settles is-this-a-product', () => {
    const draft = makeDraft({ confidence: 0.3 });
    const kept = applyAnswerPatch(draft, { isProduct: true });
    expect(kept.confidence).toBe(1);
    expect(kept.gaps).not.toContain('is_product');
    const skipped = applyAnswerPatch(draft, { isProduct: false });
    expect(skipped.isProduct).toBe(false);
    expect(skipped.gaps).toEqual([]);
  });

  it('sanitizes free-text values', () => {
    const next = applyAnswerPatch(makeDraft({}), {
      titleEn: '  ' + 'y'.repeat(300),
      category: '  Bags  ',
      priceQar: -5,
    });
    expect(next.titleEn).toHaveLength(120);
    expect(next.category).toBe('Bags');
    expect(next.priceQar).toBe(0.01);
  });
});
