import type { Locale } from '@/i18n/locales';

/**
 * Client copy for the /begin Instagram import step + review chat.
 * Follows the component-local bilingual COPY convention of
 * SouqnaBeginExperience; server-action error strings live in
 * `copy.en.ts` / `copy.ar.ts` under `begin.instagramImport`.
 */

const AR_DIGIT_GLYPHS = '٠١٢٣٤٥٦٧٨٩';
const ar = (n: number) => String(n).replace(/\d/gu, (d) => AR_DIGIT_GLYPHS[Number(d)] ?? d);

export type ImportCopy = {
  handleLabel: string;
  handlePlaceholder: string;
  fetchCta: string;
  fetching: string;
  fetchingHint: string;
  fetchTimeout: string;
  how1: string;
  how2: string;
  how3: string;
  orManual: string;
  manualTitle: string;
  manualNote: string;
  manualHint: string;
  uploadCta: string;
  captionPlaceholder: string;
  analyzeCta: string;
  analyzing: (done: number, total: number) => string;
  aiOffNote: string;
  chatIntro: (count: number) => string;
  chatIntroNone: string;
  qIsProduct: string;
  qPrice: string;
  qPriceDm: string;
  qTitle: string;
  qCategory: string;
  chipYesSell: string;
  chipNotProduct: string;
  chipSkipPrice: string;
  chipSkipQuestion: string;
  unparsed: string;
  answered: string;
  skipProduct: string;
  acceptAll: string;
  productOf: (i: number, n: number) => string;
  summaryTitle: (n: number) => string;
  summaryBody: string;
  draftBadge: string;
  noPrice: string;
  included: string;
  excluded: string;
  editTitle: string;
  editPrice: string;
  confirmCta: string;
  backToChat: string;
  skipStep: string;
  freeTextPlaceholder: string;
  send: string;
  removeImage: string;
  prefillNote: string;
};

export const IMPORT_COPY: Record<Locale, ImportCopy> = {
  en: {
    handleLabel: 'Your Instagram handle',
    handlePlaceholder: 'noura.boutique',
    fetchCta: 'Import my shop',
    fetching: 'Reading your profile…',
    fetchingHint: 'Fetching your latest posts. This can take a minute for busy profiles.',
    fetchTimeout: 'That took too long. Try again, or upload product photos instead.',
    how1: 'We read your latest posts',
    how2: 'AI turns them into products — name, price, category',
    how3: 'You review everything before it goes live',
    orManual: 'Upload photos instead',
    manualTitle: 'Upload product photos',
    manualNote: 'Add up to 20 photos. Paste the caption next to each one if you have it — prices in captions are picked up automatically.',
    manualHint: 'PNG, JPG, or WebP · up to 5 MB each',
    uploadCta: 'Add photos',
    captionPlaceholder: 'Paste the post caption (optional)',
    analyzeCta: 'Analyze my products',
    analyzing: (done, total) => `Analyzing ${done} of ${total}…`,
    aiOffNote: 'AI analysis is offline — I pulled what I could from your captions. Let’s fill the rest together.',
    chatIntro: (count) =>
      count === 1
        ? 'I found 1 post that looks sellable. A couple of quick questions and your store is stocked.'
        : `I found ${count} posts that look sellable. A few quick questions and your store is stocked.`,
    chatIntroNone: 'I couldn’t find sellable posts, but you can add products from your dashboard anytime.',
    qIsProduct: 'Is this something you sell?',
    qPrice: 'What does this cost? A number in QAR is perfect — “250” works.',
    qPriceDm: 'You usually price this in DMs. What should the storefront show? You can also skip and price it later.',
    qTitle: 'What should we call this product?',
    qCategory: 'What category fits this? For example “Abayas” or “Home fragrance”.',
    chipYesSell: 'Yes, sell it',
    chipNotProduct: 'Not a product',
    chipSkipPrice: 'Skip — price later',
    chipSkipQuestion: 'Skip',
    unparsed: 'I didn’t catch that — try a plain number like 250, or tap Skip.',
    answered: 'Got it.',
    skipProduct: 'Skip this one',
    acceptAll: 'Accept the rest as-is',
    productOf: (i, n) => `Product ${i} of ${n}`,
    summaryTitle: (n) => (n === 1 ? '1 product ready to import' : `${n} products ready to import`),
    summaryBody: 'Tap a product to include or exclude it. Products without a price import as drafts you can price later.',
    draftBadge: 'imports as draft',
    noPrice: 'No price yet',
    included: 'Included',
    excluded: 'Excluded',
    editTitle: 'Product name',
    editPrice: 'Price (QAR)',
    confirmCta: 'Looks good — use these',
    backToChat: 'Back to questions',
    skipStep: 'Skip — I’ll add products later',
    freeTextPlaceholder: 'Type your answer…',
    send: 'Send',
    removeImage: 'Remove',
    prefillNote: 'We’ll also use your profile name, photo, and bio to pre-fill the next steps.',
  },
  ar: {
    handleLabel: 'اسم حسابك على إنستغرام',
    handlePlaceholder: 'noura.boutique',
    fetchCta: 'استورد متجري',
    fetching: 'نقرأ حسابك…',
    fetchingHint: 'نجلب أحدث منشوراتك. قد يستغرق هذا دقيقة للحسابات النشطة.',
    fetchTimeout: 'استغرق الأمر طويلاً. حاول مجدداً، أو ارفع صور المنتجات بدلاً من ذلك.',
    how1: 'نقرأ أحدث منشوراتك',
    how2: 'الذكاء يحوّلها إلى منتجات — الاسم والسعر والتصنيف',
    how3: 'تراجع كل شيء وتعدّله قبل أن يظهر في متجرك',
    orManual: 'ارفع صور المنتجات',
    manualTitle: 'ارفع صور المنتجات',
    manualNote: 'أضف حتى 20 صورة. الصق الكابشن بجانب كل صورة إن وُجد — الأسعار في الكابشن تُلتقط تلقائياً.',
    manualHint: 'PNG أو JPG أو WebP · حتى 5MB لكل صورة',
    uploadCta: 'أضف صوراً',
    captionPlaceholder: 'الصق كابشن المنشور (اختياري)',
    analyzeCta: 'حلّل منتجاتي',
    analyzing: (done, total) => `نحلل ${ar(done)} من ${ar(total)}…`,
    aiOffNote: 'تحليل الذكاء غير متاح — التقطت ما أمكن من الكابشن. لنكمل الباقي معاً.',
    chatIntro: (count) =>
      count === 1
        ? 'وجدت منشوراً واحداً يبدو منتجاً. سؤالان سريعان ويجهز متجرك.'
        : count === 2
          ? 'وجدت منشورين يبدوان منتجات. أسئلة سريعة ويجهز متجرك.'
          : count <= 10
            ? `وجدت ${ar(count)} منشورات تبدو منتجات. أسئلة سريعة ويجهز متجرك.`
            : `وجدت ${ar(count)} منشوراً تبدو منتجات. أسئلة سريعة ويجهز متجرك.`,
    chatIntroNone: 'لم أجد منشورات تبدو منتجات، لكن يمكنك إضافة المنتجات من لوحة التحكم في أي وقت.',
    qIsProduct: 'هل هذا منتج تبيعه؟',
    qPrice: 'كم سعره؟ رقم بالريال القطري يكفي — «٢٥٠» مثلاً.',
    qPriceDm: 'أنت تسعّر هذا بالخاص عادةً. ماذا يعرض المتجر؟ يمكنك التخطي والتسعير لاحقاً.',
    qTitle: 'ماذا نسمّي هذا المنتج؟',
    qCategory: 'ما التصنيف المناسب؟ مثلاً «عبايات» أو «عطور منزلية».',
    chipYesSell: 'نعم، أبيعه',
    chipNotProduct: 'ليس منتجاً',
    chipSkipPrice: 'تخطَّ — أسعّر لاحقاً',
    chipSkipQuestion: 'تخطّ',
    unparsed: 'لم أفهم — جرّب رقماً مثل ٢٥٠، أو اضغط تخطّ.',
    answered: 'تمام.',
    skipProduct: 'تخطَّ هذا',
    acceptAll: 'اقبل الباقي كما هو',
    productOf: (i, n) => `المنتج ${ar(i)} من ${ar(n)}`,
    summaryTitle: (n) =>
      n === 1
        ? 'منتج واحد جاهز للاستيراد'
        : n === 2
          ? 'منتجان جاهزان للاستيراد'
          : n <= 10
            ? `${ar(n)} منتجات جاهزة للاستيراد`
            : `${ar(n)} منتجاً جاهزاً للاستيراد`,
    summaryBody: 'اضغط على المنتج لإدراجه أو استبعاده. المنتجات بلا سعر تُستورد كمسودات تسعّرها لاحقاً.',
    draftBadge: 'يُستورد كمسودة',
    noPrice: 'بلا سعر بعد',
    included: 'مُدرج',
    excluded: 'مستبعد',
    editTitle: 'اسم المنتج',
    editPrice: 'السعر (ر.ق)',
    confirmCta: 'ممتاز — استخدمها',
    backToChat: 'عودة إلى الأسئلة',
    skipStep: 'تخطَّ — سأضيف المنتجات لاحقاً',
    freeTextPlaceholder: 'اكتب إجابتك…',
    send: 'أرسل',
    removeImage: 'إزالة',
    prefillNote: 'سنستخدم اسم حسابك وصورته ونبذته لتعبئة الخطوات التالية تلقائياً.',
  },
};
