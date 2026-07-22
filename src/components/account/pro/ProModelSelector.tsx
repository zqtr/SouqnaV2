'use client';

import * as React from 'react';
import Image from 'next/image';
import { Combobox } from '@base-ui/react/combobox';
import { PreviewCard } from '@base-ui/react/preview-card';
import { Check, ChevronDown, Coins, Search, SlidersHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Locale } from '@/i18n/locales';
import {
  PRO_AI_CATALOG_VERSION,
  PRO_AI_MODELS,
  calculateProAiCreditCost,
  getDefaultProAiPreferences,
  getProAiAdjustedMetrics,
  getProAiModel,
  type ProAiModel,
  type ProAiModelId,
  type ProAiPreferences,
  type ProReasoningLevel,
  type ProSpeedMode,
} from '@/lib/pro/modelCatalog';

const COPY = {
  en: {
    choose: 'Choose AI model',
    search: 'Search models or providers…',
    empty: 'No approved models found.',
    modelDetails: 'Selected model details',
    modelSettings: 'Model settings',
    credits: (count: number) => `${count} ${count === 1 ? 'credit' : 'credits'}`,
    reasoning: 'Reasoning',
    speedMode: 'Speed tier',
    reasoningOptions: { low: 'Low', medium: 'Medium', high: 'High' },
    speedOptions: { standard: 'Standard', fast: 'Fast' },
    tier: { value: 'Value', legend: 'AI Legend' },
    coding: 'Coding fit',
    design: 'Web design fit',
    context: 'Context',
    cost: 'Cost efficiency',
    verified: 'Verified',
    benchmark: 'Souqna fit profile',
    source: 'Open Gateway model source',
    tenSegments: 'out of 10',
    input: 'input',
    output: 'output',
    blended: '7:2:1 cache-hit/input/output blend',
  },
  ar: {
    choose: 'اختر نموذج الذكاء الاصطناعي',
    search: 'ابحث عن نموذج أو مزوّد…',
    empty: 'لا توجد نماذج معتمدة مطابقة.',
    modelDetails: 'تفاصيل النموذج المحدد',
    modelSettings: 'إعدادات النموذج',
    credits: (count: number) => `${count} ${count === 1 ? 'رصيد' : 'أرصدة'}`,
    reasoning: 'مستوى الاستدلال',
    speedMode: 'فئة السرعة',
    reasoningOptions: { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' },
    speedOptions: { standard: 'قياسي', fast: 'سريع' },
    tier: { value: 'اقتصادي', legend: 'أسطورة AI' },
    coding: 'ملاءمة البرمجة',
    design: 'ملاءمة تصميم الويب',
    context: 'السياق',
    cost: 'كفاءة التكلفة',
    verified: 'تاريخ التحقق',
    benchmark: 'ملف ملاءمة سوقنا',
    source: 'افتح مصدر نموذج Gateway',
    tenSegments: 'من 10',
    input: 'إدخال',
    output: 'إخراج',
    blended: 'مزيج 7:2:1 للتخزين المؤقت/الإدخال/الإخراج',
  },
} as const;

type ProModelSelectorProps = {
  locale: Locale;
  preferences: ProAiPreferences;
  disabled?: boolean;
  variant?: 'panel' | 'composer';
  onPreferencesChange: (preferences: ProAiPreferences) => void;
};

export function ProModelSelector({
  locale,
  preferences,
  disabled = false,
  variant = 'panel',
  onPreferencesChange,
}: ProModelSelectorProps) {
  const t = COPY[locale];
  const previewHandle = React.useMemo(() => PreviewCard.createHandle<ProAiModel>(), []);
  const safeSelectedId = PRO_AI_MODELS.some((model) => model.id === preferences.selectedModelId)
    ? preferences.selectedModelId
    : getDefaultProAiPreferences().selectedModelId;
  const selectedModel = getProAiModel(safeSelectedId);
  const selectedPreference = getModelPreference(preferences, selectedModel);

  function selectModel(model: ProAiModel | null) {
    if (!model) return;
    const nextPreference = getModelPreference(preferences, model);
    onPreferencesChange({
      ...preferences,
      selectedModelId: model.id,
      catalogVersion: PRO_AI_CATALOG_VERSION,
      models: { ...preferences.models, [model.id]: nextPreference },
    });
  }

  function updateConfiguration(
    modelId: ProAiModelId,
    patch: Partial<{ reasoning: ProReasoningLevel; speed: ProSpeedMode }>,
  ) {
    const model = getProAiModel(modelId);
    const current = getModelPreference(preferences, model);
    onPreferencesChange({
      ...preferences,
      selectedModelId: modelId,
      catalogVersion: PRO_AI_CATALOG_VERSION,
      models: {
        ...preferences.models,
        [modelId]: {
          reasoning: model.hasReasoningConfiguration
            ? (patch.reasoning ?? current.reasoning)
            : model.defaultReasoning,
          speed: model.hasSpeedConfiguration ? (patch.speed ?? current.speed) : 'standard',
        },
      },
    });
  }

  return (
    <div
      className="pro-model-selector"
      data-variant={variant}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <Combobox.Root<ProAiModel>
        items={PRO_AI_MODELS}
        value={selectedModel}
        disabled={disabled}
        itemToStringLabel={(model) => `${model.label} ${model.provider} ${t.tier[model.tier]}`}
        isItemEqualToValue={(model, value) => model.id === value.id}
        onValueChange={selectModel}
        onInputValueChange={() => previewHandle.close()}
        onOpenChange={(open) => {
          if (!open) previewHandle.close();
        }}
      >
        <Combobox.Trigger className="pro-model-trigger" aria-label={t.choose} disabled={disabled}>
          <ProviderMark provider={selectedModel.provider} />
          <span className="pro-model-trigger-copy">
            <strong dir="auto">{selectedModel.label}</strong>
            <small>{selectedModel.provider}</small>
          </span>
          <ConfigurationBadges
            locale={locale}
            model={selectedModel}
            reasoning={selectedPreference.reasoning}
            speed={selectedPreference.speed}
          />
          <CreditBadge
            label={t.credits(
              calculateProAiCreditCost({
                modelId: selectedModel.id,
                reasoning: selectedPreference.reasoning,
                speed: selectedPreference.speed,
              }),
            )}
          />
          <ChevronDown className="pro-model-chevron" aria-hidden />
        </Combobox.Trigger>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={7} align="start" className="pro-model-positioner">
            <Combobox.Popup className="pro-model-popup">
              <Combobox.InputGroup className="pro-model-search-group">
                <Search aria-hidden />
                <Combobox.Input
                  aria-label={t.search}
                  placeholder={t.search}
                  className="pro-model-search"
                  onFocus={() => previewHandle.close()}
                />
              </Combobox.InputGroup>
              <Combobox.Empty className="pro-model-empty">{t.empty}</Combobox.Empty>
              <PreviewCard.Root<ProAiModel> handle={previewHandle}>
                {({ payload }) => (
                  <>
                    <Combobox.List className="pro-model-list">
                      {(model: ProAiModel) => {
                        const configuration = getModelPreference(preferences, model);
                        const creditCost = calculateProAiCreditCost({
                          modelId: model.id,
                          reasoning: configuration.reasoning,
                          speed: configuration.speed,
                        });
                        return (
                          <Combobox.Item key={model.id} value={model} className="pro-model-item">
                            <PreviewCard.Trigger
                              closeDelay={180}
                              delay={80}
                              handle={previewHandle}
                              payload={model}
                              render={<div className="pro-model-item-inner" />}
                            >
                              <ProviderMark provider={model.provider} />
                              <span className="pro-model-item-copy">
                                <strong dir="auto">{model.label}</strong>
                                <small>
                                  {model.provider} · {t.tier[model.tier]}
                                </small>
                              </span>
                              <ConfigurationBadges
                                locale={locale}
                                model={model}
                                reasoning={configuration.reasoning}
                                speed={configuration.speed}
                              />
                              <CreditBadge label={t.credits(creditCost)} />
                              <Combobox.ItemIndicator className="pro-model-check">
                                <Check aria-hidden />
                              </Combobox.ItemIndicator>
                            </PreviewCard.Trigger>
                          </Combobox.Item>
                        );
                      }}
                    </Combobox.List>
                    <PreviewCard.Portal keepMounted>
                      <PreviewCard.Positioner
                        align="start"
                        side={locale === 'ar' ? 'inline-start' : 'inline-end'}
                        sideOffset={8}
                        className="pro-model-preview-positioner"
                      >
                        <PreviewCard.Popup className="pro-model-preview-popup">
                          {payload ? (
                            <ModelDetails
                              locale={locale}
                              model={payload}
                              reasoning={getModelPreference(preferences, payload).reasoning}
                              speed={getModelPreference(preferences, payload).speed}
                              compact
                            />
                          ) : null}
                        </PreviewCard.Popup>
                      </PreviewCard.Positioner>
                    </PreviewCard.Portal>
                  </>
                )}
              </PreviewCard.Root>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      <details className="pro-selected-model">
        <summary aria-label={t.modelDetails}>
          <SlidersHorizontal className="pro-model-settings-icon" aria-hidden />
          <span>{t.modelSettings}</span>
          <small>
            {t.reasoningOptions[selectedPreference.reasoning]}
            {selectedModel.hasSpeedConfiguration && selectedPreference.speed === 'fast'
              ? ` · ${t.speedOptions.fast}`
              : ''}
          </small>
          <ChevronDown className="pro-model-settings-chevron" aria-hidden />
        </summary>
        <div className="pro-selected-model-content">
          <ModelDetails
            locale={locale}
            model={selectedModel}
            reasoning={selectedPreference.reasoning}
            speed={selectedPreference.speed}
          />
          <ModelConfiguration
            locale={locale}
            model={selectedModel}
            reasoning={selectedPreference.reasoning}
            speed={selectedPreference.speed}
            disabled={disabled}
            onReasoningChange={(reasoning) => updateConfiguration(selectedModel.id, { reasoning })}
            onSpeedChange={(speed) => updateConfiguration(selectedModel.id, { speed })}
          />
        </div>
      </details>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </div>
  );
}

function getModelPreference(preferences: ProAiPreferences, model: ProAiModel) {
  const remembered = preferences.models[model.id];
  return {
    reasoning: model.hasReasoningConfiguration
      ? (remembered?.reasoning ?? model.defaultReasoning)
      : model.defaultReasoning,
    speed: model.hasSpeedConfiguration ? (remembered?.speed ?? 'standard') : ('standard' as const),
  };
}

function ModelConfiguration({
  locale,
  model,
  reasoning,
  speed,
  disabled,
  onReasoningChange,
  onSpeedChange,
}: {
  locale: Locale;
  model: ProAiModel;
  reasoning: ProReasoningLevel;
  speed: ProSpeedMode;
  disabled: boolean;
  onReasoningChange: (reasoning: ProReasoningLevel) => void;
  onSpeedChange: (speed: ProSpeedMode) => void;
}) {
  const t = COPY[locale];
  if (!model.hasReasoningConfiguration && !model.hasSpeedConfiguration) return null;
  return (
    <div className="pro-model-config">
      {model.hasReasoningConfiguration ? (
        <SegmentedControl
          label={t.reasoning}
          value={reasoning}
          options={(['low', 'medium', 'high'] as const).map((value) => ({
            value,
            label: t.reasoningOptions[value],
          }))}
          disabled={disabled}
          onChange={onReasoningChange}
        />
      ) : null}
      {model.hasSpeedConfiguration ? (
        <SegmentedControl
          label={t.speedMode}
          value={speed}
          options={(['standard', 'fast'] as const).map((value) => ({
            value,
            label: t.speedOptions[value],
          }))}
          disabled={disabled}
          onChange={onSpeedChange}
        />
      ) : null}
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const groupName = React.useId();
  return (
    <fieldset className="pro-model-segments" disabled={disabled}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ModelDetails({
  locale,
  model,
  reasoning,
  speed,
  compact = false,
}: {
  locale: Locale;
  model: ProAiModel;
  reasoning: ProReasoningLevel;
  speed: ProSpeedMode;
  compact?: boolean;
}) {
  const t = COPY[locale];
  const metrics = getProAiAdjustedMetrics(model.id, reasoning, speed);
  return (
    <div className="pro-model-details" data-compact={compact ? '' : undefined}>
      <div className="pro-model-details-heading">
        <ProviderMark provider={model.provider} />
        <div>
          <strong dir="auto">{model.label}</strong>
          <span dir="ltr">{model.provider}</span>
        </div>
        <i className="pro-model-tier">{t.tier[model.tier]}</i>
      </div>
      <p dir="auto">{model.description}</p>
      <div className="pro-model-metrics">
        <MetricBar
          locale={locale}
          label={t.coding}
          value={metrics.coding}
          model={model}
          kind="coding"
          speedMode={speed}
        />
        <MetricBar
          locale={locale}
          label={t.design}
          value={metrics.design}
          model={model}
          kind="design"
          speedMode={speed}
        />
        <MetricBar
          locale={locale}
          label={t.context}
          value={metrics.context}
          model={model}
          kind="context"
          speedMode={speed}
        />
        <MetricBar
          locale={locale}
          label={t.cost}
          value={metrics.cost}
          model={model}
          kind="cost"
          speedMode={speed}
        />
      </div>
    </div>
  );
}

function MetricBar({
  locale,
  label,
  value,
  model,
  kind,
  speedMode,
}: {
  locale: Locale;
  label: string;
  value: number;
  model: ProAiModel;
  kind: 'coding' | 'design' | 'context' | 'cost';
  speedMode: ProSpeedMode;
}) {
  const t = COPY[locale];
  const rawValue = getRawMetricValue(model, kind, speedMode, t);
  const sourceUrl = model.raw.sourceUrl;
  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="pro-metric"
            aria-label={`${label}: ${value} ${t.tenSegments}. ${rawValue}`}
          >
            <span className="pro-metric-label">
              <span>{label}</span>
              <b dir="ltr">{value}/10</b>
            </span>
            <span className="pro-metric-segments" aria-hidden>
              {Array.from({ length: 10 }, (_, index) => (
                <i key={index} data-filled={index < value ? '' : undefined} />
              ))}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="pro-metric-tooltip">
          <strong dir="auto">{rawValue}</strong>
          <span>
            {t.benchmark}: <bdi>{model.raw.profile}</bdi>
          </span>
          <span>
            {t.verified}: <bdi dir="ltr">{model.raw.verifiedAt}</bdi>
          </span>
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            {t.source}
          </a>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getRawMetricValue(
  model: ProAiModel,
  kind: 'coding' | 'design' | 'context' | 'cost',
  speedMode: ProSpeedMode,
  t: (typeof COPY)[Locale],
): string {
  if (kind === 'coding') return `${model.raw.codingScore}/10 Souqna coding fit`;
  if (kind === 'design') return `${model.raw.designScore}/10 Souqna web-design fit`;
  if (kind === 'context') return `${model.contextWindow} context window`;
  void speedMode;
  return `${model.inputPrice} ${t.input}, ${model.outputPrice} ${t.output}; ${t.blended}`;
}

function ConfigurationBadges({
  locale,
  model,
  reasoning,
  speed,
}: {
  locale: Locale;
  model: ProAiModel;
  reasoning: ProReasoningLevel;
  speed: ProSpeedMode;
}) {
  const t = COPY[locale];
  const showReasoning = model.hasReasoningConfiguration && reasoning !== model.defaultReasoning;
  const showSpeed = model.hasSpeedConfiguration && speed === 'fast';
  if (!showReasoning && !showSpeed) return null;
  return (
    <span className="pro-model-badges" dir="auto">
      {showReasoning ? <i>{t.reasoningOptions[reasoning]}</i> : null}
      {showSpeed ? <i>{t.speedOptions.fast}</i> : null}
    </span>
  );
}

function CreditBadge({ label }: { label: string }) {
  return (
    <span className="pro-credit-badge">
      <Coins aria-hidden />
      {label}
    </span>
  );
}

function ProviderMark({ provider }: { provider: ProAiModel['provider'] }) {
  const src =
    provider === 'Anthropic'
      ? '/pro/providers/anthropic.svg'
      : provider === 'Google'
        ? '/pro/providers/gemini.svg'
        : provider === 'OpenAI'
          ? '/pro/providers/openai.svg'
          : null;
  const monogram =
    provider === 'Alibaba'
      ? 'Q'
      : provider === 'DeepSeek'
        ? 'D'
        : provider === 'Moonshot AI'
          ? 'K'
          : '';
  return (
    <span className="pro-provider-mark">
      {src ? (
        <Image src={src} alt="" width={17} height={17} />
      ) : (
        <b className="pro-provider-monogram" aria-hidden>
          {monogram}
        </b>
      )}
    </span>
  );
}

const styles = `
  .pro-provider-monogram{color:#d4b06a;font:800 11px/1 var(--font-mono)}.pro-model-tier{margin-inline-start:auto;border:1px solid rgba(212,176,106,.2);border-radius:999px;background:rgba(212,176,106,.07);color:#cbb17b;padding:3px 6px;font-size:8px;font-style:normal;white-space:nowrap}
  .pro-model-selector{display:grid;gap:8px}.pro-model-trigger{width:100%;min-height:42px;display:flex;align-items:center;gap:8px;border:1px solid rgba(242,233,216,.16);border-radius:10px;background:#0b0a08;color:#f2e9d8;padding:7px 9px;text-align:start;cursor:pointer}.pro-model-trigger:hover{border-color:rgba(212,176,106,.55)}.pro-model-trigger:focus-visible{outline:2px solid #d4b06a;outline-offset:2px}.pro-model-trigger:disabled{opacity:.5;cursor:not-allowed}.pro-provider-mark{width:26px;height:26px;display:grid;place-items:center;flex:none;border:1px solid rgba(242,233,216,.12);border-radius:7px;background:#1d1914}.pro-provider-mark img{width:15px;height:15px;object-fit:contain}.pro-model-trigger-copy,.pro-model-item-copy{display:grid;min-width:0;flex:1}.pro-model-trigger-copy strong,.pro-model-item-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;unicode-bidi:plaintext}.pro-model-trigger-copy small,.pro-model-item-copy small{margin-top:2px;color:#8f8578;font-size:9px}.pro-model-chevron{width:13px;flex:none;color:#8f8578}.pro-credit-badge{display:inline-flex;align-items:center;gap:4px;flex:none;border:1px solid rgba(212,176,106,.25);border-radius:999px;background:rgba(212,176,106,.08);color:#d8bd82;padding:4px 6px;font-size:8.5px;font-weight:750;white-space:nowrap}.pro-credit-badge svg{width:10px}.pro-model-badges{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end}.pro-model-badges i{border-radius:999px;background:#2a241c;color:#bdb1a1;padding:3px 5px;font-size:8px;font-style:normal;white-space:nowrap}.pro-model-positioner{z-index:90;outline:none}.pro-model-popup{width:min(410px,var(--available-width));max-height:min(470px,var(--available-height));overflow:hidden;border:1px solid rgba(242,233,216,.17);border-radius:12px;background:#12100d;color:#f2e9d8;box-shadow:0 24px 70px rgba(0,0,0,.58);transform-origin:var(--transform-origin);transition:opacity 120ms ease,transform 120ms ease}.pro-model-popup[data-starting-style],.pro-model-popup[data-ending-style]{opacity:0;transform:scale(.98)}.pro-model-search-group{height:42px;display:flex;align-items:center;gap:7px;padding:0 10px;border-bottom:1px solid rgba(242,233,216,.12);background:#0d0b09}.pro-model-search-group>svg{width:14px;color:#857b6e}.pro-model-search{width:100%;height:100%;border:0;background:transparent;color:#f2e9d8;font-size:11px;outline:none}.pro-model-search::placeholder{color:#766d62}.pro-model-list{max-height:min(390px,var(--available-height));overflow:auto;overscroll-behavior:contain;padding:5px;outline:none}.pro-model-empty{padding:18px;color:#8f8578;font-size:11px;text-align:center}.pro-model-item{border-radius:8px;outline:none;cursor:default}.pro-model-item[data-highlighted]{background:#211c16}.pro-model-item[data-selected]{background:rgba(212,176,106,.08)}.pro-model-item-inner{min-height:47px;display:flex;align-items:center;gap:8px;padding:6px 7px;color:inherit;text-decoration:none;outline:none}.pro-model-item .pro-provider-mark{width:29px;height:29px}.pro-model-check{width:14px;display:grid;place-items:center;color:#d4b06a}.pro-model-check svg{width:13px}.pro-model-preview-positioner{z-index:91}.pro-model-preview-popup{width:310px;border:1px solid rgba(242,233,216,.17);border-radius:12px;background:#12100d;color:#f2e9d8;box-shadow:0 24px 70px rgba(0,0,0,.6);transform-origin:var(--transform-origin);transition:opacity 100ms ease,transform 100ms ease}.pro-model-preview-popup[data-starting-style],.pro-model-preview-popup[data-ending-style]{opacity:0;transform:scale(.98)}.pro-selected-model{display:grid;gap:8px;padding:9px;border:1px solid rgba(242,233,216,.1);border-radius:10px;background:#0d0b09}.pro-model-details{display:grid;gap:8px}.pro-model-details[data-compact]{padding:13px}.pro-model-details-heading{display:flex;align-items:center;gap:8px}.pro-model-details-heading>div{display:grid}.pro-model-details-heading strong{font-size:10.5px}.pro-model-details-heading span{margin-top:2px;color:#8f8578;font-size:9px}.pro-model-details>p{margin:0;color:#918678;font-size:9.5px;line-height:1.45;unicode-bidi:plaintext}.pro-model-metrics{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pro-metric{display:grid;gap:4px;border:0;background:transparent;color:inherit;padding:0;text-align:start;cursor:help}.pro-metric:focus-visible{outline:1px solid #d4b06a;outline-offset:3px}.pro-metric-label{display:flex;justify-content:space-between;gap:6px;color:#918678;font-size:8px}.pro-metric-label b{color:#bdb1a1;font:700 8px/1 var(--font-mono)}.pro-metric-segments{display:grid;grid-template-columns:repeat(10,1fr);gap:2px}.pro-metric-segments i{height:3px;border-radius:99px;background:#2d2821}.pro-metric-segments i[data-filled]{background:#d4b06a}.pro-metric-tooltip{display:grid!important;max-width:290px!important;gap:4px!important;background:#f2e9d8!important;color:#161310!important;padding:9px 10px!important;line-height:1.35!important}.pro-metric-tooltip strong{font-size:10px}.pro-metric-tooltip span{font-size:9px;opacity:.75}.pro-metric-tooltip a{color:#5e4623;font-size:9px;font-weight:800}.pro-model-config{display:grid;gap:7px}.pro-model-segments{margin:0;padding:0;border:0}.pro-model-segments legend{margin-bottom:4px;color:#857b6e;font-size:8.5px}.pro-model-segments>div{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px;padding:2px;border:1px solid rgba(242,233,216,.1);border-radius:8px;background:#090806}.pro-model-segments label{position:relative;cursor:pointer}.pro-model-segments input{position:absolute;opacity:0}.pro-model-segments span{min-height:24px;display:grid;place-items:center;border-radius:6px;color:#857b6e;font-size:8.5px;font-weight:700}.pro-model-segments input:checked+span{background:#29231b;color:#f2e9d8}.pro-model-segments input:focus-visible+span{outline:1px solid #d4b06a;outline-offset:1px}.pro-model-segments:disabled label{cursor:not-allowed;opacity:.5}
  @media(max-width:900px){.pro-model-popup{width:min(410px,calc(100vw - 20px))}.pro-model-preview-positioner{display:none}.pro-model-details>p{font-size:10.5px}.pro-model-metrics{gap:9px}.pro-model-trigger{min-height:46px}}
  @media(max-width:420px){.pro-model-trigger{gap:5px;padding-inline:6px}.pro-model-trigger-copy small{display:none}.pro-model-trigger .pro-model-badges{gap:2px}.pro-model-trigger .pro-model-badges i{max-width:52px;overflow:hidden;text-overflow:ellipsis}.pro-model-trigger .pro-credit-badge svg{display:none}.pro-credit-badge{font-size:8px}.pro-model-metrics{grid-template-columns:1fr}}
  .pro-model-selector{gap:3px}.pro-model-trigger{min-height:34px;border-color:transparent;border-radius:7px;background:transparent;padding:4px 6px}.pro-model-trigger:hover,.pro-model-trigger[data-popup-open]{border-color:rgba(242,233,216,.11);background:rgba(242,233,216,.055)}.pro-model-trigger-copy strong{font-size:10px}.pro-model-trigger-copy small{display:none}.pro-model-trigger .pro-provider-mark{width:22px;height:22px;border-radius:5px;background:#181512}.pro-model-trigger .pro-provider-mark img{width:13px;height:13px}.pro-model-popup{width:min(390px,var(--available-width));border-radius:9px;background:#141210;box-shadow:0 18px 48px rgba(0,0,0,.68);transition:opacity 140ms cubic-bezier(.2,.8,.2,1),transform 140ms cubic-bezier(.2,.8,.2,1)}.pro-model-popup[data-starting-style],.pro-model-popup[data-ending-style]{opacity:0;transform:translateY(4px) scale(.985)}.pro-model-search-group{height:38px}.pro-model-list{padding:4px}.pro-model-item{border-radius:6px}.pro-model-item-inner{min-height:42px;padding:5px 6px}.pro-model-item[data-highlighted]{background:rgba(242,233,216,.07)}.pro-model-item[data-selected]{background:rgba(212,176,106,.1)}.pro-model-item .pro-provider-mark{width:26px;height:26px;border-radius:6px}.pro-model-preview-popup{border-radius:9px;background:#141210;box-shadow:0 18px 48px rgba(0,0,0,.64);transition:opacity 130ms cubic-bezier(.2,.8,.2,1),transform 130ms cubic-bezier(.2,.8,.2,1)}.pro-model-preview-popup[data-starting-style],.pro-model-preview-popup[data-ending-style]{opacity:0;transform:translateX(4px) scale(.99)}[dir='rtl'] .pro-model-preview-popup[data-starting-style],[dir='rtl'] .pro-model-preview-popup[data-ending-style]{transform:translateX(-4px) scale(.99)}.pro-selected-model{display:block;padding:0;border:0;border-radius:0;background:transparent}.pro-selected-model>summary{min-height:27px;display:flex;align-items:center;gap:6px;padding:3px 6px;color:#7f766a;font-size:8.5px;cursor:pointer;list-style:none}.pro-selected-model>summary::-webkit-details-marker{display:none}.pro-selected-model>summary:hover{color:#bdb1a1}.pro-selected-model>summary span{font-weight:700}.pro-selected-model>summary small{flex:1;color:#6f675d;font-size:8px;text-align:end}.pro-selected-model>summary svg{width:11px;transition:transform 140ms ease}.pro-selected-model[open]>summary svg{transform:rotate(180deg)}.pro-selected-model-content{display:grid;gap:9px;margin-top:3px;padding:10px;border:1px solid rgba(242,233,216,.1);border-radius:8px;background:#0d0b09}.pro-model-details{gap:7px}.pro-model-details-heading .pro-provider-mark{width:23px;height:23px}.pro-model-details>p{font-size:9px}.pro-model-metrics{gap:6px}.pro-model-segments>div{border-radius:6px}.pro-model-segments span{border-radius:4px}
  .pro-model-settings-icon{display:none}.pro-model-selector[data-variant=composer]{display:flex;align-items:center;gap:4px;min-width:0}.pro-model-selector[data-variant=composer]>.pro-model-trigger{width:auto;max-width:220px;min-width:0;flex:0 1 auto;border-color:rgba(242,233,216,.08);background:rgba(242,233,216,.025)}.pro-model-selector[data-variant=composer]>.pro-selected-model{position:relative;flex:none}.pro-model-selector[data-variant=composer]>.pro-selected-model>summary{width:34px;height:34px;display:grid;place-items:center;padding:0;border:1px solid rgba(242,233,216,.08);border-radius:10px;background:rgba(242,233,216,.025);color:#8f8578}.pro-model-selector[data-variant=composer]>.pro-selected-model>summary:hover{border-color:rgba(212,176,106,.38);color:#d8bd82}.pro-model-selector[data-variant=composer]>.pro-selected-model>summary span,.pro-model-selector[data-variant=composer]>.pro-selected-model>summary small,.pro-model-selector[data-variant=composer] .pro-model-settings-chevron{display:none}.pro-model-selector[data-variant=composer] .pro-model-settings-icon{display:block;width:14px}.pro-model-selector[data-variant=composer] .pro-selected-model-content{position:absolute;z-index:92;inset-block-end:calc(100% + 8px);inset-inline-start:0;width:min(310px,calc(100vw - 32px));margin:0;padding:12px;border-color:rgba(242,233,216,.16);box-shadow:0 18px 52px rgba(0,0,0,.66)}
  @media(max-width:420px){.pro-model-selector[data-variant=composer]>.pro-model-trigger{max-width:172px}.pro-model-selector[data-variant=composer]>.pro-model-trigger .pro-credit-badge{display:none}}
  @media(prefers-reduced-motion:reduce){.pro-model-popup,.pro-model-preview-popup,.pro-selected-model>summary svg{transition:none}}
`;
