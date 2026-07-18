'use client';

import { useRef, useState, type ChangeEvent, type Dispatch } from 'react';
import {
  analyzeInstagramBatch,
  pollInstagramFetch,
  startInstagramFetch,
  uploadImportImage,
} from '@/app/actions/instagramImport';
import { ANALYZE_BATCH_SIZE, type DraftProduct, type IgPost, type IgProfile } from '@/lib/instagram/types';
import type { Locale } from '@/i18n/locales';
import { IMPORT_COPY } from './copy';
import { ImportChat } from './ImportChat';
import { ProductDraftCard } from './ProductDraftCard';
import type { ImportAction, ImportState } from './importMachine';

/**
 * Step 0 of /begin: AI Instagram import. Fetch (handle → provider →
 * poll) or manual photo upload, batched vision analysis with live
 * progress, then the review chat, then a summary the merchant confirms.
 * The parent (SouqnaBeginExperience) owns the reducer so the confirmed
 * drafts survive into `goNext()` and the launch finalize call.
 */

export type ImportThemeTokens = {
  cardBg: string;
  cardBorder: string;
  mutedText: string;
  fieldBg: string;
  fieldBorder: string;
  accent: string;
  accentInk: string;
  text: string;
};

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 40;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function InstagramImportStep({
  locale,
  isRtl,
  capabilities,
  tokens,
  state,
  dispatch,
  onComplete,
  onSkip,
}: {
  locale: Locale;
  isRtl: boolean;
  capabilities: { provider: boolean; ai: boolean };
  tokens: ImportThemeTokens;
  state: ImportState;
  dispatch: Dispatch<ImportAction>;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const copy = IMPORT_COPY[locale];
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  async function handleFetch() {
    if (busyRef.current || state.handle.trim().length === 0) return;
    busyRef.current = true;
    dispatch({ type: 'fetch-start' });
    try {
      const started = await startInstagramFetch({ handle: state.handle, locale });
      if (started.status === 'manual_only') {
        dispatch({ type: 'enter-manual', importId: crypto.randomUUID(), note: null });
        return;
      }
      if (started.status === 'error') {
        dispatch({ type: 'fetch-error', message: started.message });
        return;
      }
      if (started.status === 'done') {
        afterFetch(started.importId, started.result.profile, started.result.posts);
        return;
      }
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        await wait(POLL_INTERVAL_MS);
        const polled = await pollInstagramFetch({
          runId: started.runId,
          handle: state.handle,
          importId: started.importId,
          locale,
        });
        if (polled.status === 'running') continue;
        if (polled.status === 'done') {
          afterFetch(started.importId, polled.result.profile, polled.result.posts);
          return;
        }
        if (polled.status === 'private') {
          dispatch({ type: 'enter-manual', importId: started.importId, note: polled.message });
          return;
        }
        dispatch({ type: 'fetch-error', message: polled.message });
        return;
      }
      dispatch({ type: 'fetch-error', message: copy.fetchTimeout });
    } catch {
      dispatch({ type: 'fetch-error', message: copy.fetchTimeout });
    } finally {
      busyRef.current = false;
    }
  }

  function afterFetch(importId: string, profile: IgProfile, posts: IgPost[]) {
    dispatch({ type: 'fetch-done', importId, profile, posts });
    void runAnalysis(importId, { handle: profile.handle, bio: profile.bio }, posts);
  }

  async function runAnalysis(
    importId: string,
    profile: { handle: string; bio: string | null },
    posts: IgPost[],
  ) {
    const analyzable = posts.filter(
      (post): post is IgPost & { imageUrl: string } => post.imageUrl !== null,
    );
    let collected: DraftProduct[] = [];
    for (let i = 0; i < analyzable.length; i += ANALYZE_BATCH_SIZE) {
      const batch = analyzable.slice(i, i + ANALYZE_BATCH_SIZE);
      try {
        const result = await analyzeInstagramBatch({
          importId,
          locale,
          profile,
          posts: batch.map((post) => ({
            id: post.id,
            shortcode: post.shortcode,
            imageUrl: post.imageUrl,
            caption: post.caption,
          })),
          includeStoreSuggestions: i === 0,
        });
        if (result.status !== 'ok') {
          dispatch({ type: 'ai-unavailable' });
          break;
        }
        collected = [...collected, ...result.drafts];
        if (i === 0) dispatch({ type: 'suggestions', suggestions: result.suggestions });
        dispatch({
          type: 'analyze-progress',
          drafts: collected,
          analyzedCount: Math.min(i + batch.length, analyzable.length),
        });
      } catch {
        dispatch({ type: 'ai-unavailable' });
        break;
      }
    }
    dispatch({ type: 'analyze-complete' });
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || !state.importId) return;
    setIsUploading(true);
    try {
      for (const file of files.slice(0, 20 - state.posts.length)) {
        const formData = new FormData();
        formData.set('importId', state.importId);
        formData.set('locale', locale);
        formData.set('file', file);
        const uploaded = await uploadImportImage(formData);
        if (uploaded.status === 'ok') {
          dispatch({
            type: 'manual-post-added',
            post: {
              id: uploaded.postId,
              shortcode: uploaded.postId,
              caption: null,
              imageUrl: uploaded.imageUrl,
              takenAt: null,
            },
          });
        } else {
          dispatch({ type: 'error', message: uploaded.message });
        }
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleManualAnalyze() {
    if (!state.importId || state.posts.length === 0) return;
    dispatch({ type: 'analyze-start' });
    void runAnalysis(
      state.importId,
      { handle: state.handle || 'my-shop', bio: null },
      state.posts,
    );
  }

  const totalAnalyzable = state.posts.filter((post) => post.imageUrl !== null).length;

  const style = {
    '--ig-card-bg': tokens.cardBg,
    '--ig-card-border': tokens.cardBorder,
    '--ig-muted': tokens.mutedText,
    '--ig-field-bg': tokens.fieldBg,
    '--ig-field-border': tokens.fieldBorder,
    '--ig-accent': tokens.accent,
    '--ig-accent-ink': tokens.accentInk,
    '--ig-text': tokens.text,
  } as React.CSSProperties;

  return (
    <div className="ig-step" style={style} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 'skipped' renders the idle UI too — navigating Back after a skip
          must show the step again, not an empty card. */}
      {state.phase === 'idle' || state.phase === 'skipped' ? (
        <div className="begin-form">
          {capabilities.provider ? (
            <>
              <label className="begin-field">
                <span>{copy.handleLabel}</span>
                {/* Handles are Latin — the field is an LTR island so the
                    @ hugs the handle instead of drifting across in RTL. */}
                <div className="ig-handle" dir="ltr">
                  <em aria-hidden>@</em>
                  <input
                    value={state.handle}
                    onChange={(event) =>
                      dispatch({ type: 'set-handle', handle: event.target.value.replace(/\s/gu, '') })
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleFetch();
                      }
                    }}
                    placeholder={copy.handlePlaceholder}
                    autoComplete="off"
                    dir="ltr"
                  />
                </div>
              </label>
              <div className="ig-actions">
                <button
                  type="button"
                  className="ig-cta"
                  onClick={() => void handleFetch()}
                  disabled={state.handle.trim().length === 0}
                >
                  {copy.fetchCta}
                </button>
                <button
                  type="button"
                  className="ig-secondary"
                  onClick={() =>
                    dispatch({ type: 'enter-manual', importId: crypto.randomUUID(), note: null })
                  }
                >
                  {copy.orManual}
                </button>
              </div>
            </>
          ) : (
            <div className="ig-actions">
              <button
                type="button"
                className="ig-cta"
                onClick={() =>
                  dispatch({ type: 'enter-manual', importId: crypto.randomUUID(), note: null })
                }
              >
                {copy.manualTitle}
              </button>
            </div>
          )}
          {state.error ? <p className="ig-error" role="alert">{state.error}</p> : null}
          <ol className="ig-how">
            {[copy.how1, copy.how2, copy.how3].map((step, index) => (
              <li key={step}>
                <span className="ig-how-num" aria-hidden>
                  {isRtl ? ['١', '٢', '٣'][index] : index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <button type="button" className="ig-link is-skip" onClick={onSkip}>
            {copy.skipStep}
          </button>
        </div>
      ) : null}

      {state.phase === 'fetching' ? (
        <div className="ig-loading" role="status">
          <span className="ig-spinner" aria-hidden />
          <b>{copy.fetching}</b>
          <p>{copy.fetchingHint}</p>
        </div>
      ) : null}

      {state.phase === 'manual' ? (
        <div className="begin-form">
          {state.manualNote ? <p className="ig-note">{state.manualNote}</p> : null}
          <p className="ig-note is-muted">{copy.manualNote}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) => void handleFiles(event)}
            style={{ display: 'none' }}
          />
          <div className="ig-upload-grid">
            {state.posts.map((post) => (
              <div key={post.id} className="ig-upload-item">
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ephemeral import preview
                  <img src={post.imageUrl} alt="" loading="lazy" />
                ) : null}
                <textarea
                  value={post.caption ?? ''}
                  placeholder={copy.captionPlaceholder}
                  dir="auto"
                  rows={2}
                  onChange={(event) =>
                    dispatch({ type: 'manual-caption', postId: post.id, caption: event.target.value })
                  }
                />
                <button
                  type="button"
                  className="ig-link"
                  onClick={() => dispatch({ type: 'manual-post-removed', postId: post.id })}
                >
                  {copy.removeImage}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="ig-upload-add"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || state.posts.length >= 20}
            >
              <span aria-hidden>+</span>
              {isUploading ? '…' : copy.uploadCta}
              <small>{copy.manualHint}</small>
            </button>
          </div>
          {state.error ? <p className="ig-error" role="alert">{state.error}</p> : null}
          <div className="ig-actions">
            <button
              type="button"
              className="ig-cta"
              onClick={handleManualAnalyze}
              disabled={state.posts.length === 0 || isUploading}
            >
              {copy.analyzeCta}
            </button>
            <button type="button" className="ig-link is-skip" onClick={onSkip}>
              {copy.skipStep}
            </button>
          </div>
        </div>
      ) : null}

      {state.phase === 'analyzing' ? (
        <div className="ig-loading" role="status">
          <span className="ig-spinner" aria-hidden />
          <b>{copy.analyzing(Math.min(state.analyzedCount, totalAnalyzable), totalAnalyzable)}</b>
          <div className="ig-progress" aria-hidden>
            <i
              style={{
                width: `${totalAnalyzable > 0 ? Math.round((state.analyzedCount / totalAnalyzable) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {/* 'confirmed' re-renders the summary — Back after confirming shows
          the reviewed products, still editable. */}
      {state.phase === 'chat' || state.phase === 'summary' || state.phase === 'confirmed' ? (
        <div className="ig-review">
          {state.profile ? (
            <div className="ig-profile">
              {state.profile.profilePicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ephemeral import preview
                <img src={state.profile.profilePicUrl} alt="" />
              ) : (
                <span className="ig-profile-fallback" aria-hidden>
                  @
                </span>
              )}
              <div>
                <b>{state.profile.fullName ?? `@${state.profile.handle}`}</b>
                <small>@{state.profile.handle}</small>
              </div>
            </div>
          ) : null}

          {state.phase === 'chat' ? (
            <ImportChat state={state} dispatch={dispatch} copy={copy} locale={locale} isRtl={isRtl} />
          ) : (
            <div className="ig-summary">
              <b>{copy.summaryTitle(state.drafts.filter((d) => d.isProduct).length)}</b>
              <p>{copy.summaryBody}</p>
              <div className="ig-summary-list">
                {state.drafts.map((draft) => (
                  <ProductDraftCard
                    key={draft.postId}
                    draft={draft}
                    copy={copy}
                    locale={locale}
                    isRtl={isRtl}
                    editable={draft.isProduct}
                    onEdit={(patch) => dispatch({ type: 'edit-draft', postId: draft.postId, patch })}
                    onToggle={() => dispatch({ type: 'toggle-include', postId: draft.postId })}
                  />
                ))}
              </div>
              <p className="ig-note is-muted">{copy.prefillNote}</p>
              <div className="ig-actions">
                <button
                  type="button"
                  className="ig-cta"
                  disabled={state.drafts.filter((d) => d.isProduct).length === 0}
                  onClick={() => {
                    dispatch({ type: 'confirm' });
                    onComplete();
                  }}
                >
                  {copy.confirmCta}
                </button>
                <button type="button" className="ig-link is-skip" onClick={onSkip}>
                  {copy.skipStep}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <style jsx global>{`
        .ig-step {
          display: flex;
          flex-direction: column;
          gap: 14px;
          color: var(--ig-text);
        }
        .ig-handle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--ig-field-bg);
          border: 1px solid var(--ig-field-border);
          border-radius: 10px;
          padding-inline: 12px;
        }
        .ig-handle em {
          font-style: normal;
          opacity: 0.55;
        }
        .ig-handle input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          padding-block: 12px;
          font: inherit;
        }
        .ig-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .ig-cta {
          background: var(--ig-accent);
          color: var(--ig-accent-ink);
          border: none;
          border-radius: 999px;
          padding: 11px 22px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
        }
        .ig-cta:disabled {
          opacity: 0.45;
          cursor: default;
        }
        .ig-link {
          background: none;
          border: none;
          color: var(--ig-muted);
          font-size: 12.5px;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
          padding: 0;
        }
        .ig-link.is-skip {
          align-self: flex-start;
        }
        .ig-secondary {
          background: transparent;
          border: 1px solid var(--ig-field-border);
          color: var(--ig-text);
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 12.5px;
          cursor: pointer;
        }
        .ig-secondary:hover {
          border-color: var(--ig-accent);
        }
        .ig-how {
          list-style: none;
          margin: 4px 0 0;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border: 1px dashed var(--ig-field-border);
          border-radius: 10px;
        }
        .ig-how li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ig-muted);
        }
        .ig-how-num {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1px solid var(--ig-field-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10.5px;
          color: var(--ig-accent);
        }
        /* Arabic typography: connected script wants its own face, zero
           tracking, no uppercase tricks, and roomier line-height. */
        .ig-step[dir='rtl'] {
          font-family: var(--font-arabic), var(--font-sans), system-ui, sans-serif;
        }
        .ig-step[dir='rtl'] .begin-field > span {
          font-family: var(--font-arabic), var(--font-sans), sans-serif;
          font-size: 12px;
          letter-spacing: 0;
          text-transform: none;
        }
        .ig-step[dir='rtl'] .ig-chat-progress {
          letter-spacing: 0;
          text-transform: none;
          font-size: 12px;
        }
        .ig-step[dir='rtl'] .ig-bubble {
          font-size: 14px;
          line-height: 1.75;
        }
        .ig-step[dir='rtl'] .ig-chip {
          font-size: 13px;
        }
        .ig-step[dir='rtl'] .ig-cta,
        .ig-step[dir='rtl'] .ig-secondary {
          font-size: 13.5px;
          letter-spacing: 0;
        }
        .ig-step[dir='rtl'] .ig-how li {
          font-size: 13px;
        }
        .ig-step[dir='rtl'] .ig-badge {
          letter-spacing: 0;
          text-transform: none;
        }
        .ig-error {
          margin: 0;
          font-size: 12.5px;
          color: #c0564a;
        }
        .ig-note {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .ig-note.is-muted {
          color: var(--ig-muted);
          font-size: 12.5px;
        }
        .ig-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 34px 0;
          text-align: center;
        }
        .ig-loading p {
          margin: 0;
          color: var(--ig-muted);
          font-size: 12.5px;
          max-width: 42ch;
        }
        .ig-spinner {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid var(--ig-field-border);
          border-top-color: var(--ig-accent);
          animation: ig-spin 0.9s linear infinite;
        }
        @keyframes ig-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .ig-progress {
          width: min(280px, 80%);
          height: 4px;
          border-radius: 999px;
          background: var(--ig-field-border);
          overflow: hidden;
        }
        .ig-progress i {
          display: block;
          height: 100%;
          background: var(--ig-accent);
          transition: width 0.4s ease;
        }
        .ig-upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }
        .ig-upload-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border: 1px solid var(--ig-card-border);
          border-radius: 10px;
          padding: 8px;
          background: var(--ig-card-bg);
        }
        .ig-upload-item img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 6px;
        }
        .ig-upload-item textarea {
          background: var(--ig-field-bg);
          border: 1px solid var(--ig-field-border);
          border-radius: 6px;
          color: inherit;
          font-size: 12px;
          padding: 6px 8px;
          resize: vertical;
        }
        .ig-upload-add {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 150px;
          border: 1px dashed var(--ig-field-border);
          border-radius: 10px;
          background: transparent;
          color: var(--ig-muted);
          font-size: 13px;
          cursor: pointer;
        }
        .ig-upload-add span {
          font-size: 22px;
        }
        .ig-upload-add small {
          font-size: 10.5px;
          opacity: 0.75;
        }
        .ig-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ig-profile img,
        .ig-profile-fallback {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--ig-card-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ig-profile b {
          display: block;
          font-size: 13.5px;
        }
        .ig-profile small {
          color: var(--ig-muted);
          font-size: 11.5px;
        }
        .ig-review {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ig-chat {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ig-chat-progress {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ig-muted);
        }
        .ig-thread {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 340px;
          overflow-y: auto;
          padding-inline-end: 4px;
        }
        .ig-msg {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 92%;
        }
        .ig-msg.is-user {
          align-self: flex-end;
          align-items: flex-end;
        }
        .ig-bubble {
          margin: 0;
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 13.5px;
          line-height: 1.5;
          background: var(--ig-card-bg);
          border: 1px solid var(--ig-card-border);
          width: fit-content;
        }
        .ig-msg.is-user .ig-bubble {
          background: var(--ig-accent);
          color: var(--ig-accent-ink);
          border-color: transparent;
        }
        .ig-chat-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ig-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ig-chip {
          background: var(--ig-field-bg);
          border: 1px solid var(--ig-field-border);
          color: inherit;
          border-radius: 999px;
          padding: 7px 14px;
          font-size: 12.5px;
          cursor: pointer;
        }
        .ig-chip.is-primary {
          background: var(--ig-accent);
          color: var(--ig-accent-ink);
          border-color: transparent;
        }
        .ig-chip.is-quiet {
          border-style: dashed;
          color: var(--ig-muted);
        }
        .ig-answer {
          display: flex;
          gap: 8px;
        }
        .ig-answer input {
          flex: 1;
          background: var(--ig-field-bg);
          border: 1px solid var(--ig-field-border);
          border-radius: 999px;
          color: inherit;
          font: inherit;
          font-size: 13px;
          padding: 10px 16px;
          outline: none;
        }
        .ig-answer input:focus {
          border-color: var(--ig-accent);
        }
        .ig-answer button {
          background: var(--ig-accent);
          color: var(--ig-accent-ink);
          border: none;
          border-radius: 999px;
          padding: 0 18px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .ig-answer button:disabled {
          opacity: 0.45;
          cursor: default;
        }
        .ig-card {
          display: flex;
          align-items: stretch;
          gap: 10px;
          border: 1px solid var(--ig-card-border);
          border-radius: 10px;
          background: var(--ig-card-bg);
          padding: 8px;
        }
        .ig-card.is-excluded {
          opacity: 0.55;
        }
        .ig-card-img {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .ig-card-img.is-empty {
          background: var(--ig-field-bg);
        }
        .ig-card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          flex: 1;
        }
        .ig-card-title b {
          display: block;
          font-size: 13.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ig-card-title small {
          color: var(--ig-muted);
          font-size: 11.5px;
        }
        .ig-card-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ig-price {
          font-size: 12.5px;
          font-weight: 600;
        }
        .ig-price.is-missing {
          color: var(--ig-muted);
          font-weight: 400;
        }
        .ig-badge {
          font-size: 10px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border: 1px dashed var(--ig-field-border);
          border-radius: 999px;
          padding: 2px 8px;
          color: var(--ig-muted);
        }
        .ig-pill {
          font-size: 10.5px;
          border: 1px solid var(--ig-field-border);
          border-radius: 999px;
          padding: 2px 8px;
          color: var(--ig-muted);
        }
        .ig-toggle {
          align-self: center;
          background: transparent;
          border: 1px solid var(--ig-field-border);
          border-radius: 999px;
          color: var(--ig-muted);
          font-size: 11px;
          padding: 6px 12px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .ig-toggle.is-on {
          background: var(--ig-accent);
          border-color: transparent;
          color: var(--ig-accent-ink);
        }
        .ig-card-edit {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 10.5px;
          color: var(--ig-muted);
        }
        .ig-card-edit input {
          background: var(--ig-field-bg);
          border: 1px solid var(--ig-field-border);
          border-radius: 6px;
          color: var(--ig-text);
          font-size: 12.5px;
          padding: 5px 8px;
          outline: none;
        }
        .ig-card-edit input:focus {
          border-color: var(--ig-accent);
        }
        .ig-card-edit-price input {
          max-width: 110px;
        }
        .ig-summary {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ig-summary > b {
          font-size: 14.5px;
        }
        .ig-summary > p {
          margin: 0;
          color: var(--ig-muted);
          font-size: 12.5px;
        }
        .ig-summary-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 320px;
          overflow-y: auto;
          padding-inline-end: 4px;
        }
      `}</style>
    </div>
  );
}
