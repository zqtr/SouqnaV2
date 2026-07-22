import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  cookies: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies, headers: mocks.headers }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/components/auth/AuthPageClient', () => ({
  AuthPageClient: (props: Record<string, unknown>) => ({ type: 'auth-page', props }),
}));
vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'https://souqna.qa' },
}));

import SignInPage from '@/app/sign-in/[[...sign-in]]/page';
import SignUpPage from '@/app/sign-up/[[...sign-up]]/page';

describe('auth page session completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: null });
    mocks.headers.mockResolvedValue(new Headers({ host: 'localhost:3000' }));
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => undefined) });
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`redirect:${destination}`);
    });
  });

  it('sends an authenticated sign-in request to its safe return destination', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user_123' });

    await expect(
      SignInPage({
        searchParams: Promise.resolve({
          redirect_url: 'http://localhost:3000/account/pro?store=demo',
        }),
      }),
    ).rejects.toThrow('redirect:/account/pro?store=demo');

    expect(mocks.redirect).toHaveBeenCalledWith('/account/pro?store=demo');
  });

  it('rejects an external return destination after sign-up', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user_123' });

    await expect(
      SignUpPage({
        searchParams: Promise.resolve({ redirect_url: 'https://example.com/phishing' }),
      }),
    ).rejects.toThrow('redirect:/account');

    expect(mocks.redirect).toHaveBeenCalledWith('/account');
  });

  it('passes the sanitized destination into the signed-out Clerk surface', async () => {
    const result = await SignInPage({
      searchParams: Promise.resolve({ redirect_url: '/account/storage-library?section=backups' }),
    });

    expect(result.props).toMatchObject({
      mode: 'sign-in',
      postAuthRedirect: '/account/storage-library?section=backups',
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
