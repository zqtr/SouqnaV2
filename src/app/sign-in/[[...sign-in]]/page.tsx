import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthPageClient } from '@/components/auth/AuthPageClient';
import { defaultLocale, isLocale } from '@/i18n/locales';
import { resolveAuthRedirect, resolveAuthRequestOrigin } from '@/lib/authRedirect';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Sign in · Souqna',
  robots: { index: false, follow: false },
};

type SignInPageProps = {
  searchParams?: Promise<{ redirect_url?: string | string[] }>;
};

const EMPTY_SEARCH_PARAMS: { redirect_url?: string | string[] } = {};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [authState, requestHeaders, query] = await Promise.all([
    auth(),
    headers(),
    searchParams ?? Promise.resolve(EMPTY_SEARCH_PARAMS),
  ]);
  const requestOrigin = resolveAuthRequestOrigin(requestHeaders, env.NEXT_PUBLIC_SITE_URL);
  const postAuthRedirect = resolveAuthRedirect(query.redirect_url, requestOrigin);

  if (authState.userId) {
    redirect(postAuthRedirect);
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <AuthPageClient
      mode="sign-in"
      locale={locale}
      postAuthRedirect={postAuthRedirect}
      publishableKey={publishableKey}
    />
  );
}
