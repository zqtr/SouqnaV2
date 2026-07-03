import 'server-only';

import { db, hasDb } from './db';
import {
  getSkipCashCardDetails,
  getSkipCashPayment,
  hasSkipCash,
  normalizeSkipCashStatusId,
} from './skipcash';
import {
  creditWalletForTopup,
  markWalletTopupFailed,
  upsertWalletSavedCard,
} from './wallet';
import { logEvent } from './events';

/**
 * Self-healing for wallet top-ups.
 *
 * The webhook is the primary settlement path and the return-page poll
 * the second, but both can miss (webhook misconfigured or rejected,
 * user closes the tab before the poll lands, a deploy breaks the
 * return page — all three have happened). This reconciler runs on
 * wallet page load: any of the caller's recent pending top-ups are
 * checked against SkipCash directly and settled through the same
 * idempotent `creditWalletForTopup` gate, so it can never double-pay
 * regardless of how many paths race.
 */
export async function reconcilePendingWalletTopups(clerkUserId: string): Promise<void> {
  if (!hasDb() || !hasSkipCash()) return;

  let rows: Array<{ id: string; skipcash_payment_id: string }> = [];
  try {
    rows = (await db()`
      select id, skipcash_payment_id
      from wallet_topups
      where clerk_user_id = ${clerkUserId}
        and status = 'pending'
        and skipcash_payment_id is not null
        and created_at > now() - interval '48 hours'
      order by created_at desc
      limit 5
    `) as unknown as Array<{ id: string; skipcash_payment_id: string }>;
  } catch (err) {
    console.error('[wallet.reconcile] pending lookup failed', err);
    return;
  }

  for (const row of rows) {
    try {
      const payment = await getSkipCashPayment(row.skipcash_payment_id);
      const statusId = normalizeSkipCashStatusId(payment.statusId);
      if (statusId === 2) {
        const tokenId = payment.tokenId?.trim() || null;
        const credited = await creditWalletForTopup({
          topupId: row.id,
          skipcashPaymentId: row.skipcash_payment_id,
          tokenId,
        });
        if (tokenId) {
          await saveWalletCardFromToken(clerkUserId, tokenId);
        }
        if (credited) {
          await logEvent({
            kind: 'wallet.topup.succeeded',
            funnel: 'storefront',
            userId: clerkUserId,
            props: {
              provider: 'skipcash',
              topupId: row.id,
              paymentId: row.skipcash_payment_id,
              amountQar: credited.amountQar,
              via: 'reconcile',
            },
          });
        }
      } else if (statusId === 3 || statusId === 4 || statusId === 5) {
        await markWalletTopupFailed(row.id);
      }
      // statusId 0/1 = still new/pending at SkipCash — leave it alone;
      // expireStaleWalletTopups retires it after the 2h window.
    } catch (err) {
      console.error('[wallet.reconcile] topup check failed', row.id, err);
    }
  }

  await refreshStaleSavedCards(clerkUserId);
}

/**
 * Re-fetch display details for saved cards missing a last4 — either
 * saved before the cardDetails parser understood SkipCash's shape, or
 * where an earlier lookup transiently failed. Capped and best-effort.
 */
async function refreshStaleSavedCards(clerkUserId: string): Promise<void> {
  let rows: Array<{ token_id: string }> = [];
  try {
    rows = (await db()`
      select token_id from wallet_saved_cards
      where clerk_user_id = ${clerkUserId} and last4 is null
      limit 5
    `) as unknown as Array<{ token_id: string }>;
  } catch (err) {
    console.error('[wallet.reconcile] stale card lookup failed', err);
    return;
  }
  for (const row of rows) {
    await saveWalletCardFromToken(clerkUserId, row.token_id);
  }
}

/**
 * Persist a SkipCash card token as a reusable payment method. Display
 * details (last4, brand, expiry) are best-effort — a token without
 * them still works, so lookup failures are swallowed.
 */
export async function saveWalletCardFromToken(
  clerkUserId: string,
  tokenId: string,
): Promise<void> {
  try {
    const details = await getSkipCashCardDetails(tokenId);
    await upsertWalletSavedCard({
      clerkUserId,
      tokenId,
      last4: details?.last4 ?? null,
      cardType: details?.cardType ?? null,
      expiry: details?.expiry ?? null,
      hasDetails: details !== null,
    });
  } catch (err) {
    console.warn('[wallet.reconcile] saved card upsert failed', err);
  }
}
