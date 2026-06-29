'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Info, ShoppingBag } from 'lucide-react';
import type { Listing } from '@/lib/apps/souqnasource/types';
import { ImportModal } from './import-modal';
import { QuoteModal } from './quote-modal';
import { SupplierDrawer } from './supplier-drawer';
import { Button } from '@/components/ui/button';

export function ListingCard({
  listing,
  slug,
  locale,
}: {
  listing: Listing;
  slug: string;
  locale: 'en' | 'ar';
}) {
  const [openImport, setOpenImport] = useState(false);
  const [openQuote, setOpenQuote] = useState(false);
  const [openSupplier, setOpenSupplier] = useState(false);
  const t = useTranslations('apps.souqnasource.card');
  const isPriced = listing.listingType === 'priced';

  return (
    <article
      style={{
        display: 'flex',
        gap: 14,
        padding: 14,
        border: '1px solid var(--surface-rule)',
        borderRadius: 10,
        background: 'var(--surface-elevated, var(--surface-bg))',
        transition: 'border-color 120ms ease, transform 120ms ease',
      }}
    >
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          style={{
            width: 80,
            height: 80,
            objectFit: 'cover',
            borderRadius: 8,
            background: 'color-mix(in srgb, var(--ink-strong) 5%, transparent)',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            background: 'color-mix(in srgb, var(--ink-strong) 5%, transparent)',
            flexShrink: 0,
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 14.5,
            fontWeight: 500,
            color: 'var(--ink-strong)',
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {listing.title}
        </h3>

        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isPriced ? (
            <span style={{ color: 'var(--ink-strong)', fontWeight: 500 }}>
              {listing.price} {listing.currency}
            </span>
          ) : (
            <span style={{ fontStyle: 'italic' }}>—</span>
          )}
          {listing.moq ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {t('moq')} {listing.moq}
              </span>
            </>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={() => setOpenSupplier(true)}
          variant="ghost"
          size="xs"
          className="h-6 self-start rounded-md px-1.5 text-[12px] text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-bg)] hover:text-[color:var(--ink-strong)]"
        >
          <Info data-icon="inline-start" />
          {t('trust')}: —
        </Button>

        <div style={{ marginTop: 8 }}>
          {isPriced ? (
            <Button
              type="button"
              onClick={() => setOpenImport(true)}
              size="sm"
              className="h-8 rounded-md bg-[color:var(--ink-strong)] px-3 text-[color:var(--surface-bg)] hover:bg-[color:color-mix(in_srgb,var(--ink-strong)_88%,transparent)]"
            >
              <ShoppingBag data-icon="inline-start" />
              {t('addToStore')}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setOpenQuote(true)}
              variant="outline"
              size="sm"
              className="h-8 rounded-md border-[color:var(--surface-rule-strong)] bg-[color:var(--surface-bg)] px-3 text-[color:var(--ink-strong)] hover:bg-[color:var(--surface-elevated)]"
            >
              <FileText data-icon="inline-start" />
              {t('getQuote')}
            </Button>
          )}
        </div>
      </div>

      {openImport && (
        <ImportModal
          listing={listing}
          slug={slug}
          locale={locale}
          onClose={() => setOpenImport(false)}
        />
      )}
      {openQuote && (
        <QuoteModal
          listing={listing}
          slug={slug}
          locale={locale}
          onClose={() => setOpenQuote(false)}
        />
      )}
      {openSupplier && (
        <SupplierDrawer
          supplierId={listing.supplierId}
          slug={slug}
          locale={locale}
          onClose={() => setOpenSupplier(false)}
        />
      )}
    </article>
  );
}
