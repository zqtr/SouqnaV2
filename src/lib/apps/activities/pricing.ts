import { listInstalledApps } from '../installed';
import { APP_REGISTRY } from '../registry';
import { ACTIVITY_PRICE_QAR, isActivityAppId, type ActivityAppId } from './types';

/**
 * Activity add-on billing. Each installed activity plugin adds a fixed
 * monthly price (QAR) on top of the merchant's Souqna plan — it is NOT
 * a Souqy charge. These helpers surface the add-ons and their total so
 * the plan/billing page can present one effective monthly figure.
 */

export type ActivityAddon = {
  appId: ActivityAppId;
  name: string;
  nameAr: string;
  priceQar: number;
  enabled: boolean;
};

const DESCRIPTOR_BY_ID = new Map(APP_REGISTRY.map((a) => [a.id, a]));

/** All installed activity plugins for a storefront, with their add-on price. */
export async function getActivityAddons(storefrontSlug: string): Promise<ActivityAddon[]> {
  const installed = await listInstalledApps(storefrontSlug);
  const addons: ActivityAddon[] = [];
  for (const row of installed) {
    if (!isActivityAppId(row.appId)) continue;
    const descriptor = DESCRIPTOR_BY_ID.get(row.appId);
    addons.push({
      appId: row.appId,
      name: descriptor?.name ?? row.appId,
      nameAr: descriptor?.nameAr ?? descriptor?.name ?? row.appId,
      priceQar: descriptor?.priceQar ?? ACTIVITY_PRICE_QAR[row.appId],
      enabled: row.enabled,
    });
  }
  return addons;
}

/** Total monthly QAR from enabled activity add-ons for a storefront. */
export async function activityAddonTotalQar(storefrontSlug: string): Promise<number> {
  const addons = await getActivityAddons(storefrontSlug);
  return addons.reduce((sum, a) => sum + (a.enabled ? a.priceQar : 0), 0);
}
