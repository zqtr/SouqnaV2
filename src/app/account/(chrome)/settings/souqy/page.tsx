import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/admin/primitives';
import { SouqySubscription } from '@/components/billing/SouqySubscription';
import { adminLocale, adminPhrase } from '@/components/admin/adminLocale';
import { isLocale } from '@/i18n/locales';
import { getMySouqyPlan } from '@/app/actions/souqy-subscription';

/**
 * Souqy plan page — the standalone Souqy subscription (Free / Souqy /
 * Team), separate from the storefront commerce plans. Shows the current
 * tier, this month's usage against the tier allowance, and the upgrade
 * options that run SkipCash checkout.
 */
export default async function SouqyPlanPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/account/settings/souqy');

  const cookieLocale = (await cookies()).get('NEXT_LOCALE')?.value;
  const locale = adminLocale(cookieLocale && isLocale(cookieLocale) ? cookieLocale : undefined);

  const plan = await getMySouqyPlan();

  return (
    <>
      <PageHeader
        eyebrow={adminPhrase(locale, 'Platform · Souqy')}
        title={adminPhrase(locale, 'Souqy plan')}
        subtitle={adminPhrase(
          locale,
          'Choose how much you build. Free includes 5 generations a month; paid plans add more.',
        )}
      />
      <SouqySubscription
        locale={locale}
        tier={plan.tier}
        usedThisMonth={plan.usedThisMonth}
        cap={plan.cap}
        remaining={plan.remaining}
        grandfathered={plan.grandfathered}
      />
    </>
  );
}
