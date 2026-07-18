import 'server-only';
import { generateText } from 'ai';
import { z } from 'zod';
import { env } from '@/lib/env';
import { TEMPLATE_IDS, type BusinessType } from '@/lib/brief';
import type { Locale } from '@/i18n/locales';
import { parseQarPrice } from './price';
import { computeGaps } from './questions';
import { ANALYZE_BATCH_SIZE, type DraftProduct, type StoreSuggestions } from './types';

/**
 * Vision analysis: a batch of ≤4 post images + captions in, structured
 * product drafts out. Follows the souqy generate conventions (gateway
 * model slug, fence-strip → JSON.parse → Zod, one repair retry) but is
 * vision-only: the Replicate text fallback can't see images, so without
 * gateway credentials the caller gets `ai_unavailable` and the chat
 * falls back to deterministic questions + regex price parsing.
 *
 * The model's numeric/gap output is never trusted directly: prices are
 * cross-checked against `parseQarPrice`, enums are validated against the
 * real lists, and gaps are recomputed in `normalizeDrafts`.
 */

// Mirrors the BusinessType union — `satisfies` breaks the build if the
// union in brief.ts gains a member this list is missing.
const BUSINESS_TYPES = [
  'graphic_design',
  'clothing_store',
  'home_kitchen',
  'salon',
  'cafe',
  'ecommerce',
  'real_estate',
  'photography',
  'tutoring',
  'fitness',
  'perfume_oud',
  'auto_detailing',
  'events_weddings',
  'agriculture',
  'courier_delivery',
  'contracting',
  'art_gallery',
  'tailoring_abaya',
  'fnb_brand',
  'something_else',
] as const satisfies readonly BusinessType[];

export type AnalyzePost = {
  id: string;
  shortcode: string;
  imageUrl: string;
  caption: string | null;
};

export type AnalyzeResult =
  | {
      status: 'ok';
      drafts: DraftProduct[];
      suggestions: StoreSuggestions | null;
      usage: { inputTokens: number; outputTokens: number };
    }
  | { status: 'ai_unavailable' }
  | { status: 'error'; message: string };

const RawDraftSchema = z.object({
  postId: z.string(),
  isProduct: z.boolean().catch(true),
  confidence: z.number().min(0).max(1).catch(0.5),
  titleEn: z.string().nullable().catch(null),
  titleAr: z.string().nullable().catch(null),
  description: z.string().nullable().catch(null),
  priceQar: z.number().nullable().catch(null),
  dmForPrice: z.boolean().catch(false),
  category: z.string().nullable().catch(null),
  sizeOptions: z.array(z.string()).catch([]),
  variantOptions: z.array(z.string()).catch([]),
});

const RawSuggestionsSchema = z.object({
  businessType: z.string().nullable().catch(null),
  templateId: z.string().nullable().catch(null),
  brandNote: z.string().nullable().catch(null),
});

const AnalysisSchema = z.object({
  drafts: z.array(RawDraftSchema),
  suggestions: RawSuggestionsSchema.nullable().optional(),
});

export type RawAnalysis = z.infer<typeof AnalysisSchema>;

/** Strip markdown fences and parse the model's JSON. Exported for tests. */
export function parseAnalysisResponse(text: string): RawAnalysis {
  let candidate = text.trim();
  const fence = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/u);
  if (fence?.[1]) candidate = fence[1].trim();
  if (!candidate.startsWith('{')) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) candidate = candidate.slice(start, end + 1);
  }
  return AnalysisSchema.parse(JSON.parse(candidate));
}

function clampText(value: string | null, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function normalizeOptions(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim().slice(0, 40);
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * Deterministic post-pass over the model output. Every post in the batch
 * comes back as a draft — posts the model skipped become low-confidence
 * drafts so the review chat can ask about them instead of silently
 * dropping merchandise.
 */
export function normalizeDrafts(raw: RawAnalysis, posts: AnalyzePost[]): DraftProduct[] {
  const byPostId = new Map(raw.drafts.map((draft) => [draft.postId, draft]));
  return posts.map((post) => {
    const model = byPostId.get(post.id);
    const captionPrice = parseQarPrice(post.caption);
    const modelPrice =
      model?.priceQar != null && model.priceQar > 0 && model.priceQar <= 1_000_000
        ? model.priceQar
        : null;
    const base: Omit<DraftProduct, 'gaps'> = {
      postId: post.id,
      isProduct: model?.isProduct ?? true,
      confidence: model ? model.confidence : 0.4,
      titleEn: clampText(model?.titleEn ?? null, 120),
      titleAr: clampText(model?.titleAr ?? null, 120),
      description: clampText(model?.description ?? null, 1000),
      // The regex is authoritative when the model returns null — a marked
      // price in the caption always wins over a miss.
      priceQar: modelPrice ?? captionPrice.priceQar,
      dmForPrice: (model?.dmForPrice ?? false) || captionPrice.dmForPrice,
      category: clampText(model?.category ?? null, 60),
      sizeOptions: normalizeOptions(model?.sizeOptions ?? []),
      variantOptions: normalizeOptions(model?.variantOptions ?? []),
      imageUrl: post.imageUrl,
      // Manual uploads have no Instagram permalink to point back to.
      sourceUrl: post.shortcode.startsWith('manual-')
        ? null
        : `https://www.instagram.com/p/${post.shortcode}/`,
    };
    return { ...base, gaps: computeGaps(base) };
  });
}

export function normalizeSuggestions(raw: RawAnalysis['suggestions']): StoreSuggestions | null {
  if (!raw) return null;
  const businessType = BUSINESS_TYPES.find((id) => id === raw.businessType) ?? null;
  const templateId = TEMPLATE_IDS.find((id) => id === raw.templateId) ?? null;
  return {
    businessType,
    templateId,
    brandNote: clampText(raw.brandNote, 200),
  };
}

function buildSystemPrompt(includeStoreSuggestions: boolean, locale: Locale): string {
  const lines = [
    'You are the product-import analyst for Souqna, a Qatari storefront platform. You receive Instagram posts (image + caption) from a merchant\'s public profile and draft sellable products from them.',
    '',
    'For EVERY post, output one draft object:',
    '- postId: echo the id given with the post.',
    '- isProduct: true only if the post shows a specific item or service someone could order. Lifestyle shots, memes, announcements, giveaways, event recaps and repost shoutouts are NOT products.',
    '- confidence: 0..1 that your isProduct call is right.',
    '- titleEn / titleAr: concise product names (max 8 words) in BOTH languages — translate whichever the caption lacks. Gulf Arabic conventions, no emoji.',
    `- description: 1-3 sentences a shopper would read, written in ${locale === 'ar' ? 'Arabic' : 'English'}, drawn from the image and caption. No hashtags, no phone numbers.`,
    '- priceQar: the price in Qatari Riyal ONLY when the caption marks it with a currency (QAR, QR, ر.ق, ريال). Arabic-Indic digits (٢٥٠) are prices too. For ranges take the lower bound. NEVER invent a price; bare numbers without a currency marker (phone numbers, dates, order codes) are not prices → null.',
    '- dmForPrice: true when the caption prices privately ("DM for price", "السعر بالخاص", "واتساب للسعر").',
    '- category: one short category name (max 3 words) in English, e.g. "Abayas", "Home Fragrance", or null.',
    '- sizeOptions / variantOptions: sizes and colour/style variants ONLY when explicitly stated in the caption or clearly visible. Otherwise empty arrays.',
  ];
  if (includeStoreSuggestions) {
    lines.push(
      '',
      'Also output a "suggestions" object describing the store as a whole:',
      `- businessType: the closest match from ${JSON.stringify(BUSINESS_TYPES)}.`,
      `- templateId: pick the storefront template that suits the feed's aesthetic from ${JSON.stringify(TEMPLATE_IDS)} — "atrium" airy/minimal, "souqline" classic market, "kiosk" compact/fast, "lounge" warm/hospitality, "studio" creative portfolio, "bazaar" dense/colourful, "vitrine" editorial fashion, "monoline" stark minimal, "harvest" organic/food, "launchpad" tech/modern, "frame" photography.`,
      '- brandNote: one sentence on the brand voice and look.',
    );
  }
  lines.push(
    '',
    `Respond with ONLY a JSON object: {"drafts": [...]${includeStoreSuggestions ? ', "suggestions": {...}' : ''}}. No markdown fences, no commentary.`,
  );
  return lines.join('\n');
}

export async function analyzeInstagramPosts(opts: {
  posts: AnalyzePost[];
  profile: { handle: string; bio: string | null };
  includeStoreSuggestions: boolean;
  locale: Locale;
}): Promise<AnalyzeResult> {
  const hasGatewayCredentials = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
  if (!hasGatewayCredentials) return { status: 'ai_unavailable' };

  const posts = opts.posts.slice(0, ANALYZE_BATCH_SIZE);
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: URL }> = [
    {
      type: 'text',
      text: `Instagram profile @${opts.profile.handle}${opts.profile.bio ? ` — bio: ${opts.profile.bio}` : ''}. ${posts.length} posts follow.`,
    },
  ];
  for (const post of posts) {
    content.push({
      type: 'text',
      text: `POST ${post.id}\nCaption: ${post.caption?.slice(0, 1500) ?? '(no caption)'}`,
    });
    content.push({ type: 'image', image: new URL(post.imageUrl) });
  }

  const system = buildSystemPrompt(opts.includeStoreSuggestions, opts.locale);
  const usage = { inputTokens: 0, outputTokens: 0 };

  try {
    let text = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await generateText({
        model: env.IG_VISION_MODEL,
        system,
        messages:
          attempt === 0
            ? [{ role: 'user', content }]
            : [
                { role: 'user', content },
                { role: 'assistant', content: text },
                {
                  role: 'user',
                  content:
                    'That was not valid JSON matching the required shape. Respond again with ONLY the JSON object.',
                },
              ],
        temperature: 0.2,
        maxOutputTokens: 4_000,
        providerOptions: {
          gateway: { user: 'begin-instagram-import', tags: ['feature:ig-import'] },
        },
      });
      text = result.text;
      usage.inputTokens += result.usage?.inputTokens ?? 0;
      usage.outputTokens += result.usage?.outputTokens ?? 0;
      try {
        const parsed = parseAnalysisResponse(text);
        return {
          status: 'ok',
          drafts: normalizeDrafts(parsed, posts),
          suggestions: opts.includeStoreSuggestions
            ? normalizeSuggestions(parsed.suggestions)
            : null,
          usage,
        };
      } catch {
        // fall through to the single repair attempt
      }
    }
    return { status: 'error', message: 'The analysis response could not be parsed.' };
  } catch (err) {
    console.error('[analyzeInstagramPosts] model call failed', err);
    return { status: 'error', message: 'Vision analysis failed — try again in a moment.' };
  }
}
