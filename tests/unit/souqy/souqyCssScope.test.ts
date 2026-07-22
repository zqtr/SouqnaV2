import { describe, expect, it } from 'vitest';
import { scopeSouqyCss, SOUQY_ROOT_ATTR } from '@/lib/souqy/css';
import { parseSouqySource, serializeSouqySource } from '@/lib/souqy/source';

const SCOPE = `[${SOUQY_ROOT_ATTR}]`;

/**
 * Scoping is the containment guarantee for the Open Design surface: every
 * selector in the model-authored `styles.css` must be confined to the Souqy
 * render subtree so a generated `.hero` can never restyle platform chrome.
 */
describe('scopeSouqyCss', () => {
  it('prefixes simple rules and each selector in a comma list', () => {
    expect(scopeSouqyCss('.hero{color:red}')).toBe(`${SCOPE} .hero{color:red}`);
    expect(scopeSouqyCss('.a, .b h2{margin:0}')).toBe(`${SCOPE} .a, ${SCOPE} .b h2{margin:0}`);
  });

  it('remaps page-level selectors (:root, html, body) to the scope itself', () => {
    expect(scopeSouqyCss(':root{--x:1}')).toBe(`${SCOPE}{--x:1}`);
    expect(scopeSouqyCss('body .card{gap:1rem}')).toBe(`${SCOPE} .card{gap:1rem}`);
    // `.body-copy` must not be mistaken for `body`.
    expect(scopeSouqyCss('.body-copy{line-height:1.5}')).toBe(
      `${SCOPE} .body-copy{line-height:1.5}`,
    );
  });

  it('recurses into grouping at-rules', () => {
    expect(scopeSouqyCss('@media (max-width: 720px){.steps{display:block}}')).toBe(
      `@media (max-width: 720px){${SCOPE} .steps{display:block}}`,
    );
    expect(scopeSouqyCss('@supports (display: grid){.g{display:grid}}')).toBe(
      `@supports (display: grid){${SCOPE} .g{display:grid}}`,
    );
  });

  it('leaves @keyframes steps and @font-face untouched', () => {
    const keyframes = '@keyframes fade{from{opacity:0}to{opacity:1}}';
    expect(scopeSouqyCss(keyframes)).toBe(keyframes);
    const fontFace = '@font-face{font-family:"X";src:url(https://x/f.woff2)}';
    expect(scopeSouqyCss(fontFace)).toBe(fontFace);
  });

  it('passes through statement at-rules and preserves comments', () => {
    expect(scopeSouqyCss('@charset "utf-8";.x{color:red}')).toBe(
      `@charset "utf-8";${SCOPE} .x{color:red}`,
    );
    expect(scopeSouqyCss('/* brand */ .x{color:red}')).toBe(`/* brand */ ${SCOPE} .x{color:red}`);
  });

  it('does not split selectors on commas inside :is()/attribute strings', () => {
    expect(scopeSouqyCss(':is(.a, .b){color:red}')).toBe(`${SCOPE} :is(.a, .b){color:red}`);
    expect(scopeSouqyCss('[data-x="a,b"]{color:red}')).toBe(`${SCOPE} [data-x="a,b"]{color:red}`);
  });

  it('scopes realistic generated CSS end to end', () => {
    const css = [
      '.ll-process { padding: 4.5rem 1.5rem; }',
      '.ll-process-steps { display: grid; grid-template-columns: repeat(3, 1fr); }',
      '@media (max-width: 720px) { .ll-process-steps { grid-template-columns: 1fr; } }',
    ].join('\n');
    const scoped = scopeSouqyCss(css);
    expect(scoped).toContain(`${SCOPE} .ll-process {`);
    expect(scoped).toContain(`@media (max-width: 720px) { ${SCOPE} .ll-process-steps {`);
    // Nothing may survive unscoped outside at-rule preludes.
    for (const line of scoped.split('\n')) {
      if (line.startsWith('@media')) continue;
      expect(line.startsWith(SCOPE)).toBe(true);
    }
  });
});

describe('souqy source round-trip', () => {
  it('round-trips index.tsx + theme.ts + styles.css byte for byte', () => {
    const files = {
      'index.tsx': 'export default function Storefront() { return null; }\n',
      'theme.ts': 'export const theme = {};\n',
      'styles.css': '.hero { color: red; }\n',
    };
    const serialized = serializeSouqySource(files);
    const parsed = parseSouqySource(serialized);
    expect(parsed).not.toBeNull();
    expect(parsed?.['index.tsx']).toContain('Storefront');
    expect(parsed?.['styles.css']).toContain('.hero');
    expect(serializeSouqySource(parsed!)).toBe(serialized);
  });

  it('keeps legacy separator output byte-stable after parsing', () => {
    const legacy = [
      '\n//=== index.tsx ===\nexport default function Storefront() { return null; }\n',
      '\n//=== theme.ts ===\nexport const theme = {};\n',
      '\n//=== styles.css ===\n.hero { color: red; }\n',
    ].join('\n');
    const parsed = parseSouqySource(legacy);
    expect(parsed).not.toBeNull();
    expect(serializeSouqySource(parsed!)).toBe(legacy);
  });

  it('preserves an explicitly empty optional stylesheet', () => {
    const serialized = serializeSouqySource({
      'index.tsx': 'export default function Storefront() { return null; }',
      'theme.ts': 'export const theme = {};',
      'styles.css': '',
    });
    const parsed = parseSouqySource(serialized);
    expect(parsed).toHaveProperty('styles.css', '');
    expect(serializeSouqySource(parsed!)).toBe(serialized);
  });

  it('parses legacy two-file sources (pre-Open-Design revisions)', () => {
    const files = {
      'index.tsx': 'export default function Storefront() { return null; }\n',
      'theme.ts': 'export const theme = {};\n',
    };
    const parsed = parseSouqySource(serializeSouqySource(files));
    expect(parsed).not.toBeNull();
    expect(parsed?.['styles.css']).toBeUndefined();
  });
});
