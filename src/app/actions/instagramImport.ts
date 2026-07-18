'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { generateText } from 'ai';
import { env } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { hasDb } from '@/lib/db';
import { assertStorefrontOwner, deleteDemoProducts, insertProduct } from '@/lib/products';
import { recordPulseActivity } from '@/lib/pulseActivity';
import { getCopy } from '@/content/copy';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import { resolveInstagramProvider } from '@/lib/instagram/provider';
import { rehostFetchResult } from '@/lib/instagram/rehost';
import { analyzeInstagramPosts, type AnalyzePost } from '@/lib/instagram/analyze';
import { parseQarPrice } from '@/lib/instagram/price';
import type { ReviewQuestionKind } from '@/lib/instagram/questions';
import {
  ANALYZE_BATCH_SIZE,
  MAX_IG_POSTS,
  type DraftProduct,
  type IgFetchResult,
  type StoreSuggestions,
} from '@/lib/instagram/types';

/**
 * Server actions for the /begin Instagram import. These run BEFORE the
 * merchant has a storefront (and possibly before sign-in), so none of
 * them touch the database except `importInstagramProducts`, which runs
 * after `createBrief` and is ownership-checked like the CSV import it
 * mirrors. Abuse is bounded by per-IP rate limits, the 20-post cap, and
 * the Blob-host allowlist on analyze inputs (so this can't be used as a
 * free vision proxy for arbitrary images).
 */

const HANDLE_RE = /^[a-z0-9._]{1,30}$/u;

function toLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

async function clientIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
}

/** Blob re-hosts only — plus the mock's Unsplash fixtures in mock mode. */
function isAllowedImportImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.hostname.endsWith('.public.blob.vercel-storage.com')) return true;
    return env.IG_IMPORT_USE_MOCK && url.hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
}

export type IgFetchState =
  | { status: 'manual_only' }
  | { status: 'started'; runId: string; importId: string }
  | { status: 'done'; importId: string; result: IgFetchResult }
  | { status: 'error'; message: string };

const StartSchema = z.object({
  handle: z.string().trim().min(1).max(64),
  locale: z.string(),
});

export async function startInstagramFetch(
  input: z.input<typeof StartSchema>,
): Promise<IgFetchState> {
  const parsed = StartSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request' };
  const locale = toLocale(parsed.data.locale);
  const t = getCopy(locale).begin.instagramImport;

  const handle = parsed.data.handle.replace(/^@/u, '').toLowerCase();
  if (!HANDLE_RE.test(handle)) return { status: 'error', message: t.invalidHandle };

  if (!rateLimit(`igfetch:${await clientIp()}`, 3, 10 * 60_000).ok) {
    return { status: 'error', message: t.rateLimited };
  }

  const provider = resolveInstagramProvider();
  if (!provider) return { status: 'manual_only' };

  const importId = crypto.randomUUID();
  try {
    const started = await provider.start(handle, env.IG_IMPORT_MAX_POSTS);
    if (started.kind === 'immediate') {
      return { status: 'done', importId, result: started.result };
    }
    return { status: 'started', runId: started.runId, importId };
  } catch (err) {
    console.error('[startInstagramFetch] provider start failed', err);
    return { status: 'error', message: t.fetchFailed };
  }
}

export type IgPollState =
  | { status: 'running' }
  | { status: 'done'; result: IgFetchResult }
  | { status: 'private'; message: string }
  | { status: 'error'; message: string };

const PollSchema = z.object({
  runId: z.string().trim().min(1).max(128),
  handle: z.string().trim().min(1).max(64),
  importId: z.string().uuid(),
  locale: z.string(),
});

export async function pollInstagramFetch(input: z.input<typeof PollSchema>): Promise<IgPollState> {
  const parsed = PollSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request' };
  const t = getCopy(toLocale(parsed.data.locale)).begin.instagramImport;

  if (!rateLimit(`igpoll:${await clientIp()}`, 60, 10 * 60_000).ok) {
    return { status: 'error', message: t.rateLimited };
  }

  const provider = resolveInstagramProvider();
  if (!provider) return { status: 'error', message: t.providerUnavailable };

  try {
    const polled = await provider.poll(parsed.data.runId, parsed.data.handle);
    if (polled.status === 'running') return { status: 'running' };
    if (polled.status === 'private') return { status: 'private', message: t.privateProfile };
    if (polled.status === 'failed') {
      console.error('[pollInstagramFetch] provider failed:', polled.reason);
      return { status: 'error', message: t.fetchFailed };
    }
    const capped: IgFetchResult = {
      profile: polled.result.profile,
      posts: polled.result.posts.slice(0, env.IG_IMPORT_MAX_POSTS),
    };
    // Signed scontent URLs expire — every image the client will ever see
    // is re-hosted to Blob here, inside the poll that saw SUCCEEDED.
    const rehosted = await rehostFetchResult(capped, parsed.data.importId);
    if (rehosted.posts.length === 0) return { status: 'error', message: t.fetchFailed };
    return { status: 'done', result: rehosted };
  } catch (err) {
    console.error('[pollInstagramFetch] failed', err);
    return { status: 'error', message: t.fetchFailed };
  }
}

export type IgAnalyzeState =
  | { status: 'ok'; drafts: DraftProduct[]; suggestions: StoreSuggestions | null }
  | { status: 'ai_unavailable' }
  | { status: 'error'; message: string };

const AnalyzeSchema = z.object({
  importId: z.string().uuid(),
  locale: z.string(),
  profile: z.object({
    handle: z.string().trim().min(1).max(64),
    bio: z.string().max(600).nullable(),
  }),
  posts: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        shortcode: z.string().trim().min(1).max(80),
        imageUrl: z.string().url(),
        caption: z.string().max(3000).nullable(),
      }),
    )
    .min(1)
    .max(ANALYZE_BATCH_SIZE),
  includeStoreSuggestions: z.boolean(),
});

export async function analyzeInstagramBatch(
  input: z.input<typeof AnalyzeSchema>,
): Promise<IgAnalyzeState> {
  const parsed = AnalyzeSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request' };
  const locale = toLocale(parsed.data.locale);
  const t = getCopy(locale).begin.instagramImport;

  if (parsed.data.posts.some((post) => !isAllowedImportImageUrl(post.imageUrl))) {
    return { status: 'error', message: 'Invalid request' };
  }
  if (!rateLimit(`iganalyze:${await clientIp()}`, 12, 10 * 60_000).ok) {
    return { status: 'error', message: t.rateLimited };
  }

  const result = await analyzeInstagramPosts({
    posts: parsed.data.posts as AnalyzePost[],
    profile: parsed.data.profile,
    includeStoreSuggestions: parsed.data.includeStoreSuggestions,
    locale,
  });
  if (result.status === 'ai_unavailable') return { status: 'ai_unavailable' };
  if (result.status === 'error') return { status: 'error', message: t.aiUnavailable };
  return { status: 'ok', drafts: result.drafts, suggestions: result.suggestions };
}

export type IgAnswerState =
  | { status: 'ok'; patch: Partial<DraftProduct> }
  | { status: 'unparsed' }
  | { status: 'error'; message: string };

const AnswerSchema = z.object({
  locale: z.string(),
  questionKind: z.enum(['is_product', 'price', 'title', 'category']),
  answerText: z.string().trim().min(1).max(500),
  draft: z.object({
    titleEn: z.string().max(180).nullable(),
    titleAr: z.string().max(180).nullable(),
    priceQar: z.number().nullable(),
    category: z.string().max(60).nullable(),
  }),
});

const PatchSchema = z.object({
  priceQar: z.number().positive().max(1_000_000).nullable().optional(),
  titleEn: z.string().trim().min(1).max(120).optional(),
  titleAr: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(60).optional(),
});

const ANSWER_PATCH_KEYS: Record<ReviewQuestionKind, ReadonlyArray<keyof z.infer<typeof PatchSchema>>> = {
  is_product: [],
  price: ['priceQar'],
  title: ['titleEn', 'titleAr'],
  category: ['category'],
};

/**
 * Turn a free-text chat answer into a structured draft patch. Prices go
 * regex-first — "250 qr" never costs a model call. Everything else uses
 * the cheap text model when the gateway is up, and a plain-text echo
 * fallback when it is not.
 */
export async function parseImportAnswer(input: z.input<typeof AnswerSchema>): Promise<IgAnswerState> {
  const parsed = AnswerSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request' };
  const t = getCopy(toLocale(parsed.data.locale)).begin.instagramImport;

  if (!rateLimit(`iganswer:${await clientIp()}`, 30, 10 * 60_000).ok) {
    return { status: 'error', message: t.rateLimited };
  }

  const { questionKind, answerText, draft } = parsed.data;

  if (questionKind === 'price') {
    const regexHit = parseQarPrice(answerText);
    if (regexHit.priceQar !== null) return { status: 'ok', patch: { priceQar: regexHit.priceQar } };
    // A bare number is unambiguous as a direct reply to "what does it cost?"
    const bare = answerText.replace(/[^\d.٠-٩۰-۹]/gu, '');
    const bareHit = parseQarPrice(bare ? `${bare} QR` : '');
    if (bareHit.priceQar !== null) return { status: 'ok', patch: { priceQar: bareHit.priceQar } };
  }

  const hasGatewayCredentials = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
  if (!hasGatewayCredentials) {
    // Echo fallback: treat the text as the value itself.
    if (questionKind === 'title') {
      const isArabic = /[؀-ۿ]/u.test(answerText);
      return {
        status: 'ok',
        patch: isArabic
          ? { titleAr: answerText.slice(0, 120) }
          : { titleEn: answerText.slice(0, 120) },
      };
    }
    if (questionKind === 'category') {
      return { status: 'ok', patch: { category: answerText.slice(0, 60) } };
    }
    return { status: 'unparsed' };
  }

  try {
    const allowedKeys = ANSWER_PATCH_KEYS[questionKind];
    const result = await generateText({
      model: env.SOUQY_CHAT_MODEL,
      system: `A merchant is answering a question about a draft product (current values: ${JSON.stringify(draft)}). The question was about: ${questionKind}. Extract the update from their answer into JSON: {"patch": {...}} using only these keys: ${JSON.stringify(allowedKeys)}. priceQar is a number in Qatari Riyal (Arabic-Indic digits like ٢٥٠ are numbers; "riyal"/"QR"/"ر.ق" are currency markers). If the answer contains no usable value, return {"patch": {}}. JSON only.`,
      messages: [{ role: 'user', content: answerText }],
      temperature: 0,
      maxOutputTokens: 200,
      providerOptions: {
        gateway: { user: 'begin-instagram-import', tags: ['feature:ig-import'] },
      },
    });
    const jsonText = result.text.trim().replace(/^```(?:json)?\s*|```\s*$/gu, '');
    const patch = PatchSchema.parse(JSON.parse(jsonText).patch ?? {});
    const filtered: Partial<DraftProduct> = {};
    for (const key of ANSWER_PATCH_KEYS[questionKind]) {
      if (patch[key] !== undefined) (filtered as Record<string, unknown>)[key] = patch[key];
    }
    if (Object.keys(filtered).length === 0) return { status: 'unparsed' };
    return { status: 'ok', patch: filtered };
  } catch (err) {
    console.error('[parseImportAnswer] failed', err);
    return { status: 'unparsed' };
  }
}

export type IgUploadState =
  | { status: 'ok'; imageUrl: string; postId: string }
  | { status: 'error'; message: string };

const UPLOAD_ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/** Manual-mode fallback: the merchant's own photos enter the same
 *  analyze pipeline as fetched posts. */
export async function uploadImportImage(formData: FormData): Promise<IgUploadState> {
  const importId = String(formData.get('importId') ?? '');
  const locale = toLocale(String(formData.get('locale') ?? ''));
  const file = formData.get('file');
  const t = getCopy(locale).begin.instagramImport;

  if (!z.string().uuid().safeParse(importId).success || !(file instanceof File)) {
    return { status: 'error', message: t.uploadFailed };
  }
  if (!UPLOAD_ALLOWED.has(file.type) || file.size > UPLOAD_MAX_BYTES || file.size === 0) {
    return { status: 'error', message: t.uploadFailed };
  }
  if (!rateLimit(`igupload:${await clientIp()}`, 30, 10 * 60_000).ok) {
    return { status: 'error', message: t.rateLimited };
  }

  try {
    const id = crypto.randomUUID();
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png';
    const blob = await put(
      `instagram-imports/${importId}/manual-${id}.${ext}`,
      await file.arrayBuffer(),
      { access: 'public', contentType: file.type },
    );
    return { status: 'ok', imageUrl: blob.url, postId: `manual-${id}` };
  } catch (err) {
    console.error('[uploadImportImage] failed', err);
    return { status: 'error', message: t.uploadFailed };
  }
}

export type IgImportState =
  | { status: 'success'; inserted: number; skipped: number }
  | { status: 'error'; message: string };

const ConfirmedDraftSchema = z.object({
  postId: z.string().trim().min(1).max(80),
  titleEn: z.string().trim().max(180).nullable(),
  titleAr: z.string().trim().max(180).nullable(),
  description: z.string().trim().max(2000).nullable(),
  priceQar: z.number().positive().max(1_000_000).nullable(),
  category: z.string().trim().max(60).nullable(),
  sizeOptions: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  variantOptions: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  imageUrl: z.string().url().nullable(),
  sourceUrl: z.string().url().max(200).nullable(),
});

const ImportSchema = z.object({
  slug: z.string().trim().min(3).max(40),
  importId: z.string().uuid(),
  locale: z.string(),
  products: z.array(ConfirmedDraftSchema).min(1).max(MAX_IG_POSTS),
});

/**
 * The commit step — runs after `createBrief` returns the slug, mirroring
 * `importProductsFromCsv` (auth → ownership → insert loop → pulse →
 * revalidate). Real imported products supersede the template demo seeds.
 */
export async function importInstagramProducts(
  input: z.input<typeof ImportSchema>,
): Promise<IgImportState> {
  const parsed = ImportSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request' };
  const locale = toLocale(parsed.data.locale);
  const t = getCopy(locale).begin.instagramImport;

  if (!rateLimit(`igimport:${await clientIp()}`, 6, 60_000).ok) {
    return { status: 'error', message: t.rateLimited };
  }
  if (!hasDb()) return { status: 'error', message: t.importFailed };

  const { userId } = await auth();
  const sf = await assertStorefrontOwner(parsed.data.slug, userId);
  if (!sf) return { status: 'error', message: 'Forbidden' };

  let inserted = 0;
  let skipped = 0;
  for (const draft of parsed.data.products) {
    const primaryTitle = locale === 'ar' ? (draft.titleAr ?? draft.titleEn) : (draft.titleEn ?? draft.titleAr);
    const subtitle = locale === 'ar' ? draft.titleEn : draft.titleAr;
    if (!primaryTitle) {
      skipped += 1;
      continue;
    }
    if (draft.imageUrl && !isAllowedImportImageUrl(draft.imageUrl)) {
      skipped += 1;
      continue;
    }
    try {
      const product = await insertProduct(parsed.data.slug, {
        title: primaryTitle.slice(0, 180),
        subtitle: subtitle && subtitle !== primaryTitle ? subtitle : null,
        description: draft.description,
        priceQar: draft.priceQar,
        imageUrl: draft.imageUrl,
        category: draft.category,
        sizeOptions: draft.sizeOptions,
        variantOptions: draft.variantOptions,
        eventAt: null,
        // Unpriced items land as drafts so nothing goes live at 0 QAR.
        status: draft.priceQar !== null ? 'active' : 'draft',
        source: 'instagram',
        sourceUrl: draft.sourceUrl,
      });
      await recordPulseActivity({
        source: 'products',
        kind: 'product.created',
        actorClerkUserId: sf.clerkUserId,
        ownerClerkUserId: sf.clerkUserId,
        storefrontSlug: parsed.data.slug,
        resourceType: 'product',
        resourceId: product.id,
        title: product.title,
        summary: `Imported product ${product.title} from Instagram`,
        metadata: {
          imported: true,
          source: 'instagram',
          priceQar: product.priceQar,
          status: product.status,
          category: product.category,
          imageUrl: product.imageUrl,
          position: product.position,
        },
      });
      inserted += 1;
    } catch (err) {
      console.error('[importInstagramProducts] insert failed', err);
      skipped += 1;
    }
  }

  if (inserted > 0) {
    // Real merchandise replaces the template demo seeds; a fully failed
    // import leaves the demos so the storefront never launches empty.
    try {
      await deleteDemoProducts(parsed.data.slug);
    } catch (err) {
      console.error('[importInstagramProducts] demo cleanup failed', err);
    }
  }

  revalidatePath('/account');
  revalidatePath(`/account/${parsed.data.slug}/preview`);

  if (inserted === 0) return { status: 'error', message: t.importFailed };
  return { status: 'success', inserted, skipped };
}
