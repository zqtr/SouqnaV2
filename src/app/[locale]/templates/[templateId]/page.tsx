import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/locales';
import { buildMetadata } from '@/lib/seo';
import { templatePresets, sortedTemplateIdsForPicker } from '@/lib/templates';
import { palettes } from '@/lib/palettes';
import { TEMPLATE_IDS, type TemplateId } from '@/lib/brief';
import { TEMPLATE_PREVIEW_BUSINESS } from '@/lib/templateDemo';
import { TemplatePreviewFrame } from '@/components/templates/TemplatePreviewFrame';
import Footer8 from '@/components/footer-8';

type Props = {
  params: Promise<{ locale: string; templateId: string }>;
};

const COPY = {
  en: {
    back: 'All templates',
    tierLabel: { free: 'Free', starter: 'Pro', pro: 'Pro+', atelier: 'Max+' },
    seeLive: 'See live',
    useTemplate: 'Use this template',
    interact: 'Load interactive preview',
    loading: 'Loading live store…',
    prev: 'Previous',
    next: 'Next',
    metaPalette: 'Palette',
    metaTier: 'Plan',
    metaPreview: 'Sample store',
    previewNote: 'Live preview with sample products. Open “See live” for the full, scrollable store.',
  },
  ar: {
    back: 'كل القوالب',
    tierLabel: { free: 'مجاني', starter: 'برو', pro: 'برو+', atelier: 'ماكس+' },
    seeLive: 'شوف مباشر',
    useTemplate: 'استخدم هالقالب',
    interact: 'عرض المعاينة التفاعلية',
    loading: 'يتم تحميل المتجر…',
    prev: 'السابق',
    next: 'التالي',
    metaPalette: 'الألوان',
    metaTier: 'الباقة',
    metaPreview: 'متجر تجريبي',
    previewNote: 'معاينة مباشرة بمنتجات تجريبية. افتح «شوف مباشر» للمتجر الكامل القابل للتمرير.',
  },
} as const;

export function generateStaticParams() {
  return TEMPLATE_IDS.map((templateId) => ({ templateId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, templateId } = await params;
  if (!isLocale(raw)) return {};
  if (!(TEMPLATE_IDS as readonly string[]).includes(templateId)) return {};
  const preset = templatePresets[templateId as TemplateId];
  const label = localizedLabel(preset.label, raw);
  return buildMetadata({
    locale: raw,
    path: `/templates/${templateId}`,
    title: `${label} — Souqna template`,
    description: preset.description,
  });
}

export default async function TemplateDetailPage({ params }: Props) {
  const { locale: raw, templateId: rawId } = await params;
  if (!isLocale(raw)) notFound();
  if (!(TEMPLATE_IDS as readonly string[]).includes(rawId)) notFound();
  const locale: Locale = raw;
  const id = rawId as TemplateId;
  setRequestLocale(locale);

  const c = COPY[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const localized = (href: string) => (locale === 'ar' ? `/ar${href}` : href);
  const preset = templatePresets[id];
  const label = localizedLabel(preset.label, locale);
  const palette = palettes[preset.palette]?.light ?? {
    ink: '#1F1B16',
    ground: '#E8DCC4',
    accent: '#C9A961',
  };
  const tierLabel = c.tierLabel[preset.tier as keyof typeof c.tierLabel] ?? preset.tier;

  const order = sortedTemplateIdsForPicker();
  const idx = order.indexOf(id);
  const prevId = order[(idx - 1 + order.length) % order.length] ?? id;
  const nextId = order[(idx + 1) % order.length] ?? id;

  const liveHref = `/template-live/${id}${locale === 'ar' ? '?lang=ar' : ''}`;
  const beginHref = localized(`/begin?template=${encodeURIComponent(id)}`);
  const posterSrc = `/templates/${id}/preview${locale === 'ar' ? '-ar' : ''}.jpg`;

  const arrow = dir === 'rtl' ? '←' : '→';
  const backArrow = dir === 'rtl' ? '→' : '←';

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        background: 'var(--sq-bg, #E8DCC4)',
        color: 'var(--sq-ink, #1F1B16)',
        fontFamily: dir === 'rtl' ? 'var(--font-arabic-text)' : 'var(--font-english)',
      }}
    >
      <main
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: 'clamp(56px, 8vw, 104px) clamp(20px, 5vw, 64px) clamp(48px, 7vw, 96px)',
        }}
      >
        <Link
          href={localized('/templates')}
          style={{
            display: 'inline-block',
            marginBottom: 28,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--sq-muted, rgba(31,27,22,0.65))',
            textDecoration: 'none',
          }}
        >
          {backArrow} {c.back}
        </Link>

        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div style={{ maxWidth: 620 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--sq-gold-deep, #8B6F2A)',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: palette.accent,
                  border: '1px solid rgba(31,27,22,0.2)',
                }}
              />
              {c.metaPreview}
              {preset.tier !== 'free' ? (
                <span
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.14em',
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: 'var(--sq-gold, #D4AF37)',
                    color: 'var(--sq-ink, #1F1B16)',
                  }}
                >
                  {tierLabel}
                </span>
              ) : null}
            </span>
            <h1
              style={{
                fontFamily: dir === 'rtl' ? 'var(--font-arabic-serif)' : 'var(--font-english)',
                fontWeight: dir === 'rtl' ? 700 : 500,
                fontSize: 'clamp(34px, 4.6vw, 60px)',
                lineHeight: dir === 'rtl' ? 1.1 : 1,
                letterSpacing: '-0.01em',
                margin: '14px 0 0',
              }}
            >
              {label}
            </h1>
            <p
              style={{
                margin: '16px 0 0',
                fontSize: 'clamp(14.5px, 1.2vw, 16.5px)',
                lineHeight: 1.6,
                color: 'var(--sq-muted, rgba(31,27,22,0.72))',
              }}
            >
              {preset.description}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a
              href={liveHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 22px',
                borderRadius: 999,
                background: 'var(--sq-ink, #1F1B16)',
                color: 'var(--sq-bg, #E8DCC4)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {c.seeLive} {arrow}
            </a>
            <Link
              href={beginHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 22px',
                borderRadius: 999,
                border: '1px solid var(--sq-rule, rgba(31,27,22,0.25))',
                background: 'transparent',
                color: 'var(--sq-ink, #1F1B16)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {c.useTemplate}
            </Link>
          </div>
        </header>

        <div style={{ marginTop: 'clamp(28px, 4vw, 44px)' }}>
          <TemplatePreviewFrame
            liveHref={liveHref}
            posterSrc={posterSrc}
            palette={palette}
            label={label}
            dir={dir}
            addressLabel={`${id}.souqna.qa`}
            interactLabel={c.interact}
            loadingLabel={c.loading}
          />
          <p
            style={{
              margin: '12px 2px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.03em',
              color: 'var(--sq-muted, rgba(31,27,22,0.55))',
            }}
          >
            {c.previewNote}
          </p>
        </div>

        <nav
          aria-label="template navigation"
          style={{
            marginTop: 'clamp(36px, 5vw, 56px)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            borderTop: '1px dashed var(--sq-rule, rgba(31,27,22,0.2))',
            paddingTop: 20,
          }}
        >
          <TemplateNavLink
            href={localized(`/templates/${prevId}`)}
            direction="prev"
            eyebrow={c.prev}
            label={localizedLabel(templatePresets[prevId].label, locale)}
            dir={dir}
          />
          <TemplateNavLink
            href={localized(`/templates/${nextId}`)}
            direction="next"
            eyebrow={c.next}
            label={localizedLabel(templatePresets[nextId].label, locale)}
            dir={dir}
          />
        </nav>
      </main>

      <Footer8 locale={locale} />
    </div>
  );
}

function TemplateNavLink({
  href,
  direction,
  eyebrow,
  label,
  dir,
}: {
  href: string;
  direction: 'prev' | 'next';
  eyebrow: string;
  label: string;
  dir: 'ltr' | 'rtl';
}) {
  const isNext = direction === 'next';
  const glyph = dir === 'rtl' ? (isNext ? '←' : '→') : isNext ? '→' : '←';
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        textAlign: isNext ? 'end' : 'start',
        textDecoration: 'none',
        color: 'inherit',
        maxWidth: '48%',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--sq-muted, rgba(31,27,22,0.55))',
        }}
      >
        {isNext ? `${eyebrow} ${glyph}` : `${glyph} ${eyebrow}`}
      </span>
      <span
        style={{
          fontFamily: dir === 'rtl' ? 'var(--font-arabic-serif)' : 'var(--font-english)',
          fontWeight: dir === 'rtl' ? 700 : 500,
          fontSize: 16,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </Link>
  );
}

/** Split the bilingual "English · Arabic" preset label to the active locale. */
function localizedLabel(label: string, locale: string): string {
  const parts = label.split('·').map((s) => s.trim());
  const en = parts[0] ?? label;
  const ar = parts[1] ?? en;
  return locale === 'ar' ? ar : en;
}
