import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AuthPageClient } from '@/components/auth/AuthPageClient';
import { defaultLocale, isLocale } from '@/i18n/locales';

export const metadata: Metadata = {
  title: 'Create account · Souqna',
  robots: { index: false, follow: false },
};

export default async function SignUpPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return <AuthPageClient mode="sign-up" locale={locale} publishableKey={publishableKey} />;
}
