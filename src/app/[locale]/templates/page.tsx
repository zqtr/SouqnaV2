import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/locales';
import { buildMetadata } from '@/lib/seo';
import { templatePresets, sortedTemplateIdsForPicker } from '@/lib/templates';
import { palettes } from '@/lib/palettes';
import { TemplateThumb } from '@/components/templates/TemplateThumb';
import Footer8 from '@/components/footer-8';

type Props = { params: Promise<{ locale: string }> };

const COPY = {
  en: {
    eyebrow: 'Templates',
    title: 'Pick a template, ship a store.',
    intro:
      'Eleven storefront templates, all bilingual, all responsive. Each opens to a real, working store you can preview live — pick one and the first draft is already a store, not a mockup.',
    tierLabel: { free: 'Free', starter: 'Pro', pro: 'Pro+', atelier: 'Max+' },
    view: 'View template',
    seeLive: 'See live',
    backHome: 'Back to home',
  },
  ar: {
    eyebrow: 'القوالب',
    title: 'اختر قالباً وأطلق متجرك.',
    intro:
      'أحد عشر قالباً للمتجر، كلها ثنائية اللغة وتعمل على كل الأجهزة. كل قالب يفتح على متجر حقيقي شغال تقدر تعاينه مباشرة — اختر واحد وأول مسودة تكون متجر، مو مجرد صورة.',
    tierLabel: { free: 'مجاني', starter: 'برو', pro: 'برو+', atelier: 'ماكس+' },
    view: 'شوف القالب',
    seeLive: 'شوف مباشر',
    backHome: 'الرجوع للرئيسية',
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const c = COPY[raw];
  return buildMetadata({
    locale: raw,
    path: '/templates',
    title: c.title,
    description: c.intro,
  });
}

export default async function TemplatesPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);

  const c = COPY[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const localized = (href: string) => (locale === 'ar' ? `/ar${href}` : href);
  const order = sortedTemplateIdsForPicker();
  const arrow = dir === 'rtl' ? '←' : '→';

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
          maxWidth: 1400,
          margin: '0 auto',
          padding: 'clamp(64px, 9vw, 120px) clamp(20px, 5vw, 64px) clamp(48px, 7vw, 96px)',
        }}
      >
        <Link
          href={localized('/')}
          style={{
            display: 'inline-block',
            marginBottom: 32,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--sq-muted, rgba(31,27,22,0.65))',
            textDecoration: 'none',
          }}
        >
          {dir === 'rtl' ? '→' : '←'} {c.backHome}
        </Link>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--sq-gold-deep, #8B6F2A)',
            margin: '0 0 16px',
          }}
        >
          — {c.eyebrow}
        </p>
        <h1
          style={{
            fontFamily: dir === 'rtl' ? 'var(--font-arabic-serif)' : 'var(--font-english)',
            fontWeight: dir === 'rtl' ? 700 : 500,
            fontSize: 'clamp(40px, 5.5vw, 76px)',
            lineHeight: dir === 'rtl' ? 1.08 : 0.96,
            letterSpacing: '-0.01em',
            margin: 0,
            maxWidth: 920,
          }}
        >
          {c.title}
        </h1>
        <p
          style={{
            margin: '20px 0 0',
            maxWidth: 640,
            fontSize: 'clamp(15px, 1.2vw, 17px)',
            lineHeight: 1.55,
            color: 'var(--sq-muted, rgba(31,27,22,0.7))',
          }}
        >
          {c.intro}
        </p>

        <section
          aria-label={c.eyebrow}
          style={{
            marginTop: 'clamp(40px, 5vw, 64px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 'clamp(18px, 2.4vw, 28px)',
          }}
        >
          {order.map((id) => {
            const t = templatePresets[id];
            const palette = palettes[t.palette]?.light ?? {
              ink: '#1F1B16',
              ground: '#E8DCC4',
              accent: '#C9A961',
            };
            const label = t.label.split('·').map((s) => s.trim())[locale === 'ar' ? 1 : 0] || t.label;
            const tierLabel = c.tierLabel[t.tier as keyof typeof c.tierLabel] ?? t.tier;
            const detailHref = localized(`/templates/${id}`);
            const liveHref = `/template-live/${id}${locale === 'ar' ? '?lang=ar' : ''}`;
            const posterSrc = `/templates/${id}/preview${locale === 'ar' ? '-ar' : ''}.jpg`;
            return (
              <article
                key={id}
                className="sq-template-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--sq-elevated, #F1E9D7)',
                  border: '1px solid var(--sq-rule, rgba(31,27,22,0.12))',
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'transform 280ms ease, box-shadow 280ms ease, border-color 280ms ease',
                }}
              >
                <Link
                  href={detailHref}
                  aria-label={`${label} — ${c.view}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <TemplateThumb posterSrc={posterSrc} palette={palette} label={label} />
                </Link>
                <div
                  style={{
                    padding: '18px 20px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <Link
                      href={detailHref}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontFamily:
                            dir === 'rtl' ? 'var(--font-arabic-serif)' : 'var(--font-english)',
                          fontWeight: dir === 'rtl' ? 700 : 500,
                          fontSize: 19,
                          letterSpacing: '-0.005em',
                        }}
                      >
                        {label}
                      </h2>
                    </Link>
                    {t.tier !== 'free' ? (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9.5,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: 'var(--sq-gold, #D4AF37)',
                          color: 'var(--sq-ink, #1F1B16)',
                        }}
                      >
                        {tierLabel}
                      </span>
                    ) : null}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: 'var(--sq-muted, rgba(31,27,22,0.7))',
                    }}
                  >
                    {t.description}
                  </p>
                  <div
                    style={{
                      marginTop: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      paddingTop: 14,
                      borderTop: '1px dashed var(--sq-rule, rgba(31,27,22,0.18))',
                    }}
                  >
                    <Link
                      href={detailHref}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: 'var(--sq-ink, #1F1B16)',
                        textDecoration: 'none',
                      }}
                    >
                      {c.view} {arrow}
                    </Link>
                    <a
                      href={liveHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--sq-muted, rgba(31,27,22,0.6))',
                        textDecoration: 'none',
                      }}
                    >
                      {c.seeLive}
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <style>{`
        .sq-template-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 48px -24px rgba(31, 27, 22, 0.28);
          border-color: var(--sq-gold, #D4AF37);
        }
      `}</style>

      <Footer8 locale={locale} />
    </div>
  );
}
