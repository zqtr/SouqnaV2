alter table products
  add column if not exists variant_options jsonb not null default '[]'::jsonb;

update products
set variant_options = '[]'::jsonb
where variant_options is null
   or jsonb_typeof(variant_options) <> 'array';
