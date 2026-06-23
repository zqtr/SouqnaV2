-- Migration 058 · Fawran checkout method
-- Allows Fawran to be selected as a storefront checkout method and
-- recorded on checkout orders.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'briefs_checkout_payment_methods_chk'
  ) then
    alter table briefs drop constraint briefs_checkout_payment_methods_chk;
  end if;
end $$;

alter table briefs
  add constraint briefs_checkout_payment_methods_chk
  check (checkout_payment_methods <@ array['cod','bank_transfer','fawran','skipcash','sadad','pay_link']::text[]);

alter table checkout_orders
  drop constraint if exists checkout_orders_payment_method_check,
  add constraint checkout_orders_payment_method_check
  check (payment_method in ('cod','bank_transfer','fawran','skipcash','sadad','pay_link'));
