// Demo order + analytics seeder for the explainer-video editor account.
//
// Generates ~320 checkout orders for `noora-abayas` across the last 120
// days with a realistic shape:
//   * upward revenue trend (recent weeks busier than early weeks)
//   * Qatar weekend peaks (Fri/Sat) and evening ordering hours
//   * repeat customers (a VIP cohort), variant labels on line items
//   * believable status/payment mix (delivered → pending pipeline, ~5% cancelled)
//   * a coherent traffic funnel in analytics_events
//     (page_view → product_view → cart_add → order_placed)
//
// Usage:
//   node scripts/seed-editor-orders.mjs
//   node scripts/seed-editor-orders.mjs --reset   # wipe this store's orders/events first

import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

try {
  const env = await readFile('.env.local', 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // optional
}

const DATABASE_URL = (process.env.DATABASE_URL ?? '').trim();
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const SLUG = 'noora-abayas';
const TARGET_ORDERS = 320;
const WINDOW_DAYS = 120;
const RESET = process.argv.includes('--reset');

const sql = neon(DATABASE_URL);

// Deterministic PRNG so re-runs produce the same believable dataset.
let seed = 20260704;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;

// ---------- customers -------------------------------------------------------

const FIRST = ['مريم','فاطمة','نورة','عائشة','هند','شيخة','دانة','لولوة','سارة','العنود','حصة','منيرة','جواهر','روضة','أمل','بدرية','موزة','شمّا','غالية','وضحى'];
const LAST = ['الكواري','المري','النعيمي','السليطي','العطية','الهاجري','المهندي','الدوسري','آل ثاني','الانصاري','البوعينين','الجابر','السويدي','المناعي'];
const AREAS = ['الدفنة','الوكرة','الريان','اللؤلؤة','الخور','أم صلال','السد','المطار القديم','عنيزة','الغرافة'];

function buildCustomers() {
  const customers = [];
  for (let i = 0; i < 150; i += 1) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    customers.push({
      name,
      phone: `+9745${Math.floor(5000000 + rand() * 4999999)}`,
      email: chance(0.4) ? `customer${i}@example.com` : null,
      area: pick(AREAS),
      // VIP cohort orders repeatedly.
      weight: i < 25 ? 5 : 1,
    });
  }
  return customers;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rand() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

// ---------- time distribution ------------------------------------------------

/** Weight for a given day index (0 = oldest). Growth + Qatar weekend. */
function dayWeight(dayIndex, date) {
  const growth = 0.55 + (dayIndex / WINDOW_DAYS) * 1.9; // ~3.5x recent vs old
  const dow = date.getUTCDay(); // Fri=5, Sat=6
  const weekend = dow === 5 ? 1.65 : dow === 6 ? 1.4 : dow === 4 ? 1.15 : 1.0;
  return growth * weekend;
}

function buildTimestamps() {
  const now = Date.now();
  const days = [];
  for (let i = 0; i < WINDOW_DAYS; i += 1) {
    const date = new Date(now - (WINDOW_DAYS - 1 - i) * 86_400_000);
    days.push({ index: i, date, weight: dayWeight(i, date) });
  }
  const stamps = [];
  for (let n = 0; n < TARGET_ORDERS; n += 1) {
    const day = weightedPick(days);
    // Evening-heavy ordering: peak 19:00–23:00 Doha.
    const hour = chance(0.62)
      ? 19 + Math.floor(rand() * 5)
      : 10 + Math.floor(rand() * 9);
    const at = new Date(day.date);
    at.setUTCHours(hour - 3, Math.floor(rand() * 60), Math.floor(rand() * 60), 0); // Doha = UTC+3
    if (at.getTime() > now) at.setTime(now - Math.floor(rand() * 3_600_000));
    stamps.push(at);
  }
  stamps.sort((a, b) => a - b);
  return stamps;
}

// ---------- status / payment mix ---------------------------------------------

function statusFor(createdAt) {
  const ageDays = (Date.now() - createdAt.getTime()) / 86_400_000;
  if (chance(0.05)) return 'cancelled';
  if (ageDays > 10) return 'delivered';
  if (ageDays > 6) return chance(0.85) ? 'delivered' : 'shipped';
  if (ageDays > 3) return pick(['delivered', 'shipped', 'shipped', 'preparing']);
  if (ageDays > 1) return pick(['shipped', 'preparing', 'confirmed']);
  return pick(['pending', 'confirmed', 'confirmed']);
}

function paymentFor(orderStatus, method) {
  if (orderStatus === 'cancelled') return chance(0.3) ? 'refunded' : 'unpaid';
  if (orderStatus === 'delivered') return chance(0.97) ? 'marked_paid' : 'refunded';
  if (orderStatus === 'shipped') return method === 'cod' ? 'unpaid' : 'marked_paid';
  if (method === 'pay_link') return 'marked_paid';
  return 'unpaid';
}

// ---------- main -------------------------------------------------------------

if (RESET) {
  await sql`delete from checkout_orders where storefront_slug = ${SLUG}`;
  await sql`delete from analytics_events where storefront_slug = ${SLUG}`;
  console.log('Wiped existing checkout orders + analytics events.');
}

const existing = await sql`
  select count(*)::int as count from checkout_orders where storefront_slug = ${SLUG}
`;
if (existing[0].count >= TARGET_ORDERS) {
  console.log(`Already ${existing[0].count} orders — nothing to do (use --reset to regenerate).`);
  process.exit(0);
}

const products = await sql`
  select id, title, price_qar::float as price, variant_options, size_options
  from products
  where storefront_slug = ${SLUG} and status <> 'draft'
  order by position
`;
if (products.length === 0) {
  console.error('No products found — run scripts/seed-editor-account.mjs first.');
  process.exit(1);
}

// Popularity: heroes first (matches the "best sellers" analytics story).
const popularity = [30, 24, 14, 8, 10, 16, 12, 6];
const weightedProducts = products.map((p, i) => ({ ...p, weight: popularity[i] ?? 5 }));

const customers = buildCustomers();
const stamps = buildTimestamps();

let orderCount = 0;
let revenue = 0;
const eventRows = []; // {occurred_at, kind, visitor_id, session_id, product_id, referrer_host}

const REFERRERS = ['instagram.com', 'instagram.com', 'instagram.com', 'wa.me', 'snapchat.com', 'google.com', null];

function pushFunnel(at, visitor, session, productId, placedOrder) {
  const referrer = pick(REFERRERS);
  const base = at.getTime();
  const minutes = (m) => new Date(base - m * 60_000);
  eventRows.push({ at: minutes(9 + rand() * 20), kind: 'page_view', visitor, session, product: null, referrer });
  if (chance(0.85)) eventRows.push({ at: minutes(5 + rand() * 8), kind: 'product_view', visitor, session, product: productId, referrer: null });
  if (placedOrder || chance(0.5)) eventRows.push({ at: minutes(2 + rand() * 4), kind: 'cart_add', visitor, session, product: productId, referrer: null });
  if (placedOrder) eventRows.push({ at, kind: 'order_placed', visitor, session, product: null, referrer: null });
}

for (const createdAt of stamps) {
  const customer = weightedPick(customers);
  const method = rand() < 0.5 ? 'cod' : rand() < 0.6 ? 'pay_link' : 'bank_transfer';
  const orderStatus = statusFor(createdAt);
  const paymentStatus = paymentFor(orderStatus, method);

  const itemCount = chance(0.55) ? 1 : chance(0.75) ? 2 : 3;
  const chosen = [];
  for (let i = 0; i < itemCount; i += 1) chosen.push(weightedPick(weightedProducts));

  let subtotal = 0;
  const items = chosen.map((p) => {
    const variants = Array.isArray(p.variant_options) ? p.variant_options : [];
    const sizes = Array.isArray(p.size_options) ? p.size_options : [];
    const color = variants.length ? pick(variants) : null;
    const size = sizes.length ? pick(sizes) : null;
    const delta = (color?.priceDeltaQar ?? 0) + (size?.priceDeltaQar ?? 0);
    const unit = Math.round(p.price + delta);
    const quantity = chance(0.88) ? 1 : 2;
    subtotal += unit * quantity;
    const label = [color?.label, size?.label].filter(Boolean).join(' · ') || null;
    return { productId: p.id, title: p.title, unit, quantity, label };
  });

  const shipping = chance(0.3) ? 0 : 25;
  const total = subtotal + shipping;

  const inserted = await sql`
    insert into checkout_orders
      (storefront_slug, customer_name, customer_phone, customer_email, address,
       payment_method, payment_status, order_status, currency,
       subtotal_qar, shipping_qar, total_qar, accepted_policies,
       created_at, updated_at)
    values
      (${SLUG}, ${customer.name}, ${customer.phone}, ${customer.email},
       ${JSON.stringify({ city: 'الدوحة', area: customer.area })}::jsonb,
       ${method}, ${paymentStatus}, ${orderStatus}, 'QAR',
       ${subtotal}, ${shipping}, ${total}, ${'{terms,privacy}'},
       ${createdAt.toISOString()}, ${createdAt.toISOString()})
    returning id
  `;
  const orderId = inserted[0].id;

  for (const item of items) {
    await sql`
      insert into checkout_order_items
        (order_id, product_id, title_snapshot, price_qar_snapshot, quantity, variant_label, created_at)
      values
        (${orderId}, ${item.productId}, ${item.title}, ${item.unit}, ${item.quantity},
         ${item.label}, ${createdAt.toISOString()})
    `;
  }

  const visitor = `v_${Math.floor(rand() * 1e9).toString(36)}`;
  pushFunnel(createdAt, visitor, `${visitor}_s1`, items[0].productId, true);

  if (orderStatus !== 'cancelled') revenue += total;
  orderCount += 1;
  if (orderCount % 40 === 0) console.log(`  ${orderCount}/${TARGET_ORDERS} orders…`);
}

// Non-converting traffic: browsers who never ordered (~72% of sessions).
const extraSessions = Math.round(TARGET_ORDERS * 2.6);
for (let i = 0; i < extraSessions; i += 1) {
  const at = pick(stamps);
  const jitter = new Date(at.getTime() + (rand() - 0.5) * 86_400_000);
  const visitor = `v_${Math.floor(rand() * 1e9).toString(36)}`;
  const product = weightedPick(weightedProducts);
  pushFunnel(jitter, visitor, `${visitor}_s1`, product.id, false);
}

// Bulk-insert analytics events in chunks via unnest.
const CHUNK = 500;
for (let i = 0; i < eventRows.length; i += CHUNK) {
  const chunk = eventRows.slice(i, i + CHUNK);
  await sql`
    insert into analytics_events
      (occurred_at, storefront_slug, kind, visitor_id, session_id, product_id, referrer_host)
    select * from unnest(
      ${chunk.map((e) => e.at.toISOString())}::timestamptz[],
      ${chunk.map(() => SLUG)}::text[],
      ${chunk.map((e) => e.kind)}::text[],
      ${chunk.map((e) => e.visitor)}::text[],
      ${chunk.map((e) => e.session)}::text[],
      ${chunk.map((e) => e.product)}::text[],
      ${chunk.map((e) => e.referrer)}::text[]
    )
  `;
}

console.log('\n──────────────────────────────────────────');
console.log(`Orders:            ${orderCount}`);
console.log(`Revenue (active):  ${revenue.toLocaleString('en-US')} QAR`);
console.log(`Analytics events:  ${eventRows.length} (page views, product views, cart adds, orders)`);
console.log(`Window:            last ${WINDOW_DAYS} days, growth curve + Fri/Sat peaks`);
console.log('──────────────────────────────────────────');
