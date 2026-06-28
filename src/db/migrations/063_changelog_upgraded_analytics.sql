-- Founder-facing changelog for the upgraded analytics command center.

begin;

insert into updates (
  id, title, body, type, version, priority, published_at,
  summary, badge, cta_label, cta_href, details_href, image_url,
  is_active, is_sticky, audience, preview_payload, banner_payload
) values (
  '2d1513d5-dd9d-4d54-81cb-b75003815720',
  'Upgraded Analytics',
  'Souqna analytics now separates Basic Analytics for Free and Pro from Advanced Analytics for Pro+ and Max+. Merchants can track revenue, conversion rate, average order value, paid and unpaid orders, cart adds, visitors, product performance, traffic sources, device and browser breakdowns, live activity, payment provider performance, and locked Pro+ previews for deeper customer, funnel, marketing, inventory, and AI forecasting insights.',
  'feature',
  'v2.06',
  132,
  now(),
  'A richer analytics command center is live with commerce KPIs, product performance, traffic breakdowns, payment provider insights, and Pro+ advanced intelligence previews.',
  'Analytics',
  'Open analytics',
  '/account/analytics',
  '/account/analytics',
  '/updates/upgraded-analytics-kpis.png',
  true,
  false,
  '{}'::jsonb,
  '{
    "kind": "analytics-upgrade",
    "route": "/account/analytics",
    "screenshots": [
      "/updates/upgraded-analytics-kpis.png",
      "/updates/upgraded-analytics-command-center.png",
      "/updates/upgraded-analytics-breakdowns.png"
    ],
    "features": [
      "basic-analytics",
      "advanced-analytics",
      "commerce-kpi-cards",
      "conversion-rate",
      "average-order-value",
      "paid-orders",
      "unpaid-orders",
      "add-to-cart-events",
      "top-products-by-sales",
      "visitor-breakdowns",
      "traffic-sources",
      "live-visitors",
      "active-carts",
      "payment-provider-performance",
      "pro-plus-locked-previews",
      "ai-insights"
    ],
    "basicPlans": ["free", "starter"],
    "advancedPlans": ["pro", "atelier"],
    "upgradePath": "pro",
    "languages": ["en", "ar"]
  }'::jsonb,
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
      image_url = excluded.image_url,
      is_active = excluded.is_active,
      is_sticky = excluded.is_sticky,
      audience = excluded.audience,
      preview_payload = excluded.preview_payload,
      banner_payload = excluded.banner_payload,
      updated_at = now();

commit;
