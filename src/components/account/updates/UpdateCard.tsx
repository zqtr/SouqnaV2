'use client';
/* eslint-disable @next/next/no-img-element */

import { CalendarDays, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { AccountUpdateView } from './types';

type UpdateCardProps = {
  update: AccountUpdateView;
  onViewDetails: () => void;
  locale?: 'en' | 'ar';
  titleId?: string;
};

function formatDate(value: string, locale: 'en' | 'ar') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-QA' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

const typeLabels: Record<'en' | 'ar', Record<AccountUpdateView['type'], string>> = {
  en: {
    feature: 'Feature',
    billing: 'Billing',
    system: 'System',
    warning: 'Important',
  },
  ar: {
    feature: 'Ù…ÙŠØ²Ø©',
    billing: 'Ø§Ù„ÙÙˆØªØ±Ø©',
    system: 'Ø§Ù„Ù†Ø¸Ø§Ù…',
    warning: 'Ù…Ù‡Ù…',
  },
};

const cardCopy = {
  en: {
    unread: 'Unread',
    read: 'Read',
    preview: 'Souqna preview',
    builder: 'Builder actions',
    products: 'Product options',
    plans: 'Growth tools',
    push: 'Souqna update',
    account: 'Account inbox',
  },
  ar: {
    unread: 'ØºÙŠØ± Ù…Ù‚Ø±ÙˆØ¡',
    read: 'مقروء',
    preview: 'Ù…Ø¹Ø§ÙŠÙ†Ø© Ø³ÙˆÙ‚Ù†Ø§',
    builder: 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ø¨Ù†Ø§Ø¡',
    products: 'Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª',
    plans: 'Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ù†Ù…Ùˆ',
    push: 'ØªØ­Ø¯ÙŠØ« Ø³ÙˆÙ‚Ù†Ø§',
    account: 'ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„Ø­Ø³Ø§Ø¨',
  },
} as const;

export function UpdateCard({ update, locale = 'en', titleId }: UpdateCardProps) {
  const copy = cardCopy[locale];
  const localizedUpdate = localizeUpdate(update, locale);
  const badge = localizedUpdate.badge ?? typeLabels[locale][update.type];

  return (
    <article className="overflow-hidden rounded-lg border border-[#29252a] bg-[#141316] shadow-[0_34px_95px_rgba(0,0,0,0.42)]">
      <UpdateVisual update={localizedUpdate} locale={locale} />

      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 pb-6 pt-5 text-center sm:px-8 sm:pb-7">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8b56b]/25 bg-[#d8b56b]/10 px-3 py-1 text-xs font-semibold text-[#e8d6b8]">
            <Sparkles className="h-3.5 w-3.5 text-[#5f7cff]" aria-hidden="true" />
            {update.readAt ? copy.read : copy.unread}
          </span>
          <span className="rounded-full border border-[#5f7cff]/25 bg-[#5f7cff]/10 px-3 py-1 text-xs font-semibold text-[#b9c6ff]">
            {badge}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#8f8790]">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(update.publishedAt, locale)}
          </span>
        </div>

        <h2
          id={titleId}
          dir="auto"
          className="text-2xl font-semibold leading-tight tracking-normal text-[#f8efdf] sm:text-3xl"
        >
          {localizedUpdate.title}
        </h2>
        <p dir="auto" className="mt-3 max-w-xl text-sm leading-7 text-[#a9a1aa] sm:text-base">
          {localizedUpdate.summary ?? localizedUpdate.body}
        </p>

        {localizedUpdate.body &&
        localizedUpdate.summary &&
        localizedUpdate.body !== localizedUpdate.summary ? (
          <p
            dir="auto"
            className="mt-5 max-w-2xl rounded-lg border border-[#2b262b] bg-[#0f0e10] px-5 py-3 text-sm leading-7 text-[#d8cec0]"
          >
            {localizedUpdate.body}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function localizeUpdate(update: AccountUpdateView, locale: 'en' | 'ar'): AccountUpdateView {
  const i18n = update.previewPayload.i18n;
  if (!i18n || typeof i18n !== 'object' || Array.isArray(i18n)) return update;
  const localized = (i18n as Record<string, unknown>)[locale];
  if (!localized || typeof localized !== 'object' || Array.isArray(localized)) return update;
  const copy = localized as Record<string, unknown>;
  return {
    ...update,
    title: localizedText(copy.title) ?? update.title,
    body: localizedText(copy.body) ?? update.body,
    summary: localizedText(copy.summary) ?? update.summary,
    badge: localizedText(copy.badge) ?? update.badge,
  };
}

function localizedText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function UpdateVisual({ update, locale }: { update: AccountUpdateView; locale: 'en' | 'ar' }) {
  const mediaAlt = update.summary ?? update.title;
  const kind = typeof update.previewPayload.kind === 'string' ? update.previewPayload.kind : '';
  const screenshots = getScreenshotSources(update.previewPayload);

  if (screenshots.length > 1) {
    return <ScreenshotCollageVisual screenshots={screenshots} alt={mediaAlt} />;
  }

  if (update.imageUrl) {
    return (
      <div className="relative aspect-[16/6] w-full overflow-hidden border-b border-[#29252a] bg-[#080709]">
        <img src={update.imageUrl} alt={mediaAlt} className="h-full w-full object-cover" />
        <VisualShade />
      </div>
    );
  }

  if (update.videoUrl) {
    return (
      <div className="relative aspect-[16/6] w-full overflow-hidden border-b border-[#29252a] bg-[#080709]">
        <video src={update.videoUrl} className="h-full w-full object-cover" controls playsInline />
      </div>
    );
  }

  if (kind === 'builder-menu') return <BuilderMenuVisual locale={locale} />;
  if (kind === 'product-options') return <ProductOptionsVisual locale={locale} />;
  if (kind === 'storage-library') return <StorageVisual locale={locale} />;
  if (kind === 'push' || kind === 'souqna-update') {
    return <SouqnaUpdateVisual update={update} locale={locale} />;
  }
  return <SouqnaVisual update={update} locale={locale} />;
}

function getScreenshotSources(payload: Record<string, unknown>) {
  const value = payload.screenshots;
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().startsWith('/'))
    .map((item) => item.trim())
    .slice(0, 3);
}

function ScreenshotCollageVisual({ screenshots, alt }: { screenshots: string[]; alt: string }) {
  const primary = screenshots[0]!;
  const secondary = screenshots.slice(1);

  return (
    <div className="relative aspect-[16/6] overflow-hidden border-b border-[#29252a] bg-[#080709] p-3 sm:p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_6%,rgba(216,181,107,0.16),transparent_34%),radial-gradient(circle_at_78%_10%,rgba(95,124,255,0.18),transparent_32%)]" />
      <div className="relative grid h-full grid-cols-[1.25fr_0.95fr] gap-2 overflow-hidden rounded-lg border border-[#3a3238] bg-[#0f0e10] p-2 shadow-[0_22px_90px_rgba(0,0,0,0.46)] sm:gap-3 sm:p-3">
        <ScreenshotFrame src={primary} alt={`${alt} KPI dashboard`} />
        <div
          className={`grid min-h-0 gap-2 sm:gap-3 ${secondary.length > 1 ? 'grid-rows-2' : 'grid-rows-1'}`}
        >
          {secondary.map((src, index) => (
            <ScreenshotFrame key={src} src={src} alt={`${alt} preview ${index + 2}`} />
          ))}
        </div>
      </div>
      <VisualShade />
    </div>
  );
}

function ScreenshotFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative min-h-0 overflow-hidden rounded-md border border-[#2b272c] bg-[#171619]">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 440px, 90vw"
        className="object-contain"
      />
    </div>
  );
}

function BuilderMenuVisual({ locale }: { locale: 'en' | 'ar' }) {
  const isAr = locale === 'ar';
  const menuItems = isAr
    ? ['Ø¹Ø±Ø¶ Ø§Ù„Ù…ØªØ¬Ø± â†—', 'Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª', 'Ù…Ù„Ù Ø§Ù„Ù…ØªØ¬Ø±', 'Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ', 'Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ù…Ø³ÙˆØ¯Ù‘Ø©']
    : [
        'View live â†—',
        'Products',
        'Storefront profile',
        'Reset to template defaults',
        'Discard draft',
      ];

  return (
    <div className="relative aspect-[16/6] overflow-hidden border-b border-[#29252a] bg-[#080709] p-4 sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(95,124,255,0.18),transparent_34%),radial-gradient(circle_at_78%_0%,rgba(216,181,107,0.14),transparent_30%)]" />
      <div className="relative h-full overflow-hidden rounded-lg border border-[#3a3238] bg-[#171619] shadow-[0_20px_80px_rgba(0,0,0,0.42)]">
        <div className="flex h-11 items-center justify-between border-b border-[#2b272c] bg-[#202024] px-4">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-[#e8d6b8]" />
            <span className="h-3 w-20 rounded-full bg-[#e8d6b8]/25" />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-7 w-20 rounded-full bg-[#e8d6b8]" />
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[#d8b56b]/35 text-[#d8b56b]">
              ...
            </span>
          </div>
        </div>
        <div className="grid h-[calc(100%-44px)] grid-cols-[130px_minmax(0,1fr)] gap-4 p-4">
          <div className="space-y-2 rounded-lg border border-[#2b272c] bg-[#111013] p-3">
            {['Hero', 'Banner', 'Products', 'Footer'].map((label) => (
              <span key={label} className="block h-8 rounded-md bg-[#e8d6b8]/10" />
            ))}
          </div>
          <div className="relative rounded-lg border border-[#d8b56b]/25 bg-[#f8efdf] p-5">
            <div className="h-full rounded-md bg-[linear-gradient(135deg,#f8efdf,#e8d6b8)]" />
            <div
              className={`absolute top-5 w-56 overflow-hidden rounded-lg border border-[#343038] bg-[#171619] shadow-[0_18px_55px_rgba(0,0,0,0.55)] ${
                isAr ? 'left-5 text-right' : 'right-5 text-left'
              }`}
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {menuItems.map((item, index) => (
                <div
                  key={item}
                  className={`px-4 py-3 text-sm font-semibold ${
                    index >= menuItems.length - 2 ? 'text-[#e68a8a]' : 'text-[#f8efdf]'
                  } ${index === 0 ? 'bg-[#242329]' : ''}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <VisualShade />
    </div>
  );
}

function ProductOptionsVisual({ locale }: { locale: 'en' | 'ar' }) {
  const isAr = locale === 'ar';
  return (
    <div className="relative aspect-[16/6] overflow-hidden border-b border-[#29252a] bg-[#080709] p-4 sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(216,181,107,0.16),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(95,124,255,0.14),transparent_34%)]" />
      <div className="relative mx-auto h-full max-w-2xl overflow-hidden rounded-lg border border-[#3a3238] bg-[#f8efdf] p-5 shadow-[0_22px_90px_rgba(0,0,0,0.46)]">
        <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="rounded-lg bg-[linear-gradient(135deg,#f8efdf,#d8b56b)] p-4">
            <div className="h-full rounded-lg bg-[#471d24]/90" />
          </div>
          <div className="flex flex-col justify-end gap-4" dir={isAr ? 'rtl' : 'ltr'}>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7b6259]">
                {isAr ? 'Ù…Ù†ØªØ¬' : 'Product'}
              </span>
              <div className="mt-2 h-6 w-36 rounded-full bg-[#471d24]" />
            </div>
            <div className="rounded-2xl border border-[#d8b56b] bg-[#fffaf1] p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b6259]">
                    {isAr ? 'Ø§Ù„Ù…Ù‚Ø§Ø³' : 'Size'}
                  </span>
                  <div className="mt-1 h-9 rounded-lg border border-[#d8b56b] bg-white" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b6259]">
                    {isAr ? 'Ø§Ù„Ø·ÙˆÙ„' : 'Height'}
                  </span>
                  <div className="mt-1 h-9 rounded-lg border border-[#d8b56b] bg-white" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-2xl font-bold text-[#171619]">200 QAR</div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#471d24] text-[#fff8ed]">
                <span className="h-5 w-5 rounded-md border border-current" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <VisualShade />
    </div>
  );
}

function StorageVisual({ locale }: { locale: 'en' | 'ar' }) {
  const isAr = locale === 'ar';
  return (
    <div className="relative aspect-[16/6] overflow-hidden border-b border-[#29252a] bg-[#080709] p-4 sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(216,181,107,0.18),transparent_32%),radial-gradient(circle_at_82%_2%,rgba(95,124,255,0.16),transparent_34%)]" />
      <div className="relative mx-auto grid h-full max-w-2xl grid-cols-[0.95fr_1.05fr] gap-4 overflow-hidden rounded-lg border border-[#3a3238] bg-[#111013] p-4 shadow-[0_22px_90px_rgba(0,0,0,0.46)]">
        <div className="flex flex-col justify-between rounded-lg border border-[#d8b56b]/25 bg-[#171619] p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d8b56b]">
              {isAr ? 'ØªØ®Ø²ÙŠÙ† Ø³ÙˆÙ‚Ù†Ø§' : 'Souqna Storage'}
            </div>
            <div className="mt-3 text-2xl font-semibold text-[#f8efdf]">1GB</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#2b272c]">
              <span className="block h-full w-[18%] rounded-full bg-[#d8b56b]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
              <span
                key={item}
                className="aspect-square rounded-md border border-[#3a3238] bg-[linear-gradient(135deg,#2b272c,#d8b56b_120%)]"
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[#d8b56b]/35 bg-[#d8b56b]/10 text-2xl text-[#d8b56b]">
            +
          </div>
          <div className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#d8b56b]">
            {isAr ? 'ØµÙˆØ± Ù…Ø®ØµØµØ©' : 'Custom pictures'}
          </div>
          <div className="mx-auto mt-3 max-w-sm text-center text-xl font-semibold text-[#f8efdf]">
            {isAr ? 'Ø§Ø±ÙØ¹ Ø§Ù„ØµÙˆØ± ÙˆØ§Ø³ØªØ®Ø¯Ù…Ù‡Ø§ ÙÙŠ Ø§Ù„Ø¨Ù†Ù‘Ø§Ø¡' : 'Upload once and reuse in Builder'}
          </div>
        </div>
      </div>
      <VisualShade />
    </div>
  );
}

function SouqnaUpdateVisual({
  update,
  locale,
}: {
  update: AccountUpdateView;
  locale: 'en' | 'ar';
}) {
  return (
    <div className="relative aspect-[16/6] overflow-hidden border-b border-[#29252a] bg-[#080709] p-4 sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(216,181,107,0.16),transparent_34%),radial-gradient(circle_at_78%_6%,rgba(95,124,255,0.18),transparent_32%)]" />
      <div className="relative h-full overflow-hidden rounded-lg border border-[#3a3238] bg-[#141316] shadow-[0_20px_80px_rgba(0,0,0,0.42)]">
        <div className="flex h-11 items-center justify-between border-b border-[#2b272c] bg-[#202024] px-4">
          <span className="h-6 w-24 rounded-full bg-[#e8d6b8]/20" />
          <span className="h-7 w-28 rounded-full bg-[#e8d6b8]" />
        </div>
        <div className="grid h-[calc(100%-44px)] grid-cols-[0.8fr_1.2fr] gap-4 p-4">
          <div className="rounded-lg border border-[#2b272c] bg-[#111013] p-3">
            <div className="h-full rounded-md bg-[linear-gradient(135deg,rgba(216,181,107,0.2),rgba(95,124,255,0.16))]" />
          </div>
          <div
            className="flex flex-col justify-center text-center"
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl border border-[#d8b56b]/35 bg-[#d8b56b]/10" />
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d8b56b]">
              {locale === 'ar' ? 'ØªØ­Ø¯ÙŠØ« Ø³ÙˆÙ‚Ù†Ø§' : 'Souqna update'}
            </div>
            <div dir="auto" className="mx-auto mt-3 max-w-sm text-xl font-semibold text-[#f8efdf]">
              {update.badge ?? update.title}
            </div>
          </div>
        </div>
      </div>
      <VisualShade />
    </div>
  );
}

function SouqnaVisual({ update, locale }: { update: AccountUpdateView; locale: 'en' | 'ar' }) {
  return (
    <div className="relative aspect-[16/6] overflow-hidden border-b border-[#29252a] bg-[#080709] p-4 sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_8%,rgba(216,181,107,0.16),transparent_32%),radial-gradient(circle_at_82%_0%,rgba(95,124,255,0.16),transparent_34%)]" />
      <div className="relative grid h-full place-items-center rounded-lg border border-[#3a3238] bg-[#141316]">
        <div className="text-center">
          <div className="mx-auto mb-5 h-14 w-14 rounded-2xl border border-[#d8b56b]/40 bg-[#d8b56b]/12" />
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d8b56b]">
            {cardCopy[locale].preview}
          </div>
          <div dir="auto" className="mt-3 max-w-md text-2xl font-semibold text-[#f8efdf]">
            {update.badge ?? update.title}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualShade() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#141316] to-transparent"
    />
  );
}
