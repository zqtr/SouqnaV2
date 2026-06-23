import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { db, hasDb } from './db';
import type { Order } from './checkout-orders';

export type CheckoutPayout = {
  id: string;
  orderId: string;
  clerkUserId: string;
  storefrontSlug: string;
  grossQar: number;
  netQar: number;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt: string | null;
  paidBy: string | null;
  note: string | null;
  createdAt: string;
};

type OwnerRow = { clerk_user_id: string };

async function getOrderOwner(storefrontSlug: string): Promise<string | null> {
  const rows = (await db()`
    select clerk_user_id
    from briefs
    where slug = ${storefrontSlug}
    limit 1
  `) as unknown as OwnerRow[];
  return rows[0]?.clerk_user_id ?? null;
}

export async function recordPlatformPayoutForPaidOrder(order: Order): Promise<void> {
  if (!hasDb()) return;
  if (order.paymentStatus !== 'marked_paid') return;

  const ownerId = await getOrderOwner(order.storefrontSlug);
  if (!ownerId) return;

  if (order.collectionMode === 'platform_skipcash') {
    await db()`
      insert into checkout_payouts (
        order_id, clerk_user_id, storefront_slug,
        gross_qar, fee_qar, net_qar, status
      ) values (
        ${order.id}, ${ownerId}, ${order.storefrontSlug},
        ${order.totalQar}, 0, ${order.totalQar}, 'pending'
      )
      on conflict (order_id) do nothing
    `;
  }

  await db()`
    update checkout_orders
    set
      payout_status = case
        when ${order.collectionMode} <> 'platform_skipcash' then payout_status
        when payout_status in ('paid', 'cancelled') then payout_status
        else 'pending'
      end,
      updated_at = now()
    where id = ${order.id}
  `;
}

export async function listPlatformFinanceOverview(limit = 50): Promise<{
  payouts: CheckoutPayout[];
}> {
  noStore();
  if (!hasDb()) return { payouts: [] };

  let payoutRows: Array<{
    id: string;
    order_id: string;
    clerk_user_id: string;
    storefront_slug: string;
    gross_qar: number | string;
    fee_qar: number | string;
    net_qar: number | string;
    status: 'pending' | 'paid' | 'cancelled';
    paid_at: string | null;
    paid_by: string | null;
    note: string | null;
    created_at: string;
  }>;

  try {
    payoutRows = (await db()`
      select *
      from checkout_payouts
      where status = 'pending'
      order by created_at asc
      limit ${Math.min(Math.max(limit, 1), 100)}
    `) as unknown as typeof payoutRows;
  } catch (err) {
    console.warn('[platformPayouts] finance overview unavailable', err);
    return { payouts: [] };
  }

  return {
    payouts: payoutRows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      clerkUserId: row.clerk_user_id,
      storefrontSlug: row.storefront_slug,
      grossQar: Number(row.gross_qar),
      netQar: Number(row.net_qar),
      status: row.status,
      paidAt: row.paid_at,
      paidBy: row.paid_by,
      note: row.note,
      createdAt: row.created_at,
    })),
  };
}

export async function markCheckoutPayoutPaid(
  payoutId: string,
  operatorUserId: string,
): Promise<boolean> {
  if (!hasDb()) return false;
  const rows = (await db()`
    update checkout_payouts
    set status = 'paid', paid_at = now(), paid_by = ${operatorUserId}, updated_at = now()
    where id = ${payoutId} and status = 'pending'
    returning order_id
  `) as unknown as { order_id: string }[];
  const orderId = rows[0]?.order_id;
  if (!orderId) return false;
  await db()`
    update checkout_orders
    set payout_status = 'paid', updated_at = now()
    where id = ${orderId}
  `;
  return true;
}
