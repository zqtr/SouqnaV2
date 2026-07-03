'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { hasDb } from '@/lib/db';
import { env } from '@/lib/env';
import {
  createSkipCashPayment,
  getSkipCashPayment,
  hasSkipCash,
  newSkipCashTransactionId,
  normalizeSkipCashStatusId,
} from '@/lib/skipcash';
import { saveWalletCardFromToken } from '@/lib/walletReconcile';
import {
  attachTopupPayment,
  createWalletTopup,
  creditWalletForTopup,
  debitWallet,
  getWalletSummary,
  getWalletTopup,
  isWalletTopupPreset,
  listWalletEntries,
  listWalletSavedCards,
  markWalletTopupFailed,
  removeWalletSavedCard,
  type WalletEntry,
  type WalletSavedCard,
} from '@/lib/wallet';
import { logEvent } from '@/lib/events';

/**
 * Wallet actions — top-up via SkipCash hosted checkout.
 *
 * Mirrors the plan-checkout flow in `billing.ts`: the action creates a
 * hosted payment, the client redirects to `payUrl`, SkipCash calls
 * `/api/wallet/skipcash-webhook` (source of truth), and the return
 * page polls `pollWalletTopup` so the success screen stays responsive
 * when the webhook is slow. Both paths land in `creditWalletForTopup`,
 * which is idempotent, so double-crediting is impossible.
 */

const StartTopupSchema = z.object({
  amountQar: z.number().int().positive(),
});

export type StartWalletTopupResult =
  | { status: 'redirect'; url: string; topupId: string }
  | { status: 'error'; message: string };

export async function startWalletTopup(
  input: z.input<typeof StartTopupSchema>,
): Promise<StartWalletTopupResult> {
  const parsed = StartTopupSchema.safeParse(input);
  if (!parsed.success || !isWalletTopupPreset(parsed.data.amountQar)) {
    return { status: 'error', message: 'Choose one of the listed top-up amounts.' };
  }

  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to top up your wallet.' };
  if (!hasDb()) return { status: 'error', message: 'Wallet is unavailable right now.' };
  if (!hasSkipCash()) return { status: 'error', message: 'Top-ups are not configured yet.' };

  const amountQar = parsed.data.amountQar;
  const topup = await createWalletTopup(userId, amountQar);

  try {
    const u = await currentUser();
    const email = u?.emailAddresses?.[0]?.emailAddress ?? `billing+${userId}@souqna.qa`;
    const payment = await createSkipCashPayment({
      amountQar,
      firstName: u?.firstName?.trim() || 'Souqna',
      lastName: u?.lastName?.trim() || 'Founder',
      email,
      phone: env.SKIPCASH_DEFAULT_PHONE,
      transactionId: newSkipCashTransactionId(),
      custom1: `wallet:${topup.id}`,
      returnUrl: siteUrl(`/account/settings/wallet?topup=${topup.id}`),
      webhookUrl: siteUrl('/api/wallet/skipcash-webhook'),
    });
    await attachTopupPayment(topup.id, payment.id);
    await logEvent({
      kind: 'wallet.topup.start',
      funnel: 'storefront',
      userId,
      props: { provider: 'skipcash', topupId: topup.id, paymentId: payment.id, amountQar },
    });
    return { status: 'redirect', url: payment.payUrl ?? '', topupId: topup.id };
  } catch (err) {
    console.error('[startWalletTopup] skipcash payment create failed', err);
    await markWalletTopupFailed(topup.id).catch(() => {});
    return {
      status: 'error',
      message: 'SkipCash could not start the top-up. Please try again in a moment.',
    };
  }
}

const PollTopupSchema = z.object({
  topupId: z.string().uuid(),
});

export type PollWalletTopupResult =
  | { status: 'pending' }
  | { status: 'paid'; balanceQar: number; amountQar: number }
  | { status: 'failed' }
  | { status: 'expired' };

/**
 * Defensive read used by the return page while the webhook is in
 * flight. If SkipCash already reports the payment as paid, credits the
 * wallet directly — `creditWalletForTopup` guarantees the webhook and
 * this poll cannot both land.
 */
export async function pollWalletTopup(
  input: z.input<typeof PollTopupSchema>,
): Promise<PollWalletTopupResult> {
  const parsed = PollTopupSchema.safeParse(input);
  if (!parsed.success) return { status: 'failed' };

  const { userId } = await auth();
  if (!userId || !hasDb()) return { status: 'failed' };

  const topup = await getWalletTopup(parsed.data.topupId);
  if (!topup || topup.clerkUserId !== userId) return { status: 'failed' };

  if (topup.status === 'paid') {
    const summary = await getWalletSummary(userId);
    return { status: 'paid', balanceQar: summary.balanceQar, amountQar: topup.amountQar };
  }
  if (topup.status === 'failed') return { status: 'failed' };
  if (topup.status === 'expired') return { status: 'expired' };

  if (!topup.skipcashPaymentId || !hasSkipCash()) return { status: 'pending' };

  try {
    const payment = await getSkipCashPayment(topup.skipcashPaymentId);
    const statusId = normalizeSkipCashStatusId(payment.statusId);
    if (statusId === 2) {
      const tokenId = payment.tokenId?.trim() || null;
      const credited = await creditWalletForTopup({
        topupId: topup.id,
        skipcashPaymentId: topup.skipcashPaymentId,
        tokenId,
      });
      if (tokenId) {
        await saveWalletCardFromToken(userId, tokenId);
      }
      const balanceQar = credited?.balanceQar ?? (await getWalletSummary(userId)).balanceQar;
      if (credited) {
        await logEvent({
          kind: 'wallet.topup.succeeded',
          funnel: 'storefront',
          userId,
          props: {
            provider: 'skipcash',
            topupId: topup.id,
            paymentId: topup.skipcashPaymentId,
            amountQar: topup.amountQar,
            via: 'poll',
          },
        });
      }
      return { status: 'paid', balanceQar, amountQar: topup.amountQar };
    }
    if (statusId === 3 || statusId === 4 || statusId === 5) {
      await markWalletTopupFailed(topup.id);
      return { status: 'failed' };
    }
  } catch (err) {
    console.error('[pollWalletTopup] skipcash lookup failed', err);
  }
  return { status: 'pending' };
}

export type MyWallet = {
  balanceQar: number;
  entries: WalletEntry[];
  savedCards: WalletSavedCard[];
};

export async function getMyWallet(): Promise<MyWallet> {
  const { userId } = await auth();
  if (!userId || !hasDb()) {
    return { balanceQar: 0, entries: [], savedCards: [] };
  }
  const [summary, entries, savedCards] = await Promise.all([
    getWalletSummary(userId),
    listWalletEntries(userId),
    listWalletSavedCards(userId),
  ]);
  return { balanceQar: summary.balanceQar, entries, savedCards };
}

const SpendSchema = z.object({
  amountQar: z.number().int().positive().max(100_000),
  // Client-generated per purchase intent so a retry (or double-submit)
  // dedupes to a single debit instead of charging twice.
  idempotencyKey: z.string().uuid(),
  label: z.string().trim().max(80).optional(),
});

export type SpendFromWalletResult =
  | { status: 'ok'; balanceQar: number; amountQar: number }
  | { status: 'insufficient_funds'; balanceQar: number }
  | { status: 'error'; message: string };

/**
 * Debit the caller's wallet for a purchase. This is the "pay with
 * wallet" primitive any buy point calls — the quick-buy panel uses it
 * directly. Instant, no gateway round-trip, idempotent on the key.
 */
export async function spendFromWallet(
  input: z.input<typeof SpendSchema>,
): Promise<SpendFromWalletResult> {
  const parsed = SpendSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Enter a valid amount.' };

  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to pay from your wallet.' };
  if (!hasDb()) return { status: 'error', message: 'Wallet is unavailable right now.' };

  try {
    const result = await debitWallet({
      clerkUserId: userId,
      amountQar: parsed.data.amountQar,
      idempotencyKey: `wallet-spend:${parsed.data.idempotencyKey}`,
      label: parsed.data.label ?? 'Quick buy',
      reference: parsed.data.idempotencyKey,
    });
    if (result.status === 'insufficient_funds') {
      const summary = await getWalletSummary(userId);
      return { status: 'insufficient_funds', balanceQar: summary.balanceQar };
    }
    if (result.status === 'already_applied') {
      const summary = await getWalletSummary(userId);
      return { status: 'ok', balanceQar: summary.balanceQar, amountQar: parsed.data.amountQar };
    }
    await logEvent({
      kind: 'wallet.spend',
      funnel: 'storefront',
      userId,
      props: { amountQar: parsed.data.amountQar, label: parsed.data.label ?? 'Quick buy' },
    });
    return { status: 'ok', balanceQar: result.balanceQar, amountQar: parsed.data.amountQar };
  } catch (err) {
    console.error('[spendFromWallet] failed', err);
    return { status: 'error', message: 'Could not complete the purchase. Please try again.' };
  }
}

const RemoveCardSchema = z.object({
  cardId: z.string().uuid(),
});

export type RemoveSavedCardResult = { status: 'ok' } | { status: 'error'; message: string };

export async function removeSavedCard(
  input: z.input<typeof RemoveCardSchema>,
): Promise<RemoveSavedCardResult> {
  const parsed = RemoveCardSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid card' };
  const { userId } = await auth();
  if (!userId || !hasDb()) return { status: 'error', message: 'Sign in to manage cards' };
  const removed = await removeWalletSavedCard(userId, parsed.data.cardId);
  if (!removed) return { status: 'error', message: 'Card not found' };
  await logEvent({
    kind: 'wallet.card.removed',
    funnel: 'storefront',
    userId,
    props: { cardId: parsed.data.cardId },
  });
  return { status: 'ok' };
}

function siteUrl(path: string): string {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/u, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
