import { describe, expect, it } from 'vitest';
import {
  PRO_AI_CATALOG_VERSION,
  PRO_AI_MODELS,
  calculateProAiCreditCost,
  getDefaultProAiPreferences,
  getProAiAdjustedMetrics,
  getProAiModel,
  isProAiPreferences,
} from '@/lib/pro/modelCatalog';

describe('Souqna Pro AI model catalog', () => {
  it('freezes the approved value and legend Gateway IDs in the dated catalog', () => {
    expect(PRO_AI_CATALOG_VERSION).toBe('2026-07-21');
    expect(PRO_AI_MODELS.map((model) => model.id)).toEqual([
      'alibaba/qwen3.7-plus',
      'deepseek/deepseek-v4-pro',
      'moonshotai/kimi-k2.5',
      'moonshotai/kimi-k2.7-code',
      'openai/gpt-5.4-mini',
      'google/gemini-3.5-flash',
      'anthropic/claude-sonnet-4.6',
      'openai/gpt-5.4',
      'moonshotai/kimi-k3',
    ]);
    expect(PRO_AI_MODELS.filter((model) => model.tier === 'value')).toHaveLength(5);
    expect(PRO_AI_MODELS.filter((model) => model.tier === 'legend')).toHaveLength(4);
    expect(
      PRO_AI_MODELS.every(
        (model) => model.raw.sourceUrl === 'https://vercel.com/ai-gateway/models',
      ),
    ).toBe(true);
  });

  it('compares coding, web-design, context, and cost fit without fake benchmark deltas', () => {
    expect(getProAiModel('moonshotai/kimi-k2.7-code').metrics.coding).toBe(10);
    expect(getProAiModel('anthropic/claude-sonnet-4.6').metrics.design).toBe(10);
    expect(getProAiModel('deepseek/deepseek-v4-pro').metrics.cost).toBe(10);
    expect(getProAiModel('openai/gpt-5.4').metrics.context).toBe(10);
    expect(getProAiAdjustedMetrics('openai/gpt-5.4', 'high', 'standard')).toEqual(
      getProAiModel('openai/gpt-5.4').metrics,
    );
  });

  it('keeps the verified Gateway price snapshot attached to each model', () => {
    expect(
      Object.fromEntries(
        PRO_AI_MODELS.map((model) => [
          model.id,
          [model.raw.inputPricePerMillion, model.raw.outputPricePerMillion],
        ]),
      ),
    ).toEqual({
      'alibaba/qwen3.7-plus': [0.4, 1.6],
      'deepseek/deepseek-v4-pro': [0.435, 0.87],
      'moonshotai/kimi-k2.5': [0.6, 3],
      'moonshotai/kimi-k2.7-code': [0.95, 4],
      'openai/gpt-5.4-mini': [0.75, 4.5],
      'google/gemini-3.5-flash': [1.5, 9],
      'anthropic/claude-sonnet-4.6': [3, 15],
      'openai/gpt-5.4': [2.5, 15],
      'moonshotai/kimi-k3': [3, 15],
    });
  });

  it('caps weighted credit costs at three', () => {
    expect(
      calculateProAiCreditCost({
        modelId: 'alibaba/qwen3.7-plus',
        reasoning: 'medium',
        speed: 'standard',
      }),
    ).toBe(1);
    expect(
      calculateProAiCreditCost({
        modelId: 'google/gemini-3.5-flash',
        reasoning: 'high',
        speed: 'standard',
      }),
    ).toBe(3);
    expect(
      calculateProAiCreditCost({
        modelId: 'anthropic/claude-sonnet-4.6',
        reasoning: 'high',
        speed: 'standard',
      }),
    ).toBe(2);
    expect(
      calculateProAiCreditCost({
        modelId: 'moonshotai/kimi-k3',
        reasoning: 'high',
        speed: 'standard',
      }),
    ).toBe(3);
  });

  it('starts with a complete per-model preference map', () => {
    const preferences = getDefaultProAiPreferences();
    expect(preferences.selectedModelId).toBe('alibaba/qwen3.7-plus');
    expect(Object.keys(preferences.models)).toHaveLength(9);
    expect(preferences.models['moonshotai/kimi-k3']).toEqual({
      reasoning: 'high',
      speed: 'standard',
    });
    expect(preferences.models['openai/gpt-5.4']).toEqual({
      reasoning: 'high',
      speed: 'standard',
    });
    expect(isProAiPreferences(preferences)).toBe(true);
    expect(
      isProAiPreferences({
        ...preferences,
        models: {
          ...preferences.models,
          'moonshotai/kimi-k2.5': { reasoning: 'high', speed: 'standard' },
        },
      }),
    ).toBe(false);
  });
});
