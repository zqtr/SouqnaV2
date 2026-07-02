import { describe, expect, it } from 'vitest';
import { consumeSseResponse, isEventStreamResponse } from '@/lib/souqy-ide/sse';

function sseResponse(frames: string[], contentType = 'text/event-stream'): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': contentType } });
}

describe('souqy-ide sse consumer', () => {
  it('parses named events with JSON payloads', async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    await consumeSseResponse(
      sseResponse(['event: delta\ndata: {"text":"مرحبا"}\n\nevent: done\ndata: {"text":"مرحبا"}\n\n']),
      (frame) => events.push(frame),
    );
    expect(events).toEqual([
      { event: 'delta', data: { text: 'مرحبا' } },
      { event: 'done', data: { text: 'مرحبا' } },
    ]);
  });

  it('handles frames split across chunks', async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    await consumeSseResponse(
      sseResponse(['event: delta\nda', 'ta: {"text":"he', 'llo"}\n\n']),
      (frame) => events.push(frame),
    );
    expect(events).toEqual([{ event: 'delta', data: { text: 'hello' } }]);
  });

  it('handles CRLF separators', async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    await consumeSseResponse(
      sseResponse(['event: done\r\ndata: {"ok":true}\r\n\r\n']),
      (frame) => events.push(frame),
    );
    expect(events).toEqual([{ event: 'done', data: { ok: true } }]);
  });

  it('falls back to raw string data when JSON parsing fails', async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    await consumeSseResponse(sseResponse(['data: plain text\n\n']), (frame) =>
      events.push(frame),
    );
    expect(events).toEqual([{ event: 'message', data: 'plain text' }]);
  });

  it('detects event-stream responses by content type', () => {
    expect(isEventStreamResponse(sseResponse([]))).toBe(true);
    expect(isEventStreamResponse(new Response('{}', { headers: { 'Content-Type': 'application/json' } }))).toBe(false);
  });
});
