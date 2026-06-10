import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function setEnv(name: string, value: string) {
  (process.env as Record<string, string | undefined>)[name] = value;
}

function unsetEnv(name: string) {
  delete (process.env as Record<string, string | undefined>)[name];
}

describe('Fanar provider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    process.env = { ...originalEnv };
    setEnv('NODE_ENV', 'test');
    setEnv('FANAR_API_URL', 'https://pod-8000.proxy.runpod.net/v1/');
    setEnv('FANAR_API_KEY', 'fanar_test_key_123456');
    unsetEnv('FANAR_MODEL');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it('normalizes OpenAI-compatible chat completion URLs', async () => {
    const { fanarChatCompletionUrl } = await import('@/lib/fanar/provider');

    expect(fanarChatCompletionUrl('https://fanar.example')).toBe(
      'https://fanar.example/v1/chat/completions',
    );
    expect(fanarChatCompletionUrl('https://fanar.example/v1/')).toBe(
      'https://fanar.example/v1/chat/completions',
    );
    expect(fanarChatCompletionUrl('https://fanar.example/v1/chat/completions')).toBe(
      'https://fanar.example/v1/chat/completions',
    );
  });

  it('posts chat completions to the configured Fanar endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: 'Arabic founder answer.' } }],
        }),
        { status: 200 },
      ),
    );
    const { fanarChatCompletion } = await import('@/lib/fanar/provider');

    const result = await fanarChatCompletion({
      useCase: 'arabic-founder-questions',
      messages: [
        { role: 'system', content: 'Answer with Souqna context.' },
        { role: 'user', content: 'Help me improve Arabic product copy.' },
      ],
      temperature: 0.2,
      maxOutputTokens: 400,
    });

    expect(result).toMatchObject({
      provider: 'fanar',
      model: 'QCRI/Fanar-1-9B-Instruct',
      useCase: 'arabic-founder-questions',
      text: 'Arabic founder answer.',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pod-8000.proxy.runpod.net/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer fanar_test_key_123456',
          'Content-Type': 'application/json',
        },
      }),
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'QCRI/Fanar-1-9B-Instruct',
      temperature: 0.2,
      max_tokens: 400,
      stream: false,
    });
  });

  it('requires both Fanar URL and API key', async () => {
    unsetEnv('FANAR_API_URL');
    unsetEnv('FANAR_API_KEY');
    const { fanarChatCompletion } = await import('@/lib/fanar/provider');

    await expect(
      fanarChatCompletion({
        useCase: 'chat-completions',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toThrow('Fanar is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
