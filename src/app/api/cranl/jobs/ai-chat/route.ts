import { NextResponse } from 'next/server';
import { createCranlAiChatJob, CranlAiChatRequestSchema } from '@/lib/cranl/client';
import { env } from '@/lib/env';
import {
  fanarChatCompletion,
  isSouqyStudioFanarEnabled,
  type FanarChatMessage,
} from '@/lib/fanar/provider';
import { estimateFanarChatCost } from '@/lib/souqy-studio/modelCatalog';
import { toSouqyIdeError } from '@/lib/souqy-ide/errors';
import { requireCranlUserAccess } from '../../_access';
import { cranlErrorResponse } from '../../_errors';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const access = await requireCranlUserAccess();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null);
  const parsed = CranlAiChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_ai_chat_job' }, { status: 400 });
  }

  const wantsStream = request.headers.get('accept')?.includes('text/event-stream') ?? false;
  if (
    wantsStream &&
    parsed.data.metadata.surface === 'souqy-studio' &&
    isSouqyStudioFanarEnabled()
  ) {
    try {
      return await createFanarStudioStream(parsed.data.messages, request.signal);
    } catch (error) {
      console.warn('[souqy-studio-chat] Fanar stream failed before start', summarizeFanarError(error));
    }
  }

  try {
    const job = await createCranlAiChatJob({
      ...parsed.data,
      metadata: {
        ...parsed.data.metadata,
        source: 'souqna-web',
        clerkUserId: access.userId,
      },
    });
    return NextResponse.json({ ok: true, job }, { status: 202 });
  } catch (error) {
    return cranlErrorResponse(error);
  }
}

async function createFanarStudioStream(
  messages: FanarChatMessage[],
  clientSignal: AbortSignal,
): Promise<Response> {
  const completion = await fanarChatCompletion({
    messages,
    useCase: 'chat-completions',
    model: env.FANAR_MODEL,
    temperature: 0.55,
    maxOutputTokens: 1200,
    stream: true,
  });

  const fanarStream = completion.raw;
  if (!(fanarStream instanceof ReadableStream)) {
    throw new Error('Fanar returned no stream.');
  }

  const encoder = new TextEncoder();
  const inputText = messages.map((message) => message.content).join('\n');
  const initialCost = estimateFanarChatCost({
    inputText,
    usdPer1kTokens: env.FANAR_ESTIMATED_USD_PER_1K_TOKENS,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let outputText = '';
      const enqueue = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      enqueue('meta', {
        provider: 'fanar',
        backend: 'runpod',
        model: completion.model,
        cost: initialCost,
      });

      const reader = fanarStream.getReader();
      // Client gone → stop paying RunPod for tokens nobody will read.
      const onClientAbort = () => {
        completion.abort?.();
        void reader.cancel().catch(() => {});
      };
      if (clientSignal.aborted) onClientAbort();
      else clientSignal.addEventListener('abort', onClientAbort, { once: true });

      try {
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await readWithIdleTimeout(reader, () => {
            completion.abort?.();
          });
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/u);
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const delta = extractOpenAiStreamDelta(line);
            if (!delta) continue;
            outputText += delta;
            enqueue('delta', { text: delta });
          }
        }

        const cost = estimateFanarChatCost({
          inputText,
          outputText,
          usdPer1kTokens: env.FANAR_ESTIMATED_USD_PER_1K_TOKENS,
        });
        enqueue('done', {
          provider: 'fanar',
          backend: 'runpod',
          model: completion.model,
          text: outputText,
          cost,
          latencyMs: completion.latencyMs,
        });
        controller.close();
      } catch (error) {
        console.warn('[souqy-studio-chat] Fanar stream failed mid-flight', summarizeFanarError(error));
        enqueue('error', { ...toSouqyIdeError(error), partialText: outputText });
        controller.close();
      } finally {
        clientSignal.removeEventListener('abort', onClientAbort);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Souqy-Chat-Provider': 'fanar-runpod',
    },
  });
}

async function readWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onIdle: () => void,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        idleTimer = setTimeout(() => {
          onIdle();
          reject(new DOMException('Fanar stream idle timeout.', 'TimeoutError'));
        }, env.FANAR_STREAM_IDLE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(idleTimer);
  }
}

function extractOpenAiStreamDelta(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return '';
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return '';

  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{
        delta?: { content?: unknown };
        message?: { content?: unknown };
        text?: unknown;
      }>;
    };
    const choice = json.choices?.[0];
    const content = choice?.delta?.content ?? choice?.message?.content ?? choice?.text;
    return typeof content === 'string' ? content : '';
  } catch {
    return '';
  }
}

function summarizeFanarError(error: unknown): string {
  if (!(error instanceof Error)) return 'fanar_unexpected_error';
  return error.name || 'fanar_request_failed';
}
