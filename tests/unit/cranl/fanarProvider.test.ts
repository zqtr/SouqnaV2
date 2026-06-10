import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMock = vi.hoisted(() => {
  const post = vi.fn();
  const create = vi.fn(() => ({ post }));
  const module = () => ({
    default: {
      create,
    },
    create,
  });
  return { create, module, post };
});

vi.mock('axios', axiosMock.module);
vi.mock('../../../apps/cranl-runtime/node_modules/axios/index.js', axiosMock.module);
vi.mock('../../../apps/cranl-runtime/node_modules/axios/dist/node/axios.cjs', axiosMock.module);

const originalEnv = { ...process.env };

function setEnv(name: string, value: string) {
  (process.env as Record<string, string | undefined>)[name] = value;
}

function unsetEnv(name: string) {
  delete (process.env as Record<string, string | undefined>)[name];
}

describe('CranL Fanar provider', () => {
  beforeEach(() => {
    vi.resetModules();
    axiosMock.create.mockClear();
    axiosMock.post.mockReset();
    process.env = { ...originalEnv };
    setEnv('NODE_ENV', 'test');
    setEnv('FANAR_API_URL', 'https://pod-8000.proxy.runpod.net/v1/');
    setEnv('FANAR_API_KEY', 'fanar_test_key_123456');
    unsetEnv('FANAR_MODEL');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('posts chat completions to the RunPod vLLM endpoint', async () => {
    const { fanarProvider } = await import('../../../apps/cranl-runtime/src/providers/fanar');
    const messages = [
      { role: 'system' as const, content: 'Answer in Arabic with Souqna context.' },
      { role: 'user' as const, content: 'Write a short product description.' },
    ];
    axiosMock.post.mockResolvedValueOnce({
      data: {
        choices: [{ message: { role: 'assistant', content: 'Arabic copy.' } }],
      },
    });

    const result = await fanarProvider.chat?.({
      provider: 'fanar',
      messages,
      temperature: 0.2,
      metadata: {},
    });

    expect(result?.provider).toBe('fanar');
    expect(result?.model).toBe('QCRI/Fanar-1-9B-Instruct');
    expect(axiosMock.create).toHaveBeenLastCalledWith({
      baseURL: 'https://pod-8000.proxy.runpod.net/v1',
      timeout: 120_000,
    });
    expect(axiosMock.post).toHaveBeenCalledWith(
      '/chat/completions',
      {
        model: 'QCRI/Fanar-1-9B-Instruct',
        messages,
        temperature: 0.2,
        stream: false,
      },
      {
        headers: {
          Authorization: 'Bearer fanar_test_key_123456',
          'Content-Type': 'application/json',
        },
      },
    );
  });

  it('rejects non-Fanar models', async () => {
    const { fanarProvider } = await import('../../../apps/cranl-runtime/src/providers/fanar');

    await expect(
      fanarProvider.chat?.({
        provider: 'fanar',
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        metadata: {},
      }),
    ).rejects.toThrow('Fanar provider only accepts');
    expect(axiosMock.post).not.toHaveBeenCalled();
  });
});
