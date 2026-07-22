export const CLERK_SESSION_COOKIE_BASES = [
  '__session',
  '__client_uat',
  '__clerk_db_jwt',
  '__refresh',
  '__dev_session',
  '__clerk_synced',
] as const;

type CookieLike = {
  name: string;
  value?: string;
};

export function isClerkSessionCookieName(name: string): boolean {
  return CLERK_SESSION_COOKIE_BASES.some(
    (baseName) => name === baseName || name.startsWith(`${baseName}_`),
  );
}

export function clerkSessionCookieNames(cookies: readonly CookieLike[]): string[] {
  const names = new Set<string>(CLERK_SESSION_COOKIE_BASES);

  for (const cookie of cookies) {
    if (isClerkSessionCookieName(cookie.name)) names.add(cookie.name);
  }

  return [...names];
}

export function hasClerkSessionCookie(cookies: readonly CookieLike[]): boolean {
  return cookies.some((cookie) => Boolean(cookie.value) && isClerkSessionCookieName(cookie.name));
}
