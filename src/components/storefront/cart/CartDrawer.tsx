'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useCart, type CartLineItem } from './CartContext';
import type { StorefrontCartVariant } from '@/lib/storefrontChrome';

export type CartDrawerLabels = {
  title: string;
  close: string;
  size: string;
  variant: string;
  height: string;
  remove: string;
  subtotal: string;
  checkout: string;
  emptyTitle: string;
  emptyText: string;
  continueBrowsing: string;
  decreaseQuantity: string;
  increaseQuantity: string;
  /** Enriched-summary microcopy (checkout-rail / luxury / max / command). */
  total: string;
  shippingNote: string;
  secureNote: string;
  items: string;
};

const DEFAULT_CART_DRAWER_LABELS: CartDrawerLabels = {
  title: 'Your cart',
  close: 'Close cart',
  size: 'Size',
  variant: 'Variant',
  height: 'Height',
  remove: 'Remove',
  subtotal: 'Subtotal',
  checkout: 'Checkout',
  emptyTitle: 'Your cart is empty',
  emptyText: "Browse the storefront and add anything you'd like. It'll show up here.",
  continueBrowsing: 'Continue browsing',
  decreaseQuantity: 'Decrease quantity',
  increaseQuantity: 'Increase quantity',
  total: 'Total',
  shippingNote: 'Shipping calculated at checkout',
  secureNote: 'Secure checkout',
  items: 'items',
};

/**
 * Layout family a cart variant maps to. Several catalog variants share
 * the standard body but differ only in how the cart is *triggered*
 * (`cart-floating-bag`, `cart-inline-bag`, `cart-bottom-bar` — handled
 * by `CartIconButton`); those all render the standard drawer here. The
 * remaining variants get genuinely distinct drawers.
 */
type CartLayout = 'standard' | 'mini' | 'rail' | 'luxury' | 'max' | 'command';

type CartDrawerSpec = {
  layout: CartLayout;
  /** CSS width of the panel. */
  width: string;
  /** Inset from the viewport edges with a rounded floating sheet. */
  floating: boolean;
  radius: number;
  gradient: boolean;
  density: 'compact' | 'cozy' | 'rich';
  thumbSize: number;
  /** Show the "N items" line under the title. */
  showItemCount: boolean;
  summary: 'minimal' | 'rail' | 'max';
  showTrustRow: boolean;
  /** Continue-shopping link in the footer (in addition to checkout). */
  showContinueLink: boolean;
  /** Accent the total figure + add a soft glow under the checkout CTA. */
  accent: boolean;
  /** Monospace, command-palette styling with an "esc" hint. */
  mono: boolean;
};

function specForVariant(variant: StorefrontCartVariant): CartDrawerSpec {
  const layout: CartLayout =
    variant === 'cart-mini-drawer'
      ? 'mini'
      : variant === 'cart-checkout-rail'
        ? 'rail'
        : variant === 'cart-luxury-sheet'
          ? 'luxury'
          : variant === 'cart-max-summary'
            ? 'max'
            : variant === 'cart-command-cart'
              ? 'command'
              : 'standard';

  switch (layout) {
    case 'mini':
      return {
        layout,
        width: 'min(360px, calc(100% - 24px))',
        floating: false,
        radius: 0,
        gradient: false,
        density: 'compact',
        thumbSize: 46,
        showItemCount: false,
        summary: 'minimal',
        showTrustRow: false,
        showContinueLink: false,
        accent: false,
        mono: false,
      };
    case 'rail':
      return {
        layout,
        width: 'min(440px, 100%)',
        floating: false,
        radius: 0,
        gradient: false,
        density: 'cozy',
        thumbSize: 60,
        showItemCount: true,
        summary: 'rail',
        showTrustRow: true,
        showContinueLink: false,
        accent: true,
        mono: false,
      };
    case 'luxury':
      return {
        layout,
        width: 'min(460px, calc(100% - 32px))',
        floating: true,
        radius: 22,
        gradient: true,
        density: 'rich',
        thumbSize: 74,
        showItemCount: true,
        summary: 'rail',
        showTrustRow: true,
        showContinueLink: false,
        accent: true,
        mono: false,
      };
    case 'max':
      return {
        layout,
        width: 'min(520px, calc(100% - 24px))',
        floating: false,
        radius: 0,
        gradient: true,
        density: 'rich',
        thumbSize: 64,
        showItemCount: true,
        summary: 'max',
        showTrustRow: true,
        showContinueLink: true,
        accent: true,
        mono: false,
      };
    case 'command':
      return {
        layout,
        width: 'min(400px, calc(100% - 32px))',
        floating: true,
        radius: 20,
        gradient: false,
        density: 'cozy',
        thumbSize: 52,
        showItemCount: true,
        summary: 'rail',
        showTrustRow: true,
        showContinueLink: false,
        accent: false,
        mono: true,
      };
    default:
      return {
        layout: 'standard',
        width: 'min(420px, 100%)',
        floating: false,
        radius: 0,
        gradient: false,
        density: 'cozy',
        thumbSize: 56,
        showItemCount: false,
        summary: 'minimal',
        showTrustRow: false,
        showContinueLink: false,
        accent: false,
        mono: false,
      };
  }
}

/**
 * Slide-in cart drawer. Mounts once per page; renders nothing until
 * `cart.isOpen` flips. Hidden entirely when `cart.enabled === false`.
 *
 * The 8 `StorefrontCartVariant` values collapse to six distinct drawer
 * layouts (see {@link specForVariant}): compact mini, standard, an
 * order-summary "checkout rail", a rich luxury sheet, a high-density max
 * summary, and a mono command cart. Each differs in panel chrome,
 * line-item density, and how much of the order it summarises.
 *
 * RTL-safe: positioned via `insetInlineEnd`, slides in from the
 * inline-end side regardless of writing direction. Body scroll is
 * locked while open, focus moves to the close button on mount and is
 * restored to the previously focused element on close.
 */
export function CartDrawer({
  currency = 'QAR',
  variant = 'cart-floating-bag',
  labels,
}: {
  currency?: string;
  variant?: StorefrontCartVariant;
  labels?: Partial<CartDrawerLabels>;
} = {}) {
  const cart = useCart();
  const text = { ...DEFAULT_CART_DRAWER_LABELS, ...labels };
  const spec = specForVariant(variant);
  const pathname = usePathname();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isOpen = cart.enabled && cart.isOpen;

  useEffect(() => {
    if (!isOpen) return;
    const previousActive =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    previousFocusRef.current = previousActive;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Defer the focus to next frame so the dialog has rendered.
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cart.close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, cart]);

  const onTrapKey = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!cart.enabled) return null;
  if (!isOpen) return null;

  const checkoutHref = checkoutHrefForPath(pathname);
  const inset = spec.floating ? 16 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
      }}
    >
      <div
        onClick={cart.close}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: spec.mono ? 'rgba(12, 10, 8, 0.55)' : 'rgba(15, 12, 9, 0.45)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 220ms ease',
          backdropFilter: spec.floating ? 'blur(2px)' : undefined,
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onTrapKey}
        style={{
          position: 'absolute',
          top: inset,
          bottom: inset,
          insetInlineEnd: inset,
          width: spec.width,
          background: spec.gradient
            ? 'linear-gradient(180deg, color-mix(in srgb, var(--sf-ground, var(--surface-bg)) 94%, white), var(--sf-ground, var(--surface-bg)))'
            : 'var(--sf-ground, var(--surface-bg))',
          color: 'var(--sf-ink, var(--ink-strong))',
          borderInlineStart: spec.floating
            ? 'none'
            : '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 10%, transparent)',
          border: spec.floating
            ? '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 12%, transparent)'
            : undefined,
          borderRadius: spec.radius,
          boxShadow: spec.floating
            ? '0 22px 60px -34px rgba(0,0,0,0.48)'
            : '-12px 0 40px -12px rgba(0,0,0,0.25)',
          transform: isOpen ? 'translateX(0)' : 'translateX(var(--sf-drawer-hidden-x, 100%))',
          transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <DrawerInlineDirectionStyle />
        <header
          style={{
            display: 'flex',
            alignItems: spec.showItemCount ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: spec.density === 'rich' ? '20px 20px 16px' : '16px 18px',
            borderBottom:
              '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 10%, transparent)',
          }}
        >
          <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 8,
                fontFamily: spec.mono
                  ? 'var(--font-mono)'
                  : 'var(--font-serif, var(--font-sans))',
                fontSize: spec.mono ? 14 : spec.density === 'rich' ? 20 : 18,
                fontWeight: spec.mono ? 600 : 500,
                letterSpacing: spec.mono ? '0.04em' : '-0.01em',
                textTransform: spec.mono ? 'uppercase' : undefined,
              }}
            >
              {text.title}
              {!spec.showItemCount ? (
                <span
                  aria-hidden
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--ink-muted, color-mix(in srgb, currentColor 60%, transparent))',
                    letterSpacing: '0.06em',
                  }}
                >
                  {cart.count}
                </span>
              ) : null}
            </h2>
            {spec.showItemCount ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  color: 'color-mix(in srgb, currentColor 55%, transparent)',
                }}
              >
                {cart.count} {text.items}
              </span>
            ) : null}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {spec.mono ? (
              <kbd
                aria-hidden
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.08em',
                  padding: '3px 6px',
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
                  color: 'color-mix(in srgb, currentColor 55%, transparent)',
                }}
              >
                ESC
              </kbd>
            ) : null}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={cart.close}
              aria-label={text.close}
              style={iconButtonStyle()}
            >
              <CloseSvg />
            </button>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding:
              cart.items.length === 0
                ? 24
                : spec.density === 'rich'
                  ? '14px 14px'
                  : spec.density === 'compact'
                    ? '8px 6px'
                    : '12px 6px',
          }}
        >
          {cart.items.length === 0 ? (
            <EmptyCart onClose={cart.close} labels={text} accent={spec.accent} />
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: spec.density === 'rich' ? 8 : 4,
              }}
            >
              {cart.items.map((item) => (
                <LineItem
                  key={item.lineId}
                  item={item}
                  currency={currency}
                  labels={text}
                  spec={spec}
                  onQty={(q) => cart.setQuantity(item.lineId, q)}
                  onRemove={() => cart.remove(item.lineId)}
                />
              ))}
            </ul>
          )}
        </div>

        {cart.items.length > 0 ? (
          <footer
            style={{
              padding: spec.density === 'rich' ? '18px 20px 20px' : '16px 18px',
              borderTop:
                '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 10%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: spec.gradient
                ? 'color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 3%, transparent)'
                : undefined,
            }}
          >
            <SummaryBlock
              currency={currency}
              subtotal={cart.subtotalQar}
              count={cart.count}
              labels={text}
              spec={spec}
            />
            <Link
              href={checkoutHref}
              onClick={cart.close}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: spec.density === 'rich' ? '14px 18px' : '12px 16px',
                borderRadius: spec.floating ? 12 : 10,
                background: 'var(--sf-ink, var(--ink-strong))',
                color: 'var(--sf-ground, var(--surface-bg))',
                fontFamily: spec.mono ? 'var(--font-mono)' : 'inherit',
                fontSize: 13.5,
                fontWeight: spec.mono ? 600 : 500,
                letterSpacing: spec.mono ? '0.04em' : undefined,
                textTransform: spec.mono ? 'uppercase' : undefined,
                textDecoration: 'none',
                boxShadow: spec.accent
                  ? '0 14px 34px -16px color-mix(in srgb, var(--sf-accent, var(--color-gold-deep)) 70%, transparent)'
                  : undefined,
              }}
            >
              {text.checkout}
              <ArrowSvg />
            </Link>
            {spec.showContinueLink ? (
              <button
                type="button"
                onClick={cart.close}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'color-mix(in srgb, currentColor 62%, transparent)',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {text.continueBrowsing}
              </button>
            ) : null}
            {spec.showTrustRow ? <TrustRow note={text.secureNote} /> : null}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function checkoutHrefForPath(pathname: string | null): string {
  const match = /^\/brief\/([^/]+)(?:\/.*)?$/.exec(pathname ?? '');
  return match?.[1] ? `/brief/${match[1]}/checkout` : '/checkout';
}

/**
 * The `transform` direction depends on writing direction so the drawer
 * always slides in from the inline-end side. We can't express that
 * with logical CSS alone — falls back to a CSS variable set per `dir`.
 */
function DrawerInlineDirectionStyle() {
  return (
    <style>{`
      [dir='rtl'] { --sf-drawer-hidden-x: -100%; --sf-arrow-flip: scaleX(-1); }
      [dir='ltr'], :root:not([dir='rtl']) { --sf-drawer-hidden-x: 100%; --sf-arrow-flip: none; }
    `}</style>
  );
}

function LineItem({
  item,
  currency,
  labels,
  spec,
  onQty,
  onRemove,
}: {
  item: CartLineItem;
  currency: string;
  labels: CartDrawerLabels;
  spec: CartDrawerSpec;
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  const rich = spec.density === 'rich';
  const compact = spec.density === 'compact';
  return (
    <li
      style={{
        display: 'flex',
        gap: rich ? 14 : 12,
        padding: rich ? '14px 14px' : compact ? '8px 10px' : '12px 14px',
        alignItems: 'flex-start',
        borderRadius: rich ? 14 : undefined,
        background: rich
          ? 'color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 3%, transparent)'
          : undefined,
        border: rich
          ? '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 8%, transparent)'
          : undefined,
      }}
    >
      <Thumb url={item.imageUrl ?? null} title={item.title} size={spec.thumbSize} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: compact ? 13 : 14,
            fontWeight: 500,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.title}
        >
          {item.title}
        </div>
        {item.variantLabel ? <MetaLine label={labels.size} value={item.variantLabel} /> : null}
        {item.customInputs?.variant ? (
          <MetaLine
            label={item.customInputs.variantLabel || labels.variant}
            value={item.customInputs.variant}
          />
        ) : null}
        {item.customInputs?.height ? (
          <MetaLine
            label={item.customInputs.heightLabel || labels.height}
            value={item.customInputs.height}
          />
        ) : null}
        {!compact ? (
          <div
            style={{
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              color: 'color-mix(in srgb, currentColor 65%, transparent)',
            }}
          >
            {currency} {item.priceQar}
          </div>
        ) : null}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <QtyStepper value={item.quantity} onChange={onQty} labels={labels} />
          <button
            type="button"
            onClick={onRemove}
            style={{
              marginInlineStart: 'auto',
              background: 'transparent',
              border: 'none',
              padding: '4px 6px',
              fontSize: 12,
              color: 'color-mix(in srgb, currentColor 65%, transparent)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {labels.remove}
          </button>
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {currency} {item.priceQar * item.quantity}
      </div>
    </li>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        marginTop: 3,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'color-mix(in srgb, currentColor 58%, transparent)',
      }}
    >
      {label}: {value}
    </div>
  );
}

function SummaryBlock({
  currency,
  subtotal,
  count,
  labels,
  spec,
}: {
  currency: string;
  subtotal: number;
  count: number;
  labels: CartDrawerLabels;
  spec: CartDrawerSpec;
}) {
  const accentColor = 'var(--sf-accent, var(--color-gold-deep))';
  if (spec.summary === 'minimal') {
    return <SummaryRow label={labels.subtotal} value={`${currency} ${subtotal}`} strong upper />;
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {spec.summary === 'max' ? (
        <SummaryRow label={labels.items} value={String(count)} muted />
      ) : null}
      <SummaryRow label={labels.subtotal} value={`${currency} ${subtotal}`} muted />
      <SummaryRow label={labels.shippingNote} value="—" muted small />
      <div
        style={{
          height: 1,
          background: 'color-mix(in srgb, currentColor 12%, transparent)',
          margin: '2px 0',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'color-mix(in srgb, currentColor 62%, transparent)',
          }}
        >
          {labels.total}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            color: spec.accent ? accentColor : 'inherit',
          }}
        >
          {currency} {subtotal}
        </span>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  muted,
  upper,
  small,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  upper?: boolean;
  small?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: small ? 10.5 : 11,
          letterSpacing: upper ? '0.08em' : '0.04em',
          textTransform: upper ? 'uppercase' : undefined,
          color: muted
            ? 'color-mix(in srgb, currentColor 58%, transparent)'
            : 'color-mix(in srgb, currentColor 62%, transparent)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: strong ? 14 : 12.5,
          fontWeight: strong ? 600 : 500,
          color: muted ? 'color-mix(in srgb, currentColor 78%, transparent)' : 'inherit',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function TrustRow({ note }: { note: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color: 'color-mix(in srgb, currentColor 55%, transparent)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        letterSpacing: '0.06em',
      }}
    >
      <LockSvg />
      {note}
    </div>
  );
}

function EmptyCart({
  onClose,
  labels,
  accent,
}: {
  onClose: () => void;
  labels: CartDrawerLabels;
  accent: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '32px 12px',
        textAlign: 'center',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'color-mix(in srgb, var(--sf-accent, var(--color-gold-deep)) 16%, transparent)',
          color: 'var(--sf-accent, var(--color-gold-deep))',
        }}
      >
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif, var(--font-sans))',
          fontSize: 17,
          fontWeight: 500,
        }}
      >
        {labels.emptyTitle}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: 'color-mix(in srgb, currentColor 65%, transparent)',
          maxWidth: 240,
        }}
      >
        {labels.emptyText}
      </p>
      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: 8,
          padding: '9px 16px',
          borderRadius: 8,
          background: accent
            ? 'color-mix(in srgb, var(--sf-accent, var(--color-gold-deep)) 12%, transparent)'
            : 'transparent',
          border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
          color: 'inherit',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {labels.continueBrowsing}
      </button>
    </div>
  );
}

function Thumb({ url, title, size = 56 }: { url: string | null; title: string; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={title}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        flexShrink: 0,
        background: 'color-mix(in srgb, var(--sf-accent, var(--color-gold-deep)) 14%, transparent)',
      }}
    />
  );
}

function QtyStepper({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (q: number) => void;
  labels: CartDrawerLabels;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid color-mix(in srgb, currentColor 14%, transparent)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label={labels.decreaseQuantity}
        style={stepperBtnStyle()}
      >
        −
      </button>
      <span
        aria-live="polite"
        style={{
          minWidth: 28,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          padding: '0 4px',
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={labels.increaseQuantity}
        disabled={value >= 99}
        style={{
          ...stepperBtnStyle(),
          opacity: value >= 99 ? 0.4 : 1,
          cursor: value >= 99 ? 'not-allowed' : 'pointer',
        }}
      >
        +
      </button>
    </div>
  );
}

function stepperBtnStyle(): CSSProperties {
  return {
    width: 26,
    height: 26,
    background: 'transparent',
    border: 'none',
    fontSize: 14,
    color: 'inherit',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
}

function iconButtonStyle(): CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: 'transparent',
    border: '1px solid color-mix(in srgb, currentColor 14%, transparent)',
    color: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  };
}

function CloseSvg() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function ArrowSvg() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ transform: 'var(--sf-arrow-flip, none)' }}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function LockSvg() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
