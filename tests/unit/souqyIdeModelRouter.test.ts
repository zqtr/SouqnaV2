import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function setEnv(name: string, value: string) {
  (process.env as Record<string, string | undefined>)[name] = value;
}

function unsetEnv(name: string) {
  delete (process.env as Record<string, string | undefined>)[name];
}

async function loadRouter() {
  return import('@/lib/souqy-ide/modelRouter');
}

describe('souqy-ide model router', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    setEnv('NODE_ENV', 'test');
    unsetEnv('FANAR_API_URL');
    unsetEnv('FANAR_API_KEY');
    unsetEnv('SOUQY_STUDIO_FANAR_ENABLED');
    unsetEnv('CRANL_RUNTIME_URL');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('routes to Fanar when enabled and the use case is allowed', async () => {
    setEnv('FANAR_API_URL', 'https://pod-8000.proxy.runpod.net/v1');
    setEnv('FANAR_API_KEY', 'fanar_test_key_123456');
    setEnv('SOUQY_STUDIO_FANAR_ENABLED', 'true');
    const { resolveChatModel } = await loadRouter();

    const resolution = resolveChatModel('chat-completions', 'ar');
    expect(resolution.primary?.model.id).toBe('fanar:runpod-primary');
  });

  it('never routes blocked use cases to Fanar', async () => {
    setEnv('FANAR_API_URL', 'https://pod-8000.proxy.runpod.net/v1');
    setEnv('FANAR_API_KEY', 'fanar_test_key_123456');
    setEnv('SOUQY_STUDIO_FANAR_ENABLED', 'true');
    setEnv('CRANL_RUNTIME_URL', 'https://cranl.example.com');
    const { resolveChatModel } = await loadRouter();

    const resolution = resolveChatModel('code-generation');
    expect(resolution.primary?.model.id).toBe('cranl:default');
    expect(
      resolution.candidates.some((candidate) => candidate.model.id === 'fanar:runpod-primary'),
    ).toBe(false);
  });

  it('skips Fanar when the kill switch is off even if configured', async () => {
    setEnv('FANAR_API_URL', 'https://pod-8000.proxy.runpod.net/v1');
    setEnv('FANAR_API_KEY', 'fanar_test_key_123456');
    setEnv('CRANL_RUNTIME_URL', 'https://cranl.example.com');
    const { resolveChatModel } = await loadRouter();

    const resolution = resolveChatModel('chat-completions');
    expect(resolution.primary?.model.id).toBe('cranl:default');
  });

  it('reports nothing_configured when no backend is available', async () => {
    const { resolveChatModel } = await loadRouter();

    const resolution = resolveChatModel('chat-completions');
    expect(resolution.primary).toBeNull();
    expect(resolution.unavailableReason).toBe('nothing_configured');
  });

  it('keeps CranL as fallback candidate behind Fanar', async () => {
    setEnv('FANAR_API_URL', 'https://pod-8000.proxy.runpod.net/v1');
    setEnv('FANAR_API_KEY', 'fanar_test_key_123456');
    setEnv('SOUQY_STUDIO_FANAR_ENABLED', 'true');
    setEnv('CRANL_RUNTIME_URL', 'https://cranl.example.com');
    const { resolveChatModel } = await loadRouter();

    const resolution = resolveChatModel('arabic-marketing-copy');
    expect(resolution.candidates.map((candidate) => candidate.model.id)).toEqual([
      'fanar:runpod-primary',
      'cranl:default',
    ]);
  });
});
