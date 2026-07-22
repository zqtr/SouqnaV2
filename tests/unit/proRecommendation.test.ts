import { describe, expect, it } from 'vitest';
import { recommendProFoundation } from '@/lib/pro/recommendation';
import type { ProBrandIntent } from '@/lib/proMode';

const context = {
  locale: 'en' as const,
  businessType: 'ecommerce' as const,
  design: 'atrium' as const,
  hasLogo: true,
  hasTagline: true,
  isPublished: true,
};

function intent(overrides: Partial<ProBrandIntent> = {}): ProBrandIntent {
  return {
    visualAmbition: 'timeless',
    customerFeeling: 'trust',
    launchPriority: 'conversion',
    note: null,
    ...overrides,
  };
}

describe('Pro foundation recommendation', () => {
  it('is deterministic for the same intent and storefront metadata', () => {
    const first = recommendProFoundation(intent(), context);
    const second = recommendProFoundation(intent(), context);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ foundation: 'structure', version: 1 });
  });

  it('maps expressive launches to Motion and one-of-one brand worlds to Bespoke', () => {
    expect(
      recommendProFoundation(
        intent({
          visualAmbition: 'expressive',
          customerFeeling: 'energy',
          launchPriority: 'launch',
        }),
        context,
      ).foundation,
    ).toBe('motion');
    expect(
      recommendProFoundation(
        intent({
          visualAmbition: 'one_of_one',
          customerFeeling: 'discovery',
          launchPriority: 'brand_world',
          note: 'اتجاه فريد يحافظ على روح العلامة',
        }),
        { ...context, locale: 'ar', businessType: 'art_gallery' },
      ),
    ).toMatchObject({ foundation: 'bespoke', version: 1 });
  });

  it('uses stable foundation order to break an exact tie', () => {
    const result = recommendProFoundation(
      intent({
        visualAmbition: 'timeless',
        customerFeeling: 'energy',
        launchPriority: 'brand_world',
      }),
      {
        ...context,
        businessType: 'something_else',
        hasLogo: true,
        hasTagline: true,
        isPublished: false,
      },
    );
    expect(result.foundation).toBe('structure');
  });
});
