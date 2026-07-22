import type { ReactNode } from 'react';
import { fontVariables } from '@/lib/fonts';

// TEMP dev-only layout: gives the no-auth studio preview <html>/<body> +
// the studio fonts. Delete with src/app/dev before shipping.
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={fontVariables}
      data-theme="dark"
      style={{ colorScheme: 'dark' }}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
