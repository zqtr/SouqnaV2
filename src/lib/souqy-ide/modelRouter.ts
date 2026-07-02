import 'server-only';
import { env } from '@/lib/env';
import {
  FANAR_ALLOWED_USE_CASES,
  FANAR_BLOCKED_USE_CASES,
  isSouqyStudioFanarEnabled,
  type FanarUseCase,
} from '@/lib/fanar/provider';
import type { SouqyStudioChatModel } from '@/lib/souqy-studio/modelCatalog';
import { SOUQY_STUDIO_CHAT_MODELS } from '@/lib/souqy-studio/modelCatalog';

/**
 * Server-side chat model routing (Master Plan Phase 0, pillar P6).
 *
 * Lives here — NOT in `modelCatalog.ts` — because the catalog is imported by
 * client components and routing needs server env. Guardrail: blocked use
 * cases (code-gen, architecture, storefront generation) never route to Fanar
 * regardless of configuration.
 */

export type SouqyIdeUseCase = FanarUseCase | (typeof FANAR_BLOCKED_USE_CASES)[number];

export type ResolvedChatModel = {
  model: SouqyStudioChatModel;
  /** Why this candidate was chosen (for logs/health, never UI copy). */
  reason: string;
};

export type ChatModelResolution = {
  primary: ResolvedChatModel | null;
  /** Full ordered chain, primary first. Empty when nothing is configured. */
  candidates: ResolvedChatModel[];
  /** Why no model resolved (only set when `primary` is null). */
  unavailableReason?: 'nothing_configured' | 'use_case_blocked_and_no_fallback';
};

export function isFanarAllowedUseCase(useCase: SouqyIdeUseCase): useCase is FanarUseCase {
  return (FANAR_ALLOWED_USE_CASES as readonly string[]).includes(useCase);
}

export function resolveChatModel(
  useCase: SouqyIdeUseCase,
  locale: 'en' | 'ar' = 'en',
): ChatModelResolution {
  const candidates: ResolvedChatModel[] = [];

  const fanar = SOUQY_STUDIO_CHAT_MODELS.find((model) => model.provider === 'runpod');
  const cranl = SOUQY_STUDIO_CHAT_MODELS.find((model) => model.provider === 'cranl');

  if (fanar && isSouqyStudioFanarEnabled() && isFanarAllowedUseCase(useCase)) {
    candidates.push({
      model: fanar,
      reason:
        locale === 'ar'
          ? 'fanar_enabled_arabic_preferred'
          : 'fanar_enabled_use_case_allowed',
    });
  }

  if (cranl && env.CRANL_RUNTIME_URL) {
    candidates.push({
      model: cranl,
      reason: candidates.length ? 'fallback_cranl_configured' : 'cranl_only_option',
    });
  }

  if (!candidates.length) {
    return {
      primary: null,
      candidates,
      unavailableReason:
        !isFanarAllowedUseCase(useCase) && isSouqyStudioFanarEnabled()
          ? 'use_case_blocked_and_no_fallback'
          : 'nothing_configured',
    };
  }

  return { primary: candidates[0]!, candidates };
}
