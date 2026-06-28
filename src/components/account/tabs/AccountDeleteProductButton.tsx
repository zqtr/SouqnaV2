'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';

import { deleteProduct } from '@/app/actions/products';
import { adminPhrase } from '@/components/admin/adminLocale';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';

type Props = {
  slug: string;
  locale: Locale;
  productId: string;
  productTitle: string;
};

export function AccountDeleteProductButton({
  slug,
  locale,
  productId,
  productTitle,
}: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const removeLabel = adminPhrase(locale, 'Remove');
  const actionLabel = `${removeLabel}: ${productTitle}`;

  function onClick() {
    if (pending) return;
    if (!window.confirm(`Remove "${productTitle}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteProduct({ slug, locale, id: productId });
      if (result.status === 'success') {
        router.refresh();
      } else if (result.status === 'error') {
        window.alert(result.message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={pending}
      aria-label={actionLabel}
      title={actionLabel}
      className="h-7 w-7 rounded-md border border-transparent text-muted-foreground hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-700 focus-visible:ring-red-500/25 dark:hover:text-red-400"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="sr-only">{actionLabel}</span>
    </Button>
  );
}
