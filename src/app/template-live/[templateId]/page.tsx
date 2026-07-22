import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Storefront } from '@/components/storefront/Storefront';
import { bootBlocksFromStorefront } from '@/lib/blocks/boot';
import { TEMPLATE_IDS, type TemplateId } from '@/lib/brief';
import { buildTemplateDemo } from '@/lib/templateDemo';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import type { Theme } from '@/lib/theme';

type Props = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ lang?: string; theme?: string }>;
};

// Each preview is keyed off the requested template + locale and is never
// a real, indexable page — mirror the dashboard preview route.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: 'Template preview · Souqna',
};

/**
 * Public, full-bleed live preview of a single template, rendered with the
 * REAL `<Storefront>` dispatcher over a synthetic in-memory storefront and
 * sample catalogue (`buildTemplateDemo`). No auth, no DB.
 *
 * This URL is both the `src` of the embedded iframe on `/templates/[id]`
 * and the target of the "See live" button. The showcase surface suppresses the
 * cart trigger + floating inquire so an errant click in the embed can't
 * pollute a visitor's real cart or fire a phantom inquiry.
 */
export default async function TemplateLivePage({ params, searchParams }: Props) {
  const { templateId: raw } = await params;
  const { lang, theme } = await searchParams;

  if (!(TEMPLATE_IDS as readonly string[]).includes(raw)) notFound();
  const templateId = raw as TemplateId;
  const locale: Locale = lang && isLocale(lang) ? lang : defaultLocale;
  const visitorTheme: Theme = theme === 'dark' ? 'dark' : 'light';

  const { data, products, categoriesBySlug } = buildTemplateDemo(templateId, locale);
  const blocks = bootBlocksFromStorefront(data);

  return (
    <Storefront
      data={data}
      products={products}
      overrideBlocks={blocks}
      visitorTheme={visitorTheme}
      categoriesBySlug={categoriesBySlug}
      navPages={[]}
      legalPolicies={[]}
      policyLocale={locale}
      surface={{ kind: 'showcase' }}
    />
  );
}
