import Link from 'next/link';
import { ArchMark } from '@/components/primitives/ArchMark';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

/**
 * Global 404. Because the root layout (`app/layout.tsx`) is a passthrough
 * that intentionally omits `<html>`/`<body>` (each section owns its own
 * document shell so `lang`/`dir` can vary per locale and per storefront),
 * the app-level not-found — which renders directly inside the root layout,
 * not inside any section layout — must supply its own shell. Without it,
 * unmatched routes render with no `<html>`/`<body>` and Next.js reports
 * "Missing required html tags in the Root Layout".
 */
export default function NotFound() {
  return (
    <html lang="en" dir="ltr" className={fontVariables} suppressHydrationWarning>
      <body
        style={{
          minHeight: '100dvh',
          margin: 0,
          display: 'grid',
          placeItems: 'center',
          padding: '32px 20px',
          background: 'var(--surface-bg, #E8DCC4)',
          color: 'var(--ink-strong, #221a12)',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
        }}
      >
        <main
          style={{
            display: 'grid',
            justifyItems: 'center',
            gap: 18,
            textAlign: 'center',
            maxWidth: 440,
          }}
        >
          <ArchMark size={40} stroke="var(--color-gold-deep, #a97e34)" />
          <span
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--ink-strong, #221a12) 55%, transparent)',
            }}
          >
            404
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif), serif',
              fontWeight: 500,
              fontSize: 'clamp(26px, 5vw, 38px)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            This page isn&apos;t here.
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: 'color-mix(in srgb, var(--ink-strong, #221a12) 66%, transparent)',
            }}
          >
            The link may be broken, or the page may have moved. Let&apos;s get you back to
            somewhere solid.
          </p>
          <Link
            href="/"
            style={{
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 20px',
              borderRadius: 999,
              background: 'var(--ink-strong, #221a12)',
              color: 'var(--surface-bg, #E8DCC4)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Back to Souqna
          </Link>
        </main>
      </body>
    </html>
  );
}
