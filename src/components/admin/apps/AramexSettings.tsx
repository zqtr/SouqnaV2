'use client';

import { type CSSProperties, useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { saveAramexAction } from '@/app/actions/apps';
import { testConnectionAction } from '@/app/actions/aramex';
import type { AramexSettings as Settings } from '@/lib/apps/aramex';
import { ARAMEX_ACCOUNT_LINKS, ARAMEX_SETTINGS_COPY } from '@/lib/apps/aramexUi';
import {
  AppSettingsCard,
  AppField,
  appInputStyle,
  appCodeInputStyle,
} from './AppSettingsCard';

function arabicAramexError(message: string): string {
  if (/sign in/i.test(message)) return 'سجّل الدخول للمتابعة.';
  if (/forbidden/i.test(message)) return 'لا تملك صلاحية تعديل إعدادات هذا المتجر.';
  if (/password.*PIN|credentials first/i.test(message)) {
    return 'أدخل كلمة مرور أرامكس والرقم السري للحساب لإكمال الإعداد.';
  }
  if (/encryption/i.test(message)) {
    return 'تعذر إعداد تشفير بيانات الاتصال على الخادم.';
  }
  if (/not accepted|connection check failed|could not reach/i.test(message)) {
    return 'تعذر الاتصال بأرامكس. تحقق من بيانات الحساب ثم حاول مرة أخرى.';
  }
  return 'تعذر حفظ إعدادات أرامكس. تحقق من الحقول ثم حاول مرة أخرى.';
}

export function AramexSettingsForm({
  storefrontSlug,
  initial,
  hasCredentials,
}: {
  storefrontSlug: string;
  initial: Settings;
  hasCredentials: boolean;
}) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const copy = ARAMEX_SETTINGS_COPY[isArabic ? 'ar' : 'en'];
  // Credentials are write-only here — the saved value lives encrypted
  // in the credential vault and never round-trips through the form.
  const [password, setPassword] = useState('');
  const [accountPin, setAccountPin] = useState('');
  const [credentialsReady, setCredentialsReady] = useState(hasCredentials);
  const [updateCreds, setUpdateCreds] = useState(!hasCredentials);
  const [testPending, startTest] = useTransition();
  const [connectionState, setConnectionState] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const [username, setUsername] = useState(initial.username);
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber);
  const [accountEntity, setAccountEntity] = useState(initial.accountEntity);
  const [accountCountry, setAccountCountry] = useState(initial.accountCountry);
  const [domesticProductType, setDomesticProductType] = useState(initial.domesticProductType);
  const [internationalProductType, setInternationalProductType] = useState(
    initial.internationalProductType,
  );
  const [pickupAddress, setPickupAddress] = useState(initial.pickupAddress);
  const [defaultWeightKg, setDefaultWeightKg] = useState<number>(initial.defaultWeightKg);
  const [dim, setDim] = useState(initial.defaultDimensionsCm);
  const legendStyle: CSSProperties = {
    padding: '0 6px',
    fontFamily: isArabic ? 'var(--font-sans)' : 'var(--font-mono)',
    fontSize: 11,
    fontWeight: isArabic ? 600 : 400,
    letterSpacing: isArabic ? 'normal' : '0.12em',
    textTransform: isArabic ? 'none' : 'uppercase',
    color: 'var(--ink-muted)',
  };

  function patchAddress(patch: Partial<Settings['pickupAddress']>) {
    setPickupAddress((prev) => ({ ...prev, ...patch }));
  }

  async function saveSettings() {
    const result = await saveAramexAction({
      storefrontSlug,
      username: username.trim(),
      accountNumber: accountNumber.trim(),
      accountEntity: accountEntity.trim().toUpperCase(),
      accountCountry: accountCountry.trim().toUpperCase(),
      domesticProductType: domesticProductType.trim().toUpperCase(),
      internationalProductType: internationalProductType.trim().toUpperCase(),
      pickupAddress,
      defaultWeightKg,
      defaultDimensionsCm: dim,
      ...(updateCreds && password ? { password } : {}),
      ...(updateCreds && accountPin ? { accountPin } : {}),
    });
    if (result.status === 'success') {
      setCredentialsReady(true);
      setUpdateCreds(false);
      setPassword('');
      setAccountPin('');
      setConnectionState(null);
    }
    if (result.status === 'error' && isArabic) {
      return { ...result, message: arabicAramexError(result.message) };
    }
    return result;
  }

  function testConnection() {
    setConnectionState(null);
    startTest(async () => {
      const result = await testConnectionAction({ storefrontSlug });
      if (result.status === 'idle') return;
      setConnectionState(
        result.status === 'success'
          ? {
              tone: 'success',
              message: copy.connected,
            }
          : {
              tone: 'error',
              message: isArabic ? arabicAramexError(result.message) : result.message,
            },
      );
    });
  }

  return (
    <div lang={isArabic ? 'ar' : 'en'} dir={isArabic ? 'rtl' : 'ltr'}>
      <AppSettingsCard
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        saveLabel={copy.save}
        onSave={saveSettings}
        footer={
          <>
          <button
            type="button"
            onClick={testConnection}
            disabled={!credentialsReady || testPending}
            style={{
              padding: '9px 15px',
              borderRadius: 8,
              border: '1px solid var(--surface-rule-strong)',
              background: 'transparent',
              color: 'var(--ink-strong)',
              fontSize: 13,
              cursor: !credentialsReady || testPending ? 'default' : 'pointer',
              opacity: !credentialsReady ? 0.55 : 1,
            }}
          >
            {testPending ? copy.testing : copy.testConnection}
          </button>
          {connectionState ? (
            <span
              role={connectionState.tone === 'error' ? 'alert' : 'status'}
              style={{
                fontSize: 12,
                color:
                  connectionState.tone === 'success'
                    ? 'var(--admin-accent)'
                    : 'var(--color-maroon, #8b3a3a)',
              }}
            >
              {connectionState.message}
            </span>
          ) : null}
          </>
        }
      >
      <fieldset
        style={{
          padding: 14,
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--ink-strong) 3%, transparent)',
          border: '1px solid var(--surface-rule)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <legend style={legendStyle}>{copy.account}</legend>
        <aside
          aria-label={copy.accountHelpLabel}
          style={{
            padding: 12,
            borderRadius: 10,
            border: '1px solid var(--surface-rule)',
            background: 'var(--surface-bg)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 12.5,
              lineHeight: 1.55,
              color: 'var(--ink-muted)',
            }}
          >
            {copy.accountHelp}
          </p>
          <nav
            aria-label={copy.credentialLinks}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 14px' }}
          >
            {ARAMEX_ACCOUNT_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  color: 'var(--admin-accent)',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                {isArabic ? link.labelAr : link.label}
                <span aria-hidden="true" dir="ltr" style={{ marginInlineStart: 4 }}>
                  ↗
                </span>
              </a>
            ))}
          </nav>
        </aside>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <AppField label={copy.username}>
            <input
              type="text"
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ws.aramex@…"
              style={appInputStyle}
            />
          </AppField>
          <AppField label={copy.accountNumber}>
            <input
              type="text"
              dir="ltr"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="20016"
              style={appCodeInputStyle}
            />
          </AppField>
          <AppField label={copy.entity} hint={copy.entityHint}>
            <input
              type="text"
              dir="ltr"
              value={accountEntity}
              onChange={(e) => setAccountEntity(e.target.value.slice(0, 8))}
              placeholder="DOH"
              style={appCodeInputStyle}
            />
          </AppField>
          <AppField label={copy.country} hint={copy.countryHint}>
            <input
              type="text"
              dir="ltr"
              value={accountCountry}
              onChange={(e) => setAccountCountry(e.target.value.slice(0, 2).toUpperCase())}
              placeholder="QA"
              style={appCodeInputStyle}
            />
          </AppField>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-muted)' }}>
          <input
            type="checkbox"
            checked={updateCreds}
            disabled={!credentialsReady}
            onChange={(e) => setUpdateCreds(e.target.checked)}
          />
          {credentialsReady
            ? copy.updateCredentials
            : copy.credentialsRequired}
        </label>
        {updateCreds ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <AppField label={copy.password}>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={appCodeInputStyle}
                autoComplete="new-password"
                required={!credentialsReady}
              />
            </AppField>
            <AppField label={copy.accountPin}>
              <input
                type="password"
                dir="ltr"
                value={accountPin}
                onChange={(e) => setAccountPin(e.target.value)}
                style={appCodeInputStyle}
                autoComplete="new-password"
                required={!credentialsReady}
              />
            </AppField>
          </div>
        ) : null}
      </fieldset>

      <fieldset
        style={{
          padding: 14,
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--ink-strong) 3%, transparent)',
          border: '1px solid var(--surface-rule)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <legend style={legendStyle}>{copy.service}</legend>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-muted)' }}>
          {copy.serviceDescription}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <AppField label={copy.domesticService} hint={copy.domesticHint}>
            <input
              type="text"
              dir="ltr"
              value={domesticProductType}
              onChange={(e) => setDomesticProductType(e.target.value.slice(0, 8).toUpperCase())}
              placeholder="OND"
              style={appCodeInputStyle}
            />
          </AppField>
          <AppField label={copy.internationalService} hint={copy.internationalHint}>
            <input
              type="text"
              dir="ltr"
              value={internationalProductType}
              onChange={(e) => setInternationalProductType(e.target.value.slice(0, 8).toUpperCase())}
              placeholder="PPX"
              style={appCodeInputStyle}
            />
          </AppField>
        </div>
      </fieldset>

      <fieldset
        style={{
          padding: 14,
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--ink-strong) 3%, transparent)',
          border: '1px solid var(--surface-rule)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <legend style={legendStyle}>{copy.pickupAddress}</legend>
        <AppField label={copy.addressLine1}>
          <input
            type="text"
            dir="auto"
            value={pickupAddress.line1}
            onChange={(e) => patchAddress({ line1: e.target.value })}
            style={appInputStyle}
          />
        </AppField>
        <AppField label={copy.addressLine2}>
          <input
            type="text"
            dir="auto"
            value={pickupAddress.line2}
            onChange={(e) => patchAddress({ line2: e.target.value })}
            style={appInputStyle}
          />
        </AppField>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
          <AppField label={copy.city}>
            <input
              type="text"
              dir="auto"
              value={pickupAddress.city}
              onChange={(e) => patchAddress({ city: e.target.value })}
              style={appInputStyle}
            />
          </AppField>
          <AppField label={copy.countryCode}>
            <input
              type="text"
              dir="ltr"
              value={pickupAddress.countryCode}
              onChange={(e) => patchAddress({ countryCode: e.target.value.slice(0, 2).toUpperCase() })}
              style={appCodeInputStyle}
            />
          </AppField>
          <AppField label={copy.postalCode}>
            <input
              type="text"
              dir="ltr"
              value={pickupAddress.postCode}
              onChange={(e) => patchAddress({ postCode: e.target.value })}
              style={appInputStyle}
            />
          </AppField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <AppField label={copy.contactName}>
            <input
              type="text"
              dir="auto"
              value={pickupAddress.contactName}
              onChange={(e) => patchAddress({ contactName: e.target.value })}
              style={appInputStyle}
            />
          </AppField>
          <AppField label={copy.contactPhone}>
            <input
              type="tel"
              dir="ltr"
              value={pickupAddress.contactPhone}
              onChange={(e) => patchAddress({ contactPhone: e.target.value })}
              style={appInputStyle}
            />
          </AppField>
          <AppField label={copy.contactEmail}>
            <input
              type="email"
              dir="ltr"
              value={pickupAddress.contactEmail}
              onChange={(e) => patchAddress({ contactEmail: e.target.value })}
              style={appInputStyle}
            />
          </AppField>
        </div>
      </fieldset>

      <fieldset
        style={{
          padding: 14,
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--ink-strong) 3%, transparent)',
          border: '1px solid var(--surface-rule)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <legend style={legendStyle}>{copy.defaultParcel}</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <AppField label={copy.weight}>
            <input
              type="number"
              dir="ltr"
              min={0.1}
              step={0.1}
              value={defaultWeightKg}
              onChange={(e) => setDefaultWeightKg(Number(e.target.value) || 1)}
              style={appInputStyle}
            />
          </AppField>
          <AppField label={copy.length}>
            <input
              type="number"
              dir="ltr"
              min={1}
              value={dim.length}
              onChange={(e) => setDim((d) => ({ ...d, length: Number(e.target.value) || 30 }))}
              style={appInputStyle}
            />
          </AppField>
          <AppField label={copy.width}>
            <input
              type="number"
              dir="ltr"
              min={1}
              value={dim.width}
              onChange={(e) => setDim((d) => ({ ...d, width: Number(e.target.value) || 20 }))}
              style={appInputStyle}
            />
          </AppField>
          <AppField label={copy.height}>
            <input
              type="number"
              dir="ltr"
              min={1}
              value={dim.height}
              onChange={(e) => setDim((d) => ({ ...d, height: Number(e.target.value) || 10 }))}
              style={appInputStyle}
            />
          </AppField>
        </div>
      </fieldset>
      </AppSettingsCard>
    </div>
  );
}
