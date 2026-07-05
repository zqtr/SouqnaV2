'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useCart } from '../cart/CartContext';
import {
  getActivityPublicConfig,
  submitActivityAction,
  type ActivityPublicConfig,
} from '@/app/actions/activities';
import {
  MEASUREMENT_LABELS,
  MEASUREMENT_UNIT,
  type ActivityAppId,
  type BookingSettings,
  type FnbSettings,
  type TailoringSettings,
} from '@/lib/apps/activities/types';

type Props = {
  storefrontSlug: string;
  appId: ActivityAppId;
  isRtl: boolean;
  title?: string;
};

function copy(isRtl: boolean) {
  return isRtl
    ? {
        loading: 'جارٍ التحميل…',
        unavailable: 'هذه الخدمة غير متاحة حالياً.',
        name: 'الاسم',
        phone: 'رقم الهاتف',
        service: 'اختر الخدمة',
        date: 'التاريخ',
        time: 'الوقت',
        closedDay: 'المتجر مغلق في هذا اليوم.',
        pickTime: 'اختر الوقت',
        book: 'احجز وأضف للسلة',
        order: 'أضف الطلب للسلة',
        saveMeasure: 'احفظ القياسات وأكمل',
        notes: 'ملاحظات',
        total: 'الإجمالي',
        storage: 'أين تُحفظ القياسات؟',
        storageLocal: 'في المتجر فقط',
        storageOnline: 'أونلاين (لاستخدامها لاحقاً)',
        min: 'دقيقة',
        added: 'تمت الإضافة إلى السلة',
        qty: 'الكمية',
        empty: 'أضف صنفاً واحداً على الأقل.',
      }
    : {
        loading: 'Loading…',
        unavailable: 'This service is not available right now.',
        name: 'Your name',
        phone: 'Phone number',
        service: 'Choose a service',
        date: 'Date',
        time: 'Time',
        closedDay: 'The shop is closed on this day.',
        pickTime: 'Pick a time',
        book: 'Book & add to cart',
        order: 'Add order to cart',
        saveMeasure: 'Save measurements & continue',
        notes: 'Notes',
        total: 'Total',
        storage: 'Where should we save your measurements?',
        storageLocal: 'In-shop only',
        storageOnline: 'Online (reuse next time)',
        min: 'min',
        added: 'Added to your cart',
        qty: 'Qty',
        empty: 'Add at least one item.',
      };
}

export function ActivityFlow({ storefrontSlug, appId, isRtl, title }: Props) {
  const cart = useCart();
  const t = copy(isRtl);
  const [config, setConfig] = useState<ActivityPublicConfig | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // booking state
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  // fnb state
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  // tailoring state
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [storage, setStorage] = useState<'local' | 'online'>('local');

  useEffect(() => {
    let live = true;
    getActivityPublicConfig({ storefrontSlug, appId }).then((c) => {
      if (live) setConfig(c);
    });
    return () => {
      live = false;
    };
  }, [storefrontSlug, appId]);

  if (!config) return <Shell title={title}>{<p style={muted}>{t.loading}</p>}</Shell>;
  if (config.status === 'unavailable')
    return <Shell title={title}>{<p style={muted}>{t.unavailable}</p>}</Shell>;

  const kind = config.kind;

  async function submit(payload: Record<string, unknown>) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitActivityAction({ storefrontSlug, appId, customerName: name, phone, ...payload });
      if (res.status !== 'ok') {
        setError(res.message);
        return;
      }
      if (cart.enabled) {
        cart.add(
          {
            productId: `activity:${appId}:${res.id}`,
            title: res.title,
            priceQar: res.priceQar,
            customInputs: { activity: appId, ...res.meta },
          },
          1,
        );
        cart.open();
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Shell title={title}>
        <p style={{ ...muted, color: 'var(--sf-accent)' }}>✓ {t.added}</p>
      </Shell>
    );
  }

  return (
    <Shell title={title}>
      {kind === 'booking' ? (
        <BookingForm
          s={config.settings as BookingSettings}
          isRtl={isRtl}
          t={t}
          serviceId={serviceId}
          setServiceId={setServiceId}
          date={date}
          setDate={setDate}
          time={time}
          setTime={setTime}
        />
      ) : null}
      {kind === 'fnb' ? (
        <FnbForm
          s={config.settings as FnbSettings}
          isRtl={isRtl}
          t={t}
          qtys={qtys}
          setQtys={setQtys}
          notes={notes}
          setNotes={setNotes}
        />
      ) : null}
      {kind === 'tailoring' ? (
        <TailoringForm
          s={config.settings as TailoringSettings}
          isRtl={isRtl}
          t={t}
          measurements={measurements}
          setMeasurements={setMeasurements}
          storage={storage}
          setStorage={setStorage}
        />
      ) : null}

      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <input style={field} placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} />
        <input
          style={field}
          placeholder={t.phone}
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {error ? <p style={{ ...muted, color: 'var(--sf-accent)', marginTop: 8 }}>{error}</p> : null}

      <button
        type="button"
        disabled={submitting}
        onClick={() => {
          if (kind === 'booking') void submit({ serviceId, date, time });
          else if (kind === 'fnb')
            void submit({
              items: Object.entries(qtys)
                .filter(([, q]) => q > 0)
                .map(([menuId, qty]) => ({ menuId, qty })),
              notes,
            });
          else void submit({ measurements, storage });
        }}
        style={cta(submitting)}
      >
        {submitting ? '…' : kind === 'booking' ? t.book : kind === 'fnb' ? t.order : t.saveMeasure}
      </button>
    </Shell>
  );
}

/* ------------------------------- booking -------------------------------- */

function BookingForm({
  s,
  isRtl,
  t,
  serviceId,
  setServiceId,
  date,
  setDate,
  time,
  setTime,
}: {
  s: BookingSettings;
  isRtl: boolean;
  t: ReturnType<typeof copy>;
  serviceId: string;
  setServiceId: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
}) {
  const slots = useMemo(() => buildSlots(s.openTime, s.closeTime, s.slotMinutes), [s]);
  const dayOpen = date ? s.openDays.includes(new Date(`${date}T00:00`).getDay()) : true;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <span style={label}>{t.service}</span>
      <div style={{ display: 'grid', gap: 6 }}>
        {s.services.map((svc) => (
          <label key={svc.id} style={optionRow(serviceId === svc.id)}>
            <input
              type="radio"
              name="svc"
              checked={serviceId === svc.id}
              onChange={() => setServiceId(svc.id)}
            />
            <span style={{ flex: 1 }}>{isRtl ? svc.nameAr || svc.nameEn : svc.nameEn || svc.nameAr}</span>
            <span style={muted}>
              {svc.durationMin} {t.min} · QAR {svc.priceQar}
            </span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 3, flex: 1 }}>
          <span style={label}>{t.date}</span>
          <input style={field} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 3, flex: 1 }}>
          <span style={label}>{t.time}</span>
          <select style={field} value={time} onChange={(e) => setTime(e.target.value)} disabled={!dayOpen}>
            <option value="">{t.pickTime}</option>
            {slots.map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!dayOpen ? <p style={{ ...muted, color: 'var(--sf-accent)' }}>{t.closedDay}</p> : null}
    </div>
  );
}

function buildSlots(open: string, close: string, step: number): string[] {
  const toMin = (hm: string) => {
    const [h, m] = hm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const out: string[] = [];
  const start = toMin(open);
  const end = toMin(close);
  const s = Math.max(5, step || 30);
  for (let m = start; m + s <= end; m += s) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

/* --------------------------------- F&B ---------------------------------- */

function FnbForm({
  s,
  isRtl,
  t,
  qtys,
  setQtys,
  notes,
  setNotes,
}: {
  s: FnbSettings;
  isRtl: boolean;
  t: ReturnType<typeof copy>;
  qtys: Record<string, number>;
  setQtys: (u: (q: Record<string, number>) => Record<string, number>) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  const total = s.menu.reduce((sum, m) => sum + (qtys[m.id] ?? 0) * m.priceQar, 0);
  function setQty(id: string, delta: number) {
    setQtys((q) => ({ ...q, [id]: Math.max(0, Math.min(99, (q[id] ?? 0) + delta)) }));
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {s.menu.map((m) => (
        <div key={m.id} style={optionRow(false)}>
          <span style={{ flex: 1 }}>{isRtl ? m.nameAr || m.nameEn : m.nameEn || m.nameAr}</span>
          <span style={muted}>QAR {m.priceQar}</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setQty(m.id, -1)} style={stepBtn} aria-label="−">
              −
            </button>
            <span style={{ minWidth: 18, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {qtys[m.id] ?? 0}
            </span>
            <button type="button" onClick={() => setQty(m.id, 1)} style={stepBtn} aria-label="+">
              +
            </button>
          </div>
        </div>
      ))}
      {s.acceptNotes ? (
        <textarea
          style={{ ...field, minHeight: 60, resize: 'vertical' }}
          placeholder={t.notes}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
        <span style={label}>{t.total}</span>
        <strong>QAR {total}</strong>
      </div>
    </div>
  );
}

/* ------------------------------ tailoring ------------------------------- */

function TailoringForm({
  s,
  isRtl,
  t,
  measurements,
  setMeasurements,
  storage,
  setStorage,
}: {
  s: TailoringSettings;
  isRtl: boolean;
  t: ReturnType<typeof copy>;
  measurements: Record<string, number>;
  setMeasurements: (u: (m: Record<string, number>) => Record<string, number>) => void;
  storage: 'local' | 'online';
  setStorage: (v: 'local' | 'online') => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        {s.fields.map((f) => (
          <label key={f} style={{ display: 'grid', gap: 3 }}>
            <span style={label}>
              {isRtl ? MEASUREMENT_LABELS[f].ar : MEASUREMENT_LABELS[f].en} ({MEASUREMENT_UNIT[f]})
            </span>
            <input
              style={field}
              type="number"
              min={0}
              inputMode="decimal"
              value={measurements[f] ?? ''}
              onChange={(e) =>
                setMeasurements((m) => ({ ...m, [f]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
      </div>
      {s.storage === 'ask' ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={label}>{t.storage}</span>
          {(['local', 'online'] as const).map((opt) => (
            <label key={opt} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="radio" name="storage" checked={storage === opt} onChange={() => setStorage(opt)} />
              <span>{opt === 'local' ? t.storageLocal : t.storageOnline}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- shell --------------------------------- */

function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: 'clamp(18px, 4vw, 28px)',
        borderRadius: 20,
        border: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
        background: 'color-mix(in srgb, var(--sf-ground) 92%, transparent)',
        color: 'var(--sf-ink)',
      }}
    >
      {title ? (
        <h3
          style={{
            margin: '0 0 14px',
            fontFamily: 'var(--font-serif, serif)',
            fontWeight: 500,
            fontSize: 'clamp(18px, 3vw, 24px)',
          }}
        >
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

/* -------------------------------- styles -------------------------------- */

const label: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--sf-ink) 60%, transparent)',
};
const muted: CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)',
};
const field: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid color-mix(in srgb, var(--sf-ink) 16%, transparent)',
  background: 'var(--sf-ground)',
  color: 'var(--sf-ink)',
  fontSize: 14,
  boxSizing: 'border-box',
};
function optionRow(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${active ? 'var(--sf-accent)' : 'color-mix(in srgb, var(--sf-ink) 12%, transparent)'}`,
    background: active ? 'color-mix(in srgb, var(--sf-accent) 10%, transparent)' : 'transparent',
    fontSize: 14,
  };
}
const stepBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid color-mix(in srgb, var(--sf-ink) 16%, transparent)',
  background: 'transparent',
  color: 'var(--sf-ink)',
  cursor: 'pointer',
  fontSize: 15,
  lineHeight: 1,
};
function cta(disabled: boolean): CSSProperties {
  return {
    marginTop: 14,
    width: '100%',
    padding: '13px 18px',
    borderRadius: 12,
    border: 'none',
    background: 'var(--sf-ink)',
    color: 'var(--sf-ground)',
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
