import { cookies } from 'next/headers';
import '@/app/globals.css';
import { fontVariables } from '@/lib/fonts';
import { defaultLocale, direction, isLocale } from '@/i18n/locales';

export default async function ProLivePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = storedLocale && isLocale(storedLocale) ? storedLocale : defaultLocale;

  return (
    <html lang={locale} dir={direction[locale]} className={fontVariables}>
      <body style={{ margin: 0, minHeight: '100dvh' }}>{children}</body>
    </html>
  );
}
