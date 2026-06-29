'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getSupplierForBrowse } from '@/app/actions/souqnasource';
import type { Supplier } from '@/lib/apps/souqnasource/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function SupplierDrawer({
  supplierId,
  slug,
  onClose,
}: {
  supplierId: string;
  slug: string;
  locale: 'en' | 'ar';
  onClose: () => void;
}) {
  const [s, setS] = useState<Supplier | null>(null);
  useEffect(() => {
    getSupplierForBrowse({ slug, supplierId }).then(setS);
  }, [slug, supplierId]);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'color-mix(in srgb, var(--ink-strong) 35%, transparent)',
          zIndex: 40,
        }}
      />
      <aside
        role="dialog"
        aria-label="Supplier"
        style={{
          position: 'fixed',
          insetInlineEnd: 0,
          top: 0,
          height: '100%',
          width: 'min(360px, 90vw)',
          background: 'var(--surface-elevated, var(--surface-bg))',
          borderInlineStart: '1px solid var(--surface-rule)',
          padding: 24,
          overflowY: 'auto',
          zIndex: 41,
          boxShadow:
            '-24px 0 60px -20px color-mix(in srgb, var(--ink-strong) 30%, transparent)',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 12,
          }}
        >
          <Button
            type="button"
            onClick={onClose}
            aria-label="Close"
            variant="outline"
            size="icon-sm"
            className="rounded-md border-[color:var(--surface-rule)] bg-[color:var(--surface-bg)] text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--ink-strong)]"
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        {s ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif, var(--font-sans))',
                fontWeight: 400,
                fontSize: 22,
                color: 'var(--ink-strong)',
                letterSpacing: '-0.01em',
              }}
            >
              {s.displayName}
            </h2>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.04em',
                color: 'var(--ink-muted)',
              }}
            >
              {s.area && <Chip>{s.area}</Chip>}
              <Chip>
                trust&nbsp;
                {s.trustScore ?? '—'}
              </Chip>
            </div>

            {s.trustReason ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: 'var(--ink-strong)',
                }}
              >
                {s.trustReason}
              </p>
            ) : null}

            {s.whatsapp && (
              <KeyValue label="WhatsApp" value={s.whatsapp} mono />
            )}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
            Loading…
          </p>
        )}
      </aside>
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="rounded-md border-[color:var(--surface-rule)] bg-[color:color-mix(in_srgb,var(--ink-strong)_6%,transparent)] px-2 py-1 text-[11px] font-medium lowercase text-[color:var(--ink-strong)]"
    >
      {children}
    </Badge>
  );
}

function KeyValue({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          fontSize: 13,
          color: 'var(--ink-strong)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
