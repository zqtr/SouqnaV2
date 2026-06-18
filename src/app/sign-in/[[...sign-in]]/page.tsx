import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AuthPageClient } from '@/components/auth/AuthPageClient';
import { defaultLocale, isLocale } from '@/i18n/locales';

export const metadata: Metadata = {
  title: 'Sign in · Souqna',
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return <AuthPageClient mode="sign-in" locale={locale} />;
}
