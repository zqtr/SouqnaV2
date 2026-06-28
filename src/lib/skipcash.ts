import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from './env';

type SkipCashPaymentStatus =
  | 'new'
  | 'pending'
  | 'paid'
  | 'canceled'
  | 'failed'
  | 'rejected'
  | 'refunded'
  | 'pending_refund'
  | 'refund_failed'
  | string;

export type SkipCashPayment = {
  id: string;
  statusId: number;
  created?: string;
  payUrl?: string;
  amount: number | string;
  firstPaymentAmount?: number | string;
  currency?: string;
  transactionId?: string | null;
  custom1?: string | null;
  visaId?: string | null;
  status?: SkipCashPaymentStatus;
  recurringSubscriptionId?: string | null;
};

type SkipCashResponse<T> = {
  resultObj?: T;
  returnCode?: number;
  errorCode?: number;
  errorMessage?: string | null;
  error?: unknown;
  validationErrors?: unknown;
  hasError?: boolean;
  hasValidationError?: boolean;
};

type CreatePaymentInput = {
  amountQar: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  transactionId: string;
  custom1?: string | null;
  returnUrl?: string | null;
  webhookUrl?: string | null;
  recurring?: {
    planName: string;
    frequency: string | number;
    interval: 'day' | 'week' | 'month' | 'year';
    startDate: string;
    endDate: string;
    allowedFailedAttempts?: string | number;
    firstPaymentAmountQar?: number;
  };
};

export type SkipCashMerchantCredentials = {
  clientId: string;
  keyId: string;
  keySecret: string;
  webhookKey?: string | null;
};

type SkipCashCreateRequest = {
  Uid: string;
  KeyId: string;
  Amount: string;
  FirstName: string;
  LastName: string;
  Phone?: string;
  Email: string;
  Street?: string;
  City?: string;
  State?: string;
  Country?: string;
  PostalCode?: string;
  TransactionId: string;
  Custom1?: string;
  ReturnUrl?: string;
  WebhookUrl?: string;
  IsRecurring?: boolean;
  PlanName?: string;
  Frequency?: string;
  Interval?: string;
  StartDate?: string;
  EndDate?: string;
  AllowedFailedAttempts?: string;
  FirstPaymentAmount?: string;
};

export type SkipCashWebhookPayload = {
  paymentId?: string;
  PaymentId?: string;
  amount?: string;
  Amount?: string;
  statusId?: number | string;
  StatusId?: number | string;
  transactionId?: string | null;
  TransactionId?: string | null;
  custom1?: string | null;
  Custom1?: string | null;
  visaId?: string | null;
  VisaId?: string | null;
  recurringSubscriptionId?: string | null;
  RecurringSubscriptionId?: string | null;
};

const CREATE_SIGNATURE_KEYS = [
  'Uid',
  'KeyId',
  'Amount',
  'FirstName',
  'LastName',
  'Phone',
  'Email',
  'Street',
  'City',
  'State',
  'Country',
  'PostalCode',
  'TransactionId',
  'Custom1',
] as const;

const CANCEL_SUBSCRIPTION_SIGNATURE_KEYS = ['Id', 'KeyId'] as const;

const WEBHOOK_SIGNATURE_KEYS = [
  'PaymentId',
  'Amount',
  'StatusId',
  'TransactionId',
  'Custom1',
  'VisaId',
] as const;

export function hasSkipCash(): boolean {
  return Boolean(env.SKIPCASH_CLIENT_ID && env.SKIPCASH_KEY_ID && env.SKIPCASH_KEY_SECRET);
}

export function skipCashBaseUrl(): string {
  return env.SKIPCASH_ENV === 'live'
    ? 'https://api.skipcash.app/api/v1'
    : 'https://skipcashtest.azurewebsites.net/api/v1';
}

export function newSkipCashTransactionId(): string {
  return randomUUID();
}

export function skipCashAmount(amountQar: number): string {
  return amountQar.toFixed(2);
}

export function normalizeSkipCashRecurringSubscriptionId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '00000000-0000-0000-0000-000000000000') return null;
  return trimmed;
}

export async function createSkipCashPayment(input: CreatePaymentInput): Promise<SkipCashPayment> {
  if (!hasSkipCash() || !env.SKIPCASH_KEY_ID || !env.SKIPCASH_KEY_SECRET) {
    throw new Error('SkipCash not configured');
  }

  const payload: SkipCashCreateRequest = {
    Uid: randomUUID(),
    KeyId: env.SKIPCASH_KEY_ID,
    Amount: skipCashAmount(input.amountQar),
    FirstName: trimField(input.firstName, 60) || 'Souqna',
    LastName: trimField(input.lastName, 60) || 'Customer',
    Phone: trimField(input.phone ?? env.SKIPCASH_DEFAULT_PHONE ?? '', 15),
    Email: trimField(input.email, 255),
    Street: 'Doha',
    City: 'Doha',
    State: 'DA',
    Country: 'QA',
    PostalCode: '00000',
    TransactionId: trimField(input.transactionId, 40),
    Custom1: trimField(input.custom1 ?? '', 50),
    ReturnUrl: trimField(input.returnUrl ?? '', 300),
    WebhookUrl: trimField(input.webhookUrl ?? '', 300),
  };
  applyRecurringFields(payload, input);

  const signature = signValues(payload, CREATE_SIGNATURE_KEYS, env.SKIPCASH_KEY_SECRET);
  const res = await fetch(`${skipCashBaseUrl()}/payments`, {
    method: 'POST',
    headers: {
      Authorization: signature,
      'Content-Type': 'application/json;charset=UTF-8',
      'x-client-id': env.SKIPCASH_CLIENT_ID ?? '',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as SkipCashResponse<SkipCashPayment>) : {};

  if (!res.ok || json.hasError || json.hasValidationError || !json.resultObj) {
    throw new Error(`SkipCash create payment failed (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!json.resultObj.payUrl) {
    throw new Error('SkipCash create payment response did not include a payUrl');
  }
  return json.resultObj;
}

export async function createSkipCashPaymentForMerchant(
  input: CreatePaymentInput,
  credentials: SkipCashMerchantCredentials,
): Promise<SkipCashPayment> {
  if (!credentials.clientId || !credentials.keyId || !credentials.keySecret) {
    throw new Error('SkipCash merchant credentials are missing');
  }

  const payload: SkipCashCreateRequest = {
    Uid: randomUUID(),
    KeyId: credentials.keyId,
    Amount: skipCashAmount(input.amountQar),
    FirstName: trimField(input.firstName, 60) || 'Souqna',
    LastName: trimField(input.lastName, 60) || 'Customer',
    Phone: trimField(input.phone ?? env.SKIPCASH_DEFAULT_PHONE ?? '', 15),
    Email: trimField(input.email, 255),
    Street: 'Doha',
    City: 'Doha',
    State: 'DA',
    Country: 'QA',
    PostalCode: '00000',
    TransactionId: trimField(input.transactionId, 40),
    Custom1: trimField(input.custom1 ?? '', 50),
    ReturnUrl: trimField(input.returnUrl ?? '', 300),
    WebhookUrl: trimField(input.webhookUrl ?? '', 300),
  };
  applyRecurringFields(payload, input);

  const signature = signValues(payload, CREATE_SIGNATURE_KEYS, credentials.keySecret);
  const res = await fetch(`${skipCashBaseUrl()}/payments`, {
    method: 'POST',
    headers: {
      Authorization: signature,
      'Content-Type': 'application/json;charset=UTF-8',
      'x-client-id': credentials.clientId,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as SkipCashResponse<SkipCashPayment>) : {};

  if (!res.ok || json.hasError || json.hasValidationError || !json.resultObj) {
    throw new Error(
      `SkipCash create merchant payment failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
  if (!json.resultObj.payUrl) {
    throw new Error('SkipCash create payment response did not include a payUrl');
  }
  return json.resultObj;
}

export type SkipCashCancelRecurringResult = {
  subscriptionId?: string | null;
  isCancelled?: boolean;
  message?: string | null;
};

export async function cancelSkipCashRecurringPayment(
  subscriptionId: string,
): Promise<SkipCashCancelRecurringResult> {
  if (!hasSkipCash() || !env.SKIPCASH_KEY_ID || !env.SKIPCASH_KEY_SECRET) {
    throw new Error('SkipCash not configured');
  }
  const normalized = normalizeSkipCashRecurringSubscriptionId(subscriptionId);
  if (!normalized) throw new Error('SkipCash recurring subscription id is missing');

  const payload = {
    Id: normalized,
    KeyId: env.SKIPCASH_KEY_ID,
  };
  const signature = signValues(
    payload,
    CANCEL_SUBSCRIPTION_SIGNATURE_KEYS,
    env.SKIPCASH_KEY_SECRET,
  );
  const res = await fetch(`${skipCashBaseUrl()}/payments/subscription/cancel`, {
    method: 'POST',
    headers: {
      Authorization: signature,
      'Content-Type': 'application/json;charset=UTF-8',
      'x-client-id': env.SKIPCASH_CLIENT_ID ?? '',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as SkipCashResponse<SkipCashCancelRecurringResult>) : {};

  if (!res.ok || json.hasError || json.hasValidationError || !json.resultObj) {
    throw new Error(
      `SkipCash cancel recurring payment failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
  return json.resultObj;
}

export async function getSkipCashPayment(id: string): Promise<SkipCashPayment> {
  if (!env.SKIPCASH_CLIENT_ID) throw new Error('SkipCash not configured');
  return getSkipCashPaymentWithClientId(id, env.SKIPCASH_CLIENT_ID);
}

export async function getSkipCashPaymentForMerchant(
  id: string,
  credentials: Pick<SkipCashMerchantCredentials, 'clientId'>,
): Promise<SkipCashPayment> {
  if (!credentials.clientId) throw new Error('SkipCash merchant credentials are missing');
  return getSkipCashPaymentWithClientId(id, credentials.clientId);
}

async function getSkipCashPaymentWithClientId(
  id: string,
  clientId: string,
): Promise<SkipCashPayment> {
  const res = await fetch(`${skipCashBaseUrl()}/payments/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      Authorization: clientId,
      'x-client-id': clientId,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as SkipCashResponse<SkipCashPayment>) : {};
  if (!res.ok || json.hasError || json.hasValidationError || !json.resultObj) {
    throw new Error(`SkipCash payment lookup failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return json.resultObj;
}

export function normalizeSkipCashStatusId(statusId: number | string | undefined): number {
  const n = Number(statusId);
  return Number.isFinite(n) ? n : -1;
}

export function verifySkipCashWebhookSignature(
  payload: SkipCashWebhookPayload,
  authorization: string | null,
): boolean {
  const secret = env.SKIPCASH_WEBHOOK_KEY;
  if (!secret || !authorization) return false;
  return verifySkipCashWebhookSignatureWithKey(payload, authorization, secret);
}

export function verifySkipCashWebhookSignatureWithKey(
  payload: SkipCashWebhookPayload,
  authorization: string | null,
  secret: string,
): boolean {
  if (!secret || !authorization) return false;
  const normalized = normalizeWebhookPayload(payload);
  const expected = signValues(normalized, WEBHOOK_SIGNATURE_KEYS, secret);
  return safeEqual(expected, authorization.trim());
}

export function normalizeWebhookPayload(payload: SkipCashWebhookPayload) {
  return {
    PaymentId: stringValue(payload.PaymentId ?? payload.paymentId),
    Amount: stringValue(payload.Amount ?? payload.amount),
    StatusId: stringValue(payload.StatusId ?? payload.statusId),
    TransactionId: stringValue(payload.TransactionId ?? payload.transactionId),
    Custom1: stringValue(payload.Custom1 ?? payload.custom1),
    VisaId: stringValue(payload.VisaId ?? payload.visaId),
    RecurringSubscriptionId: stringValue(
      payload.RecurringSubscriptionId ?? payload.recurringSubscriptionId,
    ),
  };
}

function signValues<T extends string>(
  values: Partial<Record<T, string | number | boolean | null | undefined>>,
  orderedKeys: readonly T[],
  secret: string,
): string {
  const data = orderedKeys
    .flatMap((key) => {
      const value = values[key];
      if (value === null || value === undefined || value === '') return [];
      return `${key}=${String(value)}`;
    })
    .join(',');
  return createHmac('sha256', secret).update(data, 'utf8').digest('base64');
}

function applyRecurringFields(payload: SkipCashCreateRequest, input: CreatePaymentInput): void {
  if (!input.recurring) return;
  payload.IsRecurring = true;
  payload.PlanName = trimField(input.recurring.planName, 80);
  payload.Frequency = String(input.recurring.frequency);
  payload.Interval = input.recurring.interval;
  payload.StartDate = input.recurring.startDate;
  payload.EndDate = input.recurring.endDate;
  payload.AllowedFailedAttempts = String(input.recurring.allowedFailedAttempts ?? 3);
  payload.FirstPaymentAmount = skipCashAmount(
    input.recurring.firstPaymentAmountQar ?? input.amountQar,
  );
}

function trimField(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
