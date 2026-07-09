'use client';
/* eslint-disable @next/next/no-img-element */

import { useRef } from 'react';
import {
  Activity,
  Cpu,
  ImagePlus,
  Package,
  Ratio,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react';
import {
  SOUQY_STUDIO_MODELS,
  estimateSouqyStudioModelCost,
  formatSouqyStudioUsd,
  type SouqyStudioModelId,
} from '@/lib/souqy-studio/modelCatalog';
import { FORMAT_PRESETS } from './catalog';
import type { StudioCopy } from './copy';
import { AssetCard } from './AssetCard';
import type {
  CatalogProduct,
  CatalogStorefront,
  ReferenceImage,
  SouqyStudioAsset,
  SouqyStudioProject,
  StudioFormatKey,
  StudioQuality,
  StudioStatus,
  StudioTab,
} from './types';

/** A single line in Souqy's realtime agent stream (code-mode panel). */
export type AgentEvent = {
  id: string;
  kind: 'turn' | 'tool';
  text: string;
  detail?: string;
  time?: string;
  state: 'run' | 'done' | 'error';
};

type Props = {
  copy: StudioCopy;
  isRtl: boolean;
  /** Active studio mode. In `code` the panel drops the image-generation
   *  sections (model, size, settings, catalog, references, selected asset)
   *  and shows only code-relevant context — no more poster tooling while
   *  editing blocks.json. */
  activeTab: StudioTab;
  isOpen: boolean;
  onClose: () => void;
  project: SouqyStudioProject | null;
  storefronts: CatalogStorefront[];
  selectedStorefrontSlug: string;
  onSelectStorefront: (slug: string) => void;
  selectedModelId: SouqyStudioModelId;
  onSelectModel: (modelId: SouqyStudioModelId) => void;
  formatDimensions: { width: number; height: number };
  quality: StudioQuality;
  onQualityChange: (quality: StudioQuality) => void;
  printBleed: boolean;
  onPrintBleedChange: (value: boolean) => void;
  brandInstructions: string;
  onBrandInstructionsChange: (value: string) => void;
  creativity: number;
  onCreativityChange: (value: number) => void;
  selectedFormat: StudioFormatKey;
  onSelectFormat: (format: StudioFormatKey) => void;
  products: CatalogProduct[];
  selectedProductIds: string[];
  onToggleProduct: (id: string) => void;
  references: ReferenceImage[];
  onRemoveReference: (id: string) => void;
  onAttachFiles: (files: FileList | null) => void;
  status: StudioStatus;
  /** Live tool-call transcript from the code editor, rendered in code mode. */
  agentEvents?: AgentEvent[];
  selectedAsset: SouqyStudioAsset | null;
  onEditAsset: (asset: SouqyStudioAsset) => void;
};

export function ContextInspector({
  copy,
  isRtl,
  activeTab,
  isOpen,
  onClose,
  project,
  storefronts,
  selectedStorefrontSlug,
  onSelectStorefront,
  selectedModelId,
  onSelectModel,
  formatDimensions,
  quality,
  onQualityChange,
  printBleed,
  onPrintBleedChange,
  brandInstructions,
  onBrandInstructionsChange,
  creativity,
  onCreativityChange,
  selectedFormat,
  onSelectFormat,
  products,
  selectedProductIds,
  onToggleProduct,
  references,
  onRemoveReference,
  onAttachFiles,
  status,
  agentEvents,
  selectedAsset,
  onEditAsset,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCode = activeTab === 'code';

  return (
    <>
      <button
        type="button"
        className="sqs-context-backdrop"
        aria-hidden={!isOpen}
        tabIndex={-1}
        onClick={onClose}
      />
      <aside className="sqs-context" aria-label={copy.contextTitle}>
        <div className="sqs-context-head">
          <strong>{copy.contextTitle}</strong>
          <button type="button" className="sqs-context-close" onClick={onClose}>
            <X size={13} />
            <span>{copy.contextClose}</span>
          </button>
        </div>

        {!isCode ? (
          <section className="sqs-context-section">
            <span className="sqs-context-kicker">
              <Store size={11} />
              {copy.sessionLabel}
            </span>
            {project ? (
              <p className="sqs-context-status">{project.businessName}</p>
            ) : (
              <p className="sqs-context-empty">{copy.noProjects}</p>
            )}
            <label className="sqs-field">
              <span>{copy.storefront}</span>
              <select
                value={selectedStorefrontSlug}
                onChange={(event) => onSelectStorefront(event.target.value)}
              >
                <option value="">{copy.noStorefront}</option>
                {storefronts.map((storefront) => (
                  <option key={storefront.slug} value={storefront.slug}>
                    {storefront.businessName}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : (
          <div className="sqs-agent">
            <div className="sqs-agent-stream">
              {agentEvents && agentEvents.length > 0 ? (
                agentEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`sqs-agent-row ${
                      ev.kind === 'turn'
                        ? 'is-turn'
                        : ev.state === 'run'
                          ? 'is-run'
                          : ev.state === 'error'
                            ? 'is-error'
                            : 'is-done'
                    }`}
                  >
                    <span className="ic">
                      {ev.kind === 'turn'
                        ? '›'
                        : ev.state === 'run'
                          ? '•'
                          : ev.state === 'error'
                            ? '✕'
                            : '✓'}
                    </span>
                    <span className="tx">
                      {ev.text}
                      {ev.detail ? <em> · {ev.detail}</em> : null}
                    </span>
                    {ev.time ? <span className="tm">{ev.time}</span> : null}
                  </div>
                ))
              ) : (
                <>
                  {project ? (
                    <div className="sqs-agent-row is-done">
                      <span className="ic">✓</span>
                      <span className="tx">
                        Session started · <em>{project.businessName}</em>
                      </span>
                    </div>
                  ) : (
                    <div className="sqs-agent-row">
                      <span className="ic">›</span>
                      <span className="tx">{copy.noStorefront}</span>
                    </div>
                  )}
                  <p className="sqs-agent-hint">
                    Ask Souqy in the editor — each step lands here as it runs.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {!isCode ? (
          <>
        <section className="sqs-context-section">
          <span className="sqs-context-kicker">
            <Cpu size={11} />
            {copy.model}
          </span>
          <div className="sqs-model-list">
            {SOUQY_STUDIO_MODELS.map((model) => {
              const active = model.id === selectedModelId;
              const disabled = references.length > 0 && !model.supportsReferences;
              const cost = estimateSouqyStudioModelCost({
                modelId: model.id,
                width: formatDimensions.width,
                height: formatDimensions.height,
                quality,
              });
              return (
                <button
                  key={model.id}
                  type="button"
                  className={active ? 'sqs-model-row is-active' : 'sqs-model-row'}
                  disabled={disabled}
                  title={disabled ? copy.referenceModelUnsupported : model.bestFor}
                  onClick={() => onSelectModel(model.id)}
                >
                  <span className="sqs-model-copy">
                    <strong>{model.label}</strong>
                    <small>
                      {model.latency} / {model.bestFor}
                    </small>
                    <small>
                      {formatSouqyStudioUsd(cost.baseUsd)} x3 ={' '}
                      {formatSouqyStudioUsd(cost.billableUsd)}
                    </small>
                  </span>
                  <span className="sqs-model-cost">{cost.credits}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="sqs-context-section">
          <span className="sqs-context-kicker">
            <Ratio size={11} />
            {copy.size}
          </span>
          <div className="sqs-format-grid">
            {FORMAT_PRESETS.map((format) => {
              const Icon = format.icon;
              const active = format.id === selectedFormat;
              return (
                <button
                  key={format.id}
                  type="button"
                  className={active ? 'sqs-format-chip is-active' : 'sqs-format-chip'}
                  onClick={() => onSelectFormat(format.id)}
                >
                  <Icon size={13} />
                  <span>{isRtl ? format.ar : format.en}</span>
                  <small>{format.size}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="sqs-context-section">
          <span className="sqs-context-kicker">
            <SlidersHorizontal size={11} />
            {copy.settings}
          </span>
          <label className="sqs-field">
            <span>{copy.quality}</span>
            <select
              value={quality}
              onChange={(event) => onQualityChange(event.target.value as StudioQuality)}
            >
              <option value="standard">{copy.standard}</option>
              <option value="high">{copy.high}</option>
              <option value="print">{copy.print}</option>
            </select>
          </label>
          <label className="sqs-toggle-row">
            <span>{copy.bleed}</span>
            <input
              type="checkbox"
              checked={printBleed}
              onChange={(event) => onPrintBleedChange(event.target.checked)}
            />
          </label>
          <label className="sqs-field">
            <span>{copy.instructions}</span>
            <textarea
              value={brandInstructions}
              onChange={(event) => onBrandInstructionsChange(event.target.value)}
              maxLength={500}
              placeholder={copy.instructionsPlaceholder}
            />
          </label>
          <label className="sqs-slider">
            <div>
              <span>{copy.creativity}</span>
              <small>{creativity}/10</small>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={creativity}
              onChange={(event) => onCreativityChange(Number(event.target.value))}
            />
          </label>
        </section>

        <section className="sqs-context-section">
          <span className="sqs-context-kicker">
            <Package size={11} />
            {copy.catalog}
          </span>
          <div className="sqs-product-list">
            {products.slice(0, 6).map((product) => (
              <button
                key={product.id}
                type="button"
                className={
                  selectedProductIds.includes(product.id)
                    ? 'sqs-product-row is-active'
                    : 'sqs-product-row'
                }
                onClick={() => onToggleProduct(product.id)}
              >
                {product.imageUrl ? (
                  <i style={{ backgroundImage: `url("${product.imageUrl}")` }} aria-hidden />
                ) : (
                  <ShoppingBag size={14} />
                )}
                <span>{product.title}</span>
                <small>
                  {product.priceQar !== null ? `${product.priceQar} QAR` : product.storefrontName}
                </small>
              </button>
            ))}
          </div>
          {products.length === 0 ? <p className="sqs-context-empty">{copy.noProducts}</p> : null}
        </section>

        <section className="sqs-context-section">
          <span className="sqs-context-kicker">
            <ImagePlus size={11} />
            {copy.attachedReferences}
          </span>
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
          <div className="sqs-ref-list">
            {references.map((reference) => (
              <div key={reference.id} className="sqs-ref-item">
                <img src={reference.url} alt={reference.name || copy.attachedReference} />
                <span>{reference.name || copy.attachedReference}</span>
                <button
                  type="button"
                  onClick={() => onRemoveReference(reference.id)}
                  aria-label={copy.removeReference}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {references.length < 5 ? (
              <button
                type="button"
                className="sqs-ref-add"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={13} />
                <span>{copy.attach}</span>
              </button>
            ) : null}
          </div>
        </section>

          </>
        ) : null}

        {!isCode ? (
          <section className="sqs-context-section">
            <span className="sqs-context-kicker">
              <Activity size={11} />
              {copy.statusLabel}
            </span>
            <p className="sqs-context-status">{status.message || copy.statusIdle}</p>
          </section>
        ) : null}

        {!isCode ? (
        <section className="sqs-context-section">
          <span className="sqs-context-kicker">
            <ImagePlus size={11} />
            {copy.selected}
          </span>
          {selectedAsset ? (
            <div className="sqs-selected-asset">
              <AssetCard asset={selectedAsset} copy={copy} isRtl={isRtl} onEdit={onEditAsset} />
            </div>
          ) : (
            <p className="sqs-context-empty">{copy.noSelection}</p>
          )}
        </section>
        ) : null}
      </aside>
    </>
  );
}
