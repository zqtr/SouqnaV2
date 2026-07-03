import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { db, hasDb } from './db';

/**
 * Prepaid wallet ledger (migration 072).
 *
 * SkipCash requires an OTP for every card charge — including saved
 * tokens — so there is no merchant-initiated billing. The wallet turns
 * "auto-billed small items" into: one OTP-authenticated top-up, then
 * instant balance debits with no gateway round-trip.
 *
 * Every balance write happens in a single SQL statement (CTE chain)
 * because the Neon HTTP driver has no interactive transactions. The
 * cached `wallets.balance_qar` and the appended `wallet_entries` row
 * therefore always move together, and idempotency comes from either
 * the `wallet_topups.status` transition (credits) or the
 * `wallet_entries.idempotency_key` unique index (debits).
 *
 * All money values are integer whole QAR, matching checkout_orders.
 */

export type WalletEntryKind = 'topup' | 'purchase' | 'refund' | 'adjustment';

export type WalletEntry = {
  id: string;
  kind: WalletEntryKind;
  amountQar: number;
  balanceAfter: number;
  reference: string | null;
  label: string | null;
  createdAt: string;
};

export type WalletTopupStatus = 'pending' | 'paid' | 'failed' | 'expired';

export type WalletTopup = {
  id: string;
  clerkUserId: string;
  amountQar: number;
  status: WalletTopupStatus;
  skipcashPaymentId: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type WalletSummary = {
  balanceQar: number;
  updatedAt: string | null;
};

/** Top-up denominations offered in the UI; the server rejects anything else. */
export const WALLET_TOPUP_PRESETS_QAR = [20, 50, 100, 200, 500] as const;

export function isWalletTopupPreset(amountQar: number): boolean {
  return (WALLET_TOPUP_PRESETS_QAR as readonly number[]).includes(amountQar);
}

export async function getWalletSummary(clerkUserId: string): Promise<WalletSummary> {
  noStore();
  if (!hasDb()) return { balanceQar: 0, updatedAt: null };
  const rows = (await db()`
    select balance_qar, updated_at from wallets where clerk_user_id = ${clerkUserId} limit 1
  `) as unknown as Array<{ balance_qar: number; updated_at: string }>;
  const row = rows[0];
  if (!row) return { balanceQar: 0, updatedAt: null };
  return { balanceQar: Number(row.balance_qar), updatedAt: row.updated_at };
}

export async function listWalletEntries(
  clerkUserId: string,
  limit = 30,
): Promise<WalletEntry[]> {
  noStore();
  if (!hasDb()) return [];
  const rows = (await db()`
    select id, kind, amount_qar, balance_after, reference, label, created_at
    from wallet_entries
    where clerk_user_id = ${clerkUserId}
    order by created_at desc
    limit ${limit}
  `) as unknown as Array<{
    id: string;
    kind: WalletEntryKind;
    amount_qar: number;
    balance_after: number;
    reference: string | null;
    label: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    amountQar: Number(row.amount_qar),
    balanceAfter: Number(row.balance_after),
    reference: row.reference,
    label: row.label,
    createdAt: row.created_at,
  }));
}

export async function createWalletTopup(
  clerkUserId: string,
  amountQar: number,
): Promise<WalletTopup> {
  const rows = (await db()`
    insert into wallet_topups (clerk_user_id, amount_qar)
    values (${clerkUserId}, ${amountQar})
    returning id, clerk_user_id, amount_qar, status, skipcash_payment_id, created_at, resolved_at
  `) as unknown as TopupRow[];
  const row = rows[0];
  if (!row) throw new Error('wallet_topups insert returned no row');
  return mapTopup(row);
}

export async function attachTopupPayment(
  topupId: string,
  skipcashPaymentId: string,
): Promise<void> {
  await db()`
    update wallet_topups
    set skipcash_payment_id = ${skipcashPaymentId}
    where id = ${topupId} and status = 'pending'
  `;
}

export async function getWalletTopup(topupId: string): Promise<WalletTopup | null> {
  noStore();
  if (!hasDb()) return null;
  const rows = (await db()`
    select id, clerk_user_id, amount_qar, status, skipcash_payment_id, created_at, resolved_at
    from wallet_topups
    where id = ${topupId}
    limit 1
  `) as unknown as TopupRow[];
  return rows[0] ? mapTopup(rows[0]) : null;
}

/**
 * Credits the wallet for a paid top-up. Idempotent and race-safe: the
 * `status = 'pending' -> 'paid'` transition inside the first CTE is the
 * gate — the webhook and the return-page poll can both call this and
 * only one of them lands the credit. Returns the new balance, or null
 * when the top-up was already resolved (or does not exist).
 */
export async function creditWalletForTopup(input: {
  topupId: string;
  skipcashPaymentId: string;
  tokenId?: string | null;
  label?: string | null;
}): Promise<{ clerkUserId: string; amountQar: number; balanceQar: number } | null> {
  const idempotencyKey = `skipcash-topup:${input.topupId}`;
  const rows = (await db()`
    with claimed as (
      update wallet_topups
      set status = 'paid',
          skipcash_payment_id = ${input.skipcashPaymentId},
          skipcash_token_id = coalesce(${input.tokenId ?? null}, skipcash_token_id),
          resolved_at = now()
      where id = ${input.topupId} and status = 'pending'
      returning clerk_user_id, amount_qar
    ),
    credited as (
      insert into wallets (clerk_user_id, balance_qar)
      select clerk_user_id, amount_qar from claimed
      on conflict (clerk_user_id) do update
        set balance_qar = wallets.balance_qar + excluded.balance_qar,
            updated_at = now()
      returning clerk_user_id, balance_qar
    )
    insert into wallet_entries
      (clerk_user_id, kind, amount_qar, balance_after, reference, idempotency_key, label)
    select
      credited.clerk_user_id,
      'topup',
      claimed.amount_qar,
      credited.balance_qar,
      ${input.skipcashPaymentId},
      ${idempotencyKey},
      ${input.label ?? 'Wallet top-up'}
    from credited
    join claimed on claimed.clerk_user_id = credited.clerk_user_id
    returning clerk_user_id, amount_qar, balance_after
  `) as unknown as Array<{ clerk_user_id: string; amount_qar: number; balance_after: number }>;
  const row = rows[0];
  if (!row) return null;
  return {
    clerkUserId: row.clerk_user_id,
    amountQar: Number(row.amount_qar),
    balanceQar: Number(row.balance_after),
  };
}

export async function markWalletTopupFailed(topupId: string): Promise<boolean> {
  const rows = (await db()`
    update wallet_topups
    set status = 'failed', resolved_at = now()
    where id = ${topupId} and status = 'pending'
    returning id
  `) as unknown as Array<{ id: string }>;
  return rows.length > 0;
}

/** Lazily expire abandoned top-ups so the UI never shows a stale spinner. */
export async function expireStaleWalletTopups(clerkUserId: string): Promise<void> {
  if (!hasDb()) return;
  await db()`
    update wallet_topups
    set status = 'expired', resolved_at = now()
    where clerk_user_id = ${clerkUserId}
      and status = 'pending'
      and created_at < now() - interval '2 hours'
  `;
}

export type DebitWalletResult =
  | { status: 'ok'; balanceQar: number }
  | { status: 'already_applied' }
  | { status: 'insufficient_funds' };

/**
 * Atomic conditional debit. The UPDATE only fires when the balance
 * covers the amount AND the idempotency key is unused, so a retried
 * purchase can never double-charge and the balance can never go
 * negative (the check constraint is the backstop).
 *
 * The idempotency check dedupes *sequential* retries. Two calls racing
 * with the same key in the same instant could both pass the NOT EXISTS
 * (statement snapshots don't see each other); callers exposed to
 * double-submit should gate the debit on a status transition of their
 * own intent row — the pattern `creditWalletForTopup` uses — because a
 * single-row UPDATE gate is re-evaluated under the row lock and cannot
 * fire twice.
 */
export async function debitWallet(input: {
  clerkUserId: string;
  amountQar: number;
  idempotencyKey: string;
  reference?: string | null;
  label?: string | null;
  kind?: Extract<WalletEntryKind, 'purchase' | 'adjustment'>;
}): Promise<DebitWalletResult> {
  if (!Number.isInteger(input.amountQar) || input.amountQar <= 0) {
    throw new Error('debitWallet requires a positive integer QAR amount');
  }
  const rows = (await db()`
    with debited as (
      update wallets
      set balance_qar = balance_qar - ${input.amountQar},
          updated_at = now()
      where clerk_user_id = ${input.clerkUserId}
        and balance_qar >= ${input.amountQar}
        and not exists (
          select 1 from wallet_entries where idempotency_key = ${input.idempotencyKey}
        )
      returning balance_qar
    )
    insert into wallet_entries
      (clerk_user_id, kind, amount_qar, balance_after, reference, idempotency_key, label)
    select
      ${input.clerkUserId},
      ${input.kind ?? 'purchase'},
      ${-input.amountQar},
      balance_qar,
      ${input.reference ?? null},
      ${input.idempotencyKey},
      ${input.label ?? null}
    from debited
    on conflict (idempotency_key) do nothing
    returning balance_after
  `) as unknown as Array<{ balance_after: number }>;
  if (rows[0]) return { status: 'ok', balanceQar: Number(rows[0].balance_after) };

  const existing = (await db()`
    select 1 from wallet_entries where idempotency_key = ${input.idempotencyKey} limit 1
  `) as unknown as Array<unknown>;
  return existing.length > 0 ? { status: 'already_applied' } : { status: 'insufficient_funds' };
}

/** Credit that is not tied to a top-up (refunds, support adjustments). */
export async function creditWallet(input: {
  clerkUserId: string;
  amountQar: number;
  idempotencyKey: string;
  reference?: string | null;
  label?: string | null;
  kind?: Extract<WalletEntryKind, 'refund' | 'adjustment'>;
}): Promise<{ status: 'ok'; balanceQar: number } | { status: 'already_applied' }> {
  if (!Number.isInteger(input.amountQar) || input.amountQar <= 0) {
    throw new Error('creditWallet requires a positive integer QAR amount');
  }
  const rows = (await db()`
    with credited as (
      insert into wallets (clerk_user_id, balance_qar)
      select ${input.clerkUserId}, ${input.amountQar}
      where not exists (
        select 1 from wallet_entries where idempotency_key = ${input.idempotencyKey}
      )
      on conflict (clerk_user_id) do update
        set balance_qar = wallets.balance_qar + excluded.balance_qar,
            updated_at = now()
      returning balance_qar
    )
    insert into wallet_entries
      (clerk_user_id, kind, amount_qar, balance_after, reference, idempotency_key, label)
    select
      ${input.clerkUserId},
      ${input.kind ?? 'refund'},
      ${input.amountQar},
      balance_qar,
      ${input.reference ?? null},
      ${input.idempotencyKey},
      ${input.label ?? null}
    from credited
    on conflict (idempotency_key) do nothing
    returning balance_after
  `) as unknown as Array<{ balance_after: number }>;
  if (rows[0]) return { status: 'ok', balanceQar: Number(rows[0].balance_after) };
  return { status: 'already_applied' };
}

export type WalletSavedCard = {
  id: string;
  tokenId: string;
  last4: string | null;
  cardType: string | null;
  expiry: string | null;
  createdAt: string;
};

export async function listWalletSavedCards(clerkUserId: string): Promise<WalletSavedCard[]> {
  noStore();
  if (!hasDb()) return [];
  const rows = (await db()`
    select id, token_id, last4, card_type, expiry, created_at
    from wallet_saved_cards
    where clerk_user_id = ${clerkUserId}
    order by created_at desc
  `) as unknown as Array<{
    id: string;
    token_id: string;
    last4: string | null;
    card_type: string | null;
    expiry: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    tokenId: row.token_id,
    last4: row.last4,
    cardType: row.card_type,
    expiry: row.expiry,
    createdAt: row.created_at,
  }));
}

/**
 * Upsert a saved card.
 *
 * `hasDetails` distinguishes an authoritative card-details fetch from a
 * token-only save. When true, the display columns are overwritten
 * verbatim (so a placeholder like SkipCash's "01/2000" no-expiry can be
 * cleared back to null). When false — the details lookup failed — the
 * row is created if missing but existing display data is preserved,
 * never clobbered with nulls.
 */
export async function upsertWalletSavedCard(input: {
  clerkUserId: string;
  tokenId: string;
  last4?: string | null;
  cardType?: string | null;
  expiry?: string | null;
  hasDetails?: boolean;
}): Promise<void> {
  if (input.hasDetails) {
    await db()`
      insert into wallet_saved_cards (clerk_user_id, token_id, last4, card_type, expiry)
      values (${input.clerkUserId}, ${input.tokenId}, ${input.last4 ?? null},
              ${input.cardType ?? null}, ${input.expiry ?? null})
      on conflict (token_id) do update
        set last4 = excluded.last4,
            card_type = excluded.card_type,
            expiry = excluded.expiry
    `;
    return;
  }
  await db()`
    insert into wallet_saved_cards (clerk_user_id, token_id)
    values (${input.clerkUserId}, ${input.tokenId})
    on conflict (token_id) do nothing
  `;
}

export async function removeWalletSavedCard(
  clerkUserId: string,
  cardId: string,
): Promise<boolean> {
  const rows = (await db()`
    delete from wallet_saved_cards
    where id = ${cardId} and clerk_user_id = ${clerkUserId}
    returning id
  `) as unknown as Array<{ id: string }>;
  return rows.length > 0;
}

type TopupRow = {
  id: string;
  clerk_user_id: string;
  amount_qar: number;
  status: WalletTopupStatus;
  skipcash_payment_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

function mapTopup(row: TopupRow): WalletTopup {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    amountQar: Number(row.amount_qar),
    status: row.status,
    skipcashPaymentId: row.skipcash_payment_id,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}
