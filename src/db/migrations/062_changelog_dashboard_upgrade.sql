-- Founder-facing changelog for the new dashboard upgrade.

begin;

insert into updates (
  id, title, body, type, version, priority, published_at,
  summary, badge, cta_label, cta_href, details_href,
  is_active, is_sticky, audience, preview_payload, banner_payload
) values (
  'e4f66d2b-2b17-4f7d-a1c3-680f2cba0205',
  'New Dashboard Upgrade',
  'Souqna dashboard now has richer commerce KPIs, smoother shadcn-powered cards, mini charts, conversion rate, AOV, paid and unpaid order tracking, cart-add trends, larger analytics panels, top products by sales, and a real Souqna appearance preset panel for a more premium admin experience.',
  'feature',
  'v2.05',
  124,
  now(),
  'Richer commerce KPIs, smoother analytics, top products by sales, and Souqna appearance presets are now live.',
  'Dashboard',
  'Open dashboard',
  '/account',
  '/account/analytics',
  true,
  false,
  '{}'::jsonb,
  '{"kind":"dashboard-upgrade","route":"/account","features":["commerce-kpi-cards","mini-charts","conversion-rate","aov","paid-orders","unpaid-orders","cart-add-trends","top-products-by-sales","souqna-appearance-presets","settings-merge"],"languages":["en","ar"]}'::jsonb,
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

commit;
