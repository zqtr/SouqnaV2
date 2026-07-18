import { parseQarPrice } from '@/lib/instagram/price';
import {
  applyAnswerPatch,
  buildReviewQuestions,
  computeGaps,
  type ReviewQuestion,
  type ReviewQuestionKind,
} from '@/lib/instagram/questions';
import type {
  DraftProduct,
  IgPost,
  IgProfile,
  StoreSuggestions,
} from '@/lib/instagram/types';

/**
 * Client-side state machine for the /begin Instagram import step. The
 * reducer owns every transition; the components only dispatch. Kept
 * separate from the UI so transitions are unit-testable and so the
 * confirmed state can be persisted/restored across the sign-up redirect.
 */

export type ImportPhase =
  | 'idle'
  | 'fetching'
  | 'manual'
  | 'analyzing'
  | 'chat'
  | 'summary'
  | 'confirmed'
  | 'skipped';

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  /** Renders the draft card for this post above the bubble. */
  postId?: string;
  kind?: ReviewQuestionKind;
};

export type ImportState = {
  phase: ImportPhase;
  importId: string | null;
  handle: string;
  profile: IgProfile | null;
  posts: IgPost[];
  drafts: DraftProduct[];
  suggestions: StoreSuggestions | null;
  questions: ReviewQuestion[];
  questionIndex: number;
  messages: ChatMessage[];
  analyzedCount: number;
  aiAvailable: boolean;
  /** Contextual note shown in manual mode (private profile, fetch error…). */
  manualNote: string | null;
  error: string | null;
};

export const initialImportState: ImportState = {
  phase: 'idle',
  importId: null,
  handle: '',
  profile: null,
  posts: [],
  drafts: [],
  suggestions: null,
  questions: [],
  questionIndex: 0,
  messages: [],
  analyzedCount: 0,
  aiAvailable: true,
  manualNote: null,
  error: null,
};

export type ImportAction =
  | { type: 'set-handle'; handle: string }
  | { type: 'fetch-start' }
  | { type: 'fetch-error'; message: string }
  | { type: 'enter-manual'; importId: string; note: string | null }
  | { type: 'fetch-done'; importId: string; profile: IgProfile; posts: IgPost[] }
  | { type: 'manual-post-added'; post: IgPost }
  | { type: 'manual-post-removed'; postId: string }
  | { type: 'manual-caption'; postId: string; caption: string }
  | { type: 'analyze-start' }
  | { type: 'analyze-progress'; drafts: DraftProduct[]; analyzedCount: number }
  | { type: 'suggestions'; suggestions: StoreSuggestions | null }
  | { type: 'ai-unavailable' }
  | { type: 'analyze-complete' }
  | { type: 'push-message'; message: ChatMessage }
  | { type: 'apply-patch'; postId: string; patch: Partial<DraftProduct> }
  | { type: 'advance-question' }
  | { type: 'skip-product'; postId: string }
  | { type: 'accept-all' }
  | { type: 'toggle-include'; postId: string }
  | { type: 'edit-draft'; postId: string; patch: Partial<DraftProduct> }
  | { type: 'confirm' }
  | { type: 'skip-import' }
  | { type: 'error'; message: string }
  | { type: 'restore'; state: ImportState };

/**
 * When the AI gateway is down we still walk the merchant through their
 * posts: caption first-line → title guess, regex → price, and the chat's
 * deterministic questions cover the rest.
 */
export function buildFallbackDrafts(posts: IgPost[]): DraftProduct[] {
  return posts
    .filter((post) => post.imageUrl !== null)
    .map((post) => {
      const caption = post.caption?.trim() ?? '';
      const firstLine = caption.split('\n')[0]?.trim() ?? '';
      const titleGuess = firstLine.replace(/[#@][^\s]+/gu, '').trim().slice(0, 80) || null;
      const isArabic = titleGuess ? /[؀-ۿ]/u.test(titleGuess) : false;
      const price = parseQarPrice(caption);
      const base: Omit<DraftProduct, 'gaps'> = {
        postId: post.id,
        isProduct: true,
        confidence: 0.5,
        titleEn: isArabic ? null : titleGuess,
        titleAr: isArabic ? titleGuess : null,
        description: caption ? caption.slice(0, 1000) : null,
        priceQar: price.priceQar,
        dmForPrice: price.dmForPrice,
        category: null,
        sizeOptions: [],
        variantOptions: [],
        imageUrl: post.imageUrl,
        sourceUrl: post.id.startsWith('manual-')
          ? null
          : `https://www.instagram.com/p/${post.shortcode}/`,
      };
      return { ...base, gaps: computeGaps(base) };
    });
}

function completeAnalysis(state: ImportState): ImportState {
  const questions = buildReviewQuestions(state.drafts);
  return {
    ...state,
    questions,
    questionIndex: 0,
    phase: questions.length > 0 ? 'chat' : 'summary',
  };
}

function advance(state: ImportState, fromIndex: number): ImportState {
  // Skip questions whose gap has since been resolved (e.g. an inline
  // edit answered a later question early, or the product was skipped).
  let index = fromIndex;
  while (index < state.questions.length) {
    const question = state.questions[index]!;
    const draft = state.drafts.find((d) => d.postId === question.postId);
    // A question is still live while its gap exists — including the
    // is_product question on an uncertain "not a product" draft.
    if (draft && draft.gaps.includes(questionGap(question.kind))) break;
    index += 1;
  }
  if (index >= state.questions.length) {
    return { ...state, questionIndex: index, phase: 'summary' };
  }
  return { ...state, questionIndex: index };
}

function questionGap(kind: ReviewQuestionKind): DraftProduct['gaps'][number] {
  return kind;
}

export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'set-handle':
      return { ...state, handle: action.handle, error: null };
    case 'fetch-start':
      return { ...state, phase: 'fetching', error: null };
    case 'fetch-error':
      return { ...state, phase: 'idle', error: action.message };
    case 'enter-manual':
      return {
        ...state,
        phase: 'manual',
        importId: state.importId ?? action.importId,
        manualNote: action.note,
        error: null,
      };
    case 'fetch-done':
      return {
        ...state,
        phase: 'analyzing',
        importId: action.importId,
        profile: action.profile,
        posts: action.posts,
        drafts: [],
        analyzedCount: 0,
        error: null,
      };
    case 'manual-post-added':
      return { ...state, posts: [...state.posts, action.post], error: null };
    case 'manual-post-removed':
      return { ...state, posts: state.posts.filter((p) => p.id !== action.postId) };
    case 'manual-caption':
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.postId ? { ...p, caption: action.caption || null } : p,
        ),
      };
    case 'analyze-start':
      return { ...state, phase: 'analyzing', drafts: [], analyzedCount: 0, error: null };
    case 'analyze-progress':
      return { ...state, drafts: action.drafts, analyzedCount: action.analyzedCount };
    case 'suggestions':
      return { ...state, suggestions: action.suggestions };
    case 'ai-unavailable': {
      const remaining = state.posts.filter(
        (post) => !state.drafts.some((draft) => draft.postId === post.id),
      );
      return {
        ...state,
        aiAvailable: false,
        drafts: [...state.drafts, ...buildFallbackDrafts(remaining)],
      };
    }
    case 'analyze-complete':
      return completeAnalysis(state);
    case 'push-message':
      if (state.messages.some((m) => m.id === action.message.id)) return state;
      return { ...state, messages: [...state.messages, action.message] };
    case 'apply-patch': {
      const drafts = state.drafts.map((draft) =>
        draft.postId === action.postId ? applyAnswerPatch(draft, action.patch) : draft,
      );
      return { ...state, drafts };
    }
    case 'advance-question':
      return advance(state, state.questionIndex + 1);
    case 'skip-product': {
      const drafts = state.drafts.map((draft) =>
        draft.postId === action.postId ? applyAnswerPatch(draft, { isProduct: false }) : draft,
      );
      return advance({ ...state, drafts }, state.questionIndex + 1);
    }
    case 'accept-all':
      return { ...state, phase: 'summary' };
    case 'toggle-include': {
      const drafts = state.drafts.map((draft) =>
        draft.postId === action.postId
          ? applyAnswerPatch(draft, { isProduct: !draft.isProduct })
          : draft,
      );
      return { ...state, drafts };
    }
    case 'edit-draft': {
      const drafts = state.drafts.map((draft) =>
        draft.postId === action.postId ? applyAnswerPatch(draft, action.patch) : draft,
      );
      return { ...state, drafts };
    }
    case 'confirm':
      return { ...state, phase: 'confirmed' };
    case 'skip-import':
      return { ...state, phase: 'skipped' };
    case 'error':
      return { ...state, error: action.message };
    case 'restore':
      return action.state;
    default:
      return state;
  }
}

// ————— persistence across the sign-up redirect —————

export const IG_IMPORT_STORAGE_KEY = 'souqna-ig-import-v1';

type PersistedImport = {
  version: 1;
  importId: string | null;
  handle: string;
  profile: IgProfile | null;
  drafts: DraftProduct[];
  suggestions: StoreSuggestions | null;
};

/** Persist only what `finalizeImport` + prefill need — never the chat
 *  transcript. Called when the merchant confirms while signed out. */
export function persistImportState(state: ImportState): void {
  try {
    const payload: PersistedImport = {
      version: 1,
      importId: state.importId,
      handle: state.handle,
      profile: state.profile,
      drafts: state.drafts,
      suggestions: state.suggestions,
    };
    const json = JSON.stringify(payload);
    if (json.length > 400_000) return; // localStorage guard
    window.localStorage.setItem(IG_IMPORT_STORAGE_KEY, json);
  } catch {
    // Private browsing / quota — the merchant just re-runs the import.
  }
}

export function restoreImportState(): ImportState | null {
  try {
    const raw = window.localStorage.getItem(IG_IMPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedImport;
    if (parsed.version !== 1 || !Array.isArray(parsed.drafts)) return null;
    return {
      ...initialImportState,
      phase: 'confirmed',
      importId: parsed.importId,
      handle: parsed.handle ?? '',
      profile: parsed.profile ?? null,
      drafts: parsed.drafts,
      suggestions: parsed.suggestions ?? null,
    };
  } catch {
    return null;
  }
}

export function clearImportState(): void {
  try {
    window.localStorage.removeItem(IG_IMPORT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
