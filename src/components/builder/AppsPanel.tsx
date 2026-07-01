'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { APP_REGISTRY } from '@/lib/apps/registry';
import {
  installFreeApp,
  type AppActionState,
} from '@/app/actions/apps';
import { AppMark } from '@/components/admin/apps/AppMark';

/**
 * Builder sidebar panel that lists every customizable installed app
 * for the active store. Tiles are click-only — they invoke `onOpen`
 * with the app id, which the BuilderShell uses to mount the
 * AppSettingsModal (an iframe of `/account/apps/[id]/configure?embed=1`).
 *
 * Apps without `customizable: true` (Giphy, Cloudflare, etc.) are
 * intentionally hidden here; they remain reachable from the marketplace
 * at /account/apps. The empty state nudges the user to install one.
 */
export function AppsPanel({
  installedAppIds,
  storeSlug,
  onOpen,
}: {
  installedAppIds: string[];
  storeSlug: string;
  onOpen: (appId: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<AppActionState>({ status: 'idle' });
  const installed = new Set(installedAppIds);
  const apps = APP_REGISTRY.filter(
    (a) => installed.has(a.id) && a.customizable === true,
  );
  const reviewsApp = APP_REGISTRY.find((a) => a.id === 'reviews');

  function connectReviews() {
    if (!reviewsApp || pending) return;
    setState({ status: 'idle' });
    start(async () => {
      const result = await installFreeApp({
        storefrontSlug: storeSlug,
        appId: reviewsApp.id,
        settings: {},
      });
      setState(result);
      if (result.status === 'success') router.refresh();
    });
  }

  if (apps.length === 0) {
    return (
      <div
        style={{
          display: 'grid',
          gap: 12,
          padding: '4px 0 20px',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--bld-text-muted)',
        }}
      >
        {reviewsApp ? (
          <div
            style={{
              display: 'grid',
              gap: 12,
              padding: 12,
              border: '1px solid var(--bld-input-border)',
              borderRadius: 14,
              background: 'var(--bld-tile-bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AppMark app={reviewsApp} size={38} />
              <span style={{ minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    color: 'var(--bld-text)',
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {reviewsApp.name}
                </strong>
                <span
                  style={{
                    display: 'block',
                    marginTop: 3,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--bld-text-faint)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Builder reviews components
                </span>
              </span>
            </div>
            <p style={{ margin: 0 }}>
              Connect once to unlock Reviews components and manage what appears on the storefront.
            </p>
            {state.status === 'error' ? (
              <p role="alert" style={{ margin: 0, color: '#E68A8A' }}>
                {state.message}
              </p>
            ) : null}
            <button
              type="button"
              onClick={connectReviews}
              disabled={pending}
              style={{
                minHeight: 38,
                borderRadius: 999,
                border: '1px solid var(--bld-accent-line)',
                background: pending
                  ? 'var(--bld-accent-soft)'
                  : 'var(--bld-accent)',
                color: 'var(--bld-accent-ink)',
                cursor: pending ? 'wait' : 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.11em',
                textTransform: 'uppercase',
              }}
            >
              {pending ? 'Connecting...' : 'Connect reviews'}
            </button>
          </div>
        ) : (
          <p style={{ margin: 0 }}>No customizable apps are installed on this store yet.</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {apps.map((app) => (
        <button
          key={app.id}
          type="button"
          onClick={() => onOpen(app.id)}
          className="souqna-builder-app-tile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: 10,
            background: 'var(--surface-elevated, transparent)',
            border: '1px solid color-mix(in srgb, var(--ink-strong) 10%, transparent)',
            borderRadius: 10,
            cursor: 'pointer',
            textAlign: 'start',
          }}
        >
          <AppMark app={app} size={36} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-serif, var(--font-sans))',
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--bld-text, var(--ink-strong))',
                lineHeight: 1.2,
              }}
            >
              {app.name}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 2,
                fontSize: 11,
                color: 'var(--bld-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {app.tagline}
            </span>
          </span>
        </button>
      ))}
      <style>{`
        .souqna-builder-app-tile:hover {
          background: color-mix(in srgb, var(--ink-strong) 5%, transparent);
        }
      `}</style>
    </div>
  );
}
