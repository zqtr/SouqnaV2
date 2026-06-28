const CONFIRMED_ORDER_STATUSES = new Set(['confirmed', 'preparing', 'shipped', 'delivered']);
const OPEN_CASH_ORDER_STATUSES = new Set(['pending', ...CONFIRMED_ORDER_STATUSES]);

export function normalizeWaMePhone(input: string | null | undefined): string | null {
  const digits = input?.replace(/\D/g, '') ?? '';
  if (!digits) return null;
  if (digits.startsWith('00') && digits.length >= 10) {
    const international = digits.slice(2);
    return international.length >= 10 && international.length <= 15 ? international : null;
  }
  if (digits.length === 8) return `974${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

export function shouldShowOrderWhatsAppButton(order: {
  paymentMethod?: string;
  paymentStatus: string;
  orderStatus: string;
}): boolean {
  if (order.orderStatus === 'cancelled' || order.paymentStatus === 'payment_failed') return false;
  if (order.paymentMethod === 'cod') return OPEN_CASH_ORDER_STATUSES.has(order.orderStatus);
  return order.paymentStatus === 'marked_paid' || CONFIRMED_ORDER_STATUSES.has(order.orderStatus);
}

export function buildOrderWhatsAppUrl(input: {
  phone: string | null | undefined;
  storeName: string;
  orderDisplayCode: string;
  paymentMethod?: string;
  locale?: string;
}): string | null {
  const phone = normalizeWaMePhone(input.phone);
  if (!phone) return null;
  const isCashOrder = input.paymentMethod === 'cod';
  const message =
    input.locale === 'ar'
      ? isCashOrder
        ? `مرحباً ${input.storeName}، أكملت طلب الدفع عند الاستلام ${input.orderDisplayCode} وأرغب بالتواصل بخصوص طلبي.`
        : `مرحباً ${input.storeName}، دفعت قيمة الطلب ${input.orderDisplayCode} وأرغب بالتواصل بخصوص طلبي.`
      : isCashOrder
        ? `Hi ${input.storeName}, I placed cash order ${input.orderDisplayCode} and would like to chat about my order.`
        : `Hi ${input.storeName}, I paid for order ${input.orderDisplayCode} and would like to chat about my order.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const shouldShowPaidOrderWhatsAppButton = shouldShowOrderWhatsAppButton;
export const buildPaidOrderWhatsAppUrl = buildOrderWhatsAppUrl;
