import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://souqna.qa',
    SKIPCASH_ENV: 'sandbox',
    SKIPCASH_CLIENT_ID: 'client_123',
    SKIPCASH_KEY_ID: 'key_123',
    SKIPCASH_KEY_SECRET: 'secret_123',
  },
}));

import { getSkipCashCardDetails } from '@/lib/skipcash';

describe('getSkipCashCardDetails', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const respond = (resultObj: unknown) =>
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ resultObj }) });

  it('parses the observed live shape (last4, numeric brand, placeholder expiry)', async () => {
    respond([{ cardNumber: '8583', cardType: 1, cardExpiry: '01/2000' }]);
    const details = await getSkipCashCardDetails('tok_1');
    expect(details).toEqual({
      tokenId: 'tok_1',
      last4: '8583',
      cardType: 'Visa',
      // 01/2000 is SkipCash's no-expiry placeholder → dropped
      expiry: null,
    });
  });

  it('maps card type codes and keeps a real expiry', async () => {
    respond([{ cardNumber: '4111111111111234', cardType: 2, cardExpiry: '09/28' }]);
    const details = await getSkipCashCardDetails('tok_2');
    expect(details?.cardType).toBe('Mastercard');
    expect(details?.last4).toBe('1234');
    expect(details?.expiry).toBe('09/2028');
  });

  it('falls back to null brand for unknown codes', async () => {
    respond([{ cardNumber: '0000', cardType: 99, cardExpiry: '12/30' }]);
    const details = await getSkipCashCardDetails('tok_3');
    expect(details?.cardType).toBeNull();
    expect(details?.expiry).toBe('12/2030');
  });

  it('returns null on a non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, text: async () => 'nope' });
    await expect(getSkipCashCardDetails('tok_4')).resolves.toBeNull();
  });
});
