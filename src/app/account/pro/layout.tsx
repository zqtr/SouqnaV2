import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import '@/app/globals.css';
import { fontVariables } from '@/lib/fonts';
import { defaultLocale, direction, isLocale } from '@/i18n/locales';

export const metadata: Metadata = {
  title: 'Souqna Pro Studio',
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProStudioLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = storedLocale && isLocale(storedLocale) ? storedLocale : defaultLocale;

  return (
    <html lang={locale} dir={direction[locale]} className={fontVariables}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
