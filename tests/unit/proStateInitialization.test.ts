import { beforeEach, describe, expect, it, vi } from 'vitest';

const sqlMock = vi.fn();

vi.mock('@/lib/db', () => ({
  hasDb: () => true,
  db: () => sqlMock,
}));

import {
  initializeProWorkspace,
  saveProAiPreferences,
  saveProWorkspaceDraft,
} from '@/lib/proState';
import { getDefaultProAiPreferences } from '@/lib/pro/modelCatalog';

const HASH = 'a'.repeat(64);

function workspaceRow(overrides: Record<string, unknown> = {}) {
  return {
    storefront_slug: 'atelier-doha',
    foundation: 'structure',
    preferred_mode: 'pro',
    draft_source: 'curated:structure',
    draft_source_hash: HASH,
    draft_version: 1,
    built_revision: null,
    built_blob_url: null,
    built_source: null,
    built_source_hash: null,
    built_source_version: null,
    build_status: 'idle',
    easy_snapshot_id: '9e6cf0bb-25bf-440b-8152-d91398e87f99',
    ai_preferences: {},
    ai_preferences_version: 1,
    last_error_code: null,
    last_error_message: null,
    created_at: '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-20T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  sqlMock.mockReset();
});

describe('Pro workspace foundation compare-and-swap', () => {
  it('creates version one without updating a concurrently inserted workspace', async () => {
    sqlMock.mockResolvedValueOnce([workspaceRow()]);

    const result = await initializeProWorkspace({
      slug: 'atelier-doha',
      foundation: 'structure',
      source: 'curated:structure',
      expectedVersion: null,
      easySnapshotId: '9e6cf0bb-25bf-440b-8152-d91398e87f99',
    });

    expect(result).toMatchObject({ ok: true, workspace: { draftVersion: 1 } });
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('on conflict (storefront_slug) do nothing');
    expect(sql).toContain('from storefront_snapshots');
    expect(sql).toContain("and s.kind = 'pre_pro_easy'");
    expect(sql).not.toContain('do update');
  });

  it('returns the winning workspace when a concurrent initial insert lands first', async () => {
    const winningRow = workspaceRow();
    sqlMock.mockResolvedValueOnce([]).mockResolvedValueOnce([winningRow]);

    const result = await initializeProWorkspace({
      slug: 'atelier-doha',
      foundation: 'structure',
      source: 'curated:structure',
      expectedVersion: null,
      easySnapshotId: '9e6cf0bb-25bf-440b-8152-d91398e87f99',
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'conflict',
      workspace: { foundation: 'structure', draftVersion: 1 },
    });
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('replaces only the exact reviewed version and excludes the active foundation', async () => {
    sqlMock.mockResolvedValueOnce([
      workspaceRow({
        foundation: 'motion',
        draft_source: 'curated:motion',
        draft_version: 2,
      }),
    ]);

    const result = await initializeProWorkspace({
      slug: 'atelier-doha',
      foundation: 'motion',
      source: 'curated:motion',
      expectedVersion: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      workspace: { foundation: 'motion', draftVersion: 2 },
    });
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('update pro_workspaces set');
    expect(sql).toContain('and draft_version =');
    expect(sql).toContain('and foundation <>');
  });
});

describe('Pro workspace draft saves', () => {
  it('returns the current workspace without incrementing an unchanged draft', async () => {
    const source = 'curated:structure';
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([workspaceRow({ draft_source: source })]);

    const result = await saveProWorkspaceDraft({
      slug: 'atelier-doha',
      source,
      expectedVersion: 1,
    });

    expect(result).toMatchObject({ ok: true, workspace: { draftVersion: 1 } });
    expect(sqlMock).toHaveBeenCalledTimes(2);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('draft_source is distinct from');
  });
});

describe('Pro AI preference compare-and-swap', () => {
  it('persists the complete remembered per-model map in one versioned write', async () => {
    const preferences = getDefaultProAiPreferences();
    preferences.selectedModelId = 'moonshotai/kimi-k3';
    preferences.models['openai/gpt-5.4-mini'] = { reasoning: 'high', speed: 'standard' };
    preferences.models['moonshotai/kimi-k3'] = { reasoning: 'high', speed: 'standard' };
    sqlMock.mockResolvedValueOnce([
      workspaceRow({
        ai_preferences: preferences,
        ai_preferences_version: 2,
      }),
    ]);

    const result = await saveProAiPreferences({
      slug: 'atelier-doha',
      preferences,
      expectedPreferencesVersion: 1,
    });

    expect(result).toMatchObject({ ok: true, workspace: { aiPreferencesVersion: 2 } });
    const serialized = sqlMock.mock.calls[0]?.find(
      (value) => typeof value === 'string' && value.includes('moonshotai/kimi-k3'),
    );
    expect(serialized).toContain('gpt-5.4-mini');
    expect(serialized).toContain('moonshotai/kimi-k3');
    expect(String(sqlMock.mock.calls[0]?.[0]?.join(' '))).toContain('and ai_preferences_version =');
  });
});
