import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://souqna.qa',
    SKIPCASH_ENV: 'sandbox',
    SKIPCASH_CLIENT_ID: 'client_123',
    SKIPCASH_KEY_ID: 'key_123',
    SKIPCASH_KEY_SECRET: 'secret_123',
    SKIPCASH_WEBHOOK_KEY: 'webhook_secret_123',
    SKIPCASH_DEFAULT_PHONE: '+97450000000',
  },
}));

import {
  cancelSkipCashRecurringPayment,
  createSkipCashPayment,
  normalizeSkipCashRecurringSubscriptionId,
  normalizeWebhookPayload,
} from '@/lib/skipcash';

describe('SkipCash recurring billing helpers', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds recurring plan fields to Souqna plan checkout payment creation', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          resultObj: {
            id: 'pay_123',
            statusId: 0,
            payUrl: 'https://skipcash.test/pay/pay_123',
            amount: '32.00',
            currency: 'QAR',
            recurringSubscriptionId: 'sub_123',
          },
          hasError: false,
          hasValidationError: false,
        }),
    });

    const payment = await createSkipCashPayment({
      amountQar: 32,
      firstName: 'Souqna',
      lastName: 'Merchant',
      email: 'merchant@souqna.qa',
      phone: '+97450000000',
      transactionId: 'txn_123',
      custom1: 'user_123:starter:monthly',
      returnUrl: 'https://souqna.qa/account/settings/plan?skipcash=success',
      webhookUrl: 'https://souqna.qa/api/billing/skipcash-webhook',
      recurring: {
        planName: 'Souqna Pro Monthly',
        frequency: '1',
        interval: 'month',
        startDate: '2026-06-23',
        endDate: '2036-06-23',
        allowedFailedAttempts: '3',
        firstPaymentAmountQar: 32,
      },
    });

    expect(payment.recurringSubscriptionId).toBe('sub_123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      Amount: '32.00',
      TransactionId: 'txn_123',
      Custom1: 'user_123:starter:monthly',
      ReturnUrl: 'https://souqna.qa/account/settings/plan?skipcash=success',
      WebhookUrl: 'https://souqna.qa/api/billing/skipcash-webhook',
      IsRecurring: true,
      PlanName: 'Souqna Pro Monthly',
      Frequency: '1',
      Interval: 'month',
      StartDate: '2026-06-23',
      EndDate: '2036-06-23',
      AllowedFailedAttempts: '3',
      FirstPaymentAmount: '32.00',
    });
    expect((init.headers as Record<string, string>).Authorization).toEqual(expect.any(String));
  });

  it('normalizes recurring subscription ids from webhooks', () => {
    expect(normalizeSkipCashRecurringSubscriptionId('sub_123')).toBe('sub_123');
    expect(
      normalizeSkipCashRecurringSubscriptionId('00000000-0000-0000-0000-000000000000'),
    ).toBeNull();
    expect(
      normalizeWebhookPayload({
        PaymentId: 'pay_123',
        StatusId: 2,
        RecurringSubscriptionId: 'sub_123',
      }),
    ).toMatchObject({
      PaymentId: 'pay_123',
      StatusId: '2',
      RecurringSubscriptionId: 'sub_123',
    });
  });

  it('calls the SkipCash cancel recurring endpoint with the recurring id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          resultObj: {
            subscriptionId: 'sub_123',
            isCancelled: true,
            message: 'Subscription cancel',
          },
          hasError: false,
          hasValidationError: false,
        }),
    });

    await expect(cancelSkipCashRecurringPayment('sub_123')).resolves.toMatchObject({
      isCancelled: true,
      subscriptionId: 'sub_123',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/payments/subscription/cancel');
    expect(JSON.parse(String(init.body))).toEqual({ Id: 'sub_123', KeyId: 'key_123' });
    expect((init.headers as Record<string, string>).Authorization).toEqual(expect.any(String));
  });
});
