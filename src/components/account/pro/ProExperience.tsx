'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import {
  completeProOnboardingAction,
  confirmProConversionAction,
  initializeProWorkspaceAction,
  retryProJobAction,
} from '@/app/actions/pro';
import { getEasyManifestVersionAction } from '@/app/actions/storefrontSnapshots';
import { MobiusLoopIcon } from '@/components/mobius-loop-icon';
import { ProConversionConsent } from '@/components/account/pro/ProConversionConsent';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { BusinessType, DesignId } from '@/lib/brief';
import type { Locale } from '@/i18n/locales';
import type { PaletteId } from '@/lib/palettes';
import { recommendProFoundation } from '@/lib/pro/recommendation';
import { recoverProJourneyCheckpoint } from '@/lib/pro/journeyRecovery';
import {
  PRO_CONVERSION_CONSENT_VERSION,
  PRO_ONBOARDING_VERSION,
  PRO_RECOMMENDATION_VERSION,
  PRO_TEMPLATE_IDS,
  type ProBrandIntent,
  type ProFoundationId,
  type ProFoundationRecommendation,
  type ProJobSnapshot,
  type ProWorkspaceSnapshot,
} from '@/lib/proMode';

export type ProStorefrontSummary = {
  slug: string;
  businessName: string;
  businessType: BusinessType;
  tagline: string | null;
  logoUrl: string | null;
  design: DesignId;
  palette: PaletteId;
  isPublished: boolean;
  souqyActive: boolean;
};

type JourneyStage =
  | 'scan'
  | 'interview'
  | 'recommendation'
  | 'review'
  | 'converting'
  | 'ready'
  | 'failed';
type FailureKind = 'recovery' | 'conversion' | 'job';
type PreviewMode = 'easy' | 'pro';

type JourneyState = {
  stage: JourneyStage;
  interviewStep: 0 | 1 | 2 | 3;
  intent: Partial<ProBrandIntent>;
  recommendation: ProFoundationRecommendation | null;
  selectedFoundation: ProFoundationId | null;
  previewMode: PreviewMode;
  expectedEasyVersion: number | null;
  acknowledged: boolean;
  failureKind: FailureKind | null;
  message: string | null;
};

type JourneyAction =
  | { type: 'stage'; stage: JourneyStage }
  | { type: 'answer'; field: keyof ProBrandIntent; value: string | null }
  | { type: 'recommend'; recommendation: ProFoundationRecommendation }
  | { type: 'select'; foundation: ProFoundationId }
  | { type: 'preview'; mode: PreviewMode }
  | { type: 'manifest'; version: number }
  | { type: 'acknowledge'; value: boolean }
  | { type: 'fail'; kind: FailureKind; message: string }
  | { type: 'resetFailure' }
  | { type: 'hydrate'; state: JourneyState };

const TERMINAL = new Set(['succeeded', 'failed']);
const DEFAULT_INTENT: ProBrandIntent = {
  visualAmbition: 'timeless',
  customerFeeling: 'trust',
  launchPriority: 'conversion',
  note: null,
};

function initialJourney(manage: boolean, workspace: ProWorkspaceSnapshot | null): JourneyState {
  return {
    stage: manage ? 'recommendation' : 'scan',
    interviewStep: 0,
    intent: workspace?.brandIntent ?? {},
    recommendation: workspace
      ? { foundation: workspace.foundation, reasons: [], version: workspace.recommendationVersion }
      : null,
    selectedFoundation: workspace?.foundation ?? null,
    previewMode: 'pro',
    expectedEasyVersion: null,
    acknowledged: false,
    failureKind: null,
    message: null,
  };
}

function reducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case 'stage':
      return { ...state, stage: action.stage, message: null, failureKind: null };
    case 'answer':
      return { ...state, intent: { ...state.intent, [action.field]: action.value } };
    case 'recommend':
      return {
        ...state,
        stage: 'recommendation',
        recommendation: action.recommendation,
        selectedFoundation: action.recommendation.foundation,
        previewMode: 'pro',
      };
    case 'select':
      return { ...state, selectedFoundation: action.foundation, previewMode: 'pro' };
    case 'preview':
      return { ...state, previewMode: action.mode };
    case 'manifest':
      return { ...state, expectedEasyVersion: action.version, stage: 'review' };
    case 'acknowledge':
      return { ...state, acknowledged: action.value };
    case 'fail':
      return { ...state, stage: 'failed', failureKind: action.kind, message: action.message };
    case 'resetFailure':
      return {
        ...state,
        stage: state.failureKind === 'job' ? 'converting' : 'recommendation',
        failureKind: null,
        message: null,
      };
    case 'hydrate':
      return action.state;
  }
}

const JOURNEY_STAGES = new Set<JourneyStage>([
  'scan',
  'interview',
  'recommendation',
  'review',
  'converting',
  'ready',
  'failed',
]);
const FAILURE_KINDS = new Set<FailureKind>(['recovery', 'conversion', 'job']);

function readSavedJourney(
  raw: string,
  fallback: JourneyState,
  workspace: ProWorkspaceSnapshot | null,
  job: ProJobSnapshot | null,
): JourneyState {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
  const candidate = parsed as Record<string, unknown>;
  if (!JOURNEY_STAGES.has(candidate.stage as JourneyStage)) return fallback;

  const intentCandidate =
    candidate.intent && typeof candidate.intent === 'object' && !Array.isArray(candidate.intent)
      ? (candidate.intent as Record<string, unknown>)
      : {};
  const intent: Partial<ProBrandIntent> = {};
  if (
    intentCandidate.visualAmbition === 'timeless' ||
    intentCandidate.visualAmbition === 'expressive' ||
    intentCandidate.visualAmbition === 'one_of_one'
  ) {
    intent.visualAmbition = intentCandidate.visualAmbition;
  }
  if (
    intentCandidate.customerFeeling === 'trust' ||
    intentCandidate.customerFeeling === 'energy' ||
    intentCandidate.customerFeeling === 'discovery'
  ) {
    intent.customerFeeling = intentCandidate.customerFeeling;
  }
  if (
    intentCandidate.launchPriority === 'conversion' ||
    intentCandidate.launchPriority === 'launch' ||
    intentCandidate.launchPriority === 'brand_world'
  ) {
    intent.launchPriority = intentCandidate.launchPriority;
  }
  if (
    intentCandidate.note === null ||
    (typeof intentCandidate.note === 'string' && intentCandidate.note.length <= 500)
  ) {
    intent.note = intentCandidate.note;
  }

  const recommendationCandidate =
    candidate.recommendation &&
    typeof candidate.recommendation === 'object' &&
    !Array.isArray(candidate.recommendation)
      ? (candidate.recommendation as Record<string, unknown>)
      : null;
  const recommendation =
    recommendationCandidate &&
    PRO_TEMPLATE_IDS.includes(recommendationCandidate.foundation as ProFoundationId) &&
    Array.isArray(recommendationCandidate.reasons) &&
    recommendationCandidate.reasons.every((reason) => typeof reason === 'string') &&
    Number.isInteger(recommendationCandidate.version)
      ? {
          foundation: recommendationCandidate.foundation as ProFoundationId,
          reasons: recommendationCandidate.reasons as string[],
          version: recommendationCandidate.version as number,
        }
      : fallback.recommendation;
  const selectedFoundation = PRO_TEMPLATE_IDS.includes(
    candidate.selectedFoundation as ProFoundationId,
  )
    ? (candidate.selectedFoundation as ProFoundationId)
    : fallback.selectedFoundation;
  const expectedEasyVersion =
    typeof candidate.expectedEasyVersion === 'number' &&
    Number.isInteger(candidate.expectedEasyVersion) &&
    candidate.expectedEasyVersion > 0
      ? candidate.expectedEasyVersion
      : null;
  const requestedStage = candidate.stage as JourneyStage;
  const stage =
    requestedStage === 'review' && expectedEasyVersion == null ? 'recommendation' : requestedStage;
  const saved: JourneyState = {
    stage,
    interviewStep:
      candidate.interviewStep === 0 ||
      candidate.interviewStep === 1 ||
      candidate.interviewStep === 2 ||
      candidate.interviewStep === 3
        ? candidate.interviewStep
        : 0,
    intent,
    recommendation,
    selectedFoundation,
    previewMode: candidate.previewMode === 'easy' ? 'easy' : 'pro',
    expectedEasyVersion,
    acknowledged: candidate.acknowledged === true,
    failureKind: FAILURE_KINDS.has(candidate.failureKind as FailureKind)
      ? (candidate.failureKind as FailureKind)
      : null,
    message: typeof candidate.message === 'string' ? candidate.message : null,
  };
  const recovered = recoverProJourneyCheckpoint({
    checkpoint: {
      stage: saved.stage,
      failureKind: saved.failureKind,
      message: saved.message,
    },
    jobStatus: job?.status ?? null,
    jobErrorMessage: job?.errorMessage,
    hasWorkspace: Boolean(workspace),
    hasReviewCheckpoint: saved.expectedEasyVersion != null && saved.acknowledged,
  });
  return { ...saved, ...recovered };
}

const COPY = {
  en: {
    product: 'Souqna Pro',
    exit: 'Exit to dashboard',
    emptyTitle: 'Create a storefront before entering Pro',
    emptyBody: 'Pro builds a separate professional direction for an existing Souqna storefront.',
    emptyAction: 'Start a storefront',
    lockedTitle: 'Pro Studio is view only',
    lockedBody:
      'Your existing Pro storefront remains online. Upgrade to create, replace, generate, build, or publish.',
    upgrade: 'View plans',
    progress: ['Brand scan', 'Interview', 'Direction', 'Protection', 'Transformation'],
    scanKicker: 'Your store, seen clearly',
    scanTitle: 'Before Pro changes the canvas, Souqy reads what already exists.',
    scanBody:
      'This is your current Easy identity and live publication state. The preview is private to you and uses the real storefront draft.',
    start: 'Shape my Pro direction',
    currentEasy: 'Current Easy storefront',
    published: 'Published',
    unpublished: 'Not published',
    businessType: 'Business',
    palette: 'Palette',
    design: 'Easy design',
    tagline: 'Tagline',
    missing: 'Not added yet',
    interviewKicker: 'Brand interview',
    interviewTitle: 'Three decisions. One clearer direction.',
    interviewBody:
      'Souqy uses these answers to recommend a foundation instantly. This step uses no AI credits.',
    optional: 'Optional direction note',
    notePlaceholder: 'Anything Souqy should protect, avoid, or make unmistakably yours?',
    back: 'Back',
    continue: 'Continue',
    seeDirection: 'See my direction',
    questions: [
      {
        title: 'How should the visual system feel?',
        field: 'visualAmbition',
        options: [
          ['timeless', 'Timeless', 'Quiet authority, editorial rhythm, lasting clarity'],
          ['expressive', 'Expressive', 'Kinetic composition, stronger launches, visible energy'],
          ['one_of_one', 'One of one', 'A brand world built around your particular identity'],
        ],
      },
      {
        title: 'What should customers feel first?',
        field: 'customerFeeling',
        options: [
          ['trust', 'Trust', 'Clear hierarchy and confident decisions'],
          ['energy', 'Energy', 'Momentum, desire, and a sense of movement'],
          ['discovery', 'Discovery', 'Curiosity, depth, and rewarding exploration'],
        ],
      },
      {
        title: 'What matters most for this launch?',
        field: 'launchPriority',
        options: [
          ['conversion', 'Conversion', 'Move customers from interest to action'],
          ['launch', 'Launch impact', 'Make new releases and campaigns feel important'],
          ['brand_world', 'Brand world', 'Create a distinctive place customers remember'],
        ],
      },
    ],
    recommendationKicker: 'Souqy recommendation',
    recommendationTitle: 'A direction shaped around your answers.',
    recommendationBody:
      'The recommendation is deterministic and instant. You are still in control, and changing direction does not publish anything.',
    recommended: 'Recommended for this store',
    current: 'Current foundation',
    alternatives: 'Other directions',
    choose: 'Choose direction',
    compareEasy: 'Current Easy',
    comparePro: 'Pro direction',
    previewLoading: 'Preparing owner preview',
    previewFailed: 'Preview could not load',
    retryPreview: 'Reload preview',
    openPreview: 'Open full preview',
    protect: 'Continue to protection review',
    replace: 'Replace with this direction',
    activeProtected: 'Active direction',
    foundations: {
      structure: {
        name: 'Structure',
        body: 'Editorial precision and a disciplined route to purchase.',
      },
      motion: { name: 'Motion', body: 'A campaign-led storefront with responsive energy.' },
      bespoke: {
        name: 'Bespoke',
        body: 'A one-of-one Souqy composition generated from your identity.',
      },
    },
    convertingKicker: 'Private transformation',
    convertingTitle: 'Souqna is creating your Pro workspace.',
    convertingBody:
      'Every status below comes from the actual workspace and build job. Your live storefront remains untouched.',
    phases: {
      saving: 'Saving Easy recovery point',
      queued: 'Creating Pro workspace',
      generating: 'Generating Bespoke direction',
      validating: 'Validating restricted TSX and CSS',
      building: 'Building private preview',
      repairing: 'Repairing build safely',
      succeeded: 'Private preview ready',
      failed: 'Build needs attention',
    },
    readyKicker: 'Pro workspace ready',
    readyTitle: 'Your new direction is ready for the Builder.',
    readyBody:
      'The Easy recovery point is stored. The Pro preview is private and nothing has changed live.',
    readyReplacementBody:
      'The previous Pro source is preserved in history. The replacement preview is private and nothing has changed live.',
    backup: 'View Easy backup in Storage',
    openBuilder: 'Open Pro Builder',
    failedKicker: 'Conversion paused safely',
    failedTitle: 'Nothing live changed.',
    failedBody:
      'Your answers and chosen direction are still here. Resolve the issue, then retry from this checkpoint.',
    retry: 'Retry',
    returnDashboard: 'Return to dashboard',
    replaceTitle: 'Replace the active Pro direction?',
    replaceBody:
      'Souqna will snapshot the current Pro source before replacing the draft. The live storefront and Easy workspace remain unchanged.',
    cancel: 'Keep current direction',
    confirmReplace: 'Snapshot and replace',
    manageTitle: 'Choose a new Pro direction',
    manageBody:
      'Compare a new foundation against the active one. Replacement preserves the current Pro source in history and never changes live until you publish.',
  },
  ar: {
    product: 'سوقنا برو',
    exit: 'الخروج إلى لوحة التحكم',
    emptyTitle: 'أنشئ متجرًا قبل الدخول إلى برو',
    emptyBody: 'يبني برو اتجاهًا احترافيًا منفصلًا لمتجر سوقنا موجود.',
    emptyAction: 'ابدأ متجرًا',
    lockedTitle: 'استوديو برو للعرض فقط',
    lockedBody:
      'يبقى متجر برو المنشور مباشرًا. رقّ خطتك للإنشاء والاستبدال والتوليد والبناء والنشر.',
    upgrade: 'عرض الخطط',
    progress: ['مسح العلامة', 'المقابلة', 'الاتجاه', 'الحماية', 'التحويل'],
    scanKicker: 'متجرك بوضوح',
    scanTitle: 'قبل أن يغيّر برو اللوحة، يقرأ سوقي ما هو موجود.',
    scanBody:
      'هذه هويتك الحالية في الوضع السهل وحالة النشر. المعاينة خاصة بك وتستخدم مسودة المتجر الحقيقية.',
    start: 'شكّل اتجاه برو',
    currentEasy: 'متجر Easy الحالي',
    published: 'منشور',
    unpublished: 'غير منشور',
    businessType: 'النشاط',
    palette: 'الألوان',
    design: 'تصميم Easy',
    tagline: 'الشعار النصي',
    missing: 'لم تتم إضافته',
    interviewKicker: 'مقابلة العلامة',
    interviewTitle: 'ثلاثة قرارات. اتجاه أوضح.',
    interviewBody: 'يستخدم سوقي هذه الإجابات لاقتراح أساس فوري من دون استهلاك رصيد ذكاء اصطناعي.',
    optional: 'ملاحظة اختيارية',
    notePlaceholder: 'ما الذي يجب أن يحميه سوقي أو يتجنبه أو يجعله خاصًا بك؟',
    back: 'رجوع',
    continue: 'متابعة',
    seeDirection: 'اعرض اتجاهي',
    questions: [
      {
        title: 'كيف يجب أن يبدو النظام البصري؟',
        field: 'visualAmbition',
        options: [
          ['timeless', 'خالد', 'حضور هادئ وإيقاع تحريري ووضوح دائم'],
          ['expressive', 'تعبيري', 'تركيب حيوي وإطلاقات أقوى وطاقة ظاهرة'],
          ['one_of_one', 'فريد', 'عالم علامة مبني حول هويتك الخاصة'],
        ],
      },
      {
        title: 'ما أول شعور تريده للعميل؟',
        field: 'customerFeeling',
        options: [
          ['trust', 'الثقة', 'تسلسل واضح وقرارات واثقة'],
          ['energy', 'الطاقة', 'زخم ورغبة وإحساس بالحركة'],
          ['discovery', 'الاكتشاف', 'فضول وعمق وتجربة تستحق الاستكشاف'],
        ],
      },
      {
        title: 'ما الأهم في هذا الإطلاق؟',
        field: 'launchPriority',
        options: [
          ['conversion', 'التحويل', 'نقل العميل من الاهتمام إلى الفعل'],
          ['launch', 'قوة الإطلاق', 'إبراز الإصدارات والحملات الجديدة'],
          ['brand_world', 'عالم العلامة', 'صناعة مكان مميز يتذكره العميل'],
        ],
      },
    ],
    recommendationKicker: 'اقتراح سوقي',
    recommendationTitle: 'اتجاه صُمّم حول إجاباتك.',
    recommendationBody: 'الاقتراح فوري وحتمي. القرار لك، وتغيير الاتجاه لا ينشر أي شيء.',
    recommended: 'المقترح لهذا المتجر',
    current: 'الأساس الحالي',
    alternatives: 'اتجاهات أخرى',
    choose: 'اختر الاتجاه',
    compareEasy: 'Easy الحالي',
    comparePro: 'اتجاه Pro',
    previewLoading: 'جارٍ تجهيز معاينة المالك',
    previewFailed: 'تعذّر تحميل المعاينة',
    retryPreview: 'أعد تحميل المعاينة',
    openPreview: 'افتح المعاينة الكاملة',
    protect: 'تابع إلى مراجعة الحماية',
    replace: 'استبدل بهذا الاتجاه',
    activeProtected: 'الاتجاه النشط',
    foundations: {
      structure: { name: 'البنية', body: 'دقة تحريرية ومسار منضبط نحو الشراء.' },
      motion: { name: 'الحركة', body: 'متجر تقوده الحملات بطاقة متجاوبة.' },
      bespoke: { name: 'مُخصّص', body: 'تركيب فريد يولّده سوقي من هويتك.' },
    },
    convertingKicker: 'تحويل خاص',
    convertingTitle: 'سوقنا ينشئ مساحة برو الخاصة بك.',
    convertingBody:
      'كل حالة أدناه تأتي من مساحة العمل ومهمة البناء الفعلية. متجرك المباشر لم يتغير.',
    phases: {
      saving: 'حفظ نقطة استعادة Easy',
      queued: 'إنشاء مساحة برو',
      generating: 'توليد الاتجاه المخصّص',
      validating: 'التحقق من TSX وCSS المقيّد',
      building: 'بناء المعاينة الخاصة',
      repairing: 'إصلاح البناء بأمان',
      succeeded: 'المعاينة الخاصة جاهزة',
      failed: 'البناء يحتاج مراجعة',
    },
    readyKicker: 'مساحة برو جاهزة',
    readyTitle: 'اتجاهك الجديد جاهز للمنشئ.',
    readyBody: 'حُفظت نقطة استعادة Easy. معاينة برو خاصة ولم يتغير الموقع المباشر.',
    readyReplacementBody:
      'حُفظ كود برو السابق في السجل. معاينة الاستبدال خاصة ولم يتغير الموقع المباشر.',
    backup: 'اعرض نسخة Easy في التخزين',
    openBuilder: 'افتح منشئ برو',
    failedKicker: 'توقف التحويل بأمان',
    failedTitle: 'لم يتغير أي شيء مباشر.',
    failedBody: 'إجاباتك واتجاهك المختار ما زالا هنا. عالج المشكلة ثم أعد المحاولة من هذه النقطة.',
    retry: 'أعد المحاولة',
    returnDashboard: 'العودة إلى لوحة التحكم',
    replaceTitle: 'استبدال اتجاه برو النشط؟',
    replaceBody:
      'ستحفظ سوقنا لقطة من كود برو الحالي قبل استبدال المسودة. يبقى المتجر المباشر ومساحة Easy دون تغيير.',
    cancel: 'احتفظ بالاتجاه الحالي',
    confirmReplace: 'احفظ لقطة واستبدل',
    manageTitle: 'اختر اتجاه برو جديدًا',
    manageBody:
      'قارن أساسًا جديدًا بالأساس النشط. يحفظ الاستبدال كود برو الحالي في السجل ولا يغيّر الموقع المباشر حتى تنشر.',
  },
} as const;

type Props = {
  locale: Locale;
  storefronts: ProStorefrontSummary[];
  initialSlug: string;
  eligible: boolean;
  onboardingComplete: boolean;
  initialWorkspaces: Record<string, ProWorkspaceSnapshot>;
  initialJobs: Record<string, ProJobSnapshot | null>;
  manageFoundations: boolean;
};

export function ProExperience(props: Props) {
  const {
    locale,
    storefronts,
    initialSlug,
    eligible,
    initialWorkspaces,
    initialJobs,
    manageFoundations,
  } = props;
  const t = COPY[locale];
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const active = (storefronts.find((store) => store.slug === initialSlug) ?? storefronts[0])!;
  const initialWorkspace = active ? (initialWorkspaces[active.slug] ?? null) : null;
  const [state, dispatch] = React.useReducer(
    reducer,
    initialJourney(manageFoundations, initialWorkspace),
  );
  const [workspaces, setWorkspaces] = React.useState(initialWorkspaces);
  const [jobs, setJobs] = React.useState(initialJobs);
  const [replaceOpen, setReplaceOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [hydrationReady, setHydrationReady] = React.useState(manageFoundations);
  const runningJobs = React.useRef(new Set<string>());
  const blockedJobRuns = React.useRef(new Set<string>());
  const headingRef = React.useRef<HTMLElement | null>(null);
  const hydratedSlug = React.useRef<string | null>(null);
  const workspace = active ? (workspaces[active.slug] ?? null) : null;
  const job = active ? (jobs[active.slug] ?? null) : null;

  React.useEffect(() => {
    if (active && hydratedSlug.current === active.slug) return;
    hydratedSlug.current = active?.slug ?? null;
    if (!active || manageFoundations) {
      setHydrationReady(true);
      return;
    }
    let next = initialJourney(false, workspace);
    try {
      const saved = window.sessionStorage.getItem(`souqna:pro-journey:${active.slug}`);
      if (saved) next = readSavedJourney(saved, next, workspace, job);
    } catch {}
    dispatch({ type: 'hydrate', state: next });
    setHydrationReady(true);
  }, [active, job, manageFoundations, workspace]);

  React.useEffect(() => {
    if (!active || !hydrationReady || manageFoundations) return;
    const checkpoint =
      state.stage === 'converting' && !job
        ? {
            ...state,
            stage:
              state.expectedEasyVersion != null ? ('review' as const) : ('recommendation' as const),
            failureKind: null,
            message: null,
          }
        : state;
    try {
      window.sessionStorage.setItem(
        `souqna:pro-journey:${active.slug}`,
        JSON.stringify(checkpoint),
      );
    } catch {}
  }, [active, hydrationReady, job, manageFoundations, state]);

  React.useEffect(() => {
    window.requestAnimationFrame(() => {
      const heading = document.getElementById('pro-stage-heading');
      headingRef.current = heading;
      heading?.focus();
    });
  }, [state.stage, state.interviewStep]);

  const driveJob = React.useCallback(
    async (initial: ProJobSnapshot) => {
      if (
        runningJobs.current.has(initial.id) ||
        blockedJobRuns.current.has(initial.id) ||
        TERMINAL.has(initial.status)
      )
        return;
      runningJobs.current.add(initial.id);
      let current = initial;
      try {
        for (let step = 0; step < 20 && !TERMINAL.has(current.status); step += 1) {
          const response = await fetch(`/api/pro/jobs/${encodeURIComponent(current.id)}`, {
            method: 'POST',
            headers: { Accept: 'application/json' },
          });
          const body = (await response.json().catch(() => null)) as {
            ok: boolean;
            job?: ProJobSnapshot | null;
            busy?: boolean;
            error?: string;
          } | null;
          if (!body) {
            blockedJobRuns.current.add(current.id);
            dispatch({ type: 'fail', kind: 'job', message: t.failedBody });
            break;
          }
          if (body.job) {
            current = body.job;
            setJobs((value) => ({ ...value, [current.storefrontSlug]: current }));
          }
          if (TERMINAL.has(current.status)) break;
          if (!response.ok || !body.ok) {
            blockedJobRuns.current.add(current.id);
            dispatch({ type: 'fail', kind: 'job', message: t.failedBody });
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, body.busy ? 900 : 180));
        }
        router.refresh();
      } catch {
        blockedJobRuns.current.add(current.id);
        dispatch({ type: 'fail', kind: 'job', message: t.failedBody });
      } finally {
        runningJobs.current.delete(initial.id);
      }
    },
    [router, t.failedBody],
  );

  React.useEffect(() => {
    if (!job) return;
    if (!TERMINAL.has(job.status)) void driveJob(job);
    if (job.status === 'succeeded' && state.stage === 'converting')
      dispatch({ type: 'stage', stage: 'ready' });
    if (job.status === 'failed' && state.stage === 'converting')
      dispatch({ type: 'fail', kind: 'job', message: job.errorMessage ?? t.failedBody });
  }, [driveJob, job, state.stage, t.failedBody]);

  if (!active) return <EmptyStudio locale={locale} />;

  const intent = { ...DEFAULT_INTENT, ...state.intent } as ProBrandIntent;
  const recommendation =
    state.recommendation ??
    recommendProFoundation(intent, {
      locale,
      businessType: active.businessType,
      design: active.design,
      hasLogo: Boolean(active.logoUrl),
      hasTagline: Boolean(active.tagline),
      isPublished: active.isPublished,
    });
  const selected = state.selectedFoundation ?? recommendation.foundation;
  const progressIndex = stageProgress(state.stage);

  function changeStore(slug: string) {
    router.push(
      `/account/pro?store=${encodeURIComponent(slug)}${manageFoundations ? '&manage=foundations' : ''}`,
    );
  }

  function finishInterview() {
    const next = recommendProFoundation(intent, {
      locale,
      businessType: active.businessType,
      design: active.design,
      hasLogo: Boolean(active.logoUrl),
      hasTagline: Boolean(active.tagline),
      isPublished: active.isPublished,
    });
    dispatch({ type: 'recommend', recommendation: next });
    if (!props.onboardingComplete)
      void completeProOnboardingAction({ slug: active.slug, version: PRO_ONBOARDING_VERSION });
  }

  async function prepareReview() {
    if (submitting) return;
    if (workspace) {
      setReplaceOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const manifest = await getEasyManifestVersionAction({ slug: active.slug });
      if (!manifest.ok) {
        dispatch({ type: 'fail', kind: 'recovery', message: manifest.message || t.failedBody });
        return;
      }
      dispatch({ type: 'manifest', version: manifest.data.version });
    } catch {
      dispatch({ type: 'fail', kind: 'recovery', message: t.failedBody });
    } finally {
      setSubmitting(false);
    }
  }

  async function convert() {
    if (submitting || state.expectedEasyVersion == null || !state.acknowledged) return;
    setSubmitting(true);
    dispatch({ type: 'stage', stage: 'converting' });
    try {
      const result = await confirmProConversionAction({
        slug: active.slug,
        foundation: selected,
        consentVersion: PRO_CONVERSION_CONSENT_VERSION,
        expectedEasyVersion: state.expectedEasyVersion,
        brandIntent: intent,
        recommendationVersion: PRO_RECOMMENDATION_VERSION,
      });
      if (!result.ok) {
        dispatch({
          type: 'fail',
          kind: result.error === 'snapshot_stale' ? 'recovery' : 'conversion',
          message: result.message,
        });
        return;
      }
      setWorkspaces((value) => ({ ...value, [active.slug]: result.data.workspace }));
      setJobs((value) => ({ ...value, [active.slug]: result.data.job }));
      blockedJobRuns.current.delete(result.data.job.id);
      void driveJob(result.data.job);
    } catch {
      dispatch({ type: 'fail', kind: 'conversion', message: t.failedBody });
    } finally {
      setSubmitting(false);
    }
  }

  async function replaceFoundation() {
    if (submitting || !workspace || workspace.foundation === selected) return;
    setReplaceOpen(false);
    setSubmitting(true);
    setJobs((value) => ({ ...value, [active.slug]: null }));
    dispatch({ type: 'stage', stage: 'converting' });
    try {
      const result = await initializeProWorkspaceAction({
        slug: active.slug,
        foundation: selected,
        confirmReplace: true,
        expectedVersion: workspace.draftVersion,
      });
      if (!result.ok) {
        dispatch({ type: 'fail', kind: 'conversion', message: result.message });
        if (result.workspace)
          setWorkspaces((value) => ({ ...value, [active.slug]: result.workspace! }));
        return;
      }
      setWorkspaces((value) => ({ ...value, [active.slug]: result.data.workspace }));
      setJobs((value) => ({ ...value, [active.slug]: result.data.job }));
      blockedJobRuns.current.delete(result.data.job.id);
      void driveJob(result.data.job);
    } catch {
      dispatch({ type: 'fail', kind: 'conversion', message: t.failedBody });
    } finally {
      setSubmitting(false);
    }
  }

  async function retry() {
    if (state.failureKind === 'job' && job) {
      if (!TERMINAL.has(job.status)) {
        blockedJobRuns.current.delete(job.id);
        dispatch({ type: 'stage', stage: 'converting' });
        void driveJob(job);
        return;
      }
      try {
        const result = await retryProJobAction({ slug: active.slug, jobId: job.id });
        if (!result.ok) {
          dispatch({ type: 'fail', kind: 'job', message: result.message });
          return;
        }
        setJobs((value) => ({ ...value, [active.slug]: result.data.job }));
        blockedJobRuns.current.delete(result.data.job.id);
        dispatch({ type: 'stage', stage: 'converting' });
        void driveJob(result.data.job);
      } catch {
        dispatch({ type: 'fail', kind: 'job', message: t.failedBody });
      }
      return;
    }
    if (state.failureKind === 'recovery') {
      await prepareReview();
      return;
    }
    dispatch({ type: 'stage', stage: workspace ? 'recommendation' : 'review' });
  }

  return (
    <main className="pro-studio" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <StudioHeader
        active={active}
        storefronts={storefronts}
        progress={progressIndex}
        labels={t.progress}
        locale={locale}
        onStoreChange={changeStore}
      />
      {!eligible ? <LockedBanner locale={locale} /> : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${state.stage}:${state.interviewStep}`}
          className="pro-stage"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: reducedMotion ? 0 : 0.24 }}
        >
          {state.stage === 'scan' ? (
            <BrandScan
              active={active}
              locale={locale}
              onContinue={() => dispatch({ type: 'stage', stage: 'interview' })}
            />
          ) : null}
          {state.stage === 'interview' ? (
            <Interview
              locale={locale}
              state={state}
              dispatch={dispatch}
              onFinish={finishInterview}
            />
          ) : null}
          {state.stage === 'recommendation' ? (
            <Recommendation
              locale={locale}
              active={active}
              workspace={workspace}
              recommendation={recommendation}
              selected={selected}
              previewMode={state.previewMode}
              eligible={eligible}
              submitting={submitting}
              manage={manageFoundations}
              dispatch={dispatch}
              onContinue={() => void prepareReview()}
            />
          ) : null}
          {state.stage === 'review' ? (
            <ProConversionConsent
              locale={locale}
              foundation={selected}
              acknowledged={state.acknowledged}
              busy={submitting}
              onAcknowledgedChange={(value) => dispatch({ type: 'acknowledge', value })}
              onBack={() => dispatch({ type: 'stage', stage: 'recommendation' })}
              onConfirm={() => void convert()}
            />
          ) : null}
          {state.stage === 'converting' ? (
            <Transformation
              locale={locale}
              job={job}
              saving={submitting && !job}
              selected={selected}
            />
          ) : null}
          {state.stage === 'ready' ? (
            <Ready locale={locale} slug={active.slug} replacement={manageFoundations} />
          ) : null}
          {state.stage === 'failed' ? (
            <Failure locale={locale} message={state.message} onRetry={() => void retry()} />
          ) : null}
        </motion.div>
      </AnimatePresence>
      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent className="pro-replace-dialog" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <DialogTitle>{t.replaceTitle}</DialogTitle>
          <DialogDescription>{t.replaceBody}</DialogDescription>
          <div className="pro-dialog-actions">
            <button type="button" onClick={() => setReplaceOpen(false)}>
              {t.cancel}
            </button>
            <button type="button" className="primary" onClick={() => void replaceFoundation()}>
              {t.confirmReplace}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <style>{STYLES}</style>
    </main>
  );
}

function stageProgress(stage: JourneyStage) {
  return stage === 'scan'
    ? 0
    : stage === 'interview'
      ? 1
      : stage === 'recommendation'
        ? 2
        : stage === 'review'
          ? 3
          : 4;
}

function StudioHeader({
  active,
  storefronts,
  progress,
  labels,
  locale,
  onStoreChange,
}: {
  active: ProStorefrontSummary;
  storefronts: ProStorefrontSummary[];
  progress: number;
  labels: readonly string[];
  locale: Locale;
  onStoreChange: (slug: string) => void;
}) {
  const t = COPY[locale];
  function toggleLocale() {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }
  return (
    <header className="pro-studio-header">
      <Link href="/account/pro" className="pro-wordmark" dir="ltr">
        <span>✦</span> Souqna Pro
      </Link>
      <div className="pro-store-select">
        <StoreMark store={active} />
        <select
          value={active.slug}
          aria-label={locale === 'ar' ? 'المتجر النشط' : 'Active storefront'}
          onChange={(event) => onStoreChange(event.target.value)}
        >
          {storefronts.map((store) => (
            <option value={store.slug} key={store.slug}>
              {store.businessName}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden />
      </div>
      <ol
        className="pro-journey-progress"
        aria-label={locale === 'ar' ? 'تقدم التحويل' : 'Conversion progress'}
      >
        {labels.map((label, index) => (
          <li
            key={label}
            data-state={index < progress ? 'complete' : index === progress ? 'active' : 'upcoming'}
          >
            <span>{index < progress ? <Check /> : index + 1}</span>
            <b>{label}</b>
          </li>
        ))}
      </ol>
      <div className="pro-header-actions">
        <button
          type="button"
          onClick={toggleLocale}
          aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          {locale === 'ar' ? 'EN' : 'ع'}
        </button>
        <Link href="/account">
          {t.exit}
          <ExternalLink aria-hidden />
        </Link>
      </div>
    </header>
  );
}

function BrandScan({
  active,
  locale,
  onContinue,
}: {
  active: ProStorefrontSummary;
  locale: Locale;
  onContinue: () => void;
}) {
  const t = COPY[locale];
  return (
    <section className="pro-split">
      <div className="pro-stage-copy">
        <span className="pro-kicker">
          <Sparkles />
          {t.scanKicker}
        </span>
        <h1 id="pro-stage-heading" tabIndex={-1}>
          {t.scanTitle}
        </h1>
        <p>{t.scanBody}</p>
        <div className="pro-brand-profile">
          <StoreMark store={active} large />
          <div>
            <strong dir="auto">{active.businessName}</strong>
            <span dir="ltr">/{active.slug}</span>
          </div>
          <em data-live={active.isPublished ? '' : undefined}>
            {active.isPublished ? t.published : t.unpublished}
          </em>
        </div>
        <dl className="pro-brand-facts">
          <div>
            <dt>{t.businessType}</dt>
            <dd>{humanize(active.businessType)}</dd>
          </div>
          <div>
            <dt>{t.tagline}</dt>
            <dd dir="auto">{active.tagline || t.missing}</dd>
          </div>
          <div>
            <dt>{t.palette}</dt>
            <dd>{humanize(active.palette)}</dd>
          </div>
          <div>
            <dt>{t.design}</dt>
            <dd>{humanize(active.design)}</dd>
          </div>
        </dl>
        <button type="button" className="pro-button-primary" onClick={onContinue}>
          {t.start}
          <Arrow locale={locale} />
        </button>
      </div>
      <PreviewFrame
        src={`/account/${encodeURIComponent(active.slug)}/preview`}
        title={t.currentEasy}
        locale={locale}
        label={t.currentEasy}
      />
    </section>
  );
}

function Interview({
  locale,
  state,
  dispatch,
  onFinish,
}: {
  locale: Locale;
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  onFinish: () => void;
}) {
  const t = COPY[locale];
  const step = state.interviewStep;
  const question = step < 3 ? t.questions[step as 0 | 1 | 2] : null;
  const selected = question ? state.intent[question.field as keyof ProBrandIntent] : null;
  const canContinue = step === 3 || Boolean(selected);
  return (
    <section className="pro-interview">
      <div className="pro-stage-copy">
        <span className="pro-kicker">
          {t.interviewKicker} <b>{Math.min(step + 1, 3)} / 3</b>
        </span>
        <h1 id="pro-stage-heading" tabIndex={-1}>
          {step === 0 ? t.interviewTitle : (question?.title ?? t.optional)}
        </h1>
        <p>{step === 0 ? t.interviewBody : step === 3 ? t.notePlaceholder : ''}</p>
      </div>
      <div className="pro-interview-panel">
        {question ? (
          <fieldset>
            <legend className="sr-only">{question.title}</legend>
            {question.options.map(([value, label, body]) => (
              <label key={value} data-selected={selected === value ? '' : undefined}>
                <input
                  type="radio"
                  name={question.field}
                  value={value}
                  checked={selected === value}
                  onChange={() =>
                    dispatch({
                      type: 'answer',
                      field: question.field as keyof ProBrandIntent,
                      value,
                    })
                  }
                />
                <span>
                  <b>{label}</b>
                  <small>{body}</small>
                </span>
                <Check aria-hidden />
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="pro-note">
            <label htmlFor="pro-note">{t.optional}</label>
            <textarea
              id="pro-note"
              maxLength={500}
              dir="auto"
              value={state.intent.note ?? ''}
              placeholder={t.notePlaceholder}
              onChange={(event) =>
                dispatch({ type: 'answer', field: 'note', value: event.target.value || null })
              }
            />
            <span>{(state.intent.note ?? '').length} / 500</span>
          </div>
        )}
        <div className="pro-stage-actions">
          <button
            type="button"
            className="pro-button-secondary"
            onClick={() =>
              step === 0
                ? dispatch({ type: 'stage', stage: 'scan' })
                : dispatch({
                    type: 'hydrate',
                    state: { ...state, interviewStep: (step - 1) as 0 | 1 | 2 | 3 },
                  })
            }
          >
            {t.back}
          </button>
          <button
            type="button"
            className="pro-button-primary"
            disabled={!canContinue}
            onClick={() =>
              step === 3
                ? onFinish()
                : dispatch({
                    type: 'hydrate',
                    state: { ...state, interviewStep: (step + 1) as 0 | 1 | 2 | 3 },
                  })
            }
          >
            {step === 3 ? t.seeDirection : t.continue}
            <Arrow locale={locale} />
          </button>
        </div>
      </div>
    </section>
  );
}

function Recommendation({
  locale,
  active,
  workspace,
  recommendation,
  selected,
  previewMode,
  eligible,
  submitting,
  manage,
  dispatch,
  onContinue,
}: {
  locale: Locale;
  active: ProStorefrontSummary;
  workspace: ProWorkspaceSnapshot | null;
  recommendation: ProFoundationRecommendation;
  selected: ProFoundationId;
  previewMode: PreviewMode;
  eligible: boolean;
  submitting: boolean;
  manage: boolean;
  dispatch: React.Dispatch<JourneyAction>;
  onContinue: () => void;
}) {
  const t = COPY[locale];
  const alternatives = PRO_TEMPLATE_IDS.filter((foundation) => foundation !== selected);
  const previewSrc =
    previewMode === 'easy'
      ? `/account/${encodeURIComponent(active.slug)}/preview`
      : `/account/${encodeURIComponent(active.slug)}/pro-foundations/${selected}/preview`;
  const activeSelected = workspace?.foundation === selected;
  return (
    <section className="pro-recommendation">
      <header className="pro-recommendation-header">
        <div className="pro-stage-copy">
          <span className="pro-kicker">{t.recommendationKicker}</span>
          <h1 id="pro-stage-heading" tabIndex={-1}>
            {manage ? t.manageTitle : t.recommendationTitle}
          </h1>
          <p>{manage ? t.manageBody : t.recommendationBody}</p>
        </div>
        <div
          className="pro-compare-toggle"
          role="group"
          aria-label={locale === 'ar' ? 'قارن الاتجاهات' : 'Compare directions'}
        >
          <button
            type="button"
            aria-pressed={previewMode === 'easy'}
            data-active={previewMode === 'easy' ? '' : undefined}
            onClick={() => dispatch({ type: 'preview', mode: 'easy' })}
          >
            {t.compareEasy}
          </button>
          <button
            type="button"
            aria-pressed={previewMode === 'pro'}
            data-active={previewMode === 'pro' ? '' : undefined}
            onClick={() => dispatch({ type: 'preview', mode: 'pro' })}
          >
            {t.comparePro}
          </button>
        </div>
      </header>
      <div className="pro-recommendation-grid">
        <PreviewFrame
          key={previewSrc}
          src={previewSrc}
          title={`${t.foundations[selected].name} preview`}
          locale={locale}
          label={previewMode === 'easy' ? t.compareEasy : t.foundations[selected].name}
        />
        <aside className="pro-rationale">
          <span>{selected === recommendation.foundation ? t.recommended : t.choose}</span>
          <h2>{t.foundations[selected].name}</h2>
          <p>{t.foundations[selected].body}</p>
          {selected === recommendation.foundation && recommendation.reasons.length ? (
            <ul>
              {recommendation.reasons.map((reason) => (
                <li key={reason}>
                  <Check />
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="pro-alternatives">
            <small>{t.alternatives}</small>
            {alternatives.map((foundation) => (
              <button
                type="button"
                key={foundation}
                onClick={() => dispatch({ type: 'select', foundation })}
              >
                <span>
                  <b>{t.foundations[foundation].name}</b>
                  <small>{t.foundations[foundation].body}</small>
                </span>
                <Arrow locale={locale} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="pro-button-primary"
            disabled={!eligible || submitting || activeSelected}
            onClick={onContinue}
          >
            {submitting ? <MobiusLoopIcon active /> : activeSelected ? <ShieldCheck /> : null}
            {activeSelected ? t.activeProtected : workspace ? t.replace : t.protect}
          </button>
        </aside>
      </div>
    </section>
  );
}

function Transformation({
  locale,
  job,
  saving,
  selected,
}: {
  locale: Locale;
  job: ProJobSnapshot | null;
  saving: boolean;
  selected: ProFoundationId;
}) {
  const t = COPY[locale];
  type TransformationPhase = keyof typeof COPY.en.phases;
  const phases: readonly TransformationPhase[] =
    selected === 'bespoke'
      ? ['saving', 'queued', 'generating', 'validating', 'building', 'repairing', 'succeeded']
      : ['saving', 'queued', 'validating', 'building', 'repairing', 'succeeded'];
  const current = saving || !job ? 'saving' : job.status;
  const index = phases.indexOf(current as (typeof phases)[number]);
  return (
    <section className="pro-transformation">
      <div className="pro-stage-copy">
        <span className="pro-kicker">{t.convertingKicker}</span>
        <h1 id="pro-stage-heading" tabIndex={-1}>
          {t.convertingTitle}
        </h1>
        <p>{t.convertingBody}</p>
      </div>
      <div className="pro-transformation-panel">
        <MobiusLoopIcon active />
        <ol>
          {phases.map((phase, phaseIndex) => (
            <li
              key={phase}
              data-state={
                phaseIndex < index ? 'complete' : phase === current ? 'active' : 'waiting'
              }
            >
              <span>
                {phaseIndex < index ? (
                  <Check />
                ) : phase === current ? (
                  <MobiusLoopIcon active />
                ) : (
                  phaseIndex + 1
                )}
              </span>
              <b>{t.phases[phase]}</b>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Ready({
  locale,
  slug,
  replacement,
}: {
  locale: Locale;
  slug: string;
  replacement: boolean;
}) {
  const t = COPY[locale];
  return (
    <section className="pro-ready">
      <div className="pro-ready-mark">
        <Check />
      </div>
      <span className="pro-kicker">{t.readyKicker}</span>
      <h1 id="pro-stage-heading" tabIndex={-1}>
        {t.readyTitle}
      </h1>
      <p>{replacement ? t.readyReplacementBody : t.readyBody}</p>
      <div className="pro-stage-actions">
        {!replacement ? (
          <Link
            className="pro-button-secondary"
            href={`/account/storage?section=backups&store=${encodeURIComponent(slug)}`}
          >
            {t.backup}
          </Link>
        ) : null}
        <Link
          className="pro-button-primary"
          href={`/account/builder?store=${encodeURIComponent(slug)}`}
        >
          {t.openBuilder}
          <Arrow locale={locale} />
        </Link>
      </div>
    </section>
  );
}
function Failure({
  locale,
  message,
  onRetry,
}: {
  locale: Locale;
  message: string | null;
  onRetry: () => void;
}) {
  const t = COPY[locale];
  return (
    <section className="pro-failure">
      <CircleAlert />
      <span className="pro-kicker">{t.failedKicker}</span>
      <h1 id="pro-stage-heading" tabIndex={-1}>
        {t.failedTitle}
      </h1>
      <p>{t.failedBody}</p>
      {message ? <pre>{message}</pre> : null}
      <div className="pro-stage-actions">
        <Link className="pro-button-secondary" href="/account">
          {t.returnDashboard}
        </Link>
        <button type="button" className="pro-button-primary" onClick={onRetry}>
          <RotateCcw />
          {t.retry}
        </button>
      </div>
    </section>
  );
}
function LockedBanner({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  return (
    <aside className="pro-locked">
      <LockKeyhole />
      <div>
        <strong>{t.lockedTitle}</strong>
        <p>{t.lockedBody}</p>
      </div>
      <Link href="/account/settings/plan">{t.upgrade}</Link>
    </aside>
  );
}
function EmptyStudio({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  return (
    <main className="pro-studio pro-empty">
      <Store />
      <h1>{t.emptyTitle}</h1>
      <p>{t.emptyBody}</p>
      <Link className="pro-button-primary" href="/begin">
        {t.emptyAction}
      </Link>
      <style>{STYLES}</style>
    </main>
  );
}

function PreviewFrame({
  src,
  title,
  label,
  locale,
}: {
  src: string;
  title: string;
  label: string;
  locale: Locale;
}) {
  const t = COPY[locale];
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [key, setKey] = React.useState(0);
  return (
    <div className="pro-preview-shell">
      <div className="pro-preview-toolbar">
        <div>
          <i />
          <i />
          <i />
        </div>
        <strong dir="auto">{label}</strong>
        <Link href={src} target="_blank">
          {t.openPreview}
          <ExternalLink />
        </Link>
      </div>
      <div className="pro-preview-canvas">
        {!loaded && !failed ? (
          <div className="pro-preview-skeleton">
            <MobiusLoopIcon active />
            <span>{t.previewLoading}</span>
          </div>
        ) : null}
        {failed ? (
          <div className="pro-preview-failed">
            <CircleAlert />
            <b>{t.previewFailed}</b>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setLoaded(false);
                setKey((value) => value + 1);
              }}
            >
              {t.retryPreview}
            </button>
          </div>
        ) : null}
        <iframe
          key={key}
          src={src}
          title={title}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          data-loaded={loaded ? '' : undefined}
        />
      </div>
    </div>
  );
}
function StoreMark({ store, large = false }: { store: ProStorefrontSummary; large?: boolean }) {
  return store.logoUrl ? (
    <span className="pro-store-mark" data-large={large ? '' : undefined}>
      <Image
        src={store.logoUrl}
        alt=""
        width={large ? 64 : 32}
        height={large ? 64 : 32}
        unoptimized
      />
    </span>
  ) : (
    <span className="pro-store-mark" data-large={large ? '' : undefined} aria-hidden>
      {store.businessName.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}
function Arrow({ locale }: { locale: Locale }) {
  return locale === 'ar' ? <ArrowLeft aria-hidden /> : <ArrowRight aria-hidden />;
}
function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

const STYLES = `
  :root{color-scheme:dark}.pro-studio{--pro-ink:#0a0908;--pro-panel:#12100e;--pro-raised:#1a1713;--pro-cream:#e8dcc4;--pro-muted:#9f9585;--pro-gold:#c6a15b;--pro-rule:rgba(232,220,196,.14);min-height:100dvh;background:radial-gradient(circle at 12% 8%,rgba(198,161,91,.11),transparent 28%),var(--pro-ink);color:var(--pro-cream);font-family:var(--font-sans);overflow-x:hidden}.pro-studio *{box-sizing:border-box}.pro-studio button,.pro-studio a,.pro-studio select,.pro-studio textarea{font:inherit}.pro-studio button:focus-visible,.pro-studio a:focus-visible,.pro-studio select:focus-visible,.pro-studio textarea:focus-visible,.pro-studio h1:focus-visible{outline:2px solid var(--pro-gold);outline-offset:4px}.pro-studio-header{position:sticky;inset-block-start:0;z-index:20;min-height:64px;display:grid;grid-template-columns:auto minmax(190px,260px) minmax(420px,1fr) auto;align-items:center;gap:22px;padding:10px 28px;border-block-end:1px solid var(--pro-rule);background:rgba(10,9,8,.88);backdrop-filter:blur(20px)}.pro-wordmark{display:flex;align-items:center;gap:9px;color:var(--pro-cream);font-weight:800;text-decoration:none;white-space:nowrap}.pro-wordmark span{color:var(--pro-gold)}.pro-store-select{position:relative;display:grid;grid-template-columns:32px minmax(0,1fr) 14px;align-items:center;gap:8px;padding:5px 9px;border:1px solid var(--pro-rule);border-radius:8px;background:var(--pro-panel)}.pro-store-select select{width:100%;appearance:none;border:0;outline:0;background:transparent;color:var(--pro-cream);font-size:12px;font-weight:700}.pro-store-select>svg{width:14px;color:var(--pro-muted)}.pro-store-mark{width:32px;height:32px;display:grid;place-items:center;overflow:hidden;border:1px solid var(--pro-rule);border-radius:7px;background:var(--pro-raised);color:var(--pro-gold);font:800 10px/1 var(--font-mono)}.pro-store-mark[data-large]{width:64px;height:64px;border-radius:12px;font-size:15px}.pro-store-mark img{width:100%;height:100%;object-fit:cover}.pro-journey-progress{display:flex;justify-content:center;gap:clamp(8px,1.5vw,22px);margin:0;padding:0;list-style:none}.pro-journey-progress li{display:flex;align-items:center;gap:7px;color:#615a50}.pro-journey-progress li>span{width:22px;height:22px;display:grid;place-items:center;border:1px solid currentColor;border-radius:50%;font:700 9px/1 var(--font-mono)}.pro-journey-progress li svg{width:11px}.pro-journey-progress li b{font:650 10px/1 var(--font-mono);letter-spacing:.04em}.pro-journey-progress li[data-state=active]{color:var(--pro-gold)}.pro-journey-progress li[data-state=complete]{color:var(--pro-muted)}.pro-header-actions{display:flex;align-items:center;gap:9px}.pro-header-actions a{display:flex;align-items:center;gap:6px;color:var(--pro-muted);text-decoration:none;font-size:11px;font-weight:700}.pro-header-actions a:first-child{width:30px;height:30px;justify-content:center;border:1px solid var(--pro-rule);border-radius:50%;color:var(--pro-cream)}.pro-header-actions svg{width:13px}.pro-stage{width:min(1500px,100%);min-height:calc(100dvh - 65px);margin:0 auto;padding:clamp(34px,5vw,78px) clamp(20px,4vw,66px)}.pro-split,.pro-interview,.pro-protection,.pro-transformation{display:grid;grid-template-columns:minmax(320px,.78fr) minmax(520px,1.22fr);gap:clamp(38px,6vw,100px);align-items:center;min-height:calc(100dvh - 220px)}.pro-stage-copy{max-width:640px}.pro-kicker{display:inline-flex;align-items:center;gap:7px;color:var(--pro-gold);font:750 10px/1.3 var(--font-mono);letter-spacing:.16em;text-transform:uppercase}.pro-kicker svg{width:14px}.pro-kicker b{color:var(--pro-muted)}.pro-stage-copy h1,.pro-recommendation-header h1,.pro-ready h1,.pro-failure h1{margin:20px 0 0;max-width:18ch;color:var(--pro-cream);font-size:clamp(34px,4.5vw,70px);font-weight:680;line-height:.98;letter-spacing:-.045em;text-wrap:balance}.pro-stage-copy>p,.pro-recommendation-header p,.pro-ready>p,.pro-failure>p{max-width:58ch;margin:22px 0 0;color:var(--pro-muted);font-size:14px;line-height:1.75}.pro-brand-profile{display:flex;align-items:center;gap:14px;margin-top:34px;padding-top:26px;border-top:1px solid var(--pro-rule)}.pro-brand-profile>div{display:grid;gap:4px;min-width:0}.pro-brand-profile strong{font-size:18px;unicode-bidi:plaintext}.pro-brand-profile span{color:var(--pro-muted);font:500 11px/1.3 var(--font-mono)}.pro-brand-profile em{margin-inline-start:auto;padding:6px 9px;border:1px solid var(--pro-rule);border-radius:999px;color:var(--pro-muted);font:700 9px/1 var(--font-mono);font-style:normal;text-transform:uppercase}.pro-brand-profile em[data-live]{border-color:rgba(91,164,115,.35);color:#86bc96;background:rgba(91,164,115,.09)}.pro-brand-facts{display:grid;grid-template-columns:1fr 1fr;margin:18px 0 30px;border-block:1px solid var(--pro-rule)}.pro-brand-facts div{padding:16px 0}.pro-brand-facts div:nth-child(odd){padding-inline-end:18px;border-inline-end:1px solid var(--pro-rule)}.pro-brand-facts div:nth-child(even){padding-inline-start:18px}.pro-brand-facts div:nth-child(-n+2){border-block-end:1px solid var(--pro-rule)}.pro-brand-facts dt{color:#6f675c;font:700 9px/1 var(--font-mono);letter-spacing:.12em;text-transform:uppercase}.pro-brand-facts dd{margin:7px 0 0;color:var(--pro-cream);font-size:12px}.pro-button-primary,.pro-button-secondary{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:0 17px;border-radius:7px;text-decoration:none;font-size:12px;font-weight:800;cursor:pointer}.pro-button-primary{border:1px solid var(--pro-gold);background:var(--pro-gold);color:var(--pro-ink)}.pro-button-primary:hover{background:#d8b66f}.pro-button-secondary{border:1px solid var(--pro-rule);background:transparent;color:var(--pro-cream)}.pro-button-primary:disabled{opacity:.45;cursor:not-allowed}.pro-button-primary svg,.pro-button-secondary svg{width:15px}.pro-preview-shell{min-width:0;border:1px solid var(--pro-rule);border-radius:14px;background:var(--pro-panel);overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.34)}.pro-preview-toolbar{height:44px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 13px;border-block-end:1px solid var(--pro-rule)}.pro-preview-toolbar>div{display:flex;gap:5px}.pro-preview-toolbar i{width:7px;height:7px;border-radius:50%;background:#413a32}.pro-preview-toolbar strong{font:650 10px/1 var(--font-mono);color:var(--pro-muted)}.pro-preview-toolbar a{justify-self:end;display:flex;align-items:center;gap:5px;color:var(--pro-muted);text-decoration:none;font-size:10px}.pro-preview-toolbar svg{width:11px}.pro-preview-canvas{position:relative;height:min(68vh,680px);min-height:440px;background:#f3f0e9}.pro-preview-canvas iframe{width:100%;height:100%;border:0;opacity:0;transition:opacity .2s}.pro-preview-canvas iframe[data-loaded]{opacity:1}.pro-preview-skeleton,.pro-preview-failed{position:absolute;inset:0;z-index:2;display:grid;place-content:center;justify-items:center;gap:12px;background:var(--pro-panel);color:var(--pro-muted);font:650 11px/1.4 var(--font-mono)}.pro-preview-skeleton:before{content:'';position:absolute;inset:12%;background:linear-gradient(90deg,transparent,rgba(232,220,196,.04),transparent);transform:skewX(-16deg)}.pro-preview-skeleton svg,.pro-preview-failed>svg{width:24px;color:var(--pro-gold)}.pro-preview-failed button{border:1px solid var(--pro-rule);border-radius:6px;background:transparent;color:var(--pro-cream);padding:8px 12px;font-size:11px}.pro-interview-panel,.pro-protection-panel,.pro-transformation-panel{padding:clamp(24px,4vw,52px);border:1px solid var(--pro-rule);border-radius:14px;background:linear-gradient(145deg,rgba(232,220,196,.035),transparent 45%),var(--pro-panel)}.pro-interview-panel fieldset{display:grid;gap:10px;margin:0;padding:0;border:0}.pro-interview-panel fieldset label{display:grid;grid-template-columns:minmax(0,1fr) 24px;align-items:center;gap:15px;padding:18px;border:1px solid var(--pro-rule);border-radius:9px;cursor:pointer}.pro-interview-panel fieldset label[data-selected]{border-color:var(--pro-gold);background:rgba(198,161,91,.08)}.pro-interview-panel input[type=radio]{position:absolute;opacity:0}.pro-interview-panel label>span{display:grid;gap:6px}.pro-interview-panel label b{font-size:14px}.pro-interview-panel label small{color:var(--pro-muted);font-size:12px;line-height:1.5}.pro-interview-panel label>svg{width:18px;color:transparent}.pro-interview-panel label[data-selected]>svg{color:var(--pro-gold)}.pro-note{display:grid}.pro-note label{font-size:13px;font-weight:800}.pro-note textarea{min-height:190px;margin-top:12px;resize:vertical;border:1px solid var(--pro-rule);border-radius:9px;background:var(--pro-ink);color:var(--pro-cream);padding:16px;line-height:1.6}.pro-note>span{justify-self:end;margin-top:7px;color:var(--pro-muted);font:600 9px/1 var(--font-mono)}.pro-stage-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.pro-recommendation{display:grid;gap:28px}.pro-recommendation-header{display:flex;align-items:end;justify-content:space-between;gap:24px}.pro-recommendation-header .pro-stage-copy h1{font-size:clamp(34px,4vw,58px)}.pro-compare-toggle{display:flex;padding:3px;border:1px solid var(--pro-rule);border-radius:8px;background:var(--pro-panel)}.pro-compare-toggle button{border:0;border-radius:5px;background:transparent;color:var(--pro-muted);padding:9px 12px;font-size:10px;font-weight:750}.pro-compare-toggle button[data-active]{background:var(--pro-cream);color:var(--pro-ink)}.pro-recommendation-grid{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(300px,.62fr);gap:18px}.pro-rationale{display:flex;flex-direction:column;padding:26px;border:1px solid var(--pro-rule);border-radius:14px;background:var(--pro-panel)}.pro-rationale>span{color:var(--pro-gold);font:750 9px/1 var(--font-mono);letter-spacing:.12em;text-transform:uppercase}.pro-rationale>h2{margin:16px 0 0;font-size:32px;letter-spacing:-.03em}.pro-rationale>p{margin:10px 0 0;color:var(--pro-muted);font-size:12px;line-height:1.65}.pro-rationale>ul{display:grid;gap:10px;margin:22px 0 0;padding:20px 0;border-block:1px solid var(--pro-rule);list-style:none}.pro-rationale>ul li{display:grid;grid-template-columns:16px 1fr;gap:9px;color:#bdb2a1;font-size:11px;line-height:1.55}.pro-rationale>ul svg{width:14px;color:var(--pro-gold)}.pro-alternatives{display:grid;gap:8px;margin-top:auto;padding-top:24px}.pro-alternatives>small{margin-bottom:3px;color:#6f675c;font:700 9px/1 var(--font-mono);letter-spacing:.12em;text-transform:uppercase}.pro-alternatives button{display:grid;grid-template-columns:1fr 16px;align-items:center;gap:8px;width:100%;padding:12px;border:1px solid var(--pro-rule);border-radius:7px;background:transparent;color:var(--pro-cream);text-align:start;cursor:pointer}.pro-alternatives button>span{display:grid;gap:4px}.pro-alternatives button b{font-size:12px}.pro-alternatives button small{color:var(--pro-muted);font-size:9.5px;line-height:1.4}.pro-alternatives button svg{width:14px;color:var(--pro-gold)}.pro-rationale>.pro-button-primary{width:100%;margin-top:14px}.pro-foundation-stamp{display:inline-flex;margin-top:26px;padding:8px 11px;border:1px solid var(--pro-gold);border-radius:6px;color:var(--pro-gold);font:700 10px/1 var(--font-mono);text-transform:uppercase}.pro-protection-list{display:grid;grid-template-columns:1fr 1fr;gap:9px}.pro-protection-list article{display:grid;grid-template-columns:34px 1fr;gap:11px;padding:15px;border:1px solid var(--pro-rule);border-radius:8px;background:var(--pro-ink)}.pro-protection-list article>span{width:34px;height:34px;display:grid;place-items:center;border-radius:7px;background:rgba(198,161,91,.09);color:var(--pro-gold)}.pro-protection-list svg{width:16px}.pro-protection-list h2{margin:2px 0 0;font-size:12px}.pro-protection-list p{margin:6px 0 0;color:var(--pro-muted);font-size:10.5px;line-height:1.55}.pro-acknowledge{display:grid;grid-template-columns:22px 1fr;align-items:start;gap:10px;margin-top:14px;padding:14px;border:1px solid rgba(198,161,91,.35);border-radius:8px;background:rgba(198,161,91,.06);cursor:pointer}.pro-acknowledge input{position:absolute;opacity:0}.pro-acknowledge>span{width:22px;height:22px;display:grid;place-items:center;border:1px solid var(--pro-rule);border-radius:5px;color:transparent}.pro-acknowledge input:checked+span{border-color:var(--pro-gold);background:var(--pro-gold);color:var(--pro-ink)}.pro-acknowledge svg{width:13px}.pro-acknowledge strong{font-size:11px;line-height:1.55}.pro-transformation-panel{display:grid;grid-template-columns:100px 1fr;gap:36px;align-items:center}.pro-transformation-panel>svg{width:86px;height:86px;color:var(--pro-gold)}.pro-transformation-panel ol{display:grid;gap:0;margin:0;padding:0;list-style:none}.pro-transformation-panel li{display:grid;grid-template-columns:32px 1fr;align-items:center;gap:12px;min-height:58px;color:#5f584e;position:relative}.pro-transformation-panel li:after{content:'';position:absolute;inset-block-start:45px;inset-inline-start:15px;width:1px;height:27px;background:var(--pro-rule)}.pro-transformation-panel li:last-child:after{display:none}.pro-transformation-panel li>span{width:32px;height:32px;display:grid;place-items:center;border:1px solid currentColor;border-radius:50%;font:700 10px/1 var(--font-mono)}.pro-transformation-panel li svg{width:14px}.pro-transformation-panel li[data-state=active]{color:var(--pro-gold)}.pro-transformation-panel li[data-state=complete]{color:var(--pro-cream)}.pro-transformation-panel li b{font-size:12px}.pro-ready,.pro-failure{min-height:calc(100dvh - 220px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.pro-ready-mark{width:74px;height:74px;display:grid;place-items:center;margin-bottom:25px;border:1px solid var(--pro-gold);color:var(--pro-gold);transform:rotate(45deg)}.pro-ready-mark svg{width:28px;transform:rotate(-45deg)}.pro-ready h1,.pro-failure h1{max-width:15ch}.pro-ready>p,.pro-failure>p{max-width:55ch}.pro-failure>svg{width:42px;color:#cb7268;margin-bottom:22px}.pro-failure pre{max-width:680px;white-space:pre-wrap;margin-top:20px;padding:12px;border:1px solid rgba(203,114,104,.25);border-radius:7px;background:rgba(203,114,104,.06);color:#d59a93;font:500 11px/1.6 var(--font-mono)}.pro-locked{position:relative;z-index:3;display:flex;align-items:center;gap:12px;margin:12px 28px 0;padding:12px 14px;border:1px solid rgba(198,161,91,.3);border-radius:8px;background:#18140f}.pro-locked>svg{width:20px;color:var(--pro-gold)}.pro-locked>div{flex:1}.pro-locked strong{font-size:12px}.pro-locked p{margin:3px 0 0;color:var(--pro-muted);font-size:10.5px}.pro-locked a{color:var(--pro-gold);font-size:11px}.pro-replace-dialog{border:1px solid rgba(232,220,196,.16)!important;background:#12100e!important;color:#e8dcc4!important}.pro-replace-dialog p{color:#9f9585!important;line-height:1.6}.pro-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.pro-dialog-actions button{border:1px solid rgba(232,220,196,.15);border-radius:6px;background:transparent;color:#e8dcc4;padding:10px 13px;font-size:11px}.pro-dialog-actions button.primary{border-color:#c6a15b;background:#c6a15b;color:#0a0908}.pro-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px}.pro-empty>svg{width:42px;color:var(--pro-gold)}.pro-empty h1{max-width:18ch;margin:22px 0 0;font-size:42px}.pro-empty p{max-width:50ch;color:var(--pro-muted);line-height:1.7}.pro-empty .pro-button-primary{margin-top:18px}
  .pro-studio{background:var(--pro-ink)}.pro-interview-panel,.pro-protection-panel,.pro-transformation-panel{background:var(--pro-panel)}.pro-preview-skeleton:before{background:rgba(232,220,196,.025)}.pro-header-actions button{width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:1px solid var(--pro-rule);border-radius:50%;background:transparent;color:var(--pro-cream);font-size:11px;font-weight:700;cursor:pointer}
  [dir=rtl] .pro-stage-copy h1,[dir=rtl] .pro-recommendation-header h1,[dir=rtl] .pro-ready h1,[dir=rtl] .pro-failure h1{font-family:var(--font-arabic-display);font-weight:800;letter-spacing:0;line-height:1.12}[dir=rtl] .pro-studio{font-family:var(--font-arabic)}
  @media(max-width:1120px){.pro-studio-header{grid-template-columns:auto minmax(180px,1fr) auto}.pro-journey-progress{display:none}.pro-split,.pro-interview,.pro-protection,.pro-transformation{grid-template-columns:1fr;align-items:start}.pro-stage-copy{max-width:760px}.pro-recommendation-grid{grid-template-columns:minmax(0,1.3fr) minmax(280px,.7fr)}}
  @media(max-width:760px){.pro-studio-header{position:relative;grid-template-columns:1fr auto;padding:10px 14px}.pro-store-select{grid-row:2;grid-column:1/-1}.pro-header-actions>a:last-child{font-size:0}.pro-header-actions>a:last-child svg{width:16px}.pro-stage{padding:34px 14px}.pro-split,.pro-interview,.pro-protection,.pro-transformation{gap:30px;min-height:0}.pro-stage-copy h1,.pro-recommendation-header h1,.pro-ready h1,.pro-failure h1{font-size:38px}.pro-preview-canvas{height:55vh;min-height:420px}.pro-recommendation-header{align-items:stretch;flex-direction:column}.pro-compare-toggle{align-self:stretch}.pro-compare-toggle button{flex:1}.pro-recommendation-grid{grid-template-columns:1fr}.pro-rationale{min-height:420px}.pro-protection-list{grid-template-columns:1fr}.pro-transformation-panel{grid-template-columns:1fr;justify-items:center}.pro-stage-actions{display:grid;grid-template-columns:1fr}.pro-stage-actions>*{width:100%}.pro-locked{margin:10px 14px}.pro-locked a{display:none}.pro-brand-facts{grid-template-columns:1fr}.pro-brand-facts div:nth-child(n){padding:14px 0;border-inline-end:0;border-block-end:1px solid var(--pro-rule)}.pro-brand-facts div:last-child{border-block-end:0}}
  @media(prefers-reduced-motion:reduce){.pro-preview-canvas iframe{transition:none}.pro-studio *{scroll-behavior:auto!important}}
`;
