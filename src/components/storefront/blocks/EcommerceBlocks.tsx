'use client';

import Ecommerce1 from '@/components/ecommerce-1';
import Ecommerce2 from '@/components/ecommerce-2';
import Ecommerce3 from '@/components/ecommerce-3';
import Ecommerce4 from '@/components/ecommerce-4';
import Ecommerce5 from '@/components/ecommerce-5';
import Ecommerce6 from '@/components/ecommerce-6';
import Ecommerce7 from '@/components/ecommerce-7';
import { resolveCommerceProductSource } from '@/lib/blocks/commerce';
import { isVideoMediaUrl } from '@/lib/media';
import type { Product } from '@/lib/products';
import type { BlockRenderProps } from './BlockContext';
import type {
  EcommerceBlockProps,
  EcommerceCategory,
  EcommerceProduct,
  Ecommerce1Props,
  Ecommerce2Props,
  Ecommerce3Props,
  Ecommerce4Props,
  Ecommerce5Props,
  Ecommerce6Props,
  Ecommerce7Props,
} from '@/lib/blocks/types';
import { productPathSegment } from './helpers';

export function Ecommerce1Block({ block, ctx }: BlockRenderProps<Ecommerce1Props>) {
  return <Ecommerce1 {...withResolvedProducts(block.props, ctx.products, ctx.storefrontBaseHref)} dir={ctx.isRtl ? 'rtl' : 'ltr'} />;
}

export function Ecommerce2Block({ block, ctx }: BlockRenderProps<Ecommerce2Props>) {
  return <Ecommerce2 {...withResolvedProducts(block.props, ctx.products, ctx.storefrontBaseHref, 'filters')} dir={ctx.isRtl ? 'rtl' : 'ltr'} />;
}

export function Ecommerce3Block({ block, ctx }: BlockRenderProps<Ecommerce3Props>) {
  return <Ecommerce3 {...withResolvedProducts(block.props, ctx.products, ctx.storefrontBaseHref)} dir={ctx.isRtl ? 'rtl' : 'ltr'} />;
}

export function Ecommerce4Block({ block, ctx }: BlockRenderProps<Ecommerce4Props>) {
  return <Ecommerce4 {...withResolvedProducts(block.props, ctx.products, ctx.storefrontBaseHref)} dir={ctx.isRtl ? 'rtl' : 'ltr'} />;
}

export function Ecommerce5Block({ block, ctx }: BlockRenderProps<Ecommerce5Props>) {
  return <Ecommerce5 {...withResolvedProducts(block.props, ctx.products, ctx.storefrontBaseHref)} dir={ctx.isRtl ? 'rtl' : 'ltr'} />;
}

export function Ecommerce6Block({ block, ctx }: BlockRenderProps<Ecommerce6Props>) {
  return <Ecommerce6 {...withResolvedProducts(block.props, ctx.products, ctx.storefrontBaseHref, 'categoryShop')} dir={ctx.isRtl ? 'rtl' : 'ltr'} />;
}

export function Ecommerce7Block({ block, ctx }: BlockRenderProps<Ecommerce7Props>) {
  return <Ecommerce7 {...withResolvedProducts(block.props, ctx.products, ctx.storefrontBaseHref, 'tiles')} dir={ctx.isRtl ? 'rtl' : 'ltr'} />;
}

type EcommerceResolutionMode = 'default' | 'filters' | 'categoryShop' | 'tiles';

function withResolvedProducts<T extends EcommerceBlockProps>(
  props: T,
  products: Product[],
  storefrontBaseHref: string,
  mode: EcommerceResolutionMode = 'default',
): T {
  if (products.length === 0) return props;

  const selected = selectProductsForBlock(props, products, mode);
  const categories =
    mode === 'tiles' && props.tilesConfig?.tiles?.length
      ? props.categories
      : categoriesFromProducts(products, storefrontBaseHref);

  return {
    ...props,
    products: selected.map((product) => toEcommerceProduct(product, storefrontBaseHref)),
    categories,
  } as T;
}

function selectProductsForBlock(
  props: EcommerceBlockProps,
  products: Product[],
  mode: EcommerceResolutionMode,
): Product[] {
  if (mode === 'categoryShop' && props.tabbed?.tabs?.length) {
    const ids = new Set<string>();
    const allTab = props.tabbed.allTab;
    if (allTab?.enabled !== false && allTab?.mode === 'all_products') {
      return resolveCommerceProductSource(products, { source: 'all', limit: 48, hideUnavailable: true });
    }
    for (const tab of props.tabbed.tabs) {
      for (const product of resolveCommerceProductSource(products, tab.productSource)) {
        ids.add(product.id);
      }
    }
    if (allTab?.mode === 'manual') {
      for (const id of allTab.productIds ?? []) ids.add(id);
    }
    if (ids.size > 0) {
      const byId = new Map(products.map((product) => [product.id, product]));
      return Array.from(ids)
        .map((id) => byId.get(id))
        .filter((product): product is Product => Boolean(product));
    }
  }

  if (mode === 'filters') {
    return resolveCommerceProductSource(
      products,
      props.filterable?.productSource ?? props.productSource,
      props.productIds ?? [],
    );
  }

  if (mode === 'tiles') {
    const manualTileIds = new Set(
      props.tilesConfig?.tiles
        ?.flatMap((tile) =>
          tile.destination?.type === 'manual_products' ? (tile.destination.productIds ?? []) : [],
        )
        .filter(Boolean) ?? [],
    );
    if (manualTileIds.size > 0) {
      const byId = new Map(products.map((product) => [product.id, product]));
      return Array.from(manualTileIds)
        .map((id) => byId.get(id))
        .filter((product): product is Product => Boolean(product));
    }
    return resolveCommerceProductSource(products, props.productSource, props.productIds ?? []);
  }

  return resolveCommerceProductSource(products, props.productSource, props.productIds ?? []);
}

function toEcommerceProduct(product: Product, storefrontBaseHref: string): EcommerceProduct {
  return {
    id: product.id,
    name: product.title,
    price:
      product.priceQar !== null
        ? `QAR ${product.priceQar % 1 === 0 ? product.priceQar.toFixed(0) : product.priceQar.toFixed(2)}`
        : undefined,
    priceQar: product.priceQar,
    brand: product.category ?? undefined,
    category: product.category ?? undefined,
    imageUrl:
      product.imageUrl && !isVideoMediaUrl(product.imageUrl) ? product.imageUrl : undefined,
    description: product.description ?? undefined,
    href: `${storefrontBaseHref}/p/${productPathSegment(product)}`,
    available: product.status !== 'sold_out' && product.stock > 0,
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    isCustomizable: product.isCustomizable,
    customizationLabel: product.customizationLabel,
    allowCustomSize: product.allowCustomSize,
    variantOptions: product.variantOptions,
    sizeOptionPrices: product.sizeOptionPrices,
    variantOptionPrices: product.variantOptionPrices,
    requiresHeightInput: product.requiresHeightInput,
    heightInputLabel: product.heightInputLabel,
    heightOptions: product.heightOptions,
    sizes: product.sizeOptions.map((label) => ({ label })),
  };
}

function categoriesFromProducts(products: Product[], storefrontBaseHref: string): EcommerceCategory[] {
  const categories = new Map<string, EcommerceCategory>();
  for (const product of products) {
    const label = product.category?.trim();
    if (!label || categories.has(label.toLowerCase())) continue;
    categories.set(label.toLowerCase(), {
      id: slugify(label),
      label,
      tag: 'Collection',
      imageUrl:
        product.imageUrl && !isVideoMediaUrl(product.imageUrl) ? product.imageUrl : undefined,
      href: `${storefrontBaseHref}/products?category=${encodeURIComponent(label)}`,
    });
  }
  return Array.from(categories.values()).slice(0, 12);
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'collection'
  );
}
