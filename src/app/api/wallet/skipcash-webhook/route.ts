import { NextResponse, type NextRequest } from 'next/server';
import { db, hasDb } from '@/lib/db';
import {
  getSkipCashPayment,
  normalizeSkipCashStatusId,
  normalizeWebhookPayload,
  verifySkipCashWebhookSignature,
  type SkipCashWebhookPayload,
} from '@/lib/skipcash';
import {
  creditWalletForTopup,
  getWalletTopup,
  markWalletTopupFailed,
} from '@/lib/wallet';
import { saveWalletCardFromToken } from '@/lib/walletReconcile';
import { logEvent } from '@/lib/events';
import { pushNotification } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SkipCash webhook for wallet top-ups (platform credentials).
 *
 * Same defensive posture as /api/billing/skipcash-webhook: verify the
 * HMAC signature, dedupe via processed_webhooks, and re-fetch the
 * payment from SkipCash before moving money — the webhook body alone
 * is never trusted for the paid state. The actual credit is atomic and
 * idempotent inside `creditWalletForTopup`, so a replay or a race with
 * the return-page poll cannot double-credit.
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
  const topupId = parseWalletCustom1(normalized.Custom1);
  if (!paymentId || statusId < 0 || !topupId) {
    return NextResponse.json({ error: 'Missing payment data' }, { status: 400 });
  }
  if (!hasDb()) {
    return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  }

  const eventId = `skipcash-wallet:${paymentId}:${statusId}`;
  if (await alreadyProcessed(eventId)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const topup = await getWalletTopup(topupId);
  if (!topup) {
    return NextResponse.json({ error: 'Topup not found' }, { status: 404 });
  }

  try {
    if (statusId === 2) {
      const payment = await getSkipCashPayment(paymentId);
      if (normalizeSkipCashStatusId(payment.statusId) === 2) {
        const tokenId = firstNonEmpty(normalized.TokenId, payment.tokenId);
        const credited = await creditWalletForTopup({
          topupId: topup.id,
          skipcashPaymentId: paymentId,
          tokenId,
        });
        if (tokenId) {
          await saveWalletCardFromToken(topup.clerkUserId, tokenId);
        }
        if (credited) {
          await logEvent({
            kind: 'wallet.topup.succeeded',
            funnel: 'storefront',
            userId: credited.clerkUserId,
            props: {
              provider: 'skipcash',
              topupId: topup.id,
              paymentId,
              amountQar: credited.amountQar,
              via: 'webhook',
            },
          });
          await pushNotification({
            userId: credited.clerkUserId,
            kind: 'wallet.topup.succeeded',
            title: `Wallet topped up — QAR ${credited.amountQar}`,
            titleAr: `تم شحن المحفظة — ${credited.amountQar} ر.ق`,
            href: '/account/settings/wallet',
            meta: { topupId: topup.id, paymentId, amountQar: credited.amountQar },
          });
        }
      }
    } else if (statusId === 3 || statusId === 4 || statusId === 5) {
      const marked = await markWalletTopupFailed(topup.id);
      await logEvent({
        kind: 'wallet.topup.failed',
        funnel: 'storefront',
        userId: topup.clerkUserId,
        props: { provider: 'skipcash', topupId: topup.id, paymentId, statusId },
      });
      if (marked) {
        await pushNotification({
          userId: topup.clerkUserId,
          kind: 'wallet.topup.failed',
          title: 'Wallet top-up was not completed',
          titleAr: 'لم يكتمل شحن المحفظة',
          href: '/account/settings/wallet',
          meta: { topupId: topup.id, paymentId, statusId },
        });
      }
    }
    await markProcessed(eventId, `skipcash.wallet.status.${statusId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[wallet.skipcash-webhook] handler failed', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function parseWalletCustom1(custom1: string | null): string | null {
  if (!custom1 || !custom1.startsWith('wallet:')) return null;
  const id = custom1.slice('wallet:'.length).trim();
  return id || null;
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  try {
    await ensureProcessedTable();
    const rows = (await db()`
      select 1 from processed_webhooks where event_id = ${eventId} limit 1
    `) as unknown as Array<unknown>;
    return rows.length > 0;
  } catch (err) {
    console.error('[wallet.skipcash-webhook] dedupe lookup failed', err);
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
    console.error('[wallet.skipcash-webhook] dedupe insert failed', err);
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
