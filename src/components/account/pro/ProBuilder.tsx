'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OnMount } from '@monaco-editor/react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  ArrowUpRight,
  Bot,
  Check,
  CircleAlert,
  Code2,
  Eye,
  Hammer,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Save,
  UploadCloud,
} from 'lucide-react';
import {
  createProAiEditAction,
  createProBuildAction,
  createProSessionAction,
  archiveProSessionAction,
  publishProBuildAction,
  renameProSessionAction,
  retryProJobAction,
  saveProSourceAction,
  setProAiConfigurationAction,
  setProEditorModeAction,
} from '@/app/actions/pro';
import type {
  ProJobSnapshot,
  ProPromptIntent,
  ProPromptTarget,
  ProWorkspaceSnapshot,
} from '@/lib/proMode';
import type { ProSessionEventSnapshot, ProSessionSnapshot } from '@/lib/proMode';
import { isProPublishReady } from '@/lib/proMode';
import {
  PRO_AI_CATALOG_VERSION,
  getProAiModel,
  type ProAiPreferences,
} from '@/lib/pro/modelCatalog';
import { parseSouqySource, serializeSouqySource, type SouqySourceFiles } from '@/lib/souqy/source';
import type { Locale } from '@/i18n/locales';
import { ProAiComposer } from '@/components/account/pro/ProAiComposer';
import { ProIdeV2 } from '@/components/account/pro/ProIdeV2';
import { MobiusLoopIcon } from '@/components/mobius-loop-icon';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((module) => module.default),
  { ssr: false, loading: () => <div className="pro-editor-loading" /> },
);

const INK = '#161310';
const CREAM = '#f2e9d8';
const GOLD = '#d4b06a';
const FILES: Array<keyof SouqySourceFiles> = ['index.tsx', 'theme.ts', 'styles.css'];
const TERMINAL = new Set(['succeeded', 'failed']);

const COPY = {
  en: {
    foundations: { structure: 'Structure', motion: 'Motion', bespoke: 'Bespoke' },
    base: 'Foundation',
    templates: 'Foundations',
    dashboard: 'Dashboard',
    easy: 'Easy',
    pro: 'Pro',
    agent: 'Souqy agent',
    code: 'Code',
    preview: 'Preview',
    agentBody:
      'Describe a focused change. Souqy edits the private Pro draft, validates it, and builds a new preview. It never publishes for you.',
    prompt: 'Make the product grid quieter and give the hero more breathing room…',
    send: 'Generate edit',
    saved: 'Saved',
    saving: 'Saving',
    unsaved: 'Unsaved',
    conflict: 'Changed elsewhere',
    build: 'Build preview',
    building: 'Building',
    publish: 'Publish Pro',
    publishing: 'Publishing',
    ready: 'Ready to publish',
    outdated: 'Preview is behind the current source',
    noPreview: 'Build the source to create a private preview.',
    readOnlyTitle: 'Read-only Pro workspace',
    readOnlyBody: 'Your published Pro site remains online. Upgrade to edit, build, or publish.',
    upgrade: 'Compare plans',
    buildFailed: 'Build failed',
    retryHint: 'Review the diagnostics, make a change, then build again.',
    published: 'Pro storefront published.',
    error: 'The operation could not finish.',
    runnerFailed: 'Generation stopped safely because the job runner could not update its state.',
    retry: 'Retry job',
    viewFull: 'Open full preview',
    files: 'Files',
    diagnostics: 'Diagnostics',
    activity: 'Activity',
    activityEmpty: 'No AI edit or preview build is running. Your next request stays private.',
    overwriteMine: 'Keep mine & save',
    loadServer: 'Load server version',
    conflictBody: 'Another tab saved a newer version. Choose which draft should remain.',
    confirmLoadServer: 'Replace your unsaved editor changes with the newer server version?',
    state: {
      saved: 'Saved',
      outdated: 'Preview outdated',
      building: 'Building',
      failed: 'Build failed',
      ready: 'Ready to publish',
    },
    statuses: {
      queued: 'Queued',
      generating: 'Generating',
      validating: 'Validating',
      building: 'Building',
      repairing: 'Repairing',
      succeeded: 'Preview ready',
      failed: 'Failed',
    },
  },
  ar: {
    foundations: { structure: 'البنية', motion: 'الحركة', bespoke: 'مُخصّص' },
    base: 'الأساس',
    templates: 'الأساسات',
    dashboard: 'اللوحة',
    easy: 'سهل',
    pro: 'برو',
    agent: 'وكيل سوقي',
    code: 'الكود',
    preview: 'المعاينة',
    agentBody:
      'صف تغييرًا محددًا. يعدّل سوقي مسودة برو الخاصة ويفحصها ويبني معاينة جديدة، ولا ينشر بدلًا منك.',
    prompt: 'اجعل شبكة المنتجات أهدأ وزد المساحة حول عنوان الواجهة…',
    send: 'ولّد التعديل',
    saved: 'محفوظ',
    saving: 'جارٍ الحفظ',
    unsaved: 'غير محفوظ',
    conflict: 'تغيّر في مكان آخر',
    build: 'ابنِ المعاينة',
    building: 'جارٍ البناء',
    publish: 'انشر برو',
    publishing: 'جارٍ النشر',
    ready: 'جاهز للنشر',
    outdated: 'المعاينة أقدم من الكود الحالي',
    noPreview: 'ابنِ الكود لإنشاء معاينة خاصة.',
    readOnlyTitle: 'مساحة برو للعرض فقط',
    readOnlyBody: 'يبقى موقع برو المنشور مباشرًا. رقِّ خطتك للتحرير والبناء والنشر.',
    upgrade: 'قارن الخطط',
    buildFailed: 'فشل البناء',
    retryHint: 'راجع التشخيصات، عدّل الكود، ثم ابنِ مرة أخرى.',
    published: 'تم نشر متجر برو.',
    error: 'تعذّر إكمال العملية.',
    runnerFailed: 'توقف التوليد بأمان لأن مشغّل المهمة تعذّر عليه تحديث حالتها.',
    retry: 'أعد المحاولة',
    viewFull: 'افتح المعاينة الكاملة',
    files: 'الملفات',
    diagnostics: 'التشخيصات',
    activity: 'النشاط',
    activityEmpty: 'لا يوجد تعديل أو بناء قيد التشغيل. سيبقى طلبك التالي ضمن المسودة الخاصة.',
    overwriteMine: 'احتفظ بنسختي واحفظ',
    loadServer: 'حمّل نسخة الخادم',
    conflictBody: 'حفظت علامة تبويب أخرى إصدارًا أحدث. اختر المسودة التي تريد الاحتفاظ بها.',
    confirmLoadServer: 'استبدال تغييرات المحرر غير المحفوظة بنسخة الخادم الأحدث؟',
    state: {
      saved: 'محفوظ',
      outdated: 'المعاينة قديمة',
      building: 'جارٍ البناء',
      failed: 'فشل البناء',
      ready: 'جاهز للنشر',
    },
    statuses: {
      queued: 'في الانتظار',
      generating: 'جارٍ التوليد',
      validating: 'جارٍ الفحص',
      building: 'جارٍ البناء',
      repairing: 'جارٍ الإصلاح',
      succeeded: 'المعاينة جاهزة',
      failed: 'فشل',
    },
  },
} as const;

export function ProBuilder({
  locale,
  slug,
  businessName,
  workspace,
  initialJob,
  eligible,
  publishedRevision,
  v2Enabled = false,
  codeRuntimeEnabled = false,
  initialView = 'home',
  sessions = [],
  activeSession = null,
  sessionEvents = [],
  earlierJobs = [],
  storefronts = [],
  invalidSession = false,
}: {
  locale: Locale;
  slug: string;
  businessName: string;
  workspace: ProWorkspaceSnapshot;
  initialJob: ProJobSnapshot | null;
  eligible: boolean;
  publishedRevision: string | null;
  v2Enabled?: boolean;
  codeRuntimeEnabled?: boolean;
  initialView?: 'home' | 'preview' | 'code';
  sessions?: ProSessionSnapshot[];
  activeSession?: ProSessionSnapshot | null;
  sessionEvents?: ProSessionEventSnapshot[];
  earlierJobs?: ProJobSnapshot[];
  storefronts?: Array<{ slug: string; businessName: string }>;
  invalidSession?: boolean;
}) {
  const isRtl = locale === 'ar';
  const t = COPY[locale];
  const router = useRouter();
  const initialFiles = parseSouqySource(workspace.draftSource) ?? {
    'index.tsx': '',
    'theme.ts': '',
    'styles.css': '',
  };
  const [files, setFiles] = React.useState<SouqySourceFiles>(initialFiles);
  const [activeFile, setActiveFile] = React.useState<keyof SouqySourceFiles>('index.tsx');
  const [workspaceState, setWorkspaceState] = React.useState(workspace);
  const [job, setJob] = React.useState(initialJob);
  const [saving, setSaving] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);
  const [conflictWorkspace, setConflictWorkspace] = React.useState<ProWorkspaceSnapshot | null>(
    null,
  );
  const [publishing, setPublishing] = React.useState(false);
  const [submittingPrompt, setSubmittingPrompt] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [aiPreferences, setAiPreferences] = React.useState<ProAiPreferences>(
    workspace.aiPreferences,
  );
  const [message, setMessage] = React.useState<string | null>(null);
  const [runnerErrorJobId, setRunnerErrorJobId] = React.useState<string | null>(null);
  const [mobileTab, setMobileTab] = React.useState<'agent' | 'code' | 'preview'>('code');
  const [v2View, setV2View] = React.useState<'home' | 'preview' | 'code'>(initialView);
  const [proSessions, setProSessions] = React.useState(sessions);
  const [currentSession, setCurrentSession] = React.useState(activeSession);
  const [currentSessionEvents, setCurrentSessionEvents] = React.useState(sessionEvents);
  const workspaceRef = React.useRef(workspace);
  const filesRef = React.useRef(files);
  const lastSavedSourceRef = React.useRef(workspace.draftSource);
  const savePromiseRef = React.useRef<Promise<boolean> | null>(null);
  const aiPreferencesSavePromiseRef = React.useRef<Promise<boolean> | null>(null);
  const runJobIdRef = React.useRef<string | null>(null);
  const blockedJobRunsRef = React.useRef(new Set<string>());
  const saveNowRef = React.useRef<() => Promise<boolean>>(async () => false);
  const saveAiPreferencesNowRef = React.useRef<() => Promise<boolean>>(async () => false);
  const aiPreferencesRef = React.useRef(aiPreferences);
  const savedAiPreferencesRef = React.useRef(workspace.aiPreferences);
  const aiPreferencesVersionRef = React.useRef(workspace.aiPreferencesVersion);
  const source = React.useMemo(() => serializeSouqySource(files), [files]);
  const dirty = source !== lastSavedSourceRef.current;
  const jobActive =
    submittingPrompt || Boolean(job && !TERMINAL.has(job.status) && runnerErrorJobId !== job.id);
  const previewCurrent = isProPublishReady(workspaceState);
  const publishReady = eligible && previewCurrent && Boolean(workspaceState.builtRevision);
  const isPublishedRevision = Boolean(
    publishedRevision && workspaceState.builtRevision === publishedRevision && previewCurrent,
  );
  const messageIsSuccess = message === t.published;

  filesRef.current = files;
  workspaceRef.current = workspaceState;
  aiPreferencesRef.current = aiPreferences;

  React.useEffect(() => {
    if (workspace.updatedAt === workspaceRef.current.updatedAt) return;
    const localHasUnsavedWork =
      serializeSouqySource(filesRef.current) !== lastSavedSourceRef.current;
    setWorkspaceState(workspace);
    workspaceRef.current = workspace;
    if (
      JSON.stringify(aiPreferencesRef.current) === JSON.stringify(savedAiPreferencesRef.current)
    ) {
      setAiPreferences(workspace.aiPreferences);
      aiPreferencesRef.current = workspace.aiPreferences;
    }
    savedAiPreferencesRef.current = workspace.aiPreferences;
    aiPreferencesVersionRef.current = workspace.aiPreferencesVersion;
    if (!localHasUnsavedWork) {
      const nextFiles = parseSouqySource(workspace.draftSource);
      if (nextFiles) {
        setFiles(nextFiles);
        filesRef.current = nextFiles;
        lastSavedSourceRef.current = workspace.draftSource;
      }
    }
  }, [workspace]);

  React.useEffect(() => {
    setJob((current) =>
      current?.id === initialJob?.id && current?.updatedAt === initialJob?.updatedAt
        ? current
        : initialJob,
    );
    if (!initialJob || TERMINAL.has(initialJob.status)) {
      blockedJobRunsRef.current.delete(initialJob?.id ?? '');
      setRunnerErrorJobId(null);
    }
  }, [initialJob]);

  React.useEffect(() => {
    setProSessions(sessions);
    setCurrentSession(activeSession);
    setCurrentSessionEvents(sessionEvents);
    setV2View(activeSession ? (initialView === 'home' ? 'code' : initialView) : 'home');
  }, [activeSession, initialView, sessionEvents, sessions]);

  const saveNow = React.useCallback(async (): Promise<boolean> => {
    if (!eligible) return false;
    if (savePromiseRef.current) return savePromiseRef.current;
    const operation = (async () => {
      const capturedFiles = filesRef.current;
      const capturedSource = serializeSouqySource(capturedFiles);
      if (capturedSource === lastSavedSourceRef.current) return true;
      setSaving(true);
      setConflict(false);
      setConflictWorkspace(null);
      const result = await saveProSourceAction({
        slug,
        expectedVersion: workspaceRef.current.draftVersion,
        files: capturedFiles,
      });
      if (!result.ok) {
        setConflict(result.error === 'conflict');
        if (result.error === 'conflict') setConflictWorkspace(result.workspace ?? null);
        setMessage(result.message);
        return false;
      }
      workspaceRef.current = result.data.workspace;
      setWorkspaceState(result.data.workspace);
      lastSavedSourceRef.current = capturedSource;
      setMessage(null);
      return true;
    })();
    savePromiseRef.current = operation;
    try {
      return await operation;
    } finally {
      savePromiseRef.current = null;
      setSaving(false);
      if (serializeSouqySource(filesRef.current) !== lastSavedSourceRef.current) {
        window.setTimeout(() => void saveNowRef.current(), 0);
      }
    }
  }, [eligible, slug]);
  saveNowRef.current = saveNow;

  const saveAiPreferencesNow = React.useCallback(async (): Promise<boolean> => {
    if (!eligible) return false;
    if (
      JSON.stringify(aiPreferencesRef.current) === JSON.stringify(savedAiPreferencesRef.current)
    ) {
      return true;
    }
    if (aiPreferencesSavePromiseRef.current) return aiPreferencesSavePromiseRef.current;
    const capturedPreferences = aiPreferencesRef.current;
    const operation = (async () => {
      const result = await setProAiConfigurationAction({
        slug,
        expectedPreferencesVersion: aiPreferencesVersionRef.current,
        preferences: capturedPreferences,
      });
      if (!result.ok) {
        setMessage(result.message);
        if (result.error === 'conflict' && result.workspace) {
          setAiPreferences(result.workspace.aiPreferences);
          aiPreferencesRef.current = result.workspace.aiPreferences;
          savedAiPreferencesRef.current = result.workspace.aiPreferences;
          aiPreferencesVersionRef.current = result.workspace.aiPreferencesVersion;
          setWorkspaceState(result.workspace);
          workspaceRef.current = result.workspace;
        }
        return false;
      }
      savedAiPreferencesRef.current = result.data.workspace.aiPreferences;
      aiPreferencesVersionRef.current = result.data.workspace.aiPreferencesVersion;
      setWorkspaceState(result.data.workspace);
      workspaceRef.current = result.data.workspace;
      return true;
    })();
    aiPreferencesSavePromiseRef.current = operation;
    let succeeded = false;
    try {
      succeeded = await operation;
      return succeeded;
    } finally {
      aiPreferencesSavePromiseRef.current = null;
      if (
        succeeded &&
        JSON.stringify(aiPreferencesRef.current) !== JSON.stringify(savedAiPreferencesRef.current)
      ) {
        window.setTimeout(() => void saveAiPreferencesNowRef.current(), 0);
      }
    }
  }, [eligible, slug]);
  saveAiPreferencesNowRef.current = saveAiPreferencesNow;

  React.useEffect(() => {
    if (!eligible || !dirty || conflict) return;
    const timer = window.setTimeout(() => void saveNowRef.current(), 900);
    return () => window.clearTimeout(timer);
  }, [conflict, dirty, eligible, source]);

  React.useEffect(() => {
    if (!dirty && !saving) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty, saving]);

  React.useEffect(() => {
    if (
      !eligible ||
      JSON.stringify(aiPreferences) === JSON.stringify(savedAiPreferencesRef.current)
    )
      return;
    const timer = window.setTimeout(() => void saveAiPreferencesNowRef.current(), 550);
    return () => window.clearTimeout(timer);
  }, [aiPreferences, eligible]);

  const driveJob = React.useCallback(
    async (initial: ProJobSnapshot) => {
      if (
        runJobIdRef.current === initial.id ||
        blockedJobRunsRef.current.has(initial.id) ||
        TERMINAL.has(initial.status)
      )
        return;
      runJobIdRef.current = initial.id;
      let current = initial;
      try {
        for (let step = 0; step < 16 && !TERMINAL.has(current.status); step += 1) {
          const response = await fetch(`/api/pro/jobs/${encodeURIComponent(current.id)}`, {
            method: 'POST',
            headers: { Accept: 'application/json' },
          });
          const body = (await response.json().catch(() => null)) as
            | { ok: true; job: ProJobSnapshot; busy?: boolean }
            | { ok: false; error?: string; job?: ProJobSnapshot | null }
            | null;
          if (!body) {
            blockedJobRunsRef.current.add(current.id);
            setRunnerErrorJobId(current.id);
            setMessage(t.runnerFailed);
            break;
          }
          if (body.job) {
            current = body.job;
            setJob(body.job);
          }
          if (TERMINAL.has(current.status)) break;
          if (!response.ok || !body.ok) {
            blockedJobRunsRef.current.add(current.id);
            setRunnerErrorJobId(current.id);
            setMessage(t.runnerFailed);
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, body.busy ? 900 : 180));
        }
        router.refresh();
      } finally {
        runJobIdRef.current = null;
      }
    },
    [router, t.runnerFailed],
  );

  React.useEffect(() => {
    if (job && eligible && !TERMINAL.has(job.status)) void driveJob(job);
  }, [driveJob, eligible, job]);

  const handleEditorMount: OnMount = React.useCallback((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => void saveNowRef.current());
  }, []);

  async function buildPreview() {
    setMessage(null);
    if (!(await saveNow())) return;
    const result = await createProBuildAction({
      slug,
      expectedVersion: workspaceRef.current.draftVersion,
      sessionId: currentSession?.id ?? null,
    });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (currentSession) {
      setCurrentSessionEvents((current) =>
        current.some((event) => event.jobId === result.data.job.id)
          ? current
          : [
              ...current,
              {
                id: `pending-job-${result.data.job.id}`,
                sessionId: currentSession.id,
                type: 'job',
                content: null,
                jobId: result.data.job.id,
                revision: null,
                metadata: { kind: result.data.job.kind },
                createdAt: new Date().toISOString(),
              },
            ],
      );
    }
    setJob(result.data.job);
    blockedJobRunsRef.current.delete(result.data.job.id);
    setRunnerErrorJobId(null);
    void driveJob(result.data.job);
  }

  async function requestAiEdit(
    requestOverride?: string,
    target: ProPromptTarget = 'storefront',
    intent: ProPromptIntent = 'redesign',
  ) {
    const request = requestOverride?.trim() || prompt.trim();
    if (!request) return;
    setSubmittingPrompt(true);
    try {
      if (!(await saveNow()) || !(await saveAiPreferencesNow())) return;
      let session = currentSession;
      if (v2Enabled && !session) {
        const title = request.replace(/\s+/gu, ' ').slice(0, 72);
        const created = await createProSessionAction({ slug, title });
        if (!created.ok) {
          setMessage(created.message);
          return;
        }
        session = created.data.session;
        setCurrentSession(session);
        setProSessions((current) => [
          session!,
          ...current.filter((item) => item.id !== session!.id),
        ]);
        setV2View('code');
        window.history.replaceState(
          null,
          '',
          `/account/builder?store=${encodeURIComponent(slug)}&session=${encodeURIComponent(session.id)}&view=code`,
        );
      }
      setMessage(null);
      const selectedModel = getProAiModel(aiPreferences.selectedModelId);
      const configuration = aiPreferences.models[selectedModel.id] ?? {
        reasoning: selectedModel.defaultReasoning,
        speed: 'standard' as const,
      };
      const result = await createProAiEditAction({
        slug,
        expectedVersion: workspaceRef.current.draftVersion,
        request,
        target,
        intent,
        modelId: selectedModel.id,
        reasoning: configuration.reasoning,
        speed: selectedModel.hasSpeedConfiguration ? configuration.speed : 'standard',
        catalogVersion: PRO_AI_CATALOG_VERSION,
        sessionId: session?.id ?? null,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setPrompt('');
      if (session) {
        const now = new Date().toISOString();
        setCurrentSessionEvents((current) => [
          ...current,
          {
            id: `pending-prompt-${result.data.job.id}`,
            sessionId: session!.id,
            type: 'user_prompt',
            content: request,
            jobId: null,
            revision: null,
            metadata: { target, intent },
            createdAt: now,
          },
          {
            id: `pending-job-${result.data.job.id}`,
            sessionId: session!.id,
            type: 'job',
            content:
              locale === 'ar'
                ? 'سوقي يعدّل المسودة الخاصة.'
                : 'Souqy is editing the private draft.',
            jobId: result.data.job.id,
            revision: null,
            metadata: { kind: result.data.job.kind },
            createdAt: now,
          },
        ]);
      }
      setJob(result.data.job);
      const placeholderTitle = locale === 'ar' ? 'جلسة جديدة' : 'New session';
      if (session?.title === placeholderTitle) {
        const renamed = await renameProSessionAction({
          slug,
          sessionId: session.id,
          title: request.replace(/\s+/gu, ' ').slice(0, 72),
        });
        if (renamed.ok) {
          setCurrentSession(renamed.data.session);
          setProSessions((current) =>
            current.map((item) =>
              item.id === renamed.data.session.id ? renamed.data.session : item,
            ),
          );
        }
      }
      blockedJobRunsRef.current.delete(result.data.job.id);
      setRunnerErrorJobId(null);
      void driveJob(result.data.job);
    } finally {
      setSubmittingPrompt(false);
    }
  }

  function loadConflictWorkspace() {
    if (!conflictWorkspace || !window.confirm(t.confirmLoadServer)) return;
    const nextFiles = parseSouqySource(conflictWorkspace.draftSource);
    if (!nextFiles) return;
    setFiles(nextFiles);
    filesRef.current = nextFiles;
    workspaceRef.current = conflictWorkspace;
    setWorkspaceState(conflictWorkspace);
    setAiPreferences(conflictWorkspace.aiPreferences);
    aiPreferencesRef.current = conflictWorkspace.aiPreferences;
    savedAiPreferencesRef.current = conflictWorkspace.aiPreferences;
    aiPreferencesVersionRef.current = conflictWorkspace.aiPreferencesVersion;
    lastSavedSourceRef.current = conflictWorkspace.draftSource;
    setConflict(false);
    setConflictWorkspace(null);
    setMessage(null);
  }

  function overwriteConflictWithLocal() {
    if (!conflictWorkspace) return;
    workspaceRef.current = conflictWorkspace;
    setWorkspaceState(conflictWorkspace);
    setConflict(false);
    setConflictWorkspace(null);
    void saveNowRef.current();
  }

  async function publish() {
    if (!(await saveNow())) return;
    const current = workspaceRef.current;
    setPublishing(true);
    setMessage(null);
    const result = await publishProBuildAction({
      slug,
      expectedVersion: current.draftVersion,
      sourceHash: current.draftSourceHash,
      sessionId: currentSession?.id ?? null,
    });
    setPublishing(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage(t.published);
    if (currentSession) {
      setCurrentSessionEvents((currentEvents) => [
        ...currentEvents,
        {
          id: `pending-publish-${result.data.revision}`,
          sessionId: currentSession.id,
          type: 'publish',
          content: null,
          jobId: null,
          revision: result.data.revision,
          metadata: { sourceVersion: current.draftVersion },
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    router.refresh();
  }

  async function retryJob() {
    if (!job || !eligible) return;
    if (runnerErrorJobId === job.id) {
      blockedJobRunsRef.current.delete(job.id);
      setRunnerErrorJobId(null);
      setMessage(null);
      void driveJob(job);
      return;
    }
    if (job.status !== 'failed') return;
    setMessage(null);
    const result = await retryProJobAction({ slug, jobId: job.id });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setJob(result.data.job);
    blockedJobRunsRef.current.delete(result.data.job.id);
    setRunnerErrorJobId(null);
    void driveJob(result.data.job);
  }

  async function switchToEasy() {
    if (eligible && (!(await saveNow()) || !(await saveAiPreferencesNow()))) return;
    if (eligible) {
      const result = await setProEditorModeAction({ slug, mode: 'easy' });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
    }
    router.push(`/account/builder?store=${encodeURIComponent(slug)}&easy=1`);
  }

  async function navigateAfterSave(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();
    if (eligible && (!(await saveNow()) || !(await saveAiPreferencesNow()))) return;
    router.push(href);
  }

  async function openV2Session(sessionId: string) {
    if (eligible && (!(await saveNow()) || !(await saveAiPreferencesNow()))) return;
    router.push(
      `/account/builder?store=${encodeURIComponent(slug)}&session=${encodeURIComponent(sessionId)}&view=code`,
    );
  }

  async function createV2Session() {
    if (eligible && (!(await saveNow()) || !(await saveAiPreferencesNow()))) return;
    const created = await createProSessionAction({
      slug,
      title: locale === 'ar' ? 'جلسة جديدة' : 'New session',
    });
    if (!created.ok) {
      setMessage(created.message);
      return;
    }
    const session = created.data.session;
    setCurrentSession(session);
    setCurrentSessionEvents([]);
    setJob(null);
    setProSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
    setV2View('code');
    setPrompt('');
    window.history.pushState(
      null,
      '',
      `/account/builder?store=${encodeURIComponent(slug)}&session=${encodeURIComponent(session.id)}&view=code`,
    );
  }

  async function renameV2Session(sessionId: string, title: string) {
    const result = await renameProSessionAction({ slug, sessionId, title });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setProSessions((current) =>
      current.map((item) => (item.id === sessionId ? result.data.session : item)),
    );
    if (currentSession?.id === sessionId) setCurrentSession(result.data.session);
  }

  async function archiveV2Session(sessionId: string) {
    if (currentSession?.id === sessionId && eligible) {
      if (!(await saveNow()) || !(await saveAiPreferencesNow())) return;
    }
    const result = await archiveProSessionAction({ slug, sessionId, archived: true });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setProSessions((current) =>
      current.map((item) => (item.id === sessionId ? result.data.session : item)),
    );
    if (currentSession?.id === sessionId) await openV2Home();
  }

  async function openV2Home() {
    if (eligible && (!(await saveNow()) || !(await saveAiPreferencesNow()))) return;
    setCurrentSession(null);
    setCurrentSessionEvents([]);
    setJob(null);
    setV2View('home');
    setPrompt('');
    window.history.pushState(null, '', `/account/builder?store=${encodeURIComponent(slug)}`);
  }

  async function switchV2Store(nextSlug: string) {
    if (nextSlug === slug) return;
    if (eligible && (!(await saveNow()) || !(await saveAiPreferencesNow()))) return;
    router.push(`/account/builder?store=${encodeURIComponent(nextSlug)}`);
  }

  function changeV2View(nextView: 'home' | 'preview' | 'code') {
    setV2View(nextView);
    if (!currentSession || nextView === 'home') return;
    window.history.replaceState(
      null,
      '',
      `/account/builder?store=${encodeURIComponent(slug)}&session=${encodeURIComponent(currentSession.id)}&view=${nextView}`,
    );
  }

  function moveMobileTab(
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: 'agent' | 'code' | 'preview',
  ) {
    const tabs = ['agent', 'code', 'preview'] as const;
    let nextIndex: number | null = null;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const visualDirection = event.key === 'ArrowRight' ? 1 : -1;
      const direction = isRtl ? -visualDirection : visualDirection;
      nextIndex = (tabs.indexOf(current) + direction + tabs.length) % tabs.length;
    }
    if (nextIndex == null) return;
    event.preventDefault();
    const next = tabs[nextIndex]!;
    setMobileTab(next);
    document.getElementById(`pro-${slug}-tab-${next}`)?.focus();
  }

  if (v2Enabled) {
    return (
      <ProIdeV2
        locale={locale}
        slug={slug}
        businessName={businessName}
        storefronts={storefronts}
        workspace={workspaceState}
        job={job}
        sessions={proSessions}
        activeSession={currentSession}
        sessionEvents={currentSessionEvents}
        earlierJobs={earlierJobs}
        invalidSession={invalidSession}
        view={v2View}
        files={files}
        activeFile={activeFile}
        prompt={prompt}
        aiPreferences={aiPreferences}
        eligible={eligible}
        dirty={dirty}
        saving={saving}
        conflict={conflict}
        publishing={publishing}
        jobActive={jobActive}
        previewCurrent={previewCurrent}
        publishReady={publishReady}
        published={isPublishedRevision}
        message={message}
        runnerFailed={Boolean(job && runnerErrorJobId === job.id)}
        codeRuntimeEnabled={codeRuntimeEnabled}
        onViewChange={changeV2View}
        onPromptChange={setPrompt}
        onPreferencesChange={setAiPreferences}
        onSubmit={(request, target, intent) => void requestAiEdit(request, target, intent)}
        onBuild={() => void buildPreview()}
        onPublish={() => void publish()}
        onRetry={() => void retryJob()}
        onFileChange={setActiveFile}
        onSourceChange={(name, value) =>
          setFiles((current) => (current[name] === value ? current : { ...current, [name]: value }))
        }
        onEditorMount={handleEditorMount}
        onKeepLocal={overwriteConflictWithLocal}
        onLoadServer={loadConflictWorkspace}
        onHome={() => void openV2Home()}
        onNewSession={() => void createV2Session()}
        onOpenSession={(sessionId) => void openV2Session(sessionId)}
        onRenameSession={(sessionId, title) => void renameV2Session(sessionId, title)}
        onArchiveSession={(sessionId) => void archiveV2Session(sessionId)}
        onStoreChange={(nextSlug) => void switchV2Store(nextSlug)}
        onEasy={() => void switchToEasy()}
      />
    );
  }

  return (
    <div className="pro-builder" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="pro-builder-header">
        <div className="pro-builder-brand">
          <span aria-hidden>
            <MobiusLoopIcon />
          </span>
          <b dir="ltr">Souqna Pro</b>
          <strong dir="auto">{businessName}</strong>
          <small>
            {t.base}: {t.foundations[workspaceState.foundation]}
          </small>
        </div>
        <nav className="pro-builder-nav">
          <div
            className="pro-mode-toggle"
            role="group"
            aria-label={locale === 'ar' ? 'وضع المنشئ' : 'Builder mode'}
          >
            <button type="button" aria-pressed={false} onClick={() => void switchToEasy()}>
              {t.easy}
            </button>
            <button type="button" data-active="" aria-pressed>
              {t.pro}
            </button>
          </div>
          <Link
            href={`/account/pro?store=${encodeURIComponent(slug)}&manage=foundations`}
            onClick={(event) =>
              void navigateAfterSave(
                event,
                `/account/pro?store=${encodeURIComponent(slug)}&manage=foundations`,
              )
            }
          >
            {t.templates}
          </Link>
          <Link href="/account" onClick={(event) => void navigateAfterSave(event, '/account')}>
            {t.dashboard}
            <ArrowUpRight aria-hidden />
          </Link>
        </nav>
      </header>

      {!eligible ? (
        <aside className="pro-builder-readonly">
          <LockKeyhole aria-hidden />
          <div>
            <strong>{t.readOnlyTitle}</strong>
            <p>{t.readOnlyBody}</p>
          </div>
          <Link href="/account/settings/plan">{t.upgrade}</Link>
        </aside>
      ) : null}

      <div
        className="pro-mobile-tabs"
        role="tablist"
        aria-label={locale === 'ar' ? 'لوحات منشئ برو' : 'Pro Builder panels'}
      >
        {(['agent', 'code', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            id={`pro-${slug}-tab-${tab}`}
            role="tab"
            aria-selected={mobileTab === tab}
            aria-controls={`pro-${slug}-panel-${tab}`}
            tabIndex={mobileTab === tab ? 0 : -1}
            data-active={mobileTab === tab ? '' : undefined}
            onClick={() => setMobileTab(tab)}
            onKeyDown={(event) => moveMobileTab(event, tab)}
          >
            {tab === 'agent' ? (
              <Bot aria-hidden />
            ) : tab === 'code' ? (
              <Code2 aria-hidden />
            ) : (
              <Eye aria-hidden />
            )}
            {t[tab]}
          </button>
        ))}
      </div>

      <div className="pro-workbench">
        <PanelGroup direction="horizontal" autoSaveId="souqna-pro-workbench-v1">
          <Panel
            defaultSize={28}
            minSize={21}
            id={`pro-${slug}-panel-agent`}
            role="tabpanel"
            aria-labelledby={`pro-${slug}-tab-agent`}
            className="pro-panel pro-agent-panel"
            data-mobile-active={mobileTab === 'agent' ? '' : undefined}
          >
            <section className="pro-panel-shell">
              <PanelHeading icon={<Bot />} title={t.agent} />
              <div className="pro-agent-content">
                <p>{t.agentBody}</p>
                <section className="pro-agent-activity" aria-label={t.activity}>
                  <h3>{t.activity}</h3>
                  {job ? (
                    <JobCard
                      job={job}
                      locale={locale}
                      canRetry={eligible}
                      runnerFailed={runnerErrorJobId === job.id}
                      onRetry={() => void retryJob()}
                    />
                  ) : (
                    <p>{t.activityEmpty}</p>
                  )}
                  {message ? (
                    <div
                      className="pro-message"
                      data-tone={messageIsSuccess ? 'success' : 'error'}
                      role="status"
                    >
                      {messageIsSuccess ? <Check aria-hidden /> : <CircleAlert aria-hidden />}
                      {message}
                    </div>
                  ) : null}
                </section>
                <ProAiComposer
                  locale={locale}
                  value={prompt}
                  preferences={aiPreferences}
                  disabled={!eligible}
                  generating={jobActive}
                  jobStatus={submittingPrompt ? 'queued' : job?.status}
                  onValueChange={setPrompt}
                  onPreferencesChange={setAiPreferences}
                  onSubmit={() => void requestAiEdit()}
                />
              </div>
            </section>
          </Panel>
          <PanelResizeHandle
            className="pro-resize-handle"
            aria-label={locale === 'ar' ? 'غيّر عرض لوحة الوكيل' : 'Resize agent panel'}
          />
          <Panel
            defaultSize={44}
            minSize={28}
            id={`pro-${slug}-panel-code`}
            role="tabpanel"
            aria-labelledby={`pro-${slug}-tab-code`}
            className="pro-panel pro-code-panel"
            data-mobile-active={mobileTab === 'code' ? '' : undefined}
          >
            <section className="pro-panel-shell">
              <div className="pro-code-header">
                <PanelHeading icon={<Code2 />} title={t.files} />
                <div className="pro-save-state" data-conflict={conflict ? '' : undefined}>
                  {saving ? (
                    <LoaderCircle className="pro-spin" />
                  ) : conflict ? (
                    <CircleAlert />
                  ) : dirty ? (
                    <Save />
                  ) : (
                    <Check />
                  )}
                  {saving ? t.saving : conflict ? t.conflict : dirty ? t.unsaved : t.saved}
                </div>
              </div>
              {conflict ? (
                <div className="pro-conflict-recovery" role="alert">
                  <CircleAlert aria-hidden />
                  <p>{t.conflictBody}</p>
                  <button type="button" onClick={overwriteConflictWithLocal}>
                    <Save aria-hidden />
                    {t.overwriteMine}
                  </button>
                  <button type="button" onClick={loadConflictWorkspace}>
                    <RefreshCw aria-hidden />
                    {t.loadServer}
                  </button>
                </div>
              ) : null}
              <div className="pro-file-tabs">
                {FILES.map((name) => (
                  <button
                    type="button"
                    key={name}
                    data-active={activeFile === name ? '' : undefined}
                    onClick={() => setActiveFile(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="pro-monaco">
                <MonacoEditor
                  path={`file:///${slug}/${activeFile}`}
                  keepCurrentModel
                  language={activeFile === 'styles.css' ? 'css' : 'typescript'}
                  theme="vs-dark"
                  value={files[activeFile] ?? ''}
                  onChange={(value) => {
                    const nextValue = value ?? '';
                    setFiles((current) =>
                      current[activeFile] === nextValue
                        ? current
                        : { ...current, [activeFile]: nextValue },
                    );
                  }}
                  onMount={handleEditorMount}
                  options={{
                    readOnly: !eligible,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 12.5,
                    tabSize: 2,
                    padding: { top: 14, bottom: 14 },
                    wordWrap: 'off',
                  }}
                />
              </div>
              {job?.diagnostics ? (
                <details className="pro-diagnostics" open={job.status === 'failed'}>
                  <summary>{t.diagnostics}</summary>
                  <pre>{job.diagnostics}</pre>
                </details>
              ) : null}
            </section>
          </Panel>
          <PanelResizeHandle
            className="pro-resize-handle"
            aria-label={locale === 'ar' ? 'غيّر عرض لوحة الكود' : 'Resize code panel'}
          />
          <Panel
            defaultSize={28}
            minSize={22}
            id={`pro-${slug}-panel-preview`}
            role="tabpanel"
            aria-labelledby={`pro-${slug}-tab-preview`}
            className="pro-panel pro-preview-panel"
            data-mobile-active={mobileTab === 'preview' ? '' : undefined}
          >
            <section className="pro-panel-shell">
              <div className="pro-preview-header">
                <PanelHeading icon={<Eye />} title={t.preview} />
                {workspaceState.builtRevision ? (
                  <Link target="_blank" href={`/account/${encodeURIComponent(slug)}/pro-preview`}>
                    {t.viewFull}
                    <ArrowUpRight />
                  </Link>
                ) : null}
              </div>
              <div className="pro-preview-status" data-ready={previewCurrent ? '' : undefined}>
                {jobActive ? (
                  <>
                    <MobiusLoopIcon active />
                    {job ? t.statuses[job.status] : t.building}
                  </>
                ) : previewCurrent ? (
                  <>
                    <Check />
                    {isPublishedRevision ? t.published : t.ready}
                  </>
                ) : job?.status === 'failed' ? (
                  <>
                    <CircleAlert />
                    {t.buildFailed}
                  </>
                ) : (
                  <>
                    <Hammer />
                    {workspaceState.builtRevision ? t.outdated : t.noPreview}
                  </>
                )}
              </div>
              <div className="pro-preview-frame">
                {workspaceState.builtRevision ? (
                  <iframe
                    key={workspaceState.builtRevision}
                    src={`/account/${encodeURIComponent(slug)}/pro-preview`}
                    title={`${businessName} Pro preview`}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div>
                    <Eye />
                    <p>{t.noPreview}</p>
                  </div>
                )}
              </div>
            </section>
          </Panel>
        </PanelGroup>
      </div>

      <footer className="pro-builder-footer">
        <WorkbenchStateStrip
          locale={locale}
          dirty={dirty}
          saving={saving}
          conflict={conflict}
          job={job}
          runnerFailed={Boolean(job && runnerErrorJobId === job.id)}
          previewCurrent={previewCurrent}
          hasPreview={Boolean(workspaceState.builtRevision)}
        />
        <div className="pro-builder-actions">
          <button
            type="button"
            className="secondary"
            disabled={!eligible || jobActive || saving || conflict}
            onClick={() => void buildPreview()}
          >
            {jobActive ? <MobiusLoopIcon active /> : <Hammer />}
            {jobActive ? t.building : t.build}
          </button>
          <button
            type="button"
            className="primary"
            disabled={!publishReady || publishing || jobActive || dirty}
            onClick={() => void publish()}
          >
            {publishing ? <LoaderCircle className="pro-spin" /> : <UploadCloud />}
            {publishing ? t.publishing : t.publish}
          </button>
        </div>
      </footer>
      <style>{styles}</style>
    </div>
  );
}

function WorkbenchStateStrip({
  locale,
  dirty,
  saving,
  conflict,
  job,
  runnerFailed,
  previewCurrent,
  hasPreview,
}: {
  locale: Locale;
  dirty: boolean;
  saving: boolean;
  conflict: boolean;
  job: ProJobSnapshot | null;
  runnerFailed: boolean;
  previewCurrent: boolean;
  hasPreview: boolean;
}) {
  const t = COPY[locale];
  const active = Boolean(job && !TERMINAL.has(job.status) && !runnerFailed);
  const failed = runnerFailed || job?.status === 'failed';
  const state = conflict
    ? 'failed'
    : active
      ? 'building'
      : failed
        ? 'failed'
        : dirty || saving
          ? 'outdated'
          : previewCurrent
            ? 'ready'
            : hasPreview
              ? 'outdated'
              : 'saved';
  const label =
    state === 'building' && job
      ? t.statuses[job.status]
      : saving
        ? t.saving
        : dirty
          ? t.unsaved
          : state === 'failed' && conflict
            ? t.conflict
            : t.state[state];

  return (
    <div className="pro-state-strip" data-state={state} role="status" aria-live="polite">
      {state === 'building' ? (
        <MobiusLoopIcon active />
      ) : state === 'ready' ? (
        <Check aria-hidden />
      ) : state === 'failed' ? (
        <CircleAlert aria-hidden />
      ) : state === 'saved' ? (
        <Save aria-hidden />
      ) : (
        <Hammer aria-hidden />
      )}
      <strong>{label}</strong>
    </div>
  );
}

function PanelHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="pro-panel-heading">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function JobCard({
  job,
  locale,
  canRetry,
  runnerFailed,
  onRetry,
}: {
  job: ProJobSnapshot | null;
  locale: Locale;
  canRetry: boolean;
  runnerFailed: boolean;
  onRetry: () => void;
}) {
  if (!job) return null;
  const t = COPY[locale];
  return (
    <div className="pro-job-card" data-status={runnerFailed ? 'failed' : job.status}>
      {runnerFailed || TERMINAL.has(job.status) ? (
        job.status === 'succeeded' ? (
          <Check />
        ) : (
          <CircleAlert />
        )
      ) : (
        <MobiusLoopIcon active />
      )}
      <div>
        <strong>{runnerFailed ? t.buildFailed : t.statuses[job.status]}</strong>
        {runnerFailed ? (
          <p>{t.runnerFailed}</p>
        ) : job.errorMessage ? (
          <p>{job.errorMessage}</p>
        ) : null}
        {(runnerFailed || job.status === 'failed') && canRetry ? (
          <button type="button" onClick={onRetry}>
            {t.retry}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const styles = `
  .pro-builder{min-height:100dvh;height:100dvh;display:flex;flex-direction:column;background:${INK};color:${CREAM};overflow:hidden}.pro-builder-header{min-height:54px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 16px;border-bottom:1px solid rgba(242,233,216,.14);background:#0e0c0a}.pro-builder-brand,.pro-builder-nav,.pro-builder-nav>a,.pro-mode-toggle{display:flex;align-items:center;gap:10px;min-width:0}.pro-builder-brand>span{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#1d1914;color:${GOLD}}.pro-builder-brand>b{color:${GOLD};font:800 10px/1 var(--font-mono);letter-spacing:.17em;text-transform:uppercase}.pro-builder-brand>strong{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;unicode-bidi:plaintext}.pro-builder-brand>small{padding:4px 9px;border:1px solid rgba(212,176,106,.4);border-radius:999px;color:#dbc38e;font-size:10px;white-space:nowrap}.pro-builder-nav>a{color:#c9beac;text-decoration:none;font-size:11px;font-weight:650}.pro-builder-nav>a svg{width:12px}.pro-mode-toggle{gap:2px;padding:2px;border:1px solid rgba(242,233,216,.14);border-radius:999px}.pro-mode-toggle button{border:0;border-radius:999px;background:transparent;color:#9e9486;padding:5px 10px;font-size:10px;font-weight:750;cursor:pointer}.pro-mode-toggle button[data-active]{background:${GOLD};color:${INK}}
  .pro-builder-readonly{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid rgba(212,176,106,.3);background:rgba(212,176,106,.08)}.pro-builder-readonly>svg{width:18px;color:${GOLD}}.pro-builder-readonly>div{flex:1}.pro-builder-readonly strong{font-size:12px}.pro-builder-readonly p{display:inline;margin-inline-start:8px;color:#b9ad9d;font-size:11px}.pro-builder-readonly a{color:${GOLD};font-size:11px;font-weight:700}
  .pro-state-strip{min-height:34px;display:flex;align-items:center;gap:8px;padding:6px 14px;border-bottom:1px solid rgba(242,233,216,.1);background:#12100d;color:#a99e8e}.pro-state-strip>svg{width:14px;height:14px;flex:none}.pro-state-strip>strong{min-width:112px;color:#d8cebd;font-size:10px}.pro-state-strip>span{height:1px;flex:1;background:rgba(242,233,216,.1)}.pro-state-strip>small{position:relative;color:#766d62;font:650 8px/1 var(--font-mono);white-space:nowrap}.pro-state-strip[data-state='saved']>small:nth-of-type(1),.pro-state-strip[data-state='outdated']>small:nth-of-type(2),.pro-state-strip[data-state='building']>small:nth-of-type(3),.pro-state-strip[data-state='failed']>small:nth-of-type(4),.pro-state-strip[data-state='ready']>small:nth-of-type(5){color:${GOLD}}.pro-state-strip[data-state='building']>svg{color:${GOLD}}.pro-state-strip[data-state='failed']{color:#e0988f}.pro-state-strip[data-state='ready']{color:#7ac996}
  .pro-workbench{flex:1;min-height:0}.pro-workbench>[data-panel-group]{height:100%}.pro-panel{min-width:0;background:#11100e}.pro-resize-handle{width:5px;background:#090806;border-inline:1px solid rgba(242,233,216,.1);transition:background 150ms}.pro-resize-handle:hover,.pro-resize-handle[data-resize-handle-active]{background:${GOLD}}.pro-panel-shell{height:100%;min-height:0;display:flex;flex-direction:column}.pro-panel-heading{height:42px;display:flex;align-items:center;gap:7px;padding:0 12px}.pro-panel-heading>svg{width:14px;color:${GOLD}}.pro-panel-heading h2{margin:0;font-size:11px;letter-spacing:.06em}.pro-agent-content{display:flex;flex:1;min-height:0;flex-direction:column;gap:12px;padding:4px 12px 14px;overflow:auto}.pro-agent-content>p{margin:0;color:#a99e8e;font-size:11.5px;line-height:1.6}.pro-agent-content textarea{min-height:150px;resize:vertical;border:1px solid rgba(242,233,216,.14);border-radius:10px;background:#0b0a08;color:${CREAM};padding:11px;font:500 11.5px/1.6 var(--font-sans);outline:none}.pro-agent-content textarea:focus{border-color:${GOLD};box-shadow:0 0 0 2px rgba(212,176,106,.12)}.pro-agent-content>button,.pro-builder-footer button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid ${GOLD};border-radius:9px;background:${GOLD};color:${INK};padding:9px 12px;font-size:11px;font-weight:800;cursor:pointer}.pro-agent-content>button:disabled,.pro-builder-footer button:disabled{opacity:.45;cursor:not-allowed}.pro-agent-content>button svg,.pro-builder-footer button svg{width:14px}.pro-message{display:flex;gap:7px;color:#e0988f;font-size:11px;line-height:1.5}.pro-message svg{width:14px;flex:none}.pro-job-card{display:flex;gap:9px;padding:10px;border:1px solid rgba(242,233,216,.12);border-radius:9px;color:#bdb1a1}.pro-job-card[data-status='succeeded']{border-color:rgba(88,180,120,.4);color:#7ac996}.pro-job-card[data-status='failed']{border-color:rgba(220,91,78,.4);color:#e0988f}.pro-job-card>svg{width:15px;flex:none}.pro-job-card strong{font-size:11px}.pro-job-card p{margin:4px 0 0;font-size:10px;line-height:1.5}.pro-job-card button{margin-top:8px;border:1px solid currentColor;border-radius:999px;background:transparent;color:inherit;padding:5px 9px;font-size:10px;font-weight:750;cursor:pointer}
  .pro-message[data-tone='success']{color:#7ac996}
  .pro-agent-activity{display:grid;gap:7px}.pro-agent-activity>h3{margin:2px 0 0;color:#857b6e;font:750 8.5px/1 var(--font-mono);letter-spacing:.11em;text-transform:uppercase}.pro-agent-activity>p{margin:0;padding:10px;border:1px dashed rgba(242,233,216,.12);border-radius:9px;color:#766d62;font-size:10px;line-height:1.5}.pro-agent-activity .pro-message{padding:8px;border-radius:8px;background:rgba(220,91,78,.06)}
  .pro-code-header,.pro-preview-header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(242,233,216,.1)}.pro-save-state{display:flex;align-items:center;gap:5px;padding-inline-end:12px;color:#9e9486;font-size:10px}.pro-save-state[data-conflict]{color:#e0988f}.pro-save-state svg{width:12px}.pro-file-tabs{display:flex;gap:1px;padding:5px 7px;border-bottom:1px solid rgba(242,233,216,.1);background:#0b0a08;overflow:auto}.pro-file-tabs button{border:0;border-radius:6px;background:transparent;color:#8f8578;padding:6px 10px;font:600 10px/1 var(--font-mono);cursor:pointer}.pro-file-tabs button[data-active]{background:#252018;color:${CREAM}}.pro-monaco{flex:1;min-height:0}.pro-monaco>section,.pro-monaco>.monaco-editor{height:100%!important}.pro-editor-loading{height:100%;background:#0c0b09}.pro-diagnostics{max-height:150px;border-top:1px solid rgba(220,91,78,.3);background:#160e0c}.pro-diagnostics summary{padding:8px 12px;color:#e0988f;font-size:10px;cursor:pointer}.pro-diagnostics pre{margin:0;padding:0 12px 12px;overflow:auto;white-space:pre-wrap;color:#d8b0aa;font:500 10px/1.5 var(--font-mono)}
  .pro-conflict-recovery{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(220,91,78,.28);background:#190f0d;color:#e0988f}.pro-conflict-recovery>svg{width:14px}.pro-conflict-recovery p{margin:0;font-size:9.5px;line-height:1.4}.pro-conflict-recovery button{display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(224,152,143,.42);border-radius:7px;background:transparent;color:#e7b0a9;padding:6px 7px;font-size:8.5px;font-weight:750;cursor:pointer;white-space:nowrap}.pro-conflict-recovery button:focus-visible{outline:2px solid #e0988f;outline-offset:2px}.pro-conflict-recovery button svg{width:11px}
  .pro-preview-header>a{display:flex;align-items:center;gap:4px;margin-inline-end:12px;color:#bdb1a1;text-decoration:none;font-size:10px}.pro-preview-header>a svg{width:11px}.pro-preview-status{min-height:34px;display:flex;align-items:center;gap:7px;padding:7px 11px;border-block:1px solid rgba(242,233,216,.08);color:#b5aa9b;font-size:10.5px}.pro-preview-status[data-ready]{color:#7ac996}.pro-preview-status svg{width:13px}.pro-preview-frame{flex:1;min-height:0;padding:10px;background:#090806}.pro-preview-frame iframe{width:100%;height:100%;border:1px solid rgba(242,233,216,.12);border-radius:8px;background:white}.pro-preview-frame>div{height:100%;display:grid;place-content:center;justify-items:center;gap:10px;border:1px dashed rgba(242,233,216,.16);border-radius:8px;color:#857b6e;text-align:center}.pro-preview-frame>div svg{width:24px}.pro-preview-frame>div p{max-width:250px;margin:0;font-size:11px;line-height:1.5}
  .pro-builder-footer{min-height:54px;display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:8px 14px;border-top:1px solid rgba(242,233,216,.14);background:#0e0c0a}.pro-builder-actions{display:flex;align-items:center;gap:7px;margin-inline-start:auto}.pro-builder-footer button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid ${GOLD};border-radius:9px;background:${GOLD};color:${INK};padding:9px 12px;font-size:11px;font-weight:800;cursor:pointer}.pro-builder-footer button:disabled{opacity:.45;cursor:not-allowed}.pro-builder-footer button svg{width:14px}.pro-builder-footer button.secondary{border-color:rgba(242,233,216,.2);background:transparent;color:${CREAM}}.pro-mobile-tabs{display:none}.pro-spin{animation:pro-spin 1s linear infinite}@keyframes pro-spin{to{transform:rotate(360deg)}}
  .pro-builder{background:#0b0a09}.pro-builder-header{min-height:46px;padding:6px 10px;border-color:rgba(242,233,216,.09);background:#0b0a09}.pro-builder-brand{gap:7px}.pro-builder-brand>span{width:24px;height:24px;border-radius:6px;background:#171410}.pro-builder-brand>span svg{width:14px;height:14px}.pro-builder-brand>b{font-size:9px;letter-spacing:.13em}.pro-builder-brand>strong{font-size:11px;font-weight:650}.pro-builder-brand>strong:before{content:'/';margin-inline-end:7px;color:#5e574f}.pro-builder-brand>small{padding:0;border:0;border-radius:0;color:#766e63;font-size:9px}.pro-builder-nav{gap:5px}.pro-builder-nav>a{min-height:28px;padding:0 7px;border-radius:6px;color:#92897d;font-size:9.5px}.pro-builder-nav>a:hover{background:rgba(242,233,216,.055);color:${CREAM}}.pro-mode-toggle{border-color:rgba(242,233,216,.1);border-radius:7px;padding:2px}.pro-mode-toggle button{border-radius:5px;padding:4px 8px;font-size:9px}.pro-mode-toggle button[data-active]{background:#29231b;color:#ead7ac}.pro-workbench{background:#090807}.pro-panel{background:#0f0e0c}.pro-resize-handle{width:3px;border:0;background:#090807}.pro-resize-handle:hover,.pro-resize-handle[data-resize-handle-active]{background:rgba(212,176,106,.7)}.pro-panel-heading{height:36px;padding:0 10px}.pro-panel-heading>svg{width:12px;color:#766e63}.pro-panel-heading h2{font-size:9.5px;letter-spacing:.02em}.pro-agent-panel{background:#0d0c0a}.pro-agent-content{gap:10px;padding:2px 9px 9px}.pro-agent-content>p{padding:0 2px 9px;border-bottom:1px solid rgba(242,233,216,.07);color:#81786d;font-size:10px;line-height:1.5}.pro-agent-activity{gap:6px}.pro-agent-activity>h3{margin:0;color:#6e665d;font-size:8px;letter-spacing:.07em;text-transform:none}.pro-agent-activity>p{padding:8px;border:0;border-radius:6px;background:rgba(242,233,216,.025);font-size:9px}.pro-job-card{padding:8px;border-color:transparent;border-radius:7px;background:rgba(242,233,216,.035)}.pro-job-card[data-status='failed']{border-color:rgba(220,91,78,.22);background:rgba(220,91,78,.045)}.pro-job-card[data-status='succeeded']{border-color:rgba(88,180,120,.2);background:rgba(88,180,120,.035)}.pro-code-header,.pro-preview-header{min-height:36px;border-color:rgba(242,233,216,.075)}.pro-file-tabs{height:35px;align-items:center;padding:3px 6px;border-color:rgba(242,233,216,.075);background:#0b0a09}.pro-file-tabs button{border-radius:5px;padding:6px 9px;font-size:9px}.pro-file-tabs button[data-active]{background:#211d17}.pro-save-state{font-size:9px}.pro-preview-status{min-height:30px;padding:5px 9px;border-block-start:0;font-size:9.5px}.pro-preview-frame{padding:6px}.pro-preview-frame iframe,.pro-preview-frame>div{border-radius:4px}.pro-builder-footer{min-height:44px;padding:6px 9px;border-color:rgba(242,233,216,.09);background:#0b0a09}.pro-state-strip{min-height:30px;padding:0 5px;border:0;background:transparent;gap:6px}.pro-state-strip>strong{min-width:0;font-size:9px;font-weight:650}.pro-state-strip>svg{width:12px;height:12px}.pro-builder-actions{gap:5px}.pro-builder-footer button{min-height:31px;border-radius:6px;padding:6px 10px;font-size:9.5px}.pro-builder-footer button.secondary{border-color:rgba(242,233,216,.13);background:#151310}.pro-builder-footer button.primary{border-color:#caa65f;background:#caa65f}
  @media(max-width:900px){.pro-builder-header{align-items:center;flex-wrap:nowrap;min-height:48px}.pro-builder-brand{width:auto;flex:1}.pro-builder-brand>strong{max-width:110px}.pro-builder-brand>small{display:none}.pro-builder-nav{width:auto;justify-content:flex-end}.pro-builder-nav>a{display:none}.pro-builder-readonly{align-items:flex-start;flex-wrap:wrap}.pro-builder-readonly p{display:block;margin:3px 0 0}.pro-state-strip>strong{min-width:0}.pro-mobile-tabs{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid rgba(242,233,216,.09)}.pro-mobile-tabs button{display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-inline-end:1px solid rgba(242,233,216,.07);background:#0b0a09;color:#8f8578;padding:8px;font-size:9.5px}.pro-mobile-tabs button[data-active]{color:${GOLD};background:#15120f}.pro-mobile-tabs svg{width:12px}.pro-workbench>[data-panel-group]{display:block!important}.pro-panel{display:none!important;width:100%!important;height:100%!important}.pro-panel[data-mobile-active]{display:block!important}.pro-resize-handle{display:none}.pro-conflict-recovery{grid-template-columns:auto minmax(0,1fr)}.pro-conflict-recovery button{justify-content:center}.pro-builder-footer{align-items:center;flex-wrap:nowrap}.pro-builder-actions{width:auto;display:flex}.pro-builder-footer button{width:auto}.pro-builder-footer button span{display:none}}
  @media(max-width:900px){.pro-builder-nav>a{display:flex;padding-inline:4px;font-size:8.5px}}
  @media(prefers-reduced-motion:reduce){.pro-spin{animation:none}}
`;
