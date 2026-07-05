'use client';

import { useState, useTransition, type CSSProperties } from 'react';
import { setKitchenOrderStateAction } from '@/app/actions/activities';
import {
  KITCHEN_STATE_LABELS,
  MEASUREMENT_LABELS,
  MEASUREMENT_UNIT,
  nextKitchenState,
  type ActivityKind,
  type ActivitySubmission,
  type BookingSubmission,
  type FnbSubmission,
  type KitchenState,
  type MeasurementField,
  type TailoringSubmission,
} from '@/lib/apps/activities/types';
import { Surface } from '../primitives';

type Props = {
  storefrontSlug: string;
  kind: ActivityKind;
  initial: ActivitySubmission[];
};

export function ActivityBoard({ storefrontSlug, kind, initial }: Props) {
  const heading =
    kind === 'booking' ? 'Bookings' : kind === 'fnb' ? 'Kitchen board' : 'Saved measurements';
  return (
    <Surface padding={20}>
      <h3 style={headingStyle}>{heading}</h3>
      {initial.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
          Nothing yet. Submissions from your storefront show up here.
        </p>
      ) : kind === 'booking' ? (
        <BookingList rows={initial as BookingSubmission[]} />
      ) : kind === 'fnb' ? (
        <KitchenBoard storefrontSlug={storefrontSlug} initial={initial as FnbSubmission[]} />
      ) : (
        <MeasurementList rows={initial as TailoringSubmission[]} />
      )}
    </Surface>
  );
}

function BookingList({ rows }: { rows: BookingSubmission[] }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rows.map((b) => (
        <div key={b.id} style={row}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 14 }}>{b.serviceName}</strong>
            <div style={sub}>
              {b.date} · {b.time} {b.customerName ? `· ${b.customerName}` : ''}{' '}
              {b.phone ? `· ${b.phone}` : ''}
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>QAR {b.priceQar}</span>
        </div>
      ))}
    </div>
  );
}

function KitchenBoard({
  storefrontSlug,
  initial,
}: {
  storefrontSlug: string;
  initial: FnbSubmission[];
}) {
  const [orders, setOrders] = useState<FnbSubmission[]>(initial);
  const [pending, startTransition] = useTransition();

  function advance(order: FnbSubmission) {
    const next = nextKitchenState(order.state);
    if (next === order.state) return;
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, state: next } : o)));
    startTransition(async () => {
      await setKitchenOrderStateAction({ storefrontSlug, orderId: order.id, state: next });
    });
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {orders.map((o) => (
        <div key={o.id} style={{ ...row, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <StatePill state={o.state} />
            <div style={{ fontSize: 14, marginTop: 6 }}>
              {o.items.map((it) => `${it.qty}× ${it.name}`).join(', ')}
            </div>
            {o.notes ? <div style={sub}>“{o.notes}”</div> : null}
            <div style={sub}>
              {o.customerName || 'Guest'} {o.phone ? `· ${o.phone}` : ''} · QAR {o.totalQar}
            </div>
          </div>
          {o.state !== 'served' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => advance(o)}
              style={advanceBtn(pending)}
            >
              {KITCHEN_STATE_LABELS[nextKitchenState(o.state)].en} →
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StatePill({ state }: { state: KitchenState }) {
  const tone: Record<KitchenState, string> = {
    submitted: 'var(--ink-muted)',
    preparing: 'var(--color-gold-deep)',
    ready: 'var(--color-gold-deep)',
    served: 'color-mix(in srgb, var(--ink-strong) 45%, transparent)',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 10.5,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        border: `1px solid ${tone[state]}`,
        color: tone[state],
      }}
    >
      {KITCHEN_STATE_LABELS[state].en}
    </span>
  );
}

function MeasurementList({ rows }: { rows: TailoringSubmission[] }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {rows.map((m) => (
        <div key={m.id} style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 14 }}>{m.customerName || 'Guest'}</strong>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ink-muted)',
              }}
            >
              {m.storage === 'online' ? 'online' : 'in-shop'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.entries(m.measurements) as [MeasurementField, number][]).map(([f, v]) => (
              <span key={f} style={measChip}>
                {MEASUREMENT_LABELS[f].en}: <strong>{v}</strong>
                {MEASUREMENT_UNIT[f]}
              </span>
            ))}
          </div>
          {m.phone ? <div style={sub}>{m.phone}</div> : null}
        </div>
      ))}
    </div>
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
const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid color-mix(in srgb, var(--ink-strong) 10%, transparent)',
};
const sub: CSSProperties = {
  marginTop: 3,
  fontSize: 12,
  color: 'var(--ink-muted)',
};
const measChip: CSSProperties = {
  padding: '5px 9px',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--ink-strong) 5%, transparent)',
  fontSize: 12,
  color: 'var(--ink-strong)',
};
function advanceBtn(disabled: boolean): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid var(--color-gold-deep)',
    background: 'color-mix(in srgb, var(--color-gold-deep) 12%, transparent)',
    color: 'var(--ink-strong)',
    fontSize: 12.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.6 : 1,
  };
}
