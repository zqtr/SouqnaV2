'use client';

import { ArrowUp, Maximize2, RefreshCw, Sparkles } from 'lucide-react';
import { MetalFx } from 'metal-fx';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import type { StudioCopy } from './copy';
import type { CatalogStorefront } from './types';

type Props = {
  copy: StudioCopy;
  storefronts: CatalogStorefront[];
  storefront: CatalogStorefront | null;
  previewKey: number;
  prompt: string;
  statusMessage: string;
  isDesigning: boolean;
  onPromptChange: (value: string) => void;
  onSelectStorefront: (slug: string) => void;
  onRefreshPreview: () => void;
  onSubmit: () => void;
};

export function WebPreview({
  copy,
  storefronts,
  storefront,
  previewKey,
  prompt,
  statusMessage,
  isDesigning,
  onPromptChange,
  onSelectStorefront,
  onRefreshPreview,
  onSubmit,
}: Props) {
  if (!storefront) {
    return (
      <section className="sqs-panel" aria-label={copy.modeLabels.web}>
        <p className="sqs-empty">{copy.noStorefront}</p>
      </section>
    );
  }

  const previewSrc = `/brief/${encodeURIComponent(storefront.slug)}`;

  return (
    <section className="sqs-web" aria-label={copy.modeLabels.web}>
      <div className="sqs-browser">
        <div className="sqs-browser-bar">
          <span aria-hidden />
          <span aria-hidden />
          <span aria-hidden />
          <strong>{`${storefront.slug}.souqna.qa`}</strong>
          <div className="sqs-browser-actions">
            {storefronts.length > 1 ? (
              <select
                value={storefront.slug}
                aria-label={copy.storefront}
                onChange={(event) => onSelectStorefront(event.target.value)}
              >
                {storefronts.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.businessName}
                  </option>
                ))}
              </select>
            ) : null}
            <button type="button" onClick={onRefreshPreview}>
              <RefreshCw size={13} />
              <span>{copy.refresh}</span>
            </button>
            <a href={previewSrc} target="_blank" rel="noreferrer">
              <Maximize2 size={13} />
              <span>{copy.openStorefront}</span>
            </a>
          </div>
        </div>
        <iframe
          key={`${storefront.slug}-${previewKey}`}
          className="sqs-web-frame"
          src={previewSrc}
          title={`${copy.modeLabels.web}: ${storefront.businessName}`}
        />
      </div>
      <form
        className="sqs-deck"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="sqs-deck-head">
          <div>
            <small>{copy.studioCommand}</small>
            <strong>{copy.webCommandTitle}</strong>
          </div>
          <small>{copy.live}</small>
        </div>
        <div className="sqs-composer-frame">
          <PromptInput
            className="sqs-composer"
            value={prompt}
            onValueChange={onPromptChange}
            maxHeight={92}
            isLoading={isDesigning}
            onSubmit={onSubmit}
            disabled={isDesigning}
          >
            <PromptInputTextarea placeholder={copy.webPromptPlaceholder} dir="auto" />
            <div className="sqs-composer-toolbar">
              <PromptInputActions>
                <PromptInputAction tooltip={copy.webDesign}>
                  <MetalFx
                    variant="circle"
                    preset="chromatic"
                    theme="dark"
                    strength={isDesigning ? 0.55 : 0.88}
                    borderRadius={999}
                    ringCssPx={1.4}
                    normalizeHostStyles={false}
                    className="sqs-submit-metal"
                  >
                    <button type="submit" disabled={isDesigning} aria-label={copy.webDesign}>
                      {isDesigning ? <Sparkles size={15} /> : <ArrowUp size={17} />}
                    </button>
                  </MetalFx>
                </PromptInputAction>
              </PromptInputActions>
            </div>
            <div
              className={isDesigning ? 'sqs-deck-status is-generating' : 'sqs-deck-status'}
              role="status"
              aria-live="polite"
            >
              <span className="sqs-status-dot" aria-hidden />
              <span>{isDesigning ? copy.webDesigning : statusMessage || copy.webPromptHint}</span>
            </div>
          </PromptInput>
        </div>
      </form>
    </section>
  );
}
