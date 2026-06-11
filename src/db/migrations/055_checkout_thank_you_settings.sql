-- Per-store checkout thank-you page customization.

alter table briefs
  add column if not exists checkout_thank_you jsonb not null default '{}'::jsonb;
