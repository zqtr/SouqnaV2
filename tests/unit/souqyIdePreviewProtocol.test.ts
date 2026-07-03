import { describe, expect, it } from 'vitest';
import { parsePreviewChildMessage } from '@/lib/souqy-ide/previewProtocol';

describe('souqy-ide preview protocol', () => {
  it('parses a valid select message', () => {
    expect(parsePreviewChildMessage({ type: 'souqna:select', blockId: 'b1' })).toEqual({
      type: 'souqna:select',
      blockId: 'b1',
    });
  });

  it('rejects other message types and malformed payloads', () => {
    expect(parsePreviewChildMessage({ type: 'souqna:reload' })).toBeNull();
    expect(parsePreviewChildMessage({ type: 'souqna:select' })).toBeNull();
    expect(parsePreviewChildMessage({ type: 'souqna:select', blockId: '' })).toBeNull();
    expect(parsePreviewChildMessage({ type: 'souqna:select', blockId: 42 })).toBeNull();
    expect(parsePreviewChildMessage(null)).toBeNull();
    expect(parsePreviewChildMessage('souqna:select')).toBeNull();
  });
});
