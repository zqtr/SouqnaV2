import { Suspense, type ReactNode } from 'react';
import '@/app/globals.css';
import { fontVariables } from '@/lib/fonts';
import { direction } from '@/i18n/locales';
import { getStorefront } from '@/lib/brief';
import { ThemeInitScript } from '@/components/theme/ServerThemeScript';
import type { Theme } from '@/lib/theme';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { NavigationLoader } from '@/components/system/NavigationLoader';

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * Brief subdomain layout. Lives outside the [locale] tree because the
 * middleware rewrites {slug}.souqna.qa/* here. We honor the brief's stored
 * locale at the <html> level so screen readers, bidi engines, and the
 * browser's font picker behave correctly.
 */
export default async function BriefLayout({ children, params }: Props) {
  const { slug } = await params;
  let lang: 'en' | 'ar' = 'en';
  let forcedTheme: Theme | null = null;
  try {
    const data = await getStorefront(slug);
    if (data) {
      lang = data.locale;
      const behaviour = data.themeOverrides.themeBehaviour;
      forcedTheme = behaviour === 'light' || behaviour === 'dark' ? behaviour : null;
    }
  } catch {
    // Fall back to en if DB is unreachable; the page itself will show 404 / error.
  }

  // Storefronts are a fixed, merchant-branded experience and must NOT track
  // the shopper's OS/cookie theme. If they did, a dark-mode visitor's first
  // load would flip <html data-theme="dark"> *after* SSR — activating the app's
  // dark layer (`dark:` utilities + dark ink) while the palette's --sf-* ground
  // stays the SSR-baked light cream, i.e. light text on a light background.
  // Lock to the merchant's explicit choice, defaulting to light. Dark templates
  // opt in via themeOverrides.themeBehaviour = 'dark'.
  const theme: Theme = forcedTheme ?? 'light';

  return (
    <html
      lang={lang}
      dir={direction[lang]}
      className={fontVariables}
      data-theme={theme}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript forcedTheme={theme} />
      </head>
      <body
        className="min-h-dvh antialiased"
        style={{ background: 'var(--surface-bg)', color: 'var(--ink-strong)' }}
      >
        <ThemeProvider>
          {children}
          <Suspense fallback={null}>
            <NavigationLoader />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
