import { unstable_noStore as noStore } from 'next/cache';
import { db } from './db';

/**
 * Checkout-driven orders (M3 of the 2026-04 builder rebuild).
 *
 * Backed by `checkout_orders` + `checkout_order_items` (migration 017).
 * Distinct from the legacy `orders` / `order_items` tables that back
 * the dashboard "log a manual sale" flow in `src/lib/orders.ts` — see
 * the migration header for why the schemas diverge.
 *
 * All money values are integer whole QAR. All ids are uuid strings.
 */

export type PaymentMethod = 'cod' | 'bank_transfer' | 'fawran' | 'skipcash' | 'sadad' | 'pay_link';
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'cod',
  'bank_transfer',
  'fawran',
  'skipcash',
  'sadad',
  'pay_link',
] as const;

export type PaymentStatus = 'unpaid' | 'marked_paid' | 'payment_failed' | 'refunded';
export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'unpaid',
  'marked_paid',
  'payment_failed',
  'refunded',
] as const;

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type CollectionMode = 'platform_skipcash' | 'seller_direct' | 'offline';
export type PayoutStatus = 'not_applicable' | 'pending' | 'paid' | 'cancelled';

export type OrderAddress = {
  line1: string;
  line2?: string | null;
  area?: string | null;
  city: string;
  country: string;
  zip?: string | null;
  notes?: string | null;
};

export type OrderItem = {
  id: string;
  productId: string | null;
  titleSnapshot: string;
  variantLabel: string | null;
  customInputs: Record<string, string>;
  priceQarSnapshot: number;
  quantity: number;
};

export type Order = {
  id: string;
  storefrontSlug: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: OrderAddress | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  currency: string;
  subtotalQar: number;
  discountQar: number;
  discountCode: string | null;
  discountId: number | null;
  shippingQar: number;
  taxQar: number;
  totalQar: number;
  planSnapshot: string;
  sellerNetQar: number;
  collectionMode: CollectionMode;
  platformProvider: string | null;
  payoutStatus: PayoutStatus;
  acceptedPolicies: string[];
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

type OrderRow = {
  id: string;
  storefront_slug: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: unknown;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  currency: string;
  subtotal_qar: number | string;
  discount_qar?: number | string | null;
  discount_code?: string | null;
  discount_id?: number | string | null;
  shipping_qar: number | string;
  tax_qar: number | string;
  total_qar: number | string;
  plan_snapshot?: string | null;
  seller_net_qar?: number | string | null;
  collection_mode?: CollectionMode | null;
  platform_provider?: string | null;
  payout_status?: PayoutStatus | null;
  accepted_policies: string[] | null;
  notes: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  title_snapshot: string;
  variant_label?: string | null;
  custom_inputs?: unknown;
  price_qar_snapshot: number | string;
  quantity: number;
  created_at: string;
};

function asAddress(value: unknown): OrderAddress | null {
  const obj = parseJsonObject(value);
  if (!obj) return null;
  const line1 = typeof obj.line1 === 'string' ? obj.line1 : '';
  const city = typeof obj.city === 'string' ? obj.city : '';
  const country = typeof obj.country === 'string' ? obj.country : '';
  if (!line1 || !city || !country) return null;
  return {
    line1,
    line2: typeof obj.line2 === 'string' ? obj.line2 : null,
    area: typeof obj.area === 'string' ? obj.area : null,
    city,
    country,
    zip: typeof obj.zip === 'string' ? obj.zip : null,
    notes: typeof obj.notes === 'string' ? obj.notes : null,
  };
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function fromRow(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    storefrontSlug: row.storefront_slug,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    address: asAddress(row.address),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    currency: row.currency,
    subtotalQar: Number(row.subtotal_qar),
    discountQar: Number(row.discount_qar ?? 0),
    discountCode: row.discount_code ?? null,
    discountId:
      row.discount_id !== null && row.discount_id !== undefined ? Number(row.discount_id) : null,
    shippingQar: Number(row.shipping_qar),
    taxQar: Number(row.tax_qar ?? 0),
    totalQar: Number(row.total_qar),
    planSnapshot: row.plan_snapshot ?? 'free',
    sellerNetQar:
      row.seller_net_qar !== null && row.seller_net_qar !== undefined
        ? Number(row.seller_net_qar)
        : Number(row.total_qar),
    collectionMode: row.collection_mode ?? 'seller_direct',
    platformProvider: row.platform_provider ?? null,
    payoutStatus: row.payout_status ?? 'not_applicable',
    acceptedPolicies: row.accepted_policies ?? [],
    notes: row.notes,
    metadata: parseJsonObject(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

function itemFromRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    titleSnapshot: row.title_snapshot,
    variantLabel: row.variant_label ?? null,
    customInputs: parseStringMap(row.custom_inputs),
    priceQarSnapshot: Number(row.price_qar_snapshot),
    quantity: row.quantity,
  };
}

function parseStringMap(value: unknown): Record<string, string> {
  const obj = parseJsonObject(value);
  if (!obj) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(obj)) {
    if (typeof raw !== 'string') continue;
    const normalized = raw.trim();
    if (normalized) out[key] = normalized;
  }
  return out;
}

export type CreateOrderRowInput = {
  slug: string;
  customer: { name: string; phone: string; email: string | null };
  address: OrderAddress | null;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  currency: string;
  subtotalQar: number;
  discountQar?: number;
  discountCode?: string | null;
  discountId?: number | null;
  shippingQar: number;
  taxQar?: number;
  totalQar: number;
  planSnapshot: string;
  sellerNetQar: number;
  collectionMode: CollectionMode;
  platformProvider: string | null;
  payoutStatus?: PayoutStatus;
  acceptedPolicies: string[];
  notes: string | null;
  metadata: Record<string, unknown> | null;
  items: Array<{
    productId: string | null;
    titleSnapshot: string;
    variantLabel?: string | null;
    customInputs?: Record<string, string> | null;
    priceQarSnapshot: number;
    quantity: number;
  }>;
};

/**
 * Internal insert helper. The HTTP-mode Neon driver does not expose
 * multi-statement transactions, so we INSERT the order first, then loop
 * the item INSERTs. If any item INSERT fails we delete the order row
 * to avoid leaving an empty order behind. Acceptable because the
 * checkout flow is single-threaded per buyer session and the order was
 * just created milliseconds earlier.
 */
export async function createOrderRow(input: CreateOrderRowInput): Promise<Order> {
  if (input.items.length === 0) {
    throw new Error('order requires at least one item');
  }

  const addressJson = input.address ? JSON.stringify(input.address) : null;
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
  const paymentStatus = input.paymentStatus ?? 'unpaid';
  const orderStatus = input.orderStatus ?? 'pending';
  const payoutStatus = input.payoutStatus ?? 'not_applicable';

  const orderRows = (await db()`
    insert into checkout_orders (
      storefront_slug,
      customer_name, customer_phone, customer_email,
      address,
      payment_method, payment_status, order_status,
      currency, subtotal_qar, discount_qar, discount_code, discount_id,
      shipping_qar, tax_qar, total_qar,
      plan_snapshot, seller_net_qar,
      collection_mode, platform_provider, payout_status,
      accepted_policies, notes, metadata
    ) values (
      ${input.slug},
      ${input.customer.name}, ${input.customer.phone}, ${input.customer.email},
      ${addressJson}::jsonb,
      ${input.paymentMethod}, ${paymentStatus}, ${orderStatus},
      ${input.currency}, ${input.subtotalQar}, ${input.discountQar ?? 0}, ${input.discountCode ?? null}, ${input.discountId ?? null},
      ${input.shippingQar}, ${input.taxQar ?? 0}, ${input.totalQar},
      ${input.planSnapshot}, ${input.sellerNetQar},
      ${input.collectionMode}, ${input.platformProvider}, ${payoutStatus},
      ${input.acceptedPolicies as unknown as string}, ${input.notes}, ${metadataJson}::jsonb
    )
    returning *
  `) as unknown as OrderRow[];

  const orderRow = orderRows[0];
  if (!orderRow) throw new Error('insert order failed');

  try {
    const items: OrderItem[] = [];
    for (const it of input.items) {
      const itemRows = (await db()`
        insert into checkout_order_items (
          order_id, product_id, title_snapshot, variant_label, custom_inputs,
          price_qar_snapshot, quantity
        ) values (
          ${orderRow.id}, ${it.productId}, ${it.titleSnapshot}, ${it.variantLabel ?? null},
          ${JSON.stringify(it.customInputs ?? {})}::jsonb,
          ${it.priceQarSnapshot}, ${it.quantity}
        )
        returning *
      `) as unknown as OrderItemRow[];
      const row = itemRows[0];
      if (!row) throw new Error('insert order item failed');
      items.push(itemFromRow(row));
    }
    return fromRow(orderRow, items);
  } catch (err) {
    await db()`delete from checkout_orders where id = ${orderRow.id}`;
    throw err;
  }
}

export async function getOrderById(id: string, slug?: string): Promise<Order | null> {
  noStore();
  const rows = slug
    ? ((await db()`
        select * from checkout_orders
        where id = ${id} and storefront_slug = ${slug}
        limit 1
      `) as unknown as OrderRow[])
    : ((await db()`
        select * from checkout_orders where id = ${id} limit 1
      `) as unknown as OrderRow[]);
  const row = rows[0];
  if (!row) return null;
  const itemRows = (await db()`
    select * from checkout_order_items
    where order_id = ${id}
    order by created_at asc, id asc
  `) as unknown as OrderItemRow[];
  return fromRow(row, itemRows.map(itemFromRow));
}

/**
 * Public-by-design accessor used by the buyer's thank-you page. The
 * scope is `(orderId, slug)` so a guessed id from another tenant
 * cannot leak. The buyer just placed this order so returning the full
 * confirmation (including their own contact + items) is correct.
 */
export async function getOrderForThankYou(orderId: string, slug: string): Promise<Order | null> {
  return getOrderById(orderId, slug);
}

export async function countCheckoutOrdersForUserMonth(clerkUserId: string): Promise<number> {
  if (!clerkUserId) return 0;
  noStore();
  const rows = (await db()`
    select count(*)::int as n
    from checkout_orders o
    join briefs b on b.slug = o.storefront_slug
    where b.clerk_user_id = ${clerkUserId}
      and o.created_at >= (date_trunc('month', now() at time zone 'Asia/Qatar') at time zone 'Asia/Qatar')
      and o.order_status <> 'cancelled'
      and coalesce(o.metadata->>'source', '') <> 'manual_order'
  `) as unknown as { n: number }[];
  return Number(rows[0]?.n ?? 0);
}

export type ListOrdersFilter = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  limit?: number;
  offset?: number;
};

export async function listOrdersForStorefront(
  slug: string,
  opts: ListOrdersFilter = {},
): Promise<{ orders: Order[]; total: number }> {
  noStore();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const status = opts.status ?? null;
  const paymentStatus = opts.paymentStatus ?? null;

  const orderRows = (await db()`
    select * from checkout_orders
    where storefront_slug = ${slug}
      and (${status}::text is null or order_status = ${status})
      and (${paymentStatus}::text is null or payment_status = ${paymentStatus})
    order by created_at desc
    limit ${limit} offset ${offset}
  `) as unknown as OrderRow[];

  const totalRows = (await db()`
    select count(*)::int as n from checkout_orders
    where storefront_slug = ${slug}
      and (${status}::text is null or order_status = ${status})
      and (${paymentStatus}::text is null or payment_status = ${paymentStatus})
  `) as unknown as { n: number }[];

  if (orderRows.length === 0) {
    return { orders: [], total: totalRows[0]?.n ?? 0 };
  }

  const ids = orderRows.map((r) => r.id);
  const itemRows = (await db()`
    select * from checkout_order_items
    where order_id = any(${ids as unknown as string}::uuid[])
    order by created_at asc, id asc
  `) as unknown as OrderItemRow[];

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const ir of itemRows) {
    const list = itemsByOrder.get(ir.order_id) ?? [];
    list.push(itemFromRow(ir));
    itemsByOrder.set(ir.order_id, list);
  }

  return {
    orders: orderRows.map((r) => fromRow(r, itemsByOrder.get(r.id) ?? [])),
    total: totalRows[0]?.n ?? 0,
  };
}

export type StorefrontOrderStats = {
  totalOrders: number;
  paidOrders: number;
  revenueQar: number;
  pendingOrders: number;
  unpaidOrders: number;
  averageOrderQar: number;
};

export async function getOrderStatsForStorefront(slug: string): Promise<StorefrontOrderStats> {
  noStore();
  const rows = (await db()`
    select
      count(*)::int as total_orders,
      count(*) filter (where payment_status = 'marked_paid')::int as paid_orders,
      coalesce(sum(total_qar) filter (where payment_status = 'marked_paid'), 0)::int as revenue_qar,
      count(*) filter (where order_status = 'pending')::int as pending_orders,
      count(*) filter (where payment_status = 'unpaid')::int as unpaid_orders,
      coalesce(round(avg(total_qar)), 0)::int as average_order_qar
    from checkout_orders
    where storefront_slug = ${slug}
  `) as unknown as Array<{
    total_orders: number;
    paid_orders: number;
    revenue_qar: number;
    pending_orders: number;
    unpaid_orders: number;
    average_order_qar: number;
  }>;
  const row = rows[0];
  return {
    totalOrders: row?.total_orders ?? 0,
    paidOrders: row?.paid_orders ?? 0,
    revenueQar: row?.revenue_qar ?? 0,
    pendingOrders: row?.pending_orders ?? 0,
    unpaidOrders: row?.unpaid_orders ?? 0,
  averageOrderQar: row?.average_order_qar ?? 0,
  };
}

export type OrderAnalyticsSummary = StorefrontOrderStats & {
  fulfilledOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  refundRequests: number;
  customerCount: number;
  newCustomers: number;
  returningCustomers: number;
};

export async function getOrderAnalyticsSummaryForStorefront(
  slug: string,
  sinceDays: number,
): Promise<OrderAnalyticsSummary> {
  noStore();
  const rows = (await db()`
    with bounds as (
      select now() - (${sinceDays}::int * interval '1 day') as start_at
    ),
    window_orders as (
      select
        o.*,
        coalesce(nullif(lower(o.customer_email), ''), nullif(o.customer_phone, ''), o.id::text) as customer_key
      from checkout_orders o, bounds
      where o.storefront_slug = ${slug}
        and o.created_at >= bounds.start_at
    ),
    first_orders as (
      select
        coalesce(nullif(lower(customer_email), ''), nullif(customer_phone, ''), id::text) as customer_key,
        min(created_at) as first_at
      from checkout_orders
      where storefront_slug = ${slug}
      group by 1
    )
    select
      count(window_orders.id)::int as total_orders,
      count(window_orders.id) filter (where window_orders.payment_status = 'marked_paid')::int as paid_orders,
      coalesce(sum(window_orders.total_qar) filter (where window_orders.payment_status = 'marked_paid'), 0)::int as revenue_qar,
      count(window_orders.id) filter (where window_orders.order_status = 'pending')::int as pending_orders,
      count(window_orders.id) filter (where window_orders.payment_status = 'unpaid')::int as unpaid_orders,
      coalesce(round(avg(window_orders.total_qar) filter (where window_orders.payment_status = 'marked_paid')), 0)::int as average_order_qar,
      count(window_orders.id) filter (where window_orders.order_status in ('preparing', 'shipped', 'delivered'))::int as fulfilled_orders,
      count(window_orders.id) filter (where window_orders.order_status = 'delivered')::int as delivered_orders,
      count(window_orders.id) filter (where window_orders.order_status = 'cancelled')::int as cancelled_orders,
      count(window_orders.id) filter (where window_orders.payment_status = 'refunded')::int as refund_requests,
      count(distinct window_orders.customer_key)::int as customer_count,
      count(distinct window_orders.customer_key) filter (where first_orders.first_at >= bounds.start_at)::int as new_customers,
      count(distinct window_orders.customer_key) filter (where first_orders.first_at < bounds.start_at)::int as returning_customers
    from bounds
    left join window_orders on true
    left join first_orders on first_orders.customer_key = window_orders.customer_key
    group by bounds.start_at
  `) as unknown as Array<{
    total_orders: number;
    paid_orders: number;
    revenue_qar: number;
    pending_orders: number;
    unpaid_orders: number;
    average_order_qar: number;
    fulfilled_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    refund_requests: number;
    customer_count: number;
    new_customers: number;
    returning_customers: number;
  }>;
  const row = rows[0];
  return {
    totalOrders: row?.total_orders ?? 0,
    paidOrders: row?.paid_orders ?? 0,
    revenueQar: row?.revenue_qar ?? 0,
    pendingOrders: row?.pending_orders ?? 0,
    unpaidOrders: row?.unpaid_orders ?? 0,
    averageOrderQar: row?.average_order_qar ?? 0,
    fulfilledOrders: row?.fulfilled_orders ?? 0,
    deliveredOrders: row?.delivered_orders ?? 0,
    cancelledOrders: row?.cancelled_orders ?? 0,
    refundRequests: row?.refund_requests ?? 0,
    customerCount: row?.customer_count ?? 0,
    newCustomers: row?.new_customers ?? 0,
    returningCustomers: row?.returning_customers ?? 0,
  };
}

export type RevenueGrain = 'day' | 'week' | 'month' | 'year';
export type RevenueSeriesPoint = {
  label: string;
  revenueQar: number;
  ordersCount: number;
};

export async function revenueSeriesForStorefront(
  slug: string,
  grain: RevenueGrain,
): Promise<RevenueSeriesPoint[]> {
  noStore();
  const bucket =
    grain === 'year'
      ? db()`date_trunc('year', created_at)`
      : grain === 'month'
        ? db()`date_trunc('month', created_at)`
        : grain === 'week'
          ? db()`date_trunc('week', created_at)`
          : db()`date_trunc('day', created_at)`;
  const lookbackDays = grain === 'year' ? 365 * 5 : grain === 'month' ? 365 : grain === 'week' ? 84 : 30;
  const format = grain === 'year' ? 'YYYY' : grain === 'month' ? 'Mon YYYY' : grain === 'week' ? '"W"IW YYYY' : 'YYYY-MM-DD';

  const rows = (await db()`
    select
      to_char(${bucket}, ${format}) as label,
      coalesce(sum(total_qar) filter (where payment_status = 'marked_paid'), 0)::int as revenue_qar,
      count(*) filter (where order_status <> 'cancelled')::int as orders_count
    from checkout_orders
    where storefront_slug = ${slug}
      and created_at >= now() - (${lookbackDays}::int * interval '1 day')
    group by ${bucket}
    order by ${bucket}
  `) as unknown as Array<{ label: string; revenue_qar: number; orders_count: number }>;

  return rows.map((row) => ({
    label: row.label,
    revenueQar: Number(row.revenue_qar ?? 0),
    ordersCount: Number(row.orders_count ?? 0),
  }));
}

export type PaymentMethodPerformance = {
  provider: string;
  ordersCount: number;
  paidOrders: number;
  failedOrders: number;
  revenueQar: number;
  successRate: number;
};

export async function paymentMethodPerformanceForStorefront(
  slug: string,
  sinceDays: number,
): Promise<PaymentMethodPerformance[]> {
  noStore();
  const rows = (await db()`
    select
      coalesce(
        nullif(platform_provider, ''),
        nullif(metadata->>'paymentProvider', ''),
        payment_method
      ) as provider,
      count(*)::int as orders_count,
      count(*) filter (where payment_status = 'marked_paid')::int as paid_orders,
      count(*) filter (where payment_status = 'payment_failed')::int as failed_orders,
      coalesce(sum(total_qar) filter (where payment_status = 'marked_paid'), 0)::int as revenue_qar
    from checkout_orders
    where storefront_slug = ${slug}
      and created_at >= now() - (${sinceDays}::int * interval '1 day')
    group by provider
    order by orders_count desc, revenue_qar desc
  `) as unknown as Array<{
    provider: string;
    orders_count: number;
    paid_orders: number;
    failed_orders: number;
    revenue_qar: number;
  }>;

  return rows.map((row) => {
    const ordersCount = Number(row.orders_count ?? 0);
    const paidOrders = Number(row.paid_orders ?? 0);
    return {
      provider: row.provider,
      ordersCount,
      paidOrders,
      failedOrders: Number(row.failed_orders ?? 0),
      revenueQar: Number(row.revenue_qar ?? 0),
      successRate: ordersCount > 0 ? (paidOrders / ordersCount) * 100 : 0,
    };
  });
}

export type RealtimeOrderFeedItem = {
  id: string;
  displayCode: string;
  customerName: string;
  totalQar: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
};

export async function realtimeOrderFeedForStorefront(
  slug: string,
  limit = 5,
): Promise<RealtimeOrderFeedItem[]> {
  noStore();
  const rows = (await db()`
    select id, customer_name, total_qar, payment_status, order_status, created_at
    from checkout_orders
    where storefront_slug = ${slug}
    order by created_at desc
    limit ${Math.min(Math.max(limit, 1), 20)}
  `) as unknown as Array<{
    id: string;
    customer_name: string;
    total_qar: number | string;
    payment_status: PaymentStatus;
    order_status: OrderStatus;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    displayCode: row.id.slice(0, 8).toUpperCase(),
    customerName: row.customer_name,
    totalQar: Number(row.total_qar ?? 0),
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    createdAt: row.created_at,
  }));
}

export async function setOrderStatus(
  orderId: string,
  slug: string,
  status: OrderStatus,
): Promise<Order | null> {
  const rows = (await db()`
    update checkout_orders
    set order_status = ${status}, updated_at = now()
    where id = ${orderId} and storefront_slug = ${slug}
    returning *
  `) as unknown as OrderRow[];
  if (!rows[0]) return null;
  return getOrderById(orderId, slug);
}

export async function setOrderPaymentStatus(
  orderId: string,
  slug: string,
  paymentStatus: PaymentStatus,
): Promise<Order | null> {
  const rows = (await db()`
    update checkout_orders
    set payment_status = ${paymentStatus}, updated_at = now()
    where id = ${orderId} and storefront_slug = ${slug}
    returning *
  `) as unknown as OrderRow[];
  if (!rows[0]) return null;
  return getOrderById(orderId, slug);
}

export async function markOnlinePaymentSucceeded(
  orderId: string,
  slug: string,
): Promise<Order | null> {
  const rows = (await db()`
    update checkout_orders
    set
      payment_status = 'marked_paid',
      order_status = case
        when order_status in ('pending', 'cancelled') then 'confirmed'
        else order_status
      end,
      updated_at = now()
    where id = ${orderId} and storefront_slug = ${slug}
      and payment_method in ('skipcash', 'sadad')
    returning *
  `) as unknown as OrderRow[];
  if (!rows[0]) return null;
  return getOrderById(orderId, slug);
}

export async function markOnlinePaymentFailed(
  orderId: string,
  slug: string,
): Promise<Order | null> {
  const rows = (await db()`
    update checkout_orders
    set
      payment_status = 'payment_failed',
      order_status = case
        when order_status in ('pending', 'confirmed') then 'cancelled'
        else order_status
      end,
      updated_at = now()
    where id = ${orderId} and storefront_slug = ${slug}
      and payment_method in ('skipcash', 'sadad')
      and payment_status <> 'marked_paid'
    returning *
  `) as unknown as OrderRow[];
  if (!rows[0]) return null;
  return getOrderById(orderId, slug);
}
