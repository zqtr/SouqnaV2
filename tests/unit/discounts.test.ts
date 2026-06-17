import { describe, expect, it } from 'vitest';
import {
  calculateCheckoutDiscount,
  type CheckoutDiscountLine,
  type Discount,
} from '@/lib/discounts';

const lines: CheckoutDiscountLine[] = [
  { productId: 'prod_a', category: 'skincare', lineTotalQar: 120 },
  { productId: 'prod_b', category: 'makeup', lineTotalQar: 80 },
];

function discount(patch: Partial<Discount>): Discount {
  return {
    id: 1,
    storefrontSlug: 'test',
    kind: 'code',
    code: 'SAVE',
    title: null,
    valueType: 'percentage',
    value: 10,
    appliesTo: 'all',
    appliesToIds: [],
    minimumSubtotal: null,
    usageLimit: null,
    perCustomerLimit: null,
    usedCount: 0,
    status: 'active',
    startsAt: null,
    endsAt: null,
    meta: {},
    createdAt: new Date('2026-06-16T00:00:00.000Z'),
    updatedAt: new Date('2026-06-16T00:00:00.000Z'),
    ...patch,
  };
}

describe('calculateCheckoutDiscount', () => {
  it('applies percentage discounts to the eligible subtotal', () => {
    const result = calculateCheckoutDiscount(discount({ value: 15 }), {
      subtotalQar: 200,
      shippingQar: 20,
      lines,
    });

    expect(result?.discountQar).toBe(30);
    expect(result?.productDiscountQar).toBe(30);
    expect(result?.shippingDiscountQar).toBe(0);
  });

  it('caps fixed discounts at the matching product subtotal', () => {
    const result = calculateCheckoutDiscount(
      discount({
        valueType: 'fixed_amount',
        value: 200,
        appliesTo: 'products',
        appliesToIds: ['prod_b'],
      }),
      { subtotalQar: 200, shippingQar: 20, lines },
    );

    expect(result?.discountQar).toBe(80);
  });

  it('treats free shipping as a shipping discount', () => {
    const result = calculateCheckoutDiscount(discount({ valueType: 'free_shipping', value: 0 }), {
      subtotalQar: 200,
      shippingQar: 20,
      lines,
    });

    expect(result?.productDiscountQar).toBe(0);
    expect(result?.shippingDiscountQar).toBe(20);
    expect(result?.discountQar).toBe(20);
  });
});
