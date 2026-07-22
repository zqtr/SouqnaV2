'use client';

import * as React from 'react';
import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react';
import type { SouqySourceFiles } from '@/lib/souqy/source';
import {
  parseProFrameChildMessage,
  isCurrentProCompilerResponse,
  type ProCompilerResponse,
  type ProFrameParentMessage,
  type ProRuntimeDiagnostic,
} from '@/lib/proRuntime';
import styles from './ProIdeV2.module.css';

export type InstantDraftStatus = 'starting' | 'compiling' | 'rendered' | 'error';

type Props = {
  slug: string;
  businessName: string;
  files: SouqySourceFiles;
  enabled: boolean;
  device: 'desktop' | 'tablet' | 'mobile';
  locale: 'en' | 'ar';
  generationActive?: boolean;
  onStatusChange?: (status: InstantDraftStatus) => void;
};

type Artifact = {
  requestId: number;
  code: string;
  css: string;
};

const COPY = {
  en: {
    disabled: 'Instant Draft is disabled in this environment. Build a verified preview to review the storefront.',
    starting: 'Starting browser compiler…',
    compiling: 'Compiling Instant Draft…',
    error: 'The latest edit could not compile. The last working canvas is still visible.',
    retry: 'Restart compiler',
  },
  ar: {
    disabled: 'المسودة الفورية معطلة في هذه البيئة. ابنِ معاينة موثقة لمراجعة المتجر.',
    starting: 'جارٍ تشغيل مترجم المتصفح…',
    compiling: 'جارٍ ترجمة المسودة الفورية…',
    error: 'تعذّر ترجمة التعديل الأخير. ما زالت آخر معاينة سليمة ظاهرة.',
    retry: 'أعد تشغيل المترجم',
  },
} as const;

export function ProInstantPreview(props: Props) {
  const t = COPY[props.locale];
  const frameSandbox =
    process.env.NODE_ENV === 'development' ? 'allow-scripts allow-same-origin' : 'allow-scripts';
  const onStatusChange = props.onStatusChange;
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const workerRef = React.useRef<Worker | null>(null);
  const compileTimerRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<number | null>(null);
  const renderTimeoutRef = React.useRef<number | null>(null);
  const frameDeliveryTimersRef = React.useRef<number[]>([]);
  const requestIdRef = React.useRef(0);
  const latestRequestedRef = React.useRef(0);
  const latestArtifactRef = React.useRef<Artifact | null>(null);
  const filesRef = React.useRef(props.files);
  const channelIdRef = React.useRef<string | null>(null);
  const scheduleCompileRef = React.useRef<(files: SouqySourceFiles, delay?: number) => void>(
    () => undefined,
  );
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<InstantDraftStatus>('starting');
  const [hasRendered, setHasRendered] = React.useState(false);
  const [diagnostics, setDiagnostics] = React.useState<ProRuntimeDiagnostic[]>([]);

  filesRef.current = props.files;

  const updateStatus = React.useCallback(
    (next: InstantDraftStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  const clearCompileTimeout = React.useCallback(() => {
    if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const sendArtifact = React.useCallback((artifact: Artifact) => {
    const frameWindow = frameRef.current?.contentWindow;
    const activeChannelId = channelIdRef.current;
    if (!frameWindow || !activeChannelId) return;
    const message: ProFrameParentMessage = {
      type: 'souqna:pro-runtime:update',
      channelId: activeChannelId,
      ...artifact,
    };
    frameWindow.postMessage(message, '*');
    if (renderTimeoutRef.current != null) window.clearTimeout(renderTimeoutRef.current);
    renderTimeoutRef.current = window.setTimeout(() => {
      const nextChannelId = crypto.randomUUID();
      channelIdRef.current = nextChannelId;
      setChannelId(nextChannelId);
    }, 12000);
  }, []);

  const deliverLatestArtifact = React.useCallback(() => {
    const artifact = latestArtifactRef.current;
    if (artifact) sendArtifact(artifact);
  }, [sendArtifact]);

  const handleFrameLoad = React.useCallback(() => {
    for (const timer of frameDeliveryTimersRef.current) window.clearTimeout(timer);
    frameDeliveryTimersRef.current = [
      window.setTimeout(deliverLatestArtifact, 250),
      window.setTimeout(deliverLatestArtifact, 1000),
      window.setTimeout(deliverLatestArtifact, 2500),
    ];
  }, [deliverLatestArtifact]);

  const startWorker = React.useCallback(() => {
    workerRef.current?.terminate();
    clearCompileTimeout();
    const worker = new Worker(new URL('../../../workers/proCompiler.worker.ts', import.meta.url), {
      type: 'module',
      name: 'souqna-pro-compiler',
    });
    workerRef.current = worker;
    updateStatus('starting');

    worker.addEventListener('message', (event: MessageEvent<ProCompilerResponse>) => {
      const response = event.data;
      if (!response || response.type === 'ready') {
        if (response?.type === 'ready') scheduleCompileRef.current(filesRef.current, 0);
        return;
      }
      if (!isCurrentProCompilerResponse(response, latestRequestedRef.current)) return;
      clearCompileTimeout();
      if (response.type === 'compile_error') {
        setDiagnostics(response.diagnostics);
        updateStatus('error');
        return;
      }
      const artifact = {
        requestId: response.requestId,
        code: response.code,
        css: response.css,
      };
      latestArtifactRef.current = artifact;
      setDiagnostics(response.diagnostics);
      sendArtifact(artifact);
    });
    worker.addEventListener('error', () => {
      clearCompileTimeout();
      updateStatus('error');
      setDiagnostics([
        { file: 'compiler', line: null, column: null, message: 'The browser compiler stopped unexpectedly.' },
      ]);
    });
  }, [clearCompileTimeout, sendArtifact, updateStatus]);

  const scheduleCompile = React.useCallback(
    (files: SouqySourceFiles, delay = 300) => {
      if (compileTimerRef.current != null) window.clearTimeout(compileTimerRef.current);
      compileTimerRef.current = window.setTimeout(() => {
        const worker = workerRef.current;
        if (!worker) return;
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        latestRequestedRef.current = requestId;
        updateStatus('compiling');
        worker.postMessage({ type: 'compile', requestId, files });
        clearCompileTimeout();
        timeoutRef.current = window.setTimeout(() => {
          setDiagnostics([
            { file: 'compiler', line: null, column: null, message: 'Compilation timed out after five seconds.' },
          ]);
          updateStatus('error');
          startWorker();
        }, 5000);
      }, delay);
    },
    [clearCompileTimeout, startWorker, updateStatus],
  );
  scheduleCompileRef.current = scheduleCompile;

  React.useEffect(() => {
    if (!props.enabled) return;
    const nextChannelId = crypto.randomUUID();
    channelIdRef.current = nextChannelId;
    setChannelId(nextChannelId);
    startWorker();
    return () => {
      workerRef.current?.terminate();
      if (compileTimerRef.current != null) window.clearTimeout(compileTimerRef.current);
      clearCompileTimeout();
      if (renderTimeoutRef.current != null) window.clearTimeout(renderTimeoutRef.current);
      for (const timer of frameDeliveryTimersRef.current) window.clearTimeout(timer);
    };
  }, [clearCompileTimeout, props.enabled, startWorker]);

  React.useEffect(() => {
    if (!props.enabled || !workerRef.current) return;
    scheduleCompile(props.files);
  }, [props.enabled, props.files, scheduleCompile]);

  React.useEffect(() => {
    function receiveFrameMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = parseProFrameChildMessage(event.data);
      if (!message || message.channelId !== channelId) return;
      if (message.type === 'souqna:pro-runtime:ready') {
        const artifact = latestArtifactRef.current;
        if (artifact) sendArtifact(artifact);
        return;
      }
      if (message.requestId !== latestArtifactRef.current?.requestId) return;
      if (renderTimeoutRef.current != null) window.clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
      if (message.type === 'souqna:pro-runtime:rendered') {
        setHasRendered(true);
        updateStatus('rendered');
      } else {
        setDiagnostics([
          { file: 'runtime', line: null, column: null, message: message.message },
        ]);
        updateStatus('error');
      }
    }
    window.addEventListener('message', receiveFrameMessage);
    return () => window.removeEventListener('message', receiveFrameMessage);
  }, [channelId, sendArtifact, updateStatus]);

  if (!props.enabled) {
    return <div className={styles.instantUnavailable}>{t.disabled}</div>;
  }

  return (
    <div
      className={styles.instantPreview}
      data-device={props.device}
      data-status={status}
      data-rendered={hasRendered ? '' : undefined}
      data-generating={props.generationActive ? '' : undefined}
    >
      {channelId ? (
        <iframe
          ref={frameRef}
          key={channelId}
          src={`/account/${encodeURIComponent(props.slug)}/pro-live-preview?channel=${encodeURIComponent(channelId)}`}
          title={`${props.businessName} Instant Draft`}
          sandbox={frameSandbox}
          style={{
            opacity: status === 'rendered' || (status === 'error' && hasRendered) ? 1 : 0,
          }}
          onLoad={handleFrameLoad}
        />
      ) : null}
      {!hasRendered && !props.generationActive && (status === 'starting' || status === 'compiling') ? (
        <div className={styles.instantProgress} role="status">
          <LoaderCircle />
          {status === 'starting' ? t.starting : t.compiling}
        </div>
      ) : null}
      {status === 'error' ? (
        <aside className={styles.instantError} role="alert">
          <CircleAlert />
          <div>
            <strong>{t.error}</strong>
            {diagnostics.slice(0, 3).map((diagnostic, index) => (
              <p key={`${diagnostic.file}-${diagnostic.line}-${index}`}>
                {diagnostic.file}{diagnostic.line ? `:${diagnostic.line}` : ''} · {diagnostic.message}
              </p>
            ))}
          </div>
          <button type="button" onClick={startWorker}>
            <RefreshCw />
            {t.retry}
          </button>
        </aside>
      ) : null}
    </div>
  );
}
