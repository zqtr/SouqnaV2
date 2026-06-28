-- Founder-facing changelog for the checkout thank-you WhatsApp follow-up.

insert into updates (
  id, title, body, type, version, priority, published_at,
  summary, badge, cta_label, cta_href, details_href,
  is_active, is_sticky, audience, preview_payload, banner_payload
) values (
  '9ac36a40-6a99-4bfb-91da-2e8324100204',
  'Checkout WhatsApp follow-up / متابعة واتساب بعد الطلب',
  'Buyers can now open a WhatsApp chat directly from the thank-you page after a paid order, confirmed order, or cash-on-delivery order. The button uses the store WhatsApp/contact number, keeps the same order reference shown on the website, supports Qatar phone normalization, and uses Arabic button text and Arabic prefilled messages on Arabic storefronts.',
  'feature',
  'v2.04',
  118,
  now(),
  'Buyers can chat on WhatsApp from confirmed, paid, and cash-on-delivery thank-you pages with the correct order reference.',
  'Checkout',
  'Open Checkout',
  '/account/settings/checkout',
  '/account/settings/checkout',
  true,
  false,
  '{}'::jsonb,
  '{"kind":"checkout-whatsapp-followup","route":"/account/settings/checkout","features":["thank-you-whatsapp-button","cash-on-delivery-support","qatar-phone-normalization","matching-order-reference","arabic-prefilled-message"],"languages":["en","ar"]}'::jsonb,
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
