'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function AuthHydrationBoundary({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div aria-hidden className="min-h-dvh" />;
  }

  return <>{children}</>;
}
