import { describe, expect, it } from 'vitest';
import {
  clerkSessionCookieNames,
  hasClerkSessionCookie,
  isClerkSessionCookieName,
} from '@/lib/clerkSessionCookies';

describe('Clerk session cookie recovery', () => {
  it('recognizes both ordinary and Clerk-suffixed session cookies', () => {
    expect(isClerkSessionCookieName('__session')).toBe(true);
    expect(isClerkSessionCookieName('__session_AwGNNpRs')).toBe(true);
    expect(isClerkSessionCookieName('__refresh_AwGNNpRs')).toBe(true);
    expect(isClerkSessionCookieName('NEXT_LOCALE')).toBe(false);
  });

  it('includes discovered suffixes when building the deletion set', () => {
    const names = clerkSessionCookieNames([
      { name: '__session_AwGNNpRs', value: 'expired' },
      { name: '__client_uat_AwGNNpRs', value: '0' },
      { name: 'NEXT_LOCALE', value: 'en' },
    ]);

    expect(names).toContain('__session');
    expect(names).toContain('__refresh');
    expect(names).toContain('__session_AwGNNpRs');
    expect(names).toContain('__client_uat_AwGNNpRs');
    expect(names).not.toContain('NEXT_LOCALE');
  });

  it('detects related Clerk session-state cookies', () => {
    expect(hasClerkSessionCookie([{ name: '__client_uat', value: '0' }])).toBe(true);
    expect(hasClerkSessionCookie([{ name: '__session_instance', value: 'expired' }])).toBe(true);
    expect(hasClerkSessionCookie([{ name: 'NEXT_LOCALE', value: 'en' }])).toBe(false);
  });
});
