'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import type { OnMount } from '@monaco-editor/react';
import {
  Archive,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Code2,
  Eye,
  FileCode2,
  Hammer,
  History,
  Home,
  Laptop,
  LayoutTemplate,
  LoaderCircle,
  Menu,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Smartphone,
  Sparkles,
  Store,
  Tablet,
  UploadCloud,
  X,
} from 'lucide-react';
import type { Locale } from '@/i18n/locales';
import type { ProAiPreferences } from '@/lib/pro/modelCatalog';
import {
  getProSessionEventLabel,
  type ProJobSnapshot,
  type ProPromptIntent,
  type ProPromptTarget,
  type ProSessionEventSnapshot,
  type ProSessionSnapshot,
  type ProWorkspaceSnapshot,
} from '@/lib/proMode';
import type { SouqySourceFiles } from '@/lib/souqy/source';
import { getProGenerationProgress } from '@/lib/pro/generationProgress';
import { MobiusLoopIcon } from '@/components/mobius-loop-icon';
import { ProAiComposer } from '@/components/account/pro/ProAiComposer';
import {
  ProInstantPreview,
  type InstantDraftStatus,
} from '@/components/account/pro/ProInstantPreview';
import styles from './ProIdeV2.module.css';

const MonacoEditor = dynamic(() => import('./ProMonacoEditor').then((module) => module.default), {
  ssr: false,
  loading: () => <div className={styles.editorLoading} />,
});

const FILES: Array<keyof SouqySourceFiles> = ['index.tsx', 'theme.ts', 'styles.css'];
const GENERATION_STEPS = [1, 2, 3, 4] as const;

const COPY = {
  en: {
    home: 'Home',
    newSession: 'New session',
    recent: 'Recent sessions',
    history: 'History',
    code: 'Souqna Code',
    easy: 'Easy mode',
    account: 'Account',
    foundations: 'Foundations',
    greeting: (name: string) => `What should we build for ${name}?`,
    homeBody:
      'Describe the storefront change. Souqy will edit a private draft and prepare a reviewable preview.',
    target: 'Target',
    intent: 'Intent',
    targets: { storefront: 'Storefront', hero: 'Hero', catalog: 'Catalog', mobile: 'Mobile' },
    intents: { redesign: 'Redesign', improve: 'Improve', fix: 'Fix', arabic: 'Arabic first' },
    suggestions: [
      'Redesign the hero with stronger product focus and clearer hierarchy.',
      'Improve product discovery and make the catalog easier to scan.',
      'Fix mobile spacing and make every action comfortable to tap.',
      'Create an Arabic-first direction with intentional RTL composition.',
    ],
    preview: 'Preview',
    activity: 'Souqy',
    build: 'Build preview',
    building: 'Building',
    publish: 'Publish',
    publishing: 'Publishing',
    fullPreview: 'Full preview',
    noPreview: 'Build the draft to create a private preview.',
    ready: 'Preview ready',
    outdated: 'Preview is behind the current draft',
    published: 'Published revision',
    saved: 'Saved',
    saving: 'Saving',
    unsaved: 'Unsaved',
    conflict: 'Draft conflict',
    conflictBody: 'Another tab saved a newer draft. Choose which version should remain.',
    keepLocal: 'Keep mine',
    loadServer: 'Load server',
    emptyTimeline: 'Your prompts, builds, and publishes will appear here.',
    invalidSession: 'That session is unavailable for this storefront. Pro Home is open instead.',
    readonly: 'This Pro workspace is read-only. Your published storefront remains online.',
    earlier: 'Earlier activity',
    retry: 'Retry',
    menu: 'Open navigation',
    close: 'Close navigation',
    timelineOpen: 'Open Souqy timeline',
    timelineClose: 'Close Souqy timeline',
    selectStore: 'Select storefront',
    device: 'Preview device',
    instant: 'Instant Draft',
    verified: 'Verified Preview',
    instantStatus: {
      starting: 'Starting',
      compiling: 'Compiling',
      rendered: 'Rendered',
      error: 'Runtime error',
    },
    openEditor: 'Open code drawer',
    closeEditor: 'Close code drawer',
    rename: 'Rename session',
    archive: 'Archive session',
    archiveConfirm: 'Archive this session? It will reopen read-only.',
    archived: 'Archived',
    status: {
      queued: 'Queued',
      generating: 'Generating',
      validating: 'Validating',
      building: 'Building',
      repairing: 'Repairing',
      succeeded: 'Preview ready',
      failed: 'Failed',
    },
    generation: {
      reading: ['Reading your storefront', 'Reviewing the current draft and store structure'],
      designing: ['Shaping the design', 'Turning your request into a clear storefront direction'],
      building: ['Building your update', 'Writing and checking the new storefront code'],
      repairing: ['Refining your update', 'Correcting the draft before it reaches your canvas'],
      rendering: ['Rendering your preview', 'Preparing the updated storefront for review'],
    },
  },
  ar: {
    home: 'الرئيسية',
    newSession: 'جلسة جديدة',
    recent: 'الجلسات الأخيرة',
    history: 'السجل',
    code: 'كود سوقنا',
    easy: 'الوضع السهل',
    account: 'الحساب',
    foundations: 'الأساسات',
    greeting: (name: string) => `ماذا سنبني لمتجر ${name}؟`,
    homeBody: 'صف التغيير المطلوب. سيعدّل سوقي مسودة خاصة ويبني معاينة جاهزة للمراجعة.',
    target: 'النطاق',
    intent: 'الهدف',
    targets: { storefront: 'المتجر', hero: 'الواجهة', catalog: 'الكتالوج', mobile: 'الجوال' },
    intents: { redesign: 'إعادة تصميم', improve: 'تحسين', fix: 'إصلاح', arabic: 'العربية أولًا' },
    suggestions: [
      'أعد تصميم الواجهة مع تركيز أقوى على المنتجات وتسلسل أوضح.',
      'حسّن اكتشاف المنتجات واجعل تصفح الكتالوج أسهل.',
      'أصلح مساحات الجوال واجعل جميع الأزرار مريحة للمس.',
      'أنشئ اتجاهًا عربيًا أولًا بتكوين RTL مقصود.',
    ],
    preview: 'المعاينة',
    activity: 'سوقي',
    build: 'ابنِ المعاينة',
    building: 'جارٍ البناء',
    publish: 'انشر',
    publishing: 'جارٍ النشر',
    fullPreview: 'المعاينة الكاملة',
    noPreview: 'ابنِ المسودة لإنشاء معاينة خاصة.',
    ready: 'المعاينة جاهزة',
    outdated: 'المعاينة أقدم من المسودة الحالية',
    published: 'الإصدار منشور',
    saved: 'محفوظ',
    saving: 'جارٍ الحفظ',
    unsaved: 'غير محفوظ',
    conflict: 'تعارض في المسودة',
    conflictBody: 'حفظت علامة تبويب أخرى مسودة أحدث. اختر النسخة التي تريد الاحتفاظ بها.',
    keepLocal: 'احتفظ بنسختي',
    loadServer: 'حمّل نسخة الخادم',
    emptyTimeline: 'ستظهر طلباتك وعمليات البناء والنشر هنا.',
    invalidSession: 'هذه الجلسة غير متاحة لهذا المتجر. تم فتح الرئيسية بدلًا منها.',
    readonly: 'مساحة برو هذه للعرض فقط. يبقى متجرك المنشور متصلًا.',
    earlier: 'نشاط سابق',
    retry: 'أعد المحاولة',
    menu: 'افتح التنقل',
    close: 'أغلق التنقل',
    timelineOpen: 'افتح سجل سوقي',
    timelineClose: 'أغلق سجل سوقي',
    selectStore: 'اختر المتجر',
    device: 'جهاز المعاينة',
    instant: 'المسودة الفورية',
    verified: 'المعاينة الموثقة',
    instantStatus: {
      starting: 'جارٍ التشغيل',
      compiling: 'جارٍ الترجمة',
      rendered: 'ظاهرة',
      error: 'خطأ في التشغيل',
    },
    openEditor: 'افتح درج الكود',
    closeEditor: 'أغلق درج الكود',
    rename: 'غيّر اسم الجلسة',
    archive: 'أرشف الجلسة',
    archiveConfirm: 'أرشفة هذه الجلسة؟ ستُفتح بعد ذلك للقراءة فقط.',
    archived: 'مؤرشفة',
    status: {
      queued: 'في الانتظار',
      generating: 'جارٍ التوليد',
      validating: 'جارٍ الفحص',
      building: 'جارٍ البناء',
      repairing: 'جارٍ الإصلاح',
      succeeded: 'المعاينة جاهزة',
      failed: 'فشل',
    },
    generation: {
      reading: ['يراجع متجرك', 'يفهم المسودة الحالية وبنية المتجر'],
      designing: ['يصوغ التصميم', 'يحوّل طلبك إلى اتجاه واضح للمتجر'],
      building: ['يبني التعديل', 'يكتب كود المتجر الجديد ويفحصه'],
      repairing: ['ينقّح التعديل', 'يصحّح المسودة قبل عرضها على اللوحة'],
      rendering: ['يجهّز المعاينة', 'يعرض نسخة المتجر المحدّثة للمراجعة'],
    },
  },
} as const;

type View = 'home' | 'preview' | 'code';
type Device = 'desktop' | 'tablet' | 'mobile';

type Props = {
  locale: Locale;
  slug: string;
  businessName: string;
  storefronts: Array<{ slug: string; businessName: string }>;
  workspace: ProWorkspaceSnapshot;
  job: ProJobSnapshot | null;
  sessions: ProSessionSnapshot[];
  activeSession: ProSessionSnapshot | null;
  sessionEvents: ProSessionEventSnapshot[];
  earlierJobs: ProJobSnapshot[];
  invalidSession: boolean;
  view: View;
  files: SouqySourceFiles;
  activeFile: keyof SouqySourceFiles;
  prompt: string;
  aiPreferences: ProAiPreferences;
  eligible: boolean;
  dirty: boolean;
  saving: boolean;
  conflict: boolean;
  publishing: boolean;
  jobActive: boolean;
  previewCurrent: boolean;
  publishReady: boolean;
  published: boolean;
  message: string | null;
  runnerFailed: boolean;
  codeRuntimeEnabled: boolean;
  onViewChange: (view: View) => void;
  onPromptChange: (value: string) => void;
  onPreferencesChange: (value: ProAiPreferences) => void;
  onSubmit: (request: string, target: ProPromptTarget, intent: ProPromptIntent) => void;
  onBuild: () => void;
  onPublish: () => void;
  onRetry: () => void;
  onFileChange: (name: keyof SouqySourceFiles) => void;
  onSourceChange: (name: keyof SouqySourceFiles, value: string) => void;
  onEditorMount: OnMount;
  onKeepLocal: () => void;
  onLoadServer: () => void;
  onHome: () => void;
  onNewSession: () => void;
  onOpenSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onArchiveSession: (sessionId: string) => void;
  onStoreChange: (slug: string) => void;
  onEasy: () => void;
};

export function ProIdeV2(props: Props) {
  const { locale } = props;
  const t = COPY[locale];
  const isRtl = locale === 'ar';
  const [device, setDevice] = React.useState<Device>('desktop');
  const [target, setTarget] = React.useState<keyof typeof t.targets>('storefront');
  const [intent, setIntent] = React.useState<keyof typeof t.intents>('redesign');
  const [timelineOpen, setTimelineOpen] = React.useState(false);
  const [codeDrawerOpen, setCodeDrawerOpen] = React.useState(false);
  const [instantStatus, setInstantStatus] = React.useState<InstantDraftStatus>('starting');
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const isHome = props.view === 'home' || !props.activeSession;

  function submitPrompt() {
    const request = props.prompt.trim();
    if (!request) return;
    props.onSubmit(request, target, intent);
  }

  return (
    <div
      className={`${styles.root} ${isHome ? styles.homeTheme : styles.workspaceTheme}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-view={props.view}
      data-workspace={!isHome ? '' : undefined}
    >
      <Sidebar
        {...props}
        t={t}
        isHome={isHome}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <main className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.mobileMenu}
            aria-label={mobileNavOpen ? t.close : t.menu}
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            {mobileNavOpen ? <X /> : <Menu />}
          </button>
          <div className={styles.topIdentity}>
            <strong>{props.activeSession?.title ?? t.home}</strong>
            {!isHome ? (
              <SaveState
                t={t}
                dirty={props.dirty}
                saving={props.saving}
                conflict={props.conflict}
              />
            ) : null}
          </div>
          {!isHome ? (
            <div className={styles.topActions}>
              <Link
                href={`/account/${encodeURIComponent(props.slug)}/pro-preview`}
                target="_blank"
                className={styles.ghostAction}
              >
                <ArrowUpRight />
                <span>{t.fullPreview}</span>
              </Link>
              <button
                type="button"
                className={styles.ghostAction}
                disabled={!props.eligible || props.jobActive || props.saving || props.conflict}
                onClick={props.onBuild}
              >
                {props.jobActive ? <MobiusLoopIcon active /> : <Hammer />}
                <span>{props.jobActive ? t.building : t.build}</span>
              </button>
              <button
                type="button"
                className={styles.publishAction}
                disabled={!props.publishReady || props.publishing || props.jobActive || props.dirty}
                onClick={props.onPublish}
              >
                {props.publishing ? <LoaderCircle className={styles.spin} /> : <UploadCloud />}
                <span>{props.publishing ? t.publishing : t.publish}</span>
              </button>
            </div>
          ) : null}
        </header>

        {!props.eligible ? <div className={styles.readonly}>{t.readonly}</div> : null}
        {props.invalidSession && isHome ? (
          <div className={styles.routeError} role="alert">
            <CircleAlert />
            {t.invalidSession}
          </div>
        ) : null}

        {isHome ? (
          <section className={styles.homeStage}>
            <div className={styles.homeMark} aria-hidden>
              <MobiusLoopIcon />
            </div>
            <div className={styles.homeCopy}>
              <h1>{t.greeting(props.businessName)}</h1>
              <p>{t.homeBody}</p>
            </div>
            <div className={styles.homeComposer}>
              <ProAiComposer
                locale={locale}
                value={props.prompt}
                preferences={props.aiPreferences}
                disabled={!props.eligible}
                generating={props.jobActive}
                jobStatus={props.job?.status}
                variant="home"
                onValueChange={props.onPromptChange}
                onPreferencesChange={props.onPreferencesChange}
                onSubmit={submitPrompt}
              />
              <div className={styles.promptContext}>
                <label>
                  <span>{t.target}</span>
                  <select
                    value={target}
                    onChange={(event) => setTarget(event.target.value as typeof target)}
                  >
                    {Object.entries(t.targets).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden />
                </label>
                <label>
                  <span>{t.intent}</span>
                  <select
                    value={intent}
                    onChange={(event) => setIntent(event.target.value as typeof intent)}
                  >
                    {Object.entries(t.intents).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden />
                </label>
              </div>
            </div>
            <div className={styles.suggestions}>
              {t.suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => props.onPromptChange(suggestion)}
                >
                  {index === 0 ? (
                    <LayoutTemplate />
                  ) : index === 1 ? (
                    <Store />
                  ) : index === 2 ? (
                    <Smartphone />
                  ) : (
                    <Sparkles />
                  )}
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.workspaceStage}>
            <div className={styles.workspaceToolbar}>
              <div className={styles.canvasIdentity}>
                <strong>{t.instant}</strong>
                <div
                  className={styles.previewState}
                  data-ready={instantStatus === 'rendered' ? '' : undefined}
                  data-error={instantStatus === 'error' ? '' : undefined}
                >
                  {instantStatus === 'starting' || instantStatus === 'compiling' ? (
                    <LoaderCircle className={styles.spin} />
                  ) : instantStatus === 'rendered' ? (
                    <Check />
                  ) : (
                    <CircleAlert />
                  )}
                  <span>{t.instantStatus[instantStatus]}</span>
                </div>
                <div
                  className={styles.previewState}
                  data-ready={props.previewCurrent ? '' : undefined}
                >
                  {props.jobActive && props.job ? (
                    <MobiusLoopIcon active />
                  ) : props.previewCurrent ? (
                    <Check />
                  ) : (
                    <Hammer />
                  )}
                  <span>
                    {props.jobActive && props.job
                      ? t.status[props.job.status]
                      : props.published
                        ? t.published
                        : props.previewCurrent
                          ? t.ready
                          : props.workspace.builtRevision
                            ? t.outdated
                            : t.verified}
                  </span>
                </div>
              </div>
              <div className={styles.deviceSwitch} role="group" aria-label={t.device}>
                {(['desktop', 'tablet', 'mobile'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={device === item}
                    data-active={device === item ? '' : undefined}
                    onClick={() => setDevice(item)}
                  >
                    {item === 'desktop' ? (
                      <Monitor />
                    ) : item === 'tablet' ? (
                      <Tablet />
                    ) : (
                      <Smartphone />
                    )}
                  </button>
                ))}
              </div>
              {props.view === 'code' ? (
                <button
                  type="button"
                  className={styles.drawerToggle}
                  aria-pressed={codeDrawerOpen}
                  aria-label={codeDrawerOpen ? t.closeEditor : t.openEditor}
                  onClick={() => {
                    setCodeDrawerOpen((current) => !current);
                    setTimelineOpen(false);
                  }}
                >
                  <FileCode2 />
                  <span>{codeDrawerOpen ? t.closeEditor : t.code}</span>
                </button>
              ) : null}
              <button
                type="button"
                className={styles.timelineToggle}
                aria-label={timelineOpen ? t.timelineClose : t.timelineOpen}
                onClick={() => {
                  setTimelineOpen((current) => !current);
                  setCodeDrawerOpen(false);
                }}
              >
                {timelineOpen ? <PanelRightClose /> : <PanelRightOpen />}
              </button>
            </div>

            <div
              className={styles.workArea}
              data-code={props.view === 'code' ? '' : undefined}
              data-timeline={timelineOpen && !codeDrawerOpen ? '' : undefined}
            >
              {props.view === 'code' ? (
                <CodeWorkspace
                  {...props}
                  t={t}
                  device={device}
                  editorOpen={codeDrawerOpen}
                  onInstantStatusChange={setInstantStatus}
                />
              ) : (
                <PreviewSurface {...props} t={t} device={device} />
              )}
              {timelineOpen && !codeDrawerOpen ? (
                <Timeline {...props} t={t} onClose={() => setTimelineOpen(false)} />
              ) : null}
            </div>

            <div className={styles.composerDock}>
              {props.jobActive ? (
                <GenerationIsland {...props} t={t} />
              ) : (
                <>
                  <ProAiComposer
                    locale={locale}
                    value={props.prompt}
                    preferences={props.aiPreferences}
                    disabled={!props.eligible}
                    generating={false}
                    jobStatus={props.job?.status}
                    variant="workspace"
                    onValueChange={props.onPromptChange}
                    onPreferencesChange={props.onPreferencesChange}
                    onSubmit={submitPrompt}
                  />
                  <div className={`${styles.promptContext} ${styles.workspacePromptContext}`}>
                    <label>
                      <span>{t.target}</span>
                      <select
                        value={target}
                        onChange={(event) => setTarget(event.target.value as typeof target)}
                      >
                        {Object.entries(t.targets).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden />
                    </label>
                    <label>
                      <span>{t.intent}</span>
                      <select
                        value={intent}
                        onChange={(event) => setIntent(event.target.value as typeof intent)}
                      >
                        {Object.entries(t.intents).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden />
                    </label>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>

      {!isHome ? (
        <nav
          className={styles.mobileTabs}
          aria-label={locale === 'ar' ? 'مساحة برو' : 'Pro workspace'}
        >
          <button type="button" onClick={props.onHome}>
            <Home />
            <span>{t.home}</span>
          </button>
          <button
            type="button"
            data-active={props.view === 'preview' ? '' : undefined}
            onClick={() => props.onViewChange('preview')}
          >
            <Eye />
            <span>{t.preview}</span>
          </button>
          <button type="button" onClick={() => setTimelineOpen(true)}>
            <Bot />
            <span>{t.activity}</span>
          </button>
          <button
            type="button"
            data-active={props.view === 'code' && codeDrawerOpen ? '' : undefined}
            onClick={() => {
              props.onViewChange('code');
              setTimelineOpen(false);
              setCodeDrawerOpen(true);
            }}
          >
            <Code2 />
            <span>{t.code}</span>
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function Sidebar(
  props: Props & {
    t: (typeof COPY)[Locale];
    isHome: boolean;
    mobileOpen: boolean;
    onCloseMobile: () => void;
  },
) {
  const { t } = props;
  return (
    <aside className={styles.sidebar} data-open={props.mobileOpen ? '' : undefined}>
      <div className={styles.brand}>
        <span aria-hidden>
          <MobiusLoopIcon />
        </span>
        <div>
          <b>Souqna Pro</b>
          <small>{props.businessName}</small>
        </div>
        <button
          type="button"
          className={styles.sidebarClose}
          onClick={props.onCloseMobile}
          aria-label={t.close}
        >
          <X />
        </button>
      </div>
      <label className={styles.storeSelect}>
        <Store aria-hidden />
        <span className="sr-only">{t.selectStore}</span>
        <select value={props.slug} onChange={(event) => props.onStoreChange(event.target.value)}>
          {props.storefronts.map((storefront) => (
            <option key={storefront.slug} value={storefront.slug}>
              {storefront.businessName}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden />
      </label>
      <button type="button" className={styles.newSession} onClick={props.onNewSession}>
        <Plus /> {t.newSession}
      </button>
      <nav className={styles.primaryNav}>
        <button type="button" data-active={props.isHome ? '' : undefined} onClick={props.onHome}>
          <Home />
          {t.home}
        </button>
        <button
          type="button"
          data-active={props.view === 'preview' ? '' : undefined}
          disabled={!props.activeSession}
          onClick={() => props.onViewChange('preview')}
        >
          <Eye />
          {t.preview}
        </button>
        <button
          type="button"
          data-active={props.view === 'code' ? '' : undefined}
          disabled={!props.activeSession}
          onClick={() => props.onViewChange('code')}
        >
          <FileCode2 />
          {t.code}
        </button>
        <button
          type="button"
          onClick={() => document.getElementById('pro-session-history')?.focus()}
        >
          <History />
          {t.history}
        </button>
      </nav>
      <section
        id="pro-session-history"
        tabIndex={-1}
        className={styles.sessionList}
        aria-label={t.recent}
      >
        <h2>
          <History />
          {t.recent}
        </h2>
        <div>
          {props.sessions.slice(0, 8).map((session) => (
            <div
              className={styles.sessionRow}
              key={session.id}
              data-archived={session.status === 'archived' ? '' : undefined}
            >
              <button
                type="button"
                data-active={props.activeSession?.id === session.id ? '' : undefined}
                onClick={() => props.onOpenSession(session.id)}
              >
                <span>{session.title}</span>
                <time dateTime={session.updatedAt}>
                  {session.status === 'archived'
                    ? t.archived
                    : formatSessionDate(session.updatedAt, props.locale)}
                </time>
              </button>
              <div className={styles.sessionActions}>
                {session.status === 'active' ? (
                  <button
                    type="button"
                    aria-label={t.rename}
                    onClick={() => {
                      const title = window.prompt(t.rename, session.title)?.trim();
                      if (title && title !== session.title)
                        props.onRenameSession(session.id, title);
                    }}
                  >
                    <Pencil />
                  </button>
                ) : null}
                {session.status === 'active' ? (
                  <button
                    type="button"
                    aria-label={t.archive}
                    onClick={() => {
                      if (window.confirm(t.archiveConfirm)) props.onArchiveSession(session.id);
                    }}
                  >
                    <Archive />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {!props.sessions.length ? <p>{t.emptyTimeline}</p> : null}
        </div>
      </section>
      <div className={styles.sidebarFoot}>
        <Link href={`/account/pro?store=${encodeURIComponent(props.slug)}&manage=foundations`}>
          <Settings2 />
          {t.foundations}
        </Link>
        <button type="button" onClick={props.onEasy}>
          <Laptop />
          {t.easy}
        </button>
        <Link href="/account">
          <Archive />
          {t.account}
        </Link>
      </div>
    </aside>
  );
}

function PreviewSurface(props: Props & { t: (typeof COPY)[Locale]; device: Device }) {
  const { t } = props;
  return (
    <div className={styles.previewSurface} data-device={props.device}>
      {props.workspace.builtRevision ? (
        <iframe
          key={props.workspace.builtRevision}
          src={`/account/${encodeURIComponent(props.slug)}/pro-preview`}
          title={`${props.businessName} Pro preview`}
          sandbox="allow-same-origin"
        />
      ) : (
        <div className={styles.emptyPreview}>
          <Eye />
          <strong>{t.noPreview}</strong>
          <button
            type="button"
            disabled={!props.eligible || props.jobActive}
            onClick={props.onBuild}
          >
            <Hammer />
            {t.build}
          </button>
        </div>
      )}
    </div>
  );
}

function CodeWorkspace(
  props: Props & {
    t: (typeof COPY)[Locale];
    device: Device;
    editorOpen: boolean;
    onInstantStatusChange: (status: InstantDraftStatus) => void;
  },
) {
  return (
    <div className={styles.codeWorkspace} data-editor-open={props.editorOpen ? '' : undefined}>
      <ProInstantPreview
        slug={props.slug}
        businessName={props.businessName}
        files={props.files}
        enabled={props.codeRuntimeEnabled}
        device={props.device}
        locale={props.locale}
        generationActive={props.jobActive}
        onStatusChange={props.onInstantStatusChange}
      />
      {props.editorOpen ? <CodeEditorSurface {...props} /> : null}
    </div>
  );
}

function GenerationIsland(props: Props & { t: (typeof COPY)[Locale] }) {
  const progress = getProGenerationProgress(props.job?.status ?? null);
  const [title, detail] = props.t.generation[progress.stage];

  return (
    <aside className={styles.generationIsland} role="status" aria-live="polite">
      <Image src={progress.asset} alt="" width={56} height={56} unoptimized aria-hidden />
      <span className={styles.generationFallback} aria-hidden />
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <div className={styles.generationSteps} aria-hidden>
        {GENERATION_STEPS.map((step) => (
          <i key={step} data-active={step <= progress.step ? '' : undefined} />
        ))}
      </div>
    </aside>
  );
}

function CodeEditorSurface(props: Props & { t: (typeof COPY)[Locale] }) {
  const { activeFile, files, onEditorMount, t } = props;
  const handleEditorMount = React.useCallback<OnMount>(
    (editor, monaco) => {
      const source = files[activeFile] ?? '';
      if (editor.getValue() !== source) editor.setValue(source);
      onEditorMount(editor, monaco);
      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
      window.requestAnimationFrame(() => {
        editor.layout();
        editor.revealLine(1);
      });
    },
    [activeFile, files, onEditorMount],
  );
  return (
    <section className={styles.codeSurface} dir="ltr">
      <div className={styles.fileTabs}>
        {FILES.map((name) => (
          <button
            key={name}
            type="button"
            data-active={props.activeFile === name ? '' : undefined}
            onClick={() => props.onFileChange(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {props.conflict ? (
        <div className={styles.conflictBox} role="alert">
          <CircleAlert />
          <div>
            <strong>{t.conflict}</strong>
            <p>{t.conflictBody}</p>
          </div>
          <button type="button" onClick={props.onKeepLocal}>
            <Save />
            {t.keepLocal}
          </button>
          <button type="button" onClick={props.onLoadServer}>
            <RefreshCw />
            {t.loadServer}
          </button>
        </div>
      ) : null}
      <div className={styles.editor}>
        <MonacoEditor
          path={`file:///${props.slug}/${props.activeFile}`}
          language={props.activeFile === 'styles.css' ? 'css' : 'typescript'}
          theme="vs-dark"
          defaultValue={props.files[props.activeFile] ?? ''}
          value={props.files[props.activeFile] ?? ''}
          onChange={(value) => props.onSourceChange(props.activeFile, value ?? '')}
          onMount={handleEditorMount}
          options={{
            readOnly: !props.eligible,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 12.5,
            tabSize: 2,
            padding: { top: 16, bottom: 16 },
            wordWrap: 'off',
          }}
        />
      </div>
      {props.job?.diagnostics ? (
        <pre className={styles.diagnostics}>{props.job.diagnostics}</pre>
      ) : null}
    </section>
  );
}

function Timeline(props: Props & { t: (typeof COPY)[Locale]; onClose: () => void }) {
  const { t } = props;
  return (
    <aside className={styles.timeline} aria-label={t.activity}>
      <header>
        <Bot />
        <div>
          <strong>{t.activity}</strong>
          <small>{props.activeSession?.title}</small>
        </div>
        <button
          type="button"
          className={styles.timelineClose}
          aria-label={t.timelineClose}
          onClick={props.onClose}
        >
          <X />
        </button>
      </header>
      <div className={styles.timelineBody}>
        {props.sessionEvents.map((event) => (
          <article key={event.id} data-type={event.type}>
            <span aria-hidden>
              {event.type === 'user_prompt' ? (
                <Store />
              ) : event.type === 'publish' ? (
                <UploadCloud />
              ) : event.type === 'error' ? (
                <CircleAlert />
              ) : (
                <MobiusLoopIcon active={event.type === 'job' && props.jobActive} />
              )}
            </span>
            <div>
              <p>{getProSessionEventLabel(event, props.locale)}</p>
              {event.jobId && props.job?.id === event.jobId ? (
                <small>{t.status[props.job.status]}</small>
              ) : null}
              {event.revision ? <code>{event.revision.slice(0, 10)}</code> : null}
            </div>
          </article>
        ))}
        {!props.sessionEvents.length && !props.job && !props.earlierJobs.length ? (
          <p className={styles.emptyTimeline}>{t.emptyTimeline}</p>
        ) : null}
        {props.job && !props.sessionEvents.some((event) => event.jobId === props.job?.id) ? (
          <article data-type="job">
            <span aria-hidden>
              <MobiusLoopIcon active={props.jobActive} />
            </span>
            <div>
              <p>{t.earlier}</p>
              <small>{t.status[props.job.status]}</small>
            </div>
          </article>
        ) : null}
        {props.earlierJobs.length ? (
          <section className={styles.earlierGroup} aria-label={t.earlier}>
            <h3>{t.earlier}</h3>
            {props.earlierJobs.map((earlierJob) => (
              <article key={earlierJob.id} data-type="job">
                <span aria-hidden>
                  <Archive />
                </span>
                <div>
                  <p>{t.status[earlierJob.status]}</p>
                  <small>{formatSessionDate(earlierJob.updatedAt, props.locale)}</small>
                </div>
              </article>
            ))}
          </section>
        ) : null}
        {props.message ? (
          <div className={styles.timelineMessage} role="status">
            <CircleAlert />
            {props.message}
          </div>
        ) : null}
        {props.job?.status === 'failed' || props.runnerFailed ? (
          <button type="button" className={styles.retryButton} onClick={props.onRetry}>
            <RefreshCw />
            {t.retry}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function SaveState(props: {
  t: (typeof COPY)[Locale];
  dirty: boolean;
  saving: boolean;
  conflict: boolean;
}) {
  return (
    <span className={styles.saveState} data-conflict={props.conflict ? '' : undefined}>
      {props.saving ? (
        <LoaderCircle className={styles.spin} />
      ) : props.conflict ? (
        <CircleAlert />
      ) : props.dirty ? (
        <Save />
      ) : (
        <Check />
      )}
      {props.saving
        ? props.t.saving
        : props.conflict
          ? props.t.conflict
          : props.dirty
            ? props.t.unsaved
            : props.t.saved}
    </span>
  );
}

function formatSessionDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-QA' : 'en-QA', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
