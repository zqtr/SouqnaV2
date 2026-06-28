alter table products
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

update products
set
  tags = '[]'::jsonb
where tags is null or jsonb_typeof(tags) <> 'array';

update products
set
  badges = '[]'::jsonb
where badges is null or jsonb_typeof(badges) <> 'array';

update products
set
  package_dimensions = '{}'::jsonb
where package_dimensions is null or jsonb_typeof(package_dimensions) <> 'object';

update products
set
  metafields = '{}'::jsonb
where metafields is null or jsonb_typeof(metafields) <> 'object';

update products
set min_order_quantity = 1
where min_order_quantity is null or min_order_quantity < 1;

create unique index if not exists products_storefront_handle_unique
  on products (storefront_slug, lower(handle))
  where handle is not null and btrim(handle) <> '';

