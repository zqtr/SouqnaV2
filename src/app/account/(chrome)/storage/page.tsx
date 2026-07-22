import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStorefrontsForUser } from '@/lib/brief';
import {
  getStorefrontStorageUsedBytes,
  listFilesForStorefront,
  storageLimitBytesForPlan,
} from '@/lib/files';
import { getPlan } from '@/lib/billing';
import { EmptyState, PageHeader, Surface } from '@/components/admin/primitives';
import { FilesLibrary } from '@/components/admin/files/FilesLibrary';
import { StorefrontBackups } from '@/components/admin/storage/StorefrontBackups';
import { adminPhrase } from '@/components/admin/adminLocale';
import { ensureEasyDraftManifest, listStorefrontSnapshots } from '@/lib/easySnapshots';

export default async function StoragePage({
  searchParams,
}: {
  searchParams?: Promise<{
    store?: string | string[];
    section?: string | string[];
  }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/account/storage-library');
  const locale = (await cookies()).get('NEXT_LOCALE')?.value;
  const t = (text: string) => adminPhrase(locale, text);

  const sp = (await searchParams) ?? {};
  const requested = Array.isArray(sp.store) ? sp.store[0] : sp.store;
  const requestedSection = Array.isArray(sp.section) ? sp.section[0] : sp.section;
  const section = requestedSection === 'backups' ? 'backups' : 'media';
  const storefronts = await getStorefrontsForUser(userId);
  if (storefronts.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow={t('Storage')}
          title={locale === 'ar' ? 'التخزين' : 'Storage'}
          subtitle={
            locale === 'ar'
              ? 'أنشئ متجرا لتبدأ برفع صورك.'
              : 'Create a storefront to start uploading assets.'
          }
        />
        <EmptyState
          eyebrow={t('Get started')}
          title={t('Create your store first')}
          body={
            locale === 'ar'
              ? 'كل مكتبة تخزين مرتبطة بمتجر محدد حتى تبقى الصور والروابط منظمة.'
              : 'Each Storage library is scoped to one storefront so images and links stay organized.'
          }
          action={{ label: t('Create your store'), href: '/begin' }}
        />
      </>
    );
  }

  const known = storefronts.map((s) => s.slug);
  const slug = requested && known.includes(requested) ? requested : storefronts[0]!.slug;
  const store = storefronts.find((s) => s.slug === slug);

  const sectionTabs = (
    <nav
      aria-label={locale === 'ar' ? 'أقسام التخزين' : 'Storage sections'}
      className="mb-5 inline-flex rounded-xl border p-1"
      style={{
        borderColor: 'var(--surface-rule)',
        background: 'var(--surface-elevated, var(--surface-bg))',
      }}
    >
      <Link
        href={`/account/storage-library?section=media&store=${encodeURIComponent(slug)}`}
        aria-current={section === 'media' ? 'page' : undefined}
        className="rounded-lg px-4 py-2 text-sm font-medium no-underline transition-colors"
        style={{
          color: section === 'media' ? 'var(--surface-bg)' : 'var(--ink-muted)',
          background: section === 'media' ? 'var(--ink-strong)' : 'transparent',
        }}
      >
        {locale === 'ar' ? 'الوسائط' : 'Media'}
      </Link>
      <Link
        href={`/account/storage-library?section=backups&store=${encodeURIComponent(slug)}`}
        aria-current={section === 'backups' ? 'page' : undefined}
        className="rounded-lg px-4 py-2 text-sm font-medium no-underline transition-colors"
        style={{
          color: section === 'backups' ? 'var(--surface-bg)' : 'var(--ink-muted)',
          background: section === 'backups' ? 'var(--ink-strong)' : 'transparent',
        }}
      >
        {locale === 'ar' ? 'نسخ المتجر الاحتياطية' : 'Storefront backups'}
      </Link>
    </nav>
  );

  if (section === 'backups') {
    const [manifest, snapshots] = await Promise.all([
      ensureEasyDraftManifest(slug, userId),
      listStorefrontSnapshots(slug, userId),
    ]);
    return (
      <>
        <PageHeader
          eyebrow={t('Storage')}
          title={locale === 'ar' ? 'نسخ المتجر الاحتياطية' : 'Storefront backups'}
          subtitle={
            locale === 'ar'
              ? `نقاط الاسترجاع الخاصة بـ ${store?.businessName ?? slug}.`
              : `Immutable Easy recovery points for ${store?.businessName ?? slug}.`
          }
        />
        {sectionTabs}
        <Surface padding={20}>
          <StorefrontBackups
            slug={slug}
            locale={locale}
            initialEasyVersion={manifest.version}
            snapshots={snapshots}
          />
        </Surface>
      </>
    );
  }

  const [files, usedBytes, plan] = await Promise.all([
    listFilesForStorefront(slug, { limit: 1000 }).catch((err) => {
      console.error('[storage] list failed', err);
      return [] as Awaited<ReturnType<typeof listFilesForStorefront>>;
    }),
    getStorefrontStorageUsedBytes(slug).catch((err) => {
      console.error('[storage] usage failed', err);
      return 0;
    }),
    getPlan(userId),
  ]);
  const storageLimitBytes = storageLimitBytesForPlan(plan);

  return (
    <>
      <PageHeader
        eyebrow={t('Storage')}
        title={locale === 'ar' ? 'التخزين' : 'Storage'}
        subtitle={
          locale === 'ar'
            ? `مكتبة الصور الخاصة بـ ${store?.businessName ?? slug}.`
            : `Manage the image library for ${store?.businessName ?? slug}.`
        }
      />

      {sectionTabs}
      <Surface padding={20}>
        <FilesLibrary
          storefrontSlug={slug}
          initialUsedBytes={usedBytes}
          storageLimitBytes={storageLimitBytes}
          initialFiles={files.map((file) => ({
            url: file.url,
            pathname: file.pathname,
            size: file.size,
            uploadedAt: file.uploadedAt.toISOString(),
            contentType: file.contentType,
            namespace: file.namespace,
            name: file.name,
          }))}
        />
      </Surface>
    </>
  );
}
