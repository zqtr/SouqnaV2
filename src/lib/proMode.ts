/** Client-safe Pro contracts. Server-only entitlement lives in `pro/entitlement.ts`. */
import type { ProAiConfiguration, ProAiPreferences } from '@/lib/pro/modelCatalog';
import type { Locale } from '@/i18n/locales';

export type ProFoundationId = 'structure' | 'motion' | 'bespoke';
/** Compatibility alias for the experimental UI while it is replaced. */
export type ProTemplateId = ProFoundationId;
export type ProEditorMode = 'easy' | 'pro';
export type ProJobKind = 'foundation_build' | 'bespoke_generate' | 'manual_build' | 'ai_edit';
export type ProJobStatus =
  | 'queued'
  | 'generating'
  | 'validating'
  | 'building'
  | 'repairing'
  | 'succeeded'
  | 'failed';
export type ProSessionStatus = 'active' | 'archived';
export type ProPromptTarget = 'storefront' | 'hero' | 'catalog' | 'mobile';
export type ProPromptIntent = 'redesign' | 'improve' | 'fix' | 'arabic';
export type ProSessionEventType =
  | 'user_prompt'
  | 'souqy_response'
  | 'job'
  | 'publish'
  | 'error';

export const PRO_ONBOARDING_VERSION = 2;
export const PRO_CONVERSION_CONSENT_VERSION = 1;
export const PRO_RECOMMENDATION_VERSION = 1;
export const PRO_TEMPLATE_IDS: readonly ProFoundationId[] = ['structure', 'motion', 'bespoke'];
export const PRO_PROMPT_TARGETS = ['storefront', 'hero', 'catalog', 'mobile'] as const;
export const PRO_PROMPT_INTENTS = ['redesign', 'improve', 'fix', 'arabic'] as const;

export function composeProEditRequest(args: {
  request: string;
  target?: ProPromptTarget | null;
  intent?: ProPromptIntent | null;
}): string {
  if (!args.target && !args.intent) return args.request;
  return [
    `Edit target: ${args.target ?? 'storefront'}.`,
    `Edit intent: ${args.intent ?? 'improve'}.`,
    args.request,
  ].join('\n');
}

export type ProBrandIntent = {
  visualAmbition: 'timeless' | 'expressive' | 'one_of_one';
  customerFeeling: 'trust' | 'energy' | 'discovery';
  launchPriority: 'conversion' | 'launch' | 'brand_world';
  note: string | null;
};

export type ProFoundationRecommendation = {
  foundation: ProFoundationId;
  reasons: string[];
  version: number;
};

export function isProBrandIntent(value: unknown): value is ProBrandIntent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.visualAmbition === 'timeless' ||
      candidate.visualAmbition === 'expressive' ||
      candidate.visualAmbition === 'one_of_one') &&
    (candidate.customerFeeling === 'trust' ||
      candidate.customerFeeling === 'energy' ||
      candidate.customerFeeling === 'discovery') &&
    (candidate.launchPriority === 'conversion' ||
      candidate.launchPriority === 'launch' ||
      candidate.launchPriority === 'brand_world') &&
    (candidate.note === null ||
      (typeof candidate.note === 'string' && candidate.note.length <= 500))
  );
}

export function isProTemplateId(value: unknown): value is ProFoundationId {
  return value === 'structure' || value === 'motion' || value === 'bespoke';
}

export function isProEditorMode(value: unknown): value is ProEditorMode {
  return value === 'easy' || value === 'pro';
}

export type ProWorkspaceSnapshot = {
  storefrontSlug: string;
  foundation: ProFoundationId;
  preferredMode: ProEditorMode;
  draftSource: string;
  draftSourceHash: string;
  draftVersion: number;
  builtRevision: string | null;
  builtBlobUrl: string | null;
  builtSource: string | null;
  builtSourceHash: string | null;
  builtSourceVersion: number | null;
  buildStatus: ProJobStatus | 'idle';
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  aiPreferences: ProAiPreferences;
  aiPreferencesVersion: number;
  brandIntent: ProBrandIntent | null;
  recommendationVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type ProJobSnapshot = {
  id: string;
  storefrontSlug: string;
  kind: ProJobKind;
  status: ProJobStatus;
  foundation: ProFoundationId | null;
  expectedVersion: number;
  sourceHash: string | null;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  diagnostics: string | null;
  revision: string | null;
  blobUrl: string | null;
  bytes: number | null;
  buildMs: number | null;
  configuration: ProAiConfiguration | null;
  createdAt: string;
  updatedAt: string;
};

export type ProSessionSnapshot = {
  id: string;
  storefrontSlug: string;
  title: string;
  status: ProSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProSessionEventSnapshot = {
  id: string;
  sessionId: string;
  type: ProSessionEventType;
  content: string | null;
  jobId: string | null;
  revision: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function getProSessionEventLabel(
  event: Pick<ProSessionEventSnapshot, 'type' | 'content' | 'metadata'>,
  locale: Locale,
): string {
  const isAiEdit = event.metadata.kind === 'ai_edit';
  if (event.type === 'user_prompt') {
    return event.content?.trim() || (locale === 'ar' ? 'طلب جديد' : 'New request');
  }
  if (locale === 'ar') {
    if (event.type === 'job') {
      return isAiEdit ? 'سوقي يعدّل المسودة الخاصة.' : 'بدأ بناء المعاينة الخاصة.';
    }
    if (event.type === 'souqy_response') {
      return isAiEdit
        ? 'تم تحديث المسودة الخاصة والمعاينة الجديدة جاهزة.'
        : 'المعاينة الخاصة جاهزة للمراجعة.';
    }
    if (event.type === 'publish') return 'تم نشر إصدار برو.';
    return 'تعذّر إكمال هذه الخطوة. راجع التفاصيل وحاول مرة أخرى.';
  }
  if (event.type === 'job') {
    return isAiEdit ? 'Souqy is editing the private draft.' : 'Private preview build started.';
  }
  if (event.type === 'souqy_response') {
    return isAiEdit
      ? 'The private draft is updated and the new preview is ready.'
      : 'The private preview is ready to review.';
  }
  if (event.type === 'publish') return 'Published this Pro revision.';
  return event.content?.trim() || 'This step could not be completed. Review the details and retry.';
}

export function nextProJobStatus(kind: ProJobKind): 'generating' | 'validating' {
  return kind === 'bespoke_generate' || kind === 'ai_edit' ? 'generating' : 'validating';
}

export function isProPublishReady(workspace: ProWorkspaceSnapshot): boolean {
  return Boolean(
    workspace.builtRevision &&
      workspace.builtBlobUrl &&
      workspace.builtSource &&
      workspace.buildStatus === 'succeeded' &&
      workspace.builtSourceHash === workspace.draftSourceHash &&
      workspace.builtSourceVersion === workspace.draftVersion,
  );
}
