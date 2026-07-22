-- Immutable Easy recovery points and the versioned Easy presentation draft.
-- Catalogue, inventory, orders, customers, credentials, apps, domains and
-- Pro source deliberately remain outside both JSON payloads.

begin;

create extension if not exists pgcrypto;

create table if not exists storefront_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  storefront_slug       text not null references briefs(slug) on delete cascade,
  clerk_user_id         text not null,
  kind                  text not null check (kind in ('pre_pro_easy')),
  schema_version        integer not null default 1 check (schema_version > 0),
  payload               jsonb not null,
  state_hash            text not null check (state_hash ~ '^[a-f0-9]{64}$'),
  consent_version       integer not null check (consent_version > 0),
  page_count            integer not null default 0 check (page_count >= 0),
  was_published         boolean not null default false,
  captured_published_at timestamptz,
  created_at            timestamptz not null default now(),
  constraint storefront_snapshots_store_kind_hash_consent_key
    unique (storefront_slug, kind, state_hash, consent_version)
);

create index if not exists storefront_snapshots_owner_created_idx
  on storefront_snapshots (clerk_user_id, created_at desc);
create index if not exists storefront_snapshots_store_created_idx
  on storefront_snapshots (storefront_slug, created_at desc);

create table if not exists easy_draft_manifests (
  storefront_slug    text primary key references briefs(slug) on delete cascade,
  clerk_user_id      text not null,
  schema_version     integer not null default 1 check (schema_version > 0),
  version            bigint not null default 1 check (version > 0),
  payload            jsonb not null,
  state_hash         text not null check (state_hash ~ '^[a-f0-9]{64}$'),
  source_snapshot_id uuid references storefront_snapshots(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table pro_workspaces
  add column if not exists easy_snapshot_id uuid
    references storefront_snapshots(id) on delete restrict;

-- Existing stores start with a manifest matching their current Easy draft.
-- Legacy block/page columns continue to be mirrored during rollout.
with draft_payloads as (
  select
    b.slug,
    b.clerk_user_id,
    jsonb_build_object(
      'schemaVersion', 1,
      'templateId', b.template_id,
      'design', b.design,
      'palette', b.palette,
      'themeOverrides', coalesce(b.theme_overrides, '{}'::jsonb),
      'pages', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'slug', p.slug::text,
            'title', p.title,
            'blocks', coalesce(p.draft_blocks, '[]'::jsonb),
            'status', p.status,
            'position', p.position,
            'showInNav', p.show_in_nav,
            'isHome', p.is_home,
            'seo', jsonb_build_object(
              'title', p.seo_title,
              'description', p.seo_description,
              'image', p.seo_image
            )
          ) order by p.is_home desc, p.position asc, p.created_at asc
        )
        from storefront_pages p
        where p.storefront_slug = b.slug
      ), jsonb_build_array(
        jsonb_build_object(
          'id', null,
          'slug', 'home',
          'title', 'Home',
          'blocks', coalesce(b.draft_blocks, '[]'::jsonb),
          'status', case when b.is_published then 'published' else 'draft' end,
          'position', 0,
          'showInNav', false,
          'isHome', true,
          'seo', '{}'::jsonb
        )
      )),
      'policies', jsonb_build_object(
        'terms', b.policies_terms,
        'privacy', b.policies_privacy,
        'refund', b.policies_refund,
        'shipping', b.policies_shipping
      ),
      'productIndex', coalesce(b.products_index_settings, '{}'::jsonb),
      'checkoutPresentation', jsonb_build_object(
        'addressDesign', b.checkout_address_design,
        'experience', coalesce(b.checkout_experience, '{}'::jsonb),
        'thankYou', coalesce(b.checkout_thank_you, '{}'::jsonb)
      )
    ) as payload
  from briefs b
)
insert into easy_draft_manifests (
  storefront_slug, clerk_user_id, schema_version, version, payload, state_hash
)
select
  slug,
  clerk_user_id,
  1,
  1,
  payload,
  encode(digest(payload::text, 'sha256'), 'hex')
from draft_payloads
on conflict (storefront_slug) do nothing;

commit;
