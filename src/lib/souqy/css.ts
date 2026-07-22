/**
 * Scoping pass for the model-authored `styles.css` (Open Design surface).
 *
 * The stylesheet ships inside a `<style>` on the live storefront page, so
 * every selector must be confined to the Souqy render subtree — a generated
 * `.hero { … }` can never restyle the platform chrome, checkout, or another
 * tenant's page. We prefix each selector with the scope attribute rather
 * than rewriting class names so the source the founder sees in the studio
 * matches what runs in production.
 *
 * This is a structural pass, not a security gate — `validateCss` in
 * `validate.ts` rejects the dangerous vectors (`@import`, `expression(…)`,
 * `</style>` breakouts) before anything reaches here. Both run again at
 * mount as defense in depth, so a stale DB row can't skip either.
 *
 * Deliberately a small hand tokenizer instead of a CSS parser dependency:
 * the input is bounded (48KB budget), the grammar we need is "rules,
 * at-rules, comments, strings", and a wrong parse fails safe (the rule is
 * still emitted, just scoped oddly — never unscoped).
 */

export const SOUQY_ROOT_ATTR = 'data-souqy-root';
const SCOPE = `[${SOUQY_ROOT_ATTR}]`;

/** Grouping at-rules whose blocks contain nested rules we must recurse into. */
const GROUPING_AT_RULES = new Set(['media', 'supports', 'container', 'layer', 'scope']);

export function scopeSouqyCss(css: string): string {
  return scopeBlock(css);
}

function scopeBlock(css: string): string {
  let out = '';
  let index = 0;

  while (index < css.length) {
    const char = css[index]!;

    // Preserve comments verbatim.
    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2);
      const stop = end === -1 ? css.length : end + 2;
      out += css.slice(index, stop);
      index = stop;
      continue;
    }

    if (/\s/u.test(char)) {
      out += char;
      index += 1;
      continue;
    }

    // Statement at-rule (no block) e.g. `@charset "utf-8";` or `@layer a, b;`
    // — and block at-rules, split on whichever of `;`/`{` comes first.
    const preludeEnd = findPreludeEnd(css, index);
    if (preludeEnd.terminator === ';' || preludeEnd.terminator === 'eof') {
      out += css.slice(index, preludeEnd.at + 1);
      index = preludeEnd.at + 1;
      continue;
    }

    const prelude = css.slice(index, preludeEnd.at);
    const bodyStart = preludeEnd.at + 1;
    const bodyEnd = findMatchingBrace(css, preludeEnd.at);
    const body = css.slice(bodyStart, bodyEnd);
    const closing = bodyEnd < css.length ? '}' : '';

    if (prelude.trimStart().startsWith('@')) {
      const name = atRuleName(prelude);
      if (GROUPING_AT_RULES.has(name)) {
        out += `${prelude}{${scopeBlock(body)}${closing}`;
      } else {
        // Opaque at-rules — @keyframes (from/to steps), @font-face, @page,
        // @property — hold declarations, not selectors; emit untouched.
        out += `${prelude}{${body}${closing}`;
      }
    } else {
      out += `${scopeSelectorList(prelude)}{${body}${closing}`;
    }
    index = bodyEnd + 1;
  }

  return out;
}

/** `@media (…)` → `media`; `@supports…` → `supports`. */
function atRuleName(prelude: string): string {
  const match = prelude.trimStart().match(/^@([a-zA-Z-]+)/u);
  return match?.[1]?.toLowerCase() ?? '';
}

/**
 * Scope one comma-separated selector list. Page-level selectors (`:root`,
 * `html`, `body`) target the storefront page the founder thinks of as "the
 * whole site" — remap them to the scope element itself instead of producing
 * the unmatchable `[scope] html`.
 */
function scopeSelectorList(prelude: string): string {
  const leading = prelude.match(/^\s*/u)?.[0] ?? '';
  const trailing = prelude.match(/\s*$/u)?.[0] ?? '';
  const selectors = splitTopLevel(prelude.trim(), ',');
  const scoped = selectors.map((selector) => {
    const s = selector.trim();
    if (!s) return s;
    const pageLevel = s.match(/^(?::root|html|body)(?![\w-])/u);
    if (pageLevel) {
      const rest = s.slice(pageLevel[0].length);
      return `${SCOPE}${rest}`;
    }
    return `${SCOPE} ${s}`;
  });
  return `${leading}${scoped.join(', ')}${trailing}`;
}

/** Split on a separator at nesting depth 0 (ignores (), [], strings). */
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (char === '"' || char === "'") {
      i = skipString(text, i);
      continue;
    }
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    else if (char === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** Index just past the closing quote of the string starting at `at`. */
function skipString(text: string, at: number): number {
  const quote = text[at]!;
  for (let i = at + 1; i < text.length; i += 1) {
    if (text[i] === '\\') i += 1;
    else if (text[i] === quote) return i;
  }
  return text.length;
}

type PreludeEnd = { at: number; terminator: '{' | ';' | 'eof' };

/** Find the `{` or `;` that ends the prelude starting at `from`. */
function findPreludeEnd(css: string, from: number): PreludeEnd {
  for (let i = from; i < css.length; i += 1) {
    const char = css[i]!;
    if (char === '"' || char === "'") {
      i = skipString(css, i);
      continue;
    }
    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) return { at: css.length - 1, terminator: 'eof' };
      i = end + 1;
      continue;
    }
    if (char === '{') return { at: i, terminator: '{' };
    if (char === ';') return { at: i, terminator: ';' };
  }
  return { at: css.length - 1, terminator: 'eof' };
}

/** Index of the `}` matching the `{` at `openAt` (or end of input). */
function findMatchingBrace(css: string, openAt: number): number {
  let depth = 0;
  for (let i = openAt; i < css.length; i += 1) {
    const char = css[i]!;
    if (char === '"' || char === "'") {
      i = skipString(css, i);
      continue;
    }
    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) return css.length;
      i = end + 1;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return css.length;
}
