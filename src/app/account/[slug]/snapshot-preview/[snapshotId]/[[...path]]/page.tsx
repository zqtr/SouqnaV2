import type { Metadata } from 'next';
import { OwnerSnapshotPreviewRoute } from '@/components/storefront/OwnerSnapshotPreviewRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Easy backup preview · Souqna',
  robots: { index: false, follow: false, nocache: true },
};

export default async function SnapshotPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; snapshotId: string; path?: string[] }>;
}) {
  const { slug, snapshotId, path } = await params;
  return <OwnerSnapshotPreviewRoute slug={slug} snapshotId={snapshotId} path={path ?? []} />;
}
