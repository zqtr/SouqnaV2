import { describe, expect, it } from 'vitest';
import { resolveAuthRedirect, resolveAuthRequestOrigin } from '@/lib/authRedirect';

describe('auth redirect safety', () => {
  const origin = 'http://localhost:3000';

  it('falls back to the account when no destination is present', () => {
    expect(resolveAuthRedirect(undefined, origin)).toBe('/account');
    expect(resolveAuthRedirect([], origin)).toBe('/account');
  });

  it('preserves relative and same-origin absolute destinations', () => {
    expect(resolveAuthRedirect('/account/pro?store=demo#builder', origin)).toBe(
      '/account/pro?store=demo#builder',
    );
    expect(resolveAuthRedirect('http://localhost:3000/account/orders', origin)).toBe(
      '/account/orders',
    );
    expect(resolveAuthRedirect(['/account/storage-library', '/account'], origin)).toBe(
      '/account/storage-library',
    );
  });

  it('rejects external, protocol-relative, malformed, and auth-loop destinations', () => {
    expect(resolveAuthRedirect('https://example.com/account', origin)).toBe('/account');
    expect(resolveAuthRedirect('//example.com/account', origin)).toBe('/account');
    expect(resolveAuthRedirect('/\\example.com/account', origin)).toBe('/account');
    expect(resolveAuthRedirect('http://[', origin)).toBe('/account');
    expect(resolveAuthRedirect('/sign-in/factor-one', origin)).toBe('/account');
    expect(resolveAuthRedirect('/sign-up', origin)).toBe('/account');
  });

  it('derives the current origin from forwarded headers and handles localhost', () => {
    expect(
      resolveAuthRequestOrigin(
        new Headers({
          host: 'internal:3000',
          'x-forwarded-host': 'app.souqna.qa',
          'x-forwarded-proto': 'https',
        }),
        'https://souqna.qa',
      ),
    ).toBe('https://app.souqna.qa');

    expect(
      resolveAuthRequestOrigin(new Headers({ host: 'localhost:3000' }), 'https://souqna.qa'),
    ).toBe('http://localhost:3000');
  });
});
