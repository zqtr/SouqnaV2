'use client';

import { useState, type ComponentType } from 'react';
import { BadgeCheck, Eye, Gift, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfferModal1 } from '@/components/offer-modal1';
import { OfferModal5 } from '@/components/offer-modal5';
import { ProductQuickView7 } from '@/components/product-quick-view7';
import { ProductQuickView8 } from '@/components/product-quick-view8';

type PortalPreviewId = 'offer1' | 'offer5' | 'quick7' | 'quick8';

type PortalPreview = {
  id: PortalPreviewId;
  title: string;
  titleAr: string;
  summary: string;
  icon: typeof Gift;
  Component: ComponentType<Record<string, unknown>>;
};

const portalPreviews: PortalPreview[] = [
  {
    id: 'offer1',
    title: 'offer-modal1',
    titleAr: 'عرض منبثق 1',
    summary: 'Bottom offer capture modal.',
    icon: Gift,
    Component: OfferModal1 as ComponentType<Record<string, unknown>>,
  },
  {
    id: 'offer5',
    title: 'offer-modal5',
    titleAr: 'عرض منبثق 5',
    summary: 'Side-sheet campaign offer.',
    icon: BadgeCheck,
    Component: OfferModal5 as ComponentType<Record<string, unknown>>,
  },
  {
    id: 'quick7',
    title: 'product-quick-view7',
    titleAr: 'عرض سريع 7',
    summary: 'Full buying quick-view modal.',
    icon: ShoppingBag,
    Component: ProductQuickView7 as ComponentType<Record<string, unknown>>,
  },
  {
    id: 'quick8',
    title: 'product-quick-view8',
    titleAr: 'عرض سريع 8',
    summary: 'Compact media-first quick view.',
    icon: Eye,
    Component: ProductQuickView8 as ComponentType<Record<string, unknown>>,
  },
];

export function PortalPreviewLauncher() {
  const [active, setActive] = useState<{ id: PortalPreviewId; instance: number } | null>(null);
  const activePreview = active ? portalPreviews.find((preview) => preview.id === active.id) : null;
  const ActiveComponent = activePreview?.Component;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {portalPreviews.map(({ id, title, titleAr, summary, icon: Icon }) => (
        <article key={id} className="rounded-lg border border-[#d8c09a] bg-[#fff8ec] p-5">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#261f17] text-[#d8b464]">
              <Icon className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-[#efe0c6] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#7f2f3a]">
              actual modal
            </span>
          </div>
          <h3 className="text-xl font-black leading-tight text-[#261f17]">{title}</h3>
          <p className="mt-1 text-sm font-bold text-[#7a6348]" dir="rtl">
            {titleAr}
          </p>
          <p className="mt-4 text-sm font-semibold leading-6 text-[#6a5740]">{summary}</p>
          <Button
            type="button"
            className="mt-5 w-full rounded-full bg-[#7f2f3a] text-white hover:bg-[#682531]"
            onClick={() => setActive({ id, instance: Date.now() })}
          >
            Open actual component
          </Button>
        </article>
      ))}
      {ActiveComponent ? <ActiveComponent key={`${activePreview?.id}-${active?.instance}`} /> : null}
    </div>
  );
}
