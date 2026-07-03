-- Purchased Souqy credits (migration 073).
--
-- One credit = one Souqy generation beyond the monthly free cap
-- (SOUQY_MONTHLY_CAP). Users buy credits with wallet balance; the
-- generation gate spends the monthly allotment first, then draws down
-- this balance. Unlike the monthly count (derived from souqy_audit and
-- reset each month), this balance persists until consumed.

create table if not exists souqy_credits (
  clerk_user_id text primary key,
  balance       integer not null default 0 check (balance >= 0),
  updated_at    timestamptz not null default now()
);

-- Purchase / refund / adjustment history. Consumption is NOT logged
-- here (each consumed credit already has a matching souqy_audit row);
-- this table exists for the money side and idempotency.
create table if not exists souqy_credit_ledger (
  id              uuid primary key default gen_random_uuid(),
  clerk_user_id   text not null,
  delta           integer not null,
  balance_after   integer not null,
  reason          text not null check (reason in ('purchase', 'refund', 'adjustment')),
  idempotency_key text unique,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists souqy_credit_ledger_user_idx
  on souqy_credit_ledger (clerk_user_id, created_at desc);
