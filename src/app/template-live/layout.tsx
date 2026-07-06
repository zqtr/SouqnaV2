import { type ReactNode } from 'react';
import '@/app/globals.css';
import { ThemeInitScript, getServerTheme } from '@/components/theme/ServerThemeScript';
import { fontVariables } from '@/lib/fonts';

/**
 * Bare document for the public template live-preview.
 *
 * This route sits OUTSIDE the `[locale]` segment on purpose: it must
 * render a full-bleed storefront with NO marketing nav/footer chrome
 * (the `[locale]` layout injects both). Mirrors the pattern already used
 * by `src/app/template-showcase/layout.tsx`. The page inside renders the
 * real `<Storefront>`, which owns its own `dir`/RTL wrapper, so the
 * document can stay locale-neutral.
 */
export default async function TemplateLiveLayout({ children }: { children: ReactNode }) {
  const theme = await getServerTheme();
  return (
    <html
      lang="en"
      className={fontVariables}
      data-theme={theme}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
