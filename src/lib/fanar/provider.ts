import 'server-only';
import { env } from '@/lib/env';

export const FANAR_ALLOWED_USE_CASES = [
  'chat-completions',
  'arabic-founder-questions',
  'arabic-product-descriptions',
  'arabic-seo',
  'arabic-marketing-copy',
  'arabic-translations',
] as const;

export const FANAR_BLOCKED_USE_CASES = [
  'code-generation',
  'builder-architecture',
  'storefront-generation',
  'typescript-generation',
  'design-system-reasoning',
] as const;

export type FanarUseCase = (typeof FANAR_ALLOWED_USE_CASES)[number];

export type FanarChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type FanarChatCompletionInput = {
  messages: FanarChatMessage[];
  useCase: FanarUseCase;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type FanarChatCompletionResult = {
  provider: 'fanar';
  model: string;
  useCase: FanarUseCase;
  text: string;
  raw: unknown;
};

export class FanarConfigurationError extends Error {
  constructor(message = 'Fanar is not configured. Set FANAR_API_URL and FANAR_API_KEY.') {
    super(message);
    this.name = 'FanarConfigurationError';
  }
}

export class FanarRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly responseBody?: string,
  ) {
    super(message);
    this.name = 'FanarRequestError';
  }
}

export function isFanarConfigured(): boolean {
  return Boolean(env.FANAR_API_URL && env.FANAR_API_KEY);
}

export function fanarChatCompletionUrl(baseUrl = env.FANAR_API_URL): string {
  if (!baseUrl) throw new FanarConfigurationError();

  const clean = baseUrl.replace(/\/+$/u, '');
  if (clean.endsWith('/chat/completions')) return clean;
  if (clean.endsWith('/v1')) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

export async function fanarChatCompletion(
  input: FanarChatCompletionInput,
): Promise<FanarChatCompletionResult> {
  if (!env.FANAR_API_KEY) throw new FanarConfigurationError();

  const model = input.model ?? env.FANAR_MODEL;
  const response = await fetch(fanarChatCompletionUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.FANAR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature: input.temperature ?? 0.35,
      max_tokens: input.maxOutputTokens ?? 1024,
      stream: false,
    }),
    signal: AbortSignal.timeout(input.timeoutMs ?? env.FANAR_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new FanarRequestError(
      body || `Fanar request failed (${response.status}).`,
      response.status,
      body,
    );
  }

  const raw = (await response.json().catch(() => null)) as unknown;
  const text = extractChatText(raw);
  if (!text) {
    throw new FanarRequestError('Fanar returned no assistant text.', response.status);
  }

  return {
    provider: 'fanar',
    model,
    useCase: input.useCase,
    text,
    raw,
  };
}

function extractChatText(raw: unknown): string | null {
  if (!isRecord(raw) || !Array.isArray(raw.choices)) return null;
  const choice = raw.choices[0];
  if (!isRecord(choice)) return null;

  const message = choice.message;
  if (isRecord(message)) {
    const content = message.content;
    if (typeof content === 'string') return content.trim() || null;
    if (Array.isArray(content)) {
      const parts = content
        .map((part) => {
          if (!isRecord(part)) return '';
          const text = part.text;
          return typeof text === 'string' ? text : '';
        })
        .filter(Boolean);
      return parts.length ? parts.join('').trim() : null;
    }
  }

  const text = choice.text;
  return typeof text === 'string' ? text.trim() || null : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
