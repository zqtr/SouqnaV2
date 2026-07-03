import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/admin/primitives';
import { WalletExperience } from '@/components/billing/WalletExperience';
import { adminLocale, adminPhrase } from '@/components/admin/adminLocale';
import { isLocale } from '@/i18n/locales';
import {
  expireStaleWalletTopups,
  getWalletSummary,
  listWalletSavedCards,
} from '@/lib/wallet';
import { reconcilePendingWalletTopups } from '@/lib/walletReconcile';

/**
 * Wallet page — prepaid balance for account-level micro purchases.
 *
 * Server entry loads the ledger snapshot; `WalletExperience` (client)
 * owns the top-up flow. When SkipCash redirects back it appends
 * `?topup={id}` (set by `startWalletTopup`), which the island polls
 * until the webhook or the poll itself lands the credit.
 */
export default async function WalletPage({
  searchParams,
}: {
  searchParams?: Promise<{ topup?: string | string[] }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/account/settings/wallet');

  const cookieLocale = (await cookies()).get('NEXT_LOCALE')?.value;
  const locale = adminLocale(cookieLocale && isLocale(cookieLocale) ? cookieLocale : undefined);

  const sp = (await searchParams) ?? {};
  const topupParam = Array.isArray(sp.topup) ? sp.topup[0] : sp.topup;
  const pendingTopupId =
    topupParam && /^[0-9a-f-]{36}$/i.test(topupParam) ? topupParam : null;

  // Settle any pending top-ups against SkipCash before reading the
  // balance — the webhook/poll can both miss (tab closed, webhook
  // rejected); this makes a simple page visit recover the money.
  await reconcilePendingWalletTopups(userId).catch(() => {});
  await expireStaleWalletTopups(userId).catch(() => {});
  const [summary, savedCards] = await Promise.all([
    getWalletSummary(userId),
    listWalletSavedCards(userId),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={adminPhrase(locale, 'Platform · Wallet')}
        title={adminPhrase(locale, 'Wallet')}
        subtitle={adminPhrase(
          locale,
          'Top up once with SkipCash and spend instantly on small purchases — no checkout each time.',
        )}
      />
      <WalletExperience
        locale={locale}
        initialBalanceQar={summary.balanceQar}
        initialSavedCards={savedCards}
        pendingTopupId={pendingTopupId}
      />
    </>
  );
}
