-- Souqy subscriptions (migration 074).
--
-- Souqy is now its own subscription product, separate from the storefront
-- commerce plans in user_plans. One row per Clerk user records the tier
-- they pay for; the effective tier at read time is the higher of this and
-- a storefront-plan grandfather (see src/lib/souqy/subscription.ts).
--
-- Money is charged in QAR via SkipCash (prices authored in USD, converted
-- at the peg). Tier volume (generations/month) lives in code, not here.

create table if not exists souqy_subscriptions (
  clerk_user_id                    text primary key,
  tier                             text not null default 'free'
                                     check (tier in ('free', 'souqy', 'team')),
  status                           text not null default 'active'
                                     check (status in ('active', 'pending', 'cancelled', 'past_due')),
  cycle                            text check (cycle in ('monthly', 'annual')),
  current_period_end               timestamptz,
  skipcash_payment_id              text,
  skipcash_recurring_subscription_id text,
  skipcash_transaction_id          text,
  pending_tier                     text check (pending_tier in ('souqy', 'team')),
  meta                             jsonb not null default '{}'::jsonb,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now()
);
