import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ClientClerkAuth } from '@/components/auth/ClientClerkAuth';
import { Auth3 } from '@/components/auth-3';
import { defaultLocale, isLocale } from '@/i18n/locales';

export const metadata: Metadata = {
  title: 'Create account · Souqna',
  robots: { index: false, follow: false },
};

export default async function SignUpPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return (
    <Auth3 mode="sign-up" locale={locale}>
      <ClientClerkAuth mode="sign-up" locale={locale} />
    </Auth3>
  );
}
