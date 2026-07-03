import { beforeEach, describe, expect, it, vi } from 'vitest';

const monthlyCountMock = vi.fn<(userId: string) => Promise<number>>();
const tierMock = vi.fn<(userId: string) => Promise<'free' | 'souqy' | 'team'>>();

vi.mock('@/lib/souqy/db', () => ({
  getSouqyMonthlyCount: (userId: string) => monthlyCountMock(userId),
}));
vi.mock('@/lib/souqy/subscription', () => ({
  getSouqyTier: (userId: string) => tierMock(userId),
}));

import { getSouqyAllowance, reserveSouqyGeneration } from '@/lib/souqy/credits';
import { souqyMonthlyCap } from '@/lib/souqy/plans';

beforeEach(() => {
  monthlyCountMock.mockReset();
  tierMock.mockReset();
});

describe('tier caps', () => {
  it('match the agreed allotments', () => {
    expect(souqyMonthlyCap('free')).toBe(5);
    expect(souqyMonthlyCap('souqy')).toBe(150);
    expect(souqyMonthlyCap('team')).toBe(500);
  });
});

describe('getSouqyAllowance', () => {
  it('reports remaining against the tier cap', async () => {
    tierMock.mockResolvedValueOnce('souqy');
    monthlyCountMock.mockResolvedValueOnce(20);
    await expect(getSouqyAllowance('u')).resolves.toEqual({
      tier: 'souqy',
      cap: 150,
      usedThisMonth: 20,
      remaining: 130,
    });
  });

  it('never reports negative remaining', async () => {
    tierMock.mockResolvedValueOnce('free');
    monthlyCountMock.mockResolvedValueOnce(9);
    const a = await getSouqyAllowance('u');
    expect(a.remaining).toBe(0);
  });
});

describe('reserveSouqyGeneration', () => {
  it('admits a free user under 5/month', async () => {
    tierMock.mockResolvedValueOnce('free');
    monthlyCountMock.mockResolvedValueOnce(4);
    await expect(reserveSouqyGeneration('u')).resolves.toEqual({ allowed: true, tier: 'free' });
  });

  it('blocks a free user at 5/month', async () => {
    tierMock.mockResolvedValueOnce('free');
    monthlyCountMock.mockResolvedValueOnce(5);
    await expect(reserveSouqyGeneration('u')).resolves.toEqual({ allowed: false, tier: 'free' });
  });

  it('lets a Souqy-tier user keep going past the free cap', async () => {
    tierMock.mockResolvedValueOnce('souqy');
    monthlyCountMock.mockResolvedValueOnce(120);
    await expect(reserveSouqyGeneration('u')).resolves.toEqual({ allowed: true, tier: 'souqy' });
  });

  it('fails open when the reads throw', async () => {
    tierMock.mockRejectedValueOnce(new Error('db down'));
    monthlyCountMock.mockResolvedValueOnce(0);
    await expect(reserveSouqyGeneration('u')).resolves.toEqual({ allowed: true });
  });
});
