-- Migration 044 - Changelog entries for checkout rules and custom product sizes.

begin;

update updates
   set is_active = false,
       updated_at = now()
 where version like 'localhost-test-%';

insert into updates (
  id, title, body, type, version, priority, published_at,
  summary, badge, cta_label, cta_href, details_href,
  is_active, is_sticky, audience, preview_payload, banner_payload
) values (
  '0f7d9b79-6b6d-4ec6-8c80-27c8bf9a9d3a',
  'Souqna checkout rules are now clearer',
  'Souqna takes no transaction fees. Free and Pro can receive orders with cash on delivery and Fawran. Pro+ and Max+ unlock provider payments such as SADAD, SkipCash, and Tap Payments. Merchant-collected methods stay tracked separately when needed.',
  'billing',
  'checkout-2026-05-provider-rules',
  95,
  now(),
  'No Souqna fees. Free and Pro use Fawran plus COD; Pro+ and Max+ unlock provider payments.',
  'Checkout',
  'View plans',
  '/account/settings/plan',
  '/account/settings/plan',
  true,
  false,
  '{}'::jsonb,
  '{"kind":"checkout-rules","souqnaFees":"none","baseMethods":["cod","fawran"],"providerMethods":["sadad","skipcash","tap_payments"],"providerPlans":["pro","atelier"]}'::jsonb,
  '{}'::jsonb
) on conflict (id) do update
  set title = excluded.title,
      body = excluded.body,
      type = excluded.type,
      version = excluded.version,
      priority = excluded.priority,
      summary = excluded.summary,
      badge = excluded.badge,
      cta_label = excluded.cta_label,
      cta_href = excluded.cta_href,
      details_href = excluded.details_href,
      is_active = excluded.is_active,
      is_sticky = excluded.is_sticky,
      audience = excluded.audience,
      preview_payload = excluded.preview_payload,
      banner_payload = excluded.banner_payload,
      updated_at = now();

insert into updates (
  id, title, body, type, version, priority, published_at,
  summary, badge, cta_label, cta_href, details_href,
  is_active, is_sticky, audience, preview_payload, banner_payload
) values (
  'd5e21d45-d59f-4aa9-a918-39079018bd15',
  'Custom sizes are available for products',
  'Products can now offer size choices for apparel, shoes, and any item that needs a required option. Turn on Sizes while adding or editing a product, keep standard choices like S, M, and L, or add custom values such as 35, 36, and 37 with the plus button. Shoppers choose a size before checkout, and Souqna saves that choice across the cart, checkout, order records, emails, and print views.',
  'feature',
  'products-2026-05-custom-sizes',
  85,
  now(),
  'Add standard or custom size choices like S, M, L, 35, 36, and 37 from the product form.',
  'Products',
  'Manage products',
  '/account/products',
  '/account/products',
  true,
  false,
  '{}'::jsonb,
  '{"kind":"product-sizes","examples":["S","M","L","35","36","37"],"requiredAtCheckout":true}'::jsonb,
  '{}'::jsonb
) on conflict (id) do update
  set title = excluded.title,
      body = excluded.body,
      type = excluded.type,
      version = excluded.version,
      priority = excluded.priority,
      summary = excluded.summary,
      badge = excluded.badge,
      cta_label = excluded.cta_label,
      cta_href = excluded.cta_href,
      details_href = excluded.details_href,
      is_active = excluded.is_active,
      is_sticky = excluded.is_sticky,
      audience = excluded.audience,
      preview_payload = excluded.preview_payload,
      banner_payload = excluded.banner_payload,
      updated_at = now();

update updates
   set title = 'New Souqna growth plans and product options are live',
       body = 'Souqna now includes clearer Free, Pro, Pro+, and Max+ tiers, no Souqna transaction fees, dashboard upgrade guidance, and product options such as custom sizes. The changelog explains which checkout methods each plan can use and how sellers can add size choices to products.',
       summary = 'Plan limits, no-fee checkout rules, AI credits, and custom product sizes now match the new Souqna catalog.',
       updated_at = now()
 where id = '28e3de2c-7d8e-46d5-9fc2-320e1e116f1f';

commit;
