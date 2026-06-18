'use client';

import { SignIn, SignUp } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { souqnaClerkAppearance } from '@/components/blocks/auth-clerk-appearance';

type ClientClerkAuthProps = {
  mode: 'sign-in' | 'sign-up';
};

export function ClientClerkAuth({ mode }: ClientClerkAuthProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div aria-hidden className="min-h-[230px]" />;
  }

  if (mode === 'sign-in') {
    return (
      <SignIn
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/account"
        appearance={souqnaClerkAppearance}
      />
    );
  }

  return (
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
  );
}
