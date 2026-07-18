import { describe, expect, it } from 'vitest';
import { normalizeArabicDigits, parseQarPrice } from '@/lib/instagram/price';

/**
 * The price parser is the deterministic backbone of the Instagram import:
 * it backfills prices the vision model misses and is the only price path
 * when AI is unconfigured. A false positive turns a phone number into a
 * price on a live storefront, so the negative cases matter as much as the
 * positive ones.
 */
describe('normalizeArabicDigits', () => {
  it('maps Arabic-Indic and Eastern Arabic digits to ASCII', () => {
    expect(normalizeArabicDigits('٢٥٠')).toBe('250');
    expect(normalizeArabicDigits('۱۹۹')).toBe('199');
  });

  it('maps Arabic separators', () => {
    expect(normalizeArabicDigits('١٬٢٠٠٫٥٠')).toBe('1,200.50');
    expect(normalizeArabicDigits('٢٥٠، ٣٠٠')).toBe('250, 300');
  });
});

describe('parseQarPrice', () => {
  it('parses number-then-marker forms', () => {
    expect(parseQarPrice('250 QR').priceQar).toBe(250);
    expect(parseQarPrice('250QR only!').priceQar).toBe(250);
    expect(parseQarPrice('Price: 199.5 QAR').priceQar).toBe(199.5);
    expect(parseQarPrice('1,200.50 riyal').priceQar).toBe(1200.5);
    expect(parseQarPrice('٢٥٠ ر.ق').priceQar).toBe(250);
    expect(parseQarPrice('السعر ٩٩ ريال').priceQar).toBe(99);
    expect(parseQarPrice('٣٥٠ ريال قطري').priceQar).toBe(350);
  });

  it('parses marker-then-number forms', () => {
    expect(parseQarPrice('QAR 250').priceQar).toBe(250);
    expect(parseQarPrice('QR: 175').priceQar).toBe(175);
    expect(parseQarPrice('ر.ق ٤٥٠').priceQar).toBe(450);
  });

  it('resolves ranges to the lower bound', () => {
    expect(parseQarPrice('200-250 QR').priceQar).toBe(200);
    expect(parseQarPrice('QAR 300 – 350').priceQar).toBe(300);
    expect(parseQarPrice('٢٠٠-٢٥٠ ر.ق').priceQar).toBe(200);
  });

  it('takes the first price when several appear', () => {
    expect(parseQarPrice('Top 150 QR, skirt 200 QR').priceQar).toBe(150);
  });

  it('ignores bare numbers and phone numbers', () => {
    expect(parseQarPrice('250').priceQar).toBeNull();
    expect(parseQarPrice('call 55123456').priceQar).toBeNull();
    expect(parseQarPrice('whatsapp 5512 3456 to order').priceQar).toBeNull();
    expect(parseQarPrice('new drop 2024').priceQar).toBeNull();
  });

  it('ignores QR-code mentions and huge numbers', () => {
    expect(parseQarPrice('scan the QR code').priceQar).toBeNull();
    expect(parseQarPrice('55123456 QR').priceQar).toBeNull(); // > 1M cap
  });

  it('detects DM-for-price in English', () => {
    expect(parseQarPrice('DM for price')).toEqual({ priceQar: null, dmForPrice: true });
    expect(parseQarPrice('prices in DMs 💌').dmForPrice).toBe(true);
    expect(parseQarPrice('WhatsApp us for price').dmForPrice).toBe(true);
    expect(parseQarPrice('DM to order').dmForPrice).toBe(false);
  });

  it('detects DM-for-price in Arabic', () => {
    expect(parseQarPrice('السعر بالخاص').dmForPrice).toBe(true);
    expect(parseQarPrice('للطلب والاستفسار، السعر في الخاص').dmForPrice).toBe(true);
    expect(parseQarPrice('واتساب للسعر').dmForPrice).toBe(true);
  });

  it('a caption can carry both a price and a DM hint', () => {
    const result = parseQarPrice('من ٢٥٠ ر.ق والتفاصيل بالخاص');
    expect(result.priceQar).toBe(250);
    expect(result.dmForPrice).toBe(true);
  });

  it('handles null/empty input', () => {
    expect(parseQarPrice(null)).toEqual({ priceQar: null, dmForPrice: false });
    expect(parseQarPrice('')).toEqual({ priceQar: null, dmForPrice: false });
  });
});
