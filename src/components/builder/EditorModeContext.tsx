'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Editor complexity mode for the builder.
 *
 *   - `simple`   : the default. The rail shows only the handful of
 *                  controls a first-time founder actually reaches for;
 *                  the exotic motion / effect / typography knobs are
 *                  tucked behind a "Show advanced options" reveal.
 *   - `advanced` : everything, i.e. the historical builder surface.
 *
 * The mode lives in `BuilderShellInner` state (persisted to
 * localStorage) and is shared down to the two inspectors via this
 * context so we don't have to prop-drill a flag through a 6k-line file.
 */
export type EditorMode = 'simple' | 'advanced';

type EditorModeValue = {
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
};

const EditorModeCtx = createContext<EditorModeValue>({
  mode: 'simple',
  setMode: () => {},
});

export function EditorModeProvider({
  value,
  children,
}: {
  value: EditorModeValue;
  children: ReactNode;
}) {
  return <EditorModeCtx.Provider value={value}>{children}</EditorModeCtx.Provider>;
}

export function useEditorMode() {
  return useContext(EditorModeCtx);
}

/** Convenience — true when the rail should render its trimmed-down form. */
export function useIsSimple() {
  return useContext(EditorModeCtx).mode === 'simple';
}

/**
 * Top-of-rail Simple / Advanced switch. Styled with the builder tokens so
 * it reads as part of the existing chrome.
 */
export function EditorModeToggle({
  value,
  onChange,
  simpleLabel = 'Simple',
  advancedLabel = 'Advanced',
}: {
  value: EditorMode;
  onChange: (m: EditorMode) => void;
  simpleLabel?: string;
  advancedLabel?: string;
}) {
  const opts: Array<{ id: EditorMode; label: string }> = [
    { id: 'simple', label: simpleLabel },
    { id: 'advanced', label: advancedLabel },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Editing mode"
      style={{
        display: 'flex',
        gap: 3,
        padding: 3,
        borderRadius: 999,
        background: 'var(--bld-chip-bg)',
        border: '1px solid var(--bld-divider)',
      }}
    >
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            style={{
              flex: 1,
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 999,
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.01em',
              color: active ? 'var(--bld-accent-ink)' : 'var(--bld-text-muted)',
              background: active ? 'var(--bld-accent)' : 'transparent',
              transition: 'background 140ms, color 140ms',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * "Show advanced options" reveal, shown at the foot of an inspector when
 * `simple` mode is hiding groups. Flips the whole builder to advanced so
 * the founder sees everything without losing their place.
 */
export function AdvancedReveal({
  onReveal,
  label = 'Show advanced options',
}: {
  onReveal: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onReveal}
      style={{
        width: '100%',
        marginTop: 4,
        padding: '11px 12px',
        borderRadius: 8,
        border: '1px dashed var(--bld-accent-line)',
        background: 'transparent',
        color: 'var(--bld-text-muted)',
        fontFamily: 'var(--font-sans)',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'background 140ms, color 140ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bld-accent-soft)';
        e.currentTarget.style.color = 'var(--bld-text)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--bld-text-muted)';
      }}
    >
      <span aria-hidden style={{ fontSize: 13 }}>⚙</span>
      {label}
    </button>
  );
}
