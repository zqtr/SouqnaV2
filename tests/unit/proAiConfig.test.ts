import { describe, expect, it } from 'vitest';
import {
  bespokeProAiConfiguration,
  getAllowedProAiModelIds,
  resolveProAiConfiguration,
  toProAiProviderOptions,
} from '@/lib/pro/aiConfig';
import { PRO_AI_CATALOG_VERSION } from '@/lib/pro/modelCatalog';

describe('Souqna Pro AI server configuration', () => {
  it('fails closed when an explicit allowlist contains no approved IDs', () => {
    expect(getAllowedProAiModelIds('vendor/not-approved')).toEqual([]);
  });

  it('resolves the configuration fields from an authenticated action payload', () => {
    const result = resolveProAiConfiguration({
      slug: 'atelier-doha',
      expectedPreferencesVersion: 3,
      modelId: 'alibaba/qwen3.7-plus',
      reasoning: 'medium',
      speed: 'standard',
      catalogVersion: PRO_AI_CATALOG_VERSION,
    });
    expect(result).toMatchObject({ ok: true, configuration: { creditCost: 1 } });
  });

  it('rejects stale catalogs, disabled models, and unsupported controls', () => {
    expect(
      resolveProAiConfiguration({
        modelId: 'alibaba/qwen3.7-plus',
        reasoning: 'medium',
        speed: 'standard',
        catalogVersion: 'old',
      }),
    ).toEqual({ ok: false, error: 'catalog_outdated' });
    expect(
      resolveProAiConfiguration(
        {
          modelId: 'openai/gpt-5.4',
          reasoning: 'high',
          speed: 'standard',
          catalogVersion: PRO_AI_CATALOG_VERSION,
        },
        ['alibaba/qwen3.7-plus'],
      ),
    ).toEqual({ ok: false, error: 'model_not_allowed' });
    expect(
      resolveProAiConfiguration({
        modelId: 'openai/gpt-5.4-mini',
        reasoning: 'medium',
        speed: 'fast',
        catalogVersion: PRO_AI_CATALOG_VERSION,
      }),
    ).toEqual({ ok: false, error: 'speed_not_supported' });
    expect(
      resolveProAiConfiguration({
        modelId: 'moonshotai/kimi-k2.5',
        reasoning: 'high',
        speed: 'standard',
        catalogVersion: PRO_AI_CATALOG_VERSION,
      }),
    ).toEqual({ ok: false, error: 'reasoning_not_supported' });
  });

  it('maps only documented provider-specific reasoning options', () => {
    const base = { clerkUserId: 'user_test', tags: ['feature:souqy', 'surface:pro'] };
    const openai = resolveProAiConfiguration({
      modelId: 'openai/gpt-5.4-mini',
      reasoning: 'low',
      speed: 'standard',
      catalogVersion: PRO_AI_CATALOG_VERSION,
    });
    const anthropic = resolveProAiConfiguration({
      modelId: 'anthropic/claude-sonnet-4.6',
      reasoning: 'high',
      speed: 'standard',
      catalogVersion: PRO_AI_CATALOG_VERSION,
    });
    const google = resolveProAiConfiguration({
      modelId: 'google/gemini-3.5-flash',
      reasoning: 'medium',
      speed: 'standard',
      catalogVersion: PRO_AI_CATALOG_VERSION,
    });
    const kimi = resolveProAiConfiguration({
      modelId: 'moonshotai/kimi-k2.7-code',
      reasoning: 'medium',
      speed: 'standard',
      catalogVersion: PRO_AI_CATALOG_VERSION,
    });
    expect(
      openai.ok && toProAiProviderOptions({ ...base, configuration: openai.configuration }),
    ).toMatchObject({
      openai: { reasoningEffort: 'low' },
    });
    expect(
      anthropic.ok && toProAiProviderOptions({ ...base, configuration: anthropic.configuration }),
    ).toMatchObject({
      anthropic: { thinking: { type: 'adaptive' }, effort: 'high' },
    });
    expect(
      google.ok && toProAiProviderOptions({ ...base, configuration: google.configuration }),
    ).toMatchObject({
      google: { thinkingConfig: { thinkingLevel: 'medium' } },
    });
    expect(
      kimi.ok && toProAiProviderOptions({ ...base, configuration: kimi.configuration }),
    ).toEqual({
      gateway: { user: 'user_test', tags: ['feature:souqy', 'surface:pro'] },
    });
  });

  it('fixes Bespoke to Qwen 3.7 Plus medium for one credit', () => {
    expect(bespokeProAiConfiguration()).toEqual({
      modelId: 'alibaba/qwen3.7-plus',
      reasoning: 'medium',
      speed: 'standard',
      catalogVersion: PRO_AI_CATALOG_VERSION,
      creditCost: 1,
    });
  });
});
