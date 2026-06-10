import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/admin/primitives';
import { getPlan } from '@/lib/billing';
import { SubscriptionTracker } from '@/components/billing/SubscriptionTracker';
import { PLAN_LIMITS, type Plan } from '@/lib/plans';
import { getSouqyMonthlyCount } from '@/lib/souqy/db';
import { PlanCompare } from './PlanCompare';

/**
 * Plan page — 4-tier comparison strip with monthly / annual billing
 * toggle. The toggle defaults to "annual" so the headline price the
 * founder sees first is the discounted rate (35% off, applied uniformly
 * by `priceFor`); a one-tap switch back to monthly stays on the same
 * page.
 *
 * Server entry fetches the caller's current plan plus tracked Souqy
 * usage, then hands off to the `PlanCompare` client island that renders
 * the cards + toggle. The actual numbers all flow from `PLAN_LIMITS` in
 * `src/lib/plans.ts`, so pricing changes only need to touch one file.
 */
export default async function PlanPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/account/settings/plan');
  const [plan, trackedSouqyGenerationsThisMonth] = await Promise.all([
    getPlan(userId),
    getSouqyMonthlyCount(userId),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Store · Plan"
        title="Plan"
        subtitle="Pick the tier that matches the way you build."
      />
      <div style={{ marginBottom: 24 }}>
        <SubscriptionTracker locale="en" />
      </div>
      <CreditsSummaryCard
        currentPlan={plan}
        trackedSouqyGenerationsThisMonth={trackedSouqyGenerationsThisMonth}
      />
      <PlanCompare currentPlan={plan} />
    </>
  );
}

function CreditsSummaryCard({
  currentPlan,
  trackedSouqyGenerationsThisMonth,
}: {
  currentPlan: Plan;
  trackedSouqyGenerationsThisMonth: number;
}) {
  const limits = PLAN_LIMITS[currentPlan];
  const monthlyIncluded = Number.isFinite(limits.aiCreditsMonthly) ? limits.aiCreditsMonthly : null;

  return (
    <section
      aria-labelledby="ai-credits-heading"
      style={{
        marginBottom: 24,
        border: '1px solid rgba(17, 17, 17, 0.1)',
        borderRadius: 8,
        background: '#fffdf8',
        padding: 20,
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
              margin: '0 0 6px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#7a6b57',
            }}
          >
            Souqy
          </p>
          <h2
            id="ai-credits-heading"
            style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1.2,
              color: '#111',
            }}
          >
            AI credits
          </h2>
        </div>
        <button
          type="button"
          aria-label="Add credits"
          title="Top-ups are not available yet"
          disabled
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: '1px solid rgba(17, 17, 17, 0.14)',
            background: '#f3efe7',
            color: '#8a7a63',
            cursor: 'not-allowed',
            fontSize: 22,
            lineHeight: '34px',
            fontWeight: 600,
          }}
        >
          +
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginTop: 18,
        }}
      >
        <CreditStat
          label="Current plan"
          value={limits.label}
          detail={monthlyIncluded == null ? 'Unlimited credits' : `${monthlyIncluded} / month`}
        />
        <CreditStat
          label="Tracked Souqy runs"
          value={String(trackedSouqyGenerationsThisMonth)}
          detail="This month"
        />
        <CreditStat
          label="Credit wallet"
          value="Not available"
          detail="Balance and top-ups are not live yet"
        />
      </div>
    </section>
  );
}

function CreditStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div
      style={{
        minHeight: 82,
        borderTop: '1px solid rgba(17, 17, 17, 0.08)',
        padding: '14px 0 0',
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: 12,
          color: '#746753',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '0 0 6px',
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.2,
          color: '#111',
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.45,
          color: '#5d564a',
        }}
      >
        {detail}
      </p>
    </div>
  );
}
