import { describe, expect, it } from 'vitest';
import {
  canAccessAdvancedAnalytics,
  canAccessBasicAnalytics,
  getAnalyticsAccessLevel,
} from '@/lib/analytics/access';
import {
  PLAN_LIMITS,
  PLANS,
  aiCreditsForPlan,
  monthlyOrderCapForPlan,
  planLabel,
  planUnlocksAnalytics,
  planUnlocksCustomDomain,
  planUnlocksDiscounts,
  planUnlocksIntegrations,
  planUnlocksOnlinePayments,
  planUnlocksPremiumBlocks,
  planUnlocksSouqy,
  productCapForPlan,
  storefrontCapForPlan,
} from '@/lib/plans';

describe('Souqna plan catalog', () => {
  it('keeps internal IDs stable while exposing the new labels and prices', () => {
    expect(PLANS).toEqual(['free', 'starter', 'pro', 'atelier']);
    expect(planLabel('free')).toBe('Free');
    expect(planLabel('starter')).toBe('Pro');
    expect(planLabel('pro')).toBe('Pro+');
    expect(planLabel('atelier')).toBe('Max+');
    expect(PLAN_LIMITS.starter.monthlyPriceQar).toBe(49);
    expect(PLAN_LIMITS.pro.monthlyPriceQar).toBe(145);
    expect(PLAN_LIMITS.atelier.monthlyPriceQar).toBe(235);
  });

  it('exposes storefront, product, order, and AI limits', () => {
    expect(storefrontCapForPlan('free')).toBe(1);
    expect(productCapForPlan('free')).toBe(10);
    expect(monthlyOrderCapForPlan('free')).toBe(25);
    expect(aiCreditsForPlan('starter')).toBe(100);
    expect(Number.isFinite(productCapForPlan('starter'))).toBe(false);
    expect(Number.isFinite(monthlyOrderCapForPlan('pro'))).toBe(false);
  });

  it('gates features at the intended tiers', () => {
    expect(planUnlocksCustomDomain('free')).toBe(false);
    expect(planUnlocksCustomDomain('starter')).toBe(true);
    expect(planUnlocksAnalytics('free')).toBe(true);
    expect(canAccessBasicAnalytics('free')).toBe(true);
    expect(canAccessAdvancedAnalytics('free')).toBe(false);
    expect(getAnalyticsAccessLevel('starter')).toBe('basic');
    expect(getAnalyticsAccessLevel('pro')).toBe('advanced');
    expect(planUnlocksIntegrations('starter')).toBe(true);
    expect(planUnlocksDiscounts('starter')).toBe(true);
    // Souqy is now its own subscription (Free tier available to all);
    // storefront-plan access is no longer a gate.
    expect(planUnlocksSouqy('free')).toBe(true);
    expect(planUnlocksSouqy('starter')).toBe(true);
    expect(planUnlocksSouqy('pro')).toBe(true);
    expect(planUnlocksOnlinePayments('starter')).toBe(false);
    expect(planUnlocksOnlinePayments('pro')).toBe(true);
    expect(planUnlocksOnlinePayments('atelier')).toBe(true);
    expect(planUnlocksPremiumBlocks('pro')).toBe(true);
  });
});
