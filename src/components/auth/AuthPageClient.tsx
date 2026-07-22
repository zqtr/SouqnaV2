'use client';

import { useEffect, useState } from 'react';
import { Auth3 } from '@/components/auth-3';
import { ClientClerkAuth } from '@/components/auth/ClientClerkAuth';
import type { Locale } from '@/i18n/locales';

type AuthPageClientProps = {
  mode: 'sign-in' | 'sign-up';
  locale: Locale;
  postAuthRedirect: string;
  publishableKey?: string;
};

export function AuthPageClient({
  mode,
  locale,
  postAuthRedirect,
  publishableKey,
}: AuthPageClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <main aria-hidden className="min-h-dvh" />;
  }

  return (
    <Auth3 mode={mode} locale={locale}>
      <ClientClerkAuth
        mode={mode}
        locale={locale}
        postAuthRedirect={postAuthRedirect}
        publishableKey={publishableKey}
      />
    </Auth3>
  );
}
