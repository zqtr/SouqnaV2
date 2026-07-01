'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, Rocket, X } from 'lucide-react';

import { markAccountUpdateRead } from '@/app/actions/accountUpdates';
import { UpdateEmptyState } from './UpdateEmptyState';
import { UpdateProgress } from './UpdateProgress';
import { UpdateStack } from './UpdateStack';
import type { AccountUpdateView } from './types';
import { Button } from '@/components/ui/button';

type AccountUpdatesModalProps = {
  initialUpdates: AccountUpdateView[];
  locale?: 'en' | 'ar';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdateRead?: (updateId: string) => void;
  focusUpdateId?: string | null;
  autoOpen?: boolean;
};

const modalCopy = {
  en: {
    title: 'Souqna updates',
    subtitle: 'Product improvements and changelog notes.',
    close: 'Close updates',
    details: 'View details',
    footerTitle: 'Souqna just updated',
    gotIt: 'Done',
    next: 'Next',
    previous: 'Previous',
  },
  ar: {
    title: 'تحديثات سوقنا',
    subtitle: 'تحسينات المنتج وسجل التغييرات.',
    close: 'إغلاق التحديثات',
    details: 'عرض التفاصيل',
    footerTitle: 'تم تحديث سوقنا',
    gotIt: 'تم',
    next: 'التالي',
    previous: 'السابق',
  },
} as const;

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AccountUpdatesModal({
  initialUpdates,
  locale = 'en',
  open,
  onOpenChange,
  onUpdateRead,
  focusUpdateId = null,
  autoOpen = true,
}: AccountUpdatesModalProps) {
  const [updates, setUpdates] = useState(initialUpdates);
  const [index, setIndex] = useState(0);
  const [internalOpen, setInternalOpen] = useState(
    autoOpen && initialUpdates.some((update) => !update.readAt),
  );
  const [, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const subtitleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isControlled = open !== undefined;
  const modalOpen = isControlled ? open : internalOpen;
  const setModalOpen = useCallback(
    (value: boolean) => {
      if (isControlled) {
        onOpenChange?.(value);
      } else {
        setInternalOpen(value);
      }
    },
    [isControlled, onOpenChange],
  );

  const firstUnreadIndex = useMemo(() => {
    const unreadIndex = updates.findIndex((update) => !update.readAt);
    return unreadIndex >= 0 ? unreadIndex : 0;
  }, [updates]);
  const focusedIndex = useMemo(() => {
    if (!focusUpdateId) return null;
    const updateIndex = updates.findIndex((update) => update.id === focusUpdateId);
    return updateIndex >= 0 ? updateIndex : null;
  }, [focusUpdateId, updates]);

  const current = updates[index] ?? null;
  const detailsHref = current?.detailsHref ?? current?.ctaHref ?? null;
  const isLast = index >= updates.length - 1;
  const isFirst = index <= 0;
  const isRtl = locale === 'ar';
  const copy = modalCopy[locale];
  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  useEffect(() => {
    setUpdates(initialUpdates);
  }, [initialUpdates]);

  useEffect(() => {
    if (!modalOpen) return;
    setIndex(focusedIndex ?? firstUnreadIndex);
  }, [firstUnreadIndex, focusedIndex, modalOpen]);

  const markReadOptimistically = useCallback(
    (update: AccountUpdateView) => {
      if (update.readAt) return;
      const readAt = new Date().toISOString();
      setUpdates((value) =>
        value.map((item) => (item.id === update.id ? { ...item, readAt } : item)),
      );
      onUpdateRead?.(update.id);
      startTransition(() => {
        void markAccountUpdateRead(update.id);
      });
    },
    [onUpdateRead, startTransition],
  );

  const goNext = useCallback(() => {
    if (current) markReadOptimistically(current);
    if (!isLast) {
      setIndex((value) => Math.min(value + 1, updates.length - 1));
      return;
    }
    setModalOpen(false);
  }, [current, isLast, markReadOptimistically, setModalOpen, updates.length]);

  const goPrevious = useCallback(() => {
    setIndex((value) => Math.max(value - 1, 0));
  }, []);

  const viewDetails = useCallback(() => {
    if (!current || !detailsHref) return;
    markReadOptimistically(current);
    window.location.href = detailsHref;
  }, [current, detailsHref, markReadOptimistically]);

  const closeIfAllowed = useCallback(() => {
    if (current?.isSticky && !current.readAt) return;
    if (current) markReadOptimistically(current);
    setModalOpen(false);
  }, [current, markReadOptimistically, setModalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      focusables?.[0]?.focus();
    }, 0);
    return () => {
      window.clearTimeout(id);
      previousFocusRef.current?.focus?.();
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeIfAllowed();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (isRtl) goNext();
        else goPrevious();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (isRtl) goPrevious();
        else goNext();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => !element.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeIfAllowed, goNext, goPrevious, isRtl, modalOpen]);

  if (updates.length === 0 && !modalOpen) return null;

  return (
    <AnimatePresence>
      {modalOpen ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#080608]/75 px-3 py-5 backdrop-blur-xl sm:px-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={subtitleId}
            tabIndex={-1}
            dir={isRtl ? 'rtl' : 'ltr'}
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[#31282d] bg-[#121113] text-[#f8efdf] shadow-[0_42px_140px_rgba(0,0,0,0.62)] outline-none ring-1 ring-[#e8d6b8]/10"
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button
              type="button"
              onClick={closeIfAllowed}
              variant="outline"
              size="icon"
              className="absolute end-4 top-4 z-10 rounded-md border-[#e8d6b8]/15 bg-[#0d0c0e]/75 text-[#e8d6b8] backdrop-blur hover:border-[#d8b56b]/45 hover:bg-[#151214] hover:text-white"
              aria-label={copy.close}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>

            <span id={subtitleId} className="sr-only">
              {copy.subtitle}
            </span>

            {current ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="border-b border-[#29252a] px-5 py-4 text-center">
                    <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b56b]">
                      {copy.title}
                    </p>
                  </div>
                  <div className="grid items-center gap-3 px-3 py-4 sm:grid-cols-[44px_minmax(0,1fr)_44px] sm:px-4">
                    <CarouselArrow
                      label={copy.previous}
                      disabled={isFirst}
                      onClick={goPrevious}
                      className="hidden sm:inline-flex"
                    >
                      <PreviousIcon className="h-4 w-4" aria-hidden="true" />
                    </CarouselArrow>

                    <UpdateStack
                      update={current}
                      index={index}
                      total={updates.length}
                      onViewDetails={viewDetails}
                      locale={locale}
                      titleId={titleId}
                    />

                    <CarouselArrow
                      label={isLast ? copy.gotIt : copy.next}
                      onClick={goNext}
                      className="hidden sm:inline-flex"
                    >
                      <NextIcon className="h-4 w-4" aria-hidden="true" />
                    </CarouselArrow>
                  </div>
                </div>
                <div className="flex items-center justify-center border-t border-[#29252a] bg-[#121113] px-4 py-3">
                  <UpdateProgress index={index} total={updates.length} locale={locale} />
                </div>
                <footer className="flex flex-col gap-3 border-t border-[#29252a] bg-[#0d0c0e] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#f8efdf]">
                    <Rocket className="h-4 w-4 text-[#5f7cff]" aria-hidden="true" />
                    {copy.footerTitle}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <CarouselArrow label={copy.previous} disabled={isFirst} onClick={goPrevious}>
                      <PreviousIcon className="h-4 w-4" aria-hidden="true" />
                    </CarouselArrow>
                    {detailsHref ? (
                      <Button
                        type="button"
                        onClick={viewDetails}
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-md border-[#d8b56b]/35 bg-[#191619] px-3 text-[#e8d6b8] hover:border-[#d8b56b] hover:bg-[#21181a] hover:text-[#f8efdf]"
                      >
                        {copy.details}
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      onClick={goNext}
                      size="sm"
                      className="h-9 rounded-md bg-[#5f7cff] px-4 text-white shadow-[0_14px_35px_rgba(95,124,255,0.26)] hover:bg-[#718cff]"
                    >
                      {isLast ? copy.gotIt : copy.next}
                      <NextIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </footer>
              </>
            ) : (
              <UpdateEmptyState locale={locale} />
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CarouselArrow({
  children,
  label,
  disabled,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      variant="outline"
      size="icon"
      className={`rounded-md border-[#d8b56b]/25 bg-[#171417] text-[#e8d6b8] hover:border-[#d8b56b]/55 hover:bg-[#21181a] hover:text-[#f8efdf] disabled:pointer-events-none disabled:opacity-35 ${className}`}
    >
      {children}
    </Button>
  );
}
