const DEFAULT_AUTH_REDIRECT = '/account';

type RedirectValue = string | string[] | undefined;

function firstValue(value: RedirectValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/sign-in' ||
    pathname.startsWith('/sign-in/') ||
    pathname === '/sign-up' ||
    pathname.startsWith('/sign-up/')
  );
}

/**
 * Clerk accepts absolute `redirect_url` values, so reduce them to a local path
 * before giving the destination back to the browser. This preserves deep links
 * without turning the auth surface into an open redirect.
 */
export function resolveAuthRedirect(
  value: RedirectValue,
  requestOrigin: string,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  const candidate = firstValue(value)?.trim();
  if (!candidate) return fallback;

  try {
    const origin = new URL(requestOrigin).origin;
    if (/^\/[\\/]/.test(candidate)) return fallback;

    const destination = new URL(candidate, origin);
    if (destination.origin !== origin || isAuthRoute(destination.pathname)) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

type HeaderReader = Pick<Headers, 'get'>;

export function resolveAuthRequestOrigin(headers: HeaderReader, fallbackUrl: string): string {
  const forwardedHost = headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || headers.get('host')?.trim();
  if (!host) return new URL(fallbackUrl).origin;

  const forwardedProtocol = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProtocol || (/^(localhost|127\.0\.0\.1|\[::1\])(?::|$)/i.test(host) ? 'http' : 'https');
  return new URL(`${protocol}://${host}`).origin;
}
