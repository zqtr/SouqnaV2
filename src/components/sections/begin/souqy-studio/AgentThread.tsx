'use client';
/* eslint-disable @next/next/no-img-element */

import type { RefObject } from 'react';
import { SouqyLogo } from '@/components/admin/SouqyLogo';
import { Loader } from '@/components/ui/loader';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { AssetCard } from './AssetCard';
import type { StudioCopy } from './copy';
import type {
  ReferenceImage,
  SouqyStudioAsset,
  StudioTab,
  StudioThreadMessage,
} from './types';

type Props = {
  activeTab: StudioTab;
  copy: StudioCopy;
  isRtl: boolean;
  messages: StudioThreadMessage[];
  generationProgress: number;
  references: ReferenceImage[];
  selectedAsset: SouqyStudioAsset | null;
  libraryAssets: SouqyStudioAsset[];
  threadRef: RefObject<HTMLElement>;
  onEditAsset: (asset: SouqyStudioAsset) => void;
};

export function AgentThread({
  activeTab,
  copy,
  isRtl,
  messages,
  generationProgress,
  references,
  selectedAsset,
  libraryAssets,
  threadRef,
  onEditAsset,
}: Props) {
  return (
    <section ref={threadRef} className="sqs-thread" aria-label={copy.conversation}>
      <div className="sqs-thread-stream">
        {activeTab === 'edit' ? (
          <div className="sqs-edit-shelf">
            <div>
              <small>{copy.modeLabels.edit}</small>
              <strong>{selectedAsset?.title ?? copy.editSelectTitle}</strong>
              <p>{references.length ? copy.editReady : copy.editSelectBody}</p>
            </div>
            <div className="sqs-edit-picks">
              {libraryAssets.slice(0, 4).map((asset, index) => (
                <button
                  key={asset.id ?? `${asset.url}-${index}`}
                  type="button"
                  onClick={() => onEditAsset(asset)}
                  aria-label={`${copy.editThis}: ${asset.title}`}
                >
                  <img src={asset.url} alt={asset.title} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <article
            key={message.id}
            className={`sqs-msg is-${message.role}${message.status ? ` is-${message.status}` : ''}`}
          >
            {message.role === 'assistant' ? (
              <span className="sqs-msg-avatar" aria-hidden>
                <SouqyLogo size={24} />
              </span>
            ) : null}
            <div className="sqs-msg-bubble">
              <div className="sqs-msg-meta">
                <strong>{message.role === 'user' ? copy.you : copy.assistantName}</strong>
                {message.templateLabel || message.formatLabel || message.modelLabel ? (
                  <span>
                    {[message.templateLabel, message.formatLabel, message.modelLabel]
                      .filter(Boolean)
                      .join(' / ')}
                  </span>
                ) : null}
              </div>
              <p>{message.content}</p>

              {message.status === 'creating' ? (
                <div className="sqs-msg-progress" role="status" aria-live="polite">
                  <Loader variant="wave" size="sm" />
                  <TextShimmer as="span" duration={2.6} spread={18} className="sqs-status-shimmer">
                    {activeTab === 'chat' ? copy.chatThinking : copy.creating}
                  </TextShimmer>
                  {activeTab === 'chat' ? null : (
                    <>
                      <span className="sqs-progress-percent">{generationProgress}%</span>
                      <span className="sqs-progress-track" aria-hidden>
                        <i
                          className="sqs-progress-bar"
                          style={{ inlineSize: `${generationProgress}%` }}
                        />
                      </span>
                    </>
                  )}
                </div>
              ) : null}

              {message.assets?.length ? (
                <div className="sqs-msg-assets">
                  {message.assets.map((asset, index) => (
                    <AssetCard
                      key={asset.id ?? `${asset.url}-${index}`}
                      asset={asset}
                      copy={copy}
                      isRtl={isRtl}
                      onEdit={onEditAsset}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
