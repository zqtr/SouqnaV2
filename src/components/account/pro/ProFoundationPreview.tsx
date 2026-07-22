import type { ProFoundationId } from '@/lib/proMode';
import type { Locale } from '@/i18n/locales';

export function ProFoundationPreview({
  foundation,
  businessName,
  locale,
}: {
  foundation: ProFoundationId;
  businessName: string;
  locale: Locale;
}) {
  const isAr = locale === 'ar';
  if (foundation === 'motion') {
    return (
      <main className="pro-foundation-demo pro-foundation-motion" dir={isAr ? 'rtl' : 'ltr'}>
        <section className="pro-foundation-motion-hero">
          <span>{isAr ? 'إصدار جديد' : 'NEW RELEASE'}</span>
          <div aria-hidden />
          <h1 dir="auto">{businessName}</h1>
          <p>{isAr ? 'منتجات تتحرك بإيقاع علامتك.' : "Products moving at your brand's rhythm."}</p>
        </section>
        <div className="pro-foundation-rail">
          <span>{isAr ? 'متجر مستقل' : 'INDEPENDENT STORE'}</span>
          <span>{isAr ? 'دفع آمن' : 'SECURE CHECKOUT'}</span>
          <span>{isAr ? 'صنع في الدوحة' : 'BUILT IN DOHA'}</span>
        </div>
        <PreviewProducts locale={locale} />
        <style>{previewCss}</style>
      </main>
    );
  }

  if (foundation === 'bespoke') {
    return (
      <main className="pro-foundation-demo pro-foundation-bespoke" dir={isAr ? 'rtl' : 'ltr'}>
        <section className="pro-foundation-bespoke-hero">
          <span>{isAr ? 'مولّد من علامتك' : 'GENERATED FROM YOUR BRAND'}</span>
          <div className="pro-foundation-bespoke-mark" aria-hidden>
            {businessName.trim().slice(0, 2).toUpperCase()}
          </div>
          <h1 dir="auto">{businessName}</h1>
          <p>
            {isAr
              ? 'هذه معاينة للاتجاه. موقعك الفعلي يولّد من هوية متجرك ومنتجاته.'
              : 'Direction preview. Your actual site is generated from your store and catalogue.'}
          </p>
        </section>
        <section className="pro-foundation-bespoke-grid">
          <article>
            <span>01</span>
            <strong>{isAr ? 'هوية' : 'Identity'}</strong>
          </article>
          <article>
            <span>02</span>
            <strong>{isAr ? 'سرد' : 'Story'}</strong>
          </article>
          <article>
            <span>03</span>
            <strong>{isAr ? 'تجارة' : 'Commerce'}</strong>
          </article>
        </section>
        <style>{previewCss}</style>
      </main>
    );
  }

  return (
    <main className="pro-foundation-demo pro-foundation-structure" dir={isAr ? 'rtl' : 'ltr'}>
      <section className="pro-foundation-structure-hero">
        <span>01 / {isAr ? 'المتجر' : 'STORE'}</span>
        <h1 dir="auto">{businessName}</h1>
        <p>{isAr ? 'تجارة واضحة، مبنية بعناية.' : 'Clear commerce, carefully built.'}</p>
      </section>
      <div className="pro-foundation-rail">
        <span>{isAr ? 'مختارات المتجر' : 'SELECTED GOODS'}</span>
        <span>{isAr ? 'الدوحة، قطر' : 'DOHA, QATAR'}</span>
        <span>{isAr ? 'دفع آمن' : 'SECURE CHECKOUT'}</span>
      </div>
      <PreviewProducts locale={locale} />
      <style>{previewCss}</style>
    </main>
  );
}

function PreviewProducts({ locale }: { locale: Locale }) {
  const names =
    locale === 'ar'
      ? ['قطعة أولى', 'قطعة ثانية', 'قطعة ثالثة']
      : ['Object one', 'Object two', 'Object three'];
  return (
    <section
      className="pro-foundation-products"
      aria-label={locale === 'ar' ? 'منتجات تجريبية' : 'Example products'}
    >
      {names.map((name, index) => (
        <article key={name}>
          <div data-tone={index} aria-hidden />
          <h2>{name}</h2>
          <p>{120 + index * 75} QAR</p>
        </article>
      ))}
    </section>
  );
}

const previewCss = `
  * { box-sizing: border-box; }
  .pro-foundation-demo { min-height: 100vh; margin: 0; font-family: var(--font-sans), system-ui, sans-serif; }
  .pro-foundation-structure { background: #f3efe7; color: #161310; }
  .pro-foundation-structure-hero { min-height: 72vh; padding: clamp(24px, 5vw, 72px); display: grid; align-content: space-between; border-bottom: 1px solid #cfc7b8; }
  .pro-foundation-structure-hero > span, .pro-foundation-motion-hero > span, .pro-foundation-bespoke-hero > span { font: 700 11px/1 var(--font-mono), monospace; letter-spacing: .18em; }
  .pro-foundation-structure-hero h1 { margin: clamp(70px, 18vh, 180px) 0 0; max-width: 12ch; font-size: clamp(54px, 12vw, 156px); line-height: .86; letter-spacing: -.07em; overflow-wrap: anywhere; }
  .pro-foundation-structure-hero p { margin: 28px 0 0; font-size: clamp(17px, 2vw, 25px); }
  .pro-foundation-rail { display: flex; justify-content: space-around; gap: 24px; padding: 18px 24px; overflow: hidden; border-bottom: 1px solid currentColor; font: 700 10px/1 var(--font-mono), monospace; letter-spacing: .14em; white-space: nowrap; }
  .pro-foundation-products { padding: clamp(36px, 7vw, 92px); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(14px, 2vw, 28px); }
  .pro-foundation-products article { min-width: 0; }
  .pro-foundation-products article > div { aspect-ratio: 4/5; background: linear-gradient(145deg, #d8ccba, #8c8171); }
  .pro-foundation-products article > div[data-tone='1'] { background: linear-gradient(145deg, #756b61, #d5b77d); }
  .pro-foundation-products article > div[data-tone='2'] { background: linear-gradient(145deg, #b6aa98, #3d3834); }
  .pro-foundation-products h2 { margin: 14px 0 4px; font-size: clamp(14px, 1.5vw, 19px); }
  .pro-foundation-products p { margin: 0; opacity: .65; font: 600 12px/1.4 var(--font-mono), monospace; }
  .pro-foundation-motion { background: #10100f; color: #f2e9d8; }
  .pro-foundation-motion-hero { position: relative; min-height: 78vh; padding: clamp(24px, 5vw, 72px); display: grid; place-content: center; justify-items: center; overflow: hidden; text-align: center; }
  .pro-foundation-motion-hero > div { position: absolute; width: min(55vw, 620px); aspect-ratio: 1; border: 1px solid #d4b06a; border-radius: 50%; box-shadow: 0 0 110px rgba(212,176,106,.25); animation: foundationPulse 7s ease-in-out infinite; }
  .pro-foundation-motion-hero > span { position: relative; z-index: 1; margin-bottom: 22px; color: #d4b06a; }
  .pro-foundation-motion-hero h1 { position: relative; z-index: 1; margin: 0; max-width: 11ch; font-size: clamp(56px, 12vw, 150px); line-height: .84; letter-spacing: -.075em; overflow-wrap: anywhere; }
  .pro-foundation-motion-hero p { position: relative; z-index: 1; margin: 28px 0 0; max-width: 34rem; font-size: clamp(16px, 2vw, 24px); }
  .pro-foundation-bespoke { background: #e9ddc7; color: #221d18; }
  .pro-foundation-bespoke-hero { min-height: 72vh; padding: clamp(28px, 6vw, 90px); display: grid; grid-template-columns: minmax(0, 1fr) auto; align-content: center; gap: 24px; }
  .pro-foundation-bespoke-hero > span { grid-column: 1 / -1; color: #765c31; }
  .pro-foundation-bespoke-mark { grid-row: 2 / span 2; grid-column: 2; width: clamp(120px, 24vw, 320px); aspect-ratio: 1; display: grid; place-items: center; border: 1px solid #765c31; border-radius: 50%; font: 700 clamp(32px, 7vw, 92px)/1 var(--font-serif), serif; }
  .pro-foundation-bespoke-hero h1 { align-self: end; margin: 0; max-width: 11ch; font: 700 clamp(52px, 10vw, 138px)/.88 var(--font-serif), serif; letter-spacing: -.055em; overflow-wrap: anywhere; }
  .pro-foundation-bespoke-hero p { align-self: start; margin: 0; max-width: 38rem; font-size: clamp(16px, 2vw, 22px); line-height: 1.55; }
  .pro-foundation-bespoke-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #a89679; }
  .pro-foundation-bespoke-grid article { min-height: 190px; padding: 28px; display: grid; align-content: space-between; border-inline-end: 1px solid #a89679; }
  .pro-foundation-bespoke-grid span { font: 700 11px/1 var(--font-mono), monospace; }
  .pro-foundation-bespoke-grid strong { font: 600 clamp(25px, 4vw, 48px)/1 var(--font-serif), serif; }
  @keyframes foundationPulse { 0%,100% { transform: scale(.92) rotate(-4deg); opacity: .55; } 50% { transform: scale(1.05) rotate(4deg); opacity: 1; } }
  @media (max-width: 640px) {
    .pro-foundation-structure-hero h1, .pro-foundation-motion-hero h1 { font-size: clamp(48px, 17vw, 80px); letter-spacing: -.05em; }
    .pro-foundation-motion-hero > div { width: 116vw; }
    .pro-foundation-products { grid-template-columns: 1fr; }
    .pro-foundation-rail { justify-content: flex-start; }
    .pro-foundation-bespoke-hero { grid-template-columns: 1fr; }
    .pro-foundation-bespoke-mark { grid-row: auto; grid-column: auto; width: 130px; }
    .pro-foundation-bespoke-grid { grid-template-columns: 1fr; }
    .pro-foundation-bespoke-grid article { min-height: 120px; border-inline-end: 0; border-bottom: 1px solid #a89679; }
  }
  @media (prefers-reduced-motion: reduce) { .pro-foundation-motion-hero > div { animation: none; } }
`;
