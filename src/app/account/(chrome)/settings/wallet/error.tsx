'use client';

import { useEffect } from 'react';
import { CircleAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Wallet route error boundary. Money pages must never blank the whole
 * app — a paid top-up is settled by the server-side reconciler on the
 * next successful load, so the recovery story is literally "reload".
 */
export default function WalletError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[wallet] route error', error);
  }, [error]);

  return (
    <Card className="mx-auto mt-10 max-w-md">
      <CardContent className="grid place-items-center gap-3 px-6 py-10 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <CircleAlert className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium">Something went wrong loading your wallet.</p>
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">
          Your balance and any completed payments are safe — if a top-up was paid, it is
          credited automatically when the page loads again.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => reset()}>
          <RotateCcw /> Reload wallet
        </Button>
      </CardContent>
    </Card>
  );
}
