import { unstable_noStore as noStore } from 'next/cache';
import { db } from './db';

export type DiscountKind = 'code' | 'automatic';
export type DiscountValueType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type DiscountAppliesTo = 'all' | 'products' | 'categories';
export type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'disabled';

export type Discount = {
  id: number;
  storefrontSlug: string;
  kind: DiscountKind;
  code: string;
  title: string | null;
  valueType: DiscountValueType;
  value: number;
  appliesTo: DiscountAppliesTo;
  appliesToIds: string[];
  minimumSubtotal: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usedCount: number;
  status: DiscountStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  meta: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type CheckoutDiscountLine = {
  productId: string;
  category: string | null;
  lineTotalQar: number;
};

export type CheckoutDiscountApplication = {
  id: number;
  code: string;
  title: string | null;
  productDiscountQar: number;
  shippingDiscountQar: number;
  discountQar: number;
};

export type CheckoutDiscountValidationInput = {
  storefrontSlug: string;
  code: string;
  subtotalQar: number;
  shippingQar: number;
  lines: CheckoutDiscountLine[];
  customerEmail?: string | null;
  customerPhone?: string | null;
};

export type CheckoutDiscountValidationResult =
  | { ok: true; application: CheckoutDiscountApplication }
  | { ok: false; message: string };

type DiscountRow = {
  id: number;
  storefront_slug: string;
  kind: DiscountKind;
  code: string;
  title: string | null;
  value_type: DiscountValueType;
  value: string;
  applies_to: DiscountAppliesTo;
  applies_to_ids: string[];
  minimum_subtotal: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  used_count: number;
  status: DiscountStatus;
  starts_at: string | null;
  ends_at: string | null;
  meta: unknown;
  created_at: string;
  updated_at: string;
};

function fromRow(r: DiscountRow): Discount {
  return {
    id: r.id,
    storefrontSlug: r.storefront_slug,
    kind: r.kind,
    code: r.code,
    title: r.title,
    valueType: r.value_type,
    value: Number(r.value),
    appliesTo: r.applies_to,
    appliesToIds: Array.isArray(r.applies_to_ids) ? r.applies_to_ids : [],
    minimumSubtotal: r.minimum_subtotal !== null ? Number(r.minimum_subtotal) : null,
    usageLimit: r.usage_limit,
    perCustomerLimit: r.per_customer_limit,
    usedCount: r.used_count,
    status: r.status,
    startsAt: r.starts_at ? new Date(r.starts_at) : null,
    endsAt: r.ends_at ? new Date(r.ends_at) : null,
    meta: r.meta && typeof r.meta === 'object' ? (r.meta as Record<string, unknown>) : {},
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export async function listDiscounts(
  storefrontSlug: string,
  opts: { status?: DiscountStatus | 'all'; limit?: number } = {},
): Promise<Discount[]> {
  noStore();
  const limit = Math.min(opts.limit ?? 100, 200);
  const status = opts.status ?? 'all';
  const rows =
    status === 'all'
      ? ((await db()`
          select * from discounts
          where storefront_slug = ${storefrontSlug}
          order by created_at desc
          limit ${limit}
        `) as unknown as DiscountRow[])
      : ((await db()`
          select * from discounts
          where storefront_slug = ${storefrontSlug} and status = ${status}
          order by created_at desc
          limit ${limit}
        `) as unknown as DiscountRow[]);
  return rows.map(fromRow);
}

export async function getDiscount(storefrontSlug: string, id: number): Promise<Discount | null> {
  noStore();
  const rows = (await db()`
    select * from discounts
    where storefront_slug = ${storefrontSlug} and id = ${id}
    limit 1
  `) as unknown as DiscountRow[];
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function getDiscountByCode(
  storefrontSlug: string,
  code: string,
): Promise<Discount | null> {
  noStore();
  const rows = (await db()`
    select * from discounts
    where storefront_slug = ${storefrontSlug}
      and code = ${code}
      and status = 'active'
    limit 1
  `) as unknown as DiscountRow[];
  return rows[0] ? fromRow(rows[0]) : null;
}

export function normalizeDiscountCode(code: string | null | undefined): string {
  return (code ?? '').trim().replace(/\s+/g, '').toUpperCase();
}

export function calculateCheckoutDiscount(
  discount: Discount,
  input: Pick<CheckoutDiscountValidationInput, 'subtotalQar' | 'shippingQar' | 'lines'>,
): CheckoutDiscountApplication | null {
  const subtotalQar = roundQar(input.subtotalQar);
  const shippingQar = roundQar(input.shippingQar);
  const eligibleSubtotalQar = eligibleDiscountSubtotal(discount, input.lines);
  let productDiscountQar = 0;
  let shippingDiscountQar = 0;

  if (discount.valueType === 'percentage') {
    const percentage = Math.min(Math.max(discount.value, 0), 100);
    productDiscountQar = Math.min(
      eligibleSubtotalQar,
      roundQar((eligibleSubtotalQar * percentage) / 100),
    );
  } else if (discount.valueType === 'fixed_amount') {
    productDiscountQar = Math.min(eligibleSubtotalQar, roundQar(discount.value));
  } else {
    shippingDiscountQar = shippingQar;
  }

  productDiscountQar = Math.min(productDiscountQar, subtotalQar);
  const discountQar = productDiscountQar + shippingDiscountQar;
  if (discountQar <= 0) return null;

  return {
    id: discount.id,
    code: discount.code,
    title: discount.title,
    productDiscountQar,
    shippingDiscountQar,
    discountQar,
  };
}

export async function validateCheckoutDiscount(
  input: CheckoutDiscountValidationInput,
): Promise<CheckoutDiscountValidationResult> {
  const code = normalizeDiscountCode(input.code);
  if (!code || !/^[A-Z0-9_-]+$/.test(code)) {
    return { ok: false, message: 'Enter a valid promo code.' };
  }

  const discount = await getDiscountByCode(input.storefrontSlug, code);
  if (!discount || discount.kind !== 'code') {
    return { ok: false, message: 'That promo code is not valid for this store.' };
  }

  const now = Date.now();
  if (discount.startsAt && discount.startsAt.getTime() > now) {
    return { ok: false, message: 'That promo code is not active yet.' };
  }
  if (discount.endsAt && discount.endsAt.getTime() < now) {
    return { ok: false, message: 'That promo code has expired.' };
  }

  const subtotalQar = roundQar(input.subtotalQar);
  if (discount.minimumSubtotal !== null && subtotalQar < roundQar(discount.minimumSubtotal)) {
    return {
      ok: false,
      message: `This code requires a minimum subtotal of QAR ${roundQar(
        discount.minimumSubtotal,
      )}.`,
    };
  }

  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) {
    return { ok: false, message: 'That promo code has reached its usage limit.' };
  }

  if (discount.perCustomerLimit !== null) {
    const customerUses = await countCheckoutDiscountUses({
      storefrontSlug: input.storefrontSlug,
      discountId: discount.id,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
    });
    if (customerUses >= discount.perCustomerLimit) {
      return { ok: false, message: 'That promo code has already been used for this customer.' };
    }
  }

  const application = calculateCheckoutDiscount(discount, input);
  if (!application) {
    return { ok: false, message: 'That promo code does not apply to these items.' };
  }
  return { ok: true, application };
}

export async function incrementDiscountUsage(
  storefrontSlug: string,
  discountId: number,
): Promise<boolean> {
  const rows = (await db()`
    update discounts
    set used_count = used_count + 1,
        updated_at = now()
    where storefront_slug = ${storefrontSlug}
      and id = ${discountId}
      and (usage_limit is null or used_count < usage_limit)
    returning id
  `) as unknown as { id: number }[];
  return rows.length > 0;
}

export async function countDiscounts(
  storefrontSlug: string,
  status?: DiscountStatus,
): Promise<number> {
  noStore();
  if (status) {
    const rows = (await db()`
      select count(*)::int as n from discounts
      where storefront_slug = ${storefrontSlug} and status = ${status}
    `) as unknown as { n: number }[];
    return rows[0]?.n ?? 0;
  }
  const rows = (await db()`
    select count(*)::int as n from discounts
    where storefront_slug = ${storefrontSlug}
  `) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}

async function countCheckoutDiscountUses(input: {
  storefrontSlug: string;
  discountId: number;
  customerEmail?: string | null;
  customerPhone?: string | null;
}): Promise<number> {
  const email = input.customerEmail?.trim().toLowerCase() || null;
  const phoneDigits = normalizePhoneDigits(input.customerPhone);
  if (!email && !phoneDigits) return 0;

  const rows = (await db()`
    select count(*)::int as n
    from checkout_orders
    where storefront_slug = ${input.storefrontSlug}
      and discount_id = ${input.discountId}
      and order_status <> 'cancelled'
      and (
        (${email}::text is not null and lower(coalesce(customer_email, '')) = ${email})
        or
        (${phoneDigits}::text is not null and regexp_replace(customer_phone, '[^0-9]+', '', 'g') = ${phoneDigits})
      )
  `) as unknown as { n: number }[];
  return Number(rows[0]?.n ?? 0);
}

function eligibleDiscountSubtotal(discount: Discount, lines: CheckoutDiscountLine[]): number {
  if (discount.appliesTo === 'all') {
    return lines.reduce((sum, line) => sum + roundQar(line.lineTotalQar), 0);
  }
  const ids = new Set(discount.appliesToIds.map((id) => id.trim().toLowerCase()).filter(Boolean));
  if (ids.size === 0) return 0;

  return lines.reduce((sum, line) => {
    if (discount.appliesTo === 'products') {
      return ids.has(line.productId.toLowerCase()) ? sum + roundQar(line.lineTotalQar) : sum;
    }
    const category = line.category?.trim().toLowerCase();
    return category && ids.has(category) ? sum + roundQar(line.lineTotalQar) : sum;
  }, 0);
}

function normalizePhoneDigits(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/[^0-9]+/g, '');
  return digits.length > 0 ? digits : null;
}

function roundQar(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export type DiscountWriteInput = {
  kind: DiscountKind;
  code: string;
  title: string | null;
  valueType: DiscountValueType;
  value: number;
  appliesTo: DiscountAppliesTo;
  appliesToIds: string[];
  minimumSubtotal: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  status: DiscountStatus;
  startsAt: Date | null;
  endsAt: Date | null;
};

export async function createDiscount(
  storefrontSlug: string,
  input: DiscountWriteInput,
): Promise<Discount> {
  const rows = (await db()`
    insert into discounts (
      storefront_slug, kind, code, title, value_type, value,
      applies_to, applies_to_ids, minimum_subtotal,
      usage_limit, per_customer_limit, status, starts_at, ends_at
    ) values (
      ${storefrontSlug}, ${input.kind}, ${input.code}, ${input.title},
      ${input.valueType}, ${input.value}, ${input.appliesTo},
      ${input.appliesToIds as unknown as string},
      ${input.minimumSubtotal}, ${input.usageLimit}, ${input.perCustomerLimit},
      ${input.status},
      ${input.startsAt ? input.startsAt.toISOString() : null},
      ${input.endsAt ? input.endsAt.toISOString() : null}
    )
    returning *
  `) as unknown as DiscountRow[];
  if (!rows[0]) throw new Error('insert discount failed');
  return fromRow(rows[0]);
}

export async function updateDiscount(
  storefrontSlug: string,
  id: number,
  input: DiscountWriteInput,
): Promise<Discount | null> {
  const rows = (await db()`
    update discounts set
      kind                = ${input.kind},
      code                = ${input.code},
      title               = ${input.title},
      value_type          = ${input.valueType},
      value               = ${input.value},
      applies_to          = ${input.appliesTo},
      applies_to_ids      = ${input.appliesToIds as unknown as string},
      minimum_subtotal    = ${input.minimumSubtotal},
      usage_limit         = ${input.usageLimit},
      per_customer_limit  = ${input.perCustomerLimit},
      status              = ${input.status},
      starts_at           = ${input.startsAt ? input.startsAt.toISOString() : null},
      ends_at             = ${input.endsAt ? input.endsAt.toISOString() : null},
      updated_at          = now()
    where storefront_slug = ${storefrontSlug} and id = ${id}
    returning *
  `) as unknown as DiscountRow[];
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function deleteDiscount(storefrontSlug: string, id: number): Promise<boolean> {
  const rows = (await db()`
    delete from discounts
    where storefront_slug = ${storefrontSlug} and id = ${id}
    returning id
  `) as unknown as { id: number }[];
  return rows.length > 0;
}
