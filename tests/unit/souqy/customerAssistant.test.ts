import { describe, expect, it } from 'vitest';
import type { Storefront } from '@/lib/brief';
import type { Product } from '@/lib/products';
import { buildCatalogueSummary } from '@/lib/souqy/customerAssistant';

const storefront = {
  businessName: 'AE STORE',
  locale: 'en',
  businessType: 'graphic_design',
  tagline: 'Your destination for innovation',
  checkout: {
    enabled: true,
    shippingFlatQar: 15,
  },
} as Storefront;

function product(patch: Partial<Product>): Product {
  return {
    id: 'product-1',
    storefrontSlug: 'aestore',
    title: 'Logo design',
    subtitle: null,
    description: 'Professional logo package',
    priceQar: 120,
    compareAtPriceQar: null,
    costPerItemQar: null,
    taxable: true,
    discountEligible: true,
    pricingMode: 'one_time',
    monthlyPriceQar: null,
    imageUrl: null,
    mediaAltText: null,
    category: 'Design',
    productType: null,
    vendor: null,
    tags: [],
    templateKey: null,
    badges: [],
    handle: null,
    seoTitle: null,
    seoDescription: null,
    eventAt: null,
    publishedAt: null,
    saleStartsAt: null,
    saleEndsAt: null,
    status: 'active',
    stock: 0,
    sku: null,
    barcode: null,
    trackInventory: false,
    continueSellingWhenOutOfStock: false,
    lowStockThreshold: null,
    restockAt: null,
    supplierCostQar: null,
    purchaseOrderRef: null,
    stockStatusLabel: null,
    minOrderQuantity: 1,
    maxOrderQuantity: null,
    physicalProduct: true,
    weightGrams: null,
    packageDimensions: { lengthCm: null, widthCm: null, heightCm: null },
    requiresShipping: true,
    freeShippingEligible: false,
    countryOfOrigin: null,
    hsCode: null,
    customsDescription: null,
    digitalDelivery: false,
    metafields: {},
    isCustomizable: false,
    customizationLabel: null,
    sizeOptions: [],
    sizeOptionPrices: [],
    allowCustomSize: false,
    variantOptions: [],
    variantOptionPrices: [],
    requiresHeightInput: false,
    heightInputLabel: null,
    heightOptions: [],
    position: 0,
    source: 'manual',
    isDemo: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...patch,
  } as Product;
}

describe('buildCatalogueSummary', () => {
  it('summarizes the store and listed public products', () => {
    const summary = buildCatalogueSummary(storefront, [
      product({ title: 'Logo design', priceQar: 120 }),
      product({ title: 'Draft service', status: 'draft' }),
    ]);

    expect(summary).toContain('AE STORE');
    expect(summary).toContain('Listed products:');
    expect(summary).toContain('Logo design (120 QAR)');
    expect(summary).not.toContain('Draft service');
    expect(summary).toContain('Listed delivery fee: 15 QAR.');
  });
});
