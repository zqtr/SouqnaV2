'use client';

import { useRef } from 'react';
import { ArrowUp, ChevronDown, Paperclip, Sparkles } from 'lucide-react';
import { MetalFx } from 'metal-fx';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Loader } from '@/components/ui/loader';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { CREATION_TYPES, QUICK_PROMPTS } from './catalog';
import type { StudioCopy } from './copy';
import type { CreationTemplate, StudioStatus, StudioTab } from './types';

type Props = {
  activeTab: StudioTab;
  copy: StudioCopy;
  isRtl: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  generationProgress: number;
  status: StudioStatus;
  formatSize: string;
  referenceCount: number;
  selectedTemplate: CreationTemplate;
  onSelectTemplate: (template: CreationTemplate) => void;
  isTemplateMenuOpen: boolean;
  onToggleTemplateMenu: () => void;
  onCloseTemplateMenu: () => void;
  onAttachFiles: (files: FileList | null) => void;
};

export function CommandDeck({
  activeTab,
  copy,
  isRtl,
  prompt,
  onPromptChange,
  onSubmit,
  busy,
  generationProgress,
  status,
  formatSize,
  referenceCount,
  selectedTemplate,
  onSelectTemplate,
  isTemplateMenuOpen,
  onToggleTemplateMenu,
  onCloseTemplateMenu,
  onAttachFiles,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentType =
    CREATION_TYPES.find((item) => item.id === selectedTemplate) ?? CREATION_TYPES[0]!;
  const commandTitle =
    activeTab === 'chat'
      ? copy.chatCommandTitle
      : activeTab === 'edit'
        ? copy.editCommandTitle
        : copy.commandTitle;
  const placeholder =
    activeTab === 'chat'
      ? copy.chatPlaceholder
      : activeTab === 'edit'
        ? copy.editPromptPlaceholder
        : copy.promptPlaceholder;

  return (
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
          <strong>{commandTitle}</strong>
        </div>
        <small>{activeTab === 'chat' ? 'AI' : formatSize}</small>
      </div>

      {activeTab === 'chat' ? null : (
        <div className="sqs-quick-prompts" aria-label={copy.quickPromptsLabel}>
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.en}
              type="button"
              onClick={() => onPromptChange(isRtl ? item.ar : item.en)}
            >
              {isRtl ? item.ar : item.en}
            </button>
          ))}
        </div>
      )}

      <div className="sqs-composer-frame">
        <PromptInput
          className="sqs-composer"
          value={prompt}
          onValueChange={onPromptChange}
          maxHeight={116}
          isLoading={busy}
          onSubmit={onSubmit}
          disabled={busy}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            multiple
            hidden
            onChange={(event) => {
              onAttachFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <PromptInputTextarea placeholder={placeholder} dir="auto" />
          <div className="sqs-composer-toolbar">
            <PromptInputActions className="sqs-composer-actions">
              {activeTab === 'chat' ? null : (
                <>
                  <PromptInputAction tooltip={copy.attach}>
                    <button
                      type="button"
                      className="sqs-attach-btn"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={copy.attach}
                      disabled={busy}
                    >
                      <Paperclip size={15} />
                    </button>
                  </PromptInputAction>
                  {referenceCount > 0 ? (
                    <span className="sqs-ref-count" aria-label={copy.attachedReferences}>
                      {referenceCount}/5
                    </span>
                  ) : null}
                  <div
                    className="sqs-selector"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="sqs-selector-trigger"
                      aria-label={copy.template}
                      aria-haspopup="menu"
                      aria-expanded={isTemplateMenuOpen}
                      onClick={onToggleTemplateMenu}
                    >
                      <currentType.icon size={13} />
                      <strong>{isRtl ? currentType.ar : currentType.en}</strong>
                      <ChevronDown size={12} />
                    </button>
                    {isTemplateMenuOpen ? (
                      <div className="sqs-selector-menu" role="menu">
                        <span className="sqs-selector-title">{copy.template}</span>
                        {CREATION_TYPES.map((item) => {
                          const Icon = item.icon;
                          const active = item.id === selectedTemplate;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="menuitemradio"
                              aria-checked={active}
                              className={active ? 'is-selected' : ''}
                              onClick={() => {
                                onSelectTemplate(item.id);
                                onCloseTemplateMenu();
                              }}
                            >
                              <Icon size={13} />
                              <span>{isRtl ? item.ar : item.en}</span>
                              <small>{isRtl ? item.hintAr : item.hintEn}</small>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </PromptInputActions>
            <PromptInputActions>
              <PromptInputAction tooltip={activeTab === 'chat' ? copy.send : copy.generateShort}>
                <MetalFx
                  variant="circle"
                  preset="chromatic"
                  theme="dark"
                  strength={busy ? 0.55 : 0.88}
                  borderRadius={999}
                  ringCssPx={1.4}
                  normalizeHostStyles={false}
                  className="sqs-submit-metal"
                >
                  <button
                    type="submit"
                    disabled={busy}
                    aria-label={activeTab === 'chat' ? copy.send : copy.generateShort}
                  >
                    {busy ? <Sparkles size={15} /> : <ArrowUp size={17} />}
                  </button>
                </MetalFx>
              </PromptInputAction>
            </PromptInputActions>
          </div>
          <div
            className={busy ? 'sqs-deck-status is-generating' : 'sqs-deck-status'}
            role="status"
            aria-live="polite"
          >
            {busy ? (
              <>
                <span className="sqs-status-dot" aria-hidden />
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
              </>
            ) : (
              <>
                <span className="sqs-status-dot" aria-hidden />
                <span>{status.message || copy.statusIdle}</span>
              </>
            )}
          </div>
        </PromptInput>
      </div>
    </form>
  );
}
