'use client';
import { useState, useTransition } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { saveSouqnasourceSettings } from '@/app/actions/souqnasource';
import type { SouqnasourceSettings } from '@/lib/apps/souqnasource/settings';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function SettingsForm({
  slug,
  initial,
}: {
  slug: string;
  initial: SouqnasourceSettings;
  locale: 'en' | 'ar';
}) {
  const t = useTranslations('apps.souqnasource.settings');
  const [s, setS] = useState(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const next = await saveSouqnasourceSettings(slug, s);
      setS(next);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxWidth: 480,
      }}
    >
      <Field>
        <FieldLabel>
          {t('drift')} · {(s.driftThreshold * 100).toFixed(0)}%
        </FieldLabel>
        <FieldHint>
          Notify the founder when a supplier's price moves more than this fraction.
        </FieldHint>
        <input
          type="range"
          min={0.05}
          max={0.25}
          step={0.01}
          value={s.driftThreshold}
          onChange={(e) =>
            setS((p) => ({ ...p, driftThreshold: Number(e.target.value) }))
          }
          style={{
            width: '100%',
            accentColor: 'var(--ink-strong)',
            marginTop: 6,
          }}
        />
      </Field>

      <ToggleField
        checked={s.includeUnverified}
        onChange={(v) => setS((p) => ({ ...p, includeUnverified: v }))}
        label={t('unverified')}
      />

      <ToggleField
        checked={s.emailDigestOptOut}
        onChange={(v) => setS((p) => ({ ...p, emailDigestOptOut: v }))}
        label={t('emailDigest')}
      />

      <div>
        <Button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[color:var(--ink-strong)] text-[color:var(--surface-bg)] hover:bg-[color:color-mix(in_srgb,var(--ink-strong)_88%,transparent)]"
        >
          {pending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Check data-icon="inline-start" />
          )}
          {pending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        marginBottom: 4,
      }}
    >
      {children}
    </span>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12.5,
        color: 'var(--ink-muted)',
        lineHeight: 1.5,
      }}
    >
      {children}
    </span>
  );
}

function ToggleField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 16,
          height: 16,
          accentColor: 'var(--ink-strong)',
        }}
      />
      <span style={{ fontSize: 13.5, color: 'var(--ink-strong)' }}>{label}</span>
    </label>
  );
}
