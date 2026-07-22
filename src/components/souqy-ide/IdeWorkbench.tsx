'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowUp, Check, Globe2, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import { BorderBeam } from 'border-beam';
import DitherHalftoneSystem from '@/components/souqna-motion/DitherHalftoneSystem';
import { loadIdeBlocks, type IdePageSummary } from '@/app/actions/souqyIde';
import { saveDraftBlocks } from '@/app/actions/builder';
import { souqyDesignStorefront, souqyEditBlock } from '@/app/actions/souqy';
import {
  blockIndexForLine,
  computeBlockRanges,
  parseBlocksDocument,
  serializeBlocks,
  type BlockRange,
} from '@/lib/souqy-ide/blocksDoc';
import { souqyIdeErrorMessage } from '@/lib/souqy-ide/errors';
import { parsePreviewChildMessage, postToPreview } from '@/lib/souqy-ide/previewProtocol';
import type { StudioCopy } from '@/components/sections/begin/souqy-studio/copy';
import type { AgentEvent } from '@/components/sections/begin/souqy-studio/ContextInspector';
import { CodeEditor } from './CodeEditor';
import { ComponentTree } from './ComponentTree';
import { ProposalDiff } from './ProposalDiff';
import { Loader } from '@/components/motion/loader';

type Props = {
  copy: StudioCopy;
  isRtl: boolean;
  storefrontSlug: string | null;
  /** Streams Souqy's run as a tool-call transcript for the studio's
   *  code-mode agent panel. */
  onAgentEvents?: (events: AgentEvent[]) => void;
};

type DocState = {
  text: string;
  ranges: BlockRange[];
  parseError: string | null;
};

type Proposal = {
  blockIndex: number;
  originalText: string;
  proposedText: string;
  proposedBlock: Record<string, unknown>;
};

function buildDoc(text: string): DocState {
  const parsed = parseBlocksDocument(text);
  return {
    text,
    ranges: parsed.ok ? computeBlockRanges(text) : [],
    parseError: parsed.ok ? null : parsed.detail,
  };
}

// Format a real elapsed duration (ms of wall-clock) as a compact label, e.g.
// "1.1s" or "1m 04s". Sub-100ms rounds up to "0.1s" so a finished step never
// reads a misleading "0.0s".
function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${Math.max(0.1, seconds).toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

// Calm, Codex-style activity lines shown while Souqy works — one short
// phrase at a time instead of a loud loader. Simulated client-side for
// now (the edit/transform actions don't stream real steps yet).
const IDE_ACTIVITY = {
  think: {
    en: ['Reading the block', 'Sending to Souqy', 'Drafting the change', 'Checking the schema'],
    ar: ['قراءة المكوّن', 'الإرسال إلى سوقي', 'صياغة التعديل', 'التحقق من الصيغة'],
  },
  build: {
    en: [
      'Reading storefront blocks',
      'Designing the layout',
      'Generating components',
      'Building the preview',
    ],
    ar: ['قراءة مكونات المتجر', 'تصميم التخطيط', 'توليد المكونات', 'بناء المعاينة'],
  },
} as const;

export function IdeWorkbench({ copy, isRtl, storefrontSlug, onAgentEvents }: Props) {
  const [pages, setPages] = useState<IdePageSummary[]>([]);
  const [pageId, setPageId] = useState('');
  const [doc, setDoc] = useState<DocState>({ text: '[]', ranges: [], parseError: null });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'error' | 'done'; message: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [isVeiling, setIsVeiling] = useState(false);
  const [previewMode, setPreviewMode] = useState<'draft' | 'live'>('draft');
  // Right pane tab: the live preview or the raw blocks.json editor.
  const [viewTab, setViewTab] = useState<'preview' | 'code'>('preview');
  const [promptText, setPromptText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const veilTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Realtime tool-call transcript surfaced in the studio's code-mode agent
  // panel. Session rows are seeded on load; run steps stream in below.
  const [transcript, setTranscript] = useState<AgentEvent[]>([]);
  const runRequestRef = useRef('');
  // Wall-clock start of the active run, stamped when the prompt is submitted.
  // The terminal outcome row reports the real elapsed against this — the true
  // Souqy round-trip, never a simulated number.
  const runStartedAtRef = useRef(0);
  const runElapsed = useCallback(
    () => (runStartedAtRef.current ? formatElapsed(performance.now() - runStartedAtRef.current) : undefined),
    [],
  );
  const pushLine = useCallback(
    (text: string, state: AgentEvent['state'] = 'done', time?: string) =>
      setTranscript((prev) => [
        ...prev,
        { id: `line-${Date.now()}-${prev.length}`, kind: 'tool', text, state, ...(time ? { time } : {}) },
      ]),
    [],
  );
  useEffect(() => {
    onAgentEvents?.(transcript);
  }, [transcript, onAgentEvents]);

  const locale = isRtl ? ('ar' as const) : ('en' as const);
  const isGenerating = isAsking || isTransforming;

  // Advance the activity line one step at a time while Souqy works.
  const [activity, setActivity] = useState('');
  useEffect(() => {
    if (!isGenerating) {
      setActivity('');
      return;
    }
    const steps = (isTransforming ? IDE_ACTIVITY.build : IDE_ACTIVITY.think)[locale];
    let i = 0;
    setActivity(steps[0]);
    const id = window.setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      setActivity(steps[i]!);
    }, 1300);
    return () => window.clearInterval(id);
  }, [isGenerating, isTransforming, locale]);

  // Stream the run into the agent panel: a user turn, then each tool step
  // flipping from running to done. Step order is simulated (the actions don't
  // stream real steps yet), but every row's time is the real wall-clock
  // elapsed it spent in the running state — never a fabricated number.
  const stepStartRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!isGenerating) return;
    const steps = (isTransforming ? IDE_ACTIVITY.build : IDE_ACTIVITY.think)[locale];
    const starts = stepStartRef.current;
    // Flip a running row to done, stamping the real elapsed since it started.
    const markDone = (e: AgentEvent): AgentEvent => {
      if (e.state !== 'run') return e;
      const startedAt = starts.get(e.id);
      starts.delete(e.id);
      return {
        ...e,
        state: 'done',
        time: startedAt != null ? formatElapsed(performance.now() - startedAt) : e.time,
      };
    };
    const turnId = `turn-${Date.now()}`;
    const firstStepId = `${turnId}-0`;
    starts.set(firstStepId, performance.now());
    setTranscript((prev) => [
      ...prev,
      { id: `${turnId}-req`, kind: 'turn', text: runRequestRef.current || steps[0]!, state: 'done' },
      { id: firstStepId, kind: 'tool', text: steps[0]!, state: 'run' },
    ]);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTranscript((prev) => {
        const next = prev.map(markDone);
        if (i < steps.length) {
          const stepId = `${turnId}-${i}`;
          starts.set(stepId, performance.now());
          next.push({ id: stepId, kind: 'tool', text: steps[i]!, state: 'run' });
        }
        return next;
      });
    }, 1100);
    return () => {
      window.clearInterval(id);
      setTranscript((prev) => prev.map(markDone));
    };
  }, [isGenerating, isTransforming, locale]);

  const loadPage = useCallback(
    async (slug: string, targetPageId?: string) => {
      setIsLoading(true);
      setBanner(null);
      try {
        const state = await loadIdeBlocks(slug, targetPageId);
        if (state.status !== 'success') {
          setBanner({ tone: 'error', message: copy.ideLoadFailed });
          return;
        }
        setPages(state.pages);
        setPageId(state.pageId);
        setDoc(buildDoc(serializeBlocks(state.blocks)));
        setSelectedIndex(-1);
        setIsDirty(false);
        // Hard-remount the preview when the loaded page changes.
        setPreviewKey((current) => current + 1);
        // Seed the agent transcript with this session's opening rows.
        setTranscript([
          {
            id: `sess-${state.pageId}`,
            kind: 'tool',
            text: locale === 'ar' ? 'بدأت الجلسة' : 'Session started',
            detail: `${slug} · ${state.pageId}`,
            state: 'done',
          },
          {
            id: `idx-${state.pageId}`,
            kind: 'tool',
            text:
              locale === 'ar'
                ? `فهرسة ${state.blocks.length} مكوّن`
                : `Indexed ${state.blocks.length} blocks`,
            state: 'done',
          },
        ]);
      } catch (error) {
        setBanner({ tone: 'error', message: souqyIdeErrorMessage(error, locale) });
      } finally {
        setIsLoading(false);
      }
    },
    [copy.ideLoadFailed, locale],
  );

  useEffect(() => {
    if (storefrontSlug) void loadPage(storefrontSlug);
  }, [storefrontSlug, loadPage]);

  useEffect(() => {
    return () => {
      if (veilTimerRef.current) clearTimeout(veilTimerRef.current);
    };
  }, []);

  const refreshPreview = useCallback(() => {
    setIsVeiling(true);
    // Soft refresh via the bridge (router.refresh inside the iframe) — no
    // white flash. The mount key stays put unless the page itself changes.
    postToPreview(iframeRef.current, { type: 'souqna:reload' });
    if (veilTimerRef.current) clearTimeout(veilTimerRef.current);
    veilTimerRef.current = setTimeout(() => setIsVeiling(false), 900);
  }, []);

  const parsedBlocks = useMemo(() => {
    const parsed = parseBlocksDocument(doc.text);
    return parsed.ok ? parsed.blocks : null;
  }, [doc.text]);

  const selectBlock = useCallback(
    (index: number, options?: { fromPreview?: boolean }) => {
      setSelectedIndex(index);
      if (options?.fromPreview) return;
      const blockId = parsedBlocks?.[index]?.id;
      postToPreview(iframeRef.current, {
        type: 'souqna:highlight',
        blockId: typeof blockId === 'string' ? blockId : null,
      });
    },
    [parsedBlocks],
  );

  // Preview click → tree/code selection (PreviewBridge posts souqna:select).
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const message = parsePreviewChildMessage(event.data);
      if (!message || !parsedBlocks) return;
      const index = parsedBlocks.findIndex((block) => block.id === message.blockId);
      if (index !== -1) selectBlock(index, { fromPreview: true });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [parsedBlocks, selectBlock]);

  const handleEditorChange = useCallback((text: string) => {
    setDoc(buildDoc(text));
    setIsDirty(true);
    setBanner(null);
  }, []);

  const handleCursorLine = useCallback(
    (line: number) => {
      const index = blockIndexForLine(doc.ranges, line);
      if (index !== -1) selectBlock(index);
    },
    [doc.ranges, selectBlock],
  );

  const handleSave = useCallback(async () => {
    if (!storefrontSlug || isSaving) return;
    const parsed = parseBlocksDocument(doc.text);
    if (!parsed.ok) {
      setBanner({ tone: 'error', message: `${copy.ideInvalidJson}: ${parsed.detail}` });
      return;
    }
    setIsSaving(true);
    setBanner(null);
    try {
      // The client tier only checked syntax/shape; the action re-validates
      // every block against the full Zod schemas before writing.
      const result = await saveDraftBlocks({
        slug: storefrontSlug,
        blocks: parsed.blocks,
        pageId,
      } as Parameters<typeof saveDraftBlocks>[0]);
      if (result.status !== 'success') {
        setBanner({
          tone: 'error',
          message: result.status === 'error' ? result.message : copy.ideSaveFailed,
        });
        return;
      }
      setIsDirty(false);
      setBanner({ tone: 'done', message: copy.ideSaved });
      refreshPreview();
    } catch (error) {
      setBanner({ tone: 'error', message: souqyIdeErrorMessage(error, locale) });
    } finally {
      setIsSaving(false);
    }
  }, [storefrontSlug, isSaving, doc.text, pageId, copy, refreshPreview, locale]);

  const handleAskSouqy = useCallback(
    async (request: string) => {
      const block = parsedBlocks?.[selectedIndex];
      const blockId = typeof block?.id === 'string' ? block.id : null;
      if (!storefrontSlug || !pageId || !blockId || request.length < 3) return;

      setIsAsking(true);
      setBanner(null);
      try {
        const result = await souqyEditBlock({
          slug: storefrontSlug,
          pageId,
          blockId,
          request,
          apply: false,
        });
        if (result.status !== 'ok') {
          const message =
            'message' in result && result.message ? result.message : copy.ideAskFailed;
          setBanner({ tone: 'error', message });
          pushLine(message, 'error', runElapsed());
          return;
        }
        setProposal({
          blockIndex: selectedIndex,
          originalText: serializeBlocks([block]),
          proposedText: serializeBlocks([result.block]),
          proposedBlock: result.block as unknown as Record<string, unknown>,
        });
        setPromptText('');
        pushLine(
          locale === 'ar' ? 'المسودة جاهزة — راجع الفرق' : 'Draft ready — review the diff',
          'done',
          runElapsed(),
        );
      } catch (error) {
        const message = souqyIdeErrorMessage(error, locale);
        setBanner({ tone: 'error', message });
        pushLine(message, 'error', runElapsed());
      } finally {
        setIsAsking(false);
      }
    },
    [parsedBlocks, selectedIndex, storefrontSlug, pageId, copy, locale, pushLine, runElapsed],
  );

  const handleTransform = useCallback(
    async (request: string) => {
      if (!storefrontSlug) return;
      if (request.length < 12) {
        setBanner({ tone: 'error', message: copy.clearerWebPrompt });
        return;
      }
      setIsTransforming(true);
      setBanner(null);
      try {
        const result = await souqyDesignStorefront({ slug: storefrontSlug, request });
        if (result.status === 'error') {
          setBanner({ tone: 'error', message: result.message });
          pushLine(result.message, 'error', runElapsed());
          return;
        }
        setPromptText('');
        setBanner({ tone: 'done', message: copy.ideTransformed });
        pushLine(
          locale === 'ar' ? 'أُعيد بناء المتجر — حُدّثت المعاينة' : 'Rebuilt storefront — preview updated',
          'done',
          runElapsed(),
        );
        // The transformed site lives on the public storefront, not the
        // block-draft preview — switch there and hard-remount.
        setPreviewMode('live');
        setPreviewKey((current) => current + 1);
      } catch (error) {
        const message = souqyIdeErrorMessage(error, locale);
        setBanner({ tone: 'error', message });
        pushLine(message, 'error', runElapsed());
      } finally {
        setIsTransforming(false);
      }
    },
    [storefrontSlug, copy, locale, pushLine, runElapsed],
  );

  const submitPrompt = useCallback(() => {
    const request = promptText.trim();
    if (!request || isGenerating || proposal) return;
    runRequestRef.current = request;
    runStartedAtRef.current = performance.now();
    if (selectedIndex >= 0) void handleAskSouqy(request);
    else void handleTransform(request);
  }, [promptText, isGenerating, proposal, selectedIndex, handleAskSouqy, handleTransform]);

  // Approximate added/removed line counts for the proposal's diff card badge.
  const diffCounts = useMemo(() => {
    if (!proposal) return { added: 0, removed: 0 };
    const original = proposal.originalText.split('\n');
    const proposed = proposal.proposedText.split('\n');
    const originalSet = new Set(original);
    const proposedSet = new Set(proposed);
    return {
      added: proposed.filter((line) => !originalSet.has(line)).length,
      removed: original.filter((line) => !proposedSet.has(line)).length,
    };
  }, [proposal]);

  const acceptProposal = useCallback(() => {
    if (!proposal || !parsedBlocks) return;
    const next = parsedBlocks.slice();
    next[proposal.blockIndex] = proposal.proposedBlock as (typeof next)[number];
    setDoc(buildDoc(serializeBlocks(next)));
    setIsDirty(true);
    setProposal(null);
    setBanner({ tone: 'done', message: copy.ideAcceptedHint });
  }, [proposal, parsedBlocks, copy.ideAcceptedHint]);

  const selectedRange =
    selectedIndex >= 0 && selectedIndex < doc.ranges.length
      ? (doc.ranges[selectedIndex] ?? null)
      : null;

  if (!storefrontSlug) {
    return (
      <section className="sqs-panel" aria-label={copy.modeLabels.code}>
        <p className="sqs-empty">{copy.noStorefront}</p>
      </section>
    );
  }

  // `?page=` keeps the draft preview on the same page the editor has open;
  // the live mode shows the public storefront (incl. Souqy transforms).
  const activePage = pages.find((page) => page.id === pageId);
  const draftSrc =
    activePage && !activePage.isHome
      ? `/account/${encodeURIComponent(storefrontSlug)}/preview?page=${encodeURIComponent(activePage.slug)}`
      : `/account/${encodeURIComponent(storefrontSlug)}/preview`;
  const previewSrc =
    previewMode === 'live' ? `/brief/${encodeURIComponent(storefrontSlug)}` : draftSrc;

  const blockCount = parsedBlocks?.length ?? 0;

  return (
    <section className="sqs-ide sqs-ide-v2" aria-label={copy.modeLabels.code} dir="ltr">
      <PanelGroup direction="horizontal" className="sqs-ide-panes" autoSaveId="souqy-ide-v2">
        {/* LEFT — Souqy conversation */}
        <Panel
          defaultSize={38}
          minSize={26}
          maxSize={54}
          className="sqs-ide-pane sqs-ide-convo-pane"
          order={1}
        >
          <div className="sqs-ide-convo" dir={isRtl ? 'rtl' : 'ltr'}>
            <header className="sqs-ide-convo-head">
              <span className="k">{copy.sessionLabel}</span>
              <strong>{activePage?.title || storefrontSlug}</strong>
              <button
                type="button"
                className="sqs-ide-icon-btn"
                onClick={() => void loadPage(storefrontSlug, pageId)}
                disabled={isLoading}
                aria-label={copy.refresh}
                title={copy.refresh}
              >
                <RefreshCw size={13} />
              </button>
            </header>

            <div className="sqs-ide-convo-log">
              {transcript.length === 0 ? (
                <p className="sqs-ide-convo-empty">
                  {locale === 'ar'
                    ? 'اطلب من سوقي أي تغيير — ستظهر الخطوات هنا خطوة بخطوة.'
                    : 'Ask Souqy for any change — the steps stream here as it works.'}
                </p>
              ) : (
                transcript.map((ev) =>
                  ev.kind === 'turn' ? (
                    <div key={ev.id} className="sqs-ide-you">
                      <span className="av" aria-hidden>
                        {locale === 'ar' ? 'أنت' : 'You'}
                      </span>
                      <p>{ev.text}</p>
                    </div>
                  ) : (
                    <div
                      key={ev.id}
                      className={`sqs-ide-step ${
                        ev.state === 'run'
                          ? 'is-run'
                          : ev.state === 'error'
                            ? 'is-error'
                            : 'is-done'
                      }`}
                    >
                      <span className="ic" aria-hidden>
                        {ev.state === 'run' ? (
                          <Loader variant="ascii-braille" size={12} speed={0.8} className="text-inherit" />
                        ) : ev.state === 'error' ? (
                          '✕'
                        ) : (
                          '✓'
                        )}
                      </span>
                      <span className="tx">{ev.text}</span>
                      {ev.detail ? <span className="dt">{ev.detail}</span> : null}
                      {ev.time ? <span className="tm">{ev.time}</span> : null}
                    </div>
                  ),
                )
              )}

              {proposal ? (
                <div className="sqs-ide-diffcard">
                  <div className="sqs-ide-diffcard-head">
                    <span className="ic" aria-hidden>
                      ✎
                    </span>
                    <strong>{copy.ideProposalTitle}</strong>
                    <span className="tm">
                      +{diffCounts.added} −{diffCounts.removed}
                    </span>
                  </div>
                  <div className="sqs-ide-diffcard-body">
                    <ProposalDiff
                      original={proposal.originalText}
                      proposed={proposal.proposedText}
                    />
                  </div>
                  <div className="sqs-ide-diffcard-actions">
                    <button type="button" className="is-accept" onClick={acceptProposal}>
                      <Check size={13} />
                      <span>{copy.ideAccept}</span>
                    </button>
                    <button type="button" className="is-reject" onClick={() => setProposal(null)}>
                      <X size={13} />
                      <span>{copy.ideReject}</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="sqs-ide-convo-dock">
              <div className="sqs-ide-promptbar" dir={isRtl ? 'rtl' : 'ltr'}>
                <BorderBeam
                  size="line"
                  colorVariant="sunset"
                  theme="dark"
                  duration={2.3}
                  strength={0.85}
                  active={isGenerating}
                  className="sqs-ide-prompt-beam"
                >
                  {isGenerating ? (
                    <div className="sqs-ide-prompt is-busy">
                      <div className="sqs-ide-prompt-row">
                        <Loader
                          variant="dither"
                          size={18}
                          className="text-inherit"
                          label={locale === 'ar' ? 'سوقي يعمل' : 'Souqy is working'}
                        />
                        <span className="sqs-ide-prompt-busy">
                          {isTransforming ? copy.ideBusyBuilding : copy.ideBusyThinking}
                          {activity ? <span className="dim">{` · ${activity}`}</span> : null}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="sqs-ide-prompt">
                      <div className="sqs-ide-prompt-row">
                        <Sparkles size={15} className="sqs-ide-prompt-spark" aria-hidden />
                        <textarea
                          className="sqs-ide-prompt-input"
                          value={promptText}
                          rows={1}
                          placeholder={
                            selectedIndex >= 0
                              ? copy.ideAskPlaceholder
                              : copy.ideTransformPlaceholder
                          }
                          onChange={(event) => {
                            setPromptText(event.target.value);
                            const el = event.target;
                            el.style.height = 'auto';
                            el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              submitPrompt();
                            }
                          }}
                        />
                        <BorderBeam
                          size="sm"
                          colorVariant="sunset"
                          theme="dark"
                          active={promptText.trim().length >= 3 && !proposal}
                        >
                          <button
                            type="button"
                            className="sqs-ide-send"
                            aria-label={copy.ideAsk}
                            disabled={promptText.trim().length < 3 || Boolean(proposal)}
                            onClick={submitPrompt}
                          >
                            <ArrowUp size={17} />
                          </button>
                        </BorderBeam>
                      </div>
                      <div className="sqs-ide-prompt-hint">
                        <span>
                          {selectedIndex >= 0
                            ? locale === 'ar'
                              ? 'يحرّر سوقي المكوّن المحدد'
                              : 'Souqy edits the selected block'
                            : locale === 'ar'
                              ? 'يعيد سوقي تصميم المتجر بالكامل'
                              : 'Souqy redesigns the whole storefront'}
                        </span>
                        <span className="sqs-ide-prompt-keys">
                          <kbd>⏎</kbd> {locale === 'ar' ? 'إرسال' : 'send'}
                          <em>·</em>
                          <kbd>⇧⏎</kbd> {locale === 'ar' ? 'سطر' : 'newline'}
                        </span>
                      </div>
                    </div>
                  )}
                </BorderBeam>
              </div>
              <div className="sqs-ide-convo-foot">
                <span>
                  @ {storefrontSlug} · {blockCount} {locale === 'ar' ? 'مكوّن' : 'blocks'}
                </span>
                {banner ? (
                  <span className={`sqs-ide-convo-flag is-${banner.tone}`}>{banner.message}</span>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="sqs-ide-handle" />

        {/* RIGHT — preview / code */}
        <Panel defaultSize={62} minSize={40} className="sqs-ide-pane sqs-ide-view-pane" order={2}>
          <header className="sqs-ide-viewhead" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="sqs-ide-tabs" role="tablist" dir="ltr">
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === 'preview'}
                className={viewTab === 'preview' ? 'is-active' : ''}
                onClick={() => setViewTab('preview')}
              >
                {locale === 'ar' ? 'معاينة' : 'Preview'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === 'code'}
                className={viewTab === 'code' ? 'is-active' : ''}
                onClick={() => setViewTab('code')}
              >
                {copy.modeLabels.code}
              </button>
            </div>
            <span className="sqs-ide-url" dir="ltr">
              <i className={previewMode === 'live' ? 'is-live' : ''} aria-hidden />
              {storefrontSlug}
            </span>
            <div className="sqs-ide-viewactions">
              <button
                type="button"
                className={previewMode === 'live' ? 'sqs-ide-icon-btn is-active' : 'sqs-ide-icon-btn'}
                aria-pressed={previewMode === 'live'}
                title={previewMode === 'live' ? copy.ideLivePreview : copy.ideDraftPreview}
                onClick={() => {
                  setPreviewMode((mode) => (mode === 'live' ? 'draft' : 'live'));
                  setPreviewKey((current) => current + 1);
                }}
              >
                <Globe2 size={13} />
                <span>{previewMode === 'live' ? copy.ideLivePreview : copy.ideDraftPreview}</span>
              </button>
              <button
                type="button"
                className="sqs-ide-save"
                onClick={() => void handleSave()}
                disabled={isSaving || isLoading || Boolean(doc.parseError) || !isDirty}
              >
                <Save size={13} />
                <span>{isSaving ? copy.ideSaving : copy.ideSave}</span>
              </button>
            </div>
          </header>

          {viewTab === 'preview' ? (
            <div className="sqs-ide-preview">
              <iframe
                key={previewKey}
                ref={iframeRef}
                src={previewSrc}
                title={`${copy.modeLabels.code}: ${storefrontSlug}`}
              />
              {isVeiling || isTransforming ? (
                <div className="sqs-ide-veil" aria-hidden>
                  <DitherHalftoneSystem
                    mode={isTransforming ? 'loading' : 'transition'}
                    intensity={isTransforming ? 0.4 : 0.3}
                    speed={1.6}
                    quality="low"
                  />
                </div>
              ) : null}
              {isLoading || isSaving ? (
                <div className="sqs-ide-preview-chip">
                  <Loader variant="dot-matrix" size={18} className="text-inherit" />
                  <span>{isSaving ? copy.ideBusyManaging : copy.ideBusyLoading}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <PanelGroup
              direction="horizontal"
              className="sqs-ide-codepanes"
              autoSaveId="souqy-ide-code"
            >
              <Panel defaultSize={26} minSize={15} className="sqs-ide-pane" order={1}>
                <ComponentTree
                  copy={copy}
                  pages={pages}
                  activePageId={pageId}
                  blocks={parsedBlocks ?? []}
                  selectedIndex={selectedIndex}
                  onSelectPage={(next) => void loadPage(storefrontSlug, next)}
                  onSelectBlock={selectBlock}
                />
              </Panel>
              <PanelResizeHandle className="sqs-ide-handle" />
              <Panel defaultSize={74} minSize={40} className="sqs-ide-pane" order={2}>
                <div className="sqs-ide-codehead" dir="ltr">
                  <strong>{storefrontSlug}/blocks.json</strong>
                  {isDirty ? <span className="sqs-ide-dirty" aria-label={copy.ideUnsaved} /> : null}
                  {doc.parseError ? (
                    <span className="sqs-ide-banner is-error" role="status">
                      {copy.ideInvalidJson}
                    </span>
                  ) : null}
                </div>
                <div className="sqs-ide-codebody">
                  <CodeEditor
                    value={doc.text}
                    isRtlUi={isRtl}
                    selectedRange={selectedRange}
                    onChange={handleEditorChange}
                    onCursorLine={handleCursorLine}
                    onSave={() => void handleSave()}
                  />
                </div>
              </Panel>
            </PanelGroup>
          )}
        </Panel>
      </PanelGroup>
    </section>
  );
}
