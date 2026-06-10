import { describe, expect, it } from 'vitest';
import { parseSouqyOutput } from '@/lib/souqy/prompt';

describe('parseSouqyOutput', () => {
  it('repairs invalid JSON escapes inside generated source strings', () => {
    const invalidDollarEscape = '\\' + '$';
    const raw = `{"files":{"index.tsx":"const label = '${invalidDollarEscape}{amount}'; export default function Storefront(){ return null; }","theme.ts":"export const theme = {};"}}`;

    const parsed = parseSouqyOutput(raw);

    expect(parsed.files['index.tsx']).toContain("'\\${amount}'");
  });

  it('repairs raw newlines inside generated source strings', () => {
    const raw = `{"files":{"index.tsx":"const title = 'Souqy';
export default function Storefront(){ return null; }","theme.ts":"export const theme = {};"}}`;

    const parsed = parseSouqyOutput(raw);

    expect(parsed.files['index.tsx']).toContain("const title = 'Souqy';\nexport default");
  });
});
