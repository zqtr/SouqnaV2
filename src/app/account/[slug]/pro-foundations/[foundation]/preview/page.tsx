import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DashboardDocument } from '@/components/dashboard/DashboardDocument';
import { ProFoundationPreview } from '@/components/account/pro/ProFoundationPreview';
import { requireStorefrontOwner } from '@/lib/dashboard-auth';
import { getProAccess } from '@/lib/pro/entitlement';
import { isProTemplateId } from '@/lib/proMode';

export const metadata: Metadata = {
  title: 'Pro foundation preview · Souqna',
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProFoundationPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; foundation: string }>;
}) {
  const { slug, foundation } = await params;
  if (!isProTemplateId(foundation)) notFound();
  const owner = await requireStorefrontOwner(
    slug,
    `/account/${slug}/pro-foundations/${foundation}/preview`,
  );
  if (!owner.ok) return <DashboardDocument>{owner.panel}</DashboardDocument>;
  const access = await getProAccess(owner.userId);
  if (!access.enabled) notFound();
  return (
    <DashboardDocument bare lang={owner.storefront.locale} theme="light">
      <ProFoundationPreview
        foundation={foundation}
        businessName={owner.storefront.businessName}
        locale={owner.storefront.locale}
      />
    </DashboardDocument>
  );
}
