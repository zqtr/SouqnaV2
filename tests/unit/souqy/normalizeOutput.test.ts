import { describe, expect, it } from 'vitest';
import { normalizeSouqyOutput } from '@/lib/souqy/normalize';
import { validateSouqyOutput } from '@/lib/souqy/validate';

const VALID_INDEX = `import { Section, Text } from '@souqna/sdk';

export default function Storefront() {
  return (
    <Section>
      <Text body="Hello" />
    </Section>
  );
}
`;

describe('normalizeSouqyOutput', () => {
  it('converts unsupported toneOverrides background into pageBg', () => {
    const normalized = normalizeSouqyOutput({
      files: {
        'index.tsx': VALID_INDEX,
        'theme.ts': `import type { ThemeOverrides } from '@souqna/sdk';

export const theme: ThemeOverrides = {
  palette: 'maroon_bone',
  toneOverrides: {
    default: { background: '#b91c1c', text: '#fff7ed' },
  },
  headingWeight: 500,
};
`,
      },
    });

    expect(normalized.files['theme.ts']).toContain("pageBg: \"#b91c1c\"");
    expect(normalized.files['theme.ts']).not.toContain('toneOverrides');
    expect(validateSouqyOutput(normalized.files)).toEqual({ ok: true });
  });

  it('normalizes service arrays before sandbox type-check', () => {
    const normalized = normalizeSouqyOutput({
      files: {
        'index.tsx': `import { ServiceList, Section } from '@souqna/sdk';

export default function Storefront() {
  const services = [
    { id: 'branding', title: 'Visual Identity', priceQar: 4500, status: 'available' },
  ];

  return (
    <Section>
      <ServiceList items={services} heading="Our services" showInquire />
    </Section>
  );
}
`,
        'theme.ts': `import type { ThemeOverrides } from '@souqna/sdk';

export const theme: ThemeOverrides = {};
`,
      },
    });

    expect(normalized.files['index.tsx']).toContain(
      "import type { ServiceItem } from '@souqna/sdk';",
    );
    expect(normalized.files['index.tsx']).toContain('const services: ServiceItem[] = [');
    expect(normalized.files['index.tsx']).toContain("status: 'active'");
    expect(validateSouqyOutput(normalized.files)).toEqual({ ok: true });
  });

  it('strips styles.css imports from index.tsx (platform attaches the sheet itself)', () => {
    const normalized = normalizeSouqyOutput({
      files: {
        'index.tsx': `import { Section, Text } from '@souqna/sdk';
import './styles.css';

export default function Storefront() {
  return (
    <Section>
      <Text body="Hello" />
    </Section>
  );
}
`,
        'theme.ts': `import type { ThemeOverrides } from '@souqna/sdk';

export const theme: ThemeOverrides = {};
`,
        'styles.css': '.hero { color: red; }\n',
      },
    });

    expect(normalized.files['index.tsx']).not.toContain('styles.css');
    expect(normalized.files['styles.css']).toContain('.hero');
    expect(validateSouqyOutput(normalized.files)).toEqual({ ok: true });
  });
});
