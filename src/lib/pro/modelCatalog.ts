/** Client-safe, versioned model catalog for Souqna Pro AI edits. */
export const PRO_AI_CATALOG_VERSION = '2026-07-21' as const;

export const PRO_AI_MODEL_IDS = [
  'alibaba/qwen3.7-plus',
  'deepseek/deepseek-v4-pro',
  'moonshotai/kimi-k2.5',
  'moonshotai/kimi-k2.7-code',
  'openai/gpt-5.4-mini',
  'google/gemini-3.5-flash',
  'anthropic/claude-sonnet-4.6',
  'openai/gpt-5.4',
  'moonshotai/kimi-k3',
] as const;

export type ProAiModelId = (typeof PRO_AI_MODEL_IDS)[number];
export type ProReasoningLevel = 'low' | 'medium' | 'high';
export type ProSpeedMode = 'standard' | 'fast';
export type ProAiCatalogTier = 'value' | 'legend';
export type ProAiProvider =
  | 'Alibaba'
  | 'Anthropic'
  | 'DeepSeek'
  | 'Google'
  | 'Moonshot AI'
  | 'OpenAI';

export type ProAiConfiguration = {
  modelId: ProAiModelId;
  reasoning: ProReasoningLevel;
  speed: ProSpeedMode;
  catalogVersion: string;
  creditCost: 1 | 2 | 3;
};

export type ProAiModelPreference = Pick<ProAiConfiguration, 'reasoning' | 'speed'>;

export type ProAiPreferences = {
  selectedModelId: ProAiModelId;
  catalogVersion: string;
  models: Partial<Record<ProAiModelId, ProAiModelPreference>>;
};

export type ProAiRawModelData = {
  profile: string;
  verifiedAt: typeof PRO_AI_CATALOG_VERSION;
  sourceUrl: string;
  codingScore: number;
  designScore: number;
  contextWindowTokens: number;
  cacheHitPricePerMillion: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
};

export type ProAiNormalizedMetrics = {
  coding: number;
  design: number;
  context: number;
  cost: number;
};

export type ProAiModel = {
  id: ProAiModelId;
  label: string;
  provider: ProAiProvider;
  tier: ProAiCatalogTier;
  description: string;
  contextWindow: string;
  inputPrice: string;
  outputPrice: string;
  baseCreditCost: 1 | 2 | 3;
  defaultReasoning: ProReasoningLevel;
  hasReasoningConfiguration: boolean;
  hasSpeedConfiguration: boolean;
  supportsTemperature: boolean;
  raw: ProAiRawModelData;
  metrics: ProAiNormalizedMetrics;
};

type CatalogSeed = Omit<ProAiModel, 'metrics'>;

const GATEWAY_MODELS_URL = 'https://vercel.com/ai-gateway/models';

const RAW_MODELS: readonly CatalogSeed[] = [
  {
    id: 'alibaba/qwen3.7-plus',
    label: 'Qwen 3.7 Plus',
    provider: 'Alibaba',
    tier: 'value',
    description: 'Best-value default for full-stack storefront coding, visual input, and tool use.',
    contextWindow: '1M tokens',
    inputPrice: '$0.40 / 1M tokens',
    outputPrice: '$1.60 / 1M tokens',
    baseCreditCost: 1,
    defaultReasoning: 'medium',
    hasReasoningConfiguration: false,
    hasSpeedConfiguration: false,
    supportsTemperature: true,
    raw: {
      profile: 'Full-stack coding, tool use, productivity workflows, and vision-language input.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 9,
      designScore: 9,
      contextWindowTokens: 1_000_000,
      cacheHitPricePerMillion: 0.08,
      inputPricePerMillion: 0.4,
      outputPricePerMillion: 1.6,
    },
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    tier: 'value',
    description: 'Extremely economical long-context reasoning for implementation and code repair.',
    contextWindow: '1M tokens',
    inputPrice: '$0.435 / 1M tokens',
    outputPrice: '$0.87 / 1M tokens',
    baseCreditCost: 1,
    defaultReasoning: 'medium',
    hasReasoningConfiguration: false,
    hasSpeedConfiguration: false,
    supportsTemperature: true,
    raw: {
      profile: 'Long-context reasoning with highly compressed attention and low token cost.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 9,
      designScore: 6,
      contextWindowTokens: 1_000_000,
      cacheHitPricePerMillion: 0.0036,
      inputPricePerMillion: 0.435,
      outputPricePerMillion: 0.87,
    },
  },
  {
    id: 'moonshotai/kimi-k2.5',
    label: 'Kimi K2.5',
    provider: 'Moonshot AI',
    tier: 'value',
    description: 'Low-cost multimodal designer for screenshot-aware storefront iteration.',
    contextWindow: '262K tokens',
    inputPrice: '$0.60 / 1M tokens',
    outputPrice: '$3.00 / 1M tokens',
    baseCreditCost: 1,
    defaultReasoning: 'medium',
    hasReasoningConfiguration: false,
    hasSpeedConfiguration: false,
    supportsTemperature: true,
    raw: {
      profile: 'Native multimodal input with dialogue, agent, thinking, and non-thinking modes.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 8,
      designScore: 9,
      contextWindowTokens: 262_114,
      cacheHitPricePerMillion: 0.1,
      inputPricePerMillion: 0.6,
      outputPricePerMillion: 3,
    },
  },
  {
    id: 'moonshotai/kimi-k2.7-code',
    label: 'Kimi K2.7 Code',
    provider: 'Moonshot AI',
    tier: 'value',
    description: 'Coding specialist for long-horizon implementation, refactors, and agent work.',
    contextWindow: '256K tokens',
    inputPrice: '$0.95 / 1M tokens',
    outputPrice: '$4.00 / 1M tokens',
    baseCreditCost: 1,
    defaultReasoning: 'medium',
    hasReasoningConfiguration: false,
    hasSpeedConfiguration: false,
    supportsTemperature: true,
    raw: {
      profile: 'Improved coding agents, instruction following, and reasoning efficiency.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 10,
      designScore: 8,
      contextWindowTokens: 256_000,
      cacheHitPricePerMillion: 0.19,
      inputPricePerMillion: 0.95,
      outputPricePerMillion: 4,
    },
  },
  {
    id: 'openai/gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    provider: 'OpenAI',
    tier: 'value',
    description: 'Efficient OpenAI model for dependable, high-volume storefront edits.',
    contextWindow: '400K tokens',
    inputPrice: '$0.75 / 1M tokens',
    outputPrice: '$4.50 / 1M tokens',
    baseCreditCost: 1,
    defaultReasoning: 'medium',
    hasReasoningConfiguration: true,
    hasSpeedConfiguration: false,
    supportsTemperature: true,
    raw: {
      profile: 'A faster high-volume version of GPT-5.4 for iterative production work.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 9,
      designScore: 8,
      contextWindowTokens: 400_000,
      cacheHitPricePerMillion: 0.075,
      inputPricePerMillion: 0.75,
      outputPricePerMillion: 4.5,
    },
  },
  {
    id: 'google/gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    provider: 'Google',
    tier: 'legend',
    description: 'Parallel agentic coding and fast, high-quality storefront transformations.',
    contextWindow: '1M tokens',
    inputPrice: '$1.50 / 1M tokens',
    outputPrice: '$9.00 / 1M tokens',
    baseCreditCost: 2,
    defaultReasoning: 'medium',
    hasReasoningConfiguration: true,
    hasSpeedConfiguration: false,
    supportsTemperature: true,
    raw: {
      profile: 'Coding proficiency and parallel agentic execution with medium thinking by default.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 10,
      designScore: 9,
      contextWindowTokens: 1_000_000,
      cacheHitPricePerMillion: 0.15,
      inputPricePerMillion: 1.5,
      outputPricePerMillion: 9,
    },
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    tier: 'legend',
    description: 'Elite frontend judgment, complex codebase navigation, and end-to-end web QA.',
    contextWindow: '1M tokens',
    inputPrice: '$3.00 / 1M tokens',
    outputPrice: '$15.00 / 1M tokens',
    baseCreditCost: 2,
    defaultReasoning: 'high',
    hasReasoningConfiguration: true,
    hasSpeedConfiguration: false,
    supportsTemperature: true,
    raw: {
      profile: 'Frontier coding, iterative development, project management, and computer-use QA.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 10,
      designScore: 10,
      contextWindowTokens: 1_000_000,
      cacheHitPricePerMillion: 0.3,
      inputPricePerMillion: 3,
      outputPricePerMillion: 15,
    },
  },
  {
    id: 'openai/gpt-5.4',
    label: 'GPT-5.4',
    provider: 'OpenAI',
    tier: 'legend',
    description:
      'OpenAI flagship for difficult architecture, agentic coding, and precise delivery.',
    contextWindow: '1.05M tokens',
    inputPrice: '$2.50 / 1M tokens',
    outputPrice: '$15.00 / 1M tokens',
    baseCreditCost: 3,
    defaultReasoning: 'high',
    hasReasoningConfiguration: true,
    hasSpeedConfiguration: false,
    supportsTemperature: false,
    raw: {
      profile: 'OpenAI flagship for general-purpose reasoning and agentic work.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 10,
      designScore: 9,
      contextWindowTokens: 1_050_000,
      cacheHitPricePerMillion: 0.25,
      inputPricePerMillion: 2.5,
      outputPricePerMillion: 15,
    },
  },
  {
    id: 'moonshotai/kimi-k3',
    label: 'Kimi K3',
    provider: 'Moonshot AI',
    tier: 'legend',
    description: 'Moonshot flagship for long-horizon coding and complete website knowledge work.',
    contextWindow: '1M tokens',
    inputPrice: '$3.00 / 1M tokens',
    outputPrice: '$15.00 / 1M tokens',
    baseCreditCost: 3,
    defaultReasoning: 'high',
    hasReasoningConfiguration: false,
    hasSpeedConfiguration: false,
    supportsTemperature: false,
    raw: {
      profile: 'Flagship long-horizon coding and end-to-end knowledge work.',
      verifiedAt: PRO_AI_CATALOG_VERSION,
      sourceUrl: GATEWAY_MODELS_URL,
      codingScore: 10,
      designScore: 10,
      contextWindowTokens: 1_000_000,
      cacheHitPricePerMillion: 0.3,
      inputPricePerMillion: 3,
      outputPricePerMillion: 15,
    },
  },
] as const;

function clampMetric(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function blendedProAiCost(raw: ProAiRawModelData): number {
  return (
    (raw.cacheHitPricePerMillion * 7 + raw.inputPricePerMillion * 2 + raw.outputPricePerMillion) /
    10
  );
}

const MAX_CONTEXT = Math.max(...RAW_MODELS.map((model) => model.raw.contextWindowTokens));
const COSTS = RAW_MODELS.map((model) => blendedProAiCost(model.raw));
const MIN_COST = Math.min(...COSTS);
const MAX_COST = Math.max(...COSTS);

export function normalizeProAiMetrics(raw: ProAiRawModelData): ProAiNormalizedMetrics {
  const cost = blendedProAiCost(raw);
  const inverseCost =
    MIN_COST === MAX_COST ? 10 : 1 + (9 * (MAX_COST - cost)) / (MAX_COST - MIN_COST);
  return {
    coding: clampMetric(raw.codingScore),
    design: clampMetric(raw.designScore),
    context: clampMetric((10 * raw.contextWindowTokens) / MAX_CONTEXT),
    cost: clampMetric(inverseCost),
  };
}

export const PRO_AI_MODELS: readonly ProAiModel[] = RAW_MODELS.map((model) => ({
  ...model,
  metrics: normalizeProAiMetrics(model.raw),
}));

export function isProAiModelId(value: unknown): value is ProAiModelId {
  return typeof value === 'string' && (PRO_AI_MODEL_IDS as readonly string[]).includes(value);
}

export function isProAiPreferences(value: unknown): value is ProAiPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<ProAiPreferences>;
  if (
    candidate.catalogVersion !== PRO_AI_CATALOG_VERSION ||
    !isProAiModelId(candidate.selectedModelId) ||
    !candidate.models ||
    typeof candidate.models !== 'object' ||
    Array.isArray(candidate.models)
  ) {
    return false;
  }
  for (const [modelId, rawPreference] of Object.entries(candidate.models)) {
    if (!isProAiModelId(modelId) || !rawPreference || typeof rawPreference !== 'object') {
      return false;
    }
    const model = getProAiModel(modelId);
    const preference = rawPreference as Partial<ProAiModelPreference>;
    if (
      (preference.reasoning !== 'low' &&
        preference.reasoning !== 'medium' &&
        preference.reasoning !== 'high') ||
      (!model.hasReasoningConfiguration && preference.reasoning !== model.defaultReasoning) ||
      (preference.speed !== 'standard' && preference.speed !== 'fast') ||
      (preference.speed === 'fast' && !model.hasSpeedConfiguration)
    ) {
      return false;
    }
  }
  return Boolean(candidate.models[candidate.selectedModelId]);
}

export function getProAiModel(modelId: ProAiModelId): ProAiModel {
  const model = PRO_AI_MODELS.find((candidate) => candidate.id === modelId);
  if (!model) throw new Error('Unknown Souqna Pro AI model');
  return model;
}

export function calculateProAiCreditCost(args: {
  modelId: ProAiModelId;
  reasoning: ProReasoningLevel;
  speed: ProSpeedMode;
}): 1 | 2 | 3 {
  const model = getProAiModel(args.modelId);
  const highReasoningSurcharge =
    model.hasReasoningConfiguration &&
    args.reasoning === 'high' &&
    model.defaultReasoning !== 'high'
      ? 1
      : 0;
  const fastSurcharge = model.hasSpeedConfiguration && args.speed === 'fast' ? 1 : 0;
  return Math.min(3, model.baseCreditCost + highReasoningSurcharge + fastSurcharge) as 1 | 2 | 3;
}

export function getDefaultProAiPreferences(): ProAiPreferences {
  const selectedModelId: ProAiModelId = 'alibaba/qwen3.7-plus';
  return {
    selectedModelId,
    catalogVersion: PRO_AI_CATALOG_VERSION,
    models: Object.fromEntries(
      PRO_AI_MODELS.map((model) => [
        model.id,
        { reasoning: model.defaultReasoning, speed: 'standard' as const },
      ]),
    ) as Record<ProAiModelId, ProAiModelPreference>,
  };
}

export function getProAiAdjustedMetrics(
  modelId: ProAiModelId,
  reasoning: ProReasoningLevel,
  speed: ProSpeedMode,
): ProAiNormalizedMetrics {
  void reasoning;
  void speed;
  return getProAiModel(modelId).metrics;
}
