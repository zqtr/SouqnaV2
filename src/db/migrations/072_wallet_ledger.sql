-- Wallet ledger (prepaid credit for account-level micro purchases).
--
-- SkipCash cannot charge a saved card without the customer passing an
-- OTP screen, so "auto-billed small items" are modelled as a prepaid
-- wallet instead: the founder tops up in one OTP-authenticated payment
-- and small purchases debit the balance instantly with no gateway
-- round-trip.
--
-- Money follows the checkout_orders convention: integer whole QAR.
--
-- `wallets.balance_qar` is a cache of sum(wallet_entries.amount_qar);
-- both are written by a single CTE statement in src/lib/wallet.ts so
-- they can never drift (the Neon HTTP driver has no interactive
-- transactions, so multi-statement writes would not be atomic).

create table if not exists wallets (
  clerk_user_id text primary key,
  balance_qar   integer not null default 0 check (balance_qar >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists wallet_entries (
  id              uuid primary key default gen_random_uuid(),
  clerk_user_id   text not null,
  kind            text not null check (kind in ('topup', 'purchase', 'refund', 'adjustment')),
  -- positive = credit, negative = debit
  amount_qar      integer not null check (amount_qar <> 0),
  balance_after   integer not null,
  -- external reference: skipcash payment id, purchase/order id, ...
  reference       text,
  -- prevents double-apply on webhook retries / concurrent polls
  idempotency_key text unique,
  label           text,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists wallet_entries_user_idx
  on wallet_entries (clerk_user_id, created_at desc);

-- A top-up intent awaiting its SkipCash webhook. The pending -> paid
-- status transition is the idempotency gate for crediting the wallet.
create table if not exists wallet_topups (
  id                  uuid primary key default gen_random_uuid(),
  clerk_user_id       text not null,
  amount_qar          integer not null check (amount_qar > 0),
  status              text not null default 'pending'
                        check (status in ('pending', 'paid', 'failed', 'expired')),
  skipcash_payment_id text,
  skipcash_token_id   text,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

create index if not exists wallet_topups_user_idx
  on wallet_topups (clerk_user_id, created_at desc);
create index if not exists wallet_topups_payment_idx
  on wallet_topups (skipcash_payment_id);

-- SkipCash card tokens (populated once tokenization is enabled on the
-- merchant account; the top-up flow works without it).
create table if not exists wallet_saved_cards (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  token_id      text not null unique,
  last4         text,
  card_type     text,
  expiry        text,
  created_at    timestamptz not null default now()
);

create index if not exists wallet_saved_cards_user_idx
  on wallet_saved_cards (clerk_user_id);
