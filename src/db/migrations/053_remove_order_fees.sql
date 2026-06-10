-- Migration 053 - Remove order fee behavior from active catalog and finance data.

begin;

-- Plan metadata no longer carries order percentage settings.
update plan_tiers
   set meta = coalesce(meta, '{}'::jsonb) - 'transactionFeeBps'
 where id in ('free', 'starter', 'pro', 'atelier');

-- Existing order compatibility columns stay present for older deployments,
-- but their values are neutralized so historical rows match the new behavior.
update checkout_orders
   set platform_fee_bps = 0,
       platform_fee_qar = 0,
       seller_net_qar = total_qar,
       platform_fee_status = 'not_due',
       metadata = coalesce(metadata, '{}'::jsonb) - 'feeBaseQar' - 'platformFeeAddedToCheckout',
       updated_at = now();

-- Seller payouts should now be for the full collected order amount.
update checkout_payouts
   set fee_qar = 0,
       net_qar = gross_qar,
       updated_at = now();

alter table checkout_payouts
  alter column fee_qar set default 0;

-- Old receivable/collected order fee rows are no longer part of finance.
delete from platform_fee_entries;

-- Remove visible account-update copy that previously announced rates.
update updates
   set title = 'Checkout totals are simplified',
       body = 'Checkout totals now stay equal to product subtotal plus shipping. Online payments collected by Souqna create seller payouts for the full order total.',
       summary = 'Checkout totals and seller payouts now match the order amount.',
       badge = 'Checkout',
       version = 'checkout-2026-06-simple-totals',
       is_active = false,
       preview_payload = '{"kind":"checkout-totals"}'::jsonb,
       banner_payload = '{}'::jsonb,
       updated_at = now()
 where id = '0f7d9b79-6b6d-4ec6-8c80-27c8bf9a9d3a'
    or version = 'fees-2026-05-platform-collection';

update updates
   set title = 'New Souqna growth plans are live',
       body = 'Souqna now includes clearer Free, Pro, Pro+, and Max+ tiers with storefront limits, AI credits, and growth tools matched to how merchants scale.',
       summary = 'Plan limits, AI credits, and product options now match the Souqna catalog.',
       updated_at = now()
 where id = '28e3de2c-7d8e-46d5-9fc2-320e1e116f1f';

commit;
