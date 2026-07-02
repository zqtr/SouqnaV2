export const SOUQY_STUDIO_PRICE_MULTIPLIER = 3;
export const SOUQY_STUDIO_FANAR_PRICE_MULTIPLIER = 1.5;
export const SOUQY_STUDIO_USD_PER_CREDIT = 0.01;

export const SOUQY_STUDIO_MODEL_IDS = [
  'replicate:flux-2-max',
  'openai:gpt-image-2',
  'openai:gpt-image-1.5',
  'openai:gpt-image-1',
  'openai:gpt-image-1-mini',
] as const;

export type SouqyStudioModelId = (typeof SOUQY_STUDIO_MODEL_IDS)[number];
export type SouqyStudioModelProvider = 'openai' | 'replicate';
export type SouqyStudioChatModelProvider = 'runpod' | 'cranl';
export type SouqyStudioModelQuality = 'standard' | 'high' | 'print';
export type SouqyStudioPricingTier = 'low' | 'medium' | 'high';
export type SouqyStudioCostAspect = 'square' | 'portrait' | 'landscape';

export type SouqyStudioModel = {
  id: SouqyStudioModelId;
  provider: SouqyStudioModelProvider;
  providerModel: string;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  bestFor: string;
  latency: string;
  supportsReferences: boolean;
  pricingNote: string;
};

export type SouqyStudioChatModel = {
  id: 'fanar:runpod-primary' | 'cranl:default';
  provider: SouqyStudioChatModelProvider;
  providerModel: string;
  label: string;
  shortLabel: string;
  supportsStreaming: boolean;
  bestFor: string;
  latency: string;
  pricingNote: string;
};

type OpenAiImagePriceTable = Record<SouqyStudioPricingTier, Record<SouqyStudioCostAspect, number>>;

const OPENAI_IMAGE_PRICES: Record<string, OpenAiImagePriceTable> = {
  'gpt-image-2': {
    low: { square: 0.006, portrait: 0.005, landscape: 0.005 },
    medium: { square: 0.053, portrait: 0.041, landscape: 0.041 },
    high: { square: 0.211, portrait: 0.165, landscape: 0.165 },
  },
  'gpt-image-1.5': {
    low: { square: 0.009, portrait: 0.013, landscape: 0.013 },
    medium: { square: 0.034, portrait: 0.05, landscape: 0.05 },
    high: { square: 0.133, portrait: 0.2, landscape: 0.2 },
  },
  'gpt-image-1': {
    low: { square: 0.011, portrait: 0.016, landscape: 0.016 },
    medium: { square: 0.042, portrait: 0.063, landscape: 0.063 },
    high: { square: 0.167, portrait: 0.25, landscape: 0.25 },
  },
  'gpt-image-1-mini': {
    low: { square: 0.005, portrait: 0.006, landscape: 0.006 },
    medium: { square: 0.011, portrait: 0.015, landscape: 0.015 },
    high: { square: 0.036, portrait: 0.052, landscape: 0.052 },
  },
};

export const SOUQY_STUDIO_MODELS: SouqyStudioModel[] = [
  {
    id: 'replicate:flux-2-max',
    provider: 'replicate',
    providerModel: 'black-forest-labs/flux-2-max',
    label: 'FLUX.2 Max',
    shortLabel: 'Flux Max',
    badge: 'Replicate',
    description: 'High-fidelity commercial image generation through Replicate.',
    bestFor: 'Product ads, posters, packaging, and reference-image polish.',
    latency: 'Medium',
    supportsReferences: true,
    pricingNote: '$0.07 first output MP plus $0.03 per extra MP estimate, then x3 Souqna credits.',
  },
  {
    id: 'openai:gpt-image-2',
    provider: 'openai',
    providerModel: 'gpt-image-2',
    label: 'GPT Image 2',
    shortLabel: 'GPT Image 2',
    badge: 'OpenAI',
    description: 'Latest GPT Image generation model.',
    bestFor: 'Premium campaign visuals and detailed prompt following.',
    latency: 'Slower',
    supportsReferences: false,
    pricingNote: 'Per-image output estimate, then x3 Souqna credits.',
  },
  {
    id: 'openai:gpt-image-1.5',
    provider: 'openai',
    providerModel: 'gpt-image-1.5',
    label: 'GPT Image 1.5',
    shortLabel: 'GPT Image 1.5',
    badge: 'OpenAI',
    description: 'Strong general image model with lower cost than GPT Image 2.',
    bestFor: 'Launch posters, banners, and polished social creative.',
    latency: 'Medium',
    supportsReferences: false,
    pricingNote: 'Per-image output estimate, then x3 Souqna credits.',
  },
  {
    id: 'openai:gpt-image-1',
    provider: 'openai',
    providerModel: 'gpt-image-1',
    label: 'GPT Image 1',
    shortLabel: 'GPT Image 1',
    badge: 'OpenAI',
    description: 'Reliable GPT Image model for image and poster generation.',
    bestFor: 'Text-sensitive posters, clean layouts, and brand visuals.',
    latency: 'Medium',
    supportsReferences: false,
    pricingNote: 'Per-image output estimate, then x3 Souqna credits.',
  },
  {
    id: 'openai:gpt-image-1-mini',
    provider: 'openai',
    providerModel: 'gpt-image-1-mini',
    label: 'GPT Image 1 Mini',
    shortLabel: 'Image Mini',
    badge: 'OpenAI',
    description: 'Lower-cost GPT Image option for drafts and quick concepts.',
    bestFor: 'Fast creative drafts before spending more credits.',
    latency: 'Fast',
    supportsReferences: false,
    pricingNote: 'Per-image output estimate, then x3 Souqna credits.',
  },
];

export const SOUQY_STUDIO_CHAT_MODELS: SouqyStudioChatModel[] = [
  {
    id: 'fanar:runpod-primary',
    provider: 'runpod',
    providerModel: 'QCRI/Fanar-1-9B-Instruct',
    label: 'Fanar 1-9B on RunPod',
    shortLabel: 'Fanar RunPod',
    supportsStreaming: true,
    bestFor: 'Arabic-first Studio chat, GCC copy, and transformation intelligence.',
    latency: 'Low to medium',
    pricingNote: 'Estimated from RunPod token usage, then x1.5 Souqna credits.',
  },
  {
    id: 'cranl:default',
    provider: 'cranl',
    providerModel: 'default',
    label: 'AI runtime fallback',
    shortLabel: 'AI fallback',
    supportsStreaming: false,
    bestFor: 'Fallback chat when Fanar is disabled or unavailable.',
    latency: 'Queued',
    pricingNote: 'Runtime-dependent queue cost.',
  },
];

export type SouqyStudioModelCost = {
  baseUsd: number;
  billableUsd: number;
  credits: number;
  multiplier: number;
  pricingTier: SouqyStudioPricingTier;
  aspect: SouqyStudioCostAspect;
};

export type SouqyStudioChatCost = {
  inputTokens: number;
  outputTokens: number;
  baseUsd: number;
  billableUsd: number;
  credits: number;
  multiplier: number;
};

export function isSouqyStudioModelId(value: unknown): value is SouqyStudioModelId {
  return typeof value === 'string' && SOUQY_STUDIO_MODEL_IDS.includes(value as SouqyStudioModelId);
}

export function getSouqyStudioModel(id?: string | null): SouqyStudioModel {
  if (isSouqyStudioModelId(id)) {
    return SOUQY_STUDIO_MODELS.find((model) => model.id === id) ?? SOUQY_STUDIO_MODELS[0]!;
  }
  return SOUQY_STUDIO_MODELS[0]!;
}

export function studioPricingTierForQuality(
  quality: SouqyStudioModelQuality = 'high',
): SouqyStudioPricingTier {
  if (quality === 'standard') return 'low';
  if (quality === 'print') return 'high';
  return 'medium';
}

export function aspectForDimensions(width: number, height: number): SouqyStudioCostAspect {
  if (Math.abs(width - height) <= Math.max(width, height) * 0.08) return 'square';
  return height > width ? 'portrait' : 'landscape';
}

export function estimateSouqyStudioModelCost(args: {
  modelId?: string | null;
  width: number;
  height: number;
  quality?: SouqyStudioModelQuality;
  count?: number;
}): SouqyStudioModelCost {
  const model = getSouqyStudioModel(args.modelId);
  const count = Math.max(1, Math.floor(args.count ?? 1));
  const aspect = aspectForDimensions(args.width, args.height);
  const pricingTier = studioPricingTierForQuality(args.quality);
  const baseUsd =
    model.provider === 'openai'
      ? (OPENAI_IMAGE_PRICES[model.providerModel]?.[pricingTier]?.[aspect] ?? 0.05) * count
      : estimateReplicateFlux2MaxUsd(args.width, args.height) * count;
  const billableUsd = baseUsd * SOUQY_STUDIO_PRICE_MULTIPLIER;
  return {
    baseUsd: roundCurrency(baseUsd),
    billableUsd: roundCurrency(billableUsd),
    credits: Math.max(1, Math.ceil(billableUsd / SOUQY_STUDIO_USD_PER_CREDIT)),
    multiplier: SOUQY_STUDIO_PRICE_MULTIPLIER,
    pricingTier,
    aspect,
  };
}

export function estimateFanarChatCost(args: {
  inputText: string;
  outputText?: string;
  usdPer1kTokens?: number;
}): SouqyStudioChatCost {
  const inputTokens = estimateTextTokens(args.inputText);
  const outputTokens = estimateTextTokens(args.outputText ?? '');
  const usdPer1kTokens = args.usdPer1kTokens ?? 0.0002;
  const baseUsd = ((inputTokens + outputTokens) / 1000) * usdPer1kTokens;
  const billableUsd = baseUsd * SOUQY_STUDIO_FANAR_PRICE_MULTIPLIER;
  return {
    inputTokens,
    outputTokens,
    baseUsd: roundCurrency(baseUsd),
    billableUsd: roundCurrency(billableUsd),
    credits: Math.max(1, Math.ceil(billableUsd / SOUQY_STUDIO_USD_PER_CREDIT)),
    multiplier: SOUQY_STUDIO_FANAR_PRICE_MULTIPLIER,
  };
}

export function formatSouqyStudioUsd(value: number): string {
  const roundedMillis = Math.round(value * 1000);
  const decimals = value < 0.1 && roundedMillis % 10 !== 0 ? 3 : 2;
  return `$${value.toFixed(decimals)}`;
}

function estimateReplicateFlux2MaxUsd(width: number, height: number): number {
  const megapixels = Math.max(1, Math.ceil((width * height) / 1_000_000));
  return 0.07 + Math.max(0, megapixels - 1) * 0.03;
}

function roundCurrency(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function estimateTextTokens(value: string): number {
  const normalized = value.trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}
