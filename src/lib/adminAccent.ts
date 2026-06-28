export const ADMIN_ACCENTS = ['mono', 'slate', 'warm', 'midnight', 'pearl', 'graphite'] as const;
export type AdminAccent = (typeof ADMIN_ACCENTS)[number];

export const ADMIN_ACCENT_PRESETS: Array<{
  id: AdminAccent;
  label: string;
  arLabel: string;
  blurb: string;
  arBlurb: string;
  swatchLight: string;
  swatchDark: string;
}> = [
  {
    id: 'mono',
    label: 'Mono',
    arLabel: 'أحادي',
    blurb: 'Pure white and black. Maximum focus, minimum noise.',
    arBlurb: 'أبيض وأسود فقط. أقصى تركيز وأقل تشتيت.',
    swatchLight: '#ffffff',
    swatchDark: '#0a0a0a',
  },
  {
    id: 'slate',
    label: 'Slate',
    arLabel: 'صخري',
    blurb: 'Cool grays. Neutral with a touch of depth.',
    arBlurb: 'رمادي بارد بلمسة من العمق.',
    swatchLight: '#f8fafc',
    swatchDark: '#0f172a',
  },
  {
    id: 'warm',
    label: 'Warm',
    arLabel: 'دافئ',
    blurb: 'The original cream — opt back into the Souqna warmth.',
    arBlurb: 'العودة إلى الكريم الكلاسيكي لسوقنا.',
    swatchLight: '#e8dcc4',
    swatchDark: '#1f1b16',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    arLabel: 'ليلي',
    blurb: 'Deep Souqna dark with a cool commerce-blue signal.',
    arBlurb: 'داكن عميق لسوقنا مع إشارة زرقاء هادئة للتجارة.',
    swatchLight: '#eff6ff',
    swatchDark: '#030712',
  },
  {
    id: 'pearl',
    label: 'Pearl',
    arLabel: 'لؤلؤي',
    blurb: 'Soft pearl surfaces with the restrained gold of Souqna.',
    arBlurb: 'أسطح لؤلؤية هادئة مع ذهب سوقنا المتزن.',
    swatchLight: '#f7f3ea',
    swatchDark: '#11100d',
  },
  {
    id: 'graphite',
    label: 'Graphite',
    arLabel: 'غرافيت',
    blurb: 'Dense neutral contrast for operators who live in the dashboard.',
    arBlurb: 'تباين محايد وكثيف لمن يعملون داخل اللوحة يومياً.',
    swatchLight: '#f4f4f5',
    swatchDark: '#09090b',
  },
];

export const ADMIN_ACCENT_COOKIE = 'souqna_admin_accent';
export const DEFAULT_ADMIN_ACCENT: AdminAccent = 'mono';
