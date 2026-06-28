-- Souqna · storefront subdomains
-- Applied to Neon project autumn-mountain-32411543, branch main.
-- Re-runnable via `psql $DATABASE_URL -f src/db/schema.sql`.
--
-- Notes:
-- * Table name remains `briefs` for migration continuity. The product surface
--   is now a customizable storefront with its own product catalogue.
-- * `clerk_user_id` is the Clerk session subject. It's the only auth gate:
--   every dashboard page + product action checks `auth().userId` against it.
-- * `design` and `palette` were once founder-pickable; `design` is now ignored
--   on render (the template is derived from `business_type` via the archetype
--   map) but the column is kept for backwards compatibility for one release.

create extension if not exists pgcrypto;

create table if not exists account_profiles (
  clerk_user_id text primary key,
  username text,
  display_name text,
  primary_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists account_profiles_username_unique
  on account_profiles (lower(username))
  where username is not null;

create table if not exists briefs (
  slug text primary key,
  locale text not null check (locale in ('en','ar')),
  founder_name text not null,
  business_name text not null,
  contact_email text not null,
  ownership text not null,
  experience text not null,
  business_type text not null,
  market_volume text not null,
  payments text not null,
  tagline text,
  phone text,
  area text,
  hours text,
  instagram text,
  logo_url text,
  design text not null default 'atrium' check (design in ('atrium','souk')),
  palette text not null default 'sand_gold' check (palette in ('sand_gold','pearl_ink','olive_brass','maroon_bone')),
  clerk_user_id text not null,
  -- Page builder columns (migration 004). Empty arrays are seeded as a
  -- private draft on first builder open; publish is an explicit action.
  published_blocks jsonb not null default '[]'::jsonb,
  draft_blocks jsonb not null default '[]'::jsonb,
  theme_overrides jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  -- Founder-attached hostname (migration 020). NULL keeps the storefront
  -- on its free `{slug}.souqna.qa` subdomain. Lowercased on write so
  -- the unique partial index doubles as case-insensitive uniqueness.
  custom_domain text,
  custom_domain_added_at timestamptz,
  custom_domain_verified_at timestamptz,
  -- Souqna public directory moderation (migration 029). Operator-managed
  -- metadata for /souqna discovery; hidden/spam rows are excluded there
  -- without deleting the founder storefront.
  discover_featured_at timestamptz,
  discover_hidden_at timestamptz,
  discover_hidden_reason text,
  discover_spam_shutdown_at timestamptz,
  discover_managed_by text,
  discover_updated_at timestamptz,
  -- Operator soft-delete (migration 041). Deleted rows are unpublished
  -- and expired from public routing, but retained for audit/review.
  deleted_at timestamptz,
  deleted_by text,
  deleted_reason text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);

create index if not exists briefs_expires_at on briefs(expires_at);
create index if not exists briefs_clerk_user on briefs(clerk_user_id);
create unique index if not exists briefs_custom_domain_unique
  on briefs (lower(custom_domain))
  where custom_domain is not null;
create index if not exists briefs_discover_public_idx
  on briefs (discover_hidden_at, discover_spam_shutdown_at, is_published, published_at desc, created_at desc);
create index if not exists briefs_discover_featured_idx
  on briefs (discover_featured_at desc)
  where discover_featured_at is not null;
create index if not exists briefs_deleted_at_idx
  on briefs (deleted_at desc)
  where deleted_at is not null;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  storefront_slug text not null references briefs(slug) on delete cascade,
  title text not null,
  subtitle text,
  description text,
  price_qar numeric(10,2),
  compare_at_price_qar numeric(10,2),
  cost_per_item_qar numeric(10,2),
  taxable boolean not null default true,
  discount_eligible boolean not null default true,
  pricing_mode text not null default 'one_time' check (pricing_mode in ('one_time','monthly_payment')),
  monthly_price_qar numeric(10,2),
  image_url text,
  media_alt_text text,
  category text,
  product_type text,
  vendor text,
  tags jsonb not null default '[]'::jsonb,
  template_key text,
  badges jsonb not null default '[]'::jsonb,
  handle text,
  seo_title text,
  seo_description text,
  event_at timestamptz,
  published_at timestamptz,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  status text not null default 'active' check (status in ('active','draft','sold_out')),
  sku text,
  barcode text,
  stock integer not null default 0,
  track_inventory boolean not null default false,
  continue_selling_when_out_of_stock boolean not null default false,
  low_stock_threshold integer,
  restock_at timestamptz,
  supplier_cost_qar numeric(10,2),
  purchase_order_ref text,
  stock_status_label text,
  min_order_quantity integer not null default 1,
  max_order_quantity integer,
  physical_product boolean not null default true,
  weight_grams integer,
  package_dimensions jsonb not null default '{}'::jsonb,
  requires_shipping boolean not null default true,
  free_shipping_eligible boolean not null default false,
  country_of_origin text,
  hs_code text,
  customs_description text,
  digital_delivery boolean not null default false,
  metafields jsonb not null default '{}'::jsonb,
  is_customizable boolean not null default false,
  customization_label text,
  size_options jsonb not null default '[]'::jsonb,
  allow_custom_size boolean not null default false,
  variant_options jsonb not null default '[]'::jsonb,
  requires_height_input boolean not null default false,
  height_input_label text,
  height_options jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_storefront on products(storefront_slug, position);

alter table if exists products
  add column if not exists requires_height_input boolean not null default false;

alter table if exists products
  add column if not exists height_input_label text;

alter table if exists products
  add column if not exists height_options jsonb not null default '[]'::jsonb;

alter table if exists products
  add column if not exists allow_custom_size boolean not null default false;

alter table if exists products
  add column if not exists variant_options jsonb not null default '[]'::jsonb;

alter table if exists products
  add column if not exists pricing_mode text not null default 'one_time',
  add column if not exists monthly_price_qar numeric(10,2);

alter table if exists products
  add column if not exists subtitle text,
  add column if not exists handle text,
  add column if not exists media_alt_text text,
  add column if not exists product_type text,
  add column if not exists vendor text,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists template_key text,
  add column if not exists badges jsonb not null default '[]'::jsonb,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists published_at timestamptz,
  add column if not exists compare_at_price_qar numeric(10,2),
  add column if not exists cost_per_item_qar numeric(10,2),
  add column if not exists taxable boolean not null default true,
  add column if not exists discount_eligible boolean not null default true,
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz,
  add column if not exists min_order_quantity integer not null default 1,
  add column if not exists max_order_quantity integer,
  add column if not exists sku text,
  add column if not exists barcode text,
  add column if not exists stock integer not null default 0,
  add column if not exists track_inventory boolean not null default false,
  add column if not exists continue_selling_when_out_of_stock boolean not null default false,
  add column if not exists low_stock_threshold integer,
  add column if not exists restock_at timestamptz,
  add column if not exists supplier_cost_qar numeric(10,2),
  add column if not exists purchase_order_ref text,
  add column if not exists stock_status_label text,
  add column if not exists physical_product boolean not null default true,
  add column if not exists weight_grams integer,
  add column if not exists package_dimensions jsonb not null default '{}'::jsonb,
  add column if not exists requires_shipping boolean not null default true,
  add column if not exists free_shipping_eligible boolean not null default false,
  add column if not exists country_of_origin text,
  add column if not exists hs_code text,
  add column if not exists customs_description text,
  add column if not exists digital_delivery boolean not null default false,
  add column if not exists metafields jsonb not null default '{}'::jsonb;

create unique index if not exists products_storefront_handle_unique
  on products (storefront_slug, lower(handle))
  where handle is not null and btrim(handle) <> '';

alter table if exists checkout_order_items
  add column if not exists variant_label text;

alter table if exists checkout_order_items
  add column if not exists custom_inputs jsonb not null default '{}'::jsonb;

alter table if exists checkout_orders
  add column if not exists discount_qar integer not null default 0;

alter table if exists checkout_orders
  add column if not exists discount_code text;

alter table if exists checkout_orders
  add column if not exists discount_id bigint;

create table if not exists storefront_reviews (
  id uuid primary key default gen_random_uuid(),
  storefront_slug text not null references briefs(slug) on delete cascade,
  product_id uuid references products(id) on delete set null,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  is_featured boolean not null default false,
  source text not null default 'storefront',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists storefront_reviews_store_status_idx
  on storefront_reviews (storefront_slug, status, created_at desc);

create index if not exists storefront_reviews_store_featured_idx
  on storefront_reviews (storefront_slug, is_featured, created_at desc);

create index if not exists storefront_reviews_product_idx
  on storefront_reviews (product_id, status, created_at desc)
  where product_id is not null;
