import type { AppDescriptor } from './types';

/**
 * Single source of truth for the plugin Souqna lists in Souqna
 * Marketplace. Keep this tight while the marketplace focuses on the
 * built-in reviews experience.
 */
export const APP_REGISTRY: AppDescriptor[] = [
  {
    id: 'reviews',
    name: 'Souqna Reviews',
    vendor: 'by Souqna',
    tagline: 'Collect bilingual customer proof on your storefront',
    description:
      'Let visitors submit Arabic or English reviews from storefront review sections. Founders can publish, hide, feature, delete, and control what appears publicly.',
    category: 'sales',
    authKind: 'none',
    available: true,
    customizable: true,
    surfacesInBuilder: true,
    glyph: 'R',
    accentVar: '--color-gold-deep',
    connectCopy: {
      headline: 'Enable Souqna Reviews',
      body:
        'Add live review components in Builder, collect visitor feedback in Arabic or English, and approve what appears on the public storefront.',
      ctaLabel: 'Enable Souqna Reviews',
    },
  },
];

const REGISTRY_BY_ID = new Map(APP_REGISTRY.map((a) => [a.id, a]));

export function getAppDescriptor(id: string): AppDescriptor | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function listAvailableApps(): AppDescriptor[] {
  return APP_REGISTRY.filter((a) => a.available);
}
