import { unstable_noStore as noStore } from 'next/cache';
import { db } from './db';
import { getStorefront } from './brief';
import {
  DEFAULT_PRODUCT_INDEX_SETTINGS,
  normalizeProductIndexSettings,
  type ProductIndexSettings,
} from './productIndexSettings';

export async function getStorefrontProductIndexSettings(
  slug: string,
): Promise<ProductIndexSettings> {
  noStore();
  const storefront = await getStorefront(slug);
  return storefront?.productIndex ?? { ...DEFAULT_PRODUCT_INDEX_SETTINGS };
}

export async function writeStorefrontProductIndexSettings(
  slug: string,
  settings: ProductIndexSettings,
): Promise<void> {
  const json = JSON.stringify(normalizeProductIndexSettings(settings));
  await db()`
    update briefs set products_index_settings = ${json}::jsonb
    where slug = ${slug} and expires_at > now()
  `;
}
