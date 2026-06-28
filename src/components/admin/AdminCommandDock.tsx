'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  BookOpen,
  ChevronUp,
  Check,
  ExternalLink,
  Languages,
  Palette,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LocaleToggle } from '@/components/souqna/LocaleToggle';
import { useStorefronts } from './StorefrontContext';
import type { Locale } from '@/i18n/locales';

type DashboardThemeColors = {
  background: string;
  panel: string;
  panelStrong: string;
  text: string;
  important: string;
  success: string;
  danger: string;
  chartPrimary: string;
  chartSecondary: string;
  sidebar: string;
  sidebarText: string;
};

type DashboardThemeState = {
  presetId: string;
  colors: DashboardThemeColors;
};

type DashboardThemePreset = {
  id: string;
  label: string;
  arLabel: string;
  colors: DashboardThemeColors;
};

const THEME_STORAGE_KEY = 'souqna.dashboard.theme.v1';

const DEFAULT_COLORS: DashboardThemeColors = {
  background: '#f7f2e8',
  panel: '#fffaf2',
  panelStrong: '#ffffff',
  text: '#12110e',
  important: '#c8a45d',
  success: '#167244',
  danger: '#b63b31',
  chartPrimary: '#c8a45d',
  chartSecondary: '#12110e',
  sidebar: '#12110e',
  sidebarText: '#f7f2e8',
};

const THEME_PRESETS: DashboardThemePreset[] = [
  {
    id: 'souqna',
    label: 'Souqna',
    arLabel: 'سوقنا',
    colors: DEFAULT_COLORS,
  },
  {
    id: 'galaxy',
    label: 'Galaxy',
    arLabel: 'مجرة',
    colors: {
      ...DEFAULT_COLORS,
      background: '#080a14',
      panel: '#101426',
      panelStrong: '#171c34',
      text: '#d9e1f2',
      important: '#7c5cff',
      success: '#4fc27d',
      danger: '#ff6b5c',
      chartPrimary: '#7c5cff',
      chartSecondary: '#d9e1f2',
      sidebar: '#050712',
      sidebarText: '#d9e1f2',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    arLabel: 'غروب',
    colors: {
      ...DEFAULT_COLORS,
      background: '#171b2e',
      panel: '#23263a',
      panelStrong: '#2d3047',
      text: '#f7e8cf',
      important: '#e8674f',
      success: '#56c486',
      danger: '#ff6b5c',
      chartPrimary: '#e8674f',
      chartSecondary: '#f2b84b',
      sidebar: '#101322',
      sidebarText: '#f7e8cf',
    },
  },
  {
    id: 'moonlight',
    label: 'Moonlight',
    arLabel: 'ضوء القمر',
    colors: {
      ...DEFAULT_COLORS,
      background: '#f5f7fa',
      panel: '#ffffff',
      panelStrong: '#f9fbff',
      text: '#111827',
      important: '#aab7c8',
      chartPrimary: '#111827',
      chartSecondary: '#aab7c8',
      sidebar: '#111827',
      sidebarText: '#f5f7fa',
    },
  },
  {
    id: 'saturn',
    label: 'Saturn',
    arLabel: 'زحل',
    colors: {
      ...DEFAULT_COLORS,
      background: '#d6c3a1',
      panel: '#eadcc1',
      panelStrong: '#f5ead8',
      text: '#101014',
      important: '#7b6a55',
      chartPrimary: '#7b6a55',
      chartSecondary: '#101014',
      sidebar: '#101014',
      sidebarText: '#d6c3a1',
    },
  },
  {
    id: 'oryx',
    label: 'Oryx',
    arLabel: 'المها',
    colors: {
      ...DEFAULT_COLORS,
      background: '#f8f4ea',
      panel: '#fffaf2',
      panelStrong: '#ffffff',
      text: '#151515',
      important: '#a65f3d',
      chartPrimary: '#a65f3d',
      chartSecondary: '#151515',
      sidebar: '#151515',
      sidebarText: '#f8f4ea',
    },
  },
  {
    id: 'lusail',
    label: 'Lusail',
    arLabel: 'لوسيل',
    colors: {
      ...DEFAULT_COLORS,
      background: '#123a5a',
      panel: '#163f61',
      panelStrong: '#1d4e76',
      text: '#d8e4ea',
      important: '#27b9c7',
      success: '#58c985',
      danger: '#ff7568',
      chartPrimary: '#27b9c7',
      chartSecondary: '#d8e4ea',
      sidebar: '#082436',
      sidebarText: '#d8e4ea',
    },
  },
  {
    id: 'zubarah',
    label: 'Zubarah',
    arLabel: 'الزبارة',
    colors: {
      ...DEFAULT_COLORS,
      background: '#d9b77e',
      panel: '#ead0a2',
      panelStrong: '#f6deb6',
      text: '#16130f',
      important: '#9a5838',
      chartPrimary: '#9a5838',
      chartSecondary: '#16130f',
      sidebar: '#16130f',
      sidebarText: '#d9b77e',
    },
  },
];

const COLOR_FIELDS: Array<{
  key: keyof DashboardThemeColors;
  label: string;
  arLabel: string;
  group: 'interface' | 'charts';
}> = [
  { key: 'background', label: 'Background', arLabel: 'الخلفية', group: 'interface' },
  { key: 'panel', label: 'Panel', arLabel: 'اللوحات', group: 'interface' },
  { key: 'panelStrong', label: 'Raised panel', arLabel: 'اللوحات البارزة', group: 'interface' },
  { key: 'text', label: 'Text / black', arLabel: 'النص / الأسود', group: 'interface' },
  { key: 'important', label: 'Important beige', arLabel: 'البيج المهم', group: 'interface' },
  { key: 'sidebar', label: 'Sidebar', arLabel: 'الشريط الجانبي', group: 'interface' },
  { key: 'sidebarText', label: 'Sidebar text', arLabel: 'نص الشريط', group: 'interface' },
  { key: 'chartPrimary', label: 'Main chart', arLabel: 'الرسم الرئيسي', group: 'charts' },
  { key: 'chartSecondary', label: 'Secondary chart', arLabel: 'الرسم الثانوي', group: 'charts' },
  { key: 'success', label: 'Revenue / success', arLabel: 'الإيراد / النجاح', group: 'charts' },
  { key: 'danger', label: 'Refund / failed', arLabel: 'الاسترجاع / الفشل', group: 'charts' },
];

const DASHBOARD_THEME_VARIABLES = [
  '--dash-beige',
  '--dash-panel',
  '--dash-panel-strong',
  '--dash-sunken',
  '--dash-black',
  '--dash-black-soft',
  '--dash-ink-muted',
  '--dash-ink-faint',
  '--dash-important',
  '--dash-important-soft',
  '--dash-green',
  '--dash-green-soft',
  '--dash-red',
  '--dash-red-soft',
  '--dash-rule',
  '--dash-rule-strong',
  '--surface-bg',
  '--surface-elevated',
  '--surface-overlay',
  '--surface-sunken',
  '--surface-rule',
  '--surface-rule-strong',
  '--ink-strong',
  '--ink-muted',
  '--ink-faint',
  '--admin-accent',
  '--admin-accent-soft',
  '--accent',
  '--accent-soft',
  '--accent-wash',
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--ring',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--chart-primary',
  '--chart-secondary',
  '--chart-success',
  '--chart-danger',
  '--chart-ink',
];

export function AdminCommandDock() {
  const locale = useLocale() as Locale;
  const isArabic = locale === 'ar';
  const labels = DOCK_LABELS[locale];
  const { active } = useStorefronts();
  const storeParam = active?.slug ? `?store=${encodeURIComponent(active.slug)}` : '';
  const [themeOpen, setThemeOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [mobileSelectorOpen, setMobileSelectorOpen] = useState(false);
  const [themeTab, setThemeTab] = useState('presets');
  const [themeState, setThemeState] = useState<DashboardThemeState>({
    presetId: THEME_PRESETS[0]!.id,
    colors: THEME_PRESETS[0]!.colors,
  });
  useEffect(() => {
    const storedTheme = readStoredTheme();
    if (storedTheme) {
      setThemeState(storedTheme);
      applyDashboardTheme(storedTheme.colors);
    }
  }, []);

  const selectedPreset = useMemo(
    () => THEME_PRESETS.find((preset) => preset.id === themeState.presetId),
    [themeState.presetId],
  );
  const selectedPresetLabel = selectedPreset
    ? isArabic
      ? selectedPreset.arLabel
      : selectedPreset.label
    : labels.custom;

  const selectPreset = (preset: DashboardThemePreset) => {
    const next = { presetId: preset.id, colors: preset.colors };
    setThemeState(next);
    persistTheme(next);
    applyDashboardTheme(next.colors);
  };

  const updateColor = (key: keyof DashboardThemeColors, value: string) => {
    if (!isHexColor(value)) return;
    const next = {
      presetId: 'custom',
      colors: {
        ...themeState.colors,
        [key]: value,
      },
    };
    setThemeState(next);
    persistTheme(next);
    applyDashboardTheme(next.colors);
  };

  const resetTheme = () => {
    clearDashboardTheme();
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Ignore storage failures; visual reset already happened.
    }
    setThemeState({
      presetId: THEME_PRESETS[0]!.id,
      colors: THEME_PRESETS[0]!.colors,
    });
  };

  const openThemeWindow = (tab: string) => {
    setMobileSelectorOpen(false);
    setThemeTab(tab);
    setThemeOpen(true);
  };

  const openDocsWindow = () => {
    setMobileSelectorOpen(false);
    setDocsOpen(true);
  };

  const windowOpen = themeOpen || docsOpen;

  return (
    <>
      <div
        className={`souqna-admin-dock-wrap${windowOpen ? ' is-window-open' : ''}`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <button
          type="button"
          className="souqna-admin-mobile-dock-trigger"
          aria-expanded={mobileSelectorOpen}
          onClick={() => setMobileSelectorOpen(true)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span>{labels.controls}</span>
          <span className="souqna-admin-mobile-dock-meta">
            {selectedPresetLabel}
          </span>
          <ChevronUp className="size-4" aria-hidden />
        </button>
        <nav className="souqna-admin-dock" aria-label={labels.aria}>
          <DockButton
            icon={<Palette className="size-4" aria-hidden />}
            label={selectedPresetLabel}
            eyebrow={labels.theme}
            onClick={() => openThemeWindow('presets')}
          />
          <div className="souqna-admin-dock-locale" aria-label={labels.language}>
            <Languages className="size-4" aria-hidden />
            <LocaleToggle
              locale={locale}
              mode="account"
              style={{
                minHeight: 34,
                minWidth: 74,
                padding: '7px 9px',
                borderRadius: 8,
                borderColor: 'var(--dash-rule-strong)',
                background: 'transparent',
                color: 'var(--dash-black)',
              }}
            />
          </div>
          <DockButton
            icon={<BookOpen className="size-4" aria-hidden />}
            label={labels.docs}
            onClick={openDocsWindow}
          />
          <DockButton
            icon={<SlidersHorizontal className="size-4" aria-hidden />}
            label={labels.customize}
            onClick={() => openThemeWindow('interface')}
          />
        </nav>
      </div>

      <Drawer open={mobileSelectorOpen} onOpenChange={setMobileSelectorOpen} direction="bottom">
        <DrawerContent className="souqna-admin-mobile-panel">
          <DrawerHeader className="souqna-admin-mobile-panel-header">
            <DrawerTitle>{labels.controls}</DrawerTitle>
            <DrawerDescription>
              {selectedPresetLabel}
            </DrawerDescription>
          </DrawerHeader>
          <div className="souqna-admin-mobile-panel-body">
            <MobileSelectorButton
              icon={<Palette className="size-4" aria-hidden />}
              label={labels.theme}
              value={selectedPresetLabel}
              onClick={() => openThemeWindow('presets')}
            />
            <MobileSelectorButton
              icon={<SlidersHorizontal className="size-4" aria-hidden />}
              label={labels.customize}
              value={labels.interface}
              onClick={() => openThemeWindow('interface')}
            />
            <div className="souqna-mobile-selector souqna-mobile-selector-locale">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Languages className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{labels.language}</span>
              </span>
              <LocaleToggle
                locale={locale}
                mode="account"
                style={{
                  minHeight: 34,
                  minWidth: 74,
                  padding: '7px 9px',
                  borderRadius: 8,
                  borderColor: 'var(--dash-rule-strong)',
                  background: 'transparent',
                  color: 'var(--dash-black)',
                }}
              />
            </div>
            <MobileSelectorButton
              icon={<BookOpen className="size-4" aria-hidden />}
              label={labels.docs}
              value={labels.open}
              onClick={openDocsWindow}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
        <DialogContent className="souqna-admin-window max-h-[min(760px,calc(100dvh-6rem))] overflow-hidden p-0 sm:max-w-3xl">
          <div className="souqna-admin-window-scroll">
            <DialogHeader className="souqna-admin-window-header">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle>{labels.themeTitle}</DialogTitle>
                  <DialogDescription>{labels.themeDescription}</DialogDescription>
                </div>
                <ThemeToggle label={labels.mode} className="shrink-0" />
              </div>
            </DialogHeader>
            <Tabs value={themeTab} onValueChange={setThemeTab} className="souqna-admin-window-tabs">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="presets">{labels.presets}</TabsTrigger>
                <TabsTrigger value="interface">{labels.interface}</TabsTrigger>
                <TabsTrigger value="charts">{labels.charts}</TabsTrigger>
              </TabsList>

              <TabsContent value="presets" className="mt-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="souqna-theme-preset"
                      data-active={themeState.presetId === preset.id}
                      onClick={() => selectPreset(preset)}
                    >
                      <ThemeSwatches colors={preset.colors} />
                      <span className="min-w-0 flex-1 text-start">
                        <span className="block truncate font-medium">
                          {isArabic ? preset.arLabel : preset.label}
                        </span>
                      </span>
                      {themeState.presetId === preset.id ? (
                        <Check className="size-4 shrink-0" aria-hidden />
                      ) : null}
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="interface" className="mt-4">
                <ColorPickerGrid
                  fields={COLOR_FIELDS.filter((field) => field.group === 'interface')}
                  colors={themeState.colors}
                  locale={locale}
                  onChange={updateColor}
                />
              </TabsContent>

              <TabsContent value="charts" className="mt-4">
                <ColorPickerGrid
                  fields={COLOR_FIELDS.filter((field) => field.group === 'charts')}
                  colors={themeState.colors}
                  locale={locale}
                  onChange={updateColor}
                />
                <div className="souqna-chart-preview mt-4">
                  <svg role="img" aria-label={labels.chartPreview} viewBox="0 0 520 150">
                    <defs>
                      <linearGradient id="souqna-dock-preview-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity="0.36" />
                        <stop offset="100%" stopColor="var(--chart-primary)" stopOpacity="0.03" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="12,118 78,88 142,94 206,52 270,72 334,34 398,64 508,20 508,132 12,132"
                      fill="url(#souqna-dock-preview-fill)"
                    />
                    <polyline
                      points="12,118 78,88 142,94 206,52 270,72 334,34 398,64 508,20"
                      fill="none"
                      stroke="var(--chart-primary)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="5"
                    />
                    <polyline
                      points="12,108 78,104 142,84 206,88 270,78 334,82 398,58 508,70"
                      fill="none"
                      stroke="var(--chart-secondary)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="4"
                      strokeDasharray="8 8"
                    />
                  </svg>
                </div>
              </TabsContent>
            </Tabs>
            <Separator className="my-4" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="outline" className="souqna-dock-badge">
                {themeState.presetId === 'custom' ? labels.custom : labels.live}
              </Badge>
              <Button type="button" variant="outline" size="sm" onClick={resetTheme}>
                <RotateCcw className="size-4" aria-hidden />
                {labels.reset}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="souqna-admin-window p-0 sm:max-w-lg">
          <div className="souqna-admin-window-scroll">
            <DialogHeader className="souqna-admin-window-header">
              <DialogTitle>{labels.docsTitle}</DialogTitle>
              <DialogDescription>{labels.docsDescription}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <DockLink href="/docs" label={labels.docsHome} />
              <DockLink
                href={`/account/settings/appearance${storeParam}`}
                label={labels.appearanceDocs}
              />
              <DockLink
                href={`/account/settings/checkout${storeParam}`}
                label={labels.checkoutDocs}
              />
              <DockLink href={`/account/builder${storeParam}`} label={labels.builderDocs} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MobileSelectorButton({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="souqna-mobile-selector" onClick={onClick}>
      <span className="inline-flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="min-w-0 truncate text-xs text-muted-foreground">{value}</span>
    </button>
  );
}

function DockButton({
  icon,
  label,
  eyebrow,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  eyebrow?: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" className="souqna-admin-dock-button" onClick={onClick}>
      {icon}
      <span className="grid min-w-0 text-start">
        {eyebrow ? <span className="souqna-admin-dock-eyebrow">{eyebrow}</span> : null}
        <span className="truncate">{label}</span>
      </span>
    </Button>
  );
}

function ThemeSwatches({ colors }: { colors: DashboardThemeColors }) {
  const swatches = [colors.background, colors.important, colors.text];
  return (
    <span className="souqna-theme-swatches" aria-hidden>
      {swatches.map((color, index) => (
        <span key={`${color}-${index}`} style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

function ColorPickerGrid({
  fields,
  colors,
  locale,
  onChange,
}: {
  fields: typeof COLOR_FIELDS;
  colors: DashboardThemeColors;
  locale: Locale;
  onChange: (key: keyof DashboardThemeColors, value: string) => void;
}) {
  const isArabic = locale === 'ar';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className="souqna-color-control">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {isArabic ? field.arLabel : field.label}
            </span>
            <span className="block font-mono text-[11px] text-muted-foreground">
              {colors[field.key].toUpperCase()}
            </span>
          </span>
          <input
            type="color"
            value={colors[field.key]}
            aria-label={isArabic ? field.arLabel : field.label}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

function DockLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" className="justify-between">
      <Link href={href}>
        {label}
        <ExternalLink className="size-4" aria-hidden />
      </Link>
    </Button>
  );
}

function readStoredTheme(): DashboardThemeState | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardThemeState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.colors) return null;
    return {
      presetId: typeof parsed.presetId === 'string' ? parsed.presetId : 'custom',
      colors: normalizeColors(parsed.colors),
    };
  } catch {
    return null;
  }
}

function persistTheme(theme: DashboardThemeState) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // Local storage is optional; the applied CSS variables still update.
  }
}

function normalizeColors(value: Partial<DashboardThemeColors>): DashboardThemeColors {
  const next = { ...DEFAULT_COLORS };
  for (const key of Object.keys(DEFAULT_COLORS) as Array<keyof DashboardThemeColors>) {
    const color = value[key];
    if (typeof color === 'string' && isHexColor(color)) {
      next[key] = color;
    }
  }
  return next;
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function applyDashboardTheme(colors: DashboardThemeColors) {
  const style = document.body.style;
  const mutedText = `color-mix(in srgb, ${colors.text} 64%, transparent)`;
  const faintText = `color-mix(in srgb, ${colors.text} 42%, transparent)`;
  const rule = `color-mix(in srgb, ${colors.text} 12%, transparent)`;
  const ruleStrong = `color-mix(in srgb, ${colors.text} 20%, transparent)`;
  const importantSoft = `color-mix(in srgb, ${colors.important} 32%, transparent)`;
  const successSoft = `color-mix(in srgb, ${colors.success} 13%, transparent)`;
  const dangerSoft = `color-mix(in srgb, ${colors.danger} 13%, transparent)`;

  style.setProperty('--dash-beige', colors.background);
  style.setProperty('--dash-panel', colors.panel);
  style.setProperty('--dash-panel-strong', colors.panelStrong);
  style.setProperty(
    '--dash-sunken',
    `color-mix(in srgb, ${colors.background} 82%, ${colors.text})`,
  );
  style.setProperty('--dash-black', colors.text);
  style.setProperty('--dash-black-soft', colors.sidebar);
  style.setProperty('--dash-ink-muted', mutedText);
  style.setProperty('--dash-ink-faint', faintText);
  style.setProperty('--dash-important', colors.important);
  style.setProperty('--dash-important-soft', importantSoft);
  style.setProperty('--dash-green', colors.success);
  style.setProperty('--dash-green-soft', successSoft);
  style.setProperty('--dash-red', colors.danger);
  style.setProperty('--dash-red-soft', dangerSoft);
  style.setProperty('--dash-rule', rule);
  style.setProperty('--dash-rule-strong', ruleStrong);
  style.setProperty('--surface-bg', colors.background);
  style.setProperty('--surface-elevated', colors.panel);
  style.setProperty('--surface-overlay', colors.panelStrong);
  style.setProperty(
    '--surface-sunken',
    `color-mix(in srgb, ${colors.background} 82%, ${colors.text})`,
  );
  style.setProperty('--surface-rule', rule);
  style.setProperty('--surface-rule-strong', ruleStrong);
  style.setProperty('--ink-strong', colors.text);
  style.setProperty('--ink-muted', mutedText);
  style.setProperty('--ink-faint', faintText);
  style.setProperty('--admin-accent', colors.important);
  style.setProperty('--admin-accent-soft', importantSoft);
  style.setProperty('--accent', colors.important);
  style.setProperty('--accent-soft', importantSoft);
  style.setProperty('--accent-wash', `color-mix(in srgb, ${colors.important} 12%, transparent)`);
  style.setProperty('--background', colors.background);
  style.setProperty('--foreground', colors.text);
  style.setProperty('--card', colors.panel);
  style.setProperty('--card-foreground', colors.text);
  style.setProperty('--popover', colors.panelStrong);
  style.setProperty('--popover-foreground', colors.text);
  style.setProperty('--primary', colors.text);
  style.setProperty('--primary-foreground', colors.background);
  style.setProperty('--secondary', `color-mix(in srgb, ${colors.text} 7%, transparent)`);
  style.setProperty('--secondary-foreground', colors.text);
  style.setProperty('--muted', `color-mix(in srgb, ${colors.text} 6%, transparent)`);
  style.setProperty('--muted-foreground', mutedText);
  style.setProperty('--destructive', colors.danger);
  style.setProperty('--destructive-foreground', colors.panelStrong);
  style.setProperty('--border', rule);
  style.setProperty('--input', rule);
  style.setProperty('--ring', colors.important);
  style.setProperty('--sidebar', colors.sidebar);
  style.setProperty('--sidebar-foreground', colors.sidebarText);
  style.setProperty('--sidebar-primary', colors.sidebarText);
  style.setProperty('--sidebar-primary-foreground', colors.sidebar);
  style.setProperty('--sidebar-accent', `color-mix(in srgb, ${colors.important} 18%, transparent)`);
  style.setProperty('--sidebar-accent-foreground', colors.sidebarText);
  style.setProperty(
    '--sidebar-border',
    `color-mix(in srgb, ${colors.sidebarText} 11%, transparent)`,
  );
  style.setProperty('--sidebar-ring', colors.important);
  style.setProperty('--chart-primary', colors.chartPrimary);
  style.setProperty('--chart-secondary', colors.chartSecondary);
  style.setProperty('--chart-success', colors.success);
  style.setProperty('--chart-danger', colors.danger);
  style.setProperty('--chart-ink', colors.text);
}

function clearDashboardTheme() {
  for (const variable of DASHBOARD_THEME_VARIABLES) {
    document.body.style.removeProperty(variable);
  }
}

const DOCK_LABELS = {
  en: {
    aria: 'Dashboard controls',
    controls: 'Controls',
    theme: 'Preset',
    language: 'Language',
    docs: 'Docs',
    customize: 'Customize',
    custom: 'Custom',
    themeTitle: 'Dashboard theme',
    themeDescription: 'Select a preset or tune the dashboard colors.',
    presets: 'Presets',
    interface: 'Interface',
    charts: 'Charts',
    mode: 'Mode',
    reset: 'Reset',
    live: 'Live',
    chartPreview: 'Theme chart preview',
    open: 'Open',
    docsTitle: 'Docs',
    docsDescription: 'Open the main Souqna operating surfaces.',
    docsHome: 'Documentation',
    appearanceDocs: 'Appearance settings',
    checkoutDocs: 'Checkout settings',
    builderDocs: 'Storefront builder',
  },
  ar: {
    aria: 'أدوات لوحة التحكم',
    controls: 'الأدوات',
    theme: 'نمط',
    language: 'اللغة',
    docs: 'الدليل',
    customize: 'تخصيص',
    custom: 'مخصص',
    themeTitle: 'نمط لوحة التحكم',
    themeDescription: 'اختر نمطا أو عدل ألوان لوحة التحكم.',
    presets: 'الأنماط',
    interface: 'الواجهة',
    charts: 'الرسوم',
    mode: 'الوضع',
    reset: 'إعادة',
    live: 'مفعل',
    chartPreview: 'معاينة الرسم',
    open: 'افتح',
    docsTitle: 'الدليل',
    docsDescription: 'افتح أسطح التشغيل الرئيسية في سوقنا.',
    docsHome: 'التوثيق',
    appearanceDocs: 'إعدادات المظهر',
    checkoutDocs: 'إعدادات الدفع',
    builderDocs: 'مصمم المتجر',
  },
} as const satisfies Record<Locale, Record<string, string>>;
