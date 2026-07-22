import 'server-only';

import type { JSONValue } from 'ai';
import { z } from 'zod';
import { env } from '@/lib/env';
import {
  PRO_AI_CATALOG_VERSION,
  PRO_AI_MODEL_IDS,
  calculateProAiCreditCost,
  getProAiModel,
  isProAiModelId,
  type ProAiConfiguration,
  type ProAiModelId,
  type ProReasoningLevel,
  type ProSpeedMode,
} from '@/lib/pro/modelCatalog';

export const ProAiConfigurationInputSchema = z
  .object({
    modelId: z.enum(PRO_AI_MODEL_IDS),
    reasoning: z.enum(['low', 'medium', 'high']),
    speed: z.enum(['standard', 'fast']),
    catalogVersion: z.literal(PRO_AI_CATALOG_VERSION),
  })
  .strict();

export type ProAiConfigurationInput = z.infer<typeof ProAiConfigurationInputSchema>;

export type ProAiConfigurationError =
  | 'invalid_configuration'
  | 'catalog_outdated'
  | 'model_not_allowed'
  | 'reasoning_not_supported'
  | 'speed_not_supported';

export type ResolveProAiConfigurationResult =
  | { ok: true; configuration: ProAiConfiguration }
  | { ok: false; error: ProAiConfigurationError };

export function getAllowedProAiModelIds(
  configured = env.SOUQNA_PRO_MODEL_ALLOWLIST,
): readonly ProAiModelId[] {
  const requested = configured
    .split(',')
    .map((value) => value.trim())
    .filter(isProAiModelId);
  return Array.from(new Set(requested));
}

export function resolveProAiConfiguration(
  input: unknown,
  allowlist?: readonly ProAiModelId[],
): ResolveProAiConfigurationResult {
  if (
    input &&
    typeof input === 'object' &&
    'catalogVersion' in input &&
    (input as { catalogVersion?: unknown }).catalogVersion !== PRO_AI_CATALOG_VERSION
  ) {
    return { ok: false, error: 'catalog_outdated' };
  }
  const candidate =
    input && typeof input === 'object'
      ? {
          modelId: (input as { modelId?: unknown }).modelId,
          reasoning: (input as { reasoning?: unknown }).reasoning,
          speed: (input as { speed?: unknown }).speed,
          catalogVersion: (input as { catalogVersion?: unknown }).catalogVersion,
        }
      : input;
  const parsed = ProAiConfigurationInputSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, error: 'invalid_configuration' };
  const allowed = allowlist ?? getAllowedProAiModelIds();
  if (!allowed.includes(parsed.data.modelId)) return { ok: false, error: 'model_not_allowed' };
  const model = getProAiModel(parsed.data.modelId);
  if (!model.hasReasoningConfiguration && parsed.data.reasoning !== model.defaultReasoning) {
    return { ok: false, error: 'reasoning_not_supported' };
  }
  if (parsed.data.speed === 'fast' && !model.hasSpeedConfiguration) {
    return { ok: false, error: 'speed_not_supported' };
  }
  return {
    ok: true,
    configuration: {
      ...parsed.data,
      creditCost: calculateProAiCreditCost(parsed.data),
    },
  };
}

export function bespokeProAiConfiguration(): ProAiConfiguration {
  return {
    modelId: 'alibaba/qwen3.7-plus',
    reasoning: 'medium',
    speed: 'standard',
    catalogVersion: PRO_AI_CATALOG_VERSION,
    creditCost: 1,
  };
}

export function toProAiProviderOptions(args: {
  configuration: ProAiConfiguration;
  clerkUserId: string;
  tags: string[];
}): Record<string, Record<string, JSONValue | undefined>> {
  const gateway = { user: args.clerkUserId, tags: args.tags };
  const { modelId, reasoning } = args.configuration;
  if (modelId.startsWith('openai/')) {
    return { gateway, openai: { reasoningEffort: reasoning } };
  }
  if (modelId.startsWith('anthropic/')) {
    return {
      gateway,
      anthropic: {
        thinking: { type: 'adaptive' },
        effort: reasoning,
      },
    };
  }
  if (modelId.startsWith('google/')) {
    return {
      gateway,
      google: { thinkingConfig: { thinkingLevel: reasoning } },
    };
  }
  return { gateway };
}

export function isResolvedProAiConfiguration(value: unknown): value is ProAiConfiguration {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProAiConfiguration>;
  if (!isProAiModelId(candidate.modelId)) return false;
  const resolved = resolveProAiConfiguration({
    modelId: candidate.modelId,
    reasoning: candidate.reasoning,
    speed: candidate.speed,
    catalogVersion: candidate.catalogVersion,
  });
  return resolved.ok && resolved.configuration.creditCost === candidate.creditCost;
}

export function configurationFromJobColumns(value: {
  modelId: string | null;
  reasoning: string | null;
  speed: string | null;
  catalogVersion: string | null;
  creditCost: number;
}): ProAiConfiguration | null {
  if (!isProAiModelId(value.modelId)) return null;
  if (!isReasoning(value.reasoning) || !isSpeed(value.speed)) return null;
  if (!value.catalogVersion) return null;
  if (value.creditCost !== 1 && value.creditCost !== 2 && value.creditCost !== 3) return null;
  return {
    modelId: value.modelId,
    reasoning: value.reasoning,
    speed: value.speed,
    catalogVersion: value.catalogVersion,
    creditCost: value.creditCost,
  };
}

function isReasoning(value: unknown): value is ProReasoningLevel {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isSpeed(value: unknown): value is ProSpeedMode {
  return value === 'standard' || value === 'fast';
}
