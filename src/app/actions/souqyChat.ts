'use server';

import { generateText } from 'ai';
import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import { db, hasDb } from '@/lib/db';
import { aiCreditsForPlan, gateAtelierPro, planLabel, type Plan } from '@/lib/billing';
import { rateLimit } from '@/lib/rate-limit';
import { recordAudit } from '@/lib/audit';
import {
  assertStorefrontOwner,
  getAllProducts,
  getProduct,
  insertProduct,
  updateProductRow,
  type Product,
  type ProductWriteInput,
  type StorefrontAccess,
} from '@/lib/products';
import {
  getCategories,
  getProductCategoryIdsBatch,
  insertCategory,
  setProductCategories,
  uniqueSlug,
  type Category,
} from '@/lib/categories';
import { getHomePage, ensureHomePage, setPageSeo } from '@/lib/storefrontPages';
import { fanarChatCompletion, isFanarConfigured } from '@/lib/fanar/provider';
import { countOrders as countManualOrders } from '@/lib/orders';
import {
  ORDER_STATUSES as CHECKOUT_ORDER_STATUSES,
  listOrdersForStorefront,
} from '@/lib/checkout-orders';
import {
  getStorefrontCheckoutSettings,
  writeStorefrontCheckoutSettings,
} from '@/lib/storefrontSettings';
import {
  SouqyPlanSchema,
  addMessage,
  createConversation,
  extractPlan,
  getConversationById,
  getLatestConversation,
  listMessages,
  updateMessageMetadata,
  type SouqyMessage,
  type SouqyPlan,
} from '@/lib/souqy/chat';

const SlugSchema = z.string().trim().min(3).max(64);
const ConversationIdSchema = z.string().uuid();
const MessageSchema = z.string().trim().min(1).max(1600);
const ChatModeSchema = z.enum(['ask', 'agent']);

const GetSchema = z.object({
  storefrontSlug: SlugSchema,
});

const SendSchema = z.object({
  storefrontSlug: SlugSchema,
  conversationId: ConversationIdSchema.optional().nullable(),
  message: MessageSchema,
  mode: ChatModeSchema.optional(),
  newConversation: z.boolean().optional(),
});

const ApplySchema = z.object({
  storefrontSlug: SlugSchema,
  conversationId: ConversationIdSchema,
  planId: z.string().uuid(),
});

export type SouqyChatMessageDto = {
  id: string;
  role: SouqyMessage['role'];
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type OrderSummary = {
  total: number;
  checkoutTotal: number;
  manualTotal: number;
  checkoutByStatus: Record<string, number>;
};

type CreditsContext = {
  plan: Plan;
  planLabel: string;
  monthlyIncluded: number | null;
  monthlyIncludedLabel: string;
  topUpsAvailable: boolean;
  addCreditsUrl: string | null;
  balanceAvailable: boolean;
};

type SouqyOwner = {
  userId: string;
  storefront: StorefrontAccess['storefront'];
  plan: Plan;
};

export type SouqyChatState =
  | {
      status: 'success';
      conversationId: string;
      messages: SouqyChatMessageDto[];
    }
  | { status: 'error'; message: string };

export type SouqySendState =
  | {
      status: 'success';
      conversationId: string;
      messages: SouqyChatMessageDto[];
    }
  | { status: 'error'; message: string };

export type SouqyApplyState =
  | {
      status: 'success';
      conversationId: string;
      messages: SouqyChatMessageDto[];
      applied: {
        productsCreated: number;
        productsUpdated: number;
        categoriesCreated: number;
        categoryAssignmentsApplied: number;
        checkoutRulesUpdated: boolean;
        seoUpdated: boolean;
      };
    }
  | { status: 'error'; message: string };

function toDto(message: SouqyMessage): SouqyChatMessageDto {
  return {
    id: message.id,
    role: message.role,
    content: message.role === 'assistant' ? sanitizeModeCopy(message.content) : message.content,
    metadata: message.metadata,
    createdAt: message.createdAt.toISOString(),
  };
}

function sanitizeModeCopy(content: string): string {
  return content
    .replace(
      /\bAsk mode only answers\.?\s*Switch to Agent(?: mode)? to stage executable changes\.?/giu,
      'Souqy auto-detects whether to answer or stage supported changes.',
    )
    .replace(/\bswitch to Agent mode\b/giu, 'give me the exact change')
    .replace(/\bswitch to Agent\b/giu, 'give me the exact change')
    .replace(/\bswitch to Ask mode\b/giu, 'ask it directly')
    .replace(/\bAgent mode\b/giu, 'the supported change workflow')
    .replace(/\bAsk mode\b/giu, 'advisory chat')
    .replace(/وضع\s*Ask/giu, 'المحادثة الإرشادية')
    .replace(/وضع\s*Agent/giu, 'مسار التغييرات المدعومة');
}

async function gate(slug: string) {
  if (!hasDb()) return { ok: false as const, message: 'Database unavailable.' };
  const { userId } = await auth();
  if (!userId) return { ok: false as const, message: 'Sign in to use the assistant.' };
  const planGate = await gateAtelierPro(userId);
  if (!planGate.ok) {
    return {
      ok: false as const,
      message:
        planGate.reason === 'paywall'
          ? 'The assistant is available on Pro + and above. Upgrade to use it.'
          : 'Sign in to use the assistant.',
    };
  }
  const storefront = await assertStorefrontOwner(slug, userId);
  if (!storefront) return { ok: false as const, message: 'Forbidden.' };
  return { ok: true as const, userId, storefront, plan: planGate.plan };
}

function authorizedMobileOwner(input: SouqyOwner): SouqyOwner {
  return {
    userId: input.userId,
    storefront: input.storefront,
    plan: input.plan,
  };
}

async function rateGate(scope: string, limit: number): Promise<boolean> {
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  return rateLimit(`${scope}:${ip}`, limit, 60_000).ok;
}

function inferChatMode(message: string): 'ask' | 'agent' {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (isConversionDiagnosisRequest(lower)) return 'ask';

  if (
    isUnderstandingQuestion(lower) ||
    isModelQuestion(lower) ||
    isSouqnaUsageQuestion(lower) ||
    isArabicLanguageFollowup(trimmed)
  ) {
    return 'ask';
  }

  if (isVisualGenerationRequest(trimmed, lower)) return 'agent';

  const asksQuestion =
    /[?؟]/u.test(trimmed) ||
    /^(what|which|why|when|where|who|how|can|could|should|do|does|is|are|tell me|explain|recommend|review|audit|analyze)\b/u.test(
      lower,
    );
  const asksToAct =
    /\b(add|create|make|update|edit|change|set|publish|unpublish|activate|deactivate|draft|stage|rewrite|improve|fix|apply|enable|disable|only)\b/u.test(
      lower,
    ) || /أضف|انشئ|اكتب|عدّل|عدل|غيّر|غير|انشر|فعّل|فعل|حسّن|حسن|فقط/u.test(trimmed);
  const executableTarget =
    /\b(product|products|category|categories|catalog|seo|meta|title|description|home page|copy)\b/u.test(
      lower,
    ) || /منتج|منتجات|تصنيف|تصنيفات|سيو|عنوان|وصف/u.test(trimmed);

  const souqnaOperatorTarget =
    /\b(collection|collections|campaign|checkout|cod|cash on delivery|payment|delivery|shipping|best sellers?|ramadan)\b/u.test(
      lower,
    ) ||
    /مجموعة|مجموعات|حملة|رمضان|الدفع|السداد|التوصيل|الشحن|الاستلام|التسليم|المدينة|مدن|الأكثر\s+مبيع/u.test(
      trimmed,
    );
  const canStageChange = executableTarget || souqnaOperatorTarget;

  if (asksToAct && canStageChange && !asksQuestion) return 'agent';
  if (asksQuestion) return 'ask';
  if (asksToAct && canStageChange) return 'agent';
  return 'ask';
}

function isVisualGenerationRequest(trimmed: string, lower: string): boolean {
  const broadEnglishGeneration =
    /\b(generate|create|make|design|produce|render|build|draw|visualize|compose|mock up|mockup|prepare|give me|send me|i need|i want|need|want|turn this into)\b/u.test(
      lower,
    );
  const broadEnglishVisual =
    /\b(image|images|picture|pictures|photo|photos|visual|graphic|artwork|illustration|poster|posters|logo|logos|banner|banners|creative|creatives|ad creative|advert|advertisement|flyer|story|stories|instagram post|social post|thumbnail|cover|menu visual|packaging|package|box|bag|mockup|product card|brand asset|brand kit)\b/u.test(
      lower,
    );
  const strongEnglishVisual =
    /\b(poster|posters|logo|logos|banner|banners|ad creative|advert|advertisement|flyer|story|stories|thumbnail|cover|packaging|package|mockup|product card|brand kit)\b/u.test(
      lower,
    );
  if ((broadEnglishGeneration || strongEnglishVisual) && broadEnglishVisual) return true;

  const generationVerb =
    /\b(generate|create|make|design|produce|render|build)\b/u.test(lower) ||
    /أنشئ|انشئ|صمم|اصنع|اعمل|سوّ|سو /u.test(trimmed);
  const visualTarget =
    /\b(image|images|poster|posters|logo|logos|banner|banners|creative|creatives|ad creative|advert|flyer|story|instagram post|social post|menu visual|packaging|mockup|product card|brand asset|brand kit)\b/u.test(
      lower,
    ) || /صورة|صور|بوستر|ملصق|شعار|بنر|بانر|إعلان|اعلان|منشور|ستوري|قائمة|منيو|تغليف|موك.?أب|هوية/u.test(trimmed);
  return generationVerb && visualTarget;
}

async function ownConversation(
  conversationId: string,
  storefrontSlug: string,
  clerkUserId: string,
) {
  const conversation = await getConversationById(conversationId);
  if (
    !conversation ||
    conversation.storefrontSlug !== storefrontSlug ||
    conversation.clerkUserId !== clerkUserId
  ) {
    return null;
  }
  return conversation;
}

async function resolveConversation(
  storefrontSlug: string,
  clerkUserId: string,
  conversationId?: string | null,
  newConversation = false,
) {
  if (newConversation) {
    return createConversation({ storefrontSlug, clerkUserId, title: 'Assistant chat' });
  }
  if (conversationId) {
    const owned = await ownConversation(conversationId, storefrontSlug, clerkUserId);
    if (owned) return owned;
  }
  const latest = await getLatestConversation(storefrontSlug, clerkUserId);
  return latest ?? createConversation({ storefrontSlug, clerkUserId, title: 'Assistant chat' });
}

export async function getOrCreateSouqyConversation(
  input: z.input<typeof GetSchema>,
): Promise<SouqyChatState> {
  const parsed = GetSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid storefront.' };
  const owner = await gate(parsed.data.storefrontSlug);
  if (!owner.ok) return { status: 'error', message: owner.message };
  return getOrCreateSouqyConversationForOwner(parsed.data.storefrontSlug, owner);
}

export async function getOrCreateSouqyConversationForMobile(
  input: z.input<typeof GetSchema>,
  ownerInput: SouqyOwner,
): Promise<SouqyChatState> {
  const parsed = GetSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid storefront.' };
  const owner = authorizedMobileOwner(ownerInput);
  if (owner.storefront.slug !== parsed.data.storefrontSlug) {
    return { status: 'error', message: 'Forbidden.' };
  }
  return getOrCreateSouqyConversationForOwner(parsed.data.storefrontSlug, owner);
}

async function getOrCreateSouqyConversationForOwner(
  storefrontSlug: string,
  owner: SouqyOwner,
): Promise<SouqyChatState> {
  const conversation = await resolveConversation(storefrontSlug, owner.userId);
  const messages = await listMessages(conversation.id);
  return {
    status: 'success',
    conversationId: conversation.id,
    messages: messages.map(toDto),
  };
}

export async function sendSouqyMessage(input: z.input<typeof SendSchema>): Promise<SouqySendState> {
  const parsed = SendSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Ask with a shorter message.' };
  const data = parsed.data;
  const owner = await gate(data.storefrontSlug);
  if (!owner.ok) return { status: 'error', message: owner.message };
  return sendSouqyMessageForOwner(data, owner);
}

export async function sendSouqyMessageForMobile(
  input: z.input<typeof SendSchema>,
  ownerInput: SouqyOwner,
): Promise<SouqySendState> {
  const parsed = SendSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Ask with a shorter message.' };
  const data = parsed.data;
  const owner = authorizedMobileOwner(ownerInput);
  if (owner.storefront.slug !== data.storefrontSlug) {
    return { status: 'error', message: 'Forbidden.' };
  }
  return sendSouqyMessageForOwner(data, owner);
}

async function sendSouqyMessageForOwner(
  data: z.infer<typeof SendSchema>,
  owner: SouqyOwner,
): Promise<SouqySendState> {
  if (!(await rateGate('souqy-chat-send', 20))) {
    return { status: 'error', message: 'Too many assistant messages — try again shortly.' };
  }

  const conversation = await resolveConversation(
    data.storefrontSlug,
    owner.userId,
    data.conversationId,
    data.newConversation ?? false,
  );
  const mode = data.mode ?? inferChatMode(data.message);
  await addMessage({
    conversationId: conversation.id,
    role: 'user',
    content: data.message,
    metadata: { mode, inferredMode: !data.mode },
  });

  const [products, categories, homePage, orderSummary, checkout] = await Promise.all([
    getAllProducts(data.storefrontSlug),
    getCategories(data.storefrontSlug),
    getHomePage(data.storefrontSlug),
    getOrderSummary(data.storefrontSlug),
    getStorefrontCheckoutSettings(data.storefrontSlug),
  ]);

  const context = {
    message: data.message,
    storefront: {
      slug: owner.storefront.slug,
      locale: owner.storefront.locale,
      businessName: owner.storefront.businessName,
      businessType: owner.storefront.businessType,
      tagline: owner.storefront.tagline,
    },
    credits: creditsContextForPlan(owner.plan),
    products: products.slice(0, 40),
    categories,
    seo: homePage?.seo ?? { title: null, description: null, image: null },
    orders: orderSummary,
    checkout: {
      currency: checkout.currency,
      paymentMethods: checkout.paymentMethods,
      shippingFlatQar: checkout.shippingFlatQar,
      minOrderQar: checkout.minOrderQar,
      paymentAvailabilityRules: checkout.experience.paymentAvailabilityRules,
      souqnaCity: checkout.experience.souqnaCity,
      providers: {
        payLink: Boolean(checkout.payLink),
        skipCash: checkout.skipCash?.enabled === true,
        sadad: checkout.sadad?.enabled === true,
      },
    },
  };

  if (mode === 'ask') {
    const content = await askSouqy(context);
    await addMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content,
      metadata: { mode: 'ask' },
    });
    const messages = await listMessages(conversation.id);
    return {
      status: 'success',
      conversationId: conversation.id,
      messages: messages.map(toDto),
    };
  }

  const plan = await planWithSouqy(context);

  const content =
    plan.productCreates.length ||
    plan.productUpdates.length ||
    plan.categoryCreates.length ||
    plan.categoryAssignments.length ||
    plan.checkoutPaymentRules.length ||
    plan.seo
      ? "Here's the plan I'll execute."
      : plan.summary;

  await addMessage({
    conversationId: conversation.id,
    role: 'assistant',
    content,
    metadata: { mode: 'agent', plan },
  });

  const messages = await listMessages(conversation.id);
  return {
    status: 'success',
    conversationId: conversation.id,
    messages: messages.map(toDto),
  };
}

export async function applySouqyPlan(input: z.input<typeof ApplySchema>): Promise<SouqyApplyState> {
  const parsed = ApplySchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid assistant plan.' };
  const data = parsed.data;
  const owner = await gate(data.storefrontSlug);
  if (!owner.ok) return { status: 'error', message: owner.message };
  if (!(await rateGate('souqy-chat-apply', 15))) {
    return { status: 'error', message: 'Too many assistant applies — try again shortly.' };
  }
  const conversation = await ownConversation(
    data.conversationId,
    data.storefrontSlug,
    owner.userId,
  );
  if (!conversation) return { status: 'error', message: 'Conversation not found.' };

  const messages = await listMessages(conversation.id);
  const planMessage = messages.find((message) => {
    const plan = extractPlan(message);
    return plan?.id === data.planId;
  });
  if (!planMessage) return { status: 'error', message: 'Plan not found.' };
  const plan = extractPlan(planMessage);
  if (!plan) return { status: 'error', message: 'Plan is invalid.' };
  if (plan.status === 'applied')
    return { status: 'error', message: 'This plan was already applied.' };

  try {
    const applied = await applyPlan(data.storefrontSlug, owner.userId, plan);
    const appliedPlan: SouqyPlan = { ...plan, status: 'applied' };
    await updateMessageMetadata(planMessage.id, {
      ...planMessage.metadata,
      plan: appliedPlan,
      applied,
    });
    await addMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: appliedSummary(applied),
      metadata: { appliedPlanId: plan.id, applied },
    });
    revalidatePath('/account', 'layout');
    revalidatePath('/account/products');
    revalidatePath('/account/settings/checkout');
    revalidatePath(`/account/${data.storefrontSlug}/preview`);
    revalidatePath(`/brief/${data.storefrontSlug}`, 'layout');
    revalidatePath(`/brief/${data.storefrontSlug}/checkout`);
    const nextMessages = await listMessages(conversation.id);
    return {
      status: 'success',
      conversationId: conversation.id,
      messages: nextMessages.map(toDto),
      applied,
    };
  } catch (err) {
    const failedPlan: SouqyPlan = { ...plan, status: 'error' };
    await updateMessageMetadata(planMessage.id, {
      ...planMessage.metadata,
      plan: failedPlan,
      error: err instanceof Error ? err.message : 'Apply failed.',
    });
    return { status: 'error', message: 'The assistant could not apply that plan.' };
  }
}

async function applyPlan(
  storefrontSlug: string,
  clerkUserId: string,
  plan: SouqyPlan,
): Promise<{
  productsCreated: number;
  productsUpdated: number;
  categoriesCreated: number;
  categoryAssignmentsApplied: number;
  checkoutRulesUpdated: boolean;
  seoUpdated: boolean;
}> {
  let productsCreated = 0;
  let productsUpdated = 0;
  let categoriesCreated = 0;
  let categoryAssignmentsApplied = 0;
  let checkoutRulesUpdated = false;
  const categoryIndex = await buildCategoryIndex(storefrontSlug);

  for (const item of plan.categoryCreates) {
    const existing = categoryIndex.get(normalizeCategory(item.name));
    if (existing) continue;
    const slug = await uniqueSlug(storefrontSlug, item.name);
    const category = await insertCategory(storefrontSlug, {
      name: item.name,
      slug,
      description: item.description ?? null,
      imageUrl: item.imageUrl ?? null,
    });
    categoryIndex.set(normalizeCategory(category.name), category);
    categoriesCreated += 1;
    await recordAudit({
      storefrontSlug,
      clerkUserId,
      action: 'souqy.category.create',
      targetId: category.id,
      summary: `Assistant created category ${category.name}`,
      meta: { planId: plan.id, slug: category.slug },
    });
  }

  for (const assignment of plan.categoryAssignments) {
    const validProductIds: string[] = [];
    for (const productId of assignment.productIds) {
      const product = await getProduct(storefrontSlug, productId);
      if (product) validProductIds.push(productId);
    }
    if (validProductIds.length === 0) continue;
    const categoryExisted = categoryIndex.has(normalizeCategory(assignment.categoryName));
    const category = await ensureCategoryForPlan(
      storefrontSlug,
      assignment.categoryName,
      assignment.description ?? null,
      categoryIndex,
    );
    if (!categoryExisted) {
      categoriesCreated += 1;
    }
    const currentByProduct = await getProductCategoryIdsBatch(validProductIds);
    let assignedInGroup = 0;
    for (const productId of validProductIds) {
      const currentIds = currentByProduct.get(productId) ?? [];
      const nextIds =
        assignment.preserveExisting === false
          ? [category.id]
          : uniqueStrings([...currentIds, category.id]);
      await setProductCategories(storefrontSlug, productId, nextIds);
      categoryAssignmentsApplied += 1;
      assignedInGroup += 1;
    }
    if (assignedInGroup > 0) {
      await recordAudit({
        storefrontSlug,
        clerkUserId,
        action: 'souqy.collection.assign',
        targetId: category.id,
        summary: `Assistant assigned ${assignedInGroup} product${assignedInGroup === 1 ? '' : 's'} to ${category.name}`,
        meta: { planId: plan.id, categoryName: category.name, productCount: assignedInGroup },
      });
    }
  }

  for (const item of plan.productCreates) {
    const categoryIds = await resolveCategoryIds(
      storefrontSlug,
      item.category ?? null,
      categoryIndex,
    );
    const product = await insertProduct(storefrontSlug, {
      title: item.title,
      description: item.description || null,
      priceQar: item.priceQar ?? null,
      imageUrl: item.imageUrl || null,
      category: item.category || null,
      eventAt: null,
      status: item.status ?? 'draft',
    });
    await setProductCategories(storefrontSlug, product.id, categoryIds);
    productsCreated += 1;
    await recordAudit({
      storefrontSlug,
      clerkUserId,
      action: 'souqy.product.create',
      targetId: product.id,
      summary: `Assistant created product ${product.title}`,
      meta: { planId: plan.id, status: product.status, priceQar: product.priceQar },
    });
  }

  for (const patch of plan.productUpdates) {
    const current = await getProduct(storefrontSlug, patch.id);
    if (!current) continue;
    const categoryIds =
      'category' in patch
        ? await resolveCategoryIds(storefrontSlug, patch.category ?? null, categoryIndex)
        : null;
    const product = await updateProductRow(storefrontSlug, patch.id, {
      ...productWriteInputFromCurrent(current),
      title: patch.title ?? current.title,
      description: 'description' in patch ? (patch.description ?? null) : current.description,
      priceQar: 'priceQar' in patch ? (patch.priceQar ?? null) : current.priceQar,
      imageUrl: 'imageUrl' in patch ? patch.imageUrl || null : current.imageUrl,
      category: 'category' in patch ? (patch.category ?? null) : current.category,
      status: patch.status ?? current.status,
      seoTitle: 'seoTitle' in patch ? (patch.seoTitle ?? null) : current.seoTitle,
      seoDescription:
        'seoDescription' in patch ? (patch.seoDescription ?? null) : current.seoDescription,
      mediaAltText: 'mediaAltText' in patch ? (patch.mediaAltText ?? null) : current.mediaAltText,
    });
    if (product) {
      if (categoryIds) await setProductCategories(storefrontSlug, product.id, categoryIds);
      productsUpdated += 1;
      await recordAudit({
        storefrontSlug,
        clerkUserId,
        action: 'souqy.product.update',
        targetId: product.id,
        summary: `Assistant updated product ${product.title}`,
        meta: { planId: plan.id, status: product.status, priceQar: product.priceQar },
      });
    }
  }

  let seoUpdated = false;
  if (plan.seo && (plan.seo.title || plan.seo.description || plan.seo.image)) {
    const home = await ensureHomePage(storefrontSlug);
    const page = await setPageSeo(home.id, {
      title: plan.seo.title ?? home.seo.title,
      description: plan.seo.description ?? home.seo.description,
      image: plan.seo.image ?? home.seo.image,
    });
    seoUpdated = true;
    await recordAudit({
      storefrontSlug,
      clerkUserId,
      action: 'souqy.seo.update',
      targetId: page.id,
      summary: 'Assistant updated home page SEO',
      meta: { planId: plan.id, pageId: page.id },
    });
  }

  if (plan.checkoutPaymentRules.length > 0) {
    const settings = await getStorefrontCheckoutSettings(storefrontSlug);
    const nextRules = [
      ...settings.experience.paymentAvailabilityRules.filter(
        (existing) =>
          !plan.checkoutPaymentRules.some(
            (rule) => rule.method === existing.method && rule.mode === existing.mode,
          ),
      ),
      ...plan.checkoutPaymentRules.map((rule) => ({
        method: rule.method,
        mode: 'allow_only' as const,
        cities: uniqueStrings(rule.cities).slice(0, 12),
      })),
    ].slice(0, 8);
    await writeStorefrontCheckoutSettings(storefrontSlug, {
      ...settings,
      experience: {
        ...settings.experience,
        paymentAvailabilityRules: nextRules,
      },
    });
    checkoutRulesUpdated = true;
    await recordAudit({
      storefrontSlug,
      clerkUserId,
      action: 'souqy.checkout.payment_rules.update',
      targetId: storefrontSlug,
      summary: 'Assistant updated checkout payment availability rules',
      meta: { planId: plan.id, rules: plan.checkoutPaymentRules },
    });
  }

  return {
    productsCreated,
    productsUpdated,
    categoriesCreated,
    categoryAssignmentsApplied,
    checkoutRulesUpdated,
    seoUpdated,
  };
}

function appliedSummary(applied: {
  productsCreated: number;
  productsUpdated: number;
  categoriesCreated: number;
  categoryAssignmentsApplied: number;
  checkoutRulesUpdated: boolean;
  seoUpdated: boolean;
}) {
  const parts = [];
  if (applied.categoriesCreated)
    parts.push(
      `${applied.categoriesCreated} categor${applied.categoriesCreated === 1 ? 'y' : 'ies'} created`,
    );
  if (applied.productsCreated)
    parts.push(
      `${applied.productsCreated} product${applied.productsCreated === 1 ? '' : 's'} created`,
    );
  if (applied.productsUpdated)
    parts.push(
      `${applied.productsUpdated} product${applied.productsUpdated === 1 ? '' : 's'} updated`,
    );
  if (applied.categoryAssignmentsApplied)
    parts.push(
      `${applied.categoryAssignmentsApplied} product${applied.categoryAssignmentsApplied === 1 ? '' : 's'} assigned to collections`,
    );
  if (applied.checkoutRulesUpdated) parts.push('checkout rules updated');
  if (applied.seoUpdated) parts.push('home SEO updated');
  return parts.length ? `Done — ${parts.join(', ')}.` : 'Done — no changes were needed.';
}

async function getOrderSummary(storefrontSlug: string): Promise<OrderSummary> {
  const [checkout, manualTotal, ...checkoutStatusCounts] = await Promise.all([
    listOrdersForStorefront(storefrontSlug, { limit: 1 }),
    countManualOrders(storefrontSlug),
    ...CHECKOUT_ORDER_STATUSES.map(async (status) => {
      const byStatus = await listOrdersForStorefront(storefrontSlug, { status, limit: 1 });
      return [status, byStatus.total] as const;
    }),
  ]);

  return {
    total: checkout.total + manualTotal,
    checkoutTotal: checkout.total,
    manualTotal,
    checkoutByStatus: Object.fromEntries(checkoutStatusCounts),
  };
}

async function askSouqy(input: {
  message: string;
  storefront: {
    slug: string;
    locale: string;
    businessName: string;
    businessType: string;
    tagline: string | null;
  };
  products: Product[];
  categories: Category[];
  seo: { title: string | null; description: string | null; image: string | null };
  orders: OrderSummary;
  checkout: {
    currency: string;
    paymentMethods: string[];
    shippingFlatQar: number | null;
    minOrderQar: number | null;
    paymentAvailabilityRules: Array<{ method: string; mode: 'allow_only'; cities: string[] }>;
    souqnaCity: unknown;
    providers: { payLink: boolean; skipCash: boolean; sadad: boolean };
  };
  credits: CreditsContext;
}): Promise<string> {
  if (isConversionDiagnosisRequest(input.message.toLowerCase())) {
    return conversionDiagnosisAnswer(input);
  }
  const userPrompt = buildPlannerUser(input);
  const fanarConfigured = isFanarConfigured();
  if (fanarConfigured) {
    try {
      const result = await fanarChatCompletion({
        useCase: 'arabic-founder-questions',
        messages: [
          { role: 'system', content: buildAskSystem() },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.45,
        maxOutputTokens: 1200,
      });
      const text = clampAssistantText(result.text, 1800);
      if (text) return text;
    } catch (err) {
      console.warn('[souqy-chat] Fanar Ask failed', summarizeAiError(err));
    }
  }

  if (!fanarConfigured) {
    try {
      const result = await generateText({
        model: env.SOUQY_CHAT_MODEL,
        system: buildAskSystem(),
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.45,
        maxOutputTokens: 1200,
        providerOptions: {
          gateway: {
            tags: ['feature:souqy-chat', 'surface:admin', 'mode:ask'],
          },
        },
      });
      const text = clampAssistantText(result.text, 1800);
      if (text) return text;
    } catch {
      // Keep advisory chat useful during local dev or short Gateway outages.
    }
  }
  return localAskFallback(input);
}

function clampAssistantText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 3).trim()}...`;
}

function summarizeAiError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function buildAskSystem(): string {
  return [
    'You are the read-only advisory store strategist for a Souqna founder.',
    'Souqna is a bilingual commerce platform for founders: dashboard, visual Builder, products and categories, orders and checkout, analytics, Apps/integrations, domains/settings, billing, and public storefronts.',
    'When founders ask how to use Souqna, map their request to the right Souqna workflow and screen. Sound like you understand the product, not like a generic chatbot.',
    'Give information, recommendations, ideas, checklists, and tradeoffs only.',
    'Do not produce JSON. Do not stage product/category/SEO mutations. Do not say a change has been made.',
    'If the founder asks to generate an image, poster, logo, banner, menu visual, packaging mockup, product card, or brand asset, route them to Souqy Studio. Do not mention internal chat modes.',
    'If the founder asks you to execute, create, update, publish, rewrite in-place, apply a design, or run a command, explain the closest supported Souqna workflow without mentioning modes.',
    'You may discuss storefront design direction, copy ideas, app suggestions, product strategy, SEO ideas, and customer-experience recommendations.',
    'You may answer order-count and order-status summary questions from the supplied order summary. Do not expose customer PII, order notes, addresses, phone numbers, or individual order details.',
    'Use only the supplied storefront, credits, products, categories, SEO, and order-summary context. If context is missing, say what to check next.',
    'Credit guidance: Free includes 0 AI credits, Pro includes 100 AI credits per month, Pro+ and Max+ include unlimited AI credits. Use the supplied credits context for the current plan and allowance.',
    'Do not invent credit balances, credit prices, reset dates, or purchases. Never claim credits were added, purchased, or changed.',
    'Top-ups are unavailable unless the supplied credits context says topUpsAvailable=true. If unavailable, say: "Your plan includes monthly AI credits. Top-ups are not available in this surface yet."',
    'If the founder asks whether you understand them, answer naturally and explain what Souqna context you can use.',
    'If the founder asks about your model, explain that Souqy Chat is designed to use Fanar for Arabic-first founder support, while GPT stays reserved for Builder, coding, storefront generation, architecture, and design-system reasoning.',
    'If the founder asks for Arabic, answer in Arabic and keep the same Souqna context.',
    'Keep answers concise and practical. Match Arabic if the founder writes Arabic.',
  ].join('\n');
}

function localAskFallback(input: Parameters<typeof askSouqy>[0]): string {
  const rawMessage = input.message.trim();
  const message = rawMessage.toLowerCase();

  if (isArabicLanguageFollowup(rawMessage)) {
    return arabicStoreAnswer(input);
  }

  if (isModelQuestion(message)) {
    const modelLine = isFanarConfigured()
      ? `In this environment Souqy Chat is routed to Fanar (${env.FANAR_MODEL}) through Souqna's private Fanar endpoint.`
      : `This local environment has not configured FANAR_API_URL and FANAR_API_KEY yet, so Souqy Chat can use the development Gateway fallback ${env.SOUQY_CHAT_MODEL}.`;
    return [
      "I'm Souqy, Souqna's store assistant, not a standalone generic chatbot.",
      `${modelLine} The important part is the Souqna context I receive: your storefront, products, categories, SEO, and order summary.`,
    ].join('\n\n');
  }

  if (isUnderstandingQuestion(message)) {
    return [
      'Yes. I understand plain-language questions about your Souqna store, and I answer using the store context I can see here.',
      storeSnapshot(input),
      'I can explain what to do in Souqna, suggest product and SEO improvements, review order totals, and point you to the right workflow. When your request is specific enough, I can stage product, category, or home SEO changes for your approval before anything is applied.',
    ].join('\n\n');
  }

  if (isSouqnaUsageQuestion(message)) {
    return [
      'Yes. Think of Souqy as your Souqna operating assistant.',
      'Use Builder for storefront pages, sections, layout, and visual edits. Use Products for catalog, pricing, descriptions, images, and status. Use Orders for fulfillment and payment follow-up. Use Settings for store identity, domain, checkout, and publishing. Use Apps when you want integrations like marketing or commerce tools.',
      storeSnapshot(input),
      'Tell me the outcome you want, and I will translate it into the right Souqna steps.',
    ].join('\n\n');
  }

  if (isCreditsQuestion(message)) {
    return creditAnswer(input.credits);
  }

  if (/\bseo\b|search|google|meta|title|description|share preview|home page/u.test(message)) {
    const hasSeo = Boolean(input.seo.title || input.seo.description);
    return [
      hasSeo
        ? `Your home page already has SEO metadata: ${formatSeo(input.seo)}.`
        : 'Your home page does not have a focused SEO title and description yet.',
      `${input.storefront.businessName} should use SEO copy that names the store, the main product category, and the Qatar/customer promise in one clear sentence.`,
      'In Souqna, home SEO belongs to the Builder home page settings. Ask me for a draft, or give me the exact SEO update and I can stage it for approval.',
    ].join('\n\n');
  }

  if (
    /\bproduct|products|catalog|category|categories|price|pricing|description|copy|stock|draft|publish/u.test(
      message,
    )
  ) {
    return [
      productSnapshot(input.products, input.categories),
      'For Souqna usage: keep unfinished items as drafts, publish only products with a clear image, price, category, and short bilingual description, then use categories to make the storefront easier to browse.',
      'If you want changes, say exactly what to add or update. I will stage supported edits first so you can review them.',
    ].join('\n\n');
  }

  if (
    /\bbuilder|design|layout|section|theme|page|homepage|storefront|banner|hero|brand/u.test(
      message,
    )
  ) {
    return [
      'For storefront design in Souqna, use Builder. That is where you adjust pages, sections, hero content, product sections, visual order, and publishing.',
      storeSnapshot(input),
      'A good next move is to align the home hero with your strongest product category, then make sure the first product section contains items that are ready to buy. I can help write the copy and checklist here, while Builder handles the visual edit.',
    ].join('\n\n');
  }

  if (
    /\bapp|apps|integration|plugin|oauth|marketing|mailchimp|klaviyo|whatsapp|instagram/u.test(
      message,
    )
  ) {
    return [
      'Souqna Apps are for connecting store workflows to external tools, such as marketing, messaging, analytics, or commerce services.',
      'Choose apps based on the bottleneck: marketing apps for repeat sales, messaging apps for customer follow-up, analytics for understanding traffic, and commerce tools for operations.',
      'I can recommend what to connect once you tell me your goal, such as more abandoned-cart recovery, better broadcasts, or cleaner order follow-up.',
    ].join('\n\n');
  }
  if (/\border(s)?\b|طلبات|طلب/u.test(input.message.toLowerCase())) {
    const lines = [
      `${input.storefront.businessName} has ${input.orders.total} total order${input.orders.total === 1 ? '' : 's'}.`,
      `${input.orders.checkoutTotal} came through storefront checkout and ${input.orders.manualTotal} are manual/dashboard orders.`,
    ];
    const statusParts = Object.entries(input.orders.checkoutByStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => `${status}: ${count}`);
    if (statusParts.length) lines.push(`Checkout status: ${statusParts.join(', ')}.`);
    return lines.join('\n');
  }

  return [
    'I hear you. To make this useful, ask me what you want to do in Souqna.',
    storeSnapshot(input),
    'For example: improve the home page in Builder, clean up product copy, review order status, choose an app integration, prepare SEO, or publish the storefront. For supported product/category/SEO changes, give me the exact change and I will stage it for approval.',
  ].join('\n\n');
}

function isUnderstandingQuestion(message: string): boolean {
  return /\b(can you understand|do you understand|understand me|what do you understand|are you ai|who are you)\b/u.test(
    message,
  );
}

function isModelQuestion(message: string): boolean {
  return /\b(what model|which model|model are you using|what ai|which ai|powered by|underlying model)\b/u.test(
    message,
  );
}

function isArabicLanguageFollowup(message: string): boolean {
  const normalized = message.trim();
  return (
    /^(و\s*)?(ب)?العربي[؟?!.]*$/u.test(normalized) ||
    /^تتكلم عربي[؟?!.]*$/u.test(normalized) ||
    /^باللغة العربية[؟?!.]*$/u.test(normalized)
  );
}

function isSouqnaUsageQuestion(message: string): boolean {
  return /\bhow (do|should|can) i use\b|\bhow does souqna work\b|\bwhat can you do\b|\bhelp me use\b|\bsouqna usage\b|\bhow to use souqna\b/u.test(
    message,
  );
}

function isCreditsQuestion(message: string): boolean {
  return /\b(ai credits?|credits?|credit balance|balance|quota|top-?up|add credits?|buy credits?|purchase credits?)\b/u.test(
    message,
  );
}

function creditsContextForPlan(plan: Plan): CreditsContext {
  const monthlyCredits = aiCreditsForPlan(plan);
  return {
    plan,
    planLabel: planLabel(plan),
    monthlyIncluded: Number.isFinite(monthlyCredits) ? monthlyCredits : null,
    monthlyIncludedLabel: Number.isFinite(monthlyCredits)
      ? `${monthlyCredits} / month`
      : 'Unlimited',
    topUpsAvailable: false,
    addCreditsUrl: null,
    balanceAvailable: false,
  };
}

function creditAnswer(credits: CreditsContext): string {
  const balanceLine = credits.balanceAvailable
    ? 'I can use the supplied credit balance for decisions in this chat.'
    : 'I cannot see a separate credit wallet balance here yet.';
  const topUpLine = credits.topUpsAvailable
    ? 'Use the + add-credits action in the billing or credits surface to add more.'
    : 'Your plan includes monthly AI credits. Top-ups are not available in this surface yet.';

  return [
    `Your current plan is ${credits.planLabel}. Included AI credits: ${credits.monthlyIncludedLabel}.`,
    balanceLine,
    topUpLine,
    'Credits may apply to Souqy storefront generation, reprompts, Builder block edits, Souqy Studio creative generation, and other AI workflows when those surfaces support tracking.',
  ].join('\n\n');
}

function storeSnapshot(input: Parameters<typeof askSouqy>[0]): string {
  const productCount = input.products.length;
  const categoryCount = input.categories.length;
  const activeProducts = input.products.filter((product) => product.status === 'active').length;
  const draftProducts = input.products.filter((product) => product.status === 'draft').length;
  const seoState =
    input.seo.title || input.seo.description ? 'home SEO is present' : 'home SEO still needs setup';
  const type = input.storefront.businessType ? ` (${input.storefront.businessType})` : '';

  return [
    `Store context: ${input.storefront.businessName}${type}.`,
    `${productCount} product${productCount === 1 ? '' : 's'} (${activeProducts} active, ${draftProducts} draft), ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}, ${input.orders.total} order${input.orders.total === 1 ? '' : 's'}, and ${seoState}.`,
  ].join(' ');
}

function arabicStoreAnswer(input: Parameters<typeof askSouqy>[0]): string {
  const productCount = input.products.length;
  const categoryCount = input.categories.length;
  const activeProducts = input.products.filter((product) => product.status === 'active').length;
  const draftProducts = input.products.filter((product) => product.status === 'draft').length;
  const seoState =
    input.seo.title || input.seo.description
      ? 'وسيو الصفحة الرئيسية موجود'
      : 'وسيو الصفحة الرئيسية يحتاج إعداد';

  return [
    'نعم، أقدر أتكلم عربي وأجاوبك بناء على سياق متجرك في سوقنا.',
    `سياق المتجر: ${input.storefront.businessName}. عندك ${productCount} منتجات (${activeProducts} منشورة، ${draftProducts} مسودة)، ${categoryCount} تصنيفات، ${input.orders.total} طلبات، ${seoState}.`,
    'أقدر أشرح لك الخطوات، أقترح تحسينات للمنتجات والسيو والواجهة والطلبات، وأجهز التغييرات المدعومة للمنتجات أو التصنيفات أو سيو الصفحة الرئيسية للمراجعة قبل التطبيق.',
  ].join('\n\n');
}

function productSnapshot(products: Product[], categories: Category[]): string {
  if (!products.length) {
    return categories.length
      ? `You have ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} but no products yet.`
      : 'You do not have products or categories yet.';
  }

  const statusCounts = products.reduce<Record<string, number>>((acc, product) => {
    acc[product.status] = (acc[product.status] ?? 0) + 1;
    return acc;
  }, {});
  const examples = products
    .slice(0, 4)
    .map((product) => product.title)
    .join(', ');
  const statuses = Object.entries(statusCounts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ');

  return `Your catalog has ${products.length} product${products.length === 1 ? '' : 's'} across ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} (${statuses}). Examples: ${examples}.`;
}

function formatSeo(seo: {
  title: string | null;
  description: string | null;
  image: string | null;
}): string {
  const parts = [];
  if (seo.title) parts.push(`title "${seo.title}"`);
  if (seo.description) parts.push(`description "${seo.description}"`);
  if (seo.image) parts.push('image set');
  return parts.length ? parts.join(', ') : 'not set';
}

function isConversionDiagnosisRequest(message: string): boolean {
  return (
    /\bconversion\b.*\b(drop|dropped|down|fall|fell|decrease|decreased|decline|declined)\b/u.test(message) ||
    /\b(show|tell|explain|why|analyze|analyse)\b.*\b(conversion|sales|orders|checkout)\b/u.test(message) &&
      /\b(this week|last 7 days|dropped|down|decline|problem|issue)\b/u.test(message)
  );
}

type ConversionWindow = {
  pageViews: number;
  productViews: number;
  cartAdds: number;
  orders: number;
  inquiries: number;
  checkoutOrders: number;
  paidOrders: number;
  failedPayments: number;
};

async function conversionDiagnosisAnswer(
  input: Parameters<typeof askSouqy>[0],
): Promise<string> {
  const [current, previous] = await Promise.all([
    conversionWindow(input.storefront.slug, 0, 7),
    conversionWindow(input.storefront.slug, 7, 14),
  ]);

  const currentConversion = ratio(current.orders || current.checkoutOrders, current.pageViews);
  const previousConversion = ratio(previous.orders || previous.checkoutOrders, previous.pageViews);
  const productRateNow = ratio(current.productViews, current.pageViews);
  const productRatePrev = ratio(previous.productViews, previous.pageViews);
  const cartRateNow = ratio(current.cartAdds, current.productViews);
  const cartRatePrev = ratio(previous.cartAdds, previous.productViews);
  const orderRateNow = ratio(current.checkoutOrders || current.orders, current.cartAdds);
  const orderRatePrev = ratio(previous.checkoutOrders || previous.orders, previous.cartAdds);

  const findings = [
    {
      label: 'Traffic',
      drop: previous.pageViews > 0 ? (previous.pageViews - current.pageViews) / previous.pageViews : 0,
      message: `page views ${current.pageViews} vs ${previous.pageViews}`,
    },
    {
      label: 'Product browsing',
      drop: productRatePrev > 0 ? (productRatePrev - productRateNow) / productRatePrev : 0,
      message: `product-view rate ${formatPercent(productRateNow)} vs ${formatPercent(productRatePrev)}`,
    },
    {
      label: 'Cart intent',
      drop: cartRatePrev > 0 ? (cartRatePrev - cartRateNow) / cartRatePrev : 0,
      message: `cart-add rate ${formatPercent(cartRateNow)} vs ${formatPercent(cartRatePrev)}`,
    },
    {
      label: 'Checkout completion',
      drop: orderRatePrev > 0 ? (orderRatePrev - orderRateNow) / orderRatePrev : 0,
      message: `checkout/order rate ${formatPercent(orderRateNow)} vs ${formatPercent(orderRatePrev)}`,
    },
    {
      label: 'Payment failures',
      drop:
        current.failedPayments > previous.failedPayments && current.failedPayments > 0
          ? 1
          : 0,
      message: `failed payments ${current.failedPayments} vs ${previous.failedPayments}`,
    },
  ].sort((a, b) => b.drop - a.drop);

  const primary = findings[0];
  const likelyCause =
    !primary || current.pageViews + previous.pageViews < 20
      ? 'Not enough traffic yet to isolate one cause. Treat this as directional, not final.'
      : primary.drop <= 0.1
        ? 'No sharp funnel drop stands out from the available data. The issue may be seasonality, product mix, or small sample size.'
        : `${primary.label} is the biggest change: ${primary.message}.`;

  return [
    `For ${input.storefront.businessName}, last 7 days vs the previous 7 days:`,
    `Conversion: ${formatPercent(currentConversion)} vs ${formatPercent(previousConversion)} (${formatDelta(currentConversion, previousConversion)}).`,
    `Funnel: ${current.pageViews} page views, ${current.productViews} product views, ${current.cartAdds} cart adds, ${current.checkoutOrders || current.orders} checkout orders.`,
    `Likely reason: ${likelyCause}`,
    `Next check: ${conversionNextStep(primary?.label ?? 'Data')}`,
    'I used aggregate analytics and order counts only; no customer details were inspected.',
  ].join('\n\n');
}

async function conversionWindow(
  storefrontSlug: string,
  startDaysAgo: number,
  endDaysAgo: number,
): Promise<ConversionWindow> {
  const [events, orders] = await Promise.all([
    db()`
      select
        count(*) filter (where kind = 'page_view')::int as page_views,
        count(*) filter (where kind = 'product_view')::int as product_views,
        count(*) filter (where kind = 'cart_add')::int as cart_adds,
        count(*) filter (where kind = 'order_placed')::int as orders,
        count(*) filter (where kind = 'inquire_submit')::int as inquiries
      from analytics_events
      where storefront_slug = ${storefrontSlug}
        and occurred_at >= now() - (${endDaysAgo}::int * interval '1 day')
        and occurred_at < now() - (${startDaysAgo}::int * interval '1 day')
    `,
    db()`
      select
        count(*) filter (where order_status <> 'cancelled')::int as checkout_orders,
        count(*) filter (where payment_status = 'marked_paid')::int as paid_orders,
        count(*) filter (where payment_status = 'payment_failed')::int as failed_payments
      from checkout_orders
      where storefront_slug = ${storefrontSlug}
        and created_at >= now() - (${endDaysAgo}::int * interval '1 day')
        and created_at < now() - (${startDaysAgo}::int * interval '1 day')
    `,
  ]);
  const eventRow = (events as unknown as Array<{
    page_views: number;
    product_views: number;
    cart_adds: number;
    orders: number;
    inquiries: number;
  }>)[0];
  const orderRow = (orders as unknown as Array<{
    checkout_orders: number;
    paid_orders: number;
    failed_payments: number;
  }>)[0];
  return {
    pageViews: Number(eventRow?.page_views ?? 0),
    productViews: Number(eventRow?.product_views ?? 0),
    cartAdds: Number(eventRow?.cart_adds ?? 0),
    orders: Number(eventRow?.orders ?? 0),
    inquiries: Number(eventRow?.inquiries ?? 0),
    checkoutOrders: Number(orderRow?.checkout_orders ?? 0),
    paidOrders: Number(orderRow?.paid_orders ?? 0),
    failedPayments: Number(orderRow?.failed_payments ?? 0),
  };
}

function ratio(value: number, base: number): number {
  return base > 0 ? value / base : 0;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
}

function formatDelta(current: number, previous: number): string {
  if (previous <= 0) return current > 0 ? 'up from 0%' : 'no prior baseline';
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`;
}

function conversionNextStep(stage: string): string {
  switch (stage) {
    case 'Traffic':
      return 'review campaign traffic sources, referrers, and whether recent posts or ads slowed down.';
    case 'Product browsing':
      return 'check the first storefront section, collection placement, product images, and product titles.';
    case 'Cart intent':
      return 'review pricing, variants, stock, delivery notes, and whether product pages answer common buyer questions.';
    case 'Checkout completion':
      return 'test checkout payment choices, delivery city rules, required policies, and mobile checkout friction.';
    case 'Payment failures':
      return 'check online provider status, failed payment callbacks, and whether buyers have an offline fallback.';
    default:
      return 'wait for more traffic, then compare the funnel again.';
  }
}

async function planWithSouqy(input: {
  message: string;
  storefront: {
    slug: string;
    locale: string;
    businessName: string;
    businessType: string;
    tagline: string | null;
  };
  credits: CreditsContext;
  products: Product[];
  categories: Category[];
  seo: { title: string | null; description: string | null; image: string | null };
  orders: OrderSummary;
  checkout: {
    currency: string;
    paymentMethods: string[];
    shippingFlatQar: number | null;
    minOrderQar: number | null;
    paymentAvailabilityRules: Array<{ method: string; mode: 'allow_only'; cities: string[] }>;
    souqnaCity: unknown;
    providers: { payLink: boolean; skipCash: boolean; sadad: boolean };
  };
}): Promise<SouqyPlan> {
  const localOperator = await localOperatorPlan(input);
  if (localOperator) return localOperator;

  const userPrompt = buildPlannerUser(input);
  const fanarConfigured = isFanarConfigured();
  if (fanarConfigured) {
    try {
      const result = await fanarChatCompletion({
        useCase: 'chat-completions',
        messages: [
          { role: 'system', content: buildPlannerSystem() },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        maxOutputTokens: 1600,
      });
      const parsed = parsePlannerJson(result.text);
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[souqy-chat] Fanar Agent failed', summarizeAiError(err));
    }
  }

  if (!fanarConfigured) {
    try {
      const result = await generateText({
        model: env.SOUQY_CHAT_MODEL,
        system: buildPlannerSystem(),
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.2,
        maxOutputTokens: 1600,
        providerOptions: {
          gateway: {
            tags: ['feature:souqy-chat', 'surface:admin'],
          },
        },
      });
      const parsed = parsePlannerJson(result.text);
      if (parsed) return parsed;
    } catch {
      // Local fallback keeps the review flow usable in dev when Gateway
      // credentials are not present; the founder still has to approve.
    }
  }
  return localPlanFallback(
    input.message,
    input.storefront.locale,
    input.products,
    input.categories,
  );
}

function buildPlannerSystem(): string {
  return [
    'You are the AI store manager for Souqna.',
    'Return only JSON matching this TypeScript shape:',
    '{"summary":string,"checklist":[{"title":string,"detail":string}],"questions":[{"id":string,"label":string,"detail":string,"options":[{"label":string,"prompt":string}]}],"categoryCreates":[{"name":string,"description":string|null,"imageUrl":string|null}],"productCreates":[],"productUpdates":[{"id":string,"title":string,"description":string|null,"priceQar":number|null,"imageUrl":string|null,"category":string|null,"status":"active|draft|sold_out","seoTitle":string|null,"seoDescription":string|null,"mediaAltText":string|null}],"categoryAssignments":[{"categoryName":string,"description":string|null,"productIds":[string],"preserveExisting":boolean}],"checkoutPaymentRules":[{"method":"cod|bank_transfer|fawran|skipcash|sadad|pay_link","mode":"allow_only","cities":[string]}],"seo":null}',
    'When a founder asks for a supported change, stage a concrete approval plan. The founder must still click Apply before database changes happen.',
    'Allowed executable work in this drawer: create/update products, create categories/collections, assign products to collections, draft product/home SEO fields, and update checkout payment availability by city.',
    'Checkout secrets are locked. You may only use safe checkout context: enabled payment methods, provider enabled flags, currency, shipping/minimum order, and existing city availability rules. Never request, reveal, infer, or edit provider credentials.',
    'For design, page layout, theme, or builder commands, return a checklist and questions with no mutations, and tell the founder to use the Builder page editor for the final design execution.',
    'For image, poster, logo, banner, menu visual, packaging mockup, product card, or brand asset generation, return a short checklist that points the founder to Souqy Studio. Do not claim Chat generated an asset.',
    'Do not generate code, TypeScript, Builder architecture, storefront source, or design-system reasoning. Those belong to GPT-backed Souqna surfaces, not Souqy Chat.',
    'Never delete products. Never install apps. Never change orders, billing, credits, drops, or page layout.',
    'For COD only in a city, return checkoutPaymentRules with method "cod", mode "allow_only", and the requested city names only.',
    'For best seller or campaign collections, use categoryAssignments with product IDs from context. If order data is insufficient, choose ready active products and say so in checklist detail.',
    'For product SEO, use productUpdates with seoTitle, seoDescription, and mediaAltText. Use only product IDs from context.',
    'Never stage or claim credit purchases, credit top-ups, credit balance changes, plan changes, or billing changes.',
    'Default new products to status "draft" unless the founder explicitly asks to publish or activate.',
    'For new products, ask for product image URL and category if missing. Offer existing categories and a create-new category option in questions.',
    'Batch add is allowed: return multiple productCreates when the founder names multiple products.',
    'Batch edit is allowed only when products are safely identified by supplied IDs or exact titles from context.',
    'If categoryCreates includes a category, use that exact name in productCreates/category patches that should attach to it.',
    'For product updates, use only product IDs from context. If a match is ambiguous, return no mutations and ask a short follow-up in summary.',
    'Bilingual stores: include natural Arabic/English description text when asked.',
  ].join('\n');
}

function buildPlannerUser(input: Parameters<typeof planWithSouqy>[0]): string {
  const products = input.products.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    priceQar: p.priceQar,
    category: p.category,
    productType: p.productType,
    tags: p.tags,
    status: p.status,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    mediaAltText: p.mediaAltText,
    stock: p.stock,
    trackInventory: p.trackInventory,
  }));
  const categories = input.categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c.productCount,
  }));
  return JSON.stringify({
    founderRequest: input.message,
    storefront: input.storefront,
    credits: input.credits,
    homeSeo: input.seo,
    orderSummary: input.orders,
    checkout: input.checkout,
    categories,
    products,
  });
}

function parsePlannerJson(text: string): SouqyPlan | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    const raw = JSON.parse(cleaned) as unknown;
    const withId = raw && typeof raw === 'object' ? { id: crypto.randomUUID(), ...raw } : raw;
    const parsed = SouqyPlanSchema.safeParse(withId);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function localOperatorPlan(input: Parameters<typeof planWithSouqy>[0]): Promise<SouqyPlan | null> {
  const lower = input.message.toLowerCase();
  const trimmed = input.message.trim();
  const wantsBestSellers =
    /\bbest sellers?\b/u.test(lower) &&
    /\b(create|add|make|collection|category)\b/u.test(lower);
  if (wantsBestSellers) {
    const productIds = await bestSellerProductIds(input.storefront.slug, input.products, 8);
    if (productIds.length === 0) return emptyOperatorPlan('I need products or recent orders before I can build a Best Sellers collection.');
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary: 'I can create or update a Best Sellers collection from your strongest products.',
      checklist: [
        { title: 'Create Best Sellers collection', detail: 'Use recent order activity first, then ready active products as fallback' },
        { title: 'Assign products', detail: `${productIds.length} product${productIds.length === 1 ? '' : 's'} will be linked without removing existing collections` },
        { title: 'Ready to review', detail: 'Apply only after you approve this collection plan' },
      ],
      categoryCreates: [],
      productCreates: [],
      productUpdates: [],
      categoryAssignments: [
        {
          categoryName: 'Best Sellers',
          description: 'A curated collection of products with the strongest recent sales signals.',
          productIds,
          preserveExisting: true,
        },
      ],
      checkoutPaymentRules: [],
      seo: null,
    });
  }

  const wantsRamadan =
    /\bramadan\b/u.test(lower) || /رمضان/u.test(trimmed);
  if (wantsRamadan && /\b(add|create|make|campaign|collection)\b/u.test(lower)) {
    const productIds =
      (await bestSellerProductIds(input.storefront.slug, input.products, 8)).slice(0, 8);
    const fallbackIds = readyProductIds(input.products, 8);
    const selectedIds = productIds.length > 0 ? productIds : fallbackIds;
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary: 'I can stage a Ramadan campaign collection and home SEO update.',
      checklist: [
        { title: 'Create Ramadan Picks', detail: selectedIds.length ? `${selectedIds.length} products will be assigned` : 'No products are ready to assign yet' },
        { title: 'Update home SEO', detail: 'Use Ramadan-specific search and sharing copy' },
        { title: 'Keep secrets locked', detail: 'No payment provider credentials are exposed or changed' },
      ],
      categoryCreates: selectedIds.length ? [] : [{ name: 'Ramadan Picks', description: 'Seasonal Ramadan campaign collection.', imageUrl: null }],
      productCreates: [],
      productUpdates: [],
      categoryAssignments: selectedIds.length
        ? [
            {
              categoryName: 'Ramadan Picks',
              description: 'Seasonal products selected for Ramadan shoppers.',
              productIds: selectedIds,
              preserveExisting: true,
            },
          ]
        : [],
      checkoutPaymentRules: [],
      seo: {
        title: `${input.storefront.businessName} Ramadan Picks`,
        description: `Shop Ramadan-ready products from ${input.storefront.businessName} with simple checkout and bilingual support.`,
      },
    });
  }

  const wantsArabicDescriptions =
    /\barabic\b/u.test(lower) &&
    /\b(rewrite|write|update|improve|description|descriptions|copy)\b/u.test(lower);
  if (wantsArabicDescriptions || /وصف|عربي|العربية/u.test(trimmed) && /منتج|منتجات/u.test(trimmed)) {
    const products = input.products.slice(0, 20);
    if (products.length === 0) return emptyOperatorPlan('There are no products to rewrite yet.');
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary: `I can rewrite ${products.length} product description${products.length === 1 ? '' : 's'} in Arabic.`,
      checklist: [
        { title: 'Rewrite Arabic descriptions', detail: 'Use each product title, category, price, and store context' },
        { title: 'Preserve product settings', detail: 'Prices, inventory, variants, SEO, and images stay unchanged unless listed' },
        { title: 'Ready to review', detail: 'Apply after reviewing the generated Arabic copy' },
      ],
      categoryCreates: [],
      productCreates: [],
      productUpdates: products.map((product) => ({
        id: product.id,
        description: arabicDescriptionForProduct(product, input.storefront.businessName),
      })),
      categoryAssignments: [],
      checkoutPaymentRules: [],
      seo: null,
    });
  }

  const codOnlyCity = extractCodOnlyCity(input.message);
  if (codOnlyCity) {
    const codCities = cityAliasesForCodRule(codOnlyCity);
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary: `I can make cash on delivery available only for ${codOnlyCity} buyers.`,
      checklist: [
        { title: 'Update checkout rule', detail: `COD will require city ${codCities.join(' or ')} at checkout` },
        { title: 'Keep other methods unchanged', detail: 'Bank transfer, Fawran, and online providers keep their current configuration' },
        { title: 'Enforce server-side', detail: 'The final order action checks the same rule before creating an order' },
      ],
      categoryCreates: [],
      productCreates: [],
      productUpdates: [],
      categoryAssignments: [],
      checkoutPaymentRules: [
        {
          method: 'cod',
          mode: 'allow_only',
          cities: codCities,
        },
      ],
      seo: null,
    });
  }

  const wantsPerfumeSeo =
    /\bseo\b|search|google|meta/u.test(lower) &&
    /\b(perfume|perfumes|oud|fragrance|fragrances|scent|scents)\b/u.test(lower);
  if (wantsPerfumeSeo || (/عطر|عطور|عود/u.test(trimmed) && /seo|سيو/u.test(lower))) {
    const products = input.products.filter((product) => isPerfumeProduct(product)).slice(0, 20);
    if (products.length === 0) {
      return emptyOperatorPlan('I could not find perfume or oud products in the current catalog.');
    }
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary: `I can improve SEO for ${products.length} perfume product${products.length === 1 ? '' : 's'}.`,
      checklist: [
        { title: 'Draft product SEO', detail: 'Add search titles, descriptions, and image alt text' },
        { title: 'Use catalog context', detail: 'Only products that look like perfume, oud, fragrance, or scent items are included' },
        { title: 'Ready to review', detail: 'Apply after reviewing product-level SEO changes' },
      ],
      categoryCreates: [],
      productCreates: [],
      productUpdates: products.map((product) => ({
        id: product.id,
        ...seoForPerfumeProduct(product, input.storefront.businessName),
      })),
      categoryAssignments: [],
      checkoutPaymentRules: [],
      seo: null,
    });
  }

  return null;
}

function emptyOperatorPlan(summary: string): SouqyPlan {
  return SouqyPlanSchema.parse({
    id: crypto.randomUUID(),
    summary,
    checklist: [
      { title: 'No store changes staged', detail: 'Souqy needs enough store data before it can apply this request' },
    ],
    categoryCreates: [],
    productCreates: [],
    productUpdates: [],
    categoryAssignments: [],
    checkoutPaymentRules: [],
    seo: null,
  });
}

function extractCodOnlyCity(message: string): string | null {
  const lower = message.toLowerCase();
  const mentionsCod =
    /\b(cod|cash on delivery)\b/u.test(lower) ||
    /الدفع\s+عند\s+(?:الاستلام|التسليم)|كاش\s*اون\s*دليفري/u.test(message);
  const mentionsRestriction =
    /\b(only|enable|available|allow|restrict)\b/u.test(lower) ||
    /فقط|فعّل|فعل|تفعيل|متاح|اسمح|حصر|اقصر|خصص/u.test(message);
  if (!mentionsCod) return null;
  if (!mentionsRestriction) return null;
  const known = [
    'Al Wakrah',
    'الوكرة',
    'Al Khor',
    'الخور',
    'Al Thumamah',
    'الثمامة',
    'Riyadh',
    'الرياض',
    'Doha',
    'الدوحة',
    'Al Wukair',
    'الوكير',
    'Lusail',
    'لوسيل',
    'Al Rayyan',
    'الريان',
  ];
  const knownMatch = known.find((city) => lower.includes(city.toLowerCase()));
  if (knownMatch) return knownMatch;
  const quoted = message.match(/["'“”]([^"'“”]{2,80})["'“”]/u)?.[1]?.trim();
  if (quoted) return quoted;
  const directional = message.match(/\b(?:for|in|to)\s+([A-Za-z][A-Za-z\s-]{1,80})/iu)?.[1];
  if (!directional) return null;
  return directional
    .replace(/\b(checkout|buyers?|customers?|city|only|please|now)\b.*$/iu, '')
    .replace(/[.?!،,]+$/u, '')
    .trim() || null;
}

function cityAliasesForCodRule(city: string): string[] {
  const normalized = city.trim().toLowerCase();
  const aliases: Record<string, string[]> = {
    'al wakrah': ['Al Wakrah', 'الوكرة'],
    wakrah: ['Al Wakrah', 'الوكرة'],
    الوكرة: ['Al Wakrah', 'الوكرة'],
    'al khor': ['Al Khor', 'الخور'],
    alkhor: ['Al Khor', 'الخور'],
    الخور: ['Al Khor', 'الخور'],
    'al thumamah': ['Al Thumamah', 'الثمامة'],
    thumamah: ['Al Thumamah', 'الثمامة'],
    الثمامة: ['Al Thumamah', 'الثمامة'],
    riyadh: ['Riyadh', 'الرياض'],
    الرياض: ['Riyadh', 'الرياض'],
    doha: ['Doha', 'الدوحة'],
    الدوحة: ['Doha', 'الدوحة'],
    'al wukair': ['Al Wukair', 'الوكير'],
    wukair: ['Al Wukair', 'الوكير'],
    الوكير: ['Al Wukair', 'الوكير'],
    lusail: ['Lusail', 'لوسيل'],
    لوسيل: ['Lusail', 'لوسيل'],
    'al rayyan': ['Al Rayyan', 'الريان'],
    rayyan: ['Al Rayyan', 'الريان'],
    الريان: ['Al Rayyan', 'الريان'],
  };
  return aliases[normalized] ?? [city.trim()];
}

async function bestSellerProductIds(
  storefrontSlug: string,
  products: Product[],
  limit: number,
): Promise<string[]> {
  const validIds = new Set(products.map((product) => product.id));
  const rows = (await db()`
    select oi.product_id, sum(oi.quantity)::int as units, count(distinct o.id)::int as orders
    from checkout_order_items oi
    join checkout_orders o on o.id = oi.order_id
    where o.storefront_slug = ${storefrontSlug}
      and o.created_at >= now() - interval '30 days'
      and o.order_status <> 'cancelled'
      and oi.product_id is not null
    group by oi.product_id
    order by units desc, orders desc
    limit ${limit}
  `) as unknown as Array<{ product_id: string | null }>;
  const soldIds = rows
    .map((row) => row.product_id)
    .filter((id): id is string => Boolean(id && validIds.has(id)));
  return uniqueStrings([...soldIds, ...readyProductIds(products, limit)]).slice(0, limit);
}

function readyProductIds(products: Product[], limit: number): string[] {
  return products
    .filter((product) => product.status === 'active')
    .concat(products.filter((product) => product.status !== 'sold_out'))
    .filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index)
    .slice(0, limit)
    .map((product) => product.id);
}

function arabicDescriptionForProduct(product: Product, businessName: string): string {
  const parts = [
    `${product.title} من ${businessName}.`,
    product.category ? `يناسب عملاء يبحثون عن ${product.category} بجودة واضحة وتجربة شراء سهلة.` : 'اختيار مناسب لعملاء المتجر مع تجربة شراء سهلة وواضحة.',
    product.priceQar !== null ? `السعر ${product.priceQar} ر.ق.` : '',
    'اطلبه من المتجر مباشرة وسيتم التواصل معك لتأكيد التفاصيل والتوصيل.',
  ].filter(Boolean);
  return clampAssistantText(parts.join(' '), 780);
}

function isPerfumeProduct(product: Product): boolean {
  const text = [
    product.title,
    product.description,
    product.category,
    product.productType,
    product.vendor,
    ...product.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\b(perfume|perfumes|oud|fragrance|fragrances|scent|scents|musk|attar)\b/u.test(text) ||
    /عطر|عطور|عود|مسك|بخور/u.test(text);
}

function seoForPerfumeProduct(
  product: Product,
  businessName: string,
): { seoTitle: string; seoDescription: string; mediaAltText: string } {
  const category = product.category ?? 'perfume';
  return {
    seoTitle: clampAssistantText(`${product.title} | ${businessName} ${category}`, 155),
    seoDescription: clampAssistantText(
      `Shop ${product.title} from ${businessName}. Discover curated ${category} with clear pricing, simple checkout, and bilingual service.`,
      215,
    ),
    mediaAltText: clampAssistantText(`${product.title} ${category} from ${businessName}`, 175),
  };
}

function localPlanFallback(
  message: string,
  locale: string,
  products: Product[] = [],
  categories: Category[] = [],
): SouqyPlan {
  const lower = message.toLowerCase();
  if (isModelQuestion(lower) || isArabicLanguageFollowup(message)) {
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary:
        'That is a conversation question, not a store change. Ask it directly and I will answer with Souqna context.',
      checklist: [
        {
          title: 'No store changes staged',
          detail: 'Souqy only stages product, category, and home SEO changes for approval in this chat',
        },
      ],
      productCreates: [],
      productUpdates: [],
      seo: null,
    });
  }
  const wantsSeo = /\bseo\b|meta|title|description|وصف|عنوان/.test(lower);
  const wantsAbaya = /abaya|abayas|عباي/.test(lower);
  const wantsProductCreate =
    /\b(add|create|new|list)\b/.test(lower) && /\bproduct\b|منتج/.test(lower);
  const wantsProductUpdate =
    /\b(batch edit|edit|update|make|set|change)\b/.test(lower) &&
    /\bproduct|products\b|منتج/.test(lower);
  const imageUrl = extractFirstUrl(message);
  const requestedCategory = extractRequestedCategory(message);
  const requestedStatus = extractRequestedStatus(message);
  if (wantsProductUpdate) {
    const matchedProducts = products.filter((product) =>
      lower.includes(product.title.toLowerCase()),
    );
    if (matchedProducts.length > 0 && (requestedStatus || requestedCategory || imageUrl)) {
      return SouqyPlanSchema.parse({
        id: crypto.randomUUID(),
        summary: `I can batch edit ${matchedProducts.length} product${matchedProducts.length === 1 ? '' : 's'}.`,
        checklist: [
          {
            title: `Update ${matchedProducts.length} product${matchedProducts.length === 1 ? '' : 's'}`,
            detail: matchedProducts.map((p) => p.title).join(', '),
          },
          {
            title: 'Apply selected fields only',
            detail: ['status', requestedCategory ? 'category' : '', imageUrl ? 'image' : '']
              .filter(Boolean)
              .join(' · '),
          },
          { title: 'Ready to review', detail: 'Review the batch edit before applying' },
        ],
        categoryCreates: requestedCategory
          ? [{ name: requestedCategory, description: null, imageUrl: null }]
          : [],
        productCreates: [],
        productUpdates: matchedProducts.map((product) => ({
          id: product.id,
          ...(requestedStatus ? { status: requestedStatus } : {}),
          ...(requestedCategory ? { category: requestedCategory } : {}),
          ...(imageUrl ? { imageUrl } : {}),
        })),
        seo: null,
      });
    }
  }
  const namedProduct = extractRequestedProductTitle(message);
  const batchTitles = wantsProductCreate ? extractBatchProductTitles(message) : [];
  if (wantsProductCreate && (namedProduct || batchTitles.length > 0)) {
    const titles = batchTitles.length > 0 ? batchTitles : namedProduct ? [namedProduct] : [];
    if (!imageUrl || !requestedCategory) {
      return askForProductBasics({
        locale,
        categories,
        productTitles: titles,
        needsImage: !imageUrl,
        needsCategory: !requestedCategory,
      });
    }
    const wantsActive = /\b(publish|active|activate|live)\b|انشر|فعّل/.test(lower);
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary: `I can stage ${titles.length} ${wantsActive ? 'active' : 'draft'} product${titles.length === 1 ? '' : 's'}.`,
      checklist: [
        {
          title: titles.length === 1 ? 'Create product' : `Create ${titles.length} products`,
          detail: titles.join(', '),
        },
        {
          title: 'Draft AR/EN copy',
          detail:
            locale === 'ar'
              ? 'كتابة وصف عربي وإنجليزي مختصر'
              : 'Write short English and Arabic description text',
        },
        { title: 'Attach image and category', detail: `${requestedCategory} · ${imageUrl}` },
        { title: 'Ready to review', detail: 'Apply only after you approve this plan' },
      ],
      categoryCreates: requestedCategory
        ? [{ name: requestedCategory, description: null, imageUrl: null }]
        : [],
      productCreates: titles.map((title) => ({
        title,
        description: `A new product prepared by the assistant for founder review.\nمنتج جديد جهزه المساعد لمراجعة المؤسس.`,
        priceQar: null,
        imageUrl,
        category: requestedCategory,
        status: wantsActive ? 'active' : 'draft',
      })),
      productUpdates: [],
      seo: null,
    });
  }
  if (wantsAbaya) {
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary: 'I can stage three abaya products with Arabic and English copy.',
      checklist: [
        {
          title: 'Create 3 products',
          detail: 'Add abaya names, draft descriptions, and pricing placeholders',
        },
        { title: 'Draft AR/EN copy', detail: 'كتابة وصف بالعربية والإنجليزية' },
        { title: 'Create category', detail: 'Attach products to Abayas' },
        { title: 'Ready to review', detail: 'Review and publish when you are ready' },
      ],
      categoryCreates: [{ name: 'Abayas', description: null, imageUrl: null }],
      productCreates: [
        {
          title: 'Noor Classic Abaya',
          description:
            'A refined everyday abaya with clean lines.\nعباية يومية راقية بقصة هادئة وخطوط أنيقة.',
          priceQar: null,
          category: 'Abayas',
          status: 'draft',
        },
        {
          title: 'Layali Embroidered Abaya',
          description:
            'A soft evening abaya with delicate embroidered accents.\nعباية مسائية ناعمة بتطريز خفيف ولمسة فخمة.',
          priceQar: null,
          category: 'Abayas',
          status: 'draft',
        },
        {
          title: 'Dune Linen Abaya',
          description:
            'A breathable abaya for warm days, designed for effortless movement.\nعباية خفيفة مناسبة للأجواء الدافئة بحركة مريحة.',
          priceQar: null,
          category: 'Abayas',
          status: 'draft',
        },
      ],
      productUpdates: [],
      seo: null,
    });
  }
  if (wantsSeo) {
    return SouqyPlanSchema.parse({
      id: crypto.randomUUID(),
      summary: 'I can stage improved SEO for your home page.',
      checklist: [
        { title: 'Draft SEO title', detail: 'Keep it concise and storefront-specific' },
        {
          title: 'Draft SEO description',
          detail:
            locale === 'ar' ? 'وصف مناسب للبحث والمشاركة' : 'Better search and share preview copy',
        },
        { title: 'Ready to review', detail: 'Apply after you approve' },
      ],
      productCreates: [],
      productUpdates: [],
      seo: {
        title: 'Boutique storefront in Qatar',
        description:
          'Discover a curated Qatar-based storefront with refined products, simple ordering, and bilingual service.',
      },
    });
  }
  return SouqyPlanSchema.parse({
    id: crypto.randomUUID(),
    summary:
      'I understand you. Tell me the product, category, or home SEO update you want and I will prepare a review plan.',
    checklist: [
      {
        title: 'No store changes staged',
        detail: 'Tell me the exact Souqna change you want before I prepare an approval plan',
      },
    ],
    productCreates: [],
    productUpdates: [],
    seo: null,
  });
}

async function buildCategoryIndex(storefrontSlug: string): Promise<Map<string, Category>> {
  const categories = await getCategories(storefrontSlug);
  return new Map(categories.map((category) => [normalizeCategory(category.name), category]));
}

async function resolveCategoryIds(
  storefrontSlug: string,
  categoryName: string | null,
  categoryIndex: Map<string, Category>,
): Promise<string[]> {
  if (!categoryName) return [];
  const key = normalizeCategory(categoryName);
  const existing = categoryIndex.get(key);
  if (existing) return [existing.id];
  const category = await insertCategory(storefrontSlug, {
    name: categoryName,
    slug: await uniqueSlug(storefrontSlug, categoryName),
    description: null,
    imageUrl: null,
  });
  categoryIndex.set(key, category);
  return [category.id];
}

async function ensureCategoryForPlan(
  storefrontSlug: string,
  categoryName: string,
  description: string | null,
  categoryIndex: Map<string, Category>,
): Promise<Category> {
  const key = normalizeCategory(categoryName);
  const existing = categoryIndex.get(key);
  if (existing) return existing;
  const category = await insertCategory(storefrontSlug, {
    name: categoryName,
    slug: await uniqueSlug(storefrontSlug, categoryName),
    description,
    imageUrl: null,
  });
  categoryIndex.set(key, category);
  return category;
}

function productWriteInputFromCurrent(product: Product): ProductWriteInput {
  return {
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    priceQar: product.priceQar,
    compareAtPriceQar: product.compareAtPriceQar,
    costPerItemQar: product.costPerItemQar,
    taxable: product.taxable,
    discountEligible: product.discountEligible,
    pricingMode: product.pricingMode,
    monthlyPriceQar: product.monthlyPriceQar,
    imageUrl: product.imageUrl,
    mediaAltText: product.mediaAltText,
    category: product.category,
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags,
    templateKey: product.templateKey,
    badges: product.badges,
    handle: product.handle,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    eventAt: product.eventAt,
    publishedAt: product.publishedAt,
    saleStartsAt: product.saleStartsAt,
    saleEndsAt: product.saleEndsAt,
    status: product.status,
    stock: product.stock,
    sku: product.sku,
    barcode: product.barcode,
    trackInventory: product.trackInventory,
    continueSellingWhenOutOfStock: product.continueSellingWhenOutOfStock,
    lowStockThreshold: product.lowStockThreshold,
    restockAt: product.restockAt,
    supplierCostQar: product.supplierCostQar,
    purchaseOrderRef: product.purchaseOrderRef,
    stockStatusLabel: product.stockStatusLabel,
    minOrderQuantity: product.minOrderQuantity,
    maxOrderQuantity: product.maxOrderQuantity,
    physicalProduct: product.physicalProduct,
    weightGrams: product.weightGrams,
    packageDimensions: product.packageDimensions,
    requiresShipping: product.requiresShipping,
    freeShippingEligible: product.freeShippingEligible,
    countryOfOrigin: product.countryOfOrigin,
    hsCode: product.hsCode,
    customsDescription: product.customsDescription,
    digitalDelivery: product.digitalDelivery,
    metafields: product.metafields,
    isCustomizable: product.isCustomizable,
    customizationLabel: product.customizationLabel,
    sizeOptions: product.sizeOptionPrices,
    allowCustomSize: product.allowCustomSize,
    variantOptions: product.variantOptionPrices,
    requiresHeightInput: product.requiresHeightInput,
    heightInputLabel: product.heightInputLabel,
    heightOptions: product.heightOptions,
    isDemo: product.isDemo,
    source: product.source,
    sourceUrl: product.sourceUrl ?? null,
  };
}

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

function askForProductBasics(input: {
  locale: string;
  categories: Category[];
  productTitles: string[];
  needsImage: boolean;
  needsCategory: boolean;
}): SouqyPlan {
  const titleText = input.productTitles.join(', ');
  return SouqyPlanSchema.parse({
    id: crypto.randomUUID(),
    summary: `I can add ${titleText}, but I need ${[
      input.needsImage ? 'a product image URL' : '',
      input.needsCategory ? 'a category' : '',
    ]
      .filter(Boolean)
      .join(' and ')} before staging it.`,
    checklist: [
      {
        title: 'Collect product image',
        detail: 'Paste an image URL so the product is not created blank',
      },
      { title: 'Choose category', detail: 'Pick an existing category or create a new one' },
      {
        title: 'Then stage review plan',
        detail: 'The assistant will still wait for Apply before changing the store',
      },
    ],
    questions: [
      ...(input.needsImage
        ? [
            {
              id: 'product-image',
              label: 'What image should I use?',
              detail: 'Paste a product image URL, or upload one in Files and paste its URL here.',
              options: [],
            },
          ]
        : []),
      ...(input.needsCategory
        ? [
            {
              id: 'product-category',
              label: 'Which category should this go in?',
              detail: 'Choose one, or tell the assistant to create a new category.',
              options: [
                ...input.categories.slice(0, 5).map((category) => ({
                  label: category.name,
                  prompt: `Add ${titleText} with category ${category.name} and image URL `,
                })),
                {
                  label: 'Use Uncategorized',
                  prompt: `Add ${titleText} with category Uncategorized and image URL `,
                },
                {
                  label: 'Create new category',
                  prompt: `Add ${titleText} and create a new category named `,
                },
              ],
            },
          ]
        : []),
    ],
    categoryCreates: [],
    productCreates: [],
    productUpdates: [],
    seo: null,
  });
}

function extractRequestedProductTitle(message: string): string | null {
  const quoted = message.match(/["“”']\s*([^"“”']{1,160}?)\s*["“”']/);
  const named = message.match(/\bnamed\s+([^.,\n]{1,160})/i);
  const raw = quoted?.[1] ?? named?.[1];
  if (!raw) return null;
  const title = raw
    .replace(/\bwith\b.*$/i, '')
    .replace(/\bas\b.*$/i, '')
    .trim();
  return title || null;
}

function extractBatchProductTitles(message: string): string[] {
  const quoted = Array.from(message.matchAll(/["“”']\s*([^"“”']{1,160}?)\s*["“”']/g))
    .map((match) => cleanProductTitle(match[1]))
    .filter(Boolean);
  if (quoted.length > 1) return uniqueStrings(quoted);
  const list = message.match(/products?\s*[:\-]\s*([^.\n]{3,500})/i)?.[1];
  if (!list) return quoted.length === 1 ? quoted : [];
  const beforeDetails = list
    .replace(/\bwith\b.*$/i, '')
    .replace(/\bcategory\b.*$/i, '')
    .replace(/\bimage\b.*$/i, '');
  const titles = beforeDetails
    .split(/,|;|\band\b|\n/i)
    .map(cleanProductTitle)
    .filter((title) => title.length > 0);
  return uniqueStrings(titles);
}

function cleanProductTitle(value: string | undefined): string {
  return (value ?? '')
    .replace(/\bwith\b.*$/i, '')
    .replace(/\bas\b.*$/i, '')
    .trim();
}

function extractFirstUrl(message: string): string | null {
  return message.match(/https?:\/\/[^\s,)]+/i)?.[0] ?? null;
}

function extractRequestedCategory(message: string): string | null {
  const quotedCategory = message.match(/\bcategory\s+["“”']([^"“”']{1,80})["“”']/i)?.[1];
  const namedCategory = message.match(/\bcategory\s+([^.,\n]{1,80})/i)?.[1];
  const createNamed = message.match(/\bnew category named\s+["“”']?([^"“”'.,\n]{1,80})/i)?.[1];
  const raw = quotedCategory ?? createNamed ?? namedCategory;
  if (!raw) return null;
  const cleaned = raw
    .replace(/\band image\b.*$/i, '')
    .replace(/\bwith image\b.*$/i, '')
    .replace(/\bimage\b.*$/i, '')
    .trim();
  return cleaned || null;
}

function extractRequestedStatus(message: string): 'active' | 'draft' | 'sold_out' | null {
  const lower = message.toLowerCase();
  if (/\b(sold out|sold_out|unavailable)\b/.test(lower)) return 'sold_out';
  if (/\b(draft|hide|hidden)\b/.test(lower)) return 'draft';
  if (/\b(active|publish|published|live)\b/.test(lower)) return 'active';
  return null;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
