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

describe('CranL Hugging Face provider', () => {
  beforeEach(() => {
    vi.resetModules();
    axiosMock.create.mockClear();
    axiosMock.post.mockReset();
    process.env = { ...originalEnv };
    setEnv('NODE_ENV', 'test');
    setEnv('HUGGINGFACE_API_KEY', 'hf_test_token');
    setEnv('HUGGINGFACE_CHAT_BASE_URL', 'https://fanar.example.endpoints.huggingface.cloud/v1/');
    unsetEnv('HF_TOKEN');
    unsetEnv('HUGGINGFACE_CHAT_MODEL');
    unsetEnv('HUGGINGFACE_ALLOWED_CHAT_MODELS');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults chat to Fanar 2 and preserves role-based messages', async () => {
    const { huggingfaceProvider } = await import(
      '../../../apps/cranl-runtime/src/providers/huggingface'
    );
    const messages = [
      { role: 'system' as const, content: 'Answer in Arabic.' },
      { role: 'user' as const, content: 'اكتب وصف منتج قصير.' },
    ];
    axiosMock.post.mockResolvedValueOnce({
      data: {
        choices: [{ message: { role: 'assistant', content: 'وصف عربي.' } }],
      },
    });

    const result = await huggingfaceProvider.chat?.({
      provider: 'huggingface',
      messages,
      temperature: 0.2,
      metadata: {},
    });

    expect(result?.model).toBe('QCRI/Fanar-2-27B-Instruct');
    expect(axiosMock.create).toHaveBeenLastCalledWith({
      baseURL: 'https://fanar.example.endpoints.huggingface.cloud/v1',
      timeout: 120_000,
    });
    expect(axiosMock.post).toHaveBeenCalledWith(
      '/chat/completions',
      {
        model: 'QCRI/Fanar-2-27B-Instruct',
        messages,
        temperature: 0.2,
        stream: false,
      },
      {
        headers: {
          Authorization: 'Bearer hf_test_token',
          'Content-Type': 'application/json',
        },
      },
    );
  });

  it('uses HF_TOKEN when HUGGINGFACE_API_KEY is absent', async () => {
    unsetEnv('HUGGINGFACE_API_KEY');
    setEnv('HF_TOKEN', 'hf_fallback_token');
    const { huggingfaceProvider } = await import(
      '../../../apps/cranl-runtime/src/providers/huggingface'
    );
    axiosMock.post.mockResolvedValueOnce({ data: { choices: [] } });

    await huggingfaceProvider.chat?.({
      provider: 'huggingface',
      model: 'QCRI/Fanar-1-9B-Instruct',
      messages: [{ role: 'user', content: 'مرحبا' }],
      temperature: 0.7,
      metadata: {},
    });

    expect(axiosMock.post).toHaveBeenCalledWith(
      '/chat/completions',
      expect.objectContaining({ model: 'QCRI/Fanar-1-9B-Instruct' }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer hf_fallback_token' }),
      }),
    );
  });

  it('rejects chat models outside the allowlist before calling Hugging Face', async () => {
    const { huggingfaceProvider } = await import(
      '../../../apps/cranl-runtime/src/providers/huggingface'
    );

    await expect(
      huggingfaceProvider.chat?.({
        provider: 'huggingface',
        model: 'QCRI/Fanar-1-9B',
        messages: [{ role: 'user', content: 'مرحبا' }],
        temperature: 0.7,
        metadata: {},
      }),
    ).rejects.toThrow('not allowed');
    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  it('requires a dedicated Hugging Face endpoint for Fanar chat', async () => {
    unsetEnv('HUGGINGFACE_CHAT_BASE_URL');
    const { huggingfaceProvider } = await import(
      '../../../apps/cranl-runtime/src/providers/huggingface'
    );

    await expect(
      huggingfaceProvider.chat?.({
        provider: 'huggingface',
        messages: [{ role: 'user', content: 'مرحبا' }],
        temperature: 0.7,
        metadata: {},
      }),
    ).rejects.toThrow('HUGGINGFACE_CHAT_BASE_URL is required');
    expect(axiosMock.post).not.toHaveBeenCalled();
  });
});
