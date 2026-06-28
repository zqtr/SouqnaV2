import { z } from 'zod';
import { recordAudit } from '@/lib/audit';
import { deleteProductRowWithSnapshot, getProduct, updateProductRow } from '@/lib/products';
import { getProductCategoryIds, setProductCategories } from '@/lib/categories';
import {
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
  searchParam,
} from '@/lib/mobile/auth';
import {
  MobileProductFieldsSchema,
  mobileProductPayload,
  revalidateMobileProductPaths,
} from '@/lib/mobile/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

const PatchSchema = MobileProductFieldsSchema.partial().extend({
  store: z.string().trim().min(1).max(64),
});

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const slug = searchParam(req, 'store');
  const gate = await requireMobileStoreAccess(slug, 'products.manage');
  if (!gate.ok) return gate.response;

  const [product, categoryIds] = await Promise.all([
    getProduct(gate.access.storefront.slug, params.id),
    getProductCategoryIds(params.id),
  ]);
  if (!product) return mobileError(404, 'not_found', 'Product not found.');
  return mobileJson({ product: { ...product, categoryIds } });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(
      400,
      'invalid_product',
      parsed.error.issues[0]?.message ?? 'Invalid product',
    );
  }
  const gate = await requireMobileStoreAccess(parsed.data.store, 'products.manage');
  if (!gate.ok) return gate.response;

  const current = await getProduct(gate.access.storefront.slug, params.id);
  if (!current) return mobileError(404, 'not_found', 'Product not found.');

  const merged = {
    store: gate.access.storefront.slug,
    title: parsed.data.title ?? current.title,
    description: parsed.data.description ?? current.description,
    priceQar: parsed.data.priceQar ?? current.priceQar,
    stock: parsed.data.stock ?? current.stock,
    imageUrl: parsed.data.imageUrl ?? current.imageUrl,
    category: parsed.data.category ?? current.category,
    categoryIds: parsed.data.categoryIds ?? (await getProductCategoryIds(params.id)),
    sizeOptions: parsed.data.sizeOptions ?? current.sizeOptionPrices,
    allowCustomSize: parsed.data.allowCustomSize ?? current.allowCustomSize,
    variantOptions: parsed.data.variantOptions ?? current.variantOptionPrices,
    requiresHeightInput: parsed.data.requiresHeightInput ?? current.requiresHeightInput,
    heightInputLabel: parsed.data.heightInputLabel ?? current.heightInputLabel,
    heightOptions: parsed.data.heightOptions ?? current.heightOptions,
    eventAt: parsed.data.eventAt ?? (current.eventAt ? current.eventAt.toISOString() : null),
    status: parsed.data.status ?? current.status,
  };

  const product = await updateProductRow(gate.access.storefront.slug, params.id, {
    ...mobileProductPayload(merged),
    subtitle: current.subtitle,
    compareAtPriceQar: current.compareAtPriceQar,
    costPerItemQar: current.costPerItemQar,
    taxable: current.taxable,
    discountEligible: current.discountEligible,
    pricingMode: current.pricingMode,
    monthlyPriceQar: current.monthlyPriceQar,
    mediaAltText: current.mediaAltText,
    productType: current.productType,
    vendor: current.vendor,
    tags: current.tags,
    templateKey: current.templateKey,
    badges: current.badges,
    handle: current.handle,
    seoTitle: current.seoTitle,
    seoDescription: current.seoDescription,
    publishedAt: current.publishedAt,
    saleStartsAt: current.saleStartsAt,
    saleEndsAt: current.saleEndsAt,
    sku: current.sku,
    barcode: current.barcode,
    trackInventory: current.trackInventory,
    continueSellingWhenOutOfStock: current.continueSellingWhenOutOfStock,
    lowStockThreshold: current.lowStockThreshold,
    restockAt: current.restockAt,
    supplierCostQar: current.supplierCostQar,
    purchaseOrderRef: current.purchaseOrderRef,
    stockStatusLabel: current.stockStatusLabel,
    minOrderQuantity: current.minOrderQuantity,
    maxOrderQuantity: current.maxOrderQuantity,
    physicalProduct: current.physicalProduct,
    weightGrams: current.weightGrams,
    packageDimensions: current.packageDimensions,
    requiresShipping: current.requiresShipping,
    freeShippingEligible: current.freeShippingEligible,
    countryOfOrigin: current.countryOfOrigin,
    hsCode: current.hsCode,
    customsDescription: current.customsDescription,
    digitalDelivery: current.digitalDelivery,
    metafields: current.metafields,
    sourceUrl: current.sourceUrl,
  });
  if (!product) return mobileError(404, 'not_found', 'Product not found.');
  await setProductCategories(gate.access.storefront.slug, product.id, merged.categoryIds ?? []);
  await recordAudit({
    storefrontSlug: gate.access.storefront.slug,
    clerkUserId: gate.user.userId,
    action: 'product.update',
    targetId: product.id,
    summary: `Updated product ${product.title}`,
    meta: { source: 'mobile', status: product.status },
  });
  revalidateMobileProductPaths(gate.access.storefront.slug);
  return mobileJson({ product });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const slug = searchParam(req, 'store');
  const gate = await requireMobileStoreAccess(slug, 'products.manage');
  if (!gate.ok) return gate.response;

  const product = await deleteProductRowWithSnapshot(gate.access.storefront.slug, params.id);
  if (!product) return mobileError(404, 'not_found', 'Product not found.');
  await recordAudit({
    storefrontSlug: gate.access.storefront.slug,
    clerkUserId: gate.user.userId,
    action: 'product.delete',
    targetId: product.id,
    summary: `Deleted product ${product.title}`,
    meta: { source: 'mobile' },
  });
  revalidateMobileProductPaths(gate.access.storefront.slug);
  return mobileJson({ ok: true });
}
