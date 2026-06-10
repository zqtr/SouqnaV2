import { describe, expect, it } from 'vitest';
import {
  checkoutOrderFinancialSnapshot,
  monthlyOrderCapFailure,
  orderFinancialSnapshot,
  productCapFailure,
} from '@/lib/planEnforcement';

describe('plan enforcement helpers', () => {
  it('blocks Free product creation once the 10 product cap would be exceeded', () => {
    expect(productCapFailure('free', 9, 1)).toBeNull();
    expect(productCapFailure('free', 9, 2)).toEqual({
      status: 'error',
      message: 'Free allows 10 products. Upgrade to unlock growth tools.',
      field: 'title',
    });
    expect(productCapFailure('starter', 10_000, 500)).toBeNull();
  });

  it('blocks Free checkout order creation after 25 monthly orders', () => {
    expect(monthlyOrderCapFailure('free', 24)).toBeNull();
    expect(monthlyOrderCapFailure('free', 25)).toEqual({
      status: 'error',
      message: 'Free allows 25 checkout orders per month. Upgrade to unlock growth tools.',
      field: 'items',
    });
    expect(monthlyOrderCapFailure('pro', 500)).toBeNull();
  });

  it('snapshots collection mode and seller totals for public and manual checkout paths', () => {
    expect(orderFinancialSnapshot('free', 200, 'skipcash')).toMatchObject({
      planSnapshot: 'free',
      sellerNetQar: 200,
      collectionMode: 'platform_skipcash',
      platformProvider: 'skipcash',
    });
    expect(orderFinancialSnapshot('starter', 200, 'cod')).toMatchObject({
      planSnapshot: 'starter',
      sellerNetQar: 200,
      collectionMode: 'offline',
      platformProvider: null,
    });
    expect(
      orderFinancialSnapshot('pro', 200, 'skipcash', { platformSkipCash: false }),
    ).toMatchObject({
      sellerNetQar: 200,
      collectionMode: 'seller_direct',
      platformProvider: 'skipcash',
    });
    expect(orderFinancialSnapshot('atelier', 200, 'sadad')).toMatchObject({
      sellerNetQar: 200,
      collectionMode: 'seller_direct',
      platformProvider: 'sadad',
    });
  });

  it('keeps checkout totals unchanged for every payment method', () => {
    expect(checkoutOrderFinancialSnapshot('free', 200, 'skipcash')).toMatchObject({
      planSnapshot: 'free',
      sellerNetQar: 200,
      buyerTotalQar: 200,
      collectionMode: 'platform_skipcash',
      platformProvider: 'skipcash',
    });
    expect(checkoutOrderFinancialSnapshot('starter', 200, 'cod')).toMatchObject({
      sellerNetQar: 200,
      buyerTotalQar: 200,
      collectionMode: 'offline',
      platformProvider: null,
    });
  });
});
