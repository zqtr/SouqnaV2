'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArchiveRestore, Eye, LockKeyhole, ShieldCheck } from 'lucide-react';
import { restoreEasySnapshotToDraftAction } from '@/app/actions/storefrontSnapshots';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { StorefrontSnapshotSummary } from '@/lib/easySnapshots';

type Props = {
  slug: string;
  locale: string | undefined;
  initialEasyVersion: number;
  snapshots: StorefrontSnapshotSummary[];
};

export function StorefrontBackups({ slug, locale, initialEasyVersion, snapshots }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isArabic = locale === 'ar';
  const format = new Intl.DateTimeFormat(isArabic ? 'ar-QA' : 'en-QA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  function restore(snapshotId: string) {
    setError(null);
    startTransition(async () => {
      const result = await restoreEasySnapshotToDraftAction({
        slug,
        snapshotId,
        expectedEasyVersion: initialEasyVersion,
      });
      if (!result.ok) {
        setError(
          isArabic
            ? result.error === 'snapshot_stale'
              ? 'تغيّرت مسودة الوضع السهل في نافذة أخرى. حدّث الصفحة وحاول مجدداً.'
              : 'تعذّر استرجاع النسخة الاحتياطية الآن.'
            : result.message,
        );
        return;
      }
      router.push(result.data.redirectTo);
      router.refresh();
    });
  }

  if (snapshots.length === 0) {
    return (
      <div
        className="grid min-h-64 place-items-center rounded-2xl border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--surface-rule-strong)' }}
      >
        <div className="max-w-md">
          <LockKeyhole
            aria-hidden
            className="mx-auto size-8"
            style={{ color: 'var(--ink-muted)' }}
          />
          <h2 className="mt-4 text-lg font-semibold" style={{ color: 'var(--ink-strong)' }}>
            {isArabic ? 'لا توجد نسخ احتياطية بعد' : 'No storefront backups yet'}
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-muted)' }}>
            {isArabic
              ? 'سنحفظ نسخة غير قابلة للتعديل من تصميم الوضع السهل عندما تؤكد الانتقال الأول إلى Pro.'
              : 'An immutable Easy presentation backup is saved when you confirm your first conversion to Pro.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'}>
      <div
        className="mb-5 flex items-start gap-3 rounded-xl border p-4"
        style={{
          borderColor: 'color-mix(in srgb, var(--ink-strong) 12%, transparent)',
          background: 'color-mix(in srgb, var(--ink-strong) 3%, var(--surface-bg))',
        }}
      >
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--ink-strong)' }}>
            {isArabic ? 'نقاط استرجاع غير قابلة للتعديل' : 'Immutable recovery points'}
          </p>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--ink-muted)' }}>
            {isArabic
              ? 'الاسترجاع يبدّل مسودة الوضع السهل فقط. لن يتغير متجرك المنشور حتى تضغط نشر من المنشئ.'
              : 'Restore replaces only the Easy draft. Your live storefront stays unchanged until you publish from Builder.'}
          </p>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: '#b94a48', color: '#b94a48' }}
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {snapshots.map((snapshot) => {
          const captured = new Date(snapshot.createdAt);
          const previewHref = `/account/${encodeURIComponent(slug)}/snapshot-preview/${snapshot.id}`;
          return (
            <article
              key={snapshot.id}
              className="rounded-2xl border p-5"
              style={{
                borderColor: 'var(--surface-rule)',
                background: 'var(--surface-elevated, var(--surface-bg))',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    {isArabic ? 'قبل التحويل إلى Pro' : 'Pre-Pro Easy'}
                  </p>
                  <h2
                    className="mt-2 text-base font-semibold"
                    style={{ color: 'var(--ink-strong)' }}
                  >
                    <time dateTime={snapshot.createdAt}>{format.format(captured)}</time>
                  </h2>
                </div>
                <span
                  className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                  style={{ borderColor: 'var(--surface-rule)', color: 'var(--ink-muted)' }}
                >
                  {isArabic ? `${snapshot.pageCount} صفحة` : `${snapshot.pageCount} pages`}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt style={{ color: 'var(--ink-muted)' }}>
                    {isArabic ? 'حالة المتجر وقت الحفظ' : 'Capture state'}
                  </dt>
                  <dd className="mt-1 font-medium" style={{ color: 'var(--ink-strong)' }}>
                    {snapshot.wasPublished
                      ? isArabic
                        ? 'كان منشوراً'
                        : 'Published'
                      : isArabic
                        ? 'مسودة فقط'
                        : 'Draft only'}
                  </dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--ink-muted)' }}>
                    {isArabic ? 'نسخة الموافقة' : 'Consent version'}
                  </dt>
                  <dd className="mt-1 font-medium" style={{ color: 'var(--ink-strong)' }}>
                    v{snapshot.consentVersion}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={previewHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={isArabic ? 'معاينة النسخة الاحتياطية' : 'Preview storefront backup'}
                  >
                    <Eye aria-hidden />
                    {isArabic ? 'معاينة' : 'Preview'}
                  </a>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" disabled={isPending}>
                      <ArchiveRestore aria-hidden />
                      {isArabic ? 'استرجاع كمسودة' : 'Restore as draft'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir={isArabic ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                      <AlertDialogMedia>
                        <ArchiveRestore aria-hidden />
                      </AlertDialogMedia>
                      <AlertDialogTitle>
                        {isArabic ? 'استرجاع نسخة الوضع السهل؟' : 'Restore this Easy backup?'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {isArabic
                          ? 'سيتم استبدال مسودة الوضع السهل الحالية. سيبقى المتجر المنشور كما هو حتى تنشر المسودة بنفسك.'
                          : 'This replaces your current Easy draft. The live storefront remains unchanged until you explicitly publish the restored draft.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => restore(snapshot.id)}>
                        {isArabic ? 'استرجاع المسودة' : 'Restore draft'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
