import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import {
  fanarChatCompletion,
  isFanarConfigured,
  isSouqyStudioFanarEnabled,
} from '@/lib/fanar/provider';
import { toSouqyIdeError } from '@/lib/souqy-ide/errors';
import { resolveChatModel } from '@/lib/souqy-ide/modelRouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Souqy IDE localhost self-diagnosis (Master Plan Phase 0).
 *
 * Non-production only — reports which model backends `.env.local` actually
 * activates, so "Fanar silently disabled" class problems surface in one curl
 * instead of as `fetch failed` in the Studio. `?live=1` performs a real
 * 1-token Fanar round-trip. Never includes secrets.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'not_available_in_production' }, { status: 404 });
  }

  const fanarConfigured = isFanarConfigured();
  const fanarEnabled = isSouqyStudioFanarEnabled();
  const resolution = resolveChatModel('chat-completions');

  const report: Record<string, unknown> = {
    ok: Boolean(resolution.primary),
    fanar: {
      configured: fanarConfigured,
      enabled: fanarEnabled,
      // The classic footgun: URL+key set but the kill switch missing.
      hint:
        fanarConfigured && !fanarEnabled
          ? 'FANAR_API_URL and FANAR_API_KEY are set but SOUQY_STUDIO_FANAR_ENABLED is not — Fanar will never be used.'
          : undefined,
      model: env.FANAR_MODEL,
      endpointHost: safeHost(env.FANAR_API_URL),
      timeoutMs: env.FANAR_TIMEOUT_MS,
      streamIdleTimeoutMs: env.FANAR_STREAM_IDLE_TIMEOUT_MS,
    },
    cranl: {
      configured: Boolean(env.CRANL_RUNTIME_URL),
      defaultProvider: env.CRANL_DEFAULT_PROVIDER,
    },
    routing: {
      primary: resolution.primary?.model.id ?? null,
      candidates: resolution.candidates.map((candidate) => ({
        id: candidate.model.id,
        supportsStreaming: candidate.model.supportsStreaming,
        reason: candidate.reason,
      })),
      unavailableReason: resolution.unavailableReason,
    },
    flags: {
      NEXT_PUBLIC_SOUQY_IDE_ENABLED: process.env.NEXT_PUBLIC_SOUQY_IDE_ENABLED ?? null,
    },
    // Whole-storefront code transformation (Web tab → generate → sandbox
    // build → blob → SouqyMount). Every link must be green for "Transform"
    // to produce a real custom website instead of falling back to blocks.
    transform: {
      model: env.SOUQY_GENERATE_MODEL,
      maxOutputTokens: env.SOUQY_GENERATE_MAX_TOKENS,
      gatewayCredential: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
      sandboxSnapshot: Boolean(process.env.SOUQY_BUILD_SNAPSHOT_ID),
      blobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      hint:
        !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN
          ? 'No AI Gateway credential — transforms will fall back to the Replicate text model.'
          : !process.env.BLOB_READ_WRITE_TOKEN
            ? 'BLOB_READ_WRITE_TOKEN missing — sandbox builds cannot upload, storefront falls back to blocks.'
            : undefined,
    },
  };

  const live = new URL(request.url).searchParams.get('live') === '1';
  if (live && fanarEnabled) {
    try {
      const start = Date.now();
      const result = await fanarChatCompletion({
        messages: [{ role: 'user', content: 'ping' }],
        useCase: 'chat-completions',
        maxOutputTokens: 1,
        timeoutMs: 15_000,
      });
      report.live = { ok: true, latencyMs: result.latencyMs ?? Date.now() - start };
    } catch (error) {
      report.live = { ok: false, error: toSouqyIdeError(error).code };
      report.ok = false;
    }
  } else if (live) {
    report.live = { ok: false, error: 'fanar_not_enabled' };
  }

  return NextResponse.json(report);
}

function safeHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
