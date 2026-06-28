import { PLAN_GATES_DISABLED, PLAN_RANK, type Plan } from '@/lib/plans';
import { ANALYTICS_PLAN_FEATURES, type AnalyticsAccessLevel } from './features';

export function getAnalyticsAccessLevel(plan: Plan): AnalyticsAccessLevel {
  if (PLAN_GATES_DISABLED) return 'advanced';
  return ANALYTICS_PLAN_FEATURES[plan].accessLevel;
}

export function canAccessBasicAnalytics(plan: Plan): boolean {
  return getAnalyticsAccessLevel(plan) === 'basic' || getAnalyticsAccessLevel(plan) === 'advanced';
}

export function canAccessAdvancedAnalytics(plan: Plan): boolean {
  if (PLAN_GATES_DISABLED) return true;
  return PLAN_RANK[plan] >= PLAN_RANK.pro;
}

export function analyticsHistoryDaysForPlan(plan: Plan): number {
  if (PLAN_GATES_DISABLED) return Number.POSITIVE_INFINITY;
  return ANALYTICS_PLAN_FEATURES[plan].historyDays;
}

export function canExportAnalytics(plan: Plan): boolean {
  if (PLAN_GATES_DISABLED) return true;
  return ANALYTICS_PLAN_FEATURES[plan].canExport;
}

export function hasEnterpriseAnalyticsDepth(plan: Plan): boolean {
  if (PLAN_GATES_DISABLED) return true;
  return ANALYTICS_PLAN_FEATURES[plan].enterpriseDepth;
}
