import { describe, expect, it } from 'vitest';
import { CranlAiChatRequestSchema } from '@/lib/cranl/client';

describe('CranL client schemas', () => {
  it('defaults AI chat jobs to the Fanar provider', () => {
    const parsed = CranlAiChatRequestSchema.parse({
      messages: [{ role: 'user', content: 'مرحبا' }],
    });

    expect(parsed.provider).toBe('fanar');
  });
});
