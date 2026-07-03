import 'server-only';
import { generateText, APICallError } from 'ai';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRepairPrompt,
  buildRepromptUserPrompt,
  parseSouqyOutput,
  SouqyOutputParseError,
  SOUQY_FEW_SHOTS,
  type SouqyBrief,
  type SouqyOutput,
} from './prompt';
import { validateSouqyOutput, formatIssues, type ValidationIssue } from './validate';
import { normalizeSouqyOutput } from './normalize';
import { getMarketSignals } from '@/lib/xapi/marketSignals';
import type { Storefront } from '@/lib/brief';
import { env } from '@/lib/env';

/**
 * Souqy generation pipeline (model call + parse + validate + auto-repair).
 *
 * Flows through the Vercel AI Gateway via the `ai` package — passing a
 * plain `'anthropic/claude-sonnet-4.6'` provider/model string is enough
 * to route via the gateway when `VERCEL_OIDC_TOKEN` (or
 * `AI_GATEWAY_API_KEY`) is present in the environment.
 *
 * Auto-repair: on validation failure we re-prompt Claude with the
 * specific issues + previous source. Capped at `MAX_REPAIRS` attempts to
 * bound spend per generation.
 */

const SOUQY_MODEL = env.SOUQY_GENERATE_MODEL;
const SOUQY_REPLICATE_TEXT_MODEL = env.SOUQY_REPLICATE_TEXT_MODEL;
const SOUQY_TAGS = ['feature:souqy', 'tier:pro+', 'env:production'];
const MAX_REPAIRS = 2;
const AI_GATEWAY_AUTH_MESSAGE =
  'Souqy AI Gateway is not authenticated. Add AI_GATEWAY_API_KEY to .env.local, or refresh VERCEL_OIDC_TOKEN with vercel env pull, then restart npm run dev.';
const AI_GATEWAY_MODEL_RESTRICTED_MESSAGE =
  'This AI Gateway account cannot access the selected Souqy website model. Set SOUQY_GENERATE_MODEL to a lower-cost Gateway model such as google/gemini-2.5-flash-lite, or add paid AI Gateway credits.';

/**
 * Hard cap on the prompt size we'll send to the gateway. Founder-supplied
 * `vibe` plus our system prompt and few-shot is ~3-4k tokens; we cap the
 * raw character count well below that to dodge a confused estimate.
 */
const MAX_VIBE_CHARS = 1200;

export type GenerateInput = {
  brief: SouqyBrief;
  /** Per-user routing key for AI Gateway rate limiting + cost attribution. */
  clerkUserId: string;
  storefront?: Storefront;
};

export type GenerateOk = {
  status: 'ok';
  output: SouqyOutput;
  attempts: number;
  /** Total tokens consumed across all attempts. */
  usage: { inputTokens: number; outputTokens: number };
};

export type GenerateErr = {
  status: 'parse_failed' | 'validation_failed' | 'budget_exceeded' | 'rate_limited' | 'error';
  message: string;
  /** Last set of validation issues, when applicable. */
  issues?: ValidationIssue[];
  /** Last raw assistant message we couldn't make use of. */
  lastSource?: SouqyOutput;
};

export type GenerateResult = GenerateOk | GenerateErr;

type SouqyTextMessage = { role: 'user' | 'assistant'; content: string };

export async function generateSouqyStorefront(input: GenerateInput): Promise<GenerateResult> {
  const brief = clampBrief(input.brief);
  const marketSignals = await getMarketSignals({
    businessName: brief.businessName,
    businessType: brief.businessType,
    vibe: brief.vibe,
    locale: brief.locale,
  });
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...SOUQY_FEW_SHOTS,
    { role: 'user', content: buildUserPrompt(brief, input.storefront, marketSignals) },
  ];

  let attempts = 0;
  let totalIn = 0;
  let totalOut = 0;
  let lastOutput: SouqyOutput | undefined;
  let lastIssues: ValidationIssue[] = [];

  while (attempts <= MAX_REPAIRS) {
    attempts += 1;
    let raw: string;
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const result = await generateSouqyText({
        system: buildSystemPrompt(),
        messages,
        temperature: 0.4,
        maxOutputTokens: env.SOUQY_GENERATE_MAX_TOKENS,
        user: input.clerkUserId,
        tags: SOUQY_TAGS,
      });
      raw = result.text;
      inputTokens = result.usage.inputTokens;
      outputTokens = result.usage.outputTokens;
    } catch (err) {
      return mapGatewayError(err);
    }
    totalIn += inputTokens;
    totalOut += outputTokens;

    let parsed: SouqyOutput;
    try {
      parsed = normalizeSouqyOutput(parseSouqyOutput(raw));
    } catch (err) {
      if (err instanceof SouqyOutputParseError && attempts <= MAX_REPAIRS) {
        // Replay loop: feed the prior assistant message + the parse
        // error back as a user turn so Claude can correct in-context.
        messages.push({ role: 'assistant', content: raw });
        messages.push({
          role: 'user',
          content: `Your previous output failed to parse: ${err.message}\nReturn the corrected JSON envelope only.`,
        });
        continue;
      }
      return {
        status: 'parse_failed',
        message: err instanceof Error ? err.message : 'Unparseable Souqy output.',
      };
    }
    lastOutput = parsed;

    const validation = validateSouqyOutput(parsed.files);
    if (validation.ok) {
      return {
        status: 'ok',
        output: parsed,
        attempts,
        usage: { inputTokens: totalIn, outputTokens: totalOut },
      };
    }
    lastIssues = validation.issues;

    if (attempts > MAX_REPAIRS) break;

    messages.push({ role: 'assistant', content: raw });
    messages.push({
      role: 'user',
      content: buildRepairPrompt({
        previousFiles: parsed.files,
        errorSummary: formatIssues(validation.issues),
      }),
    });
  }

  return {
    status: 'validation_failed',
    message: validationFailureMessage('Souqy output failed validation', attempts, lastIssues),
    issues: lastIssues,
    lastSource: lastOutput,
  };
}

/**
 * Re-prompt path for the dashboard Souqy editor. Same pipeline, but the
 * user prompt carries the previous source + the diff request so Claude
 * doesn't lose continuity across iterations.
 */
export async function repromptSouqyStorefront(args: {
  request: string;
  previousSource: string;
  storefront: Storefront;
  clerkUserId: string;
}): Promise<GenerateResult> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...SOUQY_FEW_SHOTS,
    {
      role: 'user',
      content: buildRepromptUserPrompt({
        previousSource: args.previousSource,
        request: args.request,
        storefront: args.storefront,
      }),
    },
  ];

  let attempts = 0;
  let totalIn = 0;
  let totalOut = 0;
  let lastOutput: SouqyOutput | undefined;
  let lastIssues: ValidationIssue[] = [];

  while (attempts <= MAX_REPAIRS) {
    attempts += 1;
    let raw: string;
    try {
      const result = await generateSouqyText({
        system: buildSystemPrompt(),
        messages,
        temperature: 0.4,
        maxOutputTokens: env.SOUQY_GENERATE_MAX_TOKENS,
        user: args.clerkUserId,
        tags: [...SOUQY_TAGS, 'op:reprompt'],
      });
      raw = result.text;
      totalIn += result.usage.inputTokens;
      totalOut += result.usage.outputTokens;
    } catch (err) {
      return mapGatewayError(err);
    }

    let parsed: SouqyOutput;
    try {
      parsed = normalizeSouqyOutput(parseSouqyOutput(raw));
    } catch (err) {
      if (err instanceof SouqyOutputParseError && attempts <= MAX_REPAIRS) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({
          role: 'user',
          content: `Your previous output failed to parse: ${err.message}\nReturn the corrected JSON envelope only.`,
        });
        continue;
      }
      return {
        status: 'parse_failed',
        message: err instanceof Error ? err.message : 'Unparseable Souqy output.',
      };
    }
    lastOutput = parsed;

    const validation = validateSouqyOutput(parsed.files);
    if (validation.ok) {
      return {
        status: 'ok',
        output: parsed,
        attempts,
        usage: { inputTokens: totalIn, outputTokens: totalOut },
      };
    }
    lastIssues = validation.issues;

    if (attempts > MAX_REPAIRS) break;
    messages.push({ role: 'assistant', content: raw });
    messages.push({
      role: 'user',
      content: buildRepairPrompt({
        previousFiles: parsed.files,
        errorSummary: formatIssues(validation.issues),
      }),
    });
  }

  return {
    status: 'validation_failed',
    message: validationFailureMessage('Souqy reprompt failed validation', attempts, lastIssues),
    issues: lastIssues,
    lastSource: lastOutput,
  };
}

export async function repairSouqyStorefrontBuild(args: {
  output: SouqyOutput;
  errorSummary: string;
  clerkUserId: string;
}): Promise<GenerateResult> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: buildRepairPrompt({
        previousFiles: args.output.files,
        errorSummary: `TypeScript build failed:\n${args.errorSummary}`,
      }),
    },
  ];

  let attempts = 0;
  let totalIn = 0;
  let totalOut = 0;
  let lastOutput: SouqyOutput | undefined;
  let lastIssues: ValidationIssue[] = [];

  while (attempts <= MAX_REPAIRS) {
    attempts += 1;
    let raw: string;
    try {
      const result = await generateSouqyText({
        system: buildSystemPrompt(),
        messages,
        temperature: 0.2,
        maxOutputTokens: env.SOUQY_GENERATE_MAX_TOKENS,
        user: args.clerkUserId,
        tags: [...SOUQY_TAGS, 'op:build-repair'],
      });
      raw = result.text;
      totalIn += result.usage.inputTokens;
      totalOut += result.usage.outputTokens;
    } catch (err) {
      return mapGatewayError(err);
    }

    let parsed: SouqyOutput;
    try {
      parsed = normalizeSouqyOutput(parseSouqyOutput(raw));
    } catch (err) {
      if (err instanceof SouqyOutputParseError && attempts <= MAX_REPAIRS) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({
          role: 'user',
          content: `Your previous output failed to parse: ${err.message}\nReturn the corrected JSON envelope only.`,
        });
        continue;
      }
      return {
        status: 'parse_failed',
        message: err instanceof Error ? err.message : 'Unparseable Souqy output.',
      };
    }
    lastOutput = parsed;

    const validation = validateSouqyOutput(parsed.files);
    if (validation.ok) {
      return {
        status: 'ok',
        output: parsed,
        attempts,
        usage: { inputTokens: totalIn, outputTokens: totalOut },
      };
    }
    lastIssues = validation.issues;
    if (attempts > MAX_REPAIRS) break;

    messages.push({ role: 'assistant', content: raw });
    messages.push({
      role: 'user',
      content: buildRepairPrompt({
        previousFiles: parsed.files,
        errorSummary: formatIssues(validation.issues),
      }),
    });
  }

  return {
    status: 'validation_failed',
    message: validationFailureMessage('Souqy build repair failed validation', attempts, lastIssues),
    issues: lastIssues,
    lastSource: lastOutput,
  };
}

function validationFailureMessage(
  label: string,
  attempts: number,
  issues: readonly ValidationIssue[],
): string {
  const summary = formatIssues(issues).split('\n').filter(Boolean).slice(0, 3).join('\n');
  return summary
    ? `${label} after ${attempts} attempt(s):\n${summary}`
    : `${label} after ${attempts} attempt(s).`;
}

function clampBrief(brief: SouqyBrief): SouqyBrief {
  return {
    ...brief,
    vibe:
      brief.vibe.length > MAX_VIBE_CHARS ? brief.vibe.slice(0, MAX_VIBE_CHARS) + '…' : brief.vibe,
  };
}

async function generateSouqyText(args: {
  system: string;
  messages: SouqyTextMessage[];
  temperature: number;
  maxOutputTokens: number;
  user: string;
  tags: string[];
}): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  // Gateway first: SOUQY_GENERATE_MODEL (e.g. anthropic/claude-sonnet-5) is
  // the quality path for website transforms. Replicate's Qwen text model is
  // only a fallback when no gateway credential exists — previously it won
  // whenever REPLICATE_API_TOKEN was set (it always is, for Flux images),
  // silently downgrading every transform.
  const hasGatewayCredentials = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
  if (env.REPLICATE_API_TOKEN && !hasGatewayCredentials) {
    return generateSouqyTextWithReplicate(args);
  }

  const result = await generateText({
    model: SOUQY_MODEL,
    system: args.system,
    messages: args.messages,
    temperature: args.temperature,
    maxOutputTokens: args.maxOutputTokens,
    providerOptions: {
      gateway: {
        user: args.user,
        tags: args.tags,
      },
    },
  });
  return {
    text: result.text,
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
    },
  };
}

async function generateSouqyTextWithReplicate(args: {
  system: string;
  messages: SouqyTextMessage[];
  temperature: number;
  maxOutputTokens: number;
}): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const response = await fetch(
    `https://api.replicate.com/v1/models/${SOUQY_REPLICATE_TEXT_MODEL}/predictions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
        'Cancel-After': '180s',
      },
      body: JSON.stringify({
        input: buildReplicateTextInput(args),
      }),
    },
  );
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Replicate text generation failed (${response.status})${summarizeReplicateError(errorText)}.`,
    );
  }

  const prediction = (await response.json()) as ReplicateTextPrediction;
  const text = textFromReplicateOutput(prediction.output);
  if (text) return { text, usage: { inputTokens: 0, outputTokens: 0 } };
  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    throw new Error(replicatePredictionFailure(prediction));
  }
  if (prediction.urls?.get) {
    const polled = await pollReplicateTextPrediction(prediction.urls.get);
    return { text: polled, usage: { inputTokens: 0, outputTokens: 0 } };
  }
  throw new Error('Replicate did not return text output.');
}

function buildReplicateTextInput(args: {
  system: string;
  messages: SouqyTextMessage[];
  temperature: number;
  maxOutputTokens: number;
}): Record<string, unknown> {
  if (usesPromptOnlyReplicateModel(SOUQY_REPLICATE_TEXT_MODEL)) {
    return {
      prompt: formatReplicatePrompt(args),
      temperature: args.temperature,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      max_tokens: args.maxOutputTokens,
    };
  }

  return {
    system_prompt: args.system,
    messages: args.messages,
    temperature: args.temperature,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    max_completion_tokens: args.maxOutputTokens,
  };
}

function usesPromptOnlyReplicateModel(model: string): boolean {
  return /^qwen\//u.test(model);
}

function formatReplicatePrompt(args: { system: string; messages: SouqyTextMessage[] }): string {
  const parts = [`System:\n${args.system.trim()}`];
  for (const message of args.messages) {
    const role = message.role === 'assistant' ? 'Assistant' : 'User';
    parts.push(`${role}:\n${message.content.trim()}`);
  }
  parts.push('Assistant:\nReturn only the Souqy JSON envelope.');
  return parts.join('\n\n');
}

type ReplicateTextPrediction = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: string | null;
  logs?: string | null;
  urls?: { get?: string };
};

async function pollReplicateTextPrediction(url: string): Promise<string> {
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.REPLICATE_API_TOKEN}` },
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Replicate text polling failed (${response.status})${summarizeReplicateError(errorText)}.`,
      );
    }
    const prediction = (await response.json()) as ReplicateTextPrediction;
    const text = textFromReplicateOutput(prediction.output);
    if (text) return text;
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(replicatePredictionFailure(prediction));
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error('Replicate text generation timed out.');
}

function replicatePredictionFailure(prediction: ReplicateTextPrediction): string {
  const pieces = ['Replicate text generation failed'];
  if (prediction.id) pieces.push(`id=${prediction.id}`);
  if (prediction.error) pieces.push(stripAnsi(prediction.error).slice(0, 260));
  if (prediction.logs) pieces.push(stripAnsi(prediction.logs).slice(-500));
  return pieces.join(': ');
}

function textFromReplicateOutput(output: unknown): string | null {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    const parts = output
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          const text = (item as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .filter(Boolean);
    return parts.length ? parts.join('') : null;
  }
  if (output && typeof output === 'object' && 'text' in output) {
    const text = (output as { text?: unknown }).text;
    return typeof text === 'string' ? text : null;
  }
  return null;
}

function summarizeReplicateError(value: string): string {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value) as { detail?: unknown; error?: unknown };
    const detail = parsed.detail ?? parsed.error;
    if (typeof detail === 'string') return `: ${stripAnsi(detail).slice(0, 260)}`;
    if (Array.isArray(detail))
      return `: ${detail
        .map((item) => JSON.stringify(item))
        .join(', ')
        .slice(0, 260)}`;
    if (detail && typeof detail === 'object') return `: ${JSON.stringify(detail).slice(0, 260)}`;
  } catch {
    return `: ${stripAnsi(value).slice(0, 260)}`;
  }
  return '';
}

/**
 * Translate AI Gateway errors into Souqy's typed error union. We care
 * specifically about 402 (budget exceeded) and 429 (rate limited) so
 * the dashboard can surface a tailored message ("you've used your
 * monthly Souqy quota") instead of a generic failure.
 */
function mapGatewayError(err: unknown): GenerateErr {
  if (APICallError.isInstance(err)) {
    if (err.statusCode === 401 || err.statusCode === 403 || isGatewayAuthError(err)) {
      if (isGatewayModelRestrictionError(err)) {
        return {
          status: 'error',
          message: AI_GATEWAY_MODEL_RESTRICTED_MESSAGE,
        };
      }
      return {
        status: 'error',
        message: AI_GATEWAY_AUTH_MESSAGE,
      };
    }
    if (err.statusCode === 402) {
      return {
        status: 'budget_exceeded',
        message: 'Souqy is out of credits for this billing cycle.',
      };
    }
    if (err.statusCode === 429) {
      return {
        status: 'rate_limited',
        message: 'Too many Souqy generations in the last few minutes — try again shortly.',
      };
    }
  }
  if (isGatewayAuthError(err)) {
    return {
      status: 'error',
      message: AI_GATEWAY_AUTH_MESSAGE,
    };
  }
  if (isGatewayModelRestrictionError(err)) {
    return {
      status: 'error',
      message: AI_GATEWAY_MODEL_RESTRICTED_MESSAGE,
    };
  }
  if (isReplicateSensitiveError(err)) {
    return {
      status: 'error',
      message:
        'Replicate blocked the selected Souqy text model because its input or output was flagged as sensitive. Souqy now defaults Replicate text generation to Qwen; restart the dev server and retry.',
    };
  }
  console.error('[souqy/generate] generation error', err);
  return {
    status: 'error',
    message: err instanceof Error ? stripAnsi(err.message) : 'Souqy generation failed.',
  };
}

function isGatewayModelRestrictionError(err: unknown): boolean {
  const message = stripAnsi(err instanceof Error ? err.message : String(err));
  return /Free tier users do not have access to this model|RestrictedModelsError|paid credits|top-up/iu.test(
    message,
  );
}

function isGatewayAuthError(err: unknown): boolean {
  const message = stripAnsi(err instanceof Error ? err.message : String(err));
  return /Unauthenticated request to AI Gateway|AI_GATEWAY_API_KEY|unauthenticated-ai-gateway/iu.test(
    message,
  );
}

function isReplicateSensitiveError(err: unknown): boolean {
  const message = stripAnsi(err instanceof Error ? err.message : String(err));
  return /flagged as sensitive|input or output was flagged|ModelError|E005/iu.test(message);
}

function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/gu, '');
}
