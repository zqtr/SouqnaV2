/**
 * blocks.json document model for the Souqy IDE code view (Phase 2).
 *
 * The editor shows `Block[]` as pretty-printed JSON. This module owns the
 * mapping between that text and block indices so the tree and the editor
 * can stay in sync, plus the *client-side* validation tier (syntax +
 * array-of-blocks shape). Full per-block Zod validation stays server-side
 * in `saveDraftBlocks` — the IDE never grows its own write path.
 *
 * Dependency-free and client-safe.
 */

export type BlockLike = { type: string } & Record<string, unknown>;

export type BlockRange = {
  /** 1-based inclusive start line of the block object in the document. */
  startLine: number;
  /** 1-based inclusive end line. */
  endLine: number;
};

export type BlocksParseResult =
  | { ok: true; blocks: BlockLike[] }
  | { ok: false; reason: 'syntax' | 'shape'; detail: string };

const INDENT = 2;

export function serializeBlocks(blocks: unknown[]): string {
  return JSON.stringify(blocks, null, INDENT);
}

/**
 * Syntax + shape check only: the document must parse and be an array of
 * objects each carrying a string `type`. Anything deeper is the server's
 * Zod schema's job.
 */
export function parseBlocksDocument(text: string): BlocksParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      reason: 'syntax',
      detail: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, reason: 'shape', detail: 'Document must be a JSON array of blocks.' };
  }
  for (let index = 0; index < parsed.length; index += 1) {
    const item = parsed[index] as unknown;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, reason: 'shape', detail: `Item ${index} is not a block object.` };
    }
    if (typeof (item as Record<string, unknown>).type !== 'string') {
      return {
        ok: false,
        reason: 'shape',
        detail: `Item ${index} is missing a string "type".`,
      };
    }
  }
  return { ok: true, blocks: parsed as BlockLike[] };
}

/**
 * Line ranges of each top-level array element in a document produced by
 * `serializeBlocks`. Works by tracking bracket/brace depth outside of
 * strings, so it stays correct after the user edits values (as long as
 * the document still parses; call `parseBlocksDocument` first).
 */
export function computeBlockRanges(text: string): BlockRange[] {
  const ranges: BlockRange[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let line = 1;
  let currentStart: number | null = null;

  for (const char of text) {
    if (char === '\n') {
      line += 1;
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{' || char === '[') {
      if (depth === 1 && char === '{' && currentStart === null) currentStart = line;
      depth += 1;
      continue;
    }
    if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 1 && char === '}' && currentStart !== null) {
        ranges.push({ startLine: currentStart, endLine: line });
        currentStart = null;
      }
    }
  }

  return ranges;
}

/** Index of the block whose range contains `line`, or -1. */
export function blockIndexForLine(ranges: BlockRange[], line: number): number {
  return ranges.findIndex((range) => line >= range.startLine && line <= range.endLine);
}

/** Human label for a block in the tree: type + best-effort title-ish prop. */
export function blockLabel(block: BlockLike): string {
  const props = (block.props ?? block) as Record<string, unknown>;
  const candidates = ['title', 'heading', 'headline', 'text', 'label', 'name'];
  for (const key of candidates) {
    const value = props[key];
    if (typeof value === 'string' && value.trim()) {
      const clean = value.trim();
      return clean.length > 34 ? `${clean.slice(0, 33)}…` : clean;
    }
  }
  return '';
}
