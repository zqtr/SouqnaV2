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
import { isSouqyTier, type SouqyTier } from '@/lib/souqy/plans';
import { getSouqyPendingTierByPayment, setSouqyTier } from '@/lib/souqy/subscription';
import { logEvent } from '@/lib/events';
import { pushNotification } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SkipCash webhook for Souqy subscription checkouts (platform creds).
 *
 * Mirrors /api/billing/skipcash-webhook: verify signature, dedupe via
 * processed_webhooks, re-fetch the payment before activating, then
 * `setSouqyTier(active)`. `custom1 = souqy:{userId}:{tier}`.
 */
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
  const parsed = parseSouqyCustom1(normalized.Custom1);
  if (!paymentId || statusId < 0 || !parsed) {
    return NextResponse.json({ error: 'Missing payment data' }, { status: 400 });
  }
  if (!hasDb()) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });

  const eventId = `skipcash-souqy:${paymentId}:${statusId}`;
  if (await alreadyProcessed(eventId)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    if (statusId === 2) {
      const payment = await getSkipCashPayment(paymentId);
      if (normalizeSkipCashStatusId(payment.statusId) === 2) {
        const tier = await resolveTier(paymentId, parsed);
        const recurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
          normalized.RecurringSubscriptionId ?? payment.recurringSubscriptionId,
        );
        await setSouqyTier(parsed.clerkUserId, tier, {
          status: 'active',
          cycle: 'monthly',
          currentPeriodEnd: periodEnd(),
          skipcashPaymentId: paymentId,
          skipcashRecurringSubscriptionId: recurringSubscriptionId,
          skipcashTransactionId: normalized.TransactionId || payment.transactionId || null,
          pendingTier: null,
        });
        await logEvent({
          kind: 'souqy.subscription.activated',
          funnel: 'storefront',
          userId: parsed.clerkUserId,
          props: { provider: 'skipcash', tier, paymentId, recurringSubscriptionId },
        });
        await pushNotification({
          userId: parsed.clerkUserId,
          kind: 'souqy.subscription.activated',
          title: 'Souqy plan activated',
          titleAr: 'تم تفعيل خطة سوقي',
          href: '/account/settings/souqy',
          meta: { tier, paymentId },
        });
      }
    } else if (statusId === 3 || statusId === 4 || statusId === 5) {
      await logEvent({
        kind: 'souqy.subscription.payment_failed',
        funnel: 'storefront',
        userId: parsed.clerkUserId,
        props: { provider: 'skipcash', tier: parsed.tier, paymentId, statusId },
      });
    }
    await markProcessed(eventId, `skipcash.souqy.status.${statusId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[souqy.skipcash-webhook] handler failed', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

async function resolveTier(
  paymentId: string,
  parsed: { clerkUserId: string; tier: SouqyTier },
): Promise<Exclude<SouqyTier, 'free'>> {
  // Prefer custom1's tier; fall back to the pending row keyed by paymentId.
  if (parsed.tier === 'souqy' || parsed.tier === 'team') return parsed.tier;
  const pending = await getSouqyPendingTierByPayment(paymentId);
  return pending && pending.tier !== 'free' ? pending.tier : 'souqy';
}

function parseSouqyCustom1(
  custom1: string | null,
): { clerkUserId: string; tier: SouqyTier } | null {
  if (!custom1 || !custom1.startsWith('souqy:')) return null;
  const [, clerkUserId, tier] = custom1.split(':');
  if (!clerkUserId || !isSouqyTier(tier)) return null;
  return { clerkUserId, tier };
}

function periodEnd(): string {
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  try {
    await ensureProcessedTable();
    const rows = (await db()`
      select 1 from processed_webhooks where event_id = ${eventId} limit 1
    `) as unknown as Array<unknown>;
    return rows.length > 0;
  } catch (err) {
    console.error('[souqy.skipcash-webhook] dedupe lookup failed', err);
    return false;
  }
}

async function markProcessed(eventId: string, eventType: string): Promise<void> {
  try {
    await db()`
      insert into processed_webhooks (event_id, event_type)
      values (${eventId}, ${eventType})
      on conflict (event_id) do nothing
    `;
  } catch (err) {
    console.error('[souqy.skipcash-webhook] dedupe insert failed', err);
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
