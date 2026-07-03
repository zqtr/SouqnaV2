import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

// The wallet page went blank in production after the SkipCash return
// redirect — a hydration/SSR crash blanks the whole React tree. This
// smoke test SSRs the island exactly like Next does so a throwing
// render fails CI instead of production.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/app/actions/wallet', () => ({
  getMyWallet: vi.fn(async () => ({ balanceQar: 0, entries: [], savedCards: [] })),
  pollWalletTopup: vi.fn(async () => ({ status: 'pending' })),
  removeSavedCard: vi.fn(async () => ({ status: 'ok' })),
  startWalletTopup: vi.fn(async () => ({ status: 'error', message: 'nope' })),
}));

import { WalletExperience } from '@/components/billing/WalletExperience';

describe('WalletExperience SSR', () => {
  it('renders without crashing (no pending top-up)', () => {
    const html = renderToString(
      createElement(WalletExperience, {
        locale: 'en',
        initialBalanceQar: 70,
        initialSavedCards: [],
        pendingTopupId: null,
      }),
    );
    expect(html).toContain('Available balance');
    expect(html).toContain('Payment methods');
  });

  it('renders without crashing when returning from SkipCash', () => {
    const html = renderToString(
      createElement(WalletExperience, {
        locale: 'en',
        initialBalanceQar: 0,
        initialSavedCards: [
          {
            id: 'c1',
            tokenId: 'tok_1',
            last4: '4242',
            cardType: 'Visa',
            expiry: '12/28',
            createdAt: new Date().toISOString(),
          },
        ],
        pendingTopupId: '1a4dd79d-7c1e-4500-a95c-bd32a78195cd',
      }),
    );
    expect(html).toContain('Confirming your payment');
    expect(html).toContain('4242');
  });

  it('renders the Arabic RTL variant', () => {
    const html = renderToString(
      createElement(WalletExperience, {
        locale: 'ar',
        initialBalanceQar: 20,
        initialSavedCards: [],
        pendingTopupId: null,
      }),
    );
    expect(html).toContain('dir="rtl"');
  });
});
