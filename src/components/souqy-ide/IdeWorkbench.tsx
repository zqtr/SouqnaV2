'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Check, Code2, Globe2, PanelLeft, RefreshCw, Save, Sparkles, X } from 'lucide-react';
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
import { CodeEditor } from './CodeEditor';
import { ComponentTree } from './ComponentTree';
import { ProposalDiff } from './ProposalDiff';

type Props = {
  copy: StudioCopy;
  isRtl: boolean;
  storefrontSlug: string | null;
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

export function IdeWorkbench({ copy, isRtl, storefrontSlug }: Props) {
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
  const [showTree, setShowTree] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'draft' | 'live'>('draft');
  const [promptText, setPromptText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const veilTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const locale = isRtl ? ('ar' as const) : ('en' as const);
  const isGenerating = isAsking || isTransforming;

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
          setBanner({
            tone: 'error',
            message: 'message' in result && result.message ? result.message : copy.ideAskFailed,
          });
          return;
        }
        setProposal({
          blockIndex: selectedIndex,
          originalText: serializeBlocks([block]),
          proposedText: serializeBlocks([result.block]),
          proposedBlock: result.block as unknown as Record<string, unknown>,
        });
        setPromptText('');
      } catch (error) {
        setBanner({ tone: 'error', message: souqyIdeErrorMessage(error, locale) });
      } finally {
        setIsAsking(false);
      }
    },
    [parsedBlocks, selectedIndex, storefrontSlug, pageId, copy, locale],
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
          return;
        }
        setPromptText('');
        setBanner({ tone: 'done', message: copy.ideTransformed });
        // The transformed site lives on the public storefront, not the
        // block-draft preview — switch there and hard-remount.
        setPreviewMode('live');
        setPreviewKey((current) => current + 1);
      } catch (error) {
        setBanner({ tone: 'error', message: souqyIdeErrorMessage(error, locale) });
      } finally {
        setIsTransforming(false);
      }
    },
    [storefrontSlug, copy, locale],
  );

  const submitPrompt = useCallback(() => {
    const request = promptText.trim();
    if (!request || isGenerating || proposal) return;
    if (selectedIndex >= 0) void handleAskSouqy(request);
    else void handleTransform(request);
  }, [promptText, isGenerating, proposal, selectedIndex, handleAskSouqy, handleTransform]);

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

  return (
    <section className="sqs-ide" aria-label={copy.modeLabels.code} dir="ltr">
      <div className="sqs-ide-toolbar" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="sqs-ide-toolbar-title">
          <button
            type="button"
            className={showTree ? 'sqs-ide-icon-btn is-active' : 'sqs-ide-icon-btn'}
            aria-pressed={showTree}
            aria-label={copy.ideComponents}
            title={copy.ideComponents}
            onClick={() => setShowTree((value) => !value)}
          >
            <PanelLeft size={14} />
          </button>
          <button
            type="button"
            className={showCode ? 'sqs-ide-icon-btn is-active' : 'sqs-ide-icon-btn'}
            aria-pressed={showCode}
            aria-label={copy.modeLabels.code}
            title={copy.modeLabels.code}
            onClick={() => setShowCode((value) => !value)}
          >
            <Code2 size={14} />
          </button>
          <small>{copy.modeLabels.code}</small>
          <strong>{storefrontSlug}/blocks.json</strong>
          {isDirty ? <span className="sqs-ide-dirty" aria-label={copy.ideUnsaved} /> : null}
        </div>
        <div className="sqs-ide-toolbar-actions">
          {banner ? (
            <span className={`sqs-ide-banner is-${banner.tone}`} role="status">
              {banner.message}
            </span>
          ) : doc.parseError ? (
            <span className="sqs-ide-banner is-error" role="status">
              {copy.ideInvalidJson}
            </span>
          ) : null}
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
            onClick={() => void loadPage(storefrontSlug, pageId)}
            disabled={isLoading}
            aria-label={copy.refresh}
          >
            <RefreshCw size={13} />
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
      </div>

      <PanelGroup direction="horizontal" className="sqs-ide-panes" autoSaveId="souqy-ide-panes">
        {showTree ? (
          <>
            <Panel defaultSize={18} minSize={12} className="sqs-ide-pane" order={1}>
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
          </>
        ) : null}
        {showCode || proposal ? (
          <>
            <Panel defaultSize={44} minSize={25} className="sqs-ide-pane" order={2}>
              {proposal ? (
                <>
                  <div className="sqs-ide-diffbar" dir={isRtl ? 'rtl' : 'ltr'}>
                    <small>{copy.ideProposalTitle}</small>
                    <div>
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
                  <ProposalDiff original={proposal.originalText} proposed={proposal.proposedText} />
                </>
              ) : (
                <CodeEditor
                  value={doc.text}
                  isRtlUi={isRtl}
                  selectedRange={selectedRange}
                  onChange={handleEditorChange}
                  onCursorLine={handleCursorLine}
                  onSave={() => void handleSave()}
                />
              )}
            </Panel>
            <PanelResizeHandle className="sqs-ide-handle" />
          </>
        ) : null}
        <Panel defaultSize={38} minSize={20} className="sqs-ide-pane" order={3}>
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
          </div>
        </Panel>
      </PanelGroup>

      <div className="sqs-ide-promptbar" dir={isRtl ? 'rtl' : 'ltr'}>
        <BorderBeam
          size="pulse-inner"
          theme="dark"
          duration={2.3}
          strength={0.85}
          active={isGenerating}
          className="sqs-ide-prompt-beam"
        >
          <div className="sqs-ide-prompt">
            <Sparkles size={14} aria-hidden />
            <input
              value={promptText}
              placeholder={
                selectedIndex >= 0 ? copy.ideAskPlaceholder : copy.ideTransformPlaceholder
              }
              disabled={isGenerating}
              onChange={(event) => setPromptText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitPrompt();
              }}
            />
            <button
              type="button"
              disabled={isGenerating || promptText.trim().length < 3 || Boolean(proposal)}
              onClick={submitPrompt}
            >
              {isTransforming ? copy.ideTransforming : isAsking ? copy.ideAsking : copy.ideAsk}
            </button>
          </div>
        </BorderBeam>
      </div>
    </section>
  );
}
