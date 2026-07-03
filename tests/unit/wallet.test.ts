import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();

vi.mock('@/lib/db', () => ({
  hasDb: () => true,
  db: () => (strings: TemplateStringsArray, ...values: unknown[]) =>
    queryMock(strings.join('?'), values),
}));

import {
  creditWalletForTopup,
  debitWallet,
  getWalletSummary,
  isWalletTopupPreset,
  WALLET_TOPUP_PRESETS_QAR,
} from '@/lib/wallet';

beforeEach(() => {
  queryMock.mockReset();
});

describe('wallet top-up presets', () => {
  it('accepts every advertised preset', () => {
    for (const amount of WALLET_TOPUP_PRESETS_QAR) {
      expect(isWalletTopupPreset(amount)).toBe(true);
    }
  });

  it('rejects arbitrary client-sent amounts', () => {
    expect(isWalletTopupPreset(1)).toBe(false);
    expect(isWalletTopupPreset(55)).toBe(false);
    expect(isWalletTopupPreset(-50)).toBe(false);
    expect(isWalletTopupPreset(0)).toBe(false);
  });
});

describe('getWalletSummary', () => {
  it('returns a zero balance when the user has no wallet row', async () => {
    queryMock.mockResolvedValueOnce([]);
    await expect(getWalletSummary('user_1')).resolves.toEqual({
      balanceQar: 0,
      updatedAt: null,
    });
  });

  it('coerces the balance to a number', async () => {
    queryMock.mockResolvedValueOnce([{ balance_qar: '150', updated_at: '2026-07-01' }]);
    const summary = await getWalletSummary('user_1');
    expect(summary.balanceQar).toBe(150);
  });
});

describe('creditWalletForTopup', () => {
  it('returns the credited amount and new balance when the claim lands', async () => {
    queryMock.mockResolvedValueOnce([
      { clerk_user_id: 'user_1', amount_qar: 100, balance_after: 130 },
    ]);
    const result = await creditWalletForTopup({
      topupId: 'topup_1',
      skipcashPaymentId: 'pay_1',
    });
    expect(result).toEqual({ clerkUserId: 'user_1', amountQar: 100, balanceQar: 130 });
  });

  it('returns null when the top-up was already resolved (idempotent replay)', async () => {
    queryMock.mockResolvedValueOnce([]);
    await expect(
      creditWalletForTopup({ topupId: 'topup_1', skipcashPaymentId: 'pay_1' }),
    ).resolves.toBeNull();
  });

  it('gates the credit on the pending -> paid status transition', async () => {
    queryMock.mockResolvedValueOnce([]);
    await creditWalletForTopup({ topupId: 'topup_1', skipcashPaymentId: 'pay_1' });
    const [sql] = queryMock.mock.calls[0] as [string];
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("set status = 'paid'");
  });
});

describe('debitWallet', () => {
  it('rejects non-positive and fractional amounts before touching the db', async () => {
    await expect(
      debitWallet({ clerkUserId: 'u', amountQar: 0, idempotencyKey: 'k' }),
    ).rejects.toThrow();
    await expect(
      debitWallet({ clerkUserId: 'u', amountQar: 2.5, idempotencyKey: 'k' }),
    ).rejects.toThrow();
    await expect(
      debitWallet({ clerkUserId: 'u', amountQar: -10, idempotencyKey: 'k' }),
    ).rejects.toThrow();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns the new balance on a successful debit', async () => {
    queryMock.mockResolvedValueOnce([{ balance_after: 80 }]);
    await expect(
      debitWallet({ clerkUserId: 'u', amountQar: 20, idempotencyKey: 'purchase:1' }),
    ).resolves.toEqual({ status: 'ok', balanceQar: 80 });
  });

  it('distinguishes an idempotent replay from insufficient funds', async () => {
    queryMock.mockResolvedValueOnce([]); // debit CTE matched nothing
    queryMock.mockResolvedValueOnce([{ 1: 1 }]); // entry already exists
    await expect(
      debitWallet({ clerkUserId: 'u', amountQar: 20, idempotencyKey: 'purchase:1' }),
    ).resolves.toEqual({ status: 'already_applied' });

    queryMock.mockResolvedValueOnce([]); // debit CTE matched nothing
    queryMock.mockResolvedValueOnce([]); // no prior entry either
    await expect(
      debitWallet({ clerkUserId: 'u', amountQar: 20, idempotencyKey: 'purchase:2' }),
    ).resolves.toEqual({ status: 'insufficient_funds' });
  });

  it('guards the balance update against overdraft in SQL', async () => {
    queryMock.mockResolvedValueOnce([{ balance_after: 5 }]);
    await debitWallet({ clerkUserId: 'u', amountQar: 20, idempotencyKey: 'purchase:3' });
    const [sql] = queryMock.mock.calls[0] as [string];
    expect(sql).toContain('balance_qar >=');
  });
});
