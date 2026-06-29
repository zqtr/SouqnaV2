'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function BrowseFilters({
  current,
}: {
  current: Record<string, string | undefined>;
  locale: 'en' | 'ar';
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useTranslations('apps.souqnasource.browse.filters');

  function patch(k: string, v: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (v === null) next.delete(k);
    else next.set(k, v);
    router.push(`?${next.toString()}`);
  }

  const activeType = current.type ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <ChipButton active={activeType === null} onClick={() => patch('type', null)}>
          {t('type.all')}
        </ChipButton>
        <ChipButton
          active={activeType === 'priced'}
          onClick={() => patch('type', 'priced')}
        >
          {t('type.priced')}
        </ChipButton>
        <ChipButton
          active={activeType === 'contact'}
          onClick={() => patch('type', 'contact')}
        >
          {t('type.contact')}
        </ChipButton>
      </div>
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 12,
          color: 'var(--ink-muted)',
        }}
      >
        <span>{t('trustAtLeast')}</span>
        <input
          type="number"
          min={0}
          max={10}
          step={0.5}
          defaultValue={current.trust ?? '0'}
          onChange={(e) => patch('trust', e.target.value)}
          style={{
            width: 80,
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid var(--surface-rule)',
            background: 'var(--surface-bg)',
            color: 'var(--ink-strong)',
            fontSize: 13,
          }}
        />
      </label>
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant={active ? 'default' : 'outline'}
      size="xs"
      className={
        active
          ? 'h-7 rounded-md border border-[color:var(--ink-strong)] bg-[color:var(--ink-strong)] px-2.5 text-[color:var(--surface-bg)] hover:bg-[color:color-mix(in_srgb,var(--ink-strong)_88%,transparent)]'
          : 'h-7 rounded-md border-[color:var(--surface-rule)] bg-transparent px-2.5 text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-bg)] hover:text-[color:var(--ink-strong)]'
      }
    >
      {children}
    </Button>
  );
}
