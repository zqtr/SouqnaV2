'use client';

import { useEffect, useRef, useState } from 'react';
import { PanelRightOpen } from 'lucide-react';
import type { Locale } from '@/i18n/locales';
import DitherHalftoneSystem from '@/components/souqna-motion/DitherHalftoneSystem';
import { fromHttpStatus, souqyIdeErrorMessage } from '@/lib/souqy-ide/errors';
import { consumeSseResponse, isEventStreamResponse } from '@/lib/souqy-ide/sse';
import { souqyDesignStorefront } from '@/app/actions/souqy';
import {
  estimateSouqyStudioModelCost,
  getSouqyStudioModel,
  type SouqyStudioModelId,
} from '@/lib/souqy-studio/modelCatalog';
import { CREATION_TYPES, FORMAT_PRESETS, STUDIO_MODES } from './catalog';
import { isSouqyIdeSliceEnabled } from '@/lib/souqy-ide/flags';
import { studioCopy } from './copy';
import {
  aspectLabelForFormat,
  cranlErrorLabel,
  cranlFailureLabel,
  dimensionsForFormat,
  downloadHrefForAsset,
  extractCranlText,
  fallbackDownloadName,
  fileToDataUrl,
  postSouqyStudio,
  wait,
} from './helpers';
import { studioTheme } from './theme';
import { AgentThread } from './AgentThread';
import { AssetWorkbench } from './AssetWorkbench';
import { CommandDeck } from './CommandDeck';
import { ContextInspector, type AgentEvent } from './ContextInspector';
import { ModeRail } from './ModeRail';
import { ProjectsPanel } from './ProjectsPanel';
import dynamic from 'next/dynamic';
import { WebPreview } from './WebPreview';

// Monaco is heavy — only pull the IDE chunk when the Code tab is opened.
const IdeWorkbench = dynamic(
  () => import('@/components/souqy-ide/IdeWorkbench').then((mod) => mod.IdeWorkbench),
  { ssr: false, loading: () => <section className="sqs-panel" aria-hidden /> },
);
import type {
  CatalogProduct,
  CatalogStorefront,
  CranlJobStatusState,
  CranlJobSubmissionState,
  CreationTemplate,
  GenerateState,
  LibraryState,
  ProjectState,
  ProjectsState,
  ReferenceImage,
  SouqyStudioAsset,
  SouqyStudioProject,
  StudioChatMessage,
  StudioFormatKey,
  StudioProjectSummary,
  StudioQuality,
  StudioStatus,
  StudioTab,
  StudioTextMessage,
  StudioThreadMessage,
} from './types';

type Props = {
  locale: Locale;
  initialTab?: StudioTab;
};

export function StudioShell({ locale, initialTab }: Props) {
  const isRtl = locale === 'ar';
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab ?? 'create');
  const [project, setProject] = useState<SouqyStudioProject | null>(null);
  const [projectSummaries, setProjectSummaries] = useState<StudioProjectSummary[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [storefronts, setStorefronts] = useState<CatalogStorefront[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<SouqyStudioAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<SouqyStudioAsset | null>(null);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CreationTemplate>('launch-poster');
  const [selectedFormat, setSelectedFormat] = useState<StudioFormatKey>('instagram-post');
  const [selectedModelId, setSelectedModelId] =
    useState<SouqyStudioModelId>('replicate:flux-2-max');
  const [selectedStorefrontSlug, setSelectedStorefrontSlug] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [brandInstructions, setBrandInstructions] = useState('');
  const [quality, setQuality] = useState<StudioQuality>('high');
  const [printBleed, setPrintBleed] = useState(true);
  const [creativity, setCreativity] = useState(7);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [status, setStatus] = useState<StudioStatus>({ tone: 'idle', message: '' });
  const [isBusy, setIsBusy] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<StudioChatMessage[]>([]);
  const [textChatMessages, setTextChatMessages] = useState<StudioTextMessage[]>([]);
  const [isChatBusy, setIsChatBusy] = useState(false);
  const [hasSessionStarted, setHasSessionStarted] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  // Live tool-call transcript streamed up from the code editor, rendered in
  // the code-mode agent panel.
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  // Console command palette (⌘K / Ctrl+K).
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      } else if (event.key === 'Escape') {
        setIsPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [webPreviewKey, setWebPreviewKey] = useState(0);
  const [webPrompt, setWebPrompt] = useState('');
  const [webStatusMessage, setWebStatusMessage] = useState('');
  const [isWebDesigning, setIsWebDesigning] = useState(false);
  const referencesRef = useRef<ReferenceImage[]>([]);
  const threadRef = useRef<HTMLElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  const copy = studioCopy(isRtl);
  const visibleProducts = selectedStorefrontSlug
    ? products.filter((product) => product.storefrontSlug === selectedStorefrontSlug)
    : products;
  const webStorefront =
    storefronts.find((storefront) => storefront.slug === selectedStorefrontSlug) ??
    storefronts[0] ??
    (project?.storefrontSlug
      ? {
          slug: project.storefrontSlug,
          businessName: project.businessName,
          locale: project.locale,
        }
      : null);
  const currentType =
    CREATION_TYPES.find((item) => item.id === selectedTemplate) ?? CREATION_TYPES[0]!;
  const currentFormat =
    FORMAT_PRESETS.find((item) => item.id === selectedFormat) ?? FORMAT_PRESETS[0]!;
  const currentModel = getSouqyStudioModel(selectedModelId);
  const currentFormatDimensions = dimensionsForFormat(selectedFormat);
  const currentModelCost = estimateSouqyStudioModelCost({
    modelId: currentModel.id,
    width: currentFormatDimensions.width,
    height: currentFormatDimensions.height,
    quality,
  });
  const modelLabel = `${currentModel.shortLabel} / ${currentModelCost.credits} credits`;
  const visibleMessages: StudioThreadMessage[] =
    activeTab === 'chat' ? textChatMessages : chatMessages;
  const activeMode = STUDIO_MODES.find((mode) => mode.id === activeTab) ?? STUDIO_MODES[1]!;
  const isThreadMode = activeMode.kind === 'thread';
  const composerBusy = activeTab === 'chat' ? isChatBusy : isBusy;

  useEffect(() => {
    if (!isBusy) return;
    const interval = window.setInterval(() => {
      setGenerationProgress((current) => {
        const base = current <= 0 ? 6 : current;
        if (base >= 94) return base;
        if (base < 34) return Math.min(94, base + 7);
        if (base < 68) return Math.min(94, base + 4);
        if (base < 86) return Math.min(94, base + 2);
        return Math.min(94, base + 1);
      });
    }, 850);
    return () => window.clearInterval(interval);
  }, [isBusy]);

  useEffect(() => {
    referencesRef.current = references;
  }, [references]);

  useEffect(() => {
    if (references.length > 0 && !getSouqyStudioModel(selectedModelId).supportsReferences) {
      setSelectedModelId('replicate:flux-2-max');
    }
  }, [references.length, selectedModelId]);

  useEffect(() => {
    if (!isTemplateMenuOpen) return;

    function closeMenu() {
      setIsTemplateMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isTemplateMenuOpen]);

  useEffect(() => {
    return () => {
      for (const reference of referencesRef.current) URL.revokeObjectURL(reference.url);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLibraryLoading(true);
    void postSouqyStudio<LibraryState>('/api/souqy-studio/library', {})
      .then((result) => {
        if (cancelled || result.status !== 'success') return;
        setProject(result.project);
        setLibraryAssets(result.assets);
        setStorefronts(result.storefronts);
        setProducts(result.products);
        setSelectedStorefrontSlug(result.storefronts[0]?.slug ?? '');
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus({
            tone: 'error',
            message: souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en'),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLibraryLoading(false);
      });
    setIsProjectsLoading(true);
    void postSouqyStudio<ProjectsState>('/api/souqy-studio/projects', {})
      .then((result) => {
        if (cancelled || result.status !== 'success') return;
        setProjectSummaries(result.projects);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus({
            tone: 'error',
            message: souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en'),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.libraryError, copy.projectsError]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: hasSessionStarted ? 'smooth' : 'auto' });
  }, [visibleMessages, generationProgress, hasSessionStarted]);

  function selectMode(tab: StudioTab) {
    setActiveTab(tab);
    setIsTemplateMenuOpen(false);
    setStatus({ tone: 'idle', message: '' });
  }

  function selectTemplate(template: CreationTemplate) {
    const next = CREATION_TYPES.find((item) => item.id === template);
    setSelectedTemplate(template);
    if (next) setSelectedFormat(next.defaultFormat);
    setStatus({ tone: 'idle', message: '' });
  }

  async function refreshLibrary() {
    setIsLibraryLoading(true);
    try {
      const result = await postSouqyStudio<LibraryState>('/api/souqy-studio/library', {});
      if (result.status === 'error') {
        setStatus({ tone: 'error', message: result.message });
        return;
      }
      setProject(result.project);
      setLibraryAssets(result.assets);
      setStorefronts(result.storefronts);
      setProducts(result.products);
      if (!selectedStorefrontSlug) setSelectedStorefrontSlug(result.storefronts[0]?.slug ?? '');
      setStatus({ tone: 'done', message: copy.libraryReady });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en'),
      });
    } finally {
      setIsLibraryLoading(false);
    }
  }

  async function refreshProjects() {
    setIsProjectsLoading(true);
    try {
      const result = await postSouqyStudio<ProjectsState>('/api/souqy-studio/projects', {});
      if (result.status === 'error') {
        setStatus({ tone: 'error', message: result.message });
        return;
      }
      setProjectSummaries(result.projects);
      setStatus({ tone: 'done', message: copy.projectsReady });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en'),
      });
    } finally {
      setIsProjectsLoading(false);
    }
  }

  async function ensureProject(): Promise<SouqyStudioProject | null> {
    if (project) return project;
    const cleanName = isRtl ? 'جلسة سوقي ستوديو' : 'Souqy Studio Session';
    setStatus({ tone: 'busy', message: copy.preparing });
    const result = await postSouqyStudio<ProjectState>('/api/souqy-studio/start', {
      businessName: cleanName,
      locale,
    });
    if (result.status === 'error') {
      setStatus({ tone: 'error', message: result.message });
      return null;
    }
    setProject(result.project);
    return result.project;
  }

  async function generateAsset() {
    if (isBusy) return;
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 8) {
      setGenerationProgress(0);
      setStatus({ tone: 'error', message: copy.clearerPrompt });
      return;
    }
    if (activeTab === 'edit' && references.length === 0) {
      setGenerationProgress(0);
      setStatus({ tone: 'error', message: copy.editNeedsReference });
      return;
    }
    const templateLabel = isRtl ? currentType.ar : currentType.en;
    const formatLabel = aspectLabelForFormat(currentFormat.id);
    const generationModelLabel = modelLabel;
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const markAssistantMessage = (message: Omit<StudioChatMessage, 'id' | 'role'>) => {
      setChatMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId ? { ...item, ...message, role: 'assistant' } : item,
        ),
      );
    };

    setHasSessionStarted(true);
    setPrompt('');
    setIsTemplateMenuOpen(false);
    setChatMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: 'user',
        content: cleanPrompt,
        templateLabel,
        formatLabel,
        modelLabel: generationModelLabel,
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: copy.creating,
        status: 'creating',
        templateLabel,
        formatLabel,
        modelLabel: generationModelLabel,
      },
    ]);
    setGenerationProgress(3);
    setIsBusy(true);
    try {
      const activeProject = await ensureProject();
      if (!activeProject) {
        markAssistantMessage({
          content: copy.libraryError,
          status: 'error',
          templateLabel,
          formatLabel,
          modelLabel: generationModelLabel,
        });
        return;
      }
      setStatus({ tone: 'busy', message: copy.creating });
      const referencePayload = await Promise.all(
        references.map(async (reference) => ({
          name: reference.name,
          mimeType: reference.file.type as
            | 'image/png'
            | 'image/jpeg'
            | 'image/jpg'
            | 'image/webp'
            | 'image/svg+xml',
          dataUrl: await fileToDataUrl(reference.file),
        })),
      );
      const result = await postSouqyStudio<GenerateState>('/api/souqy-studio/generate', {
        projectId: activeProject.id,
        prompt: cleanPrompt,
        template: selectedTemplate,
        formatKey: selectedFormat,
        locale,
        sourceStorefrontSlug: selectedStorefrontSlug || undefined,
        selectedProductIds,
        references: referencePayload,
        modelId: selectedModelId,
        brandInstructions,
        quality,
        printBleed,
        creativity,
      });
      if (result.status === 'error') {
        setGenerationProgress(0);
        setStatus({ tone: 'error', message: result.message });
        markAssistantMessage({
          content: result.message,
          status: 'error',
          templateLabel,
          formatLabel,
          modelLabel: generationModelLabel,
        });
        return;
      }
      setGenerationProgress(100);
      setLibraryAssets((current) => [...result.assets, ...current].slice(0, 60));
      if (result.assets[0]) setSelectedAsset(result.assets[0]);
      markAssistantMessage({
        content:
          result.assets.length === 1
            ? copy.resultReady
            : `${copy.resultReady} (${result.assets.length})`,
        status: 'done',
        assets: result.assets,
        templateLabel,
        formatLabel,
        modelLabel: generationModelLabel,
      });
      setStatus({
        tone: 'done',
        message: isRtl
          ? `تم إنشاء ${result.assets.length} أصل.`
          : `Generated ${result.assets.length} asset${result.assets.length === 1 ? '' : 's'}.`,
      });
      void refreshProjects();
    } catch (err) {
      const message = souqyIdeErrorMessage(err, isRtl ? 'ar' : 'en');
      setGenerationProgress(0);
      setStatus({ tone: 'error', message });
      markAssistantMessage({
        content: message,
        status: 'error',
        templateLabel,
        formatLabel,
        modelLabel: generationModelLabel,
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function sendTextChat() {
    if (isChatBusy) return;
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 2) {
      setStatus({ tone: 'error', message: copy.clearerChatPrompt });
      return;
    }
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const history = textChatMessages
      .filter((message) => message.status !== 'creating')
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    setHasSessionStarted(true);
    setPrompt('');
    setIsTemplateMenuOpen(false);
    setTextChatMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: 'user',
        content: cleanPrompt,
        templateLabel: copy.modeLabels.chat,
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: copy.chatThinking,
        status: 'creating',
        templateLabel: copy.modeLabels.chat,
        formatLabel: 'AI',
      },
    ]);
    setIsChatBusy(true);
    setStatus({ tone: 'busy', message: copy.chatThinking });

    const markAssistantMessage = (message: Omit<StudioTextMessage, 'id' | 'role'>) => {
      setTextChatMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId ? { ...item, ...message, role: 'assistant' } : item,
        ),
      );
    };

    const controller = new AbortController();
    chatAbortRef.current = controller;
    let streamedText = '';

    try {
      const response = await fetch('/api/cranl/jobs/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: copy.chatSystemPrompt },
            ...history,
            { role: 'user', content: cleanPrompt },
          ],
          metadata: {
            surface: 'souqy-studio',
            tab: 'chat',
          },
        }),
      });

      // Primary path: Fanar SSE stream — tokens render as they arrive.
      if (response.ok && isEventStreamResponse(response)) {
        let settled = false;
        await consumeSseResponse(response, (frame) => {
          if (frame.event === 'delta') {
            const text = (frame.data as { text?: unknown })?.text;
            if (typeof text !== 'string') return;
            streamedText += text;
            markAssistantMessage({
              content: streamedText,
              status: 'creating',
              templateLabel: copy.modeLabels.chat,
              formatLabel: 'AI',
            });
            return;
          }
          if (frame.event === 'done') {
            settled = true;
            const finalText = (frame.data as { text?: unknown })?.text;
            markAssistantMessage({
              content:
                (typeof finalText === 'string' && finalText) ||
                streamedText ||
                copy.chatEmptyResult,
              status: 'done',
              templateLabel: copy.modeLabels.chat,
              formatLabel: 'AI',
            });
            setStatus({ tone: 'done', message: copy.chatReady });
            return;
          }
          if (frame.event === 'error') {
            settled = true;
            const data = frame.data as { message?: { en?: string; ar?: string } } | null;
            const message = (isRtl ? data?.message?.ar : data?.message?.en) ?? copy.chatFailed;
            setStatus({ tone: 'error', message });
            markAssistantMessage({
              content: streamedText ? `${streamedText}\n\n${message}` : message,
              status: 'error',
              templateLabel: copy.modeLabels.chat,
            });
          }
        });
        if (!settled) {
          // Stream closed without a terminal event — keep whatever arrived.
          markAssistantMessage({
            content: streamedText || copy.chatEmptyResult,
            status: streamedText ? 'done' : 'error',
            templateLabel: copy.modeLabels.chat,
            formatLabel: 'AI',
          });
          setStatus(
            streamedText
              ? { tone: 'done', message: copy.chatReady }
              : { tone: 'error', message: copy.chatFailed },
          );
        }
        return;
      }

      if (!response.ok) {
        const message = fromHttpStatus(response.status).message[isRtl ? 'ar' : 'en'];
        setStatus({ tone: 'error', message });
        markAssistantMessage({
          content: message,
          status: 'error',
          templateLabel: copy.modeLabels.chat,
        });
        return;
      }

      // Fallback path: CranL job queue (non-streaming) — designed wait state.
      const submission = (await response.json()) as CranlJobSubmissionState;
      if (!submission.ok) {
        const message = cranlErrorLabel(submission.error);
        setStatus({ tone: 'error', message });
        markAssistantMessage({
          content: message,
          status: 'error',
          templateLabel: copy.modeLabels.chat,
        });
        return;
      }

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await wait(1800);
        const result = await fetch(
          `/api/cranl/jobs/ai-chat/${encodeURIComponent(submission.job.jobId)}`,
        ).then((response) => response.json() as Promise<CranlJobStatusState>);
        if (!result.ok) {
          const message = cranlErrorLabel(result.error);
          setStatus({ tone: 'error', message });
          markAssistantMessage({
            content: message,
            status: 'error',
            templateLabel: copy.modeLabels.chat,
          });
          return;
        }
        if (result.job.state === 'completed') {
          const answer = extractCranlText(result.job.returnvalue);
          markAssistantMessage({
            content: answer || copy.chatEmptyResult,
            status: 'done',
            templateLabel: copy.modeLabels.chat,
            formatLabel: 'AI',
          });
          setStatus({ tone: 'done', message: copy.chatReady });
          return;
        }
        if (result.job.state === 'failed') {
          const message = cranlFailureLabel(result.job.failedReason ?? copy.chatFailed);
          setStatus({ tone: 'error', message });
          markAssistantMessage({
            content: message,
            status: 'error',
            templateLabel: copy.modeLabels.chat,
          });
          return;
        }
      }

      setStatus({ tone: 'error', message: copy.chatTimedOut });
      markAssistantMessage({
        content: copy.chatTimedOut,
        status: 'error',
        templateLabel: copy.modeLabels.chat,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        // Founder pressed Stop — keep the partial answer, no error styling.
        markAssistantMessage({
          content: streamedText || copy.chatStopped,
          status: streamedText ? 'done' : 'error',
          templateLabel: copy.modeLabels.chat,
          formatLabel: 'AI',
        });
        setStatus({ tone: 'idle', message: copy.chatStopped });
        return;
      }
      const message = souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en');
      setStatus({ tone: 'error', message });
      markAssistantMessage({
        content: message,
        status: 'error',
        templateLabel: copy.modeLabels.chat,
      });
    } finally {
      chatAbortRef.current = null;
      setIsChatBusy(false);
    }
  }

  function stopTextChat() {
    chatAbortRef.current?.abort();
  }

  function submitComposer() {
    if (activeTab === 'chat') {
      void sendTextChat();
      return;
    }
    void generateAsset();
  }

  async function designWebsiteFromPrompt() {
    const cleanPrompt = webPrompt.trim();
    if (isWebDesigning) return;
    if (!webStorefront) {
      setWebStatusMessage(copy.noStorefront);
      return;
    }
    if (cleanPrompt.length < 12) {
      setWebStatusMessage(copy.clearerWebPrompt);
      return;
    }

    setIsWebDesigning(true);
    setWebStatusMessage(copy.webDesigning);
    try {
      const result = await souqyDesignStorefront({
        slug: webStorefront.slug,
        request: cleanPrompt,
      });
      if (result.status === 'error') {
        setWebStatusMessage(result.message);
        return;
      }
      setWebPrompt('');
      setWebStatusMessage(copy.webDesignReady);
      setWebPreviewKey((current) => current + 1);
    } catch (error) {
      setWebStatusMessage(souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en'));
    } finally {
      setIsWebDesigning(false);
    }
  }

  async function startProject() {
    const cleanName = newProjectName.trim();
    if (cleanName.length < 2) {
      setStatus({ tone: 'error', message: copy.projectNameRequired });
      return;
    }
    setIsProjectsLoading(true);
    try {
      const result = await postSouqyStudio<ProjectState>('/api/souqy-studio/start', {
        businessName: cleanName,
        locale,
      });
      if (result.status === 'error') {
        setStatus({ tone: 'error', message: result.message });
        return;
      }
      setProject(result.project);
      setNewProjectName('');
      setActiveTab('create');
      setStatus({ tone: 'done', message: copy.projectStarted });
      void refreshProjects();
    } catch (error) {
      setStatus({
        tone: 'error',
        message: souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en'),
      });
    } finally {
      setIsProjectsLoading(false);
    }
  }

  async function openProject(projectId: string) {
    setIsProjectsLoading(true);
    try {
      const result = await postSouqyStudio<ProjectState>('/api/souqy-studio/project', {
        projectId,
      });
      if (result.status === 'error') {
        setStatus({ tone: 'error', message: result.message });
        return;
      }
      setProject(result.project);
      setActiveTab('create');
      setStatus({ tone: 'done', message: copy.projectOpened });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en'),
      });
    } finally {
      setIsProjectsLoading(false);
    }
  }

  async function prepareAssetForEdit(asset: SouqyStudioAsset) {
    setSelectedAsset(asset);
    if (asset.assetType) setSelectedTemplate(asset.assetType);
    if (asset.formatKey) setSelectedFormat(asset.formatKey);
    setActiveTab('edit');
    setStatus({ tone: 'busy', message: copy.preparingEdit });
    try {
      const response = await fetch(downloadHrefForAsset(asset));
      if (!response.ok) throw new Error(copy.editReferenceFailed);
      const blob = await response.blob();
      const mimeType = blob.type || asset.mimeType || 'image/webp';
      const file = new File([blob], asset.downloadFilename ?? fallbackDownloadName(asset), {
        type: mimeType,
      });
      const reference = {
        id: `${asset.id ?? asset.url}-${crypto.randomUUID()}`,
        name: asset.title,
        url: URL.createObjectURL(file),
        file,
      };
      setReferences((current) => {
        const next = [reference, ...current].slice(0, 5);
        for (const removed of current.slice(4)) URL.revokeObjectURL(removed.url);
        return next;
      });
      setPrompt(copy.editPromptSeed);
      setStatus({ tone: 'done', message: copy.editReady });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: souqyIdeErrorMessage(error, isRtl ? 'ar' : 'en'),
      });
    }
  }

  function addReferenceImages(files: FileList | null) {
    if (!files) return;
    const remainingSlots = Math.max(0, 5 - references.length);
    const next = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingSlots)
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        file,
      }));
    if (next.length) setReferences((current) => [...current, ...next].slice(0, 5));
  }

  function removeReference(id: string) {
    setReferences((current) => {
      const removed = current.find((reference) => reference.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((reference) => reference.id !== id);
    });
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-6),
    );
  }

  const shellClassName = [
    'sqs-shell',
    `is-mode-${activeTab}`,
    hasSessionStarted ? 'is-session' : '',
    isBusy || isChatBusy ? 'is-generating' : '',
    isContextOpen ? 'is-context-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const paletteCommands = [
    ...STUDIO_MODES.filter(
      (mode) => mode.id !== 'code' || isSouqyIdeSliceEnabled('code-v1'),
    ).map((mode) => ({
      id: `go-${mode.id}`,
      label: `Go to ${copy.modeLabels[mode.id]}`,
      run: () => selectMode(mode.id),
    })),
    { id: 'context', label: 'Open context panel', run: () => setIsContextOpen(true) },
  ];

  return (
    <section className={shellClassName} data-theme="dark" dir={isRtl ? 'rtl' : 'ltr'}>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: studioTheme }} />
      <div className="sqs-atmosphere" aria-hidden>
        <DitherHalftoneSystem
          mode={isBusy || isChatBusy || isWebDesigning ? 'loading' : 'background'}
          className="sqs-dither"
          intensity={isBusy || isChatBusy || isWebDesigning ? 0.18 : 0.12}
          speed={1.3}
          quality="medium"
          pauseWhenOffscreen
        />

        <div className="sqs-pixel-layer" />
        <div className="sqs-scanlines" />
        <div className="sqs-vignette" />
      </div>

      <div className="sqs-topbar" dir="ltr">
        <button type="button" className="sqs-topbar-cmd" onClick={() => setIsPaletteOpen(true)}>
          <span className="p">›</span>
          <span className="ph">Type a command or ask Souqy…</span>
          <span className="k">⌘K</span>
        </button>
        <span className="sqs-topbar-spacer" />
        <span className="sqs-topbar-chip">
          model <b>sonnet-5</b>
        </span>
        <span className="sqs-topbar-chip">
          store <b>{selectedStorefrontSlug || '—'}</b>
        </span>
        <span className="sqs-topbar-chip">
          <i className="d" aria-hidden /> <b>live</b>
        </span>
      </div>

      <ModeRail activeTab={activeTab} copy={copy} onSelect={selectMode} />

      <main className="sqs-stage">
        <header className="sqs-stage-head">
          <div className="sqs-stage-title">
            <h1>{copy.modeLabels[activeTab]}</h1>
            <span className="sqs-stage-crumb" aria-hidden>
              ›
            </span>
            <p>{copy.modeHints[activeTab]}</p>
          </div>
          <div className="sqs-stage-tools">
            <button
              type="button"
              className="sqs-context-toggle"
              aria-expanded={isContextOpen}
              onClick={() => setIsContextOpen(true)}
            >
              <PanelRightOpen size={14} />
              <span>{copy.contextTitle}</span>
            </button>
          </div>
        </header>

        <div className="sqs-stage-body">
          {isThreadMode ? (
            <>
              <div
                className={hasSessionStarted ? 'sqs-hero is-exiting' : 'sqs-hero'}
                aria-hidden={hasSessionStarted}
              >
                <small>{copy.eyebrow}</small>
                <h2>{copy.heroTitle}</h2>
                <p>{copy.heroBody}</p>
                {activeTab === 'chat' ? (
                  <div className="sqs-starters" aria-label={copy.chatStartersTitle}>
                    <small>{copy.chatStartersTitle}</small>
                    <div className="sqs-starter-grid">
                      {copy.chatStarters.map((starter) => (
                        <button key={starter} type="button" onClick={() => setPrompt(starter)}>
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <AgentThread
                activeTab={activeTab}
                copy={copy}
                isRtl={isRtl}
                messages={visibleMessages}
                generationProgress={generationProgress}
                references={references}
                selectedAsset={selectedAsset}
                libraryAssets={libraryAssets}
                threadRef={threadRef}
                onEditAsset={(asset) => void prepareAssetForEdit(asset)}
              />
            </>
          ) : null}
          {activeTab === 'projects' ? (
            <ProjectsPanel
              copy={copy}
              projects={projectSummaries}
              activeProjectId={project?.id ?? null}
              isLoading={isProjectsLoading}
              newProjectName={newProjectName}
              onNewProjectNameChange={setNewProjectName}
              onStartProject={() => void startProject()}
              onOpenProject={(projectId) => void openProject(projectId)}
              onRefresh={() => void refreshProjects()}
            />
          ) : null}
          {activeTab === 'history' ? (
            <AssetWorkbench
              copy={copy}
              isRtl={isRtl}
              assets={libraryAssets}
              isLoading={isLibraryLoading}
              onEditAsset={(asset) => void prepareAssetForEdit(asset)}
              onRefresh={() => void refreshLibrary()}
            />
          ) : null}
          {activeTab === 'code' ? (
            <IdeWorkbench
              copy={copy}
              isRtl={isRtl}
              storefrontSlug={webStorefront?.slug ?? null}
              onAgentEvents={setAgentEvents}
            />
          ) : null}
          {activeTab === 'web' ? (
            <WebPreview
              copy={copy}
              storefronts={storefronts}
              storefront={webStorefront}
              previewKey={webPreviewKey}
              prompt={webPrompt}
              statusMessage={webStatusMessage}
              isDesigning={isWebDesigning}
              onPromptChange={setWebPrompt}
              onSelectStorefront={setSelectedStorefrontSlug}
              onRefreshPreview={() => setWebPreviewKey((current) => current + 1)}
              onSubmit={() => void designWebsiteFromPrompt()}
            />
          ) : null}
        </div>

        {isThreadMode ? (
          <CommandDeck
            activeTab={activeTab}
            copy={copy}
            isRtl={isRtl}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={submitComposer}
            busy={composerBusy}
            onStop={activeTab === 'chat' && isChatBusy ? stopTextChat : undefined}
            generationProgress={generationProgress}
            status={status}
            formatSize={currentFormat.size}
            referenceCount={references.length}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={selectTemplate}
            isTemplateMenuOpen={isTemplateMenuOpen}
            onToggleTemplateMenu={() => setIsTemplateMenuOpen((value) => !value)}
            onCloseTemplateMenu={() => setIsTemplateMenuOpen(false)}
            onAttachFiles={addReferenceImages}
          />
        ) : null}

        <div className="sqs-statusline" role="status" dir="ltr">
          <span className="sqs-status-seg is-mode">{copy.modeLabels[activeTab]}</span>
          {selectedStorefrontSlug ? (
            <span className="sqs-status-seg">{selectedStorefrontSlug}</span>
          ) : null}
          <span className="sqs-status-spacer" />
          <span className="sqs-status-hint">
            <kbd>⌘K</kbd> commands
          </span>
          <span className="sqs-status-hint">
            <kbd>⌘⏎</kbd> run
          </span>
          <span className="sqs-status-hint">
            <kbd>⌘S</kbd> save
          </span>
          <span className="sqs-status-seg is-mark">Souqy Studio</span>
        </div>
      </main>

      <ContextInspector
        copy={copy}
        isRtl={isRtl}
        activeTab={activeTab}
        isOpen={isContextOpen}
        onClose={() => setIsContextOpen(false)}
        project={project}
        storefronts={storefronts}
        selectedStorefrontSlug={selectedStorefrontSlug}
        onSelectStorefront={setSelectedStorefrontSlug}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModelId}
        formatDimensions={currentFormatDimensions}
        quality={quality}
        onQualityChange={setQuality}
        printBleed={printBleed}
        onPrintBleedChange={setPrintBleed}
        brandInstructions={brandInstructions}
        onBrandInstructionsChange={setBrandInstructions}
        creativity={creativity}
        onCreativityChange={setCreativity}
        selectedFormat={selectedFormat}
        onSelectFormat={setSelectedFormat}
        products={visibleProducts}
        selectedProductIds={selectedProductIds}
        onToggleProduct={toggleProduct}
        references={references}
        onRemoveReference={removeReference}
        onAttachFiles={addReferenceImages}
        status={status}
        agentEvents={agentEvents}
        selectedAsset={selectedAsset}
        onEditAsset={(asset) => void prepareAssetForEdit(asset)}
      />
      {isPaletteOpen ? (
        <div
          className="sqs-palette-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsPaletteOpen(false);
          }}
        >
          <div className="sqs-palette" role="dialog" aria-label="Command palette">
            <div className="sqs-palette-input">
              <span aria-hidden>⌘</span>
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                placeholder="Type a command…"
                aria-label="Command"
              />
            </div>
            <div className="sqs-palette-list">
              {paletteCommands
                .filter((command) =>
                  command.label.toLowerCase().includes(paletteQuery.toLowerCase()),
                )
                .map((command) => (
                  <button
                    key={command.id}
                    type="button"
                    className="sqs-palette-item"
                    onClick={() => {
                      command.run();
                      setIsPaletteOpen(false);
                      setPaletteQuery('');
                    }}
                  >
                    {command.label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
