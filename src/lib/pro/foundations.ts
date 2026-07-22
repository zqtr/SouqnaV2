import 'server-only';
import { serializeSouqySource, type SouqySourceFiles } from '@/lib/souqy/source';
import type { ProFoundationId } from '@/lib/proMode';

const STRUCTURE_FILES: SouqySourceFiles = {
  'index.tsx': `import {
  ContactCard,
  Custom,
  InquireCta,
  ProductGrid,
  Section,
  Stack,
  useLocale,
  useStorefront,
} from '@souqna/sdk';
import { theme } from './theme';
void theme;

export default function Storefront() {
  const sf = useStorefront();
  const isAr = useLocale() === 'ar';

  return (
    <>
      <Custom as="header" className="pro-structure-hero">
        <p className="pro-structure-index">01 / {isAr ? 'المتجر' : 'STORE'}</p>
        <h1 dir="auto">{sf.businessName}</h1>
        <p>{isAr ? 'تجارة واضحة، مبنية بعناية.' : 'Clear commerce, carefully built.'}</p>
      </Custom>
      <Section size="tight">
        <Stack direction="row" wrap justify="between" gap={16}>
          <span>{isAr ? 'مختارات المتجر' : 'Selected goods'}</span>
          <span>{isAr ? 'الدوحة، قطر' : 'Doha, Qatar'}</span>
          <span>{isAr ? 'دفع آمن' : 'Secure checkout'}</span>
        </Stack>
      </Section>
      <Section size="spacious">
        <ProductGrid layout="minimal" columns={3} limit={9} showInquire />
      </Section>
      <Section size="comfortable" tone="ink" align="center">
        <InquireCta
          eyebrow={isAr ? 'تواصل' : 'Private orders'}
          title={isAr ? 'تحتاج مساعدة في الاختيار؟' : 'Need help choosing?'}
          body={isAr ? 'فريقنا يرد عليك مباشرة.' : 'Our team will reply directly.'}
          label={isAr ? 'راسلنا' : 'Start an inquiry'}
          variant="primary"
          align="center"
        />
      </Section>
      <Section size="comfortable">
        <ContactCard heading={sf.businessName} showPhone showArea showHours showInstagram />
      </Section>
    </>
  );
}
`,
  'theme.ts': `import type { ThemeOverrides } from '@souqna/sdk';

export const theme: ThemeOverrides = {
  palette: 'pearl_ink',
  headingWeight: 600,
  sectionSpacing: 'comfortable',
  themeBehaviour: 'auto',
};
`,
  'styles.css': `.pro-structure-hero {
  min-height: min(72rem, 82vh);
  padding: clamp(1.5rem, 4vw, 4rem);
  display: grid;
  align-content: space-between;
  background: var(--sf-ground);
  color: var(--sf-ink);
  border-block-end: 1px solid color-mix(in srgb, var(--sf-ink) 18%, transparent);
}
.pro-structure-index {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
}
.pro-structure-hero h1 {
  margin: clamp(5rem, 18vh, 12rem) 0 0;
  max-width: 13ch;
  font-size: clamp(3.2rem, 11vw, 10rem);
  line-height: 0.88;
  letter-spacing: -0.07em;
  overflow-wrap: anywhere;
}
.pro-structure-hero > p:last-child {
  margin: 2rem 0 0;
  max-width: 34rem;
  font-size: clamp(1rem, 2vw, 1.4rem);
  line-height: 1.5;
}
@media (max-width: 640px) {
  .pro-structure-hero {
    min-height: 72svh;
  }
  .pro-structure-hero h1 {
    font-size: clamp(3rem, 17vw, 5.5rem);
    letter-spacing: -0.055em;
  }
}
`,
};

const MOTION_FILES: SouqySourceFiles = {
  'index.tsx': `import {
  ContactCard,
  Custom,
  InquireCta,
  Marquee,
  ProductGrid,
  Section,
  useLocale,
  useStorefront,
} from '@souqna/sdk';
import { theme } from './theme';
void theme;

export default function Storefront() {
  const sf = useStorefront();
  const isAr = useLocale() === 'ar';

  return (
    <>
      <Custom as="header" className="pro-motion-hero">
        <div className="pro-motion-orbit" aria-hidden="true" />
        <p className="pro-motion-kicker">{isAr ? 'إصدار جديد' : 'NEW RELEASE'}</p>
        <h1 dir="auto">{sf.businessName}</h1>
        <p>{isAr ? 'منتجات تتحرك بإيقاع علامتك.' : "Products moving at your brand's rhythm."}</p>
      </Custom>
      <Marquee
        speed="slow"
        items={isAr ? ['متجر مستقل', 'دفع آمن', 'صنع في الدوحة'] : ['INDEPENDENT STORE', 'SECURE CHECKOUT', 'BUILT IN DOHA']}
      />
      <Section size="spacious">
        <ProductGrid layout="cards" columns={3} limit={9} showInquire />
      </Section>
      <Section size="spacious" tone="gold" align="center">
        <InquireCta
          eyebrow={isAr ? 'الطلب الخاص' : 'Private order'}
          title={isAr ? 'فكرة مختلفة؟' : 'Something different in mind?'}
          body={isAr ? 'أرسل طلبك وسنرتبه معك.' : 'Send the brief and we will shape it with you.'}
          label={isAr ? 'ابدأ الآن' : 'Start a request'}
          variant="ghost"
          align="center"
        />
      </Section>
      <Section size="comfortable">
        <ContactCard heading={sf.businessName} showPhone showArea showInstagram />
      </Section>
    </>
  );
}
`,
  'theme.ts': `import type { ThemeOverrides } from '@souqna/sdk';

export const theme: ThemeOverrides = {
  palette: 'sand_gold',
  headingWeight: 600,
  sectionSpacing: 'spacious',
  themeBehaviour: 'dark',
};
`,
  'styles.css': `.pro-motion-hero {
  position: relative;
  min-height: min(64rem, 88vh);
  padding: clamp(1.5rem, 5vw, 5rem);
  display: grid;
  align-content: center;
  justify-items: center;
  overflow: hidden;
  text-align: center;
  background: var(--sf-ink);
  color: var(--sf-ground);
}
.pro-motion-orbit {
  position: absolute;
  width: min(66vw, 44rem);
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--sf-accent) 55%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 8rem color-mix(in srgb, var(--sf-accent) 22%, transparent);
  animation: pro-motion-pulse 7s ease-in-out infinite;
}
.pro-motion-kicker {
  position: relative;
  z-index: 1;
  margin: 0 0 1.4rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  color: var(--sf-accent);
}
.pro-motion-hero h1 {
  position: relative;
  z-index: 1;
  margin: 0;
  max-width: 11ch;
  font-size: clamp(3.4rem, 12vw, 10rem);
  line-height: 0.86;
  letter-spacing: -0.075em;
  overflow-wrap: anywhere;
}
.pro-motion-hero > p:last-child {
  position: relative;
  z-index: 1;
  margin: 2rem 0 0;
  max-width: 34rem;
  font-size: clamp(1rem, 2vw, 1.35rem);
  line-height: 1.5;
}
@keyframes pro-motion-pulse {
  0%, 100% { transform: scale(0.92) rotate(-4deg); opacity: 0.55; }
  50% { transform: scale(1.04) rotate(4deg); opacity: 1; }
}
@media (max-width: 640px) {
  .pro-motion-hero { min-height: 76svh; }
  .pro-motion-orbit { width: 118vw; }
  .pro-motion-hero h1 {
    font-size: clamp(3rem, 18vw, 6rem);
    letter-spacing: -0.055em;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pro-motion-orbit { animation: none; }
}
`,
};

const CURATED_FOUNDATIONS: Record<Exclude<ProFoundationId, 'bespoke'>, SouqySourceFiles> = {
  structure: STRUCTURE_FILES,
  motion: MOTION_FILES,
};

export function getCuratedFoundationFiles(foundation: ProFoundationId): SouqySourceFiles | null {
  if (foundation === 'bespoke') return null;
  return CURATED_FOUNDATIONS[foundation];
}

export function getCuratedFoundationSource(foundation: ProFoundationId): string | null {
  const files = getCuratedFoundationFiles(foundation);
  return files ? serializeSouqySource(files) : null;
}
