'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  CircleAlert,
  CreditCard,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  getMyWallet,
  pollWalletTopup,
  removeSavedCard,
  startWalletTopup,
} from '@/app/actions/wallet';
import type { WalletSavedCard } from '@/lib/wallet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';

type Locale = 'en' | 'ar';

/**
 * Wallet page island (shadcn edition).
 *
 * Three flows:
 *   1. top-up start → redirect to the SkipCash hosted page
 *   2. return from SkipCash (`pendingTopupId`) → poll until the webhook
 *      or the poll itself credits the wallet, then celebrate + refresh
 *   3. payment methods — cards SkipCash tokenized during a top-up;
 *      "Add payment method" runs a top-up (SkipCash saves the card on
 *      its hosted page, there is no card-entry form on our side).
 */

const PRESETS_QAR = [20, 50, 100, 200, 500] as const;

const COPY = {
  en: {
    balanceLabel: 'Available balance',
    currency: 'QAR',
    balanceHint: 'Spend instantly on small purchases — no checkout each time.',
    topupTitle: 'Top up',
    topupSubtitle: 'One SkipCash payment, verified with OTP.',
    amountLabel: 'Amount',
    payCta: (amount: number) => `Top up QAR ${amount}`,
    redirecting: 'Opening SkipCash…',
    secured: 'Secured by SkipCash · OTP verified',
    processing: 'Confirming your payment…',
    processingHint: 'This usually takes a few seconds.',
    succeeded: (amount: number) => `QAR ${amount} added to your wallet`,
    failed: 'The top-up was not completed. You were not charged.',
    expired: 'The top-up session expired. Please start again.',
    tryAgain: 'Try again',
    dismiss: 'Dismiss',
    methodsTitle: 'Payment methods',
    methodsSubtitle: 'Cards saved securely with SkipCash for faster top-ups.',
    addMethod: 'Add payment method',
    noCardsTitle: 'No saved cards yet',
    noCardsHint:
      'Tick “Save card” on the SkipCash payment page during a top-up and your card will appear here.',
    cardFallback: 'Card',
    expiresLabel: 'Expires',
    savedLabel: 'Saved',
    removeCard: 'Remove card',
    removeTitle: 'Remove this card?',
    removeBody:
      'The saved card is deleted from your wallet. You can add it again during any future top-up.',
    cancel: 'Cancel',
    remove: 'Remove',
    addDialogTitle: 'Add a card',
    addDialogBody:
      'Your card is entered and stored on SkipCash’s secure page — Souqna never sees the number.',
    addDialogVerify: (amount: number) =>
      `We add QAR ${amount} to your balance to verify and save the card. It’s yours to spend anytime.`,
    addDialogStep1: 'Enter your card on SkipCash',
    addDialogStep2: 'Tick “Save card”',
    addDialogStep3: 'It appears here for next time',
    continueCta: 'Continue to SkipCash',
    cardOnFile: 'Card on file',
  },
  ar: {
    balanceLabel: 'الرصيد المتاح',
    currency: 'ر.ق',
    balanceHint: 'أنفق فوراً على المشتريات الصغيرة — بدون خطوات دفع في كل مرة.',
    topupTitle: 'شحن الرصيد',
    topupSubtitle: 'دفعة واحدة عبر SkipCash مع تحقق OTP.',
    amountLabel: 'المبلغ',
    payCta: (amount: number) => `اشحن ${amount} ر.ق`,
    redirecting: 'جارٍ فتح SkipCash…',
    secured: 'محمي عبر SkipCash · تحقق برمز OTP',
    processing: 'جارٍ تأكيد الدفعة…',
    processingHint: 'يستغرق هذا عادةً بضع ثوانٍ.',
    succeeded: (amount: number) => `تمت إضافة ${amount} ر.ق إلى محفظتك`,
    failed: 'لم يكتمل الشحن. لم يتم خصم أي مبلغ.',
    expired: 'انتهت صلاحية جلسة الشحن. الرجاء المحاولة من جديد.',
    tryAgain: 'حاول مجدداً',
    dismiss: 'إغلاق',
    methodsTitle: 'طرق الدفع',
    methodsSubtitle: 'بطاقات محفوظة بأمان لدى SkipCash لشحن أسرع.',
    addMethod: 'أضف طريقة دفع',
    noCardsTitle: 'لا توجد بطاقات محفوظة بعد',
    noCardsHint:
      'فعّل خيار «حفظ البطاقة» في صفحة الدفع الخاصة بـ SkipCash أثناء الشحن وستظهر بطاقتك هنا.',
    cardFallback: 'بطاقة',
    expiresLabel: 'تنتهي',
    savedLabel: 'أضيفت',
    removeCard: 'إزالة البطاقة',
    removeTitle: 'إزالة هذه البطاقة؟',
    removeBody: 'ستُحذف البطاقة المحفوظة من محفظتك. يمكنك إضافتها مجدداً في أي شحن قادم.',
    cancel: 'إلغاء',
    remove: 'إزالة',
    addDialogTitle: 'إضافة بطاقة',
    addDialogBody:
      'تُدخل بطاقتك وتُحفظ في صفحة SkipCash الآمنة — لا ترى سوقنا رقم البطاقة أبداً.',
    addDialogVerify: (amount: number) =>
      `نضيف ${amount} ر.ق إلى رصيدك للتحقق من البطاقة وحفظها. المبلغ لك تنفقه متى شئت.`,
    addDialogStep1: 'أدخل بطاقتك في SkipCash',
    addDialogStep2: 'فعّل «حفظ البطاقة»',
    addDialogStep3: 'ستظهر هنا للمرة القادمة',
    continueCta: 'المتابعة إلى SkipCash',
    cardOnFile: 'بطاقة محفوظة',
  },
} as const;

type TopupPhase =
  | { name: 'idle' }
  | { name: 'starting' }
  | { name: 'confirming' }
  | { name: 'succeeded'; amountQar: number }
  | { name: 'failed'; reason: 'failed' | 'expired' | 'start_error'; message?: string };

export function WalletExperience({
  locale,
  initialBalanceQar,
  initialSavedCards,
  pendingTopupId,
}: {
  locale: Locale;
  initialBalanceQar: number;
  initialSavedCards: WalletSavedCard[];
  pendingTopupId: string | null;
}) {
  const t = COPY[locale];
  const isAr = locale === 'ar';
  const router = useRouter();
  const reduced = useReducedMotion();

  // Defensive defaults: a props mismatch during a rolling deploy must
  // degrade to an empty list, never crash the page (it holds the poll
  // that settles in-flight top-ups).
  const [balance, setBalance] = useState(
    Number.isFinite(initialBalanceQar) ? initialBalanceQar : 0,
  );
  const [savedCards, setSavedCards] = useState<WalletSavedCard[]>(
    Array.isArray(initialSavedCards) ? initialSavedCards : [],
  );
  const [selected, setSelected] = useState<number>(50);
  const [phase, setPhase] = useState<TopupPhase>(
    pendingTopupId ? { name: 'confirming' } : { name: 'idle' },
  );

  const refresh = useCallback(async () => {
    try {
      const wallet = await getMyWallet();
      setBalance(wallet.balanceQar);
      setSavedCards(wallet.savedCards);
    } catch {
      // non-fatal: balance already updated optimistically by the poll
    }
  }, []);

  // Returning from SkipCash — poll until the top-up resolves.
  useEffect(() => {
    if (!pendingTopupId) return;
    const state = { cancelled: false };
    const startedAt = Date.now();
    const clearParam = () => router.replace('/account/settings/wallet', { scroll: false });

    const tick = async () => {
      if (state.cancelled) return;
      try {
        const result = await pollWalletTopup({ topupId: pendingTopupId });
        if (state.cancelled) return;
        if (result.status === 'paid') {
          setBalance(result.balanceQar);
          setPhase({ name: 'succeeded', amountQar: result.amountQar });
          clearParam();
          void refresh();
          return;
        }
        if (result.status === 'failed' || result.status === 'expired') {
          setPhase({ name: 'failed', reason: result.status });
          clearParam();
          return;
        }
      } catch {
        // transient — keep polling until the deadline
      }
      if (Date.now() - startedAt > 90_000) {
        setPhase({ name: 'failed', reason: 'expired' });
        clearParam();
        return;
      }
      setTimeout(tick, 2_500);
    };
    void tick();
    return () => {
      state.cancelled = true;
    };
  }, [pendingTopupId, refresh, router]);

  const startTopup = useCallback(
    async (amountQar: number) => {
      setPhase({ name: 'starting' });
      const result = await startWalletTopup({ amountQar });
      if (result.status === 'redirect' && result.url) {
        window.location.assign(result.url);
        return;
      }
      setPhase({
        name: 'failed',
        reason: 'start_error',
        message: result.status === 'error' ? result.message : undefined,
      });
    },
    [],
  );

  const busy = phase.name === 'starting' || phase.name === 'confirming';

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="grid gap-4">
      <StatusBanner phase={phase} t={t} onDismiss={() => setPhase({ name: 'idle' })} />

      <div className="grid gap-4 lg:grid-cols-5">
        <BalanceCard balance={balance} t={t} isAr={isAr} reduced={Boolean(reduced)} />
        <TopupCard
          t={t}
          selected={selected}
          onSelect={setSelected}
          onSubmit={() => void startTopup(selected)}
          busy={busy}
          phase={phase}
        />
      </div>

      <PaymentMethodsCard
        t={t}
        locale={locale}
        cards={savedCards}
        busy={busy}
        onAdd={(amountQar) => void startTopup(amountQar)}
        onRemoved={(cardId) =>
          setSavedCards((cards) => cards.filter((card) => card.id !== cardId))
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Balance                                                             */
/* ------------------------------------------------------------------ */

function BalanceCard({
  balance,
  t,
  isAr,
  reduced,
}: {
  balance: number;
  t: (typeof COPY)[Locale];
  isAr: boolean;
  reduced: boolean;
}) {
  const displayed = useCountUp(balance, reduced);

  return (
    <Card className="relative overflow-hidden lg:col-span-2">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 h-52 w-52 rounded-full opacity-60 blur-2xl ltr:-right-16 rtl:-left-16"
        style={{ background: 'color-mix(in srgb, var(--admin-accent) 22%, transparent)' }}
      />
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Wallet className="size-4" aria-hidden />
          {t.balanceLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-end">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
            {displayed.toLocaleString(isAr ? 'ar-QA' : 'en-QA')}
          </span>
          <Badge variant="outline" className="font-mono">
            {t.currency}
          </Badge>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs leading-5 text-muted-foreground">{t.balanceHint}</p>
      </CardFooter>
    </Card>
  );
}

/** Springy count-up so a fresh top-up feels like money arriving. */
function useCountUp(target: number, reduced: boolean): number {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (reduced || from === target) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return value;
}

/* ------------------------------------------------------------------ */
/* Top-up                                                              */
/* ------------------------------------------------------------------ */

function AmountPicker({
  t,
  selected,
  onSelect,
  disabled,
}: {
  t: (typeof COPY)[Locale];
  selected: number;
  onSelect: (amount: number) => void;
  disabled: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={t.amountLabel}
      className="grid grid-cols-3 gap-2 sm:grid-cols-5"
    >
      {PRESETS_QAR.map((amount) => {
        const active = amount === selected;
        return (
          <Button
            key={amount}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            variant={active ? 'default' : 'outline'}
            onClick={() => onSelect(amount)}
            className="h-12 flex-col gap-0 font-mono tabular-nums"
          >
            <span className="text-base font-semibold leading-none">{amount}</span>
            <span className="text-[10px] font-medium uppercase tracking-widest opacity-70">
              {t.currency}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function TopupCard({
  t,
  selected,
  onSelect,
  onSubmit,
  busy,
  phase,
}: {
  t: (typeof COPY)[Locale];
  selected: number;
  onSelect: (amount: number) => void;
  onSubmit: () => void;
  busy: boolean;
  phase: TopupPhase;
}) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>{t.topupTitle}</CardTitle>
        <CardDescription>{t.topupSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <AmountPicker t={t} selected={selected} onSelect={onSelect} disabled={busy} />
        <Button type="button" size="lg" className="w-full" disabled={busy} onClick={onSubmit}>
          {phase.name === 'starting' ? (
            <>
              <Loader2 className="animate-spin" /> {t.redirecting}
            </>
          ) : phase.name === 'confirming' ? (
            <>
              <Loader2 className="animate-spin" /> {t.processing}
            </>
          ) : (
            t.payCta(selected)
          )}
        </Button>
      </CardContent>
      <CardFooter>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden /> {t.secured}
        </p>
      </CardFooter>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Payment methods                                                     */
/* ------------------------------------------------------------------ */

function PaymentMethodsCard({
  t,
  locale,
  cards,
  busy,
  onAdd,
  onRemoved,
}: {
  t: (typeof COPY)[Locale];
  locale: Locale;
  cards: WalletSavedCard[];
  busy: boolean;
  onAdd: (amountQar: number) => void;
  onRemoved: (cardId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.methodsTitle}</CardTitle>
        <CardDescription>{t.methodsSubtitle}</CardDescription>
        <CardAction>
          <AddPaymentMethodDialog t={t} busy={busy} onContinue={onAdd} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
              <CreditCard className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">{t.noCardsTitle}</p>
            <p className="max-w-sm text-xs leading-5 text-muted-foreground">{t.noCardsHint}</p>
          </div>
        ) : (
          <ul className="grid gap-1">
            {cards.map((card, index) => (
              <li key={card.id}>
                {index > 0 ? <Separator className="my-1" /> : null}
                <SavedCardRow t={t} locale={locale} card={card} onRemoved={onRemoved} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SavedCardRow({
  t,
  locale,
  card,
  onRemoved,
}: {
  t: (typeof COPY)[Locale];
  locale: Locale;
  card: WalletSavedCard;
  onRemoved: (cardId: string) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const brand = card.cardType?.trim() || t.cardFallback;

  const handleRemove = async () => {
    setRemoving(true);
    const result = await removeSavedCard({ cardId: card.id });
    setRemoving(false);
    if (result.status === 'ok') onRemoved(card.id);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted">
        <CreditCard className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {brand}
          {card.last4 ? (
            <span dir="ltr" className="font-mono tabular-nums">
              {' '}
              •••• {card.last4}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {card.expiry
            ? `${t.expiresLabel} ${card.expiry}`
            : `${t.savedLabel} ${formatDate(card.createdAt, locale)}`}
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.removeCard}
            disabled={removing}
            className="text-muted-foreground hover:text-destructive"
          >
            {removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRemove()}>{t.remove}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Smallest top-up doubles as the card-verification charge. */
const CARD_VERIFY_AMOUNT_QAR = 20;

function AddPaymentMethodDialog({
  t,
  busy,
  onContinue,
}: {
  t: (typeof COPY)[Locale];
  busy: boolean;
  onContinue: (amountQar: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const steps = [t.addDialogStep1, t.addDialogStep2, t.addDialogStep3];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={busy}>
          <Plus /> {t.addMethod}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-3 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.addDialogTitle}</DialogTitle>
          <DialogDescription>{t.addDialogBody}</DialogDescription>
        </DialogHeader>

        {/* Card visual — signals "we're adding a card", not "pick a price" */}
        <div
          dir="ltr"
          className="relative overflow-hidden rounded-xl border p-3.5 text-primary-foreground"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 88%, black) 0%, color-mix(in srgb, var(--admin-accent) 62%, black) 100%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
          />
          <div className="flex items-center justify-between">
            <span className="grid h-6 w-8 place-items-center rounded bg-white/25 text-[9px] font-semibold">
              CARD
            </span>
            <CreditCard className="size-5 opacity-80" aria-hidden />
          </div>
          <p className="mt-4 font-mono tracking-[0.2em]">•••• •••• •••• ••••</p>
          <p className="mt-1 text-[11px] uppercase tracking-widest opacity-70">{t.cardOnFile}</p>
        </div>

        <ol className="grid gap-2">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {t.addDialogVerify(CARD_VERIFY_AMOUNT_QAR)}
        </p>

        <DialogFooter className="mt-1">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              setOpen(false);
              onContinue(CARD_VERIFY_AMOUNT_QAR);
            }}
          >
            <Lock className="size-4" aria-hidden /> {t.continueCta}
          </Button>
        </DialogFooter>
        <p className="text-center text-xs text-muted-foreground">{t.secured}</p>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Status banner                                                       */
/* ------------------------------------------------------------------ */

function StatusBanner({
  phase,
  t,
  onDismiss,
}: {
  phase: TopupPhase;
  t: (typeof COPY)[Locale];
  onDismiss: () => void;
}) {
  const visible =
    phase.name === 'confirming' || phase.name === 'succeeded' || phase.name === 'failed';
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key={phase.name}
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden"
          role="status"
          aria-live="polite"
        >
          {phase.name === 'confirming' ? (
            <BannerShell tone="neutral" icon={<Loader2 className="size-4 animate-spin" />}>
              <span className="font-medium">{t.processing}</span>{' '}
              <span className="text-muted-foreground">{t.processingHint}</span>
            </BannerShell>
          ) : phase.name === 'succeeded' ? (
            <BannerShell
              tone="success"
              icon={
                <motion.span
                  initial={{ scale: 0.4, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  className="inline-flex"
                >
                  <Check className="size-4" strokeWidth={3} />
                </motion.span>
              }
              action={
                <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
                  {t.dismiss}
                </Button>
              }
            >
              <span className="font-medium">{t.succeeded(phase.amountQar)}</span>
            </BannerShell>
          ) : phase.name === 'failed' ? (
            <BannerShell
              tone="danger"
              icon={<CircleAlert className="size-4" />}
              action={
                <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
                  <RotateCcw /> {t.tryAgain}
                </Button>
              }
            >
              <span className="font-medium">
                {phase.reason === 'expired' ? t.expired : phase.message ?? t.failed}
              </span>
            </BannerShell>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function BannerShell({
  tone,
  icon,
  children,
  action,
}: {
  tone: 'success' | 'neutral' | 'danger';
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const toneStyle = {
    success: {
      color: 'var(--dash-green, var(--admin-accent))',
      background: 'var(--dash-green-soft, var(--admin-accent-soft))',
      borderColor: 'color-mix(in srgb, var(--dash-green, var(--admin-accent)) 40%, transparent)',
    },
    neutral: {},
    danger: {
      color: 'var(--dash-red, var(--destructive))',
      background: 'var(--dash-red-soft, transparent)',
      borderColor: 'color-mix(in srgb, var(--dash-red, var(--destructive)) 40%, transparent)',
    },
  }[tone];

  return (
    <div
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
      style={toneStyle}
    >
      <span className="inline-flex shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 text-foreground">{children}</div>
      {action}
    </div>
  );
}

function formatDate(iso: string, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-QA' : 'en-QA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
