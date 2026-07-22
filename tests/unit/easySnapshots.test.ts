import { beforeEach, describe, expect, it, vi } from 'vitest';

type Query = { strings: readonly string[]; values: unknown[] };
const queries: Query[] = [];
const transaction = vi.fn();
const sqlMock = Object.assign(vi.fn(), { transaction });

vi.mock('@/lib/db', () => ({
  db: () => sqlMock,
  hasDb: () => true,
}));

import {
  canonicalEasyPresentationJson,
  captureEasySnapshotAndInitializeProWorkspace,
  discardEasyDraftManifest,
  hashEasyPresentation,
  mutateEasyDraftManifest,
  publishEasyDraftManifest,
  restoreEasySnapshotToDraft,
  type EasyPresentation,
  type StorefrontSnapshot,
} from '@/lib/easySnapshots';

function presentation(blockLabel: string): EasyPresentation {
  return {
    schemaVersion: 1,
    templateId: 'atrium',
    design: 'atrium',
    palette: 'sand_gold',
    themeOverrides: {},
    pages: [
      {
        id: '6f5872ec-d534-40f6-bf2f-e9218c1585f1',
        slug: 'home',
        title: 'Home',
        blocks: [{ id: 'hero-1', type: 'hero', props: { eyebrow: blockLabel } }],
        status: 'published',
        position: 0,
        showInNav: false,
        isHome: true,
        seo: { title: null, description: null, image: null },
      },
    ],
    policies: { terms: null, privacy: null, refund: null, shipping: null },
    productIndex: {} as EasyPresentation['productIndex'],
    checkoutPresentation: {
      addressDesign: 'qatar_plate',
      experience: {} as EasyPresentation['checkoutPresentation']['experience'],
      thankYou: {} as EasyPresentation['checkoutPresentation']['thankYou'],
    },
  };
}

beforeEach(() => {
  queries.length = 0;
  sqlMock.mockReset();
  transaction.mockReset();
  transaction.mockImplementation((factory: (tx: typeof txTag) => Query[]) => {
    const built = factory(txTag);
    queries.push(...built);
    return Promise.resolve(
      built.map((_, index) =>
        index === 0
          ? [
              {
                storefront_slug: 'atelier-doha',
                version: 4,
                state_hash: 'b'.repeat(64),
                source_snapshot_id: '9e6cf0bb-25bf-440b-8152-d91398e87f99',
                payload: presentation('published-block'),
                updated_at: '2026-07-20T08:00:00.000Z',
              },
            ]
          : [],
      ),
    );
  });
});

function txTag(strings: TemplateStringsArray, ...values: unknown[]): Query {
  return { strings, values };
}

describe('Easy presentation canonicalization', () => {
  it('produces the same JSON and SHA-256 hash regardless of object key order', () => {
    const left = { z: 1, nested: { b: 2, a: 1 }, list: [{ y: 2, x: 1 }] };
    const right = { list: [{ x: 1, y: 2 }], nested: { a: 1, b: 2 }, z: 1 };

    expect(canonicalEasyPresentationJson(left)).toBe(canonicalEasyPresentationJson(right));
    expect(hashEasyPresentation(left)).toBe(hashEasyPresentation(right));
    expect(hashEasyPresentation(left)).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('treats an identical parsed manifest as a no-op even when its legacy hash encoding differs', async () => {
    sqlMock.mockResolvedValueOnce([
      {
        storefront_slug: 'atelier-doha',
        version: 1,
        state_hash: 'f'.repeat(64),
        source_snapshot_id: null,
        payload: presentation('same-block'),
        updated_at: '2026-07-20T08:00:00.000Z',
      },
    ]);

    const result = await mutateEasyDraftManifest({
      storefrontSlug: 'atelier-doha',
      clerkUserId: 'user_123',
      mutate: (current) => current,
    });

    expect(result).toMatchObject({
      ok: true,
      manifest: { version: 1, stateHash: 'f'.repeat(64) },
    });
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });
});

describe('First Pro conversion transaction', () => {
  it('captures the reviewed Easy state and seeds Pro without touching live presentation', async () => {
    const snapshotId = '9e6cf0bb-25bf-440b-8152-d91398e87f99';
    sqlMock.mockResolvedValueOnce([
      {
        id: snapshotId,
        storefront_slug: 'atelier-doha',
        kind: 'pre_pro_easy',
        schema_version: 1,
        payload: {
          schemaVersion: 1,
          draft: presentation('draft-block'),
          published: presentation('published-block'),
          publication: {
            wasPublished: true,
            publishedAt: '2026-07-19T08:00:00.000Z',
            pageCount: 1,
          },
        },
        state_hash: 'a'.repeat(64),
        consent_version: 1,
        page_count: 1,
        was_published: true,
        captured_published_at: '2026-07-19T08:00:00.000Z',
        created_at: '2026-07-20T08:00:00.000Z',
        workspace_created: true,
      },
    ]);

    const result = await captureEasySnapshotAndInitializeProWorkspace({
      storefrontSlug: 'atelier-doha',
      clerkUserId: 'user_123',
      expectedEasyVersion: 3,
      consentVersion: 1,
      foundation: 'structure',
      source: 'curated:structure',
      brandIntent: {
        visualAmbition: 'timeless',
        customerFeeling: 'trust',
        launchPriority: 'conversion',
        note: null,
      },
      recommendationVersion: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      snapshot: { id: snapshotId },
      workspaceCreated: true,
    });
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('with reviewed_manifest as materialized');
    expect(sql).toContain('insert into storefront_snapshots');
    expect(sql).toContain('insert into pro_workspaces');
    expect(sql).toContain('consent_version) do nothing');
    expect(sql).not.toContain('update briefs');
    expect(sql).not.toContain('published_blocks =');
    expect(sql).not.toContain('is_published =');
  });
});

describe('Easy snapshot restore boundary', () => {
  it('prefers captured published presentation and never writes live routing fields', async () => {
    const snapshot: StorefrontSnapshot = {
      id: '9e6cf0bb-25bf-440b-8152-d91398e87f99',
      storefrontSlug: 'atelier-doha',
      kind: 'pre_pro_easy',
      schemaVersion: 1,
      stateHash: 'a'.repeat(64),
      consentVersion: 1,
      pageCount: 1,
      wasPublished: true,
      capturedPublishedAt: '2026-07-19T08:00:00.000Z',
      createdAt: '2026-07-20T08:00:00.000Z',
      payload: {
        schemaVersion: 1,
        draft: presentation('draft-block'),
        published: presentation('published-block'),
        publication: {
          wasPublished: true,
          publishedAt: '2026-07-19T08:00:00.000Z',
          pageCount: 1,
        },
      },
    };

    const result = await restoreEasySnapshotToDraft({
      storefrontSlug: 'atelier-doha',
      clerkUserId: 'user_123',
      snapshot,
      expectedEasyVersion: 3,
    });

    expect(result).toMatchObject({ ok: true, manifest: { version: 4 } });
    const payloadJson = queries[0]?.values.find(
      (value) => typeof value === 'string' && value.includes('published-block'),
    );
    expect(payloadJson).toContain('published-block');
    expect(payloadJson).not.toContain('draft-block');

    const sql = queries.flatMap((query) => query.strings).join(' ');
    expect(sql).not.toContain('published_blocks =');
    expect(sql).not.toContain('is_published =');
    expect(sql).not.toContain('souqy_revision');
    expect(sql).not.toContain('souqy_blob_url');
  });

  it('discards into the canonical Easy manifest without changing live routing', async () => {
    sqlMock
      .mockResolvedValueOnce([
        {
          storefront_slug: 'atelier-doha',
          version: 3,
          state_hash: 'a'.repeat(64),
          source_snapshot_id: null,
          payload: presentation('draft-block'),
          updated_at: '2026-07-20T08:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([{ payload: presentation('materialized-block') }]);

    const result = await discardEasyDraftManifest({
      storefrontSlug: 'atelier-doha',
      clerkUserId: 'user_123',
    });

    expect(result).toMatchObject({ ok: true, manifest: { version: 4 } });
    const payloadJson = queries[0]?.values.find(
      (value) => typeof value === 'string' && value.includes('materialized-block'),
    );
    expect(payloadJson).toContain('materialized-block');
    const sql = queries.flatMap((query) => query.strings).join(' ');
    expect(sql).toContain('update easy_draft_manifests');
    expect(sql).toContain('draft_blocks =');
    expect(sql).toContain('owner.clerk_user_id');
    expect(sql).not.toContain('published_blocks =');
    expect(sql).not.toContain('is_published =');
    expect(sql).not.toContain('souqy_revision');
    expect(sql).not.toContain('souqy_blob_url');
  });

  it('materializes the complete manifest and disables only active Souqy routing', async () => {
    const manifestPresentation = presentation('manifest-block');
    sqlMock.mockResolvedValueOnce([
      {
        storefront_slug: 'atelier-doha',
        version: 7,
        state_hash: 'c'.repeat(64),
        source_snapshot_id: null,
        payload: manifestPresentation,
        updated_at: '2026-07-20T08:00:00.000Z',
      },
    ]);
    transaction.mockImplementationOnce((factory: (tx: typeof txTag) => Query[]) => {
      const built = factory(txTag);
      queries.push(...built);
      return Promise.resolve(
        built.map((_, index) =>
          index === 0
            ? [{ storefront_slug: 'atelier-doha' }]
            : index === 1
              ? [{ published_at: '2026-07-20T09:00:00.000Z' }]
              : [],
        ),
      );
    });

    const result = await publishEasyDraftManifest({
      storefrontSlug: 'atelier-doha',
      clerkUserId: 'user_123',
    });

    expect(result).toMatchObject({ ok: true, version: 7, stateHash: 'c'.repeat(64) });
    const sql = queries.flatMap((query) => query.strings).join(' ');
    expect(sql).toContain('published_blocks =');
    expect(sql).toContain('products_index_settings =');
    expect(sql).toContain('checkout_experience =');
    expect(sql).toContain('owner.clerk_user_id');
    expect(sql).toContain('where storefront_pages.storefront_slug = excluded.storefront_slug');
    expect(sql).toContain('souqy_revision = null');
    expect(sql).toContain('souqy_blob_url = null');
    expect(sql).not.toContain('souqy_source = null');
    expect(sql).not.toContain('delete from pro_workspaces');
  });
});
