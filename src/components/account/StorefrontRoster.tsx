import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink, Package, Pencil } from 'lucide-react';
import { env } from '@/lib/env';
import type { Storefront } from '@/lib/brief';
import { storefrontBaseUrl } from '@/lib/storefrontUrl';
import { DeleteStorefrontButton } from '@/components/dashboard/DeleteStorefrontButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
  storefronts: Storefront[];
  /**
   * Optional slug whose card should be visually pinned (gold/maroon ring +
   * "Editing" chip). Used by the dashboard Settings view to mark which
   * storefront the founder came from. The /account page passes none.
   */
  currentSlug?: string;
  /**
   * Optional override for the empty-live hint. Lets the dashboard Settings
   * view reference the current storefront slug while /account shows a more
   * generic message.
   */
  emptyLiveHint?: ReactNode;
};

/**
 * Shared "your storefronts" surface used by both `/account` and the
 * dashboard Settings tab. Splits the roster into two groups so the
 * founder can tell at a glance what the public web sees vs what's still
 * a private draft, and surfaces the destructive action inline.
 */
export function StorefrontRoster({ storefronts, currentSlug, emptyLiveHint }: Props) {
  if (storefronts.length === 0) {
    return (
      <div
        style={{
          border: '1px dashed var(--surface-rule-strong)',
          borderRadius: 10,
          padding: '40px 28px',
          textAlign: 'center',
          background: 'var(--surface-elevated)',
        }}
      >
        <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 18 }}>
          No storefronts yet.
        </p>
        <Button
          asChild
          className="h-10 rounded-md border border-[color:var(--surface-rule-strong)] bg-[color:var(--ink-strong)] px-4 text-[color:var(--surface-bg)] hover:bg-[color:color-mix(in_srgb,var(--ink-strong)_88%,transparent)]"
        >
          <Link href="/en/begin">
            <Pencil data-icon="inline-start" />
            Open your first storefront
          </Link>
        </Button>
      </div>
    );
  }

  const sorted = currentSlug
    ? [...storefronts].sort((a, b) => {
        if (a.slug === currentSlug) return -1;
        if (b.slug === currentSlug) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
    : [...storefronts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const live = sorted.filter((s) => s.isPublished);
  const offline = sorted.filter((s) => !s.isPublished);

  return (
    <>
      <SectionHeading
        label="Live"
        count={live.length}
        dot="var(--admin-accent)"
        hint={
          live.length === 1
            ? '1 storefront on the public web'
            : `${live.length} storefronts on the public web`
        }
      />
      {live.length === 0 ? (
        <EmptyHint>
          {emptyLiveHint ?? (
            <>
              Nothing published yet. Open the builder, then hit{' '}
              <strong>Publish</strong> to put a storefront on{' '}
              <code style={mono}>*.{env.BRIEF_ROOT_DOMAIN}</code>.
            </>
          )}
        </EmptyHint>
      ) : (
        <Grid storefronts={live} currentSlug={currentSlug} live />
      )}

      <div style={{ height: 36 }} />

      <SectionHeading
        label="Offline"
        count={offline.length}
        dot="var(--ink-faint)"
        hint={offline.length === 1 ? '1 private draft' : `${offline.length} private drafts`}
      />
      {offline.length === 0 ? (
        <EmptyHint>
          No drafts. Every storefront you've started is currently live.
        </EmptyHint>
      ) : (
        <Grid storefronts={offline} currentSlug={currentSlug} live={false} />
      )}
    </>
  );
}

const mono: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  background: 'var(--surface-elevated)',
  padding: '1px 6px',
  borderRadius: 4,
  border: '1px solid var(--surface-rule)',
};

function SectionHeading({
  label,
  count,
  dot,
  hint,
}: {
  label: string;
  count: number;
  dot: string;
  hint: string;
}) {
  return (
    <div
      className="flex items-baseline justify-between"
      style={{ marginBottom: 14, gap: 12, flexWrap: 'wrap' }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: dot,
            display: 'inline-block',
            boxShadow: `0 0 0 3px color-mix(in srgb, ${dot} 18%, transparent)`,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--ink-strong)',
          }}
        >
          {label} · {count}
        </span>
      </div>
      <span
        style={{
          fontSize: 12,
          color: 'var(--ink-faint)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {hint}
      </span>
    </div>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        border: '1px dashed var(--surface-rule-strong)',
        borderRadius: 10,
        padding: '22px 24px',
        background: 'var(--surface-elevated)',
        fontSize: 14,
        lineHeight: 1.6,
        color: 'var(--ink-muted)',
      }}
    >
      {children}
    </div>
  );
}

function Grid({
  storefronts,
  currentSlug,
  live,
}: {
  storefronts: Storefront[];
  currentSlug?: string;
  live: boolean;
}) {
  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'grid',
        gap: 14,
      }}
    >
      {storefronts.map((s) => (
        <Row
          key={s.slug}
          storefront={s}
          isCurrent={s.slug === currentSlug}
          live={live}
        />
      ))}
    </ul>
  );
}

function Row({
  storefront: s,
  isCurrent,
  live,
}: {
  storefront: Storefront;
  isCurrent: boolean;
  live: boolean;
}) {
  const url = storefrontBaseUrl(s.slug);
  return (
    <li
      style={{
        border: `1px solid ${isCurrent ? 'var(--accent)' : 'var(--surface-rule)'}`,
        borderRadius: 10,
        padding: '20px 22px',
        background: 'var(--surface-elevated)',
        display: 'grid',
        gap: 14,
        boxShadow: isCurrent
          ? '0 0 0 3px var(--accent-soft)'
          : '0 1px 2px color-mix(in srgb, #1f1b16 4%, transparent)',
      }}
    >
      <div
        className="flex items-baseline justify-between"
        style={{ gap: 16, flexWrap: 'wrap' }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            className="flex items-center"
            style={{ gap: 10, marginBottom: 4, flexWrap: 'wrap' }}
          >
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24,
                lineHeight: 1.15,
              }}
            >
              {s.businessName}
            </div>
            {isCurrent ? (
              <Badge
                className="rounded-md border border-[color:var(--surface-rule-strong)] bg-[color:var(--surface-bg)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--ink-strong)]"
                variant="outline"
              >
                Editing
              </Badge>
            ) : null}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              color: 'var(--ink-faint)',
              textTransform: 'uppercase',
            }}
          >
            {s.slug}.{env.BRIEF_ROOT_DOMAIN}
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Badge
            variant="outline"
            className="gap-1.5 rounded-md border-[color:var(--surface-rule-strong)] bg-[color:var(--surface-bg)] px-2 py-1 text-[11px] font-medium text-[color:var(--ink-muted)]"
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: live ? 'var(--ink-strong)' : 'var(--ink-faint)',
                display: 'inline-block',
              }}
            />
            {live ? 'Stock' : 'Offline'}
          </Badge>
          <Badge
            variant="ghost"
            className="rounded-md px-2 py-1 text-[11px] font-medium text-[color:var(--ink-muted)]"
          >
            {s.locale === 'ar' ? 'العربية' : 'English'}
          </Badge>
        </div>
      </div>
      <div
        className="flex flex-wrap items-center justify-between"
        style={{ gap: 10 }}
      >
        <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
          {live ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-md border-[color:var(--surface-rule-strong)] bg-[color:var(--surface-bg)] px-3 text-[color:var(--ink-strong)] hover:bg-[color:var(--surface-elevated)]"
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink data-icon="inline-start" />
                View live
              </a>
            </Button>
          ) : null}
          <Button
            asChild
            size="sm"
            className="h-8 rounded-md bg-[color:var(--ink-strong)] px-3 text-[color:var(--surface-bg)] hover:bg-[color:color-mix(in_srgb,var(--ink-strong)_88%,transparent)]"
          >
            <Link href={`/account/builder?store=${encodeURIComponent(s.slug)}`}>
              <Pencil data-icon="inline-start" />
              {isCurrent ? 'Open builder' : 'Manage'}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-[color:var(--surface-rule-strong)] bg-[color:var(--surface-bg)] px-3 text-[color:var(--ink-strong)] hover:bg-[color:var(--surface-elevated)]"
          >
            <Link href={`/account?tab=products&store=${encodeURIComponent(s.slug)}`}>
              <Package data-icon="inline-start" />
              Products
            </Link>
          </Button>
        </div>
        <DeleteStorefrontButton
          slug={s.slug}
          businessName={s.businessName}
          briefRootDomain={env.BRIEF_ROOT_DOMAIN}
        />
      </div>
    </li>
  );
}
