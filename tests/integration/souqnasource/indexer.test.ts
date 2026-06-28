import { describe, expect, it } from 'vitest';
import { GET, POST } from '@/app/api/apps/souqnasource/cron/index/route';

describe('removed SouqnaSource indexer cron', () => {
  it('returns the removed endpoint contract for GET and POST', async () => {
    for (const handler of [GET, POST]) {
      const res = await handler(new Request('http://t/api/apps/souqnasource/cron/index'));
      const body = (await res.json()) as { error?: string; ok?: boolean };

      expect(res.status).toBe(410);
      expect(body).toEqual({ ok: false, error: 'souqnasource_removed' });
    }
  });
});
