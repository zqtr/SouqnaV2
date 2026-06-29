'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CATEGORIES, type Category } from '@/lib/apps/souqnasource/types';
import { Button } from '@/components/ui/button';

export function CategoryTree({
  current,
}: {
  current: Category;
  locale: 'en' | 'ar';
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations('apps.souqnasource.categories');
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {CATEGORIES.map((c) => {
        const active = c === current;
        return (
          <li key={c}>
            <Button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(sp.toString());
                next.set('tab', 'browse');
                next.set('category', c);
                router.push(`?${next.toString()}`);
              }}
              variant="ghost"
              size="sm"
              className={
                active
                  ? 'h-8 w-full justify-start rounded-md bg-[color:color-mix(in_srgb,var(--ink-strong)_8%,transparent)] px-2.5 text-[color:var(--ink-strong)] hover:bg-[color:color-mix(in_srgb,var(--ink-strong)_10%,transparent)]'
                  : 'h-8 w-full justify-start rounded-md px-2.5 text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-bg)] hover:text-[color:var(--ink-strong)]'
              }
            >
              {t(c)}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
