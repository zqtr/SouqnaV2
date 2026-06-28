-- Reviews app runtime.
--
-- Visitor-submitted reviews are moderated by the storefront owner through
-- the Reviews app. Display preferences stay in installed_apps.settings;
-- individual reviews live here so they can be approved, hidden, deleted,
-- and reused by any review component.

begin;

create table if not exists storefront_reviews (
  id              uuid primary key default gen_random_uuid(),
  storefront_slug text not null
                    references briefs(slug) on delete cascade,
  product_id      uuid
                    references products(id) on delete set null,
  customer_name   text not null,
  rating          integer not null check (rating between 1 and 5),
  title           text,
  body            text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'published', 'hidden')),
  is_featured     boolean not null default false,
  source          text not null default 'storefront',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists storefront_reviews_store_status_idx
  on storefront_reviews (storefront_slug, status, created_at desc);

create index if not exists storefront_reviews_store_featured_idx
  on storefront_reviews (storefront_slug, is_featured, created_at desc);

create index if not exists storefront_reviews_product_idx
  on storefront_reviews (product_id, status, created_at desc)
  where product_id is not null;

commit;
