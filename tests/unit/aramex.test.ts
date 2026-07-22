import { describe, expect, it } from 'vitest';
import { normaliseSettings, resolveAramexService } from '@/lib/apps/aramex';
import { ARAMEX_ACCOUNT_LINKS, ARAMEX_SETTINGS_COPY } from '@/lib/apps/aramexUi';
import { getAppDescriptor } from '@/lib/apps/registry';

describe('Aramex marketplace setup', () => {
  it('publishes a configurable logistics app', () => {
    const app = getAppDescriptor('aramex');

    expect(app).toMatchObject({
      id: 'aramex',
      category: 'logistics',
      available: true,
      customizable: true,
      markSrc: '/apps/aramex/mark.svg',
    });
  });

  it('links merchants to official Aramex account and credential help', () => {
    expect(ARAMEX_ACCOUNT_LINKS).toHaveLength(4);
    expect(ARAMEX_ACCOUNT_LINKS.every((link) => link.href.startsWith('https://www.aramex.com/')))
      .toBe(true);
    expect(ARAMEX_ACCOUNT_LINKS.map((link) => link.id)).toEqual([
      'business-account',
      'sign-in',
      'account-help',
      'api-docs',
    ]);
    expect(ARAMEX_ACCOUNT_LINKS.every((link) => link.labelAr.length > 0)).toBe(true);
    expect(ARAMEX_SETTINGS_COPY.ar.title).toBe('الشحن مع أرامكس');
    expect(ARAMEX_SETTINGS_COPY.ar.testConnection).toBe('اختبار الاتصال');
  });

  it('keeps backward compatibility with the original single service setting', () => {
    const domestic = normaliseSettings({
      productGroup: 'DOM',
      defaultProductType: 'onp',
    });
    const international = normaliseSettings({
      productGroup: 'EXP',
      defaultProductType: 'epx',
    });

    expect(domestic.domesticProductType).toBe('ONP');
    expect(domestic.internationalProductType).toBe('PPX');
    expect(international.domesticProductType).toBe('OND');
    expect(international.internationalProductType).toBe('EPX');
  });

  it('selects domestic or international service from the destination country', () => {
    const settings = normaliseSettings({
      accountCountry: 'qa',
      domesticProductType: 'ond',
      internationalProductType: 'ppx',
    });

    expect(resolveAramexService(settings, 'QA')).toEqual({
      productGroup: 'DOM',
      productType: 'OND',
    });
    expect(resolveAramexService(settings, 'SA')).toEqual({
      productGroup: 'EXP',
      productType: 'PPX',
    });
  });

  it('normalises an explicit per-shipment service override', () => {
    const settings = normaliseSettings({ accountCountry: 'QA' });

    expect(resolveAramexService(settings, 'AE', ' epx ')).toEqual({
      productGroup: 'EXP',
      productType: 'EPX',
    });
  });
});
