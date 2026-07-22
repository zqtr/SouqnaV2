'use client';

import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { souqnaClerkAppearance } from '@/components/blocks/auth-clerk-appearance';
import type { Locale } from '@/i18n/locales';

type ClientClerkAuthProps = {
  mode: 'sign-in' | 'sign-up';
  locale: Locale;
  postAuthRedirect: string;
  publishableKey?: string;
};

type ClerkAuthContentProps = Omit<ClientClerkAuthProps, 'publishableKey'>;

function ClerkAuthContent({ mode, locale, postAuthRedirect }: ClerkAuthContentProps) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      window.location.replace(postAuthRedirect);
    }
  }, [isLoaded, isSignedIn, postAuthRedirect]);

  if (isLoaded && isSignedIn) {
    return (
      <div role="status" aria-live="polite" className="min-h-[230px] py-8 text-sm">
        {locale === 'ar' ? 'جارٍ نقلك إلى حسابك…' : 'Taking you to your account…'}
      </div>
    );
  }

  if (mode === 'sign-in') {
    return (
      <SignIn
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/account"
        forceRedirectUrl={postAuthRedirect}
        appearance={souqnaClerkAppearance}
      />
    );
  }

  return (
    <SignUp
      signInUrl="/sign-in"
      fallbackRedirectUrl="/account"
      forceRedirectUrl={postAuthRedirect}
      appearance={souqnaClerkAppearance}
      unsafeMetadata={{
        notificationConsent: true,
        notificationChannels: ['bell', 'mobile', 'phone'],
        phoneRequiredReason: 'whatsapp_notifications',
      }}
    />
  );
}

export function ClientClerkAuth({
  mode,
  locale,
  postAuthRedirect,
  publishableKey,
}: ClientClerkAuthProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div aria-hidden className="min-h-[230px]" />;
  }

  if (!publishableKey) {
    return (
      <div
        role="status"
        className="rounded-[9px] border border-[rgba(255,190,138,0.24)] bg-black/25 px-4 py-3 text-[12px] leading-5 text-current"
      >
        Authentication is not configured for this local session.
      </div>
    );
  }

  return <ClerkAuthContent mode={mode} locale={locale} postAuthRedirect={postAuthRedirect} />;
}
