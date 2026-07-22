'use client';

import * as React from 'react';
import Image from 'next/image';
import { ArrowUp } from 'lucide-react';
import { PromptInput, PromptInputTextarea } from '@/components/ui/prompt-input';
import type { Locale } from '@/i18n/locales';
import type { ProJobStatus } from '@/lib/proMode';
import type { ProAiPreferences } from '@/lib/pro/modelCatalog';
import { getProGenerationProgress } from '@/lib/pro/generationProgress';
import { ProModelSelector } from '@/components/account/pro/ProModelSelector';

const COPY = {
  en: {
    label: 'Describe a Pro draft change',
    placeholder: 'Make the product grid quieter and give the hero more breathing room…',
    send: 'Generate Pro draft edit',
    generating: 'Souqy is editing the private draft',
    progress: {
      reading: ['Reading your storefront', 'Stage 1 of 4'],
      designing: ['Shaping the design direction', 'Stage 2 of 4'],
      building: ['Building your update', 'Stage 3 of 4'],
      repairing: ['Refining your update', 'Stage 3 of 4'],
      rendering: ['Rendering your preview', 'Stage 4 of 4'],
    },
    idle: 'Enter to send. Shift+Enter for a new line.',
    disclaimer: 'Souqy can make mistakes. Review the private preview before publishing.',
    remaining: (count: number) => `${count} characters remaining`,
  },
  ar: {
    label: 'صف تعديلًا لمسودة برو',
    placeholder: 'اجعل شبكة المنتجات أهدأ وزد المساحة حول عنوان الواجهة…',
    send: 'ولّد تعديلًا لمسودة برو',
    generating: 'سوقي يعدّل المسودة الخاصة',
    progress: {
      reading: ['يراجع متجرك', 'المرحلة ١ من ٤'],
      designing: ['يصوغ اتجاه التصميم', 'المرحلة ٢ من ٤'],
      building: ['يبني التعديل', 'المرحلة ٣ من ٤'],
      repairing: ['ينقّح التعديل', 'المرحلة ٣ من ٤'],
      rendering: ['يجهّز المعاينة', 'المرحلة ٤ من ٤'],
    },
    idle: 'اضغط Enter للإرسال وShift+Enter لسطر جديد.',
    disclaimer: 'قد يخطئ سوقي. راجع المعاينة الخاصة قبل النشر.',
    remaining: (count: number) => `${count} حرف متبقٍ`,
  },
} as const;

const MAX_PROMPT_LENGTH = 1200;
const PROGRESS_STEPS = [1, 2, 3, 4] as const;

type ProAiComposerProps = {
  locale: Locale;
  value: string;
  preferences: ProAiPreferences;
  disabled?: boolean;
  generating?: boolean;
  jobStatus?: ProJobStatus | null;
  variant?: 'legacy' | 'home' | 'workspace';
  onValueChange: (value: string) => void;
  onPreferencesChange: (preferences: ProAiPreferences) => void;
  onSubmit: () => void;
};

export function ProAiComposer({
  locale,
  value,
  preferences,
  disabled = false,
  generating = false,
  jobStatus = null,
  variant = 'legacy',
  onValueChange,
  onPreferencesChange,
  onSubmit,
}: ProAiComposerProps) {
  const t = COPY[locale];
  const cannotSubmit = disabled || generating || !value.trim();
  const progress = getProGenerationProgress(jobStatus);
  const [progressTitle, progressMeta] = t.progress[progress.stage];

  function submit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!cannotSubmit) onSubmit();
  }

  return (
    <form
      className="pro-ai-composer"
      data-variant={variant}
      data-generating={generating ? '' : undefined}
      onSubmit={submit}
    >
      {generating && variant !== 'workspace' ? (
        <div
          className="pro-ai-generation"
          data-stage={progress.stage}
          role="status"
          aria-live="polite"
          aria-label={`${progressTitle}. ${progressMeta}`}
        >
          <div className="pro-ai-generation-loader" aria-hidden>
            <Image src={progress.asset} alt="" width={96} height={96} unoptimized />
            <span />
          </div>
          <div className="pro-ai-generation-copy">
            <small>{progressMeta}</small>
            <strong>{progressTitle}</strong>
          </div>
          <div className="pro-ai-generation-steps" aria-hidden>
            {PROGRESS_STEPS.map((step) => (
              <span key={step} data-active={step <= progress.step ? '' : undefined} />
            ))}
          </div>
        </div>
      ) : (
        <PromptInput
          value={value}
          onValueChange={onValueChange}
          onSubmit={() => submit()}
          isLoading={generating}
          disabled={disabled || generating}
          maxHeight={220}
          className="pro-ai-prompt"
          aria-busy={generating}
        >
          <label className="sr-only" htmlFor="pro-ai-prompt-textarea">
            {t.label}
          </label>
          <PromptInputTextarea
            id="pro-ai-prompt-textarea"
            aria-label={t.label}
            placeholder={generating ? t.generating : t.placeholder}
            maxLength={MAX_PROMPT_LENGTH}
            dir="auto"
            className="pro-ai-textarea"
          />
          <div className="pro-ai-toolbar">
            <div
              className="pro-ai-model-slot"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <ProModelSelector
                locale={locale}
                preferences={preferences}
                disabled={disabled || generating}
                variant="composer"
                onPreferencesChange={onPreferencesChange}
              />
            </div>
            <div className="pro-ai-toolbar-end">
              <span
                className="pro-ai-counter"
                aria-label={t.remaining(MAX_PROMPT_LENGTH - value.length)}
                dir="ltr"
              >
                {value.length}/{MAX_PROMPT_LENGTH}
              </span>
              <button
                type="submit"
                className="pro-ai-send"
                disabled={cannotSubmit}
                aria-label={t.send}
                title={t.send}
              >
                <ArrowUp aria-hidden />
                <span className="sr-only">{t.send}</span>
              </button>
            </div>
          </div>
          <div className="pro-ai-status" role="status" aria-live="polite">
            <span aria-hidden />
            {t.idle}
          </div>
        </PromptInput>
      )}

      <p className="pro-ai-disclaimer">{t.disclaimer}</p>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </form>
  );
}

const styles = `
  .pro-ai-generation{position:relative;min-height:112px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:18px;overflow:hidden;border:1px solid rgba(232,220,196,.18);border-radius:20px;background:#080807;padding:12px 18px;color:#f7f7f3;box-shadow:0 18px 48px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.035)}.pro-ai-generation::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 18% 50%,rgba(212,176,106,.08),transparent 30%)}.pro-ai-generation-loader{position:relative;z-index:1;width:72px;height:72px;display:grid;place-items:center;flex:none}.pro-ai-generation-loader img{width:68px;height:68px;display:block}.pro-ai-generation-loader>span{display:none;width:34px;height:34px;border:1px solid rgba(232,220,196,.42);box-shadow:inset 0 0 0 7px #22211e}.pro-ai-generation-copy{position:relative;z-index:1;display:grid;gap:7px;min-width:0}.pro-ai-generation-copy small{color:#8f8678;font:650 8px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase}.pro-ai-generation-copy strong{color:#f7f7f3;font:650 18px/1.15 var(--font-sans);letter-spacing:-.025em}.pro-ai-generation-steps{position:relative;z-index:1;display:flex;align-items:center;gap:5px}.pro-ai-generation-steps span{width:16px;height:3px;border-radius:99px;background:#2b2925}.pro-ai-generation-steps span[data-active]{background:#d4b06a;box-shadow:0 0 10px rgba(212,176,106,.28)}
  .pro-ai-composer{position:sticky;inset-block-end:0;z-index:2;display:grid;gap:7px;margin-top:auto}.pro-ai-prompt{position:relative;overflow:visible!important;border:1px solid rgba(242,233,216,.17)!important;border-radius:20px!important;background:linear-gradient(180deg,#0b0a09 0%,#0e0c0a 100%)!important;color:#f2e9d8!important;padding:10px!important;box-shadow:0 18px 48px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.025)!important;opacity:1!important;transition:border-color 180ms ease,box-shadow 180ms ease}.pro-ai-prompt:focus-within{border-color:rgba(212,176,106,.55)!important;box-shadow:0 0 0 2px rgba(212,176,106,.07),0 20px 54px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.035)!important}.pro-ai-textarea{min-height:118px!important;color:#f2e9d8!important;padding:5px 5px 9px!important;font:500 12px/1.62 var(--font-sans)!important}.pro-ai-textarea::placeholder{color:#625b52!important}.pro-ai-textarea:disabled{cursor:wait!important;opacity:.72}.pro-ai-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;padding:2px}.pro-ai-model-slot{min-width:0;flex:1}.pro-ai-toolbar-end{display:flex;align-items:center;gap:8px;flex:none}.pro-ai-counter{color:#625b52;font:650 8px/1 var(--font-mono);white-space:nowrap}.pro-ai-send{width:38px;height:38px;display:grid;place-items:center;flex:none;border:1px solid #e8dcc4;border-radius:50%;background:#e8dcc4;color:#161310;padding:0;cursor:pointer;transition:background 140ms ease,border-color 140ms ease,transform 140ms ease}.pro-ai-send:hover:not(:disabled){border-color:#fdfcf9;background:#fdfcf9;transform:translateY(-1px)}.pro-ai-send:active:not(:disabled){transform:translateY(0)}.pro-ai-send:focus-visible{outline:2px solid #d4b06a;outline-offset:3px}.pro-ai-send:disabled{border-color:rgba(242,233,216,.13);background:#171513;color:#71695f;cursor:not-allowed}.pro-ai-send svg{width:17px;height:17px;flex:none}.pro-ai-status{display:flex;align-items:center;gap:7px;margin:8px 3px 0;padding-top:8px;border-top:1px solid rgba(242,233,216,.07);color:#6f675d;font-size:8.5px;line-height:1.4}.pro-ai-status>span{width:5px;height:5px;flex:none;border-radius:50%;background:#575048}.pro-ai-status[data-active]{color:#cbb17b}.pro-ai-status[data-active]>span{background:#d4b06a;box-shadow:0 0 10px rgba(212,176,106,.65);animation:pro-ai-status-pulse 1.4s ease-in-out infinite}.pro-ai-disclaimer{margin:0!important;color:#625b52!important;font-size:8.5px!important;line-height:1.45!important;text-align:center}@keyframes pro-ai-status-pulse{50%{opacity:.35;transform:scale(.72)}}
  .pro-ai-composer[data-variant='home'] .pro-ai-generation{min-height:180px;border-color:rgba(24,23,21,.18);box-shadow:0 24px 70px rgba(45,40,31,.16)}.pro-ai-composer[data-variant='home'] .pro-ai-generation-loader{width:88px;height:88px}.pro-ai-composer[data-variant='home'] .pro-ai-generation-loader img{width:84px;height:84px}.pro-ai-composer[data-variant='home'] .pro-ai-generation-copy strong{font-size:25px}.pro-ai-composer[data-variant='home'] .pro-ai-prompt{border-color:rgba(24,23,21,.13)!important;background:rgba(253,252,249,.94)!important;color:#181715!important;box-shadow:0 24px 70px rgba(45,40,31,.12),inset 0 1px 0 #fdfcf9!important}.pro-ai-composer[data-variant='home'] .pro-ai-prompt:focus-within{border-color:rgba(176,136,67,.65)!important;box-shadow:0 0 0 3px rgba(212,176,106,.12),0 28px 80px rgba(45,40,31,.14)!important}.pro-ai-composer[data-variant='home'] .pro-ai-textarea{min-height:145px!important;color:#181715!important;padding:10px 9px 18px!important;font-size:14px!important}.pro-ai-composer[data-variant='home'] .pro-ai-textarea::placeholder{color:#827d74!important}.pro-ai-composer[data-variant='home'] .pro-ai-status{border-color:rgba(24,23,21,.08);color:#827d74}.pro-ai-composer[data-variant='home'] .pro-ai-status>span{background:#99948a}.pro-ai-composer[data-variant='home'] .pro-ai-counter{color:#8d877e}.pro-ai-composer[data-variant='home'] .pro-ai-send{border-color:#181715;background:#181715;color:#f7f7f3}.pro-ai-composer[data-variant='home'] .pro-ai-send:hover:not(:disabled){border-color:#2d2924;background:#2d2924}.pro-ai-composer[data-variant='home'] .pro-ai-disclaimer{color:#827d74!important}.pro-ai-composer[data-variant='home'] .pro-model-trigger{border-color:rgba(24,23,21,.12)!important;background:#f5f3ee!important;color:#25221e!important}.pro-ai-composer[data-variant='home'] .pro-model-trigger small,.pro-ai-composer[data-variant='home'] .pro-model-trigger-copy small{color:#777168!important}.pro-ai-composer[data-variant='workspace']{position:static}.pro-ai-composer[data-variant='workspace'] .pro-ai-prompt{border-color:rgba(242,233,216,.22)!important;border-radius:24px!important;background:rgba(10,9,8,.97)!important;box-shadow:0 24px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.04)!important}.pro-ai-composer[data-variant='workspace'] .pro-ai-textarea{min-height:86px!important;max-height:132px!important;padding:9px 9px 14px!important;font-size:13px!important}.pro-ai-composer[data-variant='workspace'] .pro-ai-disclaimer{display:none}.pro-ai-composer[data-variant='workspace'] .pro-ai-status{display:none}
  .pro-ai-composer[data-variant='workspace'][data-generating] .pro-ai-prompt{border-color:rgba(212,176,106,.34)!important;background:#0d0b09!important}.pro-ai-composer[data-variant='workspace'][data-generating] .pro-ai-textarea::placeholder{color:#a99878!important}.pro-ai-composer[data-variant='workspace'][data-generating] .pro-ai-model-trigger{opacity:.54}
  @media(max-width:900px){.pro-ai-textarea{min-height:128px!important}.pro-ai-send{width:40px;height:40px}.pro-ai-disclaimer{font-size:9px!important}}
  @media(max-width:420px){.pro-ai-generation{grid-template-columns:auto minmax(0,1fr);gap:11px;padding:10px 12px}.pro-ai-generation-loader{width:54px;height:54px}.pro-ai-generation-loader img{width:50px;height:50px}.pro-ai-generation-copy strong{font-size:14px}.pro-ai-generation-steps{display:none}.pro-ai-prompt{border-radius:17px!important;padding:8px!important}.pro-ai-counter{display:none}.pro-ai-textarea{min-height:112px!important}}
  @media(prefers-reduced-motion:reduce){.pro-ai-generation-loader img{display:none}.pro-ai-generation-loader>span{display:block}.pro-ai-send:active:not(:disabled){transform:none}}
`;
