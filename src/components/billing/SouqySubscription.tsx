'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles, Users, Zap } from 'lucide-react';
import { startSouqyCheckout } from '@/app/actions/souqy-subscription';
import { SOUQY_TIER_CONFIG, souqyPriceQar, type SouqyTier } from '@/lib/souqy/plans';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Locale = 'en' | 'ar';

const COPY = {
  en: {
    usageTitle: 'This month',
    usageLine: (used: number, cap: number) => `${used} of ${cap} generations used`,
    remaining: (n: number) => `${n} left`,
    current: 'Current plan',
    grandfathered: 'Included with your storefront plan',
    perMonth: '/mo',
    charged: (qar: number) => `Charged ${qar} QAR`,
    generationsMo: (n: number) => `${n} generations / month`,
    seat: '1 seat',
    seats: (n: number) => `${n} team seats`,
    choose: (label: string) => `Choose ${label}`,
    currentCta: 'Current',
    opening: 'Opening SkipCash…',
    free: 'Free',
    tagline: 'Souqy plans — pick how much you build.',
  },
  ar: {
    usageTitle: 'هذا الشهر',
    usageLine: (used: number, cap: number) => `${used} من ${cap} توليدة مستخدمة`,
    remaining: (n: number) => `${n} متبقٍ`,
    current: 'خطتك الحالية',
    grandfathered: 'مضمّنة مع خطة متجرك',
    perMonth: '/شهر',
    charged: (qar: number) => `يُخصم ${qar} ر.ق`,
    generationsMo: (n: number) => `${n} توليدة / شهر`,
    seat: 'مقعد واحد',
    seats: (n: number) => `${n} مقاعد للفريق`,
    choose: (label: string) => `اختر ${label}`,
    currentCta: 'الحالية',
    opening: 'جارٍ فتح SkipCash…',
    free: 'مجاني',
    tagline: 'خطط سوقي — اختر حجم ما تبنيه.',
  },
} as const;

const TIER_ORDER: readonly SouqyTier[] = ['free', 'souqy', 'team'] as const;

export function SouqySubscription({
  locale,
  tier,
  usedThisMonth,
  cap,
  remaining,
  grandfathered,
}: {
  locale: Locale;
  tier: SouqyTier;
  usedThisMonth: number;
  cap: number;
  remaining: number;
  grandfathered: boolean;
}) {
  const t = COPY[locale];
  const isAr = locale === 'ar';
  const [pending, setPending] = useState<SouqyTier | null>(null);
  const pct = cap > 0 ? Math.min(100, Math.round((usedThisMonth / cap) * 100)) : 0;

  const checkout = useCallback(async (target: SouqyTier) => {
    if (target === 'free') return;
    setPending(target);
    const result = await startSouqyCheckout({ tier: target as 'souqy' | 'team' });
    if ((result.status === 'redirect' || result.status === 'sign_in') && result.url) {
      window.location.assign(result.url);
      return;
    }
    setPending(null);
  }, []);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="grid gap-4">
      {/* Usage */}
      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Zap className="size-4" aria-hidden />
            {t.usageTitle}
          </CardDescription>
          <CardTitle className="text-base font-medium">
            {t.usageLine(usedThisMonth, cap)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Progress value={pct} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{souqyTierLabelFor(tier, locale)}</span>
            <span>{t.remaining(remaining)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tiers */}
      <div className="grid gap-4 md:grid-cols-3">
        {TIER_ORDER.map((id) => {
          const config = SOUQY_TIER_CONFIG[id];
          const isCurrent = id === tier;
          const featured = id === 'souqy';
          const priceQar = souqyPriceQar(id);
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card
                className={`relative h-full ${featured ? 'border-primary shadow-md' : ''}`}
              >
                {featured ? (
                  <Badge className="absolute -top-2.5 ltr:right-4 rtl:left-4">★</Badge>
                ) : null}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {config.team ? (
                      <Users className="size-4" aria-hidden />
                    ) : (
                      <Sparkles className="size-4" aria-hidden />
                    )}
                    {isAr ? config.labelAr : config.label}
                    {isCurrent ? (
                      <Badge variant="outline" className="ms-auto text-[10px]">
                        {t.current}
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription>{isAr ? config.blurbAr : config.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-semibold tabular-nums">
                      {config.priceUsd === 0 ? t.free : `$${config.priceUsd}`}
                    </span>
                    {config.priceUsd > 0 ? (
                      <span className="text-sm text-muted-foreground">{t.perMonth}</span>
                    ) : null}
                  </div>
                  {config.priceUsd > 0 ? (
                    <p className="text-xs text-muted-foreground">{t.charged(priceQar)}</p>
                  ) : null}
                  <ul className="grid gap-2 text-sm">
                    <Feature text={t.generationsMo(config.monthlyGenerations)} />
                    <Feature text={config.team ? t.seats(config.seats) : t.seat} />
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    type="button"
                    variant={featured ? 'default' : 'outline'}
                    className="w-full"
                    disabled={isCurrent || id === 'free' || pending !== null}
                    onClick={() => void checkout(id)}
                  >
                    {pending === id ? (
                      <>
                        <Loader2 className="animate-spin" /> {t.opening}
                      </>
                    ) : isCurrent ? (
                      grandfathered ? t.grandfathered : t.currentCta
                    ) : (
                      t.choose(isAr ? config.labelAr : config.label)
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-4 shrink-0 text-primary" aria-hidden />
      <span>{text}</span>
    </li>
  );
}

function souqyTierLabelFor(tier: SouqyTier, locale: Locale): string {
  const config = SOUQY_TIER_CONFIG[tier];
  return locale === 'ar' ? config.labelAr : config.label;
}
