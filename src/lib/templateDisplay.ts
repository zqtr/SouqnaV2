import type { TemplateId } from './brief';
import type { TemplatePreset } from './templates';

export const TEMPLATE_DESCRIPTION_AR: Record<TemplateId, string> = {
  atrium:
    'قالب إدارة فاخر بواجهة هادئة، مؤشرات ثقة، عرض مميز، شبكة مختارة، ومسار استفسار جاهز للبيع.',
  souqline:
    'قالب سوق سريع يحول الكتالوج الكبير إلى مسارات واضحة: فئات، بانر، بطاقات منتجات، وأسعار ظاهرة.',
  kiosk:
    'قالب إطلاق مبني حول عرض واحد: حركة سينمائية، منتج مميز، دعوة انتظار، ومنتجات مرتبطة.',
  lounge:
    'متجر مختصر وراقي بصفوف منتجات، منطق باقات، إثبات بصري، ومسار تواصل واضح للتحويل.',
  studio:
    'قالب خدمات يحول المواعيد والباقات والإضافات إلى متجر عملي ببطاقات خدمات واستفسارات.',
  bazaar:
    'نظام دروبات وإصدارات محدودة مع حركة، رفوف مجموعات، وحدات استعجال، وشبكات منتجات.',
  vitrine:
    'قالب حزمة المنتج فاخر للعروض المعبأة ومتاجر الأعمال مع واجهة قوية، إثبات مقارن، وكتل Max+ تجارية.',
  monoline:
    'قالب للضيافة يجمع منتجات المنيو، الحجوزات، بطاقات الهدايا، ورسائل التوصيل المحلي.',
  harvest:
    'قالب للمنتجات الحرفية مع قصة منشأ، معرض عملية، باقات، كتالوج مجمع، ورسائل طمأنة.',
  launchpad:
    'قالب للمنتجات الرقمية والبرامج والخدمات مع مزايا واضحة، مستويات عروض، ودعوات تجربة.',
  frame:
    'قالب متجر بصري يحول المعرض إلى مبيعات: مطبوعات، جلسات، تكليفات، وعرض داكن فاخر.',
};

export function templateNameParts(
  label: string,
  isRtl: boolean,
): { primary: string; secondary?: string } {
  const [latin, arabic] = label.split('·').map((s) => s.trim());
  return isRtl
    ? { primary: arabic || latin || label, secondary: latin }
    : { primary: latin || label, secondary: arabic };
}

export function templateDescription(preset: TemplatePreset, isRtl: boolean): string {
  return isRtl ? (TEMPLATE_DESCRIPTION_AR[preset.id] ?? preset.description) : preset.description;
}
