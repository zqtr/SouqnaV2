import type { Metadata } from 'next';
import { OwnerProPreviewRoute } from '@/components/storefront/OwnerProPreviewRoute';

export const metadata: Metadata = {
  title: 'Pro draft preview · Souqna',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProDraftPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OwnerProPreviewRoute slug={slug} />;
}
