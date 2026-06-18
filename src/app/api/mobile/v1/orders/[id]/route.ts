import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { recordAudit } from '@/lib/audit';
import {
  getOrderById,
  markOnlinePaymentSucceeded,
  setOrderPaymentStatus,
  setOrderStatus,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/checkout-orders';
import {
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
  searchParam,
} from '@/lib/mobile/auth';
import {
  notifyMobileOrderShipped,
  notifyMobilePaymentPaid,
  notifyMobilePaymentRefunded,
} from '@/lib/mobile/push';
import { sendSentDeliveryNotification } from '@/lib/sent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

const PatchSchema = z.object({
  store: z.string().trim().min(1).max(64).optional(),
  orderStatus: z.enum(ORDER_STATUSES as unknown as [OrderStatus, ...OrderStatus[]]).optional(),
  paymentStatus: z
    .enum(PAYMENT_STATUSES as unknown as [PaymentStatus, ...PaymentStatus[]])
    .optional(),
  sendCustomerNotification: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const slug = searchParam(req, 'store');
  const gate = await requireMobileStoreAccess(slug, 'orders.manage');
  if (!gate.ok) return gate.response;

  const order = await getOrderById(params.id, gate.access.storefront.slug);
  if (!order) return mobileError(404, 'not_found', 'Order not found.');
  return mobileJson({ order });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(400, 'invalid_order_update', 'Invalid order update.');
  }
  const slug = parsed.data.store ?? searchParam(req, 'store');
  const gate = await requireMobileStoreAccess(slug, 'orders.manage');
  if (!gate.ok) return gate.response;

  let order = await getOrderById(params.id, gate.access.storefront.slug);
  if (!order) return mobileError(404, 'not_found', 'Order not found.');

  if (parsed.data.orderStatus && parsed.data.orderStatus !== order.orderStatus) {
    const updated = await setOrderStatus(
      params.id,
      gate.access.storefront.slug,
      parsed.data.orderStatus,
    );
    if (!updated) return mobileError(404, 'not_found', 'Order not found.');
    order = updated;
    await recordAudit({
      storefrontSlug: gate.access.storefront.slug,
      clerkUserId: gate.user.userId,
      action: `storefront.order.status.${parsed.data.orderStatus}`,
      targetId: params.id,
      summary: `Order status -> ${parsed.data.orderStatus}`,
      meta: { orderId: params.id, source: 'mobile' },
    });
    if (parsed.data.orderStatus === 'shipped') {
      // Fan out a push so team members + other devices learn the
      // shipment moved without polling. Best-effort — a failed Expo
      // push must not roll back the DB mutation.
      void notifyMobileOrderShipped({
        storefrontSlug: gate.access.storefront.slug,
        businessName: gate.access.storefront.businessName,
        order,
      }).catch((err) => console.error('[mobile/orders PATCH] shipped push failed', err));
    }
    if (
      parsed.data.sendCustomerNotification === true &&
      isBuyerFacingStatus(parsed.data.orderStatus)
    ) {
      await notifyBuyerOrderStatus({
        storefrontSlug: gate.access.storefront.slug,
        businessName: gate.access.storefront.businessName,
        status: parsed.data.orderStatus,
        order,
      });
    }
  }

  if (parsed.data.paymentStatus && parsed.data.paymentStatus !== order.paymentStatus) {
    const updated =
      parsed.data.paymentStatus === 'marked_paid' &&
      (order.paymentMethod === 'skipcash' || order.paymentMethod === 'sadad')
        ? await markOnlinePaymentSucceeded(params.id, gate.access.storefront.slug)
        : await setOrderPaymentStatus(
            params.id,
            gate.access.storefront.slug,
            parsed.data.paymentStatus,
          );
    if (!updated) return mobileError(404, 'not_found', 'Order not found.');
    order = updated;
    await recordAudit({
      storefrontSlug: gate.access.storefront.slug,
      clerkUserId: gate.user.userId,
      action: `storefront.order.payment.${parsed.data.paymentStatus}`,
      targetId: params.id,
      summary: `Order payment -> ${parsed.data.paymentStatus}`,
      meta: { orderId: params.id, source: 'mobile' },
    });
    if (parsed.data.paymentStatus === 'marked_paid') {
      void notifyMobilePaymentPaid({
        storefrontSlug: gate.access.storefront.slug,
        businessName: gate.access.storefront.businessName,
        order,
      }).catch((err) => console.error('[mobile/orders PATCH] paid push failed', err));
    } else if (parsed.data.paymentStatus === 'refunded') {
      void notifyMobilePaymentRefunded({
        storefrontSlug: gate.access.storefront.slug,
        businessName: gate.access.storefront.businessName,
        order,
      }).catch((err) => console.error('[mobile/orders PATCH] refund push failed', err));
    }
  }

  revalidatePath('/account/orders');
  return mobileJson({ order });
}

function isBuyerFacingStatus(status: OrderStatus): boolean {
  return (
    status === 'confirmed' ||
    status === 'preparing' ||
    status === 'shipped' ||
    status === 'delivered' ||
    status === 'cancelled'
  );
}

async function notifyBuyerOrderStatus(input: {
  storefrontSlug: string;
  businessName: string;
  status: OrderStatus;
  order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>;
}): Promise<void> {
  try {
    const result = await sendSentDeliveryNotification({
      phone: input.order.customerPhone,
      storeName: input.businessName,
      order: input.order,
      message: statusMessage(input.status),
      idempotencyKey: `mobile-order-status-${input.status}-${input.order.id}`,
    });
    if (result.status !== 'sent') {
      console.warn('[mobile/orders PATCH] buyer order notification not sent', {
        slug: input.storefrontSlug,
        status: input.status,
        sentStatus: result.status,
        reason: result.reason,
      });
    }
  } catch (err) {
    console.error('[mobile/orders PATCH] buyer order notification failed', err);
  }
}

function statusMessage(status: OrderStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Your order is confirmed.';
    case 'preparing':
      return 'Your order is being prepared.';
    case 'shipped':
      return 'Your order is on the way.';
    case 'delivered':
      return 'Your order has been delivered.';
    case 'cancelled':
      return 'Your order was cancelled. Contact the store if you have questions.';
    case 'pending':
    default:
      return 'Your order was received.';
  }
}
