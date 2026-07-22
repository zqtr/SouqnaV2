import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProLivePreviewRuntime } from '@/components/account/pro/ProLivePreviewRuntime';
import type { BlockContext } from '@/components/storefront/blocks/BlockContext';
import { getCopy } from '@/content/copy';
import { getStorefrontCategoryProductMap } from '@/lib/categories';
import { requireStorefrontOwner } from '@/lib/dashboard-auth';
import { getProAccess } from '@/lib/pro/entitlement';
import { getAllProducts } from '@/lib/products';
import { getVocabulary } from '@/lib/storefront-vocabulary';

export const metadata: Metadata = {
  title: 'Souqna Code Instant Draft',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProLivePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ channel?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const channelId = query.channel;
  if (!channelId || !/^[0-9a-f-]{36}$/iu.test(channelId)) notFound();

  const returnTo = `/account/${encodeURIComponent(slug)}/pro-live-preview?channel=${encodeURIComponent(channelId)}`;
  const owner = await requireStorefrontOwner(slug, returnTo);
  if (!owner.ok) return owner.panel;
  const access = await getProAccess(owner.userId);
  if (!access.enabled) notFound();

  const [products, categoriesBySlug] = await Promise.all([
    getAllProducts(slug),
    getStorefrontCategoryProductMap(slug).catch(() => new Map<string, Set<string>>()),
  ]);
  const context: BlockContext = {
    storefront: owner.storefront,
    storefrontBaseHref: '#',
    products,
    theme: owner.storefront.themeOverrides,
    copy: getCopy(owner.storefront.locale),
    vocabulary: getVocabulary(owner.storefront.locale, owner.storefront.businessType),
    isRtl: owner.storefront.locale === 'ar',
    isPreview: true,
    categoriesBySlug,
    navPages: [],
    legalPolicies: [],
    installedAppIds: [],
  };

  return <ProLivePreviewRuntime channelId={channelId} context={context} />;
}
