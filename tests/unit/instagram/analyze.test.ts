import { describe, expect, it } from 'vitest';
import {
  normalizeDrafts,
  normalizeSuggestions,
  parseAnalysisResponse,
  type AnalyzePost,
  type RawAnalysis,
} from '@/lib/instagram/analyze';

const posts: AnalyzePost[] = [
  {
    id: 'p1',
    shortcode: 'SC1',
    imageUrl: 'https://blob.example/p1.jpg',
    caption: 'Classic abaya — 250 QR',
  },
  {
    id: 'p2',
    shortcode: 'SC2',
    imageUrl: 'https://blob.example/p2.jpg',
    caption: 'New drop، السعر ٣٥٠ ر.ق',
  },
];

function draft(overrides: Partial<RawAnalysis['drafts'][number]>): RawAnalysis['drafts'][number] {
  return {
    postId: 'p1',
    isProduct: true,
    confidence: 0.9,
    titleEn: 'Classic Abaya',
    titleAr: 'عباية كلاسيكية',
    description: 'Hand-finished crepe abaya.',
    priceQar: 250,
    dmForPrice: false,
    category: 'Abayas',
    sizeOptions: ['S', 'M', 'L'],
    variantOptions: [],
    ...overrides,
  };
}

describe('parseAnalysisResponse', () => {
  const body = JSON.stringify({ drafts: [draft({})] });

  it('parses bare JSON, fenced JSON, and JSON with prose around it', () => {
    expect(parseAnalysisResponse(body).drafts).toHaveLength(1);
    expect(parseAnalysisResponse('```json\n' + body + '\n```').drafts).toHaveLength(1);
    expect(parseAnalysisResponse('Here you go:\n' + body).drafts).toHaveLength(1);
  });

  it('throws on garbage so the repair retry can fire', () => {
    expect(() => parseAnalysisResponse('sorry, I cannot')).toThrow();
  });

  it('rescues malformed fields via catch defaults instead of rejecting the batch', () => {
    const sloppy = JSON.stringify({
      drafts: [{ postId: 'p1', confidence: 7, priceQar: 'call me', sizeOptions: 'S,M' }],
    });
    const parsed = parseAnalysisResponse(sloppy);
    expect(parsed.drafts[0]).toMatchObject({
      isProduct: true,
      confidence: 0.5,
      priceQar: null,
      sizeOptions: [],
    });
  });
});

describe('normalizeDrafts', () => {
  it('attaches image/source URLs and recomputes gaps deterministically', () => {
    const [p1] = normalizeDrafts({ drafts: [draft({})] }, posts.slice(0, 1));
    expect(p1).toMatchObject({
      postId: 'p1',
      imageUrl: 'https://blob.example/p1.jpg',
      sourceUrl: 'https://www.instagram.com/p/SC1/',
      gaps: [],
    });
  });

  it('backfills a caption price the model missed', () => {
    const [p1] = normalizeDrafts(
      { drafts: [draft({ priceQar: null })] },
      posts.slice(0, 1),
    );
    expect(p1?.priceQar).toBe(250);
    expect(p1?.gaps).not.toContain('price');
  });

  it('backfills Arabic-Indic caption prices', () => {
    const [p2] = normalizeDrafts(
      { drafts: [draft({ postId: 'p2', priceQar: null })] },
      posts.slice(1),
    );
    expect(p2?.priceQar).toBe(350);
  });

  it('rejects out-of-range model prices but keeps the caption backfill', () => {
    const [p1] = normalizeDrafts(
      { drafts: [draft({ priceQar: 99_000_000 })] },
      posts.slice(0, 1),
    );
    expect(p1?.priceQar).toBe(250);
  });

  it('turns posts the model skipped into low-confidence drafts with gaps', () => {
    const drafts = normalizeDrafts({ drafts: [] }, posts.slice(0, 1));
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ isProduct: true, confidence: 0.4 });
    expect(drafts[0]?.gaps).toContain('is_product');
    expect(drafts[0]?.gaps).toContain('title');
    // caption price still backfills even without a model draft
    expect(drafts[0]?.priceQar).toBe(250);
  });

  it('clamps text lengths and dedupes options', () => {
    const [p1] = normalizeDrafts(
      {
        drafts: [
          draft({
            titleEn: 'x'.repeat(400),
            sizeOptions: ['S', 's', ' M ', ...Array.from({ length: 20 }, (_, i) => `opt${i}`)],
          }),
        ],
      },
      posts.slice(0, 1),
    );
    expect(p1?.titleEn).toHaveLength(120);
    expect(p1?.sizeOptions.slice(0, 2)).toEqual(['S', 'M']);
    expect(p1?.sizeOptions.length).toBeLessThanOrEqual(12);
  });

  it('marks gaps on a bare product draft', () => {
    const [p1] = normalizeDrafts(
      {
        drafts: [
          draft({
            confidence: 0.3,
            titleEn: null,
            titleAr: null,
            priceQar: null,
            category: null,
          }),
        ],
      },
      // caption without a price so nothing backfills
      [{ ...posts[0]!, caption: 'so proud of this one' }],
    );
    expect(p1?.gaps).toEqual(['is_product', 'price', 'title', 'category']);
  });
});

describe('normalizeSuggestions', () => {
  it('validates enums against the real lists', () => {
    expect(
      normalizeSuggestions({
        businessType: 'clothing_store',
        templateId: 'vitrine',
        brandNote: 'Minimal modest fashion.',
      }),
    ).toEqual({
      businessType: 'clothing_store',
      templateId: 'vitrine',
      brandNote: 'Minimal modest fashion.',
    });
  });

  it('nulls out invented enum values', () => {
    const result = normalizeSuggestions({
      businessType: 'dropshipping_empire',
      templateId: 'shopify-clone',
      brandNote: null,
    });
    expect(result).toEqual({ businessType: null, templateId: null, brandNote: null });
  });

  it('passes through absent suggestions', () => {
    expect(normalizeSuggestions(null)).toBeNull();
    expect(normalizeSuggestions(undefined)).toBeNull();
  });
});
