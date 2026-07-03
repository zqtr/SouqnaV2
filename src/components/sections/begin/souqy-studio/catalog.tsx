import {
  Archive,
  BadgeCheck,
  Code2,
  FileImage,
  FolderKanban,
  Globe2,
  History,
  ImageIcon,
  LayoutTemplate,
  MessageCircle,
  Package,
  Palette,
  PanelLeft,
  Pencil,
  Printer,
  ShoppingBag,
  Sparkles,
  Video,
} from 'lucide-react';
import type {
  CreationTemplate,
  StudioFormatKey,
  StudioIcon,
  StudioIconProps,
  StudioModeMeta,
} from './types';

function TikTokIcon(props: StudioIconProps) {
  return <span style={{ fontSize: props.size ?? 16, fontWeight: 800 }}>T</span>;
}

function GhostIcon(props: StudioIconProps) {
  return <span style={{ fontSize: props.size ?? 16, fontWeight: 800 }}>S</span>;
}

function WhatsAppIcon(props: StudioIconProps) {
  return <span style={{ fontSize: props.size ?? 16, fontWeight: 800 }}>W</span>;
}

function XIcon(props: StudioIconProps) {
  return <span style={{ fontSize: props.size ?? 16, fontWeight: 800 }}>X</span>;
}

function MegaphoneIcon(props: StudioIconProps) {
  return <Sparkles size={props.size ?? 16} />;
}

export const CREATION_TYPES: Array<{
  id: CreationTemplate;
  icon: StudioIcon;
  en: string;
  ar: string;
  hintEn: string;
  hintAr: string;
  defaultFormat: StudioFormatKey;
}> = [
  {
    id: 'logo',
    icon: BadgeCheck,
    en: 'Logo',
    ar: 'شعار',
    hintEn: 'Marks, icons, wordmarks',
    hintAr: 'علامات وشعارات وخطوط',
    defaultFormat: 'logo-square',
  },
  {
    id: 'launch-poster',
    icon: FileImage,
    en: 'Poster',
    ar: 'بوستر',
    hintEn: 'Launches and offers',
    hintAr: 'إطلاقات وعروض',
    defaultFormat: 'instagram-post',
  },
  {
    id: 'wide-banner',
    icon: LayoutTemplate,
    en: 'Banner',
    ar: 'بانر',
    hintEn: 'Storefront and web',
    hintAr: 'للمتجر والويب',
    defaultFormat: 'wide-banner',
  },
  {
    id: 'ad-creative',
    icon: MegaphoneIcon,
    en: 'Ad creative',
    ar: 'إعلان',
    hintEn: 'Paid social layouts',
    hintAr: 'إعلانات السوشال',
    defaultFormat: 'instagram-post',
  },
  {
    id: 'restaurant-menu',
    icon: Archive,
    en: 'Menu',
    ar: 'منيو',
    hintEn: 'Restaurants, cafes, salons',
    hintAr: 'مطاعم ومقاهي وصالونات',
    defaultFormat: 'menu-print',
  },
  {
    id: 'product-card',
    icon: ShoppingBag,
    en: 'Product card',
    ar: 'بطاقة منتج',
    hintEn: 'Catalog-led creative',
    hintAr: 'تصميم مرتبط بالكتالوج',
    defaultFormat: 'product-card',
  },
  {
    id: 'packaging-mockup',
    icon: Package,
    en: 'Packaging',
    ar: 'تغليف',
    hintEn: 'Labels, boxes, sleeves',
    hintAr: 'ملصقات وصناديق وتغليف',
    defaultFormat: 'instagram-post',
  },
  {
    id: 'brand-identity',
    icon: Palette,
    en: 'Brand identity',
    ar: 'هوية بصرية',
    hintEn: 'Full visual systems',
    hintAr: 'أنظمة بصرية كاملة',
    defaultFormat: 'wide-banner',
  },
  {
    id: 'brand-kit',
    icon: Sparkles,
    en: 'Brand kit',
    ar: 'عدة البراند',
    hintEn: 'Palette, type, mockups',
    hintAr: 'ألوان وخطوط وتطبيقات',
    defaultFormat: 'wide-banner',
  },
  {
    id: 'story-promo',
    icon: PanelLeft,
    en: 'Story promo',
    ar: 'ستوري',
    hintEn: 'Vertical social stories',
    hintAr: 'قصص عمودية للسوشال',
    defaultFormat: 'instagram-story',
  },
  {
    id: 'short-video',
    icon: Video,
    en: 'Short video',
    ar: 'فيديو قصير',
    hintEn: 'Motion-ready storyboards',
    hintAr: 'لوحات جاهزة للحركة',
    defaultFormat: 'tiktok',
  },
];

export const FORMAT_PRESETS: Array<{
  id: StudioFormatKey;
  icon: StudioIcon;
  en: string;
  ar: string;
  size: string;
}> = [
  {
    id: 'instagram-post',
    icon: ImageIcon,
    en: 'Instagram Post',
    ar: 'بوست إنستغرام',
    size: '1080x1350',
  },
  {
    id: 'instagram-story',
    icon: PanelLeft,
    en: 'Instagram Story',
    ar: 'ستوري إنستغرام',
    size: '1080x1920',
  },
  { id: 'tiktok', icon: TikTokIcon, en: 'TikTok', ar: 'تيك توك', size: '1080x1920' },
  { id: 'snapchat', icon: GhostIcon, en: 'Snapchat', ar: 'سناب شات', size: '1080x1920' },
  {
    id: 'whatsapp-status',
    icon: WhatsAppIcon,
    en: 'WhatsApp Status',
    ar: 'حالة واتساب',
    size: '1080x1920',
  },
  { id: 'x-banner', icon: XIcon, en: 'X Banner', ar: 'بانر X', size: '1600x900' },
  { id: 'a3-print', icon: Printer, en: 'A3 Print', ar: 'طباعة A3', size: '297x420mm' },
  { id: 'menu-print', icon: Archive, en: 'Menu Print', ar: 'منيو للطباعة', size: 'A4' },
  {
    id: 'product-card',
    icon: ShoppingBag,
    en: 'Product Card',
    ar: 'بطاقة منتج',
    size: '1080x1080',
  },
  { id: 'logo-square', icon: BadgeCheck, en: 'Logo Square', ar: 'شعار مربع', size: '1024x1024' },
  {
    id: 'wide-banner',
    icon: LayoutTemplate,
    en: 'Wide Banner',
    ar: 'بانر عريض',
    size: '2400x1200',
  },
];

export const QUICK_PROMPTS = [
  {
    en: 'Create a premium burger launch poster with warm lights and a bold Arabic headline.',
    ar: 'صمم بوستر إطلاق فاخر لمطعم برجر بإضاءة دافئة وعنوان عربي واضح.',
  },
  {
    en: 'Turn this brand into a full Instagram ad for the weekend offer.',
    ar: 'حوّل البراند إلى إعلان إنستغرام كامل لعرض نهاية الأسبوع.',
  },
  {
    en: 'Design a clean product card using my catalog item and Souqy colors.',
    ar: 'صمم بطاقة منتج نظيفة باستخدام منتج من الكتالوج وألوان سوقي.',
  },
  {
    en: 'Build an elegant cafe menu that is ready for print.',
    ar: 'جهز منيو مقهى أنيق وجاهز للطباعة.',
  },
];

export const STUDIO_MODES: StudioModeMeta[] = [
  // Flag-gated in ModeRail: only rendered when the 'code-v1' slice is on.
  { id: 'code', icon: Code2, kind: 'panel' },
  { id: 'projects', icon: FolderKanban, kind: 'panel' },
  { id: 'create', icon: Sparkles, kind: 'thread' },
  { id: 'edit', icon: Pencil, kind: 'thread' },
  { id: 'chat', icon: MessageCircle, kind: 'thread' },
  { id: 'web', icon: Globe2, kind: 'panel' },
  { id: 'history', icon: History, kind: 'panel' },
];
