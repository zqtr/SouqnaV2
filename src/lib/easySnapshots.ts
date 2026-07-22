import 'server-only';

import { createHash } from 'node:crypto';
import { unstable_noStore as noStore } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import type { Block, ThemeOverrides } from '@/lib/blocks/types';
import type { DesignId, TemplateId } from '@/lib/brief';
import type { PaletteId } from '@/lib/palettes';
import { parseProductIndexSettings, type ProductIndexSettings } from '@/lib/productIndexSettings';
import {
  DEFAULT_CHECKOUT_SETTINGS,
  type CheckoutAddressDesign,
  type CheckoutExperienceSettings,
  type StorefrontPolicies,
  type ThankYouSettings,
} from '@/lib/storefrontSettings';
import {
  PRO_CONVERSION_CONSENT_VERSION,
  type ProBrandIntent,
  type ProFoundationId,
} from '@/lib/proMode';

export const EASY_PRESENTATION_SCHEMA_VERSION = 1 as const;
export { PRO_CONVERSION_CONSENT_VERSION };

const EasyPageSchema = z.object({
  id: z.string().uuid().nullable(),
  slug: z.string().min(1).max(120),
  title: z.string().max(240),
  blocks: z.array(z.unknown()),
  status: z.enum(['draft', 'published']),
  position: z.number().int(),
  showInNav: z.boolean(),
  isHome: z.boolean(),
  seo: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
  }),
});

const EasyPresentationSchema = z.object({
  schemaVersion: z.literal(EASY_PRESENTATION_SCHEMA_VERSION),
  templateId: z.string(),
  design: z.string(),
  palette: z.string(),
  themeOverrides: z.record(z.unknown()),
  pages: z.array(EasyPageSchema),
  policies: z.object({
    terms: z.string().nullable(),
    privacy: z.string().nullable(),
    refund: z.string().nullable(),
    shipping: z.string().nullable(),
  }),
  productIndex: z.record(z.unknown()),
  checkoutPresentation: z.object({
    addressDesign: z.enum(['qatar_plate', 'soft_card', 'classic']),
    experience: z.record(z.unknown()),
    thankYou: z.record(z.unknown()),
  }),
});

const EasySnapshotPayloadSchema = z.object({
  schemaVersion: z.literal(EASY_PRESENTATION_SCHEMA_VERSION),
  draft: EasyPresentationSchema,
  published: EasyPresentationSchema,
  publication: z.object({
    wasPublished: z.boolean(),
    publishedAt: z.string().nullable(),
    pageCount: z.number().int().nonnegative(),
  }),
});

export type EasyPresentationPage = Omit<z.infer<typeof EasyPageSchema>, 'blocks'> & {
  blocks: Block[];
};

export type EasyPresentation = Omit<
  z.infer<typeof EasyPresentationSchema>,
  | 'templateId'
  | 'design'
  | 'palette'
  | 'themeOverrides'
  | 'pages'
  | 'policies'
  | 'productIndex'
  | 'checkoutPresentation'
> & {
  templateId: TemplateId;
  design: DesignId;
  palette: PaletteId;
  themeOverrides: ThemeOverrides;
  pages: EasyPresentationPage[];
  policies: StorefrontPolicies;
  productIndex: ProductIndexSettings;
  checkoutPresentation: {
    addressDesign: CheckoutAddressDesign;
    experience: CheckoutExperienceSettings;
    thankYou: ThankYouSettings;
  };
};

export type EasySnapshotPayload = {
  schemaVersion: typeof EASY_PRESENTATION_SCHEMA_VERSION;
  draft: EasyPresentation;
  published: EasyPresentation;
  publication: {
    wasPublished: boolean;
    publishedAt: string | null;
    pageCount: number;
  };
};

export type EasyDraftManifest = {
  storefrontSlug: string;
  version: number;
  stateHash: string;
  sourceSnapshotId: string | null;
  presentation: EasyPresentation;
  updatedAt: string;
};

export type StorefrontSnapshotSummary = {
  id: string;
  storefrontSlug: string;
  kind: 'pre_pro_easy';
  schemaVersion: number;
  stateHash: string;
  consentVersion: number;
  pageCount: number;
  wasPublished: boolean;
  capturedPublishedAt: string | null;
  createdAt: string;
};

export type StorefrontSnapshot = StorefrontSnapshotSummary & {
  payload: EasySnapshotPayload;
};

export function toStorefrontSnapshotSummary(
  snapshot: StorefrontSnapshot,
): StorefrontSnapshotSummary {
  return {
    id: snapshot.id,
    storefrontSlug: snapshot.storefrontSlug,
    kind: snapshot.kind,
    schemaVersion: snapshot.schemaVersion,
    stateHash: snapshot.stateHash,
    consentVersion: snapshot.consentVersion,
    pageCount: snapshot.pageCount,
    wasPublished: snapshot.wasPublished,
    capturedPublishedAt: snapshot.capturedPublishedAt,
    createdAt: snapshot.createdAt,
  };
}

type ManifestRow = {
  storefront_slug: string;
  version: string | number;
  state_hash: string;
  source_snapshot_id: string | null;
  payload: unknown;
  updated_at: string;
};

type SnapshotRow = {
  id: string;
  storefront_slug: string;
  kind: 'pre_pro_easy';
  schema_version: number;
  payload: unknown;
  state_hash: string;
  consent_version: number;
  page_count: number;
  was_published: boolean;
  captured_published_at: string | null;
  created_at: string;
};

function sortCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortCanonical(child)]),
  );
}

export function canonicalEasyPresentationJson(value: unknown): string {
  return JSON.stringify(sortCanonical(value));
}

export function hashEasyPresentation(value: unknown): string {
  return createHash('sha256').update(canonicalEasyPresentationJson(value)).digest('hex');
}

function parsePresentation(value: unknown): EasyPresentation {
  const parsed = EasyPresentationSchema.parse(value);
  const rawExperience = parsed.checkoutPresentation.experience;
  const defaultExperience = DEFAULT_CHECKOUT_SETTINGS.experience;
  const experience = {
    ...defaultExperience,
    ...rawExperience,
    customColors: {
      ...defaultExperience.customColors,
      ...(rawExperience.customColors &&
      typeof rawExperience.customColors === 'object' &&
      !Array.isArray(rawExperience.customColors)
        ? rawExperience.customColors
        : {}),
    },
    souqnaCity: {
      ...defaultExperience.souqnaCity,
      ...(rawExperience.souqnaCity &&
      typeof rawExperience.souqnaCity === 'object' &&
      !Array.isArray(rawExperience.souqnaCity)
        ? rawExperience.souqnaCity
        : {}),
    },
  } as CheckoutExperienceSettings;
  return {
    ...parsed,
    templateId: parsed.templateId as TemplateId,
    design: parsed.design as DesignId,
    palette: parsed.palette as PaletteId,
    themeOverrides: parsed.themeOverrides as ThemeOverrides,
    pages: parsed.pages as EasyPresentationPage[],
    policies: parsed.policies,
    productIndex: parseProductIndexSettings(parsed.productIndex),
    checkoutPresentation: {
      addressDesign: parsed.checkoutPresentation.addressDesign,
      experience,
      thankYou: {
        ...DEFAULT_CHECKOUT_SETTINGS.thankYou,
        ...parsed.checkoutPresentation.thankYou,
      } as ThankYouSettings,
    },
  };
}

function parseSnapshotPayload(value: unknown): EasySnapshotPayload {
  return EasySnapshotPayloadSchema.parse(value) as EasySnapshotPayload;
}

function manifestFromRow(row: ManifestRow): EasyDraftManifest {
  return {
    storefrontSlug: row.storefront_slug,
    version: Number(row.version),
    stateHash: row.state_hash,
    sourceSnapshotId: row.source_snapshot_id,
    presentation: parsePresentation(row.payload),
    updatedAt: row.updated_at,
  };
}

function snapshotSummaryFromRow(row: SnapshotRow): StorefrontSnapshotSummary {
  return {
    id: row.id,
    storefrontSlug: row.storefront_slug,
    kind: row.kind,
    schemaVersion: row.schema_version,
    stateHash: row.state_hash,
    consentVersion: row.consent_version,
    pageCount: row.page_count,
    wasPublished: row.was_published,
    capturedPublishedAt: row.captured_published_at,
    createdAt: row.created_at,
  };
}

function snapshotFromRow(row: SnapshotRow): StorefrontSnapshot {
  return { ...snapshotSummaryFromRow(row), payload: parseSnapshotPayload(row.payload) };
}

/**
 * Create the first manifest for stores created after migration 077. This is
 * an idempotent bootstrap only; an existing restored/versioned manifest is
 * never overwritten by legacy columns.
 */
export async function ensureEasyDraftManifest(
  storefrontSlug: string,
  clerkUserId: string,
): Promise<EasyDraftManifest> {
  const rows = (await db()`
    with presentation as (
      select jsonb_build_object(
        'schemaVersion', ${EASY_PRESENTATION_SCHEMA_VERSION}::integer,
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
          ) from storefront_pages p where p.storefront_slug = b.slug
        ), jsonb_build_array(jsonb_build_object(
          'id', null,
          'slug', 'home',
          'title', 'Home',
          'blocks', coalesce(b.draft_blocks, '[]'::jsonb),
          'status', case when b.is_published then 'published' else 'draft' end,
          'position', 0,
          'showInNav', false,
          'isHome', true,
          'seo', '{}'::jsonb
        ))),
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
      where b.slug = ${storefrontSlug} and b.clerk_user_id = ${clerkUserId}
    ), inserted as (
      insert into easy_draft_manifests (
        storefront_slug, clerk_user_id, schema_version, version, payload, state_hash
      )
      select
        ${storefrontSlug},
        ${clerkUserId},
        ${EASY_PRESENTATION_SCHEMA_VERSION},
        1,
        payload,
        encode(digest(payload::text, 'sha256'), 'hex')
      from presentation
      on conflict (storefront_slug) do nothing
      returning *
    )
    select * from inserted
    union all
    select * from easy_draft_manifests
    where storefront_slug = ${storefrontSlug}
      and clerk_user_id = ${clerkUserId}
      and not exists (select 1 from inserted)
    limit 1
  `) as unknown as ManifestRow[];
  const row = rows[0];
  if (!row) throw new Error('Easy manifest unavailable');
  return manifestFromRow(row);
}

export async function getEasyDraftManifest(
  storefrontSlug: string,
): Promise<EasyDraftManifest | null> {
  noStore();
  const rows = (await db()`
    select * from easy_draft_manifests
    where storefront_slug = ${storefrontSlug}
    limit 1
  `) as unknown as ManifestRow[];
  const row = rows[0];
  return row ? manifestFromRow(row) : null;
}

export type EasyManifestMutationResult =
  | { ok: true; manifest: EasyDraftManifest }
  | { ok: false; reason: 'manifest_missing' | 'page_missing' | 'conflict' };

/** Apply a focused mutation against the latest manifest with CAS retries. */
export async function mutateEasyDraftManifest(input: {
  storefrontSlug: string;
  clerkUserId: string;
  mutate: (presentation: EasyPresentation) => EasyPresentation | null;
}): Promise<EasyManifestMutationResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await getEasyDraftManifest(input.storefrontSlug);
    if (!current) return { ok: false, reason: 'manifest_missing' };
    const draft = structuredClone(current.presentation);
    const changed = input.mutate(draft);
    if (!changed) return { ok: false, reason: 'page_missing' };
    const normalized = parsePresentation(changed);
    const payloadJson = canonicalEasyPresentationJson(normalized);
    if (payloadJson === canonicalEasyPresentationJson(current.presentation)) {
      return { ok: true, manifest: current };
    }
    const rows = (await db()`
      update easy_draft_manifests
      set payload = ${payloadJson}::jsonb,
          state_hash = encode(digest(${payloadJson}::jsonb::text, 'sha256'), 'hex'),
          source_snapshot_id = null,
          version = version + 1,
          updated_at = now()
      where storefront_slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and version = ${current.version}
        and state_hash = ${current.stateHash}
      returning *
    `) as unknown as ManifestRow[];
    const row = rows[0];
    if (row) return { ok: true, manifest: manifestFromRow(row) };
  }
  return { ok: false, reason: 'conflict' };
}

export async function updateEasyManifestPage(input: {
  storefrontSlug: string;
  clerkUserId: string;
  pageId: string;
  blocks: Block[];
  theme?: ThemeOverrides;
}): Promise<EasyManifestMutationResult> {
  return mutateEasyDraftManifest({
    storefrontSlug: input.storefrontSlug,
    clerkUserId: input.clerkUserId,
    mutate: (presentation) => {
      const page = presentation.pages.find((candidate) => candidate.id === input.pageId);
      if (!page) return null;
      page.blocks = input.blocks;
      if (input.theme) presentation.themeOverrides = input.theme;
      return presentation;
    },
  });
}

export async function updateEasyManifestTheme(input: {
  storefrontSlug: string;
  clerkUserId: string;
  theme: ThemeOverrides;
}): Promise<EasyManifestMutationResult> {
  return mutateEasyDraftManifest({
    storefrontSlug: input.storefrontSlug,
    clerkUserId: input.clerkUserId,
    mutate: (presentation) => ({ ...presentation, themeOverrides: input.theme }),
  });
}

export async function updateEasyManifestTemplate(input: {
  storefrontSlug: string;
  clerkUserId: string;
  pageId: string;
  templateId: TemplateId;
  blocks: Block[];
  theme: ThemeOverrides;
}): Promise<EasyManifestMutationResult> {
  return mutateEasyDraftManifest({
    storefrontSlug: input.storefrontSlug,
    clerkUserId: input.clerkUserId,
    mutate: (presentation) => {
      const page = presentation.pages.find((candidate) => candidate.id === input.pageId);
      if (!page) return null;
      page.blocks = input.blocks;
      presentation.templateId = input.templateId;
      presentation.themeOverrides = input.theme;
      return presentation;
    },
  });
}

export async function updateEasyManifestPoliciesAndPalette(input: {
  storefrontSlug: string;
  clerkUserId: string;
  policies?: StorefrontPolicies;
  palette?: PaletteId;
}): Promise<EasyManifestMutationResult> {
  return mutateEasyDraftManifest({
    storefrontSlug: input.storefrontSlug,
    clerkUserId: input.clerkUserId,
    mutate: (presentation) => ({
      ...presentation,
      ...(input.policies ? { policies: input.policies } : {}),
      ...(input.palette ? { palette: input.palette } : {}),
    }),
  });
}

export async function updateEasyManifestCheckoutPresentation(input: {
  storefrontSlug: string;
  clerkUserId: string;
  addressDesign: CheckoutAddressDesign;
  experience: CheckoutExperienceSettings;
  thankYou: ThankYouSettings;
}): Promise<EasyManifestMutationResult> {
  return mutateEasyDraftManifest({
    storefrontSlug: input.storefrontSlug,
    clerkUserId: input.clerkUserId,
    mutate: (presentation) => ({
      ...presentation,
      checkoutPresentation: {
        addressDesign: input.addressDesign,
        experience: input.experience,
        thankYou: input.thankYou,
      },
    }),
  });
}

export async function updateEasyManifestProductIndex(input: {
  storefrontSlug: string;
  clerkUserId: string;
  settings: ProductIndexSettings;
}): Promise<EasyManifestMutationResult> {
  return mutateEasyDraftManifest({
    storefrontSlug: input.storefrontSlug,
    clerkUserId: input.clerkUserId,
    mutate: (presentation) => ({ ...presentation, productIndex: input.settings }),
  });
}

/**
 * Replace the Easy draft with the last materialized Easy presentation.
 * The manifest CAS is authoritative; legacy draft block columns are mirrored
 * in the same transaction for readers that have not moved to manifests yet.
 */
export async function discardEasyDraftManifest(input: {
  storefrontSlug: string;
  clerkUserId: string;
}): Promise<EasyManifestMutationResult> {
  const current = await getEasyDraftManifest(input.storefrontSlug);
  if (!current) return { ok: false, reason: 'manifest_missing' };

  const presentationRows = (await db()`
    select jsonb_build_object(
      'schemaVersion', ${EASY_PRESENTATION_SCHEMA_VERSION}::integer,
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
            'blocks', coalesce(p.published_blocks, '[]'::jsonb),
            'status', 'published',
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
          and (p.status = 'published' or p.is_home)
      ), jsonb_build_array(jsonb_build_object(
        'id', null,
        'slug', 'home',
        'title', 'Home',
        'blocks', coalesce(b.published_blocks, '[]'::jsonb),
        'status', case when b.is_published then 'published' else 'draft' end,
        'position', 0,
        'showInNav', false,
        'isHome', true,
        'seo', '{}'::jsonb
      ))),
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
    where b.slug = ${input.storefrontSlug}
      and b.clerk_user_id = ${input.clerkUserId}
    limit 1
  `) as unknown as Array<{ payload: unknown }>;
  const rawPresentation = presentationRows[0]?.payload;
  if (!rawPresentation) return { ok: false, reason: 'manifest_missing' };
  const presentation = parsePresentation(rawPresentation);
  const payloadJson = canonicalEasyPresentationJson(presentation);
  const home = presentation.pages.find((page) => page.isHome) ?? presentation.pages[0];
  if (!home) return { ok: false, reason: 'page_missing' };

  const results = await db().transaction((tx) => [
    tx`
      update easy_draft_manifests
      set payload = ${payloadJson}::jsonb,
          state_hash = encode(digest(${payloadJson}::jsonb::text, 'sha256'), 'hex'),
          source_snapshot_id = null,
          version = version + 1,
          updated_at = now()
      where storefront_slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and version = ${current.version}
        and state_hash = ${current.stateHash}
      returning *
    `,
    tx`
      update briefs
      set draft_blocks = ${JSON.stringify(home.blocks)}::jsonb
      where slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and exists (
          select 1 from easy_draft_manifests m
          where m.storefront_slug = ${input.storefrontSlug}
            and m.clerk_user_id = ${input.clerkUserId}
            and m.version = ${current.version + 1}
            and m.state_hash = encode(digest(${payloadJson}::jsonb::text, 'sha256'), 'hex')
            and exists (
              select 1 from briefs owner
              where owner.slug = m.storefront_slug
                and owner.clerk_user_id = ${input.clerkUserId}
            )
        )
    `,
    ...presentation.pages
      .filter((page) => page.id)
      .map(
        (page) => tx`
        update storefront_pages
        set draft_blocks = ${JSON.stringify(page.blocks)}::jsonb,
            updated_at = now()
        where id = ${page.id}::uuid
          and storefront_slug = ${input.storefrontSlug}
          and exists (
            select 1 from easy_draft_manifests m
            where m.storefront_slug = ${input.storefrontSlug}
              and m.clerk_user_id = ${input.clerkUserId}
              and m.version = ${current.version + 1}
              and m.state_hash = encode(digest(${payloadJson}::jsonb::text, 'sha256'), 'hex')
              and exists (
                select 1 from briefs owner
                where owner.slug = m.storefront_slug
                  and owner.clerk_user_id = ${input.clerkUserId}
              )
          )
      `,
      ),
  ]);
  const rows = (results[0] ?? []) as unknown as ManifestRow[];
  return rows[0]
    ? { ok: true, manifest: manifestFromRow(rows[0]) }
    : { ok: false, reason: 'conflict' };
}

/**
 * Publish the complete manifest in one Neon transaction. Every write is
 * guarded by the same version/hash and the first statement locks that row,
 * so a concurrent Builder save makes the whole publish a no-op. Pro source
 * and workspace rows are retained; only the active Souqy routing pointers
 * are cleared.
 */
export async function publishEasyDraftManifest(input: {
  storefrontSlug: string;
  clerkUserId: string;
}): Promise<
  | { ok: true; version: number; stateHash: string; publishedAt: string }
  | { ok: false; reason: 'manifest_missing' | 'conflict' }
> {
  const manifest = await getEasyDraftManifest(input.storefrontSlug);
  if (!manifest) return { ok: false, reason: 'manifest_missing' };
  const presentation = manifest.presentation;
  const home = presentation.pages.find((page) => page.isHome) ?? presentation.pages[0];
  if (!home) return { ok: false, reason: 'manifest_missing' };
  const pageSlugs = presentation.pages.map((page) => page.slug);
  const guard = {
    version: manifest.version,
    stateHash: manifest.stateHash,
  };
  const sql = db();
  const results = await sql.transaction((tx) => [
    tx`
      select storefront_slug from easy_draft_manifests
      where storefront_slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and version = ${guard.version}
        and state_hash = ${guard.stateHash}
      for update
    `,
    tx`
      update briefs
      set template_id = ${presentation.templateId},
          design = ${presentation.design},
          palette = ${presentation.palette},
          theme_overrides = ${JSON.stringify(presentation.themeOverrides)}::jsonb,
          draft_blocks = ${JSON.stringify(home.blocks)}::jsonb,
          published_blocks = ${JSON.stringify(home.blocks)}::jsonb,
          policies_terms = ${presentation.policies.terms},
          policies_privacy = ${presentation.policies.privacy},
          policies_refund = ${presentation.policies.refund},
          policies_shipping = ${presentation.policies.shipping},
          products_index_settings = ${JSON.stringify(presentation.productIndex)}::jsonb,
          checkout_address_design = ${presentation.checkoutPresentation.addressDesign},
          checkout_experience = ${JSON.stringify(presentation.checkoutPresentation.experience)}::jsonb,
          checkout_thank_you = ${JSON.stringify(presentation.checkoutPresentation.thankYou)}::jsonb,
          is_published = true,
          published_at = now(),
          souqy_revision = null,
          souqy_blob_url = null
      where slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and exists (
          select 1 from easy_draft_manifests m
          where m.storefront_slug = ${input.storefrontSlug}
            and m.clerk_user_id = ${input.clerkUserId}
            and m.version = ${guard.version}
            and m.state_hash = ${guard.stateHash}
            and exists (
              select 1 from briefs owner
              where owner.slug = m.storefront_slug
                and owner.clerk_user_id = ${input.clerkUserId}
            )
        )
      returning published_at
    `,
    tx`
      update storefront_pages
      set is_home = false, updated_at = now()
      where storefront_slug = ${input.storefrontSlug}
        and is_home = true
        and exists (
          select 1 from easy_draft_manifests m
          where m.storefront_slug = ${input.storefrontSlug}
            and m.clerk_user_id = ${input.clerkUserId}
            and m.version = ${guard.version}
            and m.state_hash = ${guard.stateHash}
            and exists (
              select 1 from briefs owner
              where owner.slug = m.storefront_slug
                and owner.clerk_user_id = ${input.clerkUserId}
            )
        )
    `,
    ...presentation.pages.map(
      (page) => tx`
      insert into storefront_pages (
        id, storefront_slug, slug, title, draft_blocks, published_blocks,
        status, position, show_in_nav, is_home,
        seo_title, seo_description, seo_image
      )
      select
        coalesce(${page.id}::uuid, gen_random_uuid()),
        ${input.storefrontSlug},
        ${page.slug},
        ${page.title},
        ${JSON.stringify(page.blocks)}::jsonb,
        ${JSON.stringify(page.blocks)}::jsonb,
        'published',
        ${page.position},
        ${page.showInNav},
        ${page.isHome},
        ${page.seo.title ?? null},
        ${page.seo.description ?? null},
        ${page.seo.image ?? null}
      where exists (
        select 1 from easy_draft_manifests m
        where m.storefront_slug = ${input.storefrontSlug}
          and m.clerk_user_id = ${input.clerkUserId}
          and m.version = ${guard.version}
          and m.state_hash = ${guard.stateHash}
          and exists (
            select 1 from briefs owner
            where owner.slug = m.storefront_slug
              and owner.clerk_user_id = ${input.clerkUserId}
          )
      )
      on conflict (id) do update set
        slug = excluded.slug,
        title = excluded.title,
        draft_blocks = excluded.draft_blocks,
        published_blocks = excluded.published_blocks,
        status = 'published',
        position = excluded.position,
        show_in_nav = excluded.show_in_nav,
        is_home = excluded.is_home,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        seo_image = excluded.seo_image,
        updated_at = now()
      where storefront_pages.storefront_slug = excluded.storefront_slug
    `,
    ),
    tx`
      delete from storefront_pages
      where storefront_slug = ${input.storefrontSlug}
        and not (slug::text = any(${pageSlugs}))
        and exists (
          select 1 from easy_draft_manifests m
          where m.storefront_slug = ${input.storefrontSlug}
            and m.clerk_user_id = ${input.clerkUserId}
            and m.version = ${guard.version}
            and m.state_hash = ${guard.stateHash}
            and exists (
              select 1 from briefs owner
              where owner.slug = m.storefront_slug
                and owner.clerk_user_id = ${input.clerkUserId}
            )
        )
    `,
  ]);
  const lockRows = (results[0] ?? []) as unknown as { storefront_slug: string }[];
  const publishedRows = (results[1] ?? []) as unknown as { published_at: string }[];
  const publishedAt = publishedRows[0]?.published_at;
  if (!lockRows[0] || !publishedAt) return { ok: false, reason: 'conflict' };
  return {
    ok: true,
    version: manifest.version,
    stateHash: manifest.stateHash,
    publishedAt,
  };
}

/**
 * Atomically compare the reviewed Easy version and capture both the manifest
 * draft and the current published Easy presentation. No live or draft fields
 * are mutated by this operation.
 */
export async function captureEasySnapshotForProConversion(input: {
  storefrontSlug: string;
  clerkUserId: string;
  expectedEasyVersion: number;
  consentVersion: number;
}): Promise<
  | { ok: true; snapshot: StorefrontSnapshot }
  | { ok: false; reason: 'snapshot_stale' | 'storefront_missing' }
> {
  const rows = (await db()`
    with reviewed_manifest as (
      select * from easy_draft_manifests
      where storefront_slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and version = ${input.expectedEasyVersion}
    ), current_store as (
      select b.* from briefs b
      join reviewed_manifest m on m.storefront_slug = b.slug
      where b.clerk_user_id = ${input.clerkUserId}
    ), published_presentation as (
      select jsonb_build_object(
        'schemaVersion', ${EASY_PRESENTATION_SCHEMA_VERSION}::integer,
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
              'blocks', coalesce(p.published_blocks, '[]'::jsonb),
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
          ) from storefront_pages p
          where p.storefront_slug = b.slug
            and (p.status = 'published' or p.is_home)
        ), jsonb_build_array(jsonb_build_object(
          'id', null,
          'slug', 'home',
          'title', 'Home',
          'blocks', coalesce(b.published_blocks, '[]'::jsonb),
          'status', case when b.is_published then 'published' else 'draft' end,
          'position', 0,
          'showInNav', false,
          'isHome', true,
          'seo', '{}'::jsonb
        ))),
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
      ) as payload,
      b.is_published,
      b.published_at
      from current_store b
    ), snapshot_payload as (
      select
        jsonb_build_object(
          'schemaVersion', ${EASY_PRESENTATION_SCHEMA_VERSION}::integer,
          'draft', m.payload,
          'published', p.payload,
          'publication', jsonb_build_object(
            'wasPublished', p.is_published,
            'publishedAt', p.published_at,
            'pageCount', jsonb_array_length(coalesce(m.payload->'pages', '[]'::jsonb))
          )
        ) as payload,
        p.is_published,
        p.published_at,
        jsonb_array_length(coalesce(m.payload->'pages', '[]'::jsonb)) as page_count
      from reviewed_manifest m cross join published_presentation p
    ), candidate as (
      select *, encode(digest(payload::text, 'sha256'), 'hex') as state_hash
      from snapshot_payload
    ), inserted as (
      insert into storefront_snapshots (
        storefront_slug, clerk_user_id, kind, schema_version, payload,
        state_hash, consent_version, page_count, was_published,
        captured_published_at
      )
      select
        ${input.storefrontSlug},
        ${input.clerkUserId},
        'pre_pro_easy',
        ${EASY_PRESENTATION_SCHEMA_VERSION},
        payload,
        state_hash,
        ${input.consentVersion},
        page_count,
        is_published,
        published_at
      from candidate
      on conflict (storefront_slug, kind, state_hash, consent_version) do nothing
      returning *
    )
    select * from inserted
    union all
    select s.* from storefront_snapshots s
    join candidate c on c.state_hash = s.state_hash
    where s.storefront_slug = ${input.storefrontSlug}
      and s.clerk_user_id = ${input.clerkUserId}
      and s.kind = 'pre_pro_easy'
      and s.consent_version = ${input.consentVersion}
      and not exists (select 1 from inserted)
    limit 1
  `) as unknown as SnapshotRow[];
  const row = rows[0];
  if (row) return { ok: true, snapshot: snapshotFromRow(row) };

  const manifest = await getEasyDraftManifest(input.storefrontSlug);
  return manifest
    ? { ok: false, reason: 'snapshot_stale' }
    : { ok: false, reason: 'storefront_missing' };
}

/**
 * First-time Pro conversion persistence. The reviewed Easy version,
 * immutable snapshot, and initial Pro workspace are committed by one SQL
 * statement, so a stale Easy draft can never leave a Pro workspace behind.
 */
export async function captureEasySnapshotAndInitializeProWorkspace(input: {
  storefrontSlug: string;
  clerkUserId: string;
  expectedEasyVersion: number;
  consentVersion: number;
  foundation: ProFoundationId;
  source: string;
  brandIntent: ProBrandIntent;
  recommendationVersion: number;
}): Promise<
  | { ok: true; snapshot: StorefrontSnapshot; workspaceCreated: boolean }
  | { ok: false; reason: 'snapshot_stale' | 'storefront_missing' }
> {
  const sourceHash = createHash('sha256').update(input.source, 'utf8').digest('hex');
  const rows = (await db()`
    with reviewed_manifest as materialized (
      select * from easy_draft_manifests
      where storefront_slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and version = ${input.expectedEasyVersion}
    ), current_store as materialized (
      select b.* from briefs b
      join reviewed_manifest m on m.storefront_slug = b.slug
      where b.clerk_user_id = ${input.clerkUserId}
    ), published_presentation as materialized (
      select jsonb_build_object(
        'schemaVersion', ${EASY_PRESENTATION_SCHEMA_VERSION}::integer,
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
              'blocks', coalesce(p.published_blocks, '[]'::jsonb),
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
          ) from storefront_pages p
          where p.storefront_slug = b.slug
            and (p.status = 'published' or p.is_home)
        ), jsonb_build_array(jsonb_build_object(
          'id', null,
          'slug', 'home',
          'title', 'Home',
          'blocks', coalesce(b.published_blocks, '[]'::jsonb),
          'status', case when b.is_published then 'published' else 'draft' end,
          'position', 0,
          'showInNav', false,
          'isHome', true,
          'seo', '{}'::jsonb
        ))),
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
      ) as payload,
      b.is_published,
      b.published_at
      from current_store b
    ), snapshot_payload as materialized (
      select
        jsonb_build_object(
          'schemaVersion', ${EASY_PRESENTATION_SCHEMA_VERSION}::integer,
          'draft', m.payload,
          'published', p.payload,
          'publication', jsonb_build_object(
            'wasPublished', p.is_published,
            'publishedAt', p.published_at,
            'pageCount', jsonb_array_length(coalesce(m.payload->'pages', '[]'::jsonb))
          )
        ) as payload,
        p.is_published,
        p.published_at,
        jsonb_array_length(coalesce(m.payload->'pages', '[]'::jsonb)) as page_count
      from reviewed_manifest m cross join published_presentation p
    ), candidate as materialized (
      select *, encode(digest(payload::text, 'sha256'), 'hex') as state_hash
      from snapshot_payload
    ), inserted_snapshot as (
      insert into storefront_snapshots (
        storefront_slug, clerk_user_id, kind, schema_version, payload,
        state_hash, consent_version, page_count, was_published,
        captured_published_at
      )
      select
        ${input.storefrontSlug},
        ${input.clerkUserId},
        'pre_pro_easy',
        ${EASY_PRESENTATION_SCHEMA_VERSION},
        payload,
        state_hash,
        ${input.consentVersion},
        page_count,
        is_published,
        published_at
      from candidate
      on conflict (storefront_slug, kind, state_hash, consent_version) do nothing
      returning *
    ), chosen_snapshot as materialized (
      select * from inserted_snapshot
      union all
      select s.* from storefront_snapshots s
      join candidate c on c.state_hash = s.state_hash
      where s.storefront_slug = ${input.storefrontSlug}
        and s.clerk_user_id = ${input.clerkUserId}
        and s.kind = 'pre_pro_easy'
        and s.consent_version = ${input.consentVersion}
        and not exists (select 1 from inserted_snapshot)
      limit 1
    ), inserted_workspace as (
      insert into pro_workspaces (
        storefront_slug, foundation, preferred_mode,
        draft_source, draft_source_hash, draft_version,
        build_status, easy_snapshot_id, brand_intent,
        recommendation_version, updated_at
      )
      select
        ${input.storefrontSlug}, ${input.foundation}, 'pro',
        ${input.source}, ${sourceHash}, 1,
        'idle', s.id, ${JSON.stringify(input.brandIntent)}::jsonb,
        ${input.recommendationVersion}, now()
      from chosen_snapshot s
      on conflict (storefront_slug) do nothing
      returning storefront_slug
    )
    select s.*, exists(select 1 from inserted_workspace) as workspace_created
    from chosen_snapshot s
    limit 1
  `) as unknown as Array<SnapshotRow & { workspace_created: boolean }>;
  const row = rows[0];
  if (row) {
    return {
      ok: true,
      snapshot: snapshotFromRow(row),
      workspaceCreated: row.workspace_created,
    };
  }

  const manifest = await getEasyDraftManifest(input.storefrontSlug);
  return manifest
    ? { ok: false, reason: 'snapshot_stale' }
    : { ok: false, reason: 'storefront_missing' };
}

export async function listStorefrontSnapshots(
  storefrontSlug: string,
  clerkUserId: string,
): Promise<StorefrontSnapshotSummary[]> {
  noStore();
  const rows = (await db()`
    select * from storefront_snapshots
    where storefront_slug = ${storefrontSlug}
      and clerk_user_id = ${clerkUserId}
    order by created_at desc
  `) as unknown as SnapshotRow[];
  return rows.map(snapshotSummaryFromRow);
}

export async function getStorefrontSnapshot(input: {
  storefrontSlug: string;
  snapshotId: string;
  clerkUserId: string;
}): Promise<StorefrontSnapshot | null> {
  noStore();
  const rows = (await db()`
    select * from storefront_snapshots
    where id = ${input.snapshotId}
      and storefront_slug = ${input.storefrontSlug}
      and clerk_user_id = ${input.clerkUserId}
    limit 1
  `) as unknown as SnapshotRow[];
  const row = rows[0];
  return row ? snapshotFromRow(row) : null;
}

/**
 * Restore is a draft-only compare-and-swap. The manifest is authoritative;
 * legacy draft block columns are mirrored for the current Builder during the
 * migration window. Published blocks, publication flags and Souqy pointers
 * are never touched.
 */
export async function restoreEasySnapshotToDraft(input: {
  storefrontSlug: string;
  clerkUserId: string;
  snapshot: StorefrontSnapshot;
  expectedEasyVersion: number;
}): Promise<{ ok: true; manifest: EasyDraftManifest } | { ok: false; reason: 'snapshot_stale' }> {
  const presentation = input.snapshot.wasPublished
    ? input.snapshot.payload.published
    : input.snapshot.payload.draft;
  const payloadJson = canonicalEasyPresentationJson(presentation);
  const home = presentation.pages.find((page) => page.isHome) ?? presentation.pages[0];
  const sql = db();
  const queries = sql.transaction((tx) => [
    tx`
      update easy_draft_manifests
      set payload = ${payloadJson}::jsonb,
          state_hash = encode(digest(${payloadJson}::jsonb::text, 'sha256'), 'hex'),
          source_snapshot_id = ${input.snapshot.id},
          version = version + 1,
          updated_at = now()
      where storefront_slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and version = ${input.expectedEasyVersion}
      returning *
    `,
    tx`
      update briefs
      set draft_blocks = ${JSON.stringify(home?.blocks ?? [])}::jsonb
      where slug = ${input.storefrontSlug}
        and clerk_user_id = ${input.clerkUserId}
        and exists (
          select 1 from easy_draft_manifests m
          where m.storefront_slug = ${input.storefrontSlug}
            and m.clerk_user_id = ${input.clerkUserId}
            and m.version = ${input.expectedEasyVersion + 1}
            and m.source_snapshot_id = ${input.snapshot.id}
            and exists (
              select 1 from briefs owner
              where owner.slug = m.storefront_slug
                and owner.clerk_user_id = ${input.clerkUserId}
            )
        )
    `,
    ...presentation.pages.map(
      (page) => tx`
      insert into storefront_pages (
        id, storefront_slug, slug, title, draft_blocks, published_blocks,
        status, position, show_in_nav, is_home,
        seo_title, seo_description, seo_image
      )
      select
        coalesce(${page.id}::uuid, gen_random_uuid()),
        ${input.storefrontSlug},
        ${page.slug},
        ${page.title},
        ${JSON.stringify(page.blocks)}::jsonb,
        null,
        'draft',
        ${page.position},
        false,
        false,
        ${page.seo.title ?? null},
        ${page.seo.description ?? null},
        ${page.seo.image ?? null}
      where exists (
        select 1 from easy_draft_manifests m
        where m.storefront_slug = ${input.storefrontSlug}
          and m.clerk_user_id = ${input.clerkUserId}
          and m.version = ${input.expectedEasyVersion + 1}
          and m.source_snapshot_id = ${input.snapshot.id}
          and exists (
            select 1 from briefs owner
            where owner.slug = m.storefront_slug
              and owner.clerk_user_id = ${input.clerkUserId}
          )
      )
      on conflict (storefront_slug, slug) do update set
        draft_blocks = excluded.draft_blocks,
        updated_at = now()
    `,
    ),
  ]);
  const results = await queries;
  const manifestRows = (results[0] ?? []) as unknown as ManifestRow[];
  const row = manifestRows[0];
  return row
    ? { ok: true, manifest: manifestFromRow(row) }
    : { ok: false, reason: 'snapshot_stale' };
}
