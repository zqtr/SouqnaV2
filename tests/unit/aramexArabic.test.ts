import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useLocale: () => 'ar' }));
vi.mock('@/app/actions/apps', () => ({ saveAramexAction: vi.fn() }));
vi.mock('@/app/actions/aramex', () => ({ testConnectionAction: vi.fn() }));

import { AramexSettingsForm } from '@/components/admin/apps/AramexSettings';

describe('Aramex Arabic settings', () => {
  it('renders Arabic copy in RTL while preserving technical fields as LTR', () => {
    const html = renderToStaticMarkup(
      createElement(AramexSettingsForm, {
        storefrontSlug: 'testy',
        hasCredentials: false,
        initial: {
          username: '',
          password: '',
          accountNumber: '',
          accountPin: '',
          accountEntity: 'DOH',
          accountCountry: 'QA',
          domesticProductType: 'OND',
          internationalProductType: 'PPX',
          pickupAddress: {
            line1: '',
            line2: '',
            city: 'Doha',
            countryCode: 'QA',
            postCode: '',
            contactName: '',
            contactPhone: '',
            contactEmail: '',
          },
          defaultWeightKg: 1,
          defaultDimensionsCm: { length: 30, width: 20, height: 10 },
        },
      }),
    );

    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain('الشحن مع أرامكس');
    expect(html).toContain('اختبار الاتصال');
    expect(html).toContain('العثور على رقم الحساب أو طلب الرقم السري');
    expect(html).toContain('dir="ltr"');
  });
});
