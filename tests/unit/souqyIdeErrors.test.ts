import { describe, expect, it } from 'vitest';
import {
  fromHttpStatus,
  souqyIdeErrorMessage,
  toSouqyIdeError,
} from '@/lib/souqy-ide/errors';

class FakeFanarRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'FanarRequestError';
  }
}

describe('souqy-ide error contract', () => {
  it('never exposes the raw error message', () => {
    const error = new Error('ECONNREFUSED 127.0.0.1:8000 super-secret-internal-detail');
    const mapped = toSouqyIdeError(error);
    expect(mapped.message.en).not.toContain('ECONNREFUSED');
    expect(mapped.message.ar).not.toContain('ECONNREFUSED');
  });

  it('maps fetch network failures to network', () => {
    expect(toSouqyIdeError(new TypeError('fetch failed')).code).toBe('network');
  });

  it('maps timeout aborts to provider_timeout', () => {
    expect(toSouqyIdeError(new DOMException('timed out', 'TimeoutError')).code).toBe(
      'provider_timeout',
    );
  });

  it('maps user aborts to stream_interrupted', () => {
    expect(toSouqyIdeError(new DOMException('aborted', 'AbortError')).code).toBe(
      'stream_interrupted',
    );
  });

  it('maps Fanar errors by name and status without importing the provider', () => {
    expect(toSouqyIdeError(new FakeFanarRequestError('boom', 429)).code).toBe('quota');
    expect(toSouqyIdeError(new FakeFanarRequestError('boom', 503)).code).toBe(
      'provider_unavailable',
    );
    expect(toSouqyIdeError(new FakeFanarRequestError('boom')).code).toBe(
      'provider_unavailable',
    );
  });

  it('maps HTTP statuses', () => {
    expect(fromHttpStatus(401).code).toBe('auth');
    expect(fromHttpStatus(402).code).toBe('quota');
    expect(fromHttpStatus(429).code).toBe('quota');
    expect(fromHttpStatus(504).code).toBe('provider_timeout');
    expect(fromHttpStatus(500).code).toBe('provider_unavailable');
    expect(fromHttpStatus(422).code).toBe('invalid_input');
  });

  it('marks auth and invalid_input as non-retryable', () => {
    expect(fromHttpStatus(401).retryable).toBe(false);
    expect(fromHttpStatus(400).retryable).toBe(false);
    expect(fromHttpStatus(500).retryable).toBe(true);
  });

  it('returns locale-specific copy', () => {
    const error = new TypeError('fetch failed');
    expect(souqyIdeErrorMessage(error, 'en')).toMatch(/connection/i);
    expect(souqyIdeErrorMessage(error, 'ar')).toContain('الاتصال');
  });

  it('passes through an already-mapped client error', () => {
    const mapped = toSouqyIdeError(new TypeError('fetch failed'));
    expect(toSouqyIdeError(mapped)).toBe(mapped);
  });

  it('falls back to unknown for non-error values', () => {
    expect(toSouqyIdeError('weird string').code).toBe('unknown');
    expect(toSouqyIdeError(undefined).code).toBe('unknown');
  });
});
