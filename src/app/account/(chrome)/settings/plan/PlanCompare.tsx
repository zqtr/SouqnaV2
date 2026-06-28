'use client';

import { ArrowRight, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { pollSubscriptionStatus } from '@/app/actions/billing';
import { PLAN_LIMITS, PLAN_RANK, PLANS, priceFor, type Plan } from '@/lib/plans';

const FEATURES: Record<Plan, string[]> = {
  free: [
    '1 storefront',
    '10 products',
    '1 template',
    '25 orders / month',
    'Basic analytics',
    'Souqna branding locked',
    'No custom domain, integrations, or AI',
  ],
  starter: [
    '2 storefronts',
    'Unlimited products',
    'Custom domain',
    'Remove Souqna branding',
    '5 templates',
    'Basic analytics with more history',
    'Analytics export ready',
    'WhatsApp integration',
    'Discount codes',
    'SEO settings',
    '100 AI credits / month',
  ],
  pro: [
    '8 storefronts',
    'Souqy AI operator',
    'AI branding assets',
    'EN + AR AI generation',
    'Marketing apps',
    'Meta/TikTok integrations',
    'Team members',
    'Automation flows',
    'Premium templates and blocks',
    'Advanced analytics',
    'Funnels, behavior, attribution, and AI insights',
    'Priority support',
  ],
  atelier: [
    'Unlimited storefronts',
    'Team workspace',
    'Client permissions',
    'White-label tools',
    'API access',
    'Advanced analytics with enterprise depth',
    'Forecasting and multi-store reporting',
    'AI bulk operations',
    'Advanced SEO AI',
    'Early access features',
    'Dedicated support',
  ],
};

const PLAN_LABELS_FROM_HOME: Record<Plan, string> = {
  free: 'Start with a branded storefront and clear caps. Upgrade to unlock growth tools.',
  starter: 'The core conversion plan for growing merchants.',
  pro: 'The most chosen plan for AI, marketing, teams, and automation.',
  atelier: 'Built for agencies, operators, and multi-brand sellers.',
};

const RETURN_BENEFITS: Record<Plan, { title: string; body: string; bullets: string[] }> = {
  free: {
    title: 'Free keeps the storefront open.',
    body: 'A simple branded storefront for testing products and receiving early orders.',
    bullets: ['Fawran and cash on delivery', 'Basic order intake', 'Starter product limits'],
  },
  starter: {
    title: 'Pro keeps daily selling simple.',
    body: 'Run the storefront from Souqna with the essentials: products, orders, reminders, and local checkout.',
    bullets: [
      'Fawran and cash on delivery checkout',
      'WhatsApp/manual order reminders',
      'Custom domain, basic analytics, discounts, and SEO',
    ],
  },
  pro: {
    title: 'Pro+ unlocks payment providers.',
    body: 'Built for active stores that need online payments, better analytics, marketing tools, and team workflows.',
    bullets: [
      'SADAD, SkipCash, and Tap Payments',
      'Advanced analytics and conversion signals',
      'AI branding, marketing apps, teams, and automations',
    ],
  },
  atelier: {
    title: 'Max+ is the full control room.',
    body: 'For multi-store operators, agencies, and serious merchants who need the whole Souqna stack.',
    bullets: [
      'Unlimited storefronts and team workspace',
      'All payment providers plus API access',
      'White-label tools, AI bulk operations, and dedicated support',
    ],
  },
};

export function PlanCompare({ currentPlan }: { currentPlan: Plan }) {
  const skipCashReturn = useSkipCashReturnState();
  const router = useRouter();
  const [exploredPlan, setExploredPlan] = useState<Plan | null>(null);
  const returnPlan = skipCashReturn.plan ?? currentPlan;

  useEffect(() => {
    if (skipCashReturn.state !== 'success' || !skipCashReturn.paymentId) return;

    let cancelled = false;
    pollSubscriptionStatus({ paymentId: skipCashReturn.paymentId }).then((res) => {
      if (!cancelled && res.status === 'active') router.refresh();
    });

    return () => {
      cancelled = true;
    };
  }, [router, skipCashReturn.paymentId, skipCashReturn.state]);

  return (
    <>
      {skipCashReturn.state ? (
        <SkipCashReturnBanner
          state={skipCashReturn.state}
          plan={returnPlan}
          onExplore={() => setExploredPlan(returnPlan)}
        />
      ) : null}

      {exploredPlan ? (
        <ReturnBenefitsPanel plan={exploredPlan} onClose={() => setExploredPlan(null)} />
      ) : null}

      <div className="souqna-plan-grid">
        {PLANS.map((id, index) => (
          <PlanCard
            key={id}
            id={id}
            currentPlan={currentPlan}
            featured={id === 'pro'}
            isFirst={index === 0}
            isLast={index === PLANS.length - 1}
          />
        ))}
      </div>

      <p
        style={{
          margin: '24px 0 0',
          padding: 16,
          borderRadius: 8,
          background: 'var(--surface-elevated, var(--surface-bg))',
          border: '1px solid var(--surface-rule)',
          fontSize: 12.5,
          color: 'var(--ink-muted)',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: 'var(--ink-strong)' }}>Want to subscribe?</strong> Paid plan
        checkout starts only from the public pricing section. Review the latest plans at{' '}
        <a href="/#plans" style={{ color: 'var(--ink-strong)', textDecoration: 'underline' }}>
          souqna.qa/#plans
        </a>
        .
      </p>

      <style jsx global>{`
        .souqna-plan-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          width: 100%;
        }
        @media (min-width: 1024px) {
          .souqna-plan-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0;
          }
        }
      `}</style>
    </>
  );
}

function PlanCard({
  id,
  currentPlan,
  featured,
  isFirst,
  isLast,
}: {
  id: Plan;
  currentPlan: Plan;
  featured: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = PLAN_LIMITS[id];
  const isCurrent = id === currentPlan;
  const isUpgrade = PLAN_RANK[id] > PLAN_RANK[currentPlan];
  const monthly = priceFor(id, 'monthly');
  const features = FEATURES[id];
  const description = PLAN_LABELS_FROM_HOME[id];

  const inverted = featured;
  const cardBg = inverted
    ? 'var(--ink-strong)'
    : 'color-mix(in srgb, var(--ink-strong) 4%, var(--surface-bg))';
  const cardInk = inverted ? 'var(--surface-bg)' : 'var(--ink-strong)';
  const cardMuted = inverted
    ? 'color-mix(in srgb, var(--surface-bg) 70%, transparent)'
    : 'var(--ink-muted)';

  return (
    <article
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 440,
        padding: 'clamp(20px, 2vw, 28px)',
        borderRadius: 8,
        background: cardBg,
        color: cardInk,
        border: '1px solid var(--surface-rule-strong)',
        zIndex: featured ? 2 : 1,
        boxShadow: featured ? '0 24px 80px rgba(0,0,0,0.18)' : 'none',
        transform: featured ? 'scale(1.01)' : 'none',
      }}
      className="souqna-plan-card"
      data-tier={id}
      data-first={isFirst}
      data-last={isLast}
    >
      {featured ? (
        <span
          style={{
            position: 'absolute',
            top: 16,
            insetInlineEnd: 16,
            padding: '4px 10px',
            borderRadius: 999,
            border: `1px solid color-mix(in srgb, ${
              inverted ? 'var(--surface-bg)' : 'var(--ink-strong)'
            } 32%, transparent)`,
            color: cardInk,
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Most chosen
        </span>
      ) : null}
      {isCurrent && !featured ? (
        <span
          style={{
            position: 'absolute',
            top: 16,
            insetInlineEnd: 16,
            padding: '3px 8px',
            borderRadius: 4,
            background: 'var(--color-maroon, #8b3a3a)',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Your plan
        </span>
      ) : null}

      <div style={{ marginBottom: 24, paddingInlineEnd: 80 }}>
        <h3
          style={{
            margin: '0 0 10px',
            fontFamily: 'var(--font-serif, var(--font-sans))',
            fontWeight: 500,
            fontSize: 24,
            letterSpacing: 0,
            color: cardInk,
          }}
        >
          {t.label}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: cardMuted,
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 24,
        }}
      >
        <span
          style={{
            fontSize: 'clamp(30px, 3vw, 42px)',
            fontWeight: 600,
            lineHeight: 1,
            color: cardInk,
            letterSpacing: 0,
          }}
        >
          {monthly === 0 ? 'Free' : `QR ${monthly}`}
        </span>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            background: inverted
              ? 'color-mix(in srgb, var(--surface-bg) 12%, transparent)'
              : 'color-mix(in srgb, var(--ink-strong) 8%, transparent)',
            color: cardMuted,
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {monthly === 0 ? 'start' : '/ mo'}
        </span>
      </div>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          marginBottom: 24,
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {features.map((feature) => (
          <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Check size={16} style={{ marginTop: 2, flexShrink: 0, color: cardInk }} />
            <span style={{ fontSize: 13, lineHeight: 1.5, color: cardMuted }}>{feature}</span>
          </li>
        ))}
      </ul>

      <PlanCta
        label={t.label}
        isCurrent={isCurrent}
        isUpgrade={isUpgrade}
        inverted={inverted}
        cardInk={cardInk}
        cardMuted={cardMuted}
      />
    </article>
  );
}

function PlanCta({
  label,
  isCurrent,
  isUpgrade,
  inverted,
  cardInk,
  cardMuted,
}: {
  label: string;
  isCurrent: boolean;
  isUpgrade: boolean;
  inverted: boolean;
  cardInk: string;
  cardMuted: string;
}) {
  if (isCurrent) {
    return (
      <span
        style={{
          display: 'inline-flex',
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
          borderRadius: 999,
          border: `1px solid color-mix(in srgb, ${
            inverted ? 'var(--surface-bg)' : 'var(--ink-strong)'
          } 22%, transparent)`,
          color: cardMuted,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        Active
      </span>
    );
  }

  if (!isUpgrade) {
    return (
      <a
        href="/#plans"
        style={{
          display: 'inline-flex',
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
          borderRadius: 999,
          border: `1px solid color-mix(in srgb, ${
            inverted ? 'var(--surface-bg)' : 'var(--ink-strong)'
          } 20%, transparent)`,
          color: cardInk,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        View plans
      </a>
    );
  }

  return (
    <a
      href="/#plans"
      style={{
        display: 'inline-flex',
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        borderRadius: 999,
        background: inverted ? 'var(--surface-bg)' : 'var(--ink-strong)',
        color: inverted ? 'var(--ink-strong)' : 'var(--surface-bg)',
        fontSize: 13,
        fontWeight: 600,
        border: 'none',
        textDecoration: 'none',
      }}
    >
      Choose {label}
    </a>
  );
}

function useSkipCashReturnState(): {
  state: 'success' | 'cancel' | null;
  paymentId: string | null;
  plan: Plan | null;
} {
  const [state, setState] = useState<{
    state: 'success' | 'cancel' | null;
    paymentId: string | null;
    plan: Plan | null;
  }>({ state: null, paymentId: null, plan: null });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get('skipcash') ?? params.get('status');
    if (v !== 'success' && v !== 'cancel') return;
    const paymentId = params.get('id') ?? params.get('paymentId') ?? params.get('PaymentId');
    const plan = planFromCustom1(params.get('custom1'));
    setState({ state: v, paymentId, plan });
    params.delete('skipcash');
    params.delete('status');
    params.delete('statusId');
    params.delete('transId');
    params.delete('custom1');
    params.delete('id');
    params.delete('paymentId');
    params.delete('PaymentId');
    params.delete('sub_id');
    params.delete('subscription_id');
    params.delete('ba_token');
    params.delete('token');
    const qs = params.toString();
    const next = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
    window.history.replaceState({}, '', next);
  }, []);

  return state;
}

function planFromCustom1(value: string | null): Plan | null {
  const plan = value?.split(':')[1];
  return plan === 'starter' || plan === 'pro' || plan === 'atelier' ? plan : null;
}

function SkipCashReturnBanner({
  state,
  plan,
  onExplore,
}: {
  state: 'success' | 'cancel';
  plan: Plan;
  onExplore: () => void;
}) {
  const success = state === 'success';
  const label = PLAN_LIMITS[plan].label;
  return (
    <div
      role="status"
      style={{
        marginBottom: 18,
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid var(--surface-rule-strong)',
        background: 'var(--surface-elevated, var(--surface-bg))',
        color: 'var(--ink-strong)',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: 'grid', gap: 10 }}>
        <span>
          {success
            ? `Your ${label} plan is active. Confirmation email is on its way.`
            : 'Checkout cancelled. You can try again from the public plans section.'}
        </span>
        {success ? (
          <button
            type="button"
            onClick={onExplore}
            style={{
              justifySelf: 'start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 38,
              padding: '0 14px',
              borderRadius: 999,
              border: '1px solid var(--surface-rule-strong)',
              background: 'var(--ink-strong)',
              color: 'var(--surface-bg)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Explore {label}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ReturnBenefitsPanel({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const label = PLAN_LIMITS[plan].label;
  const copy = RETURN_BENEFITS[plan];
  return (
    <section
      aria-label={`${label} subscription benefits`}
      style={{
        marginBottom: 18,
        padding: 18,
        borderRadius: 10,
        border: '1px solid var(--surface-rule-strong)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--ink-strong) 8%, var(--surface-bg)), var(--surface-bg))',
        color: 'var(--ink-strong)',
        boxShadow: '0 18px 60px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            {label} benefits
          </p>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 0 }}>
            {copy.title}
          </h3>
          <p
            style={{
              margin: '8px 0 0',
              maxWidth: 640,
              color: 'var(--ink-muted)',
              lineHeight: 1.6,
            }}
          >
            {copy.body}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close plan benefits"
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: 36,
            height: 36,
            borderRadius: 999,
            border: '1px solid var(--surface-rule)',
            background: 'var(--surface-bg)',
            color: 'var(--ink-strong)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <ul
        style={{
          listStyle: 'none',
          display: 'grid',
          gap: 10,
          padding: 0,
          margin: '18px 0 0',
        }}
      >
        {copy.bullets.map((benefit) => (
          <li key={benefit} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Check size={16} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
            <span style={{ color: 'var(--ink-muted)', lineHeight: 1.5 }}>{benefit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
