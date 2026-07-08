'use client';

import { useEffect, useState } from 'react';

/**
 * A step in the "Finish your store" checklist. `done` is computed by the
 * shell from real signals (products, logo, checkout, policies, publish).
 * Each incomplete step offers one action — either an `href` (navigate to
 * the relevant settings page) or an in-builder `onAction`.
 */
export type ChecklistStep = {
  id: string;
  label: string;
  hint?: string;
  done: boolean;
  href?: string;
  onAction?: () => void;
  actionLabel?: string;
};

/**
 * Guided-setup checklist pinned at the top of the builder's left panel.
 * Collapsible and dismissible; both states persist per-browser. Shows a
 * progress ring and, for each unfinished step, a one-tap action so a
 * first-time founder always knows what to do next.
 */
export function SetupChecklist({
  steps,
  storageKey = 'souqna:builder:setup',
}: {
  steps: ChecklistStep[];
  storageKey?: string;
}) {
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === total;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const nextStep = steps.find((s) => !s.done);

  // Persisted open/dismissed state. Default: open unless everything's
  // done. Read lazily after mount to avoid a hydration mismatch.
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const o = window.localStorage.getItem(`${storageKey}:open`);
      const d = window.localStorage.getItem(`${storageKey}:dismissed`);
      setOpen(o === null ? !allDone : o === '1');
      setDismissed(d === '1');
    } catch {
      setOpen(!allDone);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = (key: string, value: string) => {
    try {
      window.localStorage.setItem(`${storageKey}:${key}`, value);
    } catch {
      /* ignore */
    }
  };
  const toggleOpen = () => {
    setOpen((o) => {
      persist('open', o ? '0' : '1');
      return !o;
    });
  };
  const dismiss = () => {
    setDismissed(true);
    persist('dismissed', '1');
  };

  if (!ready || dismissed) return null;

  return (
    <section
      aria-label="Store setup checklist"
      style={{
        margin: '0 0 12px',
        border: '1px solid var(--bld-accent-line)',
        borderRadius: 12,
        background: 'linear-gradient(180deg, var(--bld-accent-soft), transparent)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 13px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Ring pct={pct} label={allDone ? '✓' : `${doneCount}/${total}`} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              color: 'var(--bld-text)',
            }}
          >
            {allDone ? 'Store setup complete' : 'Finish your store'}
          </span>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--bld-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {allDone
              ? 'Everything looks ready to publish.'
              : nextStep
                ? `Next: ${nextStep.label}`
                : `${total - doneCount} steps left`}
          </span>
        </span>
        <span
          aria-hidden
          style={{
            color: 'var(--bld-text-faint)',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 180ms',
            fontSize: 12,
          }}
        >
          ›
        </span>
      </button>

      {open ? (
        <div style={{ padding: '0 13px 12px' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {steps.map((step) => (
              <li
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '9px 0',
                  borderTop: '1px solid var(--bld-divider)',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    borderRadius: 6,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 12,
                    background: step.done ? '#8fbf8a' : 'transparent',
                    border: step.done ? '1px solid #8fbf8a' : '1px solid var(--bld-input-border)',
                    color: step.done ? '#14210f' : 'transparent',
                  }}
                >
                  ✓
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: step.done ? 'var(--bld-text-muted)' : 'var(--bld-text)',
                      textDecoration: step.done ? 'line-through' : 'none',
                    }}
                  >
                    {step.label}
                  </span>
                  {!step.done && step.hint ? (
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--bld-text-faint)' }}>
                      {step.hint}
                    </span>
                  ) : null}
                </span>
                {!step.done ? <StepAction step={step} /> : null}
              </li>
            ))}
          </ul>

          {allDone ? (
            <button
              type="button"
              onClick={dismiss}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '8px',
                borderRadius: 8,
                border: '1px solid var(--bld-divider)',
                background: 'transparent',
                color: 'var(--bld-text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hide checklist
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function StepAction({ step }: { step: ChecklistStep }) {
  const label = step.actionLabel ?? 'Go';
  const style: React.CSSProperties = {
    flexShrink: 0,
    fontSize: 11.5,
    fontWeight: 600,
    color: 'var(--bld-accent)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };
  if (step.href) {
    return (
      <a href={step.href} style={style}>
        {label} →
      </a>
    );
  }
  if (step.onAction) {
    return (
      <button type="button" onClick={step.onAction} style={style}>
        {label} →
      </button>
    );
  }
  return null;
}

function Ring({ pct, label }: { pct: number; label: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 38,
        height: 38,
        flexShrink: 0,
        borderRadius: 999,
        display: 'grid',
        placeItems: 'center',
        background: `conic-gradient(var(--sf-accent, #c9a961) ${pct}%, var(--bld-divider) 0)`,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: 'var(--bld-surface-strong)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--bld-text)',
        }}
      >
        {label}
      </span>
    </span>
  );
}
