import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CreditCard, Settings2, ShieldCheck, Store, Users } from 'lucide-react';
import { getStorefrontsForUser } from '@/lib/brief';
import {
  PageHeader,
} from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Reveal } from '@/components/motion/Reveal';
import { SETTINGS_NAV_SECTIONS } from '@/components/admin/settingsNav';
import { adminLocale, adminNavLabel, adminPhrase, adminText } from '@/components/admin/adminLocale';
import { direction, isLocale } from '@/i18n/locales';

export default async function SettingsHubPage({
  searchParams,
}: {
  searchParams?: Promise<{ store?: string | string[] }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/account/settings');

  const cookieLocale = (await cookies()).get('NEXT_LOCALE')?.value;
  const locale = adminLocale(cookieLocale && isLocale(cookieLocale) ? cookieLocale : undefined);
  const t = adminText(locale);
  const sp = (await searchParams) ?? {};
  const requested = Array.isArray(sp.store) ? sp.store[0] : sp.store;
  const storefronts = await getStorefrontsForUser(userId);
  const known = storefronts.map((s) => s.slug);
  const slug =
    requested && known.includes(requested)
      ? requested
      : storefronts[0]?.slug ?? null;

  const storeQs = slug ? `?store=${slug}` : '';

  return (
    <div dir={direction[locale]}>
      <PageHeader
        eyebrow={t.settings}
        title={t.settings}
        subtitle={adminPhrase(locale, 'Choose a section from the sidebar, or open one below.')}
      />

      <Reveal y={14}>
        <div className="grid gap-4 lg:grid-cols-2">
          {SETTINGS_NAV_SECTIONS.map((section) => {
            const Icon = sectionIcon(section.id);
            return (
              <Card
                key={section.id}
                className="overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
              >
                <CardHeader className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted text-foreground">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          {adminNavLabel(section.title, locale)}
                        </CardTitle>
                        <CardDescription className="mt-1 leading-6">
                          {adminPhrase(locale, section.summary)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 font-mono">
                      {section.items.length}
                    </Badge>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="px-3 py-3">
                  <ul className="grid gap-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <Button
                          asChild
                          variant="ghost"
                          className="h-auto w-full justify-start gap-3 px-3 py-2 text-start"
                        >
                          <Link href={`${item.href}${storeQs}`}>
                            <span className="min-w-0 flex-1 truncate">
                              {adminNavLabel(item.label, locale)}
                            </span>
                            {item.soon ? (
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                {t.soon}
                              </Badge>
                            ) : null}
                            <span className="text-muted-foreground">↗</span>
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}

function sectionIcon(id: string) {
  if (id === 'store-settings') return Store;
  if (id === 'operations') return CreditCard;
  if (id === 'customers') return Users;
  if (id === 'platform') return ShieldCheck;
  return Settings2;
}
