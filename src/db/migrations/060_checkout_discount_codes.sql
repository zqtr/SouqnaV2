-- Migration 060 - Buyer checkout discount codes.
--
-- Public checkout orders now snapshot the promo code applied at checkout
-- separately from the final total, so payment providers can charge the
-- discounted amount while merchants can still audit the original subtotal.

alter table checkout_orders
  add column if not exists discount_qar integer not null default 0,
  add column if not exists discount_code text,
  add column if not exists discount_id bigint references discounts(id) on delete set null;

alter table checkout_orders
  drop constraint if exists checkout_orders_discount_qar_nonnegative;

alter table checkout_orders
  add constraint checkout_orders_discount_qar_nonnegative
  check (discount_qar >= 0);

create index if not exists checkout_orders_discount_idx
  on checkout_orders (storefront_slug, discount_id)
  where discount_id is not null;
