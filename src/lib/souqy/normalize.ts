import { parse } from '@babel/parser';
import type {
  ArrayExpression,
  File,
  Identifier,
  JSXAttribute,
  JSXElement,
  Node,
  ObjectExpression,
  ObjectProperty,
  StringLiteral,
  VariableDeclarator,
} from '@babel/types';
import type { SouqyOutput } from './prompt';

const THEME_KEYS = new Set([
  'palette',
  'pageBg',
  'backgroundEffect',
  'cursorEffect',
  'headingWeight',
  'sectionSpacing',
  'policyDisplayMode',
  'themeBehaviour',
  'seo',
]);

const PAGE_BG_SOURCE_KEYS = new Set([
  'pageBg',
  'bg',
  'background',
  'backgroundColor',
  'ground',
  'surface',
]);

const NAMED_COLORS = new Set([
  'black',
  'blue',
  'brown',
  'coral',
  'crimson',
  'cyan',
  'gold',
  'gray',
  'green',
  'grey',
  'indigo',
  'maroon',
  'navy',
  'olive',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'transparent',
  'violet',
  'white',
  'yellow',
]);

type Range = { start: number; end: number };

export function normalizeSouqyOutput(output: SouqyOutput): SouqyOutput {
  const themeSource = output.files['theme.ts'];
  const indexSource = output.files['index.tsx'];
  const normalizedTheme = themeSource ? normalizeThemeSource(themeSource) : themeSource;
  const normalizedIndex = indexSource ? normalizeIndexSource(indexSource) : indexSource;
  if (normalizedTheme === themeSource && normalizedIndex === indexSource) return output;
  return {
    ...output,
    files: {
      ...output.files,
      ...(normalizedIndex ? { 'index.tsx': normalizedIndex } : {}),
      ...(normalizedTheme ? { 'theme.ts': normalizedTheme } : {}),
    },
  };
}

export function normalizeThemeSource(source: string): string {
  const themeObject = getThemeObject(source);
  if (!themeObject) return source;

  let hasPageBg = false;
  let inferredPageBg: string | null = null;
  const removals: Range[] = [];

  for (const prop of themeObject.properties) {
    if (prop.type !== 'ObjectProperty') continue;
    const key = getPropertyKey(prop);
    if (!key) continue;
    if (key === 'pageBg') hasPageBg = true;
    if (THEME_KEYS.has(key)) continue;
    inferredPageBg ??= findPageBgCandidate(prop.value as Node);
    const range = getRange(prop);
    if (range) removals.push(range);
  }

  let next = removeRanges(source, removals);
  if (!hasPageBg && inferredPageBg) {
    next = insertThemeProperty(next, 'pageBg', inferredPageBg);
  }
  return next;
}

function getThemeObject(source: string): ObjectExpression | null {
  let ast: File;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript'],
    });
  } catch {
    return null;
  }
  for (const node of ast.program.body) {
    if (node.type !== 'ExportNamedDeclaration') continue;
    if (node.declaration?.type !== 'VariableDeclaration') continue;
    for (const decl of node.declaration.declarations) {
      if (decl.id.type !== 'Identifier' || decl.id.name !== 'theme') continue;
      return decl.init?.type === 'ObjectExpression' ? decl.init : null;
    }
  }
  return null;
}

function getPropertyKey(prop: ObjectProperty): string | null {
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'StringLiteral') return prop.key.value;
  return null;
}

function getRange(node: Node): Range | null {
  const range = node as Node & { start?: number | null; end?: number | null };
  if (typeof range.start !== 'number' || typeof range.end !== 'number') return null;
  return { start: range.start, end: range.end };
}

function removeRanges(source: string, ranges: Range[]): string {
  let next = source;
  for (const range of [...ranges].sort((a, b) => b.start - a.start)) {
    let from = range.start;
    let to = range.end;
    let after = to;
    while (/\s/u.test(next[after] ?? '')) after += 1;
    if (next[after] === ',') {
      to = after + 1;
    } else {
      let before = from - 1;
      while (before >= 0 && /\s/u.test(next[before] ?? '')) before -= 1;
      if (next[before] === ',') from = before;
    }
    next = next.slice(0, from) + next.slice(to);
  }
  return next;
}

function insertThemeProperty(source: string, key: string, value: string): string {
  const themeObject = getThemeObject(source);
  const range = themeObject ? getRange(themeObject) : null;
  if (!themeObject || !range) return source;

  const closeBrace = range.end - 1;
  const closeLineStart = source.lastIndexOf('\n', closeBrace) + 1;
  const closeIndent = source.slice(closeLineStart, closeBrace).match(/^\s*/u)?.[0] ?? '';
  const propIndent = `${closeIndent}  `;
  const literal = JSON.stringify(value);
  const lastProp = [...themeObject.properties].reverse().find((prop) => getRange(prop as Node));

  if (!lastProp) {
    return (
      source.slice(0, range.start + 1) +
      `\n${propIndent}${key}: ${literal},\n${closeIndent}` +
      source.slice(range.start + 1)
    );
  }

  const lastRange = getRange(lastProp as Node);
  if (!lastRange) return source;
  const commaIndex = source.indexOf(',', lastRange.end);
  if (commaIndex >= 0 && commaIndex < closeBrace) {
    return (
      source.slice(0, commaIndex + 1) +
      `\n${propIndent}${key}: ${literal},` +
      source.slice(commaIndex + 1)
    );
  }
  return (
    source.slice(0, lastRange.end) +
    `,\n${propIndent}${key}: ${literal}` +
    source.slice(lastRange.end)
  );
}

function findPageBgCandidate(node: Node): string | null {
  if (node.type === 'StringLiteral') return isCssColor(node.value) ? node.value : null;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    const value = node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('');
    return isCssColor(value) ? value : null;
  }
  if (node.type === 'ObjectExpression') {
    for (const prop of node.properties) {
      if (prop.type !== 'ObjectProperty') continue;
      const key = getPropertyKey(prop);
      if (!key || !PAGE_BG_SOURCE_KEYS.has(key)) continue;
      const value = findPageBgCandidate(prop.value as Node);
      if (value) return value;
    }
    for (const prop of node.properties) {
      if (prop.type !== 'ObjectProperty') continue;
      const value = findPageBgCandidate(prop.value as Node);
      if (value) return value;
    }
  }
  if (node.type === 'ArrayExpression') {
    for (const item of node.elements) {
      if (!item) continue;
      const value = findPageBgCandidate(item as Node);
      if (value) return value;
    }
  }
  return null;
}

function isCssColor(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^#(?:[0-9a-f]{3,8})$/iu.test(trimmed) ||
    /^(?:rgb|rgba|hsl|hsla|color)\(/iu.test(trimmed) ||
    /^var\(--[-_a-z0-9]+\)$/iu.test(trimmed) ||
    NAMED_COLORS.has(trimmed.toLowerCase())
  );
}

export function normalizeIndexSource(source: string): string {
  const ast = parseTsx(source);
  if (!ast) return source;

  const arrayTypes = collectSdkArrayVariables(ast);
  if (arrayTypes.size === 0) return source;

  const replacements: Array<{ start: number; end: number; text: string }> = [];
  const insertions: Array<{ at: number; text: string }> = [];
  const neededTypes = new Set<SdkArrayType>(arrayTypes.values());

  walk(ast as unknown as Node, (node) => {
    if (node.type !== 'VariableDeclarator') return;
    const decl = node as VariableDeclarator;
    if (decl.id.type !== 'Identifier') return;
    const type = arrayTypes.get(decl.id.name);
    if (!type || decl.init?.type !== 'ArrayExpression') return;

    if (!decl.id.typeAnnotation) {
      const range = getRange(decl.id);
      if (range) insertions.push({ at: range.end, text: `: ${type}[]` });
    }
    replacements.push(...statusReplacementsForArray(decl.init, type));
  });

  let next = applyReplacementsAndInsertions(source, replacements, insertions);
  next = ensureSdkTypeImports(next, neededTypes);
  return next;
}

type SdkArrayType = 'ServiceItem' | 'MenuItem' | 'CalendarSlot';

function parseTsx(source: string): File | null {
  try {
    return parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch {
    return null;
  }
}

function collectSdkArrayVariables(ast: File): Map<string, SdkArrayType> {
  const variables = new Map<string, SdkArrayType>();

  walk(ast as unknown as Node, (node) => {
    if (node.type !== 'JSXElement') return;
    const element = node as JSXElement;
    const opening = element.openingElement;
    if (opening.name.type !== 'JSXIdentifier') return;
    const componentName = opening.name.name;
    const propToType = jsxArrayPropType(componentName);
    if (!propToType) return;

    for (const attr of opening.attributes) {
      if (attr.type !== 'JSXAttribute') continue;
      const jsxAttr = attr as JSXAttribute;
      if (jsxAttr.name.type !== 'JSXIdentifier') continue;
      const expectedType = propToType.get(jsxAttr.name.name);
      if (!expectedType) continue;
      const identifier = jsxExpressionIdentifier(jsxAttr);
      if (identifier) variables.set(identifier.name, expectedType);
    }
  });

  return variables;
}

function jsxArrayPropType(componentName: string): Map<string, SdkArrayType> | null {
  if (componentName === 'ServiceList') return new Map([['items', 'ServiceItem']]);
  if (componentName === 'Menu') return new Map([['items', 'MenuItem']]);
  if (componentName === 'Calendar') return new Map([['slots', 'CalendarSlot']]);
  return null;
}

function jsxExpressionIdentifier(attr: JSXAttribute): Identifier | null {
  if (!attr.value || attr.value.type !== 'JSXExpressionContainer') return null;
  return attr.value.expression.type === 'Identifier' ? attr.value.expression : null;
}

function statusReplacementsForArray(
  array: ArrayExpression,
  type: SdkArrayType,
): Array<{ start: number; end: number; text: string }> {
  const replacements: Array<{ start: number; end: number; text: string }> = [];
  for (const item of array.elements) {
    if (!item || item.type !== 'ObjectExpression') continue;
    for (const prop of item.properties) {
      if (prop.type !== 'ObjectProperty') continue;
      if (getPropertyKey(prop) !== 'status') continue;
      if (prop.value.type !== 'StringLiteral') continue;
      const literal = prop.value as StringLiteral;
      const normalized = normalizeStatusLiteral(literal.value, type);
      if (!normalized || normalized === literal.value) continue;
      const range = getRange(literal);
      if (!range) continue;
      replacements.push({ start: range.start, end: range.end, text: `'${normalized}'` });
    }
  }
  return replacements;
}

function normalizeStatusLiteral(value: string, type: SdkArrayType): string | null {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/gu, '_');
  if (type === 'CalendarSlot') {
    if (['open', 'active', 'available', 'enabled', 'live', 'published', 'ready'].includes(normalized)) {
      return 'open';
    }
    if (['limited', 'few_left', 'low_capacity'].includes(normalized)) return 'limited';
    if (['full', 'sold_out', 'soldout', 'sold', 'unavailable'].includes(normalized)) return 'full';
    return null;
  }
  if (['active', 'available', 'enabled', 'live', 'open', 'published', 'ready'].includes(normalized)) {
    return 'active';
  }
  if (['sold_out', 'soldout', 'sold', 'paused', 'unavailable', 'disabled', 'full'].includes(normalized)) {
    return 'sold_out';
  }
  return null;
}

function applyReplacementsAndInsertions(
  source: string,
  replacements: Array<{ start: number; end: number; text: string }>,
  insertions: Array<{ at: number; text: string }>,
): string {
  const edits = [
    ...replacements.map((edit) => ({ start: edit.start, end: edit.end, text: edit.text })),
    ...insertions.map((edit) => ({ start: edit.at, end: edit.at, text: edit.text })),
  ].sort((a, b) => b.start - a.start || b.end - a.end);

  let next = source;
  for (const edit of edits) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  }
  return next;
}

function ensureSdkTypeImports(source: string, neededTypes: Set<SdkArrayType>): string {
  if (neededTypes.size === 0) return source;
  const missing = [...neededTypes].filter((name) => !hasSdkTypeImport(source, name));
  if (missing.length === 0) return source;

  const importLine = `import type { ${missing.sort().join(', ')} } from '@souqna/sdk';\n`;
  const lines = source.split('\n');
  let lastImportIndex = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (/^import\b/u.test(lines[index]?.trim() ?? '')) {
      lastImportIndex = index;
      break;
    }
  }
  if (lastImportIndex < 0) return importLine + source;
  lines.splice(lastImportIndex + 1, 0, importLine.trimEnd());
  return lines.join('\n');
}

function hasSdkTypeImport(source: string, typeName: string): boolean {
  const pattern = new RegExp(
    `import\\s+type\\s+\\{[^}]*\\b${escapeRegExp(typeName)}\\b[^}]*\\}\\s+from\\s+['"]@souqna/sdk['"]`,
    'u',
  );
  return pattern.test(source);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function walk(root: Node, visit: (node: Node) => void): void {
  function recurse(node: Node) {
    visit(node);
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && 'type' in (child as object)) {
            recurse(child as Node);
          }
        }
      } else if (typeof value === 'object' && 'type' in (value as object)) {
        recurse(value as Node);
      }
    }
  }
  recurse(root);
}
