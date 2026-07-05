'use client';

import { useState, useTransition, type CSSProperties } from 'react';
import { saveActivitySettingsAction } from '@/app/actions/activities';
import {
  MEASUREMENT_FIELDS,
  MEASUREMENT_LABELS,
  MEASUREMENT_UNIT,
  activityId,
  type ActivityAppId,
  type ActivityKind,
  type ActivitySettings,
  type BookingService,
  type BookingSettings,
  type FnbSettings,
  type MeasurementField,
  type MenuItem,
  type TailoringSettings,
  type TailoringStorage,
} from '@/lib/apps/activities/types';
import { Surface } from '../primitives';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = {
  storefrontSlug: string;
  appId: ActivityAppId;
  kind: ActivityKind;
  initial: ActivitySettings;
};

export function ActivitySettingsForm({ storefrontSlug, appId, kind, initial }: Props) {
  const [settings, setSettings] = useState<ActivitySettings>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveActivitySettingsAction({
        storefrontSlug,
        appId,
        settings: settings as unknown as Record<string, unknown>,
      });
      setMsg(
        res.status === 'success'
          ? { tone: 'ok', text: 'Saved.' }
          : { tone: 'err', text: res.status === 'error' ? res.message : 'Save failed.' },
      );
    });
  }

  return (
    <Surface padding={20}>
      <CheckoutNotice storefrontSlug={storefrontSlug} />

      <h3 style={headingStyle}>
        {kind === 'booking' ? 'Services & hours' : kind === 'fnb' ? 'Menu' : 'Measurements'}
      </h3>

      {kind === 'booking' ? (
        <BookingEditor value={settings as BookingSettings} onChange={setSettings} />
      ) : null}
      {kind === 'fnb' ? (
        <FnbEditor value={settings as FnbSettings} onChange={setSettings} />
      ) : null}
      {kind === 'tailoring' ? (
        <TailoringEditor value={settings as TailoringSettings} onChange={setSettings} />
      ) : null}

      <label style={{ ...rowBetween, marginTop: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-strong)' }}>Require phone number</span>
        <input
          type="checkbox"
          checked={(settings as { requirePhone: boolean }).requirePhone}
          onChange={(e) =>
            setSettings((s) => ({ ...s, requirePhone: e.target.checked }) as ActivitySettings)
          }
        />
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <button type="button" onClick={save} disabled={pending} style={primaryBtn(pending)}>
          {pending ? 'Saving…' : 'Save settings'}
        </button>
        {msg ? (
          <span
            style={{
              fontSize: 13,
              color: msg.tone === 'ok' ? 'var(--color-gold-deep)' : 'var(--color-maroon)',
            }}
          >
            {msg.text}
          </span>
        ) : null}
      </div>
    </Surface>
  );
}

/* ---------------------------- checkout notice --------------------------- */

function CheckoutNotice({ storefrontSlug }: { storefrontSlug: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 14px',
        marginBottom: 18,
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--color-gold-deep) 40%, transparent)',
        background: 'color-mix(in srgb, var(--color-gold-deep) 8%, transparent)',
      }}
    >
      <span aria-hidden style={{ fontSize: 16 }}>
        ⚑
      </span>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong style={{ fontSize: 13, color: 'var(--ink-strong)' }}>
          Finish the buyer experience in Builder
        </strong>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-muted)' }}>
          Add the activity panel to a page and review your checkout so buyers can pay smoothly after
          they book, order, or submit measurements.
        </p>
        <a
          href={`/account/builder?store=${storefrontSlug}`}
          style={{ fontSize: 12.5, color: 'var(--color-gold-deep)', width: 'fit-content' }}
        >
          Open Builder & edit checkout →
        </a>
      </div>
    </div>
  );
}

/* ------------------------------- booking -------------------------------- */

function BookingEditor({
  value,
  onChange,
}: {
  value: BookingSettings;
  onChange: (u: (s: ActivitySettings) => ActivitySettings) => void;
}) {
  function patch(p: Partial<BookingSettings>) {
    onChange((s) => ({ ...(s as BookingSettings), ...p }) as ActivitySettings);
  }
  function updateService(id: string, p: Partial<BookingService>) {
    patch({ services: value.services.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {value.services.map((svc) => (
          <div key={svc.id} style={cardRow}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                style={input}
                placeholder="Service (English)"
                value={svc.nameEn}
                onChange={(e) => updateService(svc.id, { nameEn: e.target.value })}
              />
              <input
                style={{ ...input, direction: 'rtl' }}
                placeholder="الخدمة (بالعربية)"
                value={svc.nameAr}
                onChange={(e) => updateService(svc.id, { nameAr: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <NumberField
                label="Price (QAR)"
                value={svc.priceQar}
                onChange={(n) => updateService(svc.id, { priceQar: n })}
              />
              <NumberField
                label="Minutes"
                value={svc.durationMin}
                onChange={(n) => updateService(svc.id, { durationMin: n })}
              />
              <button
                type="button"
                onClick={() => patch({ services: value.services.filter((s) => s.id !== svc.id) })}
                style={removeBtn}
                aria-label="Remove service"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        style={ghostBtn}
        onClick={() =>
          patch({
            services: [
              ...value.services,
              { id: activityId('svc'), nameEn: '', nameAr: '', priceQar: 0, durationMin: 30 },
            ],
          })
        }
      >
        + Add service
      </button>

      <div style={{ ...rowBetween, flexWrap: 'wrap', gap: 8 }}>
        <span style={miniLabel}>Open days</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {DAYS.map((d, i) => {
            const on = value.openDays.includes(i);
            return (
              <button
                key={d}
                type="button"
                onClick={() =>
                  patch({
                    openDays: on
                      ? value.openDays.filter((x) => x !== i)
                      : [...value.openDays, i].sort(),
                  })
                }
                style={dayChip(on)}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <TimeField label="Opens" value={value.openTime} onChange={(v) => patch({ openTime: v })} />
        <TimeField label="Closes" value={value.closeTime} onChange={(v) => patch({ closeTime: v })} />
        <NumberField
          label="Slot (min)"
          value={value.slotMinutes}
          onChange={(n) => patch({ slotMinutes: n })}
        />
      </div>
    </div>
  );
}

/* --------------------------------- F&B ---------------------------------- */

function FnbEditor({
  value,
  onChange,
}: {
  value: FnbSettings;
  onChange: (u: (s: ActivitySettings) => ActivitySettings) => void;
}) {
  function patch(p: Partial<FnbSettings>) {
    onChange((s) => ({ ...(s as FnbSettings), ...p }) as ActivitySettings);
  }
  function updateItem(id: string, p: Partial<MenuItem>) {
    patch({ menu: value.menu.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {value.menu.map((item) => (
          <div key={item.id} style={cardRow}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                style={input}
                placeholder="Item (English)"
                value={item.nameEn}
                onChange={(e) => updateItem(item.id, { nameEn: e.target.value })}
              />
              <input
                style={{ ...input, direction: 'rtl' }}
                placeholder="الصنف (بالعربية)"
                value={item.nameAr}
                onChange={(e) => updateItem(item.id, { nameAr: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <NumberField
                label="Price (QAR)"
                value={item.priceQar}
                onChange={(n) => updateItem(item.id, { priceQar: n })}
              />
              <NumberField
                label="Prep (min)"
                value={item.prepMinutes ?? 10}
                onChange={(n) => updateItem(item.id, { prepMinutes: n })}
              />
              <button
                type="button"
                onClick={() => patch({ menu: value.menu.filter((m) => m.id !== item.id) })}
                style={removeBtn}
                aria-label="Remove item"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        style={ghostBtn}
        onClick={() =>
          patch({
            menu: [
              ...value.menu,
              { id: activityId('itm'), nameEn: '', nameAr: '', priceQar: 0, prepMinutes: 10 },
            ],
          })
        }
      >
        + Add menu item
      </button>
      <label style={rowBetween}>
        <span style={{ fontSize: 13, color: 'var(--ink-strong)' }}>Let buyers add order notes</span>
        <input
          type="checkbox"
          checked={value.acceptNotes}
          onChange={(e) => patch({ acceptNotes: e.target.checked })}
        />
      </label>
    </div>
  );
}

/* ------------------------------ tailoring ------------------------------- */

const STORAGE_LABELS: Record<TailoringStorage, string> = {
  local: 'In-shop only (kept on your dashboard)',
  online: 'Online (buyer can reuse next visit)',
  ask: 'Let the buyer choose at submit',
};

function TailoringEditor({
  value,
  onChange,
}: {
  value: TailoringSettings;
  onChange: (u: (s: ActivitySettings) => ActivitySettings) => void;
}) {
  function patch(p: Partial<TailoringSettings>) {
    onChange((s) => ({ ...(s as TailoringSettings), ...p }) as ActivitySettings);
  }
  function toggleField(f: MeasurementField) {
    patch({
      fields: value.fields.includes(f)
        ? value.fields.filter((x) => x !== f)
        : [...value.fields, f],
    });
  }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <span style={miniLabel}>Measurements to collect</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {MEASUREMENT_FIELDS.map((f) => {
            const on = value.fields.includes(f);
            return (
              <button key={f} type="button" onClick={() => toggleField(f)} style={dayChip(on)}>
                {MEASUREMENT_LABELS[f].en} ({MEASUREMENT_UNIT[f]})
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <span style={miniLabel}>Where to save the profile</span>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {(['local', 'online', 'ask'] as TailoringStorage[]).map((opt) => (
            <label key={opt} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="radio"
                name="storage"
                checked={value.storage === opt}
                onChange={() => patch({ storage: opt })}
              />
              <span style={{ color: 'var(--ink-strong)' }}>{STORAGE_LABELS[opt]}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- fields --------------------------------- */

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label style={{ display: 'grid', gap: 3 }}>
      <span style={miniLabel}>{label}</span>
      <input
        style={{ ...input, width: 92 }}
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'grid', gap: 3 }}>
      <span style={miniLabel}>{label}</span>
      <input style={{ ...input, width: 120 }} type="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/* ------------------------------- styles --------------------------------- */

const headingStyle: CSSProperties = {
  margin: '0 0 12px',
  fontFamily: 'var(--font-serif, var(--font-sans))',
  fontWeight: 400,
  fontSize: 17,
  color: 'var(--ink-strong)',
};
const rowBetween: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};
const miniLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ink-muted)',
};
const input: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--ink-strong) 16%, transparent)',
  background: 'var(--surface-bg)',
  color: 'var(--ink-strong)',
  fontSize: 13,
};
const cardRow: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: 12,
  borderRadius: 12,
  border: '1px solid color-mix(in srgb, var(--ink-strong) 10%, transparent)',
};
function dayChip(on: boolean): CSSProperties {
  return {
    padding: '6px 11px',
    borderRadius: 999,
    border: `1px solid ${on ? 'var(--color-gold-deep)' : 'color-mix(in srgb, var(--ink-strong) 16%, transparent)'}`,
    background: on ? 'color-mix(in srgb, var(--color-gold-deep) 16%, transparent)' : 'transparent',
    color: 'var(--ink-strong)',
    fontSize: 12,
    cursor: 'pointer',
  };
}
const ghostBtn: CSSProperties = {
  padding: '9px 14px',
  borderRadius: 999,
  border: '1px dashed color-mix(in srgb, var(--ink-strong) 24%, transparent)',
  background: 'transparent',
  color: 'var(--ink-strong)',
  fontSize: 13,
  cursor: 'pointer',
  width: 'fit-content',
};
const removeBtn: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--ink-strong) 16%, transparent)',
  background: 'transparent',
  color: 'var(--ink-muted)',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
};
function primaryBtn(disabled: boolean): CSSProperties {
  return {
    padding: '10px 18px',
    borderRadius: 999,
    border: 'none',
    background: 'var(--ink-strong)',
    color: 'var(--surface-bg)',
    fontSize: 13.5,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
