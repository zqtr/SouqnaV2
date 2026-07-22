import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProFoundationPreview } from '@/components/account/pro/ProFoundationPreview';
import { getCuratedFoundationFiles, getCuratedFoundationSource } from '@/lib/pro/foundations';
import {
  isProPublishReady,
  isProTemplateId,
  getProSessionEventLabel,
  nextProJobStatus,
  type ProWorkspaceSnapshot,
} from '@/lib/proMode';
import { planAtLeast } from '@/lib/plans';
import { getDefaultProAiPreferences } from '@/lib/pro/modelCatalog';
import { hashProSource } from '@/lib/proState';
import { parseSouqySource, serializeSouqySource } from '@/lib/souqy/source';
import { extractSouqyThemeOverrides, validateSouqyOutput } from '@/lib/souqy/validate';
import { recoverProJourneyCheckpoint } from '@/lib/pro/journeyRecovery';

function workspace(overrides: Partial<ProWorkspaceSnapshot> = {}): ProWorkspaceSnapshot {
  return {
    storefrontSlug: 'test-store',
    foundation: 'structure',
    preferredMode: 'pro',
    draftSource: 'source',
    draftSourceHash: 'same-hash',
    draftVersion: 3,
    builtRevision: 'revision-3',
    builtBlobUrl: 'https://example.test/revision-3.mjs',
    builtSource: 'source',
    builtSourceHash: 'same-hash',
    builtSourceVersion: 3,
    buildStatus: 'succeeded',
    lastErrorCode: null,
    lastErrorMessage: null,
    aiPreferences: getDefaultProAiPreferences(),
    aiPreferencesVersion: 1,
    brandIntent: null,
    recommendationVersion: 0,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('Souqna Pro contracts', () => {
  it('gates the internal Pro surface at Pro+ and Max+', () => {
    expect(planAtLeast('free', 'pro')).toBe(false);
    expect(planAtLeast('starter', 'pro')).toBe(false);
    expect(planAtLeast('pro', 'pro')).toBe(true);
    expect(planAtLeast('atelier', 'pro')).toBe(true);
  });

  it('recognizes only production foundation IDs', () => {
    expect(isProTemplateId('structure')).toBe(true);
    expect(isProTemplateId('motion')).toBe(true);
    expect(isProTemplateId('bespoke')).toBe(true);
    expect(isProTemplateId('saas')).toBe(false);
  });

  it('routes queued jobs into generation or validation without ambiguity', () => {
    expect(nextProJobStatus('foundation_build')).toBe('validating');
    expect(nextProJobStatus('manual_build')).toBe('validating');
    expect(nextProJobStatus('bespoke_generate')).toBe('generating');
    expect(nextProJobStatus('ai_edit')).toBe('generating');
  });

  it('maps stored session events into localized timeline copy', () => {
    const response = {
      type: 'souqy_response' as const,
      content: 'Old English system copy.',
      metadata: { kind: 'ai_edit' },
    };
    expect(getProSessionEventLabel(response, 'en')).toContain('private draft');
    expect(getProSessionEventLabel(response, 'ar')).toContain('المسودة الخاصة');
    expect(
      getProSessionEventLabel(
        { type: 'user_prompt', content: 'عدّل الواجهة', metadata: {} },
        'ar',
      ),
    ).toBe('عدّل الواجهة');
  });

  it('recovers interrupted Pro conversion checkpoints from server-owned job state', () => {
    const converting = { stage: 'converting', failureKind: null, message: null } as const;
    expect(
      recoverProJourneyCheckpoint({
        checkpoint: converting,
        jobStatus: null,
        hasWorkspace: false,
        hasReviewCheckpoint: true,
      }),
    ).toEqual({ stage: 'review', failureKind: null, message: null });
    expect(
      recoverProJourneyCheckpoint({
        checkpoint: converting,
        jobStatus: 'failed',
        jobErrorMessage: 'Preview build failed.',
        hasWorkspace: true,
        hasReviewCheckpoint: true,
      }),
    ).toEqual({
      stage: 'failed',
      failureKind: 'job',
      message: 'Preview build failed.',
    });
    expect(
      recoverProJourneyCheckpoint({
        checkpoint: converting,
        jobStatus: 'succeeded',
        hasWorkspace: true,
        hasReviewCheckpoint: true,
      }),
    ).toEqual({ stage: 'ready', failureKind: null, message: null });
  });

  it('uses stable SHA-256 source hashes for compare-and-swap builds', () => {
    expect(hashProSource('same source')).toBe(hashProSource('same source'));
    expect(hashProSource('same source')).not.toBe(hashProSource('new source'));
    expect(hashProSource('same source')).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('ships valid, round-trippable Structure and Motion source', () => {
    for (const foundation of ['structure', 'motion'] as const) {
      const files = getCuratedFoundationFiles(foundation);
      const source = getCuratedFoundationSource(foundation);
      expect(files).not.toBeNull();
      expect(source).not.toBeNull();
      expect(validateSouqyOutput(files!)).toEqual({ ok: true });
      const parsed = parseSouqySource(source!);
      expect(serializeSouqySource(parsed!)).toBe(source);
      expect(parsed?.['index.tsx'].trim()).toBe(files!['index.tsx'].trim());
      expect(parsed?.['theme.ts'].trim()).toBe(files!['theme.ts'].trim());
      expect(parsed?.['styles.css']?.trim()).toBe(files!['styles.css']?.trim());
      expect(extractSouqyThemeOverrides(files!['theme.ts'])).not.toBeNull();
    }
    expect(getCuratedFoundationSource('bespoke')).toBeNull();
  });

  it('publishes only an exact successful build of the current source version', () => {
    expect(isProPublishReady(workspace())).toBe(true);
    expect(isProPublishReady(workspace({ draftVersion: 4 }))).toBe(false);
    expect(isProPublishReady(workspace({ draftSourceHash: 'new-hash' }))).toBe(false);
    expect(isProPublishReady(workspace({ builtSource: null }))).toBe(false);
    expect(isProPublishReady(workspace({ buildStatus: 'failed' }))).toBe(false);
  });

  it('fails closed when theme source is dynamic or invalid', () => {
    expect(extractSouqyThemeOverrides(`export const theme = { headingWeight: 700 };`)).toBeNull();
    expect(
      extractSouqyThemeOverrides(`const palette = 'sand_gold'; export const theme = { palette };`),
    ).toBeNull();
  });

  it('renders responsive bilingual picker previews without production data', () => {
    const structure = renderToStaticMarkup(
      createElement(ProFoundationPreview, {
        foundation: 'structure',
        businessName: 'Atelier الدوحة',
        locale: 'ar',
      }),
    );
    const motion = renderToStaticMarkup(
      createElement(ProFoundationPreview, {
        foundation: 'motion',
        businessName: 'Souqna Test',
        locale: 'en',
      }),
    );
    expect(structure).toContain('dir="rtl"');
    expect(structure).toContain('Atelier الدوحة');
    expect(motion).toContain('prefers-reduced-motion');
    expect(motion).toContain('Products moving at your brand&#x27;s rhythm.');
  });
});
