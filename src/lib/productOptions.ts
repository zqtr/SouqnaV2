export const MAX_PRODUCT_SIZE_LABEL_LENGTH = 40;
export const MAX_PRODUCT_CUSTOM_INPUT_LENGTH = 80;
export const MAX_PRODUCT_OPTION_PRICE_DELTA_QAR = 999_999;
export const DEFAULT_PRODUCT_VARIANT_OPTIONS = ['Beige (Custom)', 'Ref (Custom)', 'Additional'];
export const DEFAULT_PRODUCT_HEIGHT_OPTIONS = ['156', '165', '178'];

export type PricedProductOption = {
  label: string;
  priceDeltaQar: number;
};

export type ProductOptionInput =
  | string
  | number
  | {
      label?: unknown;
      name?: unknown;
      value?: unknown;
      priceDeltaQar?: unknown;
      priceAdjustmentQar?: unknown;
      priceQar?: unknown;
      price?: unknown;
    };

function normalizeOptionLabel(value: unknown): string {
  const label =
    typeof value === 'string'
      ? value
      : typeof value === 'number' && Number.isFinite(value)
        ? String(value)
        : value && typeof value === 'object'
          ? String(
              (value as { label?: unknown; name?: unknown; value?: unknown }).label ??
                (value as { name?: unknown }).name ??
                (value as { value?: unknown }).value ??
                '',
            )
          : '';

  return label.replace(/\s+/g, ' ').trim().slice(0, MAX_PRODUCT_SIZE_LABEL_LENGTH);
}

function normalizeOptionPriceDelta(value: unknown): number {
  const raw =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)?.[0] ?? NaN)
        : NaN;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(
    -MAX_PRODUCT_OPTION_PRICE_DELTA_QAR,
    Math.min(MAX_PRODUCT_OPTION_PRICE_DELTA_QAR, Math.round(raw)),
  );
}

function optionPriceDeltaFromInput(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const option = value as ProductOptionInput & {
    priceDeltaQar?: unknown;
    priceAdjustmentQar?: unknown;
    priceQar?: unknown;
    price?: unknown;
  };
  return normalizeOptionPriceDelta(
    option.priceDeltaQar ?? option.priceAdjustmentQar ?? option.priceQar ?? option.price,
  );
}

export function normalizePricedOptions(value: unknown): PricedProductOption[] {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const options: PricedProductOption[] = [];

  for (const item of raw) {
    const label = normalizeOptionLabel(item);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    options.push({
      label,
      priceDeltaQar: optionPriceDeltaFromInput(item),
    });
  }

  return options;
}

export function normalizeSizeOptions(value: unknown): string[] {
  return normalizePricedOptions(value).map((option) => option.label);
}

export function isAllowedSizeOption(
  sizeOptions: string[],
  value: string | null | undefined,
): boolean {
  if (sizeOptions.length === 0) return value === null || value === undefined || value.trim() === '';
  const requested = value?.trim().toLowerCase();
  if (!requested) return false;
  return sizeOptions.some((option) => option.toLowerCase() === requested);
}

export function normalizeCustomSizeValue(value: unknown): string | null {
  return normalizeSizeOptions([value])[0] ?? null;
}

export function normalizeVariantOptions(value: unknown): string[] {
  return normalizeSizeOptions(value);
}

export function optionPriceDeltaFor(
  options: unknown,
  value: string | null | undefined,
): number {
  const requested = value?.trim().toLowerCase();
  if (!requested) return 0;
  return (
    normalizePricedOptions(options).find((option) => option.label.toLowerCase() === requested)
      ?.priceDeltaQar ?? 0
  );
}

export function isAllowedProductSizeOption(
  sizeOptions: string[],
  value: string | null | undefined,
  allowCustomSize = false,
): boolean {
  if (isAllowedSizeOption(sizeOptions, value)) return true;
  return allowCustomSize && normalizeCustomSizeValue(value) !== null;
}

export function normalizeHeightOptions(value: unknown): string[] {
  return normalizeSizeOptions(value);
}

export function isAllowedHeightOption(
  heightOptions: string[],
  value: string | null | undefined,
): boolean {
  return isAllowedSizeOption(heightOptions, value);
}

export function normalizeCustomInputValue(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PRODUCT_CUSTOM_INPUT_LENGTH);
  return normalized || null;
}

export function normalizeHeightInputLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, MAX_PRODUCT_SIZE_LABEL_LENGTH);
  return normalized || null;
}
