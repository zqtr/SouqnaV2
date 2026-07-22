import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ProExperience, type ProStorefrontSummary } from '@/components/account/pro/ProExperience';
import { getAdminUserId } from '@/lib/adminAuth';
import { getStorefrontsForUser } from '@/lib/brief';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import { getProAccess } from '@/lib/pro/entitlement';
import { getLatestProJob, getProOnboardingVersion, getProWorkspacesForOwner } from '@/lib/proState';
import { PRO_ONBOARDING_VERSION, type ProWorkspaceSnapshot } from '@/lib/proMode';

export default async function AccountProPage({
  searchParams,
}: {
  searchParams?: Promise<{
    store?: string | string[];
    manage?: string | string[];
  }>;
}) {
  const userId = await getAdminUserId('account/pro');
  if (!userId) redirect('/sign-in?redirect_url=/account/pro');

  const access = await getProAccess(userId);
  if (!access.enabled) notFound();

  const cookieStore = await cookies();
  const storedLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale = storedLocale && isLocale(storedLocale) ? storedLocale : defaultLocale;
  const sp = (await searchParams) ?? {};
  const requestedStore = Array.isArray(sp.store) ? sp.store[0] : sp.store;
  const manage = (Array.isArray(sp.manage) ? sp.manage[0] : sp.manage) === 'foundations';

  const [storefronts, loadedWorkspaces, onboardingVersion] = await Promise.all([
    getStorefrontsForUser(userId),
    getProWorkspacesForOwner(userId).catch(() => ({})),
    getProOnboardingVersion(userId).catch(() => 0),
  ]);
  const workspaces: Record<string, ProWorkspaceSnapshot> = loadedWorkspaces;

  const active = storefronts.find((store) => store.slug === requestedStore) ?? storefronts[0];
  if (active && workspaces[active.slug] && !manage) {
    redirect(`/account/builder?store=${encodeURIComponent(active.slug)}`);
  }

  const jobs = Object.fromEntries(
    await Promise.all(
      storefronts.map(
        async (store) => [store.slug, await getLatestProJob(store.slug).catch(() => null)] as const,
      ),
    ),
  );
  const summaries: ProStorefrontSummary[] = storefronts.map((store) => ({
    slug: store.slug,
    businessName: store.businessName,
    businessType: store.businessType,
    tagline: store.tagline,
    logoUrl: store.logoUrl,
    design: store.design,
    palette: store.palette,
    isPublished: store.isPublished,
    souqyActive: Boolean(store.souqyRevision),
  }));

  return (
    <ProExperience
      key={`${active?.slug ?? 'empty'}:${manage ? 'manage' : 'onboarding'}`}
      locale={locale}
      storefronts={summaries}
      initialSlug={active?.slug ?? ''}
      eligible={access.eligible}
      onboardingComplete={onboardingVersion >= PRO_ONBOARDING_VERSION}
      initialWorkspaces={workspaces}
      initialJobs={jobs}
      manageFoundations={manage}
    />
  );
}
