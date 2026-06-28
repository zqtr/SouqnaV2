import { describe, expect, it } from 'vitest';
import {
  checkoutDeliveryFeeForBuyer,
  checkoutPaymentMethodsForBuyer,
  souqnaCityRegionForCity,
  type SouqnaCitySettings,
} from '@/lib/storefrontSettings';

const citySettings: SouqnaCitySettings = {
  enabled: true,
  autoMatchNearest: true,
  rules: [
    {
      id: 'souqna-city-al-wakrah',
      city: 'Al Wakrah',
      region: 'southern',
      enabled: true,
      paymentMethods: ['cod'],
      deliveryFeeQar: 15,
    },
    {
      id: 'souqna-city-al-khor',
      city: 'Al Khor',
      region: 'northern',
      enabled: true,
      paymentMethods: ['cod', 'fawran'],
      deliveryFeeQar: 35,
    },
  ],
};

describe('Souqna City checkout settings', () => {
  it('matches Arabic city input against English city rules', () => {
    expect(
      checkoutPaymentMethodsForBuyer(['cod', 'fawran'], true, {
        city: 'الوكرة',
        souqnaCity: citySettings,
      }),
    ).toEqual(['cod']);
    expect(checkoutDeliveryFeeForBuyer(0, 'الوكرة', citySettings)).toBe(15);
  });

  it('infers regions from Arabic city names for nearest fallback', () => {
    expect(souqnaCityRegionForCity('الخور')).toBe('northern');
    expect(souqnaCityRegionForCity('الثمامة')).toBe('southern');
  });
});
