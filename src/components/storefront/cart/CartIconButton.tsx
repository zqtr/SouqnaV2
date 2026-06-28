'use client';

import { useCart } from './CartContext';
import type { StorefrontCartVariant } from '@/lib/storefrontChrome';

/**
 * Header cart trigger. Hidden entirely when checkout isn't enabled —
 * letting the storefront fall back to the inquiry-first flow without
 * a dangling icon.
 *
 * Floating, fixed-position. Uses logical inset (`insetInlineEnd`) so
 * it lands on the right in en and the left in ar.
 */
export function CartIconButton({
  label = 'Cart',
  ariaLabel,
  placement = 'inline',
  variant = 'cart-inline-bag',
}: {
  label?: string;
  ariaLabel?: string;
  placement?: 'inline' | 'floating';
  variant?: StorefrontCartVariant;
} = {}) {
  const cart = useCart();
  if (!cart.enabled) return null;

  const count = cart.count;
  const bottomBar = variant === 'cart-bottom-bar';
  const floating = placement === 'floating' || variant === 'cart-floating-bag' || bottomBar;

  return (
    <button
      type="button"
      onClick={cart.open}
      aria-label={
        ariaLabel ?? (count > 0 ? `${label} — ${count} item${count === 1 ? '' : 's'}` : label)
      }
      style={{
        ...(floating
          ? {
              position: 'fixed',
              top: bottomBar ? undefined : 'max(20px, env(safe-area-inset-top))',
              bottom: bottomBar ? 'max(16px, env(safe-area-inset-bottom))' : undefined,
              insetInlineEnd: 20,
              zIndex: 60,
              width: bottomBar ? 'min(240px, calc(100vw - 32px))' : 44,
              height: 44,
              boxShadow: '0 6px 20px -10px rgba(0,0,0,0.25)',
            }
          : {
              position: 'relative',
              width: 34,
              height: 34,
            }),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: bottomBar ? 8 : undefined,
        background:
          variant === 'cart-luxury-sheet' || variant === 'cart-max-summary'
            ? 'var(--sf-ink, var(--ink-strong))'
            : 'var(--sf-ground, var(--surface-bg))',
        color:
          variant === 'cart-luxury-sheet' || variant === 'cart-max-summary'
            ? 'var(--sf-ground, var(--surface-bg))'
            : 'var(--sf-ink, var(--ink-strong))',
        border: '1px solid color-mix(in srgb, var(--sf-ink, var(--ink-strong)) 14%, transparent)',
        borderRadius: bottomBar ? 14 : 999,
        cursor: 'pointer',
        padding: bottomBar ? '0 14px' : 0,
      }}
    >
      <span aria-hidden style={{ display: 'inline-flex' }}>
        <ShoppingBagSvg />
      </span>
      {bottomBar ? (
        <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      ) : null}
      {count > 0 ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -4,
            insetInlineEnd: -4,
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 999,
            background: 'var(--sf-accent, var(--color-gold-deep))',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            border: '2px solid var(--sf-ground, var(--surface-bg))',
            boxSizing: 'content-box',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}

function ShoppingBagSvg() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
