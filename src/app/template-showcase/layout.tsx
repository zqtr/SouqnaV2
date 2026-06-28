import { Suspense, type ReactNode } from 'react';
import { cookies } from 'next/headers';
import '@/app/globals.css';
import { NavigationLoader } from '@/components/system/NavigationLoader';
import { ThemeInitScript, getServerTheme } from '@/components/theme/ServerThemeScript';
import { defaultLocale, direction, isLocale } from '@/i18n/locales';
import { fontVariables } from '@/lib/fonts';

export default async function TemplateShowcaseLayout({ children }: { children: ReactNode }) {
  const [theme, cookieStore] = await Promise.all([getServerTheme(), cookies()]);
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return (
    <html
      lang={locale}
      dir={direction[locale]}
      className={fontVariables}
      data-theme={theme}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-dvh bg-[#f5ead6] text-[#261f17] antialiased">
        {children}
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
      </body>
    </html>
  );
}
