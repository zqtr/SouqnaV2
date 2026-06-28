import type {
  CheckoutBackgroundPreset,
  CheckoutExperienceSettings,
  CheckoutSettings,
  PaymentMethod,
} from './storefrontSettings';

const FALLBACK_COLORS = {
  background: '#f2e5cf',
  surface: '#fff8ea',
  accent: '#8b3a3a',
  text: '#241f18',
  buttonText: '#fff8ea',
};

const BACKGROUNDS: Record<CheckoutBackgroundPreset, string> = {
  sand:
    'radial-gradient(circle at top left, rgba(183,135,45,0.18), transparent 34%), linear-gradient(180deg, #f4e6cf 0%, #ead8b9 100%)',
  pearl:
    'radial-gradient(circle at top right, rgba(139,58,58,0.08), transparent 32%), linear-gradient(180deg, #fffaf0 0%, #efe6d5 100%)',
  midnight:
    'radial-gradient(circle at 18% 12%, rgba(183,135,45,0.28), transparent 28%), linear-gradient(160deg, #201715 0%, #0f0d0c 62%, #3a2023 100%)',
  plate:
    'linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(180deg, #efe1c6 0%, #d9c59f 100%)',
  custom: 'var(--sq-checkout-bg)',
};

export function checkoutExperienceVars(
  experience: CheckoutExperienceSettings,
): Record<string, string> {
  const colors = experience.customColors;
  return {
    '--sq-checkout-bg': colors.background ?? FALLBACK_COLORS.background,
    '--sq-checkout-surface': colors.surface ?? FALLBACK_COLORS.surface,
    '--sq-checkout-accent': colors.accent ?? FALLBACK_COLORS.accent,
    '--sq-checkout-text': colors.text ?? FALLBACK_COLORS.text,
    '--sq-checkout-button-text': colors.buttonText ?? FALLBACK_COLORS.buttonText,
  };
}

export function checkoutExperienceBackground(
  experience: CheckoutExperienceSettings,
): string {
  return BACKGROUNDS[experience.backgroundPreset] ?? BACKGROUNDS.sand;
}

export function checkoutExperienceColorScheme(
  experience: CheckoutExperienceSettings,
): 'light' | 'dark' {
  if (experience.backgroundPreset === 'midnight') return 'dark';
  const customBackground = experience.customColors.background ?? experience.customColors.surface;
  if (customBackground && isDarkHex(customBackground)) return 'dark';
  return 'light';
}

function isDarkHex(value: string): boolean {
  const hex = value.trim().replace(/^#/, '');
  if (![3, 6, 8].includes(hex.length)) return false;
  const normalized =
    hex.length === 3
      ? hex
          .split('')
          .map((part) => part + part)
          .join('')
      : hex.slice(0, 6);
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return false;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.42;
}

export function getConfirmedPaymentProvider(checkout: CheckoutSettings): PaymentMethod | null {
  if (checkout.paymentMethods.includes('skipcash') && checkout.skipCash?.enabled) return 'skipcash';
  if (checkout.paymentMethods.includes('sadad') && checkout.sadad?.enabled) return 'sadad';
  if (checkout.paymentMethods.includes('pay_link') && checkout.payLink?.url) return 'pay_link';
  return null;
}

export function isRedirectPaymentMethod(method: PaymentMethod): boolean {
  return method === 'skipcash' || method === 'sadad' || method === 'pay_link';
}
