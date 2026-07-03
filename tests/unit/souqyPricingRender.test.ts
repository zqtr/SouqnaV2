import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('@/app/actions/souqy-subscription', () => ({
  startSouqyCheckout: vi.fn(async () => ({ status: 'error', message: 'x' })),
}));

import { SouqyPricing } from '@/components/sections/souqy-pricing/SouqyPricing';

describe('SouqyPricing (public) SSR', () => {
  it('renders the three tiers with USD prices and QAR charge note', () => {
    const html = renderToString(createElement(SouqyPricing, { locale: 'en' }));
    expect(html).toContain('Souqy is its own plan now.');
    expect(html).toContain('$50');
    expect(html).toContain('$125');
    expect(html).toContain('150 generations');
    expect(html).toContain('500 generations');
    // QAR charge derived from the peg, not hardcoded
    expect(html).toContain('182 QAR');
    expect(html).toContain('455 QAR');
  });

  it('renders the Arabic RTL variant', () => {
    const html = renderToString(createElement(SouqyPricing, { locale: 'ar' }));
    expect(html).toContain('dir="rtl"');
  });
});
