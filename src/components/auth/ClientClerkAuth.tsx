'use client';

import { ClerkProvider, SignIn, SignUp } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { souqnaClerkAppearance } from '@/components/blocks/auth-clerk-appearance';
import type { Locale } from '@/i18n/locales';
import { clerkLocalization } from '@/lib/clerkLocalization';

type ClientClerkAuthProps = {
  mode: 'sign-in' | 'sign-up';
  locale: Locale;
  publishableKey?: string;
};

export function ClientClerkAuth({ mode, locale, publishableKey }: ClientClerkAuthProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div aria-hidden className="min-h-[230px]" />;
  }

  if (mode === 'sign-in') {
    return (
      <ClerkProvider
        appearance={souqnaClerkAppearance}
        localization={clerkLocalization(locale)}
        publishableKey={publishableKey}
      >
        <SignIn
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/account"
          appearance={souqnaClerkAppearance}
        />
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider
      appearance={souqnaClerkAppearance}
      localization={clerkLocalization(locale)}
      publishableKey={publishableKey}
    >
      <SignUp
        signInUrl="/sign-in"
        fallbackRedirectUrl="/account"
        appearance={souqnaClerkAppearance}
        unsafeMetadata={{
          notificationConsent: true,
          notificationChannels: ['bell', 'mobile', 'phone'],
          phoneRequiredReason: 'whatsapp_notifications',
        }}
      />
    </ClerkProvider>
  );
}
