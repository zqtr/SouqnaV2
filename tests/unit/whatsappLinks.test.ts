import { describe, expect, it } from 'vitest';
import {
  buildOrderWhatsAppUrl,
  normalizeWaMePhone,
  shouldShowOrderWhatsAppButton,
} from '@/lib/whatsappLinks';

describe('order WhatsApp link helpers', () => {
  it('normalizes Qatar local 8-digit numbers to 974', () => {
    expect(normalizeWaMePhone('5555 1234')).toBe('97455551234');
  });

  it('removes spaces, plus signs, and symbols before building wa.me links', () => {
    const url = buildOrderWhatsAppUrl({
      phone: '+974 5555-1234',
      storeName: 'Souqna Test Store',
      orderDisplayCode: 'A28C77C7',
      paymentMethod: 'skipcash',
      locale: 'en',
    });

    expect(url).toBeTruthy();
    expect(url).toContain('https://wa.me/97455551234?text=');
    expect(decodeURIComponent(url ?? '')).toContain(
      'Hi Souqna Test Store, I paid for order A28C77C7 and would like to chat about my order.',
    );
  });

  it('does not build a link when the store phone is missing', () => {
    expect(
      buildOrderWhatsAppUrl({
        phone: null,
        storeName: 'Souqna Test Store',
        orderDisplayCode: 'A28C77C7',
      }),
    ).toBeNull();
  });

  it('shows for paid, confirmed, and open cash orders', () => {
    expect(
      shouldShowOrderWhatsAppButton({
        paymentMethod: 'skipcash',
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
      }),
    ).toBe(false);
    expect(
      shouldShowOrderWhatsAppButton({
        paymentMethod: 'skipcash',
        paymentStatus: 'marked_paid',
        orderStatus: 'pending',
      }),
    ).toBe(true);
    expect(
      shouldShowOrderWhatsAppButton({
        paymentMethod: 'bank_transfer',
        paymentStatus: 'unpaid',
        orderStatus: 'confirmed',
      }),
    ).toBe(true);
    expect(
      shouldShowOrderWhatsAppButton({
        paymentMethod: 'cod',
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
      }),
    ).toBe(true);
  });

  it('uses a cash order message instead of a paid message for COD', () => {
    const url = buildOrderWhatsAppUrl({
      phone: '55551234',
      storeName: 'Souqna Test Store',
      orderDisplayCode: 'A28C77C7',
      paymentMethod: 'cod',
      locale: 'en',
    });

    const decoded = decodeURIComponent(url ?? '');
    expect(decoded).toContain(
      'Hi Souqna Test Store, I placed cash order A28C77C7 and would like to chat about my order.',
    );
    expect(decoded).not.toContain('I paid for order');
  });

  it('builds Arabic prefilled messages for Arabic storefronts', () => {
    const url = buildOrderWhatsAppUrl({
      phone: '+974 5555 1234',
      storeName: 'متجر سوقنا',
      orderDisplayCode: 'A28C77C7',
      paymentMethod: 'cod',
      locale: 'ar',
    });

    expect(decodeURIComponent(url ?? '')).toContain(
      'مرحباً متجر سوقنا، أكملت طلب الدفع عند الاستلام A28C77C7 وأرغب بالتواصل بخصوص طلبي.',
    );
  });
});
