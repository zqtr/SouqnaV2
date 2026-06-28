import type { Category } from './categories';
import type { Product } from './products';

export type ProductIndexCategoryOption = {
  slug: string;
  name: string;
  productCount: number;
};

export type ProductIndexListProduct = {
  id: string;
  handle: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  priceQar: number | null;
  pricingMode: 'one_time' | 'monthly_payment';
  monthlyPriceQar: number | null;
  imageUrl: string | null;
  mediaAltText: string | null;
  badges: string[];
  category: string | null;
  categorySlugs: string[];
  status: Product['status'] | string;
  stock: number;
  createdAt: string;
  isCustomizable: boolean;
  customizationLabel: string | null;
  sizeOptions: string[];
  sizeOptionPrices: Product['sizeOptionPrices'];
  allowCustomSize: boolean;
  variantOptions: string[];
  variantOptionPrices: Product['variantOptionPrices'];
  requiresHeightInput: boolean;
  heightInputLabel: string | null;
  heightOptions: string[];
};

export function buildProductIndexProducts({
  products,
  categories,
  categoriesBySlug,
}: {
  products: Product[];
  categories: Category[];
  categoriesBySlug: Map<string, Set<string>>;
}): ProductIndexListProduct[] {
  const categoryByName = new Map(
    categories.map((category) => [category.name.trim().toLowerCase(), category]),
  );
  return products.map((product) => {
    const slugs = categories
      .filter((category) => categoriesBySlug.get(category.slug)?.has(product.id))
      .map((category) => category.slug);
    const legacyCategory = product.category?.trim().toLowerCase();
    const matchingDashboardCategory = legacyCategory ? categoryByName.get(legacyCategory) : null;
    if (matchingDashboardCategory && !slugs.includes(matchingDashboardCategory.slug)) {
      slugs.push(matchingDashboardCategory.slug);
    }
    const categoryLabel =
      categories.find((category) => slugs.includes(category.slug))?.name ?? null;
    return {
      id: product.id,
      handle: product.handle,
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      priceQar: product.priceQar,
      pricingMode: product.pricingMode,
      monthlyPriceQar: product.monthlyPriceQar,
      imageUrl: product.imageUrl,
      mediaAltText: product.mediaAltText,
      badges: product.badges,
      category: categoryLabel,
      categorySlugs: slugs.filter((slug, index, all) => all.indexOf(slug) === index),
      status: product.status,
      stock: product.stock,
      createdAt: product.createdAt.toISOString(),
      isCustomizable: product.isCustomizable,
      customizationLabel: product.customizationLabel,
      sizeOptions: product.sizeOptions,
      sizeOptionPrices: product.sizeOptionPrices,
      allowCustomSize: product.allowCustomSize,
      variantOptions: product.variantOptions,
      variantOptionPrices: product.variantOptionPrices,
      requiresHeightInput: product.requiresHeightInput,
      heightInputLabel: product.heightInputLabel,
      heightOptions: product.heightOptions,
    };
  });
}

export function buildProductIndexCategories({
  products,
  categories,
  categoriesBySlug,
}: {
  products: Product[];
  categories: Category[];
  categoriesBySlug: Map<string, Set<string>>;
}): ProductIndexCategoryOption[] {
  const productIds = new Set(products.map((product) => product.id));
  return categories.map((category) => {
    const linkedIds = categoriesBySlug.get(category.slug);
    const linkedCount = linkedIds
      ? Array.from(linkedIds).filter((id) => productIds.has(id)).length
      : 0;
    const legacyMatchCount = products.filter(
      (product) =>
        product.category?.trim().toLowerCase() === category.name.trim().toLowerCase(),
    ).length;
    return {
      slug: category.slug,
      name: category.name,
      productCount: linkedCount || legacyMatchCount,
    };
  });
}
