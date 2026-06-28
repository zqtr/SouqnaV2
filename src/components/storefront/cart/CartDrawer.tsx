'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useCart } from './CartContext';
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
};

/**
 * Slide-in cart drawer. Mounts once per page; renders nothing until
 * `cart.isOpen` flips. Hidden entirely when `cart.enabled === false`.
 *
 * RTL-safe: positioned via `insetInlineEnd: 0`, slides in from the
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
          background: 'rgba(15, 12, 9, 0.45)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 220ms ease',
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
          top:
            variant === 'cart-command-cart' || variant === 'cart-luxury-sheet'
              ? 16
              : 0,
          bottom:
            variant === 'cart-command-cart' || variant === 'cart-luxury-sheet'
              ? 16
              : 0,
          insetInlineEnd:
            variant === 'cart-command-cart' || variant === 'cart-luxury-sheet'
              ? 16
              : 0,
          width:
            variant === 'cart-max-summary'
              ? 'min(520px, calc(100% - 24px))'
              : variant === 'cart-mini-drawer'
                ? 'min(360px, calc(100% - 24px))'
                : 'min(420px, 100%)',
          background:
            variant === 'cart-luxury-sheet' || variant === 'cart-max-summary'
              ? 'linear-gradient(180deg, color-mix(in srgb, var(--sf-ground, var(--surface-bg)) 94%, white), var(--sf-ground, var(--surface-bg)))'
              : 'var(--sf-ground, var(--surface-bg))',
          color: 'var(--sf-ink, var(--ink-strong))',
          borderInlineStart:
            '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 10%, transparent)',
          borderRadius:
            variant === 'cart-command-cart' || variant === 'cart-luxury-sheet'
              ? 22
              : 0,
          boxShadow:
            variant === 'cart-command-cart' || variant === 'cart-luxury-sheet'
              ? '0 22px 60px -34px rgba(0,0,0,0.48)'
              : '-12px 0 40px -12px rgba(0,0,0,0.25)',
          transform: isOpen ? 'translateX(0)' : 'translateX(var(--sf-drawer-hidden-x, 100%))',
          transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DrawerInlineDirectionStyle />
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 18px',
            borderBottom:
              '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 10%, transparent)',
          }}
        >
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif, var(--font-sans))',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            {text.title}
            <span
              aria-hidden
              style={{
                marginInlineStart: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--ink-muted, color-mix(in srgb, currentColor 60%, transparent))',
                letterSpacing: '0.06em',
              }}
            >
              {cart.count}
            </span>
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={cart.close}
            aria-label={text.close}
            style={iconButtonStyle()}
          >
            <CloseSvg />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: cart.items.length === 0 ? 24 : '12px 6px',
          }}
        >
          {cart.items.length === 0 ? (
            <EmptyCart onClose={cart.close} labels={text} />
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {cart.items.map((item) => (
                <li
                  key={item.lineId}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 14px',
                    alignItems: 'flex-start',
                  }}
                >
                  <Thumb url={item.imageUrl ?? null} title={item.title} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
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
                    {item.variantLabel ? (
                      <div
                        style={{
                          marginTop: 3,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          color: 'color-mix(in srgb, currentColor 58%, transparent)',
                        }}
                      >
                        {text.size}: {item.variantLabel}
                      </div>
                    ) : null}
                    {item.customInputs?.variant ? (
                      <div
                        style={{
                          marginTop: 3,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          color: 'color-mix(in srgb, currentColor 58%, transparent)',
                        }}
                      >
                        {item.customInputs.variantLabel || text.variant}: {item.customInputs.variant}
                      </div>
                    ) : null}
                    {item.customInputs?.height ? (
                      <div
                        style={{
                          marginTop: 3,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          color: 'color-mix(in srgb, currentColor 58%, transparent)',
                        }}
                      >
                        {item.customInputs.heightLabel || text.height}: {item.customInputs.height}
                      </div>
                    ) : null}
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
                    <div
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <QtyStepper
                        value={item.quantity}
                        onChange={(q) => cart.setQuantity(item.lineId, q)}
                        labels={text}
                      />
                      <button
                        type="button"
                        onClick={() => cart.remove(item.lineId)}
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
                        {text.remove}
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
              ))}
            </ul>
          )}
        </div>

        {cart.items.length > 0 ? (
          <footer
            style={{
              padding: '16px 18px',
              borderTop:
                '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 10%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in srgb, currentColor 60%, transparent)',
                }}
              >
                {text.subtotal}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {currency} {cart.subtotalQar}
              </span>
            </div>
            <Link
              href={checkoutHref}
              onClick={cart.close}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--sf-ink, var(--ink-strong))',
                color: 'var(--sf-ground, var(--surface-bg))',
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {text.checkout}
            </Link>
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
      [dir='rtl'] { --sf-drawer-hidden-x: -100%; }
      [dir='ltr'], :root:not([dir='rtl']) { --sf-drawer-hidden-x: 100%; }
    `}</style>
  );
}

function EmptyCart({ onClose, labels }: { onClose: () => void; labels: CartDrawerLabels }) {
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
          background: 'transparent',
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

function Thumb({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={title}
        width={56}
        height={56}
        style={{
          width: 56,
          height: 56,
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
        width: 56,
        height: 56,
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

function stepperBtnStyle(): React.CSSProperties {
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

function iconButtonStyle(): React.CSSProperties {
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
