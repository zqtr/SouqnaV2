// One-shot seeder for the explainer-video editor account.
//
// Creates (idempotently):
//   * a Clerk user (editor@souqna.qa) with a printed password
//   * a Max+ (`atelier`) row in `user_plans`
//   * the "عبايات نورة" storefront (slug: noora-abayas, ar, tailoring_abaya,
//     atrium template) matching the 60s explainer script
//   * an abaya catalogue with size + color variants and categories
//
// Usage:
//   node scripts/seed-editor-account.mjs
//   node scripts/seed-editor-account.mjs --reset-products   # wipe + reseed catalogue

import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

try {
  const env = await readFile('.env.local', 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // .env.local optional
}

const DATABASE_URL = (process.env.DATABASE_URL ?? '').trim();
const CLERK_SECRET_KEY = (process.env.CLERK_SECRET_KEY ?? '').trim();
if (!DATABASE_URL || !CLERK_SECRET_KEY) {
  console.error('DATABASE_URL and CLERK_SECRET_KEY are required (from .env.local).');
  process.exit(1);
}

const RESET_PRODUCTS = process.argv.includes('--reset-products');

const EMAIL = 'editor@souqna.qa';
const SLUG = 'noora-abayas';
const sql = neon(DATABASE_URL);

// ---------- 1. Clerk user ---------------------------------------------------

async function clerk(path, init = {}) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function ensureClerkUser() {
  const existing = await clerk(`/users?email_address=${encodeURIComponent(EMAIL)}`);
  if (existing.status === 200 && Array.isArray(existing.body) && existing.body.length > 0) {
    const user = existing.body[0];
    console.log(`Clerk user exists: ${user.id} (${EMAIL}) — keeping current password.`);
    return { id: user.id, password: null };
  }

  const password = `Noora-${randomBytes(6).toString('base64url')}`;
  const created = await clerk('/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [EMAIL],
      password,
      first_name: 'Noora',
      last_name: 'Editor',
      skip_password_checks: true,
    }),
  });
  if (created.status >= 300 || !created.body?.id) {
    console.error('Clerk user creation failed:', created.status, JSON.stringify(created.body));
    process.exit(1);
  }
  console.log(`Clerk user created: ${created.body.id} (${EMAIL})`);
  return { id: created.body.id, password };
}

// ---------- 2. Max+ plan ----------------------------------------------------

async function ensureMaxPlusPlan(clerkUserId) {
  await sql`
    insert into user_plans (clerk_user_id, plan, meta)
    values (${clerkUserId}, 'atelier', ${'{"source":"seed-editor-account"}'}::jsonb)
    on conflict (clerk_user_id) do update set plan = 'atelier', updated_at = now()
  `;
  console.log('Plan set: atelier (Max+)');
}

// ---------- 3. Storefront ---------------------------------------------------

async function ensureStorefront(clerkUserId) {
  const rows = await sql`select slug, clerk_user_id from briefs where slug = ${SLUG} limit 1`;
  if (rows.length > 0) {
    if (rows[0].clerk_user_id !== clerkUserId) {
      await sql`update briefs set clerk_user_id = ${clerkUserId} where slug = ${SLUG}`;
      console.log(`Storefront ${SLUG} existed — reassigned to editor user.`);
    } else {
      console.log(`Storefront ${SLUG} already exists.`);
    }
    return;
  }

  await sql`
    insert into briefs (
      slug, locale, founder_name, business_name, contact_email,
      ownership, experience, business_type, market_volume, payments,
      tagline, phone, area, hours, instagram, logo_url, design, palette,
      template_id, cr_number, clerk_user_id, is_published
    ) values (
      ${SLUG}, 'ar', ${'نورة'}, ${'عبايات نورة'}, ${EMAIL},
      'sole', 'experienced', 'tailoring_abaya', 'medium', 'cod',
      ${'عبايات مطرزة بخيوط ذهبية — تفصيل وخياطة من قلب الدوحة'},
      '+97455555555', ${'الدوحة'}, ${'٩ص – ٩م'}, 'noora.abayas', null,
      'atrium', 'bone_obsidian', 'atrium', null, ${clerkUserId}, false
    )
  `;
  console.log(`Storefront created: ${SLUG} (عبايات نورة · atrium · bone_obsidian)`);
}

// ---------- 4. Abaya catalogue ---------------------------------------------

const SIZES = ['52', '54', '56', '58'].map((label) => ({ label, priceDeltaQar: 0 }));
const IMG = (n) => `/seed-products/atrium/${n}.svg`;

const CATEGORIES = [
  { name: 'عبايات كلاسيك', slug: 'classic', description: 'قصّات يومية بخامات فاخرة.' },
  { name: 'عبايات مطرزة', slug: 'embroidered', description: 'تطريز يدوي بخيوط ذهبية وفضية.' },
  { name: 'عبايات مناسبات', slug: 'occasion', description: 'قطع استثنائية للمناسبات.' },
  { name: 'شيلات', slug: 'sheila', description: 'شيلات حرير مطابقة.' },
];

const PRODUCTS = [
  {
    title: 'عباية السحاب — كريب أسود',
    description: 'كريب ياباني انسيابي بقصّة كلاسيكية، أكمام واسعة وحواف مخفية.',
    price: 480,
    cat: 'classic',
    img: IMG(1),
    variants: [
      { label: 'أسود', priceDeltaQar: 0 },
      { label: 'كحلي', priceDeltaQar: 0 },
      { label: 'رمادي فحمي', priceDeltaQar: 20 },
    ],
  },
  {
    title: 'عباية ليل الدوحة — تطريز ذهبي',
    description: 'تطريز يدوي بخيط ذهبي على الأكمام، بطانة حرير.',
    price: 890,
    cat: 'embroidered',
    img: IMG(2),
    variants: [
      { label: 'ذهبي', priceDeltaQar: 0 },
      { label: 'فضي', priceDeltaQar: 0 },
      { label: 'نحاسي', priceDeltaQar: 35 },
    ],
  },
  {
    title: 'عباية الفجر — لينن بيج',
    description: 'لينن مطفي بلون الرمل، مثالية للنهار وخفيفة على الصيف.',
    price: 520,
    cat: 'classic',
    img: IMG(3),
    variants: [
      { label: 'بيج رملي', priceDeltaQar: 0 },
      { label: 'زيتوني', priceDeltaQar: 0 },
    ],
  },
  {
    title: 'عباية المناسبات — ساتان مطرز بالكامل',
    description: 'قطعة مجلس: ساتان ثقيل بتطريز كامل على الصدر والأكمام.',
    price: 1450,
    cat: 'occasion',
    img: IMG(4),
    variants: [
      { label: 'أسود × ذهبي', priceDeltaQar: 0 },
      { label: 'كحلي × فضي', priceDeltaQar: 0 },
    ],
  },
  {
    title: 'عباية الوسام — كِم مطرز',
    description: 'تفصيلة كِم واسعة بحزام داخلي، تطريز هندسي دقيق.',
    price: 760,
    cat: 'embroidered',
    img: IMG(5),
    variants: [
      { label: 'أسود', priceDeltaQar: 0 },
      { label: 'عنابي', priceDeltaQar: 25 },
    ],
  },
  {
    title: 'شيلة حرير — سادة',
    description: 'حرير طبيعي ١٩ ملم بحواف مخيطة يدويًا، تطابق كل العبايات.',
    price: 180,
    cat: 'sheila',
    img: IMG(1),
    sizes: [{ label: 'قياس واحد', priceDeltaQar: 0 }],
    variants: [
      { label: 'أسود', priceDeltaQar: 0 },
      { label: 'بيج', priceDeltaQar: 0 },
      { label: 'رمادي', priceDeltaQar: 0 },
    ],
  },
  {
    title: 'شيلة مطرزة — خيط ذهبي',
    description: 'شيلة شيفون بحافة مطرزة تطابق عباية ليل الدوحة.',
    price: 260,
    cat: 'sheila',
    img: IMG(2),
    sizes: [{ label: 'قياس واحد', priceDeltaQar: 0 }],
    variants: [
      { label: 'ذهبي', priceDeltaQar: 0 },
      { label: 'فضي', priceDeltaQar: 0 },
    ],
  },
  {
    title: 'عباية رمضان — إصدار محدود',
    description: 'إصدار موسمي بقماش جاكار منسوج بنقشة هلال خفية.',
    price: 980,
    cat: 'occasion',
    img: IMG(3),
    status: 'sold_out',
    variants: [{ label: 'أسود جاكار', priceDeltaQar: 0 }],
  },
];

async function seedCatalogue() {
  if (RESET_PRODUCTS) {
    await sql`delete from products where storefront_slug = ${SLUG}`;
    console.log('Existing products wiped (--reset-products).');
  }

  const existing = await sql`
    select count(*)::int as count from products where storefront_slug = ${SLUG}
  `;
  if (existing[0].count >= PRODUCTS.length) {
    console.log(`Catalogue already seeded (${existing[0].count} products) — skipping.`);
    return;
  }

  const categoryIds = new Map();
  for (const cat of CATEGORIES) {
    const rows = await sql`
      insert into categories (storefront_slug, name, slug, description)
      values (${SLUG}, ${cat.name}, ${cat.slug}, ${cat.description})
      on conflict (storefront_slug, slug) do update set name = excluded.name
      returning id
    `;
    if (rows[0]?.id) categoryIds.set(cat.slug, rows[0].id);
  }

  let position = 0;
  for (const p of PRODUCTS) {
    const sizes = JSON.stringify(p.sizes ?? SIZES);
    const variants = JSON.stringify(p.variants ?? []);
    const inserted = await sql`
      insert into products
        (storefront_slug, title, description, price_qar, image_url, category,
         status, position, size_options, variant_options)
      values
        (${SLUG}, ${p.title}, ${p.description}, ${p.price}, ${p.img},
         ${CATEGORIES.find((c) => c.slug === p.cat)?.name ?? null},
         ${p.status ?? 'active'}, ${position}, ${sizes}::jsonb, ${variants}::jsonb)
      returning id
    `;
    const categoryId = categoryIds.get(p.cat);
    if (categoryId && inserted[0]?.id) {
      await sql`
        insert into product_categories (product_id, category_id)
        values (${inserted[0].id}, ${categoryId})
        on conflict do nothing
      `;
    }
    position += 1;
  }
  console.log(`Catalogue seeded: ${PRODUCTS.length} products, ${CATEGORIES.length} categories.`);
}

// ---------- run --------------------------------------------------------------

const user = await ensureClerkUser();
await ensureMaxPlusPlan(user.id);
await ensureStorefront(user.id);
await seedCatalogue();

console.log('\n──────────────────────────────────────────');
console.log('Editor account ready.');
console.log(`  Login:     ${EMAIL}`);
console.log(`  Password:  ${user.password ?? '(unchanged — already existed)'}`);
console.log('  Plan:      Max+ (atelier)');
console.log(`  Storefront: عبايات نورة → /brief/${SLUG}`);
console.log('  Record at:  /begin · /account/builder · /account · /account/analytics');
console.log('──────────────────────────────────────────');
