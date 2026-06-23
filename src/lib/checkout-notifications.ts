import 'server-only';

import * as Sentry from '@sentry/nextjs';

import type { Order } from '@/lib/checkout-orders';
import {
  sendNewOrderToOwner,
  sendOrderConfirmationToBuyer,
  type PaymentInstructionBlock,
} from '@/lib/email/checkout-emails';
import { notifyMobileNewOrder } from '@/lib/mobile/push';
import { pushOrderCreatedNotification } from '@/lib/notifications';
import { sendWhatsAppOrderConfirmation } from '@/lib/apps/whatsapp';

export type CheckoutNotificationStorefront = {
  clerkUserId: string;
  founderName?: string | null;
  businessName: string;
  contactEmail?: string | null;
};

export type NotifyCheckoutOrderCreatedInput = {
  slug: string;
  storefront: CheckoutNotificationStorefront;
  order: Order;
  paymentInstructions?: PaymentInstructionBlock | null;
};

export async function notifyCheckoutOrderCreated(
  input: NotifyCheckoutOrderCreatedInput,
): Promise<void> {
  await Promise.all([
    attemptNotification(input.slug, 'owner-email', async () => {
      const ownerEmail = input.storefront.contactEmail?.trim();
      if (!ownerEmail) return;
      const owner = await sendNewOrderToOwner({
        ownerEmail,
        slug: input.slug,
        order: input.order,
        paymentInstructions: input.paymentInstructions ?? null,
      });
      if (!owner.ok) {
        console.warn('[checkout-notifications] owner email failed', {
          slug: input.slug,
          provider: owner.provider,
          error: owner.error,
        });
        Sentry.captureMessage('checkout owner email failed', {
          level: 'warning',
          tags: {
            area: 'checkout',
            slug: input.slug,
            provider: owner.provider,
            channel: 'email',
          },
          extra: { error: owner.error },
        });
      }
    }),
    attemptNotification(input.slug, 'mobile-push', async () => {
      await notifyMobileNewOrder({
        storefrontSlug: input.slug,
        businessName: input.storefront.businessName,
        order: input.order,
      });
    }),
    attemptNotification(input.slug, 'in-app-notification', async () => {
      await pushOrderCreatedNotification({
        userId: input.storefront.clerkUserId,
        founderName: input.storefront.founderName,
        businessName: input.storefront.businessName,
        slug: input.slug,
        order: input.order,
      });
    }),
    attemptNotification(input.slug, 'whatsapp', async () => {
      const whatsapp = await sendWhatsAppOrderConfirmation({
        storefrontSlug: input.slug,
        businessName: input.storefront.businessName,
        order: input.order,
      });
      if (whatsapp.status !== 'sent') {
        console.warn('[checkout-notifications] WhatsApp order confirmation failed', {
          slug: input.slug,
          status: whatsapp.status,
          reason: whatsapp.reason,
        });
        Sentry.captureMessage('checkout WhatsApp order confirmation failed', {
          level: 'warning',
          tags: {
            area: 'checkout',
            slug: input.slug,
            channel: 'whatsapp',
            status: whatsapp.status,
          },
          extra: { reason: whatsapp.reason },
        });
      }
    }),
    attemptNotification(input.slug, 'buyer-email', async () => {
      const buyerEmail = input.order.customerEmail?.trim();
      if (!buyerEmail) return;
      const buyer = await sendOrderConfirmationToBuyer({
        buyerEmail,
        slug: input.slug,
        order: input.order,
        paymentInstructions: input.paymentInstructions ?? null,
      });
      if (!buyer.ok) {
        console.warn('[checkout-notifications] buyer email failed', {
          slug: input.slug,
          provider: buyer.provider,
          error: buyer.error,
        });
        Sentry.captureMessage('checkout buyer email failed', {
          level: 'warning',
          tags: {
            area: 'checkout',
            slug: input.slug,
            provider: buyer.provider,
            channel: 'email',
          },
          extra: { error: buyer.error },
        });
      }
    }),
  ]);
}

async function attemptNotification(
  slug: string,
  channel: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.warn('[checkout-notifications] channel threw', {
      slug,
      channel,
      error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, {
      tags: {
        area: 'checkout-notifications',
        slug,
        channel,
      },
    });
  }
}
