import { NextResponse } from 'next/server';
import { getStorefront } from '@/lib/brief';
import {
  getOrderById,
  markOnlinePaymentFailed,
  markOnlinePaymentSucceeded,
} from '@/lib/checkout-orders';
import { recordPlatformPayoutForPaidOrder } from '@/lib/platformPayouts';
import { sendSentPaymentStatusNotification } from '@/lib/sent';
import { getSkipCashPaymentForMerchant, normalizeSkipCashStatusId } from '@/lib/skipcash';
import { getStorefrontSkipCashCredentials } from '@/lib/storefrontSkipcash';
import {
  resolveStorefrontSlugFromRequest,
  storefrontPageUrlFromRequest,
} from '@/lib/storefrontRequest';
import { storefrontPageUrl } from '@/lib/storefrontUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = await resolveStorefrontSlugFromRequest(req, url.searchParams.get('slug'));
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'storefront_not_found' }, { status: 400 });
  }
  const hostSlug = await resolveStorefrontSlugFromRequest(req);
  const pageUrl = (path: string) =>
    hostSlug === slug
      ? (storefrontPageUrlFromRequest(req, path) ?? storefrontPageUrl(slug, path))
      : storefrontPageUrl(slug, path);

  const paymentId =
    url.searchParams.get('id') ??
    url.searchParams.get('paymentId') ??
    url.searchParams.get('PaymentId') ??
    '';
  if (!paymentId) {
    return NextResponse.redirect(pageUrl('/checkout?skipcash=missing_payment'), 303);
  }

  const credentials = await getStorefrontSkipCashCredentials(slug);
  if (!credentials) {
    return NextResponse.redirect(pageUrl('/checkout?skipcash=not_configured'), 303);
  }

  let payment: Awaited<ReturnType<typeof getSkipCashPaymentForMerchant>>;
  try {
    payment = await getSkipCashPaymentForMerchant(paymentId, credentials);
  } catch (err) {
    console.warn('[checkout.skipcash-return] payment lookup failed', err);
    return NextResponse.redirect(pageUrl('/checkout?skipcash=lookup_failed'), 303);
  }

  const orderId = payment.custom1?.trim() ?? '';
  const order = orderId ? await getOrderById(orderId, slug) : null;
  if (!order || order.paymentMethod !== 'skipcash') {
    return NextResponse.redirect(pageUrl('/checkout?skipcash=unknown'), 303);
  }

  const statusId = normalizeSkipCashStatusId(payment.statusId);
  let result: 'paid' | 'failed' | 'cancelled' | 'pending' = 'pending';
  let updated = order;

  if (statusId === 2) {
    result = 'paid';
    updated = (await markOnlinePaymentSucceeded(order.id, slug)) ?? order;
    await recordPlatformPayoutForPaidOrder(updated);
    await notifyPaymentStatus(updated, 'paid');
  } else if (statusId === 3 || statusId === 4 || statusId === 5) {
    result = statusId === 3 ? 'cancelled' : 'failed';
    updated = (await markOnlinePaymentFailed(order.id, slug)) ?? order;
    await notifyPaymentStatus(updated, 'failed');
  }

  if (updated.paymentStatus === 'marked_paid') result = 'paid';
  if (updated.paymentStatus === 'payment_failed' && result === 'pending') result = 'failed';

  return NextResponse.redirect(pageUrl(`/checkout/thank-you/${order.id}?skipcash=${result}`), 303);
}

async function notifyPaymentStatus(
  order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>,
  status: 'paid' | 'failed',
) {
  try {
    const storefront = await getStorefront(order.storefrontSlug);
    if (!storefront) return;
    const sent = await sendSentPaymentStatusNotification({
      storeName: storefront.businessName,
      order,
      status,
      idempotencyKey: `skipcash-${status}-${order.id}`,
    });
    if (sent.status !== 'sent') {
      console.warn('[checkout.skipcash-return] Sent notification failed', sent.reason);
    }
  } catch (err) {
    console.warn('[checkout.skipcash-return] Sent notification failed', err);
  }
}
