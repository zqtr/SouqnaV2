'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { buildTaqimCartItems, type TaqimCartProduct } from '@/lib/blocks/commerce';
import { isVideoMediaUrl } from '@/lib/media';
import { optionPriceDeltaFor } from '@/lib/productOptions';
import { useCart } from '../cart/CartContext';

type BundleCartItem = TaqimCartProduct & {
  required?: boolean;
  selected?: boolean;
  defaultOptionValue?: string | null;
  buyerCanChooseOption?: boolean;
  sizeOptions?: string[];
  badge?: string | null;
};

type Props = {
  items: BundleCartItem[];
  mode: 'add_all' | 'add_selected';
  label: string;
  showPerProductButtons?: boolean;
  isRtl: boolean;
  radiusPx?: number;
};

export function TaqimBundleCart({
  items,
  mode,
  label,
  showPerProductButtons = false,
  isRtl,
  radiusPx = 12,
}: Props) {
  const cart = useCart();
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(items.filter((item) => item.required || item.selected).map((item) => item.productId)),
  );
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.productId,
        item.defaultOptionValue || item.sizeOptions?.[0] || '',
      ]),
    ),
  );

  const selectedInputs = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        required: item.required,
        selected: selectedIds.has(item.productId),
        defaultOptionValue: options[item.productId] || item.defaultOptionValue || null,
      })),
    [items, options, selectedIds],
  );
  const cartItems = buildTaqimCartItems(items, selectedInputs, mode);
  const missingRequiredOption = items.some(
    (item) =>
      (mode === 'add_all' || item.required || selectedIds.has(item.productId)) &&
      item.buyerCanChooseOption &&
      (item.sizeOptions?.length ?? 0) > 0 &&
      !options[item.productId],
  );
  const disabled = !cart.enabled || cartItems.length === 0 || missingRequiredOption;

  if (!cart.enabled) return null;

  const addItems = (products: TaqimCartProduct[]) => {
    if (products.length === 0) return;
    for (const product of products) {
      cart.add(
        {
          productId: product.productId,
          title: product.title,
          priceQar: product.priceQar,
          imageUrl: product.imageUrl && !isVideoMediaUrl(product.imageUrl) ? product.imageUrl : null,
          variantLabel: product.variantLabel ?? null,
        },
        1,
      );
    }
    cart.open();
  };

  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
      {mode === 'add_selected' || items.some((item) => item.buyerCanChooseOption) ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((item) => {
            const optionChoices = item.sizeOptions ?? [];
            const selectedOption = options[item.productId] || item.defaultOptionValue || null;
            const selectedPriceQar = Math.max(
              0,
              Math.round(item.priceQar + optionPriceDeltaFor(item.sizeOptionPrices, selectedOption)),
            );
            const checked = item.required || selectedIds.has(item.productId);
            return (
              <label
                key={item.productId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: item.required ? '1fr' : 'auto 1fr',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: radiusPx,
                  border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
                  background: 'color-mix(in srgb, var(--sf-ground) 88%, var(--sf-ink) 4%)',
                }}
              >
                {item.required ? null : (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(item.productId);
                        else next.delete(item.productId);
                        return next;
                      })
                    }
                    style={{ accentColor: 'var(--sf-accent)' }}
                  />
                )}
                <span style={{ display: 'grid', gap: 7 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ color: 'var(--sf-ink)', fontSize: 13 }}>{item.title}</strong>
                    <span
                      style={{
                        color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                      }}
                    >
                      QAR {selectedPriceQar.toFixed(0)}
                    </span>
                  </span>
                  {item.buyerCanChooseOption && optionChoices.length > 0 ? (
                    <select
                      value={options[item.productId] || ''}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          [item.productId]: event.target.value,
                        }))
                      }
                      style={{
                        width: '100%',
                        borderRadius: Math.max(8, radiusPx - 2),
                        border: '1px solid color-mix(in srgb, var(--sf-ink) 14%, transparent)',
                        background: 'var(--sf-ground)',
                        color: 'var(--sf-ink)',
                        padding: '8px 10px',
                        fontSize: 12,
                      }}
                    >
                      {optionChoices.map((option) => (
                        <option key={option} value={option}>
                          {formatOptionLabel(option, optionPriceDeltaFor(item.sizeOptionPrices, option), isRtl)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {showPerProductButtons ? (
                    <button
                      type="button"
                      onClick={() =>
                        addItems(
                          buildTaqimCartItems(
                            [item],
                            [
                              {
                                productId: item.productId,
                                required: true,
                                defaultOptionValue:
                                  options[item.productId] || item.defaultOptionValue || null,
                              },
                            ],
                            'add_all',
                          ),
                        )
                      }
                      style={secondaryButtonStyle(radiusPx)}
                    >
                      {isRtl ? 'أضف المنتج' : 'Add item'}
                    </button>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => addItems(cartItems)}
        style={{
          ...primaryButtonStyle(radiusPx),
          opacity: disabled ? 0.54 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {missingRequiredOption ? (isRtl ? 'اختر الخيارات المطلوبة' : 'Choose required options') : label}
      </button>
    </div>
  );
}

function formatOptionLabel(label: string, priceDeltaQar: number, isRtl: boolean): string {
  if (priceDeltaQar === 0) return label;
  const sign = priceDeltaQar > 0 ? '+' : '-';
  const value = Math.abs(priceDeltaQar);
  return isRtl ? `${label} (${sign}${value} ر.ق)` : `${label} (${sign}QAR ${value})`;
}

function primaryButtonStyle(radiusPx: number): CSSProperties {
  return {
    width: '100%',
    padding: '12px 20px',
    borderRadius: radiusPx,
    border: 0,
    background: 'var(--sf-ink)',
    color: 'var(--sf-ground)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    fontSize: 14,
  };
}

function secondaryButtonStyle(radiusPx: number): CSSProperties {
  return {
    width: 'fit-content',
    padding: '7px 12px',
    borderRadius: Math.max(8, radiusPx - 2),
    border: '1px solid color-mix(in srgb, var(--sf-ink) 18%, transparent)',
    background: 'transparent',
    color: 'var(--sf-ink)',
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    cursor: 'pointer',
  };
}
