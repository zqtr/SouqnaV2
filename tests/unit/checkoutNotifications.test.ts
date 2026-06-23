import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/lib/checkout-orders';

const sendNewOrderToOwnerMock = vi.hoisted(() => vi.fn());
const sendOrderConfirmationToBuyerMock = vi.hoisted(() => vi.fn());
const notifyMobileNewOrderMock = vi.hoisted(() => vi.fn());
const pushOrderCreatedNotificationMock = vi.hoisted(() => vi.fn());
const sendWhatsAppOrderConfirmationMock = vi.hoisted(() => vi.fn());
const captureMessageMock = vi.hoisted(() => vi.fn());
const captureExceptionMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/email/checkout-emails', () => ({
  sendNewOrderToOwner: sendNewOrderToOwnerMock,
  sendOrderConfirmationToBuyer: sendOrderConfirmationToBuyerMock,
}));

vi.mock('@/lib/mobile/push', () => ({
  notifyMobileNewOrder: notifyMobileNewOrderMock,
}));

vi.mock('@/lib/notifications', () => ({
  pushOrderCreatedNotification: pushOrderCreatedNotificationMock,
}));

vi.mock('@/lib/apps/whatsapp', () => ({
  sendWhatsAppOrderConfirmation: sendWhatsAppOrderConfirmationMock,
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: captureMessageMock,
  captureException: captureExceptionMock,
}));

import { notifyCheckoutOrderCreated } from '@/lib/checkout-notifications';

const order: Order = {
  id: '4bb6f20f-6a0d-4ecf-af3c-df7682b407b3',
  storefrontSlug: 'test',
  customerName: 'Maha',
  customerPhone: '55554444',
  customerEmail: 'buyer@example.com',
  address: null,
  paymentMethod: 'cod',
  paymentStatus: 'unpaid',
  orderStatus: 'pending',
  currency: 'QAR',
  subtotalQar: 120,
  discountQar: 0,
  discountCode: null,
  discountId: null,
  shippingQar: 10,
  taxQar: 0,
  totalQar: 130,
  planSnapshot: 'free',
  sellerNetQar: 130,
  collectionMode: 'seller_direct',
  platformProvider: null,
  payoutStatus: 'not_applicable',
  acceptedPolicies: [],
  notes: null,
  metadata: null,
  createdAt: '2026-06-16T08:00:00.000Z',
  updatedAt: '2026-06-16T08:00:00.000Z',
  items: [],
};

describe('notifyCheckoutOrderCreated', () => {
  beforeEach(() => {
    sendNewOrderToOwnerMock.mockReset();
    sendOrderConfirmationToBuyerMock.mockReset();
    notifyMobileNewOrderMock.mockReset();
    pushOrderCreatedNotificationMock.mockReset();
    sendWhatsAppOrderConfirmationMock.mockReset();
    captureMessageMock.mockReset();
    captureExceptionMock.mockReset();

    sendNewOrderToOwnerMock.mockResolvedValue({
      ok: true,
      provider: 'resend',
      id: 'owner-email',
    });
    sendOrderConfirmationToBuyerMock.mockResolvedValue({
      ok: true,
      provider: 'resend',
      id: 'buyer-email',
    });
    notifyMobileNewOrderMock.mockResolvedValue(undefined);
    pushOrderCreatedNotificationMock.mockResolvedValue(undefined);
    sendWhatsAppOrderConfirmationMock.mockResolvedValue({
      status: 'sent',
      messageId: 'msg_1',
    });
  });

  it('runs every channel even when one notification throws', async () => {
    sendNewOrderToOwnerMock.mockRejectedValueOnce(new Error('resend unavailable'));

    await notifyCheckoutOrderCreated({
      slug: 'test',
      storefront: {
        clerkUserId: 'user_123',
        founderName: 'Maha',
        businessName: 'Test Store',
        contactEmail: 'owner@example.com',
      },
      order,
    });

    expect(sendNewOrderToOwnerMock).toHaveBeenCalledTimes(1);
    expect(notifyMobileNewOrderMock).toHaveBeenCalledTimes(1);
    expect(pushOrderCreatedNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppOrderConfirmationMock).toHaveBeenCalledTimes(1);
    expect(sendOrderConfirmationToBuyerMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ channel: 'owner-email', slug: 'test' }),
      }),
    );
  });

  it('captures provider failures without throwing back to checkout', async () => {
    sendNewOrderToOwnerMock.mockResolvedValueOnce({
      ok: false,
      provider: 'resend',
      error: 'domain not verified',
    });
    sendOrderConfirmationToBuyerMock.mockResolvedValueOnce({
      ok: false,
      provider: 'resend',
      error: 'rate limited',
    });
    sendWhatsAppOrderConfirmationMock.mockResolvedValueOnce({
      status: 'error',
      reason: 'Sent rejected the template',
    });

    await expect(
      notifyCheckoutOrderCreated({
        slug: 'test',
        storefront: {
          clerkUserId: 'user_123',
          founderName: 'Maha',
          businessName: 'Test Store',
          contactEmail: 'owner@example.com',
        },
        order,
      }),
    ).resolves.toBeUndefined();

    expect(captureMessageMock).toHaveBeenCalledWith(
      'checkout owner email failed',
      expect.objectContaining({
        tags: expect.objectContaining({ channel: 'email', provider: 'resend' }),
      }),
    );
    expect(captureMessageMock).toHaveBeenCalledWith(
      'checkout buyer email failed',
      expect.objectContaining({
        tags: expect.objectContaining({ channel: 'email', provider: 'resend' }),
      }),
    );
    expect(captureMessageMock).toHaveBeenCalledWith(
      'checkout WhatsApp order confirmation failed',
      expect.objectContaining({
        tags: expect.objectContaining({ channel: 'whatsapp', status: 'error' }),
      }),
    );
  });
});
