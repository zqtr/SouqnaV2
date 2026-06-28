export type TemplateShowcaseProduct = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  priceQar: number;
  category: string;
  categoryKey: string;
  tag: string;
  image: string;
  videoUrl?: string;
};

export const TEMPLATE_SHOWCASE_PRODUCTS: TemplateShowcaseProduct[] = [
  {
    id: 'showcase-oud-amber',
    slug: 'oud-amber-launch',
    name: 'Oud & Amber Launch Set',
    nameAr: '\u0637\u0642\u0645 \u0625\u0637\u0644\u0627\u0642 \u0627\u0644\u0639\u0646\u0628\u0631',
    description:
      'A premium launch product with strong product imagery, priced size options, and a clear path to checkout.',
    priceQar: 280,
    category: 'Launch sets',
    categoryKey: 'launch',
    tag: 'Pro+',
    image: '/seed-products/vitrine/1.svg',
  },
  {
    id: 'showcase-video-drop',
    slug: 'video-product-drop',
    name: 'Video Product Drop',
    nameAr: '\u0625\u0637\u0644\u0627\u0642 \u0645\u0646\u062a\u062c \u0628\u0627\u0644\u0641\u064a\u062f\u064a\u0648',
    description:
      'A Max+ product detail example with changeable video media, product route, and storefront-ready CTAs.',
    priceQar: 420,
    category: 'Video drops',
    categoryKey: 'max',
    tag: 'Max+',
    image: '/seed-products/atrium/1.svg',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    id: 'showcase-identity-kit',
    slug: 'identity-kit',
    name: 'Souqna Identity Kit',
    nameAr: '\u0647\u0648\u064a\u0629 \u0633\u0648\u0642\u0646\u0627',
    description:
      'A branded visual kit for hero sections, banners, product cards, and launch-ready storefront moments.',
    priceQar: 340,
    category: 'Identity kits',
    categoryKey: 'brand',
    tag: 'Pro+',
    image: '/seed-products/launchpad/2.svg',
  },
  {
    id: 'showcase-gift-capsule',
    slug: 'gift-capsule',
    name: 'Gift Capsule Pack',
    nameAr: '\u0643\u0628\u0633\u0648\u0644\u0629 \u0627\u0644\u0647\u062f\u0627\u064a\u0627',
    description:
      'A compact bundle that works well inside offer rails, category modules, product lists, and quick-view cards.',
    priceQar: 190,
    category: 'Gift capsules',
    categoryKey: 'gifts',
    tag: 'Pro+',
    image: '/seed-products/bazaar/3.svg',
  },
  {
    id: 'showcase-signature-oud',
    slug: 'signature-oud-box',
    name: 'Signature Oud Box',
    nameAr: '\u0635\u0646\u062f\u0648\u0642 \u0627\u0644\u0639\u0648\u062f \u0627\u0644\u0641\u0627\u062e\u0631',
    description:
      'A Max+ signature product for editorial product detail sections, order summaries, and premium reviews.',
    priceQar: 520,
    category: 'Signature drops',
    categoryKey: 'max',
    tag: 'Max+',
    image: '/seed-products/atrium/1.svg',
  },
];

export function findTemplateShowcaseProduct(segment: string | undefined) {
  const normalized = decodeURIComponent(segment || '').trim().toLowerCase();
  if (!normalized) return null;
  return (
    TEMPLATE_SHOWCASE_PRODUCTS.find(
      (product) =>
        product.id.toLowerCase() === normalized ||
        product.slug.toLowerCase() === normalized,
    ) ?? null
  );
}

export function filterTemplateShowcaseProducts(category: string | undefined) {
  const normalized = category?.trim().toLowerCase();
  if (!normalized) return TEMPLATE_SHOWCASE_PRODUCTS;
  return TEMPLATE_SHOWCASE_PRODUCTS.filter((product) => product.categoryKey === normalized);
}
