'use client';

import Link from 'next/link';
import { Check, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useTransition } from 'react';
import { startSouqyCheckout } from '@/app/actions/souqy-subscription';
import {
  SOUQY_TIER_CONFIG,
  souqyPriceQar,
  type SouqyTier,
} from '@/lib/souqy/plans';
import type { Locale } from '@/i18n/locales';

/**
 * Public Souqy pricing — presents Souqy as its own product (Free / Souqy
 * / Team), separate from the storefront commerce plans in `pricing-5`.
 * All tier data is derived from `SOUQY_TIER_CONFIG` (single source), and
 * the paid CTAs run the real `startSouqyCheckout` (which handles the
 * sign-in redirect). Prices show in USD; the charged QAR is noted below.
 */

const TIER_ORDER: readonly SouqyTier[] = ['free', 'souqy', 'team'] as const;

const copy = {
  en: {
    eyebrow: 'Souqy',
    title: 'Souqy is its own plan now.',
    muted:
      'The AI builder, priced on its own. Start free with 5 generations a month — upgrade when you build more.',
    perMonth: '/ mo',
    charged: (qar: number) => `Charged ${qar} QAR`,
    generations: (n: number) => `${n} generations / month`,
    seat: '1 seat',
    seats: (n: number) => `${n} team seats`,
    everything: 'Everything in Souqy',
    startFree: 'Start free',
    choose: (label: string) => `Choose ${label}`,
    redirecting: 'Redirecting…',
    mostChosen: 'Most chosen',
    error: 'Could not open SkipCash checkout. Please try again.',
  },
  ar: {
    eyebrow: 'سوقي',
    title: 'سوقي أصبح خطة مستقلة.',
    muted:
      'منشئ الذكاء الاصطناعي، بسعر مستقل. ابدأ مجاناً بـ ٥ توليدات شهرياً، ورقِّ الباقة عندما تبني أكثر.',
    perMonth: '/ شهر',
    charged: (qar: number) => `يُخصم ${qar} ر.ق`,
    generations: (n: number) => `${n} توليدة / شهر`,
    seat: 'مقعد واحد',
    seats: (n: number) => `${n} مقاعد للفريق`,
    everything: 'كل ميزات سوقي',
    startFree: 'ابدأ مجاناً',
    choose: (label: string) => `اختر ${label}`,
    redirecting: 'جارٍ التحويل…',
    mostChosen: 'الأكثر اختياراً',
    error: 'تعذر فتح دفع SkipCash. حاول مرة أخرى.',
  },
} satisfies Record<Locale, Record<string, unknown>>;

export function SouqyPricing({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const isRtl = locale === 'ar';
  const [pending, setPending] = useState<SouqyTier | null>(null);
  const [errorTier, setErrorTier] = useState<SouqyTier | null>(null);
  const [, startTransition] = useTransition();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  const beginCheckout = (tier: Exclude<SouqyTier, 'free'>) => {
    setErrorTier(null);
    setPending(tier);
    startTransition(async () => {
      const res = await startSouqyCheckout({ tier });
      if ((res.status === 'redirect' || res.status === 'sign_in') && res.url) {
        window.location.href = res.url;
        return;
      }
      setPending(null);
      setErrorTier(tier);
    });
  };

  return (
    <section
      id="souqy-plans"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="scroll-mt-28 w-full border-b border-[color:var(--sq-rule)] bg-[color:var(--sq-bg)] px-[var(--sq-page-pad)] py-[var(--sq-section-y)] text-[color:var(--sq-ink)]"
    >
      <motion.div
        className="mx-auto flex w-full max-w-[1400px] flex-col"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
      >
        <div className="mb-12 grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <motion.p variants={itemVariants} className="sq-kicker m-0 text-[color:var(--sq-gold-deep)]">
            <span />
            {t.eyebrow}
          </motion.p>
          <div>
            <motion.h2
              variants={itemVariants}
              className="m-0 max-w-5xl text-balance font-[var(--font-english)] text-[clamp(36px,5vw,72px)] font-normal leading-none tracking-normal text-[color:var(--sq-ink)]"
            >
              {t.title}
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="mt-5 max-w-3xl text-[15px] leading-7 text-[color:var(--sq-muted)] sm:text-base"
            >
              {t.muted}
            </motion.p>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          className="grid w-full grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-0"
        >
          {TIER_ORDER.map((id) => {
            const config = SOUQY_TIER_CONFIG[id];
            const featured = id === 'souqy';
            const label = isRtl ? config.labelAr : config.label;
            const priceQar = souqyPriceQar(id);
            const Icon = config.team ? Users : config.priceUsd === 0 ? Zap : Sparkles;
            const features = [
              t.generations(config.monthlyGenerations),
              config.team ? t.seats(config.seats) : t.seat,
              ...(id === 'team' ? [t.everything] : []),
            ];
            return (
              <motion.article
                key={id}
                variants={itemVariants}
                className={[
                  'relative flex min-h-[420px] flex-col border p-6 transition duration-300 sm:p-7',
                  'border-[color:color-mix(in_srgb,var(--sq-ink)_18%,transparent)]',
                  'bg-[color:color-mix(in_srgb,var(--sq-bg)_88%,var(--sq-ink))]',
                  'hover:-translate-y-1 hover:border-[color:color-mix(in_srgb,var(--sq-ink)_38%,transparent)]',
                  'lg:border-r-0 lg:first:rounded-s-lg lg:last:rounded-e-lg lg:last:border-r',
                  'max-lg:rounded-lg',
                  featured
                    ? 'z-10 bg-[color:var(--sq-charcoal)] text-[color:var(--sq-bg)] shadow-[0_24px_80px_rgba(0,0,0,0.2)]'
                    : '',
                ].join(' ')}
              >
                {featured ? (
                  <span className="absolute end-5 top-5 rounded-full border border-[color:color-mix(in_srgb,var(--sq-bg)_32%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--sq-bg)]">
                    {t.mostChosen}
                  </span>
                ) : null}

                <div className="mb-8 pe-20">
                  <h3
                    className={[
                      'mb-3 flex items-center gap-2 text-2xl font-semibold tracking-normal',
                      featured ? 'text-[color:var(--sq-bg)]' : 'text-[color:var(--sq-ink)]',
                    ].join(' ')}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </h3>
                  <p
                    className={[
                      'm-0 text-sm leading-6',
                      featured
                        ? 'text-[color:color-mix(in_srgb,var(--sq-bg)_70%,transparent)]'
                        : 'text-[color:var(--sq-muted)]',
                    ].join(' ')}
                  >
                    {isRtl ? config.blurbAr : config.blurb}
                  </p>
                </div>

                <div className="mb-2 flex items-baseline gap-2">
                  <span
                    className={[
                      'text-[clamp(34px,3.4vw,48px)] font-semibold leading-none',
                      featured ? 'text-[color:var(--sq-bg)]' : 'text-[color:var(--sq-ink)]',
                    ].join(' ')}
                  >
                    {config.priceUsd === 0 ? (isRtl ? 'مجاني' : 'Free') : `$${config.priceUsd}`}
                  </span>
                  {config.priceUsd > 0 ? (
                    <span
                      className={[
                        'rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                        featured
                          ? 'bg-[color:color-mix(in_srgb,var(--sq-bg)_12%,transparent)] text-[color:color-mix(in_srgb,var(--sq-bg)_74%,transparent)]'
                          : 'bg-[color:color-mix(in_srgb,var(--sq-ink)_8%,transparent)] text-[color:var(--sq-muted)]',
                      ].join(' ')}
                    >
                      {t.perMonth}
                    </span>
                  ) : null}
                </div>
                <p
                  className={[
                    'mb-8 h-4 text-xs',
                    featured
                      ? 'text-[color:color-mix(in_srgb,var(--sq-bg)_60%,transparent)]'
                      : 'text-[color:var(--sq-muted)]',
                  ].join(' ')}
                >
                  {config.priceUsd > 0 ? t.charged(priceQar) : ''}
                </p>

                <ul className="mb-8 flex flex-1 flex-col gap-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        className={[
                          'mt-0.5 h-4 w-4 shrink-0',
                          featured ? 'text-[color:var(--sq-bg)]' : 'text-[color:var(--sq-ink)]',
                        ].join(' ')}
                      />
                      <span
                        className={[
                          'text-sm leading-6',
                          featured
                            ? 'text-[color:color-mix(in_srgb,var(--sq-bg)_78%,transparent)]'
                            : 'text-[color:var(--sq-muted)]',
                        ].join(' ')}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {id === 'free' ? (
                  <Link
                    href={isRtl ? '/ar/begin' : '/begin'}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--sq-ink)_20%,transparent)] bg-transparent px-5 text-sm font-semibold text-[color:var(--sq-ink)] transition hover:bg-[color:var(--sq-ink)] hover:text-[color:var(--sq-bg)]"
                  >
                    {t.startFree}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => beginCheckout(id as 'souqy' | 'team')}
                    className={[
                      'inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-progress disabled:opacity-70',
                      featured
                        ? 'border-0 bg-[color:var(--sq-bg)] text-[color:var(--sq-charcoal)] hover:opacity-90'
                        : 'border border-[color:color-mix(in_srgb,var(--sq-ink)_20%,transparent)] bg-transparent text-[color:var(--sq-ink)] hover:bg-[color:var(--sq-ink)] hover:text-[color:var(--sq-bg)]',
                    ].join(' ')}
                  >
                    {pending === id ? t.redirecting : t.choose(label)}
                  </button>
                )}
                {errorTier === id ? (
                  <p className="mt-3 text-center text-xs text-[color:var(--color-maroon,#8b3a3a)]">
                    {t.error}
                  </p>
                ) : null}
              </motion.article>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
