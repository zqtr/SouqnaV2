import { NextResponse, type NextRequest } from 'next/server';
import { db, hasDb } from '@/lib/db';
import {
  getSkipCashPayment,
  normalizeSkipCashRecurringSubscriptionId,
  normalizeSkipCashStatusId,
  normalizeWebhookPayload,
  verifySkipCashWebhookSignature,
  type SkipCashWebhookPayload,
} from '@/lib/skipcash';
import { getPlanMeta, patchPlanMeta, recordPlanHistory, setPlan, type Plan } from '@/lib/billing';
import { type BillingCycle } from '@/lib/plans';
import { logEvent } from '@/lib/events';
import { pushNotification } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: SkipCashWebhookPayload;
  try {
    payload = (await req.json()) as SkipCashWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  if (!verifySkipCashWebhookSignature(payload, authHeader)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }

  const normalized = normalizeWebhookPayload(payload);
  const paymentId = normalized.PaymentId;
  const statusId = normalizeSkipCashStatusId(normalized.StatusId);
  if (!paymentId || statusId < 0) {
    return NextResponse.json({ error: 'Missing payment data' }, { status: 400 });
  }

  const recurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
    normalized.RecurringSubscriptionId,
  );
  const eventId = `skipcash:${paymentId}:${statusId}:${
    normalized.VisaId || recurringSubscriptionId || 'none'
  }`;
  if (await alreadyProcessed(eventId)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    if (statusId === 2) {
      await handlePaid(paymentId, normalized);
    } else if (statusId === 3 || statusId === 4 || statusId === 5) {
      await handleFailed(paymentId, statusId, normalized);
    }
    await markProcessed(eventId, `skipcash.status.${statusId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[skipcash.webhook] handler failed', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

async function handlePaid(
  paymentId: string,
  payload: ReturnType<typeof normalizeWebhookPayload>,
): Promise<void> {
  const payment = await getSkipCashPayment(paymentId);
  if (normalizeSkipCashStatusId(payment.statusId) !== 2) return;
  const recurringSubscriptionId =
    normalizeSkipCashRecurringSubscriptionId(payload.RecurringSubscriptionId) ??
    normalizeSkipCashRecurringSubscriptionId(payment.recurringSubscriptionId);

  const ctx = await resolvePaymentContext(
    paymentId,
    payload.TransactionId,
    payload.Custom1,
    recurringSubscriptionId,
  );
  if (!ctx) return;

  const before = await currentPlanFor(ctx.clerkUserId);
  const currentPeriodEnd = periodEndFromCycle(ctx.cycle);
  await setPlan(ctx.clerkUserId, ctx.plan, {
    provider: 'skipcash',
    subscriptionProvider: 'skipcash',
    subscriptionStatus: 'active',
    subscriptionId: recurringSubscriptionId ?? paymentId,
    paymentId,
    skipcashPaymentId: paymentId,
    ...(recurringSubscriptionId
      ? { skipcashRecurringSubscriptionId: recurringSubscriptionId }
      : {}),
    transactionId: payload.TransactionId || payment.transactionId || null,
    skipcashTransactionId: payload.TransactionId || payment.transactionId || null,
    visaId: payload.VisaId || payment.visaId || null,
    status: payment.status ?? 'paid',
    skipcashStatus: payment.status ?? 'paid',
    cycle: ctx.cycle,
    currentPeriodEnd,
    nextBillingTime: currentPeriodEnd,
    skipcashLastPaymentAt: new Date().toISOString(),
  });

  await recordPlanHistory({
    clerkUserId: ctx.clerkUserId,
    fromPlan: before,
    toPlan: ctx.plan,
    cycle: ctx.cycle,
    source: 'skipcash_webhook',
    providerEventId: paymentId,
    meta: {
      paymentId,
      transactionId: payload.TransactionId || payment.transactionId || null,
      visaId: payload.VisaId || payment.visaId || null,
      recurringSubscriptionId,
    },
  });

  await logEvent({
    kind: 'billing.payment.succeeded',
    funnel: 'storefront',
    userId: ctx.clerkUserId,
    props: {
      provider: 'skipcash',
      paymentId,
      recurringSubscriptionId,
      plan: ctx.plan,
      cycle: ctx.cycle,
      statusId: payment.statusId,
    },
  });

  await pushNotification({
    userId: ctx.clerkUserId,
    kind: 'billing.payment.succeeded',
    title: 'SkipCash payment received',
    titleAr: 'تم استلام دفعة SkipCash',
    href: '/account/settings/plan',
    meta: { paymentId, recurringSubscriptionId, plan: ctx.plan, cycle: ctx.cycle },
  });
}

async function handleFailed(
  paymentId: string,
  statusId: number,
  payload: ReturnType<typeof normalizeWebhookPayload>,
): Promise<void> {
  const recurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
    payload.RecurringSubscriptionId,
  );
  const ctx = await resolvePaymentContext(
    paymentId,
    payload.TransactionId,
    payload.Custom1,
    recurringSubscriptionId,
  );
  await logEvent({
    kind: 'billing.payment.failed',
    funnel: 'storefront',
    userId: ctx?.clerkUserId ?? null,
    props: {
      provider: 'skipcash',
      paymentId,
      recurringSubscriptionId,
      statusId,
      transactionId: payload.TransactionId || null,
    },
  });

  if (ctx) {
    await markFailedMeta(ctx.clerkUserId, {
      paymentId,
      statusId,
      recurringSubscriptionId,
    });
    await pushNotification({
      userId: ctx.clerkUserId,
      kind: 'billing.payment.failed',
      title: 'SkipCash payment was not completed',
      titleAr: 'لم تكتمل دفعة SkipCash',
      href: '/account/settings/plan',
      meta: { paymentId, statusId, recurringSubscriptionId },
    });
  }
}

async function resolvePaymentContext(
  paymentId: string,
  transactionId: string | null,
  custom1: string | null,
  recurringSubscriptionId: string | null = null,
): Promise<{ clerkUserId: string; plan: Exclude<Plan, 'free'>; cycle: BillingCycle } | null> {
  const parsed = parseCustom1(custom1);
  if (parsed) return parsed;
  if (!hasDb()) return null;
  try {
    const rows = (await db()`
      select clerk_user_id, plan, meta
      from user_plans
      where meta->>'skipcashPaymentId' = ${paymentId}
         or meta->>'skipcashCheckoutPaymentId' = ${paymentId}
         or (${recurringSubscriptionId}::text is not null
             and meta->>'skipcashRecurringSubscriptionId' = ${recurringSubscriptionId})
         or (${transactionId}::text is not null and meta->>'skipcashTransactionId' = ${transactionId})
      limit 1
    `) as unknown as Array<{ clerk_user_id: string; plan: string; meta: Record<string, unknown> }>;
    const row = rows[0];
    if (!row) return null;
    const meta = row.meta ?? (await getPlanMeta(row.clerk_user_id));
    const plan =
      meta.skipcashPendingPlan === 'starter' ||
      meta.skipcashPendingPlan === 'pro' ||
      meta.skipcashPendingPlan === 'atelier'
        ? meta.skipcashPendingPlan
        : row.plan === 'starter' || row.plan === 'pro' || row.plan === 'atelier'
          ? row.plan
          : null;
    const cycle =
      meta.skipcashPendingCycle === 'monthly' || meta.skipcashPendingCycle === 'annual'
        ? meta.skipcashPendingCycle
        : meta.cycle === 'monthly' || meta.cycle === 'annual'
          ? meta.cycle
          : null;
    if (!plan || !cycle) return null;
    return { clerkUserId: row.clerk_user_id, plan, cycle };
  } catch (err) {
    console.error('[skipcash.webhook] context lookup failed', err);
    return null;
  }
}

async function markFailedMeta(
  clerkUserId: string,
  input: {
    paymentId: string;
    statusId: number;
    recurringSubscriptionId: string | null;
  },
): Promise<void> {
  if (!hasDb()) return;
  const meta = await getPlanMeta(clerkUserId);
  const currentRecurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
    meta.skipcashRecurringSubscriptionId ?? meta.subscriptionId,
  );
  const status = failureStatus(input.statusId);
  const isRecurringFailure =
    input.recurringSubscriptionId &&
    currentRecurringSubscriptionId === input.recurringSubscriptionId &&
    input.statusId !== 3;
  const isCurrentCheckoutFailure =
    !currentRecurringSubscriptionId &&
    (meta.skipcashPaymentId === input.paymentId ||
      meta.skipcashCheckoutPaymentId === input.paymentId);

  await patchPlanMeta(clerkUserId, {
    skipcashLastFailedPaymentId: input.paymentId,
    skipcashLastFailedStatusId: input.statusId,
    skipcashLastFailureAt: new Date().toISOString(),
    ...(isRecurringFailure || isCurrentCheckoutFailure
      ? {
          skipcashStatus: status,
          subscriptionStatus: status,
        }
      : {}),
  });
}

function failureStatus(statusId: number): 'cancelled' | 'failed' {
  return statusId === 3 ? 'cancelled' : 'failed';
}

function parseCustom1(
  custom1: string | null,
): { clerkUserId: string; plan: Exclude<Plan, 'free'>; cycle: BillingCycle } | null {
  if (!custom1) return null;
  const [clerkUserId, plan, cycle] = custom1.split(':');
  if (!clerkUserId) return null;
  if (plan !== 'starter' && plan !== 'pro' && plan !== 'atelier') return null;
  if (cycle !== 'monthly' && cycle !== 'annual') return null;
  return { clerkUserId, plan, cycle };
}

async function currentPlanFor(clerkUserId: string): Promise<Plan> {
  if (!hasDb()) return 'free';
  try {
    const rows = (await db()`
      select plan from user_plans where clerk_user_id = ${clerkUserId} limit 1
    `) as unknown as Array<{ plan: string }>;
    return (rows[0]?.plan as Plan | undefined) ?? 'free';
  } catch {
    return 'free';
  }
}

function periodEndFromCycle(cycle: BillingCycle): string {
  const end = new Date();
  if (cycle === 'annual') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  if (!hasDb()) return false;
  try {
    await ensureProcessedTable();
    const rows = (await db()`
      select 1 from processed_webhooks where event_id = ${eventId} limit 1
    `) as unknown as Array<unknown>;
    return rows.length > 0;
  } catch (err) {
    console.error('[skipcash.webhook] dedupe lookup failed', err);
    return false;
  }
}

async function markProcessed(eventId: string, eventType: string): Promise<void> {
  if (!hasDb()) return;
  try {
    await db()`
      insert into processed_webhooks (event_id, event_type)
      values (${eventId}, ${eventType})
      on conflict (event_id) do nothing
    `;
  } catch (err) {
    console.error('[skipcash.webhook] dedupe insert failed', err);
  }
}

let tableEnsured = false;
async function ensureProcessedTable(): Promise<void> {
  if (tableEnsured) return;
  await db()`
    create table if not exists processed_webhooks (
      event_id    text primary key,
      event_type  text not null,
      processed_at timestamptz not null default now()
    )
  `;
  tableEnsured = true;
}
