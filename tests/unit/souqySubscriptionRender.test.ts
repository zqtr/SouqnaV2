import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('@/app/actions/souqy-subscription', () => ({
  startSouqyCheckout: vi.fn(async () => ({ status: 'error', message: 'x' })),
}));

import { SouqySubscription } from '@/components/billing/SouqySubscription';

describe('SouqySubscription SSR', () => {
  it('renders the three tiers and usage without crashing', () => {
    const html = renderToString(
      createElement(SouqySubscription, {
        locale: 'en',
        tier: 'free',
        usedThisMonth: 2,
        cap: 5,
        remaining: 3,
        grandfathered: false,
      }),
    );
    expect(html).toContain('Free');
    expect(html).toContain('Souqy');
    expect(html).toContain('Team');
    // USD price displayed, generations listed
    expect(html).toContain('$50');
    expect(html).toContain('150 generations');
  });

  it('renders the Arabic RTL variant for a paid tier', () => {
    const html = renderToString(
      createElement(SouqySubscription, {
        locale: 'ar',
        tier: 'souqy',
        usedThisMonth: 120,
        cap: 150,
        remaining: 30,
        grandfathered: false,
      }),
    );
    expect(html).toContain('dir="rtl"');
  });
});
