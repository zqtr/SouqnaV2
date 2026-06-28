import { describe, expect, it } from 'vitest';
import {
  buildTaqimCartItems,
  resolveCommerceProductSource,
  resolveCommerceTabs,
  resolveFilterOptionProductIds,
  type CommerceProductLike,
} from '@/lib/blocks/commerce';

const products: CommerceProductLike[] = [
  {
    id: 'p-amber',
    title: 'Amber Oil',
    category: 'Beauty',
    tag: 'gift',
    priceQar: 120,
    status: 'active',
    stock: 4,
    createdAt: '2026-06-22T10:00:00.000Z',
  },
  {
    id: 'p-linen',
    title: 'Linen Travel Set',
    category: 'Travel',
    tag: 'travel',
    priceQar: 90,
    status: 'active',
    stock: 7,
    createdAt: '2026-06-23T10:00:00.000Z',
  },
  {
    id: 'p-cup',
    title: 'Ceramic Cup',
    category: 'Home',
    tag: 'gift',
    priceQar: 240,
    status: 'sold_out',
    stock: 0,
    createdAt: '2026-06-24T10:00:00.000Z',
  },
];

describe('Builder commerce block helpers', () => {
  it('resolves manual product sources in merchant order and hides unavailable products', () => {
    const resolved = resolveCommerceProductSource(products, {
      source: 'manual',
      productIds: ['p-cup', 'p-linen', 'p-amber'],
      limit: 8,
      sort: 'manual',
      hideUnavailable: true,
    });

    expect(resolved.map((product) => product.id)).toEqual(['p-linen', 'p-amber']);
  });

  it('resolves category, latest, and price sorted sources deterministically', () => {
    expect(
      resolveCommerceProductSource(products, {
        source: 'category',
        category: 'Travel',
        limit: 8,
        sort: 'manual',
        hideUnavailable: true,
      }).map((product) => product.id),
    ).toEqual(['p-linen']);

    expect(
      resolveCommerceProductSource(products, {
        source: 'all',
        limit: 8,
        sort: 'price_low',
        hideUnavailable: true,
      }).map((product) => product.id),
    ).toEqual(['p-linen', 'p-amber']);
  });

  it('assigns configured tab products and builds a combined All tab', () => {
    const tabs = resolveCommerceTabs(products, [
      {
        id: 'gifts',
        labelEn: 'Gifts',
        productSource: {
          source: 'tag',
          tag: 'gift',
          limit: 8,
          sort: 'manual',
          hideUnavailable: true,
        },
      },
      {
        id: 'travel',
        labelEn: 'Travel',
        productSource: {
          source: 'category',
          category: 'Travel',
          limit: 8,
          sort: 'manual',
          hideUnavailable: true,
        },
      },
    ]);

    expect(tabs[0]).toMatchObject({ id: 'all', productIds: ['p-amber', 'p-linen'] });
    expect(tabs[1]).toMatchObject({ id: 'gifts', productIds: ['p-amber'] });
    expect(tabs[2]).toMatchObject({ id: 'travel', productIds: ['p-linen'] });
  });

  it('maps filter options to real product ids', () => {
    expect(
      resolveFilterOptionProductIds(
        products,
        { id: 'category', source: 'category' },
        { id: 'beauty', category: 'Beauty' },
      ),
    ).toEqual(['p-amber']);

    expect(
      resolveFilterOptionProductIds(
        products,
        { id: 'price', source: 'price' },
        { id: 'under-100', value: 'under_100' },
      ),
    ).toEqual(['p-linen']);
  });

  it('builds Taqim cart payloads for selected bundle items and options', () => {
    const payload = buildTaqimCartItems(
      [
        { productId: 'p-amber', title: 'Amber Oil', priceQar: 120 },
        { productId: 'p-linen', title: 'Linen Travel Set', priceQar: 90 },
        { productId: 'p-cup', title: 'Ceramic Cup', priceQar: 240 },
      ],
      [
        { productId: 'p-amber', required: true, defaultOptionValue: 'Large' },
        { productId: 'p-linen', selected: true },
        { productId: 'p-cup', selected: false },
      ],
      'add_selected',
    );

    expect(payload).toEqual([
      { productId: 'p-amber', title: 'Amber Oil', priceQar: 120, variantLabel: 'Large' },
      { productId: 'p-linen', title: 'Linen Travel Set', priceQar: 90, variantLabel: null },
    ]);
  });
});
