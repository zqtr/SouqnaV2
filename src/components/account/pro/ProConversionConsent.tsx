'use client';

import { Archive, Check, Code2, EyeOff, ShieldCheck } from 'lucide-react';
import { MobiusLoopIcon } from '@/components/mobius-loop-icon';
import type { Locale } from '@/i18n/locales';
import type { ProFoundationId } from '@/lib/proMode';

const COPY = {
  en: {
    kicker: 'Protection review',
    title: 'Your Easy storefront stays within reach.',
    body: 'This checkpoint creates a recovery point before the first Pro workspace exists.',
    items: [
      [
        'Saved to Storage',
        'Easy draft and published presentation, pages, navigation, palette, theme, product index, and checkout presentation.',
      ],
      [
        'Deliberately excluded',
        'Products, stock, orders, customers, payment credentials, apps, domains, and Pro source are never copied.',
      ],
      [
        'Created separately',
        'A private TSX, theme, and CSS workspace connected to your current catalogue through the restricted Souqna SDK.',
      ],
      [
        'Kept private',
        'Selection, generation, validation, and building do not publish. Only the Builder Publish action can change the live storefront.',
      ],
    ],
    acknowledge:
      'I understand that Easy remains recoverable and Pro remains private until I publish it.',
    back: 'Back to direction',
    submit: 'Save Easy version and create Pro workspace',
    submitting: 'Saving Easy and creating Pro workspace',
  },
  ar: {
    kicker: 'مراجعة الحماية',
    title: 'يبقى متجرك السهل قريبًا وقابلًا للاستعادة.',
    body: 'تنشئ هذه الخطوة نقطة استعادة قبل إنشاء مساحة برو الأولى.',
    items: [
      [
        'يُحفظ في التخزين',
        'مسودة وعرض الوضع السهل المنشور، والصفحات، والتنقل، والألوان، والثيم، وفهرس المنتجات، وعرض الدفع.',
      ],
      [
        'مستبعد عمدًا',
        'لا ننسخ المنتجات أو المخزون أو الطلبات أو العملاء أو بيانات الدفع أو التطبيقات أو النطاقات أو كود برو.',
      ],
      [
        'يُنشأ بشكل منفصل',
        'مساحة TSX وثيم وCSS خاصة متصلة بكتالوجك الحالي عبر حزمة Souqna SDK المقيّدة.',
      ],
      [
        'يبقى خاصًا',
        'الاختيار والتوليد والتحقق والبناء لا تنشر شيئًا. زر النشر داخل المنشئ وحده يغيّر المتجر المباشر.',
      ],
    ],
    acknowledge: 'أفهم أن الوضع السهل يبقى قابلًا للاستعادة وأن برو يبقى خاصًا حتى أنشره.',
    back: 'العودة إلى الاتجاه',
    submit: 'احفظ نسخة Easy وأنشئ مساحة Pro',
    submitting: 'جارٍ حفظ Easy وإنشاء مساحة Pro',
  },
} as const;

export function ProConversionConsent({
  locale,
  foundation,
  acknowledged,
  busy,
  onAcknowledgedChange,
  onBack,
  onConfirm,
}: {
  locale: Locale;
  foundation: ProFoundationId;
  acknowledged: boolean;
  busy: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const t = COPY[locale];
  const icons = [Archive, EyeOff, Code2, ShieldCheck];

  return (
    <section className="pro-protection" aria-labelledby="pro-stage-heading">
      <div className="pro-stage-copy">
        <span className="pro-kicker">{t.kicker}</span>
        <h1 id="pro-stage-heading" tabIndex={-1}>
          {t.title}
        </h1>
        <p>{t.body}</p>
        <span className="pro-foundation-stamp" dir="auto">
          {foundation}
        </span>
      </div>
      <div className="pro-protection-panel">
        <div className="pro-protection-list">
          {t.items.map(([title, body], index) => {
            const Icon = icons[index]!;
            return (
              <article key={title}>
                <span aria-hidden>
                  <Icon />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </div>
              </article>
            );
          })}
        </div>
        <label className="pro-acknowledge">
          <input
            type="checkbox"
            checked={acknowledged}
            disabled={busy}
            onChange={(event) => onAcknowledgedChange(event.target.checked)}
          />
          <span aria-hidden>
            <Check />
          </span>
          <strong>{t.acknowledge}</strong>
        </label>
        <div className="pro-stage-actions">
          <button type="button" className="pro-button-secondary" disabled={busy} onClick={onBack}>
            {t.back}
          </button>
          <button
            type="button"
            className="pro-button-primary"
            disabled={!acknowledged || busy}
            aria-busy={busy}
            onClick={onConfirm}
          >
            {busy ? <MobiusLoopIcon active /> : null}
            {busy ? t.submitting : t.submit}
          </button>
        </div>
      </div>
    </section>
  );
}
