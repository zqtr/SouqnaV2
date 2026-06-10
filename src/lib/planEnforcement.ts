import {
  UPGRADE_GROWTH_TOOLS_COPY,
  monthlyOrderCapForPlan,
  productCapForPlan,
  type Plan,
} from './plans';
import type { CollectionMode } from './checkout-orders';

export type PlanGateFailure = {
  status: 'error';
  message: string;
  field?: string;
};

export type OrderFinancialSnapshot = {
  planSnapshot: Plan;
  sellerNetQar: number;
  collectionMode: CollectionMode;
  platformProvider: string | null;
};

export type CheckoutOrderFinancialSnapshot = OrderFinancialSnapshot & {
  buyerTotalQar: number;
};

export function productCapFailure(
  plan: Plan,
  existingCount: number,
  incomingCount: number,
): PlanGateFailure | null {
  const cap = productCapForPlan(plan);
  if (!Number.isFinite(cap)) return null;
  if (existingCount + incomingCount <= cap) return null;
  return {
    status: 'error',
    message: `Free allows ${cap} products. ${UPGRADE_GROWTH_TOOLS_COPY}.`,
    field: 'title',
  };
}

export function monthlyOrderCapFailure(
  plan: Plan,
  currentMonthOrders: number,
): PlanGateFailure | null {
  const cap = monthlyOrderCapForPlan(plan);
  if (!Number.isFinite(cap)) return null;
  if (currentMonthOrders < cap) return null;
  return {
    status: 'error',
    message: `Free allows ${cap} checkout orders per month. ${UPGRADE_GROWTH_TOOLS_COPY}.`,
    field: 'items',
  };
}

export function checkoutCollectionSnapshot(
  paymentMethod: string,
  options: { platformSkipCash?: boolean } = {},
): Pick<OrderFinancialSnapshot, 'collectionMode' | 'platformProvider'> {
  if (paymentMethod === 'skipcash') {
    return {
      collectionMode: options.platformSkipCash === false ? 'seller_direct' : 'platform_skipcash',
      platformProvider: 'skipcash',
    };
  }
  if (paymentMethod === 'sadad') {
    return { collectionMode: 'seller_direct', platformProvider: 'sadad' };
  }
  if (paymentMethod === 'pay_link') {
    return { collectionMode: 'offline', platformProvider: 'seller_pay_link' };
  }
  return { collectionMode: 'offline', platformProvider: null };
}

export function orderFinancialSnapshot(
  plan: Plan,
  totalQar: number,
  paymentMethod: string,
  options: { platformSkipCash?: boolean } = {},
): OrderFinancialSnapshot {
  const collection = checkoutCollectionSnapshot(paymentMethod, options);
  const safeTotal = Math.max(0, Math.round(totalQar));
  return {
    planSnapshot: plan,
    sellerNetQar: safeTotal,
    ...collection,
  };
}

export function checkoutOrderFinancialSnapshot(
  plan: Plan,
  baseQar: number,
  paymentMethod: string,
  options: { platformSkipCash?: boolean } = {},
): CheckoutOrderFinancialSnapshot {
  const collection = checkoutCollectionSnapshot(paymentMethod, options);
  const safeBase = Math.max(0, Math.round(baseQar));
  return {
    planSnapshot: plan,
    sellerNetQar: safeBase,
    collectionMode: collection.collectionMode,
    platformProvider: collection.platformProvider,
    buyerTotalQar: safeBase,
  };
}
