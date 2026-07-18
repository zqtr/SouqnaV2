import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { auth } from '@clerk/nextjs/server';
import { isLocale, type Locale } from '@/i18n/locales';
import { getCopy } from '@/content/copy';
import { buildMetadata } from '@/lib/seo';
import { SouqnaBeginExperience } from '@/components/souqna/SouqnaBeginExperience';
import { igImportCapabilities } from '@/lib/instagram/capabilities';

// Server actions invoked from this route (Instagram fetch/analyze)
// inherit the segment config; the vision batches need more than the
// default budget.
export const maxDuration = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ resume?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const t = getCopy(raw);
  return buildMetadata({
    locale: raw,
    path: '/begin',
    title: `${t.begin.eyebrow} · ${t.meta.siteName}`,
    description: t.begin.sub,
  });
}

export default async function BeginPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);
  const [{ userId }, query] = await Promise.all([
    auth(),
    searchParams ?? Promise.resolve({} as { resume?: string | string[] }),
  ]);
  const resume = (Array.isArray(query.resume) ? query.resume[0] : query.resume) === '1';

  return (
    <SouqnaBeginExperience
      locale={locale}
      isSignedIn={Boolean(userId)}
      igImport={igImportCapabilities()}
      resume={resume}
    />
  );
}
