import { describe, expect, it } from 'vitest';
import {
  blockIndexForLine,
  blockLabel,
  computeBlockRanges,
  parseBlocksDocument,
  serializeBlocks,
} from '@/lib/souqy-ide/blocksDoc';

const SAMPLE_BLOCKS = [
  { type: 'hero', props: { title: 'Welcome to Doha Roasters', subtitle: 'Fresh beans' } },
  { type: 'text', props: { text: 'A paragraph with "quotes" and {braces} inside.' } },
  { type: 'productGrid', props: { title: 'Best sellers', columns: 3 } },
];

describe('souqy-ide blocks document', () => {
  it('round-trips serialize → parse', () => {
    const text = serializeBlocks(SAMPLE_BLOCKS);
    const result = parseBlocksDocument(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blocks).toEqual(SAMPLE_BLOCKS);
  });

  it('rejects invalid JSON as syntax', () => {
    const result = parseBlocksDocument('[{ "type": "hero", ]');
    expect(result).toMatchObject({ ok: false, reason: 'syntax' });
  });

  it('rejects non-array documents as shape', () => {
    expect(parseBlocksDocument('{"type":"hero"}')).toMatchObject({
      ok: false,
      reason: 'shape',
    });
  });

  it('rejects items without a string type', () => {
    expect(parseBlocksDocument('[{"props":{}}]')).toMatchObject({
      ok: false,
      reason: 'shape',
    });
    expect(parseBlocksDocument('[42]')).toMatchObject({ ok: false, reason: 'shape' });
  });

  it('computes one range per block covering its lines', () => {
    const text = serializeBlocks(SAMPLE_BLOCKS);
    const ranges = computeBlockRanges(text);
    expect(ranges).toHaveLength(3);

    const lines = text.split('\n');
    // Each range's start line opens an object at array depth.
    for (const range of ranges) {
      expect(lines[range.startLine - 1]!.trim().startsWith('{')).toBe(true);
      expect(lines[range.endLine - 1]!.trim().startsWith('}')).toBe(true);
      expect(range.endLine).toBeGreaterThan(range.startLine);
    }
    // Ranges are ordered and non-overlapping.
    expect(ranges[0]!.endLine).toBeLessThan(ranges[1]!.startLine);
    expect(ranges[1]!.endLine).toBeLessThan(ranges[2]!.startLine);
  });

  it('is not confused by braces and quotes inside strings', () => {
    const text = serializeBlocks(SAMPLE_BLOCKS);
    const ranges = computeBlockRanges(text);
    expect(ranges).toHaveLength(3);
  });

  it('maps a line to its containing block', () => {
    const text = serializeBlocks(SAMPLE_BLOCKS);
    const ranges = computeBlockRanges(text);
    expect(blockIndexForLine(ranges, ranges[1]!.startLine + 1)).toBe(1);
    expect(blockIndexForLine(ranges, 1)).toBe(-1); // opening "[" line
  });

  it('labels blocks from title-ish props with truncation', () => {
    expect(blockLabel(SAMPLE_BLOCKS[0]!)).toBe('Welcome to Doha Roasters');
    expect(blockLabel({ type: 'spacer' })).toBe('');
    expect(
      blockLabel({ type: 'text', props: { text: 'x'.repeat(50) } }).endsWith('…'),
    ).toBe(true);
  });
});
