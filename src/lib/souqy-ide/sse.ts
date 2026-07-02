/**
 * Minimal SSE consumer for the Souqy IDE streaming chat (Master Plan Phase 1).
 *
 * Parses `event: <name>\ndata: <json>\n\n` frames from a fetch Response body
 * and dispatches them to the caller. Client-safe, dependency-free.
 */

export type SseEvent = {
  event: string;
  data: unknown;
};

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const body = response.body;
  if (!body) throw new Error('SSE response has no body.');

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = findFrameEnd(buffer);
      while (separatorIndex !== -1) {
        const frame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + frameSeparatorLength(buffer, separatorIndex));
        const parsed = parseSseFrame(frame);
        if (parsed) onEvent(parsed);
        separatorIndex = findFrameEnd(buffer);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function isEventStreamResponse(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').includes('text/event-stream');
}

function findFrameEnd(buffer: string): number {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf === -1) return crlf;
  if (crlf === -1) return lf;
  return Math.min(lf, crlf);
}

function frameSeparatorLength(buffer: string, index: number): number {
  return buffer.startsWith('\r\n\r\n', index) ? 4 : 2;
}

function parseSseFrame(frame: string): SseEvent | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of frame.split(/\r?\n/u)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }

  if (!dataLines.length) return null;
  const rawData = dataLines.join('\n');
  try {
    return { event, data: JSON.parse(rawData) };
  } catch {
    return { event, data: rawData };
  }
}
