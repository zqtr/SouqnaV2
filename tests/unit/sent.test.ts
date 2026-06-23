import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadSent(vars: Record<string, string | undefined> = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) continue;
    vi.stubEnv(key, value);
  }
  return import('@/lib/sent');
}

describe('Sent.dm helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('keeps the confirmed Souqna template mapping', async () => {
    const sent = await loadSent();
    expect(sent.SENT_TEMPLATE_IDS).toEqual({
      marketing: '298977b3-2b1e-417f-b21a-01cb736f7e74',
      customer_care: '9d4a9ff0-f30f-459b-bb36-8ac5a439d9a4',
      fraud_alert: 'ac10bc6b-cfe9-414d-aecc-ebd39c7cd46b',
      delivery_notification: '03d03346-b6c3-4d51-8bb1-ada44226ad78',
      account_notification: '9d4a9ff0-f30f-459b-bb36-8ac5a439d9a4',
    });
    expect(sent.SENT_ORDER_TEMPLATE_IDS).toEqual({
      pending: '1539350971245152',
      confirmed: '2277019266458305',
      preparing: '980516908223295',
      shipped: '4498195207132467',
      delivered: '904381476010781',
    });
  });

  it('normalizes Qatari and international phone numbers to E.164', async () => {
    const { normalizeSentPhone } = await loadSent();
    expect(normalizeSentPhone('5555 4444')).toBe('+97455554444');
    expect(normalizeSentPhone('97455554444')).toBe('+97455554444');
    expect(normalizeSentPhone('0097155554444')).toBe('+97155554444');
    expect(normalizeSentPhone('+1 (415) 555-1212')).toBe('+14155551212');
    expect(normalizeSentPhone('12')).toBeNull();
  });

  it('builds the Sent v3 message payload with template parameters', async () => {
    const { buildSentMessagePayload } = await loadSent();
    expect(
      buildSentMessagePayload({
        to: ['55554444', '55554444', null],
        templateId: '0507e170-a5f5-4cdd-8762-5da349c2851b',
        parameters: {
          customerName: 'Maha',
          empty: '',
          orderNumber: '#ABC',
        },
        channel: ['whatsapp'],
        sandbox: true,
      }),
    ).toEqual({
      to: ['+97455554444'],
      channel: ['whatsapp'],
      sandbox: true,
      template: {
        id: '0507e170-a5f5-4cdd-8762-5da349c2851b',
        parameters: {
          customerName: 'Maha',
          orderNumber: '#ABC',
        },
      },
    });
  });

  it('adds generic Sent template variable aliases before sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ data: { messages: [{ id: 'msg_123' }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendSentTemplate } = await loadSent({ SENT_API_KEY: 'test_key' });

    await expect(
      sendSentTemplate({
        kind: 'account_notification',
        to: ['55554444'],
        sandbox: true,
        parameters: {
          customerName: 'Maha',
          storeName: 'Test',
          subject: 'Welcome',
          message: 'Your store is ready.',
          actionUrl: 'https://souqna.qa/account',
        },
      }),
    ).resolves.toMatchObject({ status: 'sent', recipientCount: 1 });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      to: ['+97455554444'],
      sandbox: true,
      template: {
        id: '9d4a9ff0-f30f-459b-bb36-8ac5a439d9a4',
        parameters: {
          customerName: 'Maha',
          storeName: 'Test',
          subject: 'Welcome',
          message: 'Your store is ready.',
          actionUrl: 'https://souqna.qa/account',
          foundername: 'Maha',
          dashboardURL: 'https://souqna.qa/account',
          founder_name: 'Maha',
          store_name: 'Test',
          dashboard_url: 'https://souqna.qa/account',
          var_1: 'Maha',
          var_2: 'Test',
          var_3: 'Welcome',
          var_4: 'Your store is ready.',
          var_5: 'https://souqna.qa/account',
        },
      },
    });
  });

  it('adds approved order template variables before delivery sends', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ data: { messages: [{ id: 'msg_123' }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendSentTemplate } = await loadSent({ SENT_API_KEY: 'test_key' });

    await sendSentTemplate({
      kind: 'delivery_notification',
      to: ['55554444'],
      parameters: {
        customerName: 'Maha',
        storeName: 'Test',
        orderNumber: '#ABC',
        orderStatus: 'pending',
        total: 'QAR 130',
        actionUrl: 'https://test.souqna.qa/checkout/thank-you/order',
        storeUrl: 'https://test.souqna.qa',
      },
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      template: {
        id: '03d03346-b6c3-4d51-8bb1-ada44226ad78',
        parameters: {
          customer_name: 'Maha',
          store_name: 'Test',
          order_number: '#ABC',
          order_total: 'QAR 130',
          order_url: 'https://test.souqna.qa/checkout/thank-you/order',
          store_url: 'https://test.souqna.qa',
          visit_store_url: 'https://test.souqna.qa',
          button_url: 'https://test.souqna.qa',
          var_1: 'Maha',
          var_2: 'Test',
          var_3: '#ABC',
          var_4: 'pending',
          var_5: 'QAR 130',
          var_6: 'https://test.souqna.qa',
        },
      },
    });
  });

  it('sends lifecycle order notifications with the approved sent.dm order template id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ data: { messages: [{ id: 'msg_order' }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendSentDeliveryNotification } = await loadSent({ SENT_API_KEY: 'test_key' });

    await expect(
      sendSentDeliveryNotification({
        phone: '55554444',
        storeName: 'Thisisatest',
        idempotencyKey: 'order-status-confirmed-A28C77C7',
        order: {
          id: 'A28C77C7',
          storefrontSlug: 'thisisatest',
          customerName: 'Abdulla',
          customerPhone: '55554444',
          customerEmail: null,
          address: null,
          paymentMethod: 'cod',
          paymentStatus: 'unpaid',
          orderStatus: 'confirmed',
          currency: 'QAR',
          subtotalQar: 6000,
          discountQar: 0,
          discountCode: null,
          discountId: null,
          shippingQar: 0,
          taxQar: 0,
          totalQar: 6000,
          planSnapshot: '{}',
          sellerNetQar: 6000,
          collectionMode: 'offline',
          platformProvider: null,
          payoutStatus: 'not_applicable',
          acceptedPolicies: [],
          notes: null,
          metadata: null,
          createdAt: '2026-06-16T00:00:00.000Z',
          updatedAt: '2026-06-16T00:00:00.000Z',
          items: [],
        },
      }),
    ).resolves.toMatchObject({ status: 'sent', messageId: 'msg_order' });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      'Idempotency-Key': 'order-status-confirmed-A28C77C7',
    });
    expect(request).toEqual({
      to: ['+97455554444'],
      channel: ['whatsapp'],
      template: {
        id: '2277019266458305',
        parameters: {
          customerName: 'Abdulla',
          orderNumber: 'A28C77C7',
          storeName: 'Thisisatest',
          orderTotal: 'QAR 6,000',
        },
      },
    });
  });

  it('builds a storefront homepage URL for the delivery Visit Store button', async () => {
    const { deliveryParameters, sentTemplateParameters } = await loadSent({
      BRIEF_ROOT_DOMAIN: 'souqna.qa',
      NEXT_PUBLIC_SITE_URL: 'https://souqna.qa',
    });

    const parameters = deliveryParameters({
      storeName: 'Thisisatest',
      message: 'We will update you when your order moves forward.',
      order: {
        id: 'A28C77C7',
        storefrontSlug: 'thisisatest',
        customerName: 'Abdulla',
        customerPhone: '55554444',
        customerEmail: null,
        address: null,
        paymentMethod: 'cod',
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
        currency: 'QAR',
        subtotalQar: 6000,
        discountQar: 0,
        discountCode: null,
        discountId: null,
        shippingQar: 0,
        taxQar: 0,
        totalQar: 6000,
        planSnapshot: '{}',
        sellerNetQar: 6000,
        collectionMode: 'offline',
        platformProvider: null,
        payoutStatus: 'not_applicable',
        acceptedPolicies: [],
        notes: null,
        metadata: null,
        createdAt: '2026-06-16T00:00:00.000Z',
        updatedAt: '2026-06-16T00:00:00.000Z',
        items: [],
      },
    });

    expect(parameters).toMatchObject({
      actionUrl: 'https://thisisatest.souqna.qa/checkout/thank-you/A28C77C7',
      orderUrl: 'https://thisisatest.souqna.qa/checkout/thank-you/A28C77C7',
      storeUrl: 'https://thisisatest.souqna.qa',
      store_url: 'https://thisisatest.souqna.qa',
      visit_store_url: 'https://thisisatest.souqna.qa',
      button_url: 'https://thisisatest.souqna.qa',
    });
    expect(sentTemplateParameters('delivery_notification', parameters)).toMatchObject({
      order_url: 'https://thisisatest.souqna.qa/checkout/thank-you/A28C77C7',
      store_url: 'https://thisisatest.souqna.qa',
      visit_store_url: 'https://thisisatest.souqna.qa',
      button_url: 'https://thisisatest.souqna.qa',
      var_6: 'https://thisisatest.souqna.qa',
    });
  });

  it('skips sends when the server API key is missing', async () => {
    const { sendSentTemplate } = await loadSent({ SENT_API_KEY: '' });
    await expect(
      sendSentTemplate({
        kind: 'account_notification',
        to: ['55554444'],
        parameters: { message: 'Hello' },
      }),
    ).resolves.toEqual({ status: 'skipped', reason: 'missing_sent_api_key' });
  });

  it('posts to the official Sent endpoint and surfaces provider errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Bad key' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendSentTemplate } = await loadSent({ SENT_API_KEY: 'test_key' });

    const result = await sendSentTemplate({
      kind: 'customer_care',
      to: ['55554444'],
      parameters: { customerName: 'Maha', message: 'We can help.' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sent.dm/v3/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test_key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result).toEqual({
      status: 'error',
      statusCode: 401,
      reason: 'Sent request failed (401): Bad key',
    });
  });

  it('includes nested Sent validation details in error messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'A required field is missing',
          details: [{ field: 'template.parameters.var_2', message: 'required' }],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendSentTemplate } = await loadSent({ SENT_API_KEY: 'test_key' });

    const result = await sendSentTemplate({
      kind: 'marketing',
      to: ['55554444'],
      parameters: { message: 'Hello' },
    });

    expect(result).toEqual({
      status: 'error',
      statusCode: 400,
      reason:
        'Sent request failed (400): A required field is missing - template.parameters.var_2 - required',
    });
  });

  it('reads Sent message status without exposing recipient details', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'msg_1',
          phone: '+97455554444',
          channel: 'whatsapp',
          status: 'FAILED',
          events: [
            { status: 'QUEUED', description: 'Message queued for sending' },
            { status: 'FAILED', description: 'Message updated to FAILED' },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getSentMessageStatus } = await loadSent({ SENT_API_KEY: 'test_key' });

    await expect(getSentMessageStatus('msg_1')).resolves.toMatchObject({
      status: 'ok',
      messageStatus: 'FAILED',
      channel: 'whatsapp',
      description: 'Message updated to FAILED',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sent.dm/v3/messages/msg_1',
      expect.objectContaining({
        method: 'GET',
        headers: { 'x-api-key': 'test_key' },
      }),
    );
  });

  it('uses the event matching the final Sent status when events are newest-first', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'msg_1',
          channel: 'whatsapp',
          status: 'FAILED',
          events: [
            { status: 'FAILED', description: 'Message updated to FAILED' },
            { status: 'QUEUED', description: 'Message updated to QUEUED' },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getSentMessageStatus } = await loadSent({ SENT_API_KEY: 'test_key' });

    await expect(getSentMessageStatus('msg_1')).resolves.toMatchObject({
      status: 'ok',
      messageStatus: 'FAILED',
      description: 'Message updated to FAILED',
    });
  });

  it('falls back to provider failure fields when Sent has no event description', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'msg_1',
          channel: 'whatsapp',
          status: 'FAILED',
          failure_reason: 'Template parameter mismatch',
          events: [{ status: 'FAILED' }],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getSentMessageStatus } = await loadSent({ SENT_API_KEY: 'test_key' });

    await expect(getSentMessageStatus('msg_1')).resolves.toMatchObject({
      status: 'ok',
      messageStatus: 'FAILED',
      description: 'Template parameter mismatch',
    });
  });
});
