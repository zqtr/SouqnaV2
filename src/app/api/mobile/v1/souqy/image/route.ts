import { z } from 'zod';
import {
  generateSouqyStudioAssets,
  type SouqyStudioFormat,
  type SouqyStudioTemplate,
} from '@/app/actions/souqyStudio';
import {
  getSouqyStudioModel,
  isSouqyStudioModelId,
} from '@/lib/souqy-studio/modelCatalog';
import {
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
} from '@/lib/mobile/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

const GenerateImageSchema = z.object({
  store: z.string().trim().min(1),
  prompt: z.string().trim().min(8).max(1600),
  modelId: z.string().trim().optional(),
  referenceImageUrl: z.string().url().optional().nullable(),
  referenceImageTitle: z.string().trim().max(180).optional().nullable(),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = GenerateImageSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(400, 'invalid_generation_request', 'Describe the image you want Souqy to generate.');
  }

  const gate = await requireMobileStoreAccess(parsed.data.store, 'builder.edit');
  if (!gate.ok) return gate.response;

  let reference: Awaited<ReturnType<typeof referenceFromImageUrl>> | null = null;
  if (parsed.data.referenceImageUrl) {
    try {
      reference = await referenceFromImageUrl(
        parsed.data.referenceImageUrl,
        parsed.data.referenceImageTitle ?? undefined,
      );
    } catch (err) {
      return mobileError(
        400,
        'reference_image_unavailable',
        err instanceof Error ? err.message : 'Could not use that image as a reference.',
      );
    }
  }
  const requestedModel = getSouqyStudioModel(parsed.data.modelId);
  const selectedModel = reference && !requestedModel.supportsReferences ? null : requestedModel;
  const responseModel = selectedModel ?? {
    id: 'auto:reference-edit',
    label: 'Reference edit',
    shortLabel: 'Reference edit',
  };
  const routing = inferStudioRoute(parsed.data.prompt);
  const result = await generateSouqyStudioAssets({
    prompt: parsed.data.prompt,
    template: routing.template,
    formatKey: routing.formatKey,
    locale: gate.access.storefront.locale,
    sourceStorefrontSlug: gate.access.storefront.slug,
    selectedProductIds: [],
    printBleed: routing.template === 'launch-poster',
    quality: 'high',
    creativity: 7,
    brandInstructions: [
      `Storefront: ${gate.access.storefront.businessName}.`,
      gate.access.storefront.businessType ? `Business type: ${gate.access.storefront.businessType}.` : '',
      gate.access.storefront.tagline ? `Tagline: ${gate.access.storefront.tagline}.` : '',
      'Use Souqna premium GCC commerce styling and avoid fake urgency.',
    ]
      .filter(Boolean)
      .join(' '),
    references: reference ? [reference] : [],
    modelId: selectedModel && isSouqyStudioModelId(selectedModel.id) ? selectedModel.id : undefined,
  });

  if (result.status === 'error') {
    return mobileError(400, 'generation_failed', result.message);
  }

  const asset = result.assets[0];
  if (!asset) {
    return mobileError(500, 'generation_empty', 'Souqy did not return an image.');
  }

  return mobileJson({
    status: 'success',
    message: `Generated with ${responseModel.label}.`,
    model: {
      id: responseModel.id,
      label: responseModel.label,
      shortLabel: responseModel.shortLabel,
    },
    asset,
  });
}

const ALLOWED_REFERENCE_HOST_SUFFIXES = [
  '.public.blob.vercel-storage.com',
  '.blob.vercel-storage.com',
  '.replicate.delivery',
  '.fal.media',
  '.ideogram.ai',
];

const ALLOWED_REFERENCE_HOSTS = new Set([
  'replicate.delivery',
  'v3.fal.media',
  'fal.media',
  'ideogram.ai',
]);

async function referenceFromImageUrl(url: string, title?: string): Promise<{
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/webp' | 'image/svg+xml';
  dataUrl: string;
}> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !isAllowedReferenceHost(parsed.hostname)) {
    throw new Error('Souqy can only re-edit generated image assets.');
  }

  const response = await fetch(parsed, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) {
    throw new Error(`Could not load the reference image (${response.status}).`);
  }

  const mimeType = normalizeReferenceMime(response.headers.get('content-type'));
  const body = await response.arrayBuffer();
  if (body.byteLength > 5_000_000) {
    throw new Error('Reference image is too large to re-edit from mobile.');
  }

  return {
    name: sanitizeReferenceName(title ?? 'souqy-reference'),
    mimeType,
    dataUrl: `data:${mimeType};base64,${Buffer.from(body).toString('base64')}`,
  };
}

function isAllowedReferenceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    ALLOWED_REFERENCE_HOSTS.has(host) ||
    ALLOWED_REFERENCE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

function normalizeReferenceMime(value: string | null): 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/webp' | 'image/svg+xml' {
  const mime = value?.split(';')[0]?.trim().toLowerCase();
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/jpeg') return 'image/jpeg';
  if (mime === 'image/jpg') return 'image/jpg';
  if (mime === 'image/webp') return 'image/webp';
  if (mime === 'image/svg+xml') return 'image/svg+xml';
  throw new Error('Reference image must be PNG, JPG, or WebP.');
}

function sanitizeReferenceName(value: string): string {
  const cleaned = value
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned || 'souqy-reference';
}

function inferStudioRoute(prompt: string): {
  template: SouqyStudioTemplate;
  formatKey?: SouqyStudioFormat;
} {
  const lower = prompt.toLowerCase();
  if (/\blogo|شعار/u.test(lower)) {
    return { template: 'logo', formatKey: 'logo-square' };
  }
  if (/\bmenu|منيو|قائمة/u.test(lower)) {
    return { template: 'restaurant-menu', formatKey: 'menu-print' };
  }
  if (/\bpackaging|package|mockup|box|bag|تغليف|علبة|كيس/u.test(lower)) {
    return { template: 'packaging-mockup' };
  }
  if (/\bproduct card|product visual|بطاقة منتج/u.test(lower)) {
    return { template: 'product-card', formatKey: 'product-card' };
  }
  if (/\bstory|status|snapchat|tiktok|ستوري|سناب|تيك/u.test(lower)) {
    return { template: 'story-promo', formatKey: 'instagram-story' };
  }
  if (/\bbanner|cover|wide|بنر|بانر|غلاف/u.test(lower)) {
    return { template: 'wide-banner', formatKey: 'wide-banner' };
  }
  if (/\bbrand|identity|هوية/u.test(lower)) {
    return { template: 'brand-identity' };
  }
  if (/\bposter|flyer|print|بوستر|ملصق/u.test(lower)) {
    return { template: 'launch-poster', formatKey: 'instagram-post' };
  }
  return { template: 'ad-creative', formatKey: 'instagram-post' };
}
