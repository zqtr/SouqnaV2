import type { BusinessType, DesignId } from '@/lib/brief';
import type { Locale } from '@/i18n/locales';
import {
  PRO_RECOMMENDATION_VERSION,
  type ProBrandIntent,
  type ProFoundationId,
  type ProFoundationRecommendation,
} from '@/lib/proMode';

export type ProRecommendationContext = {
  locale: Locale;
  businessType: BusinessType;
  design: DesignId;
  hasLogo: boolean;
  hasTagline: boolean;
  isPublished: boolean;
};

const FOUNDATIONS: readonly ProFoundationId[] = ['structure', 'motion', 'bespoke'];

const COPY = {
  en: {
    structure: [
      'A clear editorial system supports trust and decisive shopping.',
      'Structure gives your existing catalogue a disciplined conversion path.',
    ],
    motion: [
      'A more expressive launch rhythm matches the energy you want customers to feel.',
      'Motion helps new releases and campaign moments lead the storefront.',
    ],
    bespoke: [
      'Your answers call for a brand world that is not constrained by a preset composition.',
      'Souqy can use your identity and catalogue to shape a one-of-one direction.',
    ],
  },
  ar: {
    structure: [
      'نظام تحريري واضح يدعم الثقة ويقود العميل إلى قرار الشراء.',
      'تمنح البنية كتالوجك الحالي مسار تحويل منضبطًا وواضحًا.',
    ],
    motion: [
      'إيقاع إطلاق أكثر تعبيرًا ينسجم مع الطاقة التي تريد أن يشعر بها العميل.',
      'تجعل الحركة الإصدارات الجديدة والحملات في مقدمة المتجر.',
    ],
    bespoke: [
      'إجاباتك تشير إلى عالم علامة لا يقيّده تركيب جاهز.',
      'يستطيع سوقي استخدام هويتك وكتالوجك لصناعة اتجاه فريد.',
    ],
  },
} as const;

function add(scores: Record<ProFoundationId, number>, foundation: ProFoundationId, value: number) {
  scores[foundation] += value;
}

export function recommendProFoundation(
  intent: ProBrandIntent,
  context: ProRecommendationContext,
): ProFoundationRecommendation {
  const scores: Record<ProFoundationId, number> = { structure: 0, motion: 0, bespoke: 0 };

  add(
    scores,
    intent.visualAmbition === 'timeless'
      ? 'structure'
      : intent.visualAmbition === 'expressive'
        ? 'motion'
        : 'bespoke',
    4,
  );
  add(
    scores,
    intent.customerFeeling === 'trust'
      ? 'structure'
      : intent.customerFeeling === 'energy'
        ? 'motion'
        : 'bespoke',
    3,
  );
  add(
    scores,
    intent.launchPriority === 'conversion'
      ? 'structure'
      : intent.launchPriority === 'launch'
        ? 'motion'
        : 'bespoke',
    4,
  );

  if (context.design === 'atrium') add(scores, 'structure', 1);
  if (context.design === 'souk') add(scores, 'motion', 1);
  if (
    ['photography', 'art_gallery', 'graphic_design', 'events_weddings'].includes(
      context.businessType,
    )
  ) {
    add(scores, 'bespoke', 1);
  }
  if (['clothing_store', 'perfume_oud', 'fnb_brand'].includes(context.businessType)) {
    add(scores, 'motion', 1);
  }
  if (['ecommerce', 'home_kitchen', 'real_estate', 'tutoring'].includes(context.businessType)) {
    add(scores, 'structure', 1);
  }
  if (!context.hasLogo && !context.hasTagline) add(scores, 'structure', 1);
  if (context.isPublished) add(scores, 'structure', 1);

  const foundation = FOUNDATIONS.reduce((best, candidate) =>
    scores[candidate] > scores[best] ? candidate : best,
  );

  return {
    foundation,
    reasons: [...COPY[context.locale][foundation]],
    version: PRO_RECOMMENDATION_VERSION,
  };
}
