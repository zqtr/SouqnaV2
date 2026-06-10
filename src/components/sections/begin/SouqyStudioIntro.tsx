'use client';

import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import {
  Archive,
  ArrowUp,
  BadgeCheck,
  ChevronDown,
  Coins,
  Cpu,
  Download,
  FolderKanban,
  FileImage,
  Globe2,
  History,
  ImageIcon,
  LayoutTemplate,
  Maximize2,
  MessageCircle,
  Package,
  Palette,
  PanelLeft,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Video,
} from 'lucide-react';
import type { Locale } from '@/i18n/locales';
import { souqyStudioFontVariables } from '@/lib/fonts';
import { palette } from '@/lib/tokens';
import DitherWave from '@/components/dither-wave';
import { SouqyLogo } from '@/components/admin/SouqyLogo';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Loader } from '@/components/ui/loader';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { souqyDesignStorefront } from '@/app/actions/souqy';
import { MetalFx } from 'metal-fx';
import {
  SOUQY_STUDIO_MODELS,
  estimateSouqyStudioModelCost,
  formatSouqyStudioUsd,
  getSouqyStudioModel,
  type SouqyStudioModelId,
} from '@/lib/souqy-studio/modelCatalog';

type CreationTemplate =
  | 'ad-creative'
  | 'brand-identity'
  | 'brand-kit'
  | 'launch-poster'
  | 'logo'
  | 'packaging-mockup'
  | 'product-card'
  | 'restaurant-menu'
  | 'short-video'
  | 'story-promo'
  | 'wide-banner';

type StudioFormatKey =
  | 'instagram-post'
  | 'instagram-story'
  | 'tiktok'
  | 'whatsapp-status'
  | 'snapchat'
  | 'x-banner'
  | 'a3-print'
  | 'menu-print'
  | 'product-card'
  | 'logo-square'
  | 'wide-banner';

type SouqyStudioAsset = {
  id?: string;
  kind:
    | 'logo'
    | 'wideLogo'
    | 'banner'
    | 'poster'
    | 'story'
    | 'og'
    | 'brand'
    | 'ad'
    | 'menu'
    | 'productCard'
    | 'packaging'
    | 'video';
  title: string;
  url: string;
  width: number;
  height: number;
  mimeType: string;
  assetType?: CreationTemplate;
  formatKey?: StudioFormatKey;
  downloadFilename?: string;
};

type SouqyStudioProject = {
  id: string;
  businessName: string;
  locale: Locale;
  currentStep: 'logo' | 'banner' | 'brand-kit' | 'promos' | 'builder';
  storefrontSlug: string | null;
  confirmedLogoAssetId: string | null;
  confirmedBannerAssetId: string | null;
  confirmedBrandAssetId: string | null;
  brandKit: unknown;
  assets: SouqyStudioAsset[];
};

type CatalogStorefront = {
  slug: string;
  businessName: string;
  locale: Locale;
};

type CatalogProduct = {
  id: string;
  storefrontSlug: string;
  storefrontName: string;
  title: string;
  description: string | null;
  priceQar: number | null;
  imageUrl: string | null;
  category: string | null;
};

type ReferenceImage = {
  id: string;
  name: string;
  url: string;
  file: File;
};

type StudioTab = 'projects' | 'create' | 'edit' | 'chat' | 'web' | 'history';

type StudioChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'creating' | 'done' | 'error';
  assets?: SouqyStudioAsset[];
  templateLabel?: string;
  formatLabel?: string;
  modelLabel?: string;
};

type StudioTextMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'creating' | 'done' | 'error';
  assets?: undefined;
  templateLabel?: string;
  formatLabel?: string;
  modelLabel?: string;
};

type StudioThreadMessage = StudioChatMessage | StudioTextMessage;

type StudioProjectSummary = {
  id: string;
  businessName: string;
  locale: Locale;
  currentStep: SouqyStudioProject['currentStep'];
  storefrontSlug: string | null;
  assetCount: number;
  latestAssetUrl: string | null;
  updatedAt: string;
};

type LibraryState =
  | {
      status: 'success';
      project: SouqyStudioProject | null;
      assets: SouqyStudioAsset[];
      counts: Record<string, number>;
      storefronts: CatalogStorefront[];
      products: CatalogProduct[];
    }
  | { status: 'error'; message: string };

type ProjectState =
  | { status: 'success'; project: SouqyStudioProject }
  | { status: 'error'; message: string };

type GenerateState =
  | { status: 'success'; assets: SouqyStudioAsset[] }
  | { status: 'error'; message: string };

type ProjectsState =
  | { status: 'success'; projects: StudioProjectSummary[] }
  | { status: 'error'; message: string };

type CranlJobSubmissionState =
  | {
      ok: true;
      job: {
        queue: 'ai-chat';
        jobId: string;
        status: 'queued';
      };
    }
  | { ok: false; error?: string };

type CranlJobStatusState =
  | {
      ok: true;
      job: {
        state: string;
        failedReason?: string | null;
        returnvalue?: unknown;
      };
    }
  | { ok: false; error?: string };

type Props = {
  locale: Locale;
};

type StudioSelectorId = 'template' | 'format' | 'model' | 'settings';

const CREATION_TYPES: Array<{
  id: CreationTemplate;
  icon: ComponentType<{ size?: string | number }>;
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

const FORMAT_PRESETS: Array<{
  id: StudioFormatKey;
  icon: ComponentType<{ size?: string | number }>;
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

const QUICK_PROMPTS = [
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

const STUDIO_TABS: Array<{
  id: StudioTab;
  icon: ComponentType<{ size?: string | number }>;
}> = [
  { id: 'projects', icon: FolderKanban },
  { id: 'create', icon: Sparkles },
  { id: 'edit', icon: Pencil },
  { id: 'chat', icon: MessageCircle },
  { id: 'web', icon: Globe2 },
  { id: 'history', icon: History },
];

export function SouqyStudioIntro({ locale }: Props) {
  const isRtl = locale === 'ar';
  const [activeTab, setActiveTab] = useState<StudioTab>('create');
  const [project, setProject] = useState<SouqyStudioProject | null>(null);
  const [projectSummaries, setProjectSummaries] = useState<StudioProjectSummary[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [storefronts, setStorefronts] = useState<CatalogStorefront[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<SouqyStudioAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<SouqyStudioAsset | null>(null);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CreationTemplate>('launch-poster');
  const [selectedFormat, setSelectedFormat] = useState<StudioFormatKey>('instagram-post');
  const [selectedModelId, setSelectedModelId] =
    useState<SouqyStudioModelId>('replicate:flux-2-max');
  const [selectedStorefrontSlug, setSelectedStorefrontSlug] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [brandInstructions, setBrandInstructions] = useState('');
  const [quality, setQuality] = useState<'standard' | 'high' | 'print'>('high');
  const [printBleed, setPrintBleed] = useState(true);
  const [creativity, setCreativity] = useState(7);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<StudioChatMessage[]>([]);
  const [textChatMessages, setTextChatMessages] = useState<StudioTextMessage[]>([]);
  const [isChatBusy, setIsChatBusy] = useState(false);
  const [hasSessionStarted, setHasSessionStarted] = useState(false);
  const [openSelector, setOpenSelector] = useState<StudioSelectorId | null>(null);
  const [webPreviewKey, setWebPreviewKey] = useState(0);
  const [webPrompt, setWebPrompt] = useState('');
  const [webStatusMessage, setWebStatusMessage] = useState('');
  const [isWebDesigning, setIsWebDesigning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referencesRef = useRef<ReferenceImage[]>([]);
  const chatThreadRef = useRef<HTMLElement>(null);

  const copy = studioCopy(isRtl);
  const visibleProducts = selectedStorefrontSlug
    ? products.filter((product) => product.storefrontSlug === selectedStorefrontSlug)
    : products;
  const webStorefront =
    storefronts.find((storefront) => storefront.slug === selectedStorefrontSlug) ??
    storefronts[0] ??
    (project?.storefrontSlug
      ? {
          slug: project.storefrontSlug,
          businessName: project.businessName,
          locale: project.locale,
        }
      : null);
  const webPreviewSrc = webStorefront ? `/brief/${encodeURIComponent(webStorefront.slug)}` : '';
  const webLiveHref = webStorefront ? `/brief/${encodeURIComponent(webStorefront.slug)}` : '';
  const currentType =
    CREATION_TYPES.find((item) => item.id === selectedTemplate) ?? CREATION_TYPES[0]!;
  const currentFormat =
    FORMAT_PRESETS.find((item) => item.id === selectedFormat) ?? FORMAT_PRESETS[0]!;
  const currentModel = getSouqyStudioModel(selectedModelId);
  const currentFormatDimensions = dimensionsForFormat(selectedFormat);
  const currentModelCost = estimateSouqyStudioModelCost({
    modelId: currentModel.id,
    width: currentFormatDimensions.width,
    height: currentFormatDimensions.height,
    quality,
  });
  const modelLabel = `${currentModel.shortLabel} / ${currentModelCost.credits} credits`;
  const visibleMessages: StudioThreadMessage[] =
    activeTab === 'chat' ? textChatMessages : chatMessages;
  const showComposer = activeTab === 'create' || activeTab === 'edit' || activeTab === 'chat';
  const composerBusy = activeTab === 'chat' ? isChatBusy : isBusy;
  const composerPlaceholder =
    activeTab === 'chat'
      ? copy.chatPlaceholder
      : activeTab === 'edit'
        ? copy.editPromptPlaceholder
        : copy.promptPlaceholder;
  const commandTitle =
    activeTab === 'chat'
      ? copy.chatCommandTitle
      : activeTab === 'edit'
        ? copy.editCommandTitle
        : copy.commandTitle;

  useEffect(() => {
    if (!isBusy) return;
    const interval = window.setInterval(() => {
      setGenerationProgress((current) => {
        const base = current <= 0 ? 6 : current;
        if (base >= 94) return base;
        if (base < 34) return Math.min(94, base + 7);
        if (base < 68) return Math.min(94, base + 4);
        if (base < 86) return Math.min(94, base + 2);
        return Math.min(94, base + 1);
      });
    }, 850);
    return () => window.clearInterval(interval);
  }, [isBusy]);

  useEffect(() => {
    referencesRef.current = references;
  }, [references]);

  useEffect(() => {
    if (references.length > 0 && !getSouqyStudioModel(selectedModelId).supportsReferences) {
      setSelectedModelId('replicate:flux-2-max');
    }
  }, [references.length, selectedModelId]);

  useEffect(() => {
    if (!openSelector) return;

    function closeSelector() {
      setOpenSelector(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeSelector();
    }

    window.addEventListener('click', closeSelector);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('click', closeSelector);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [openSelector]);

  useEffect(() => {
    return () => {
      for (const reference of referencesRef.current) URL.revokeObjectURL(reference.url);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLibraryLoading(true);
    void postSouqyStudio<LibraryState>('/api/souqy-studio/library', {})
      .then((result) => {
        if (cancelled || result.status !== 'success') return;
        setProject(result.project);
        setLibraryAssets(result.assets);
        setStorefronts(result.storefronts);
        setProducts(result.products);
        setSelectedStorefrontSlug(result.storefronts[0]?.slug ?? '');
      })
      .catch((error) => {
        if (!cancelled)
          setStatusMessage(error instanceof Error ? error.message : copy.libraryError);
      })
      .finally(() => {
        if (!cancelled) setIsLibraryLoading(false);
      });
    setIsProjectsLoading(true);
    void postSouqyStudio<ProjectsState>('/api/souqy-studio/projects', {})
      .then((result) => {
        if (cancelled || result.status !== 'success') return;
        setProjectSummaries(result.projects);
      })
      .catch((error) => {
        if (!cancelled)
          setStatusMessage(error instanceof Error ? error.message : copy.projectsError);
      })
      .finally(() => {
        if (!cancelled) setIsProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.libraryError, copy.projectsError]);

  useEffect(() => {
    const thread = chatThreadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: hasSessionStarted ? 'smooth' : 'auto' });
  }, [visibleMessages, generationProgress, hasSessionStarted]);

  function selectTemplate(template: CreationTemplate) {
    const next = CREATION_TYPES.find((item) => item.id === template);
    setSelectedTemplate(template);
    if (next) setSelectedFormat(next.defaultFormat);
    setStatusMessage('');
  }

  async function refreshLibrary() {
    setIsLibraryLoading(true);
    try {
      const result = await postSouqyStudio<LibraryState>('/api/souqy-studio/library', {});
      if (result.status === 'error') {
        setStatusMessage(result.message);
        return;
      }
      setProject(result.project);
      setLibraryAssets(result.assets);
      setStorefronts(result.storefronts);
      setProducts(result.products);
      if (!selectedStorefrontSlug) setSelectedStorefrontSlug(result.storefronts[0]?.slug ?? '');
      setStatusMessage(copy.libraryReady);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.libraryError);
    } finally {
      setIsLibraryLoading(false);
    }
  }

  async function refreshProjects() {
    setIsProjectsLoading(true);
    try {
      const result = await postSouqyStudio<ProjectsState>('/api/souqy-studio/projects', {});
      if (result.status === 'error') {
        setStatusMessage(result.message);
        return;
      }
      setProjectSummaries(result.projects);
      setStatusMessage(copy.projectsReady);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.projectsError);
    } finally {
      setIsProjectsLoading(false);
    }
  }

  async function ensureProject(): Promise<SouqyStudioProject | null> {
    if (project) return project;
    const cleanName = isRtl ? 'جلسة سوقي ستوديو' : 'Souqy Studio Session';
    setStatusMessage(copy.preparing);
    const result = await postSouqyStudio<ProjectState>('/api/souqy-studio/start', {
      businessName: cleanName,
      locale,
    });
    if (result.status === 'error') {
      setStatusMessage(result.message);
      return null;
    }
    setProject(result.project);
    return result.project;
  }

  async function generateAsset() {
    if (isBusy) return;
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 8) {
      setGenerationProgress(0);
      setStatusMessage(copy.clearerPrompt);
      return;
    }
    if (activeTab === 'edit' && references.length === 0) {
      setGenerationProgress(0);
      setStatusMessage(copy.editNeedsReference);
      return;
    }
    const templateLabel = isRtl ? currentType.ar : currentType.en;
    const formatLabel = formatAspectLabel(currentFormat, isRtl);
    const generationModelLabel = modelLabel;
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const markAssistantMessage = (message: Omit<StudioChatMessage, 'id' | 'role'>) => {
      setChatMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId ? { ...item, ...message, role: 'assistant' } : item,
        ),
      );
    };

    setHasSessionStarted(true);
    setPrompt('');
    setOpenSelector(null);
    setChatMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: 'user',
        content: cleanPrompt,
        templateLabel,
        formatLabel,
        modelLabel: generationModelLabel,
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: copy.creating,
        status: 'creating',
        templateLabel,
        formatLabel,
        modelLabel: generationModelLabel,
      },
    ]);
    setGenerationProgress(3);
    setIsBusy(true);
    try {
      const activeProject = await ensureProject();
      if (!activeProject) {
        markAssistantMessage({
          content: copy.libraryError,
          status: 'error',
          templateLabel,
          formatLabel,
          modelLabel: generationModelLabel,
        });
        return;
      }
      setStatusMessage(copy.creating);
      const referencePayload = await Promise.all(
        references.map(async (reference) => ({
          name: reference.name,
          mimeType: reference.file.type as
            | 'image/png'
            | 'image/jpeg'
            | 'image/jpg'
            | 'image/webp'
            | 'image/svg+xml',
          dataUrl: await fileToDataUrl(reference.file),
        })),
      );
      const result = await postSouqyStudio<GenerateState>('/api/souqy-studio/generate', {
        projectId: activeProject.id,
        prompt: cleanPrompt,
        template: selectedTemplate,
        formatKey: selectedFormat,
        locale,
        sourceStorefrontSlug: selectedStorefrontSlug || undefined,
        selectedProductIds,
        references: referencePayload,
        modelId: selectedModelId,
        brandInstructions,
        quality,
        printBleed,
        creativity,
      });
      if (result.status === 'error') {
        setGenerationProgress(0);
        setStatusMessage(result.message);
        markAssistantMessage({
          content: result.message,
          status: 'error',
          templateLabel,
          formatLabel,
          modelLabel: generationModelLabel,
        });
        return;
      }
      setGenerationProgress(100);
      setLibraryAssets((current) => [...result.assets, ...current].slice(0, 60));
      if (result.assets[0]) setSelectedAsset(result.assets[0]);
      markAssistantMessage({
        content:
          result.assets.length === 1
            ? copy.resultReady
            : `${copy.resultReady} (${result.assets.length})`,
        status: 'done',
        assets: result.assets,
        templateLabel,
        formatLabel,
        modelLabel: generationModelLabel,
      });
      setStatusMessage(
        isRtl
          ? `تم إنشاء ${result.assets.length} أصل.`
          : `Generated ${result.assets.length} asset${result.assets.length === 1 ? '' : 's'}.`,
      );
      void refreshProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Souqy Studio generation failed.';
      setGenerationProgress(0);
      setStatusMessage(message);
      markAssistantMessage({
        content: message,
        status: 'error',
        templateLabel,
        formatLabel,
        modelLabel: generationModelLabel,
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function sendTextChat() {
    if (isChatBusy) return;
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 2) {
      setStatusMessage(copy.clearerChatPrompt);
      return;
    }
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const history = textChatMessages
      .filter((message) => message.status !== 'creating')
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    setHasSessionStarted(true);
    setPrompt('');
    setOpenSelector(null);
    setTextChatMessages((current) => [
      ...current,
      { id: userMessageId, role: 'user', content: cleanPrompt, templateLabel: copy.chatTab },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: copy.chatThinking,
        status: 'creating',
        templateLabel: copy.chatTab,
        formatLabel: 'AI',
      },
    ]);
    setIsChatBusy(true);
    setStatusMessage(copy.chatThinking);

    const markAssistantMessage = (message: Omit<StudioTextMessage, 'id' | 'role'>) => {
      setTextChatMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId ? { ...item, ...message, role: 'assistant' } : item,
        ),
      );
    };

    try {
      const submission = await postSouqyStudio<CranlJobSubmissionState>('/api/cranl/jobs/ai-chat', {
        messages: [
          { role: 'system', content: copy.chatSystemPrompt },
          ...history,
          { role: 'user', content: cleanPrompt },
        ],
        metadata: {
          surface: 'souqy-studio',
          tab: 'chat',
        },
      });
      if (!submission.ok) {
        const message = cranlErrorLabel(submission.error);
        setStatusMessage(message);
        markAssistantMessage({ content: message, status: 'error', templateLabel: copy.chatTab });
        return;
      }

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await wait(1800);
        const result = await fetch(
          `/api/cranl/jobs/ai-chat/${encodeURIComponent(submission.job.jobId)}`,
        ).then((response) => response.json() as Promise<CranlJobStatusState>);
        if (!result.ok) {
          const message = cranlErrorLabel(result.error);
          setStatusMessage(message);
          markAssistantMessage({ content: message, status: 'error', templateLabel: copy.chatTab });
          return;
        }
        if (result.job.state === 'completed') {
          const answer = extractCranlText(result.job.returnvalue);
          markAssistantMessage({
            content: answer || copy.chatEmptyResult,
            status: 'done',
            templateLabel: copy.chatTab,
            formatLabel: 'AI',
          });
          setStatusMessage(copy.chatReady);
          return;
        }
        if (result.job.state === 'failed') {
          const message = cranlFailureLabel(result.job.failedReason ?? copy.chatFailed);
          setStatusMessage(message);
          markAssistantMessage({ content: message, status: 'error', templateLabel: copy.chatTab });
          return;
        }
      }

      setStatusMessage(copy.chatTimedOut);
      markAssistantMessage({
        content: copy.chatTimedOut,
        status: 'error',
        templateLabel: copy.chatTab,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.chatFailed;
      setStatusMessage(message);
      markAssistantMessage({ content: message, status: 'error', templateLabel: copy.chatTab });
    } finally {
      setIsChatBusy(false);
    }
  }

  function submitComposer() {
    if (activeTab === 'chat') {
      void sendTextChat();
      return;
    }
    void generateAsset();
  }

  async function designWebsiteFromPrompt() {
    const cleanPrompt = webPrompt.trim();
    if (isWebDesigning) return;
    if (!webStorefront) {
      setWebStatusMessage(copy.noStorefront);
      return;
    }
    if (cleanPrompt.length < 12) {
      setWebStatusMessage(copy.clearerWebPrompt);
      return;
    }

    setIsWebDesigning(true);
    setWebStatusMessage(copy.webDesigning);
    try {
      const result = await souqyDesignStorefront({
        slug: webStorefront.slug,
        request: cleanPrompt,
      });
      if (result.status === 'error') {
        setWebStatusMessage(result.message);
        return;
      }
      setWebPrompt('');
      setWebStatusMessage(copy.webDesignReady);
      setWebPreviewKey((current) => current + 1);
    } catch (error) {
      setWebStatusMessage(error instanceof Error ? error.message : copy.webDesignFailed);
    } finally {
      setIsWebDesigning(false);
    }
  }

  async function startProjectFromSidebar() {
    const cleanName = newProjectName.trim();
    if (cleanName.length < 2) {
      setStatusMessage(copy.projectNameRequired);
      return;
    }
    setIsProjectsLoading(true);
    try {
      const result = await postSouqyStudio<ProjectState>('/api/souqy-studio/start', {
        businessName: cleanName,
        locale,
      });
      if (result.status === 'error') {
        setStatusMessage(result.message);
        return;
      }
      setProject(result.project);
      setNewProjectName('');
      setActiveTab('create');
      setStatusMessage(copy.projectStarted);
      void refreshProjects();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.projectsError);
    } finally {
      setIsProjectsLoading(false);
    }
  }

  async function openProjectFromSidebar(projectId: string) {
    setIsProjectsLoading(true);
    try {
      const result = await postSouqyStudio<ProjectState>('/api/souqy-studio/project', {
        projectId,
      });
      if (result.status === 'error') {
        setStatusMessage(result.message);
        return;
      }
      setProject(result.project);
      setActiveTab('create');
      setStatusMessage(copy.projectOpened);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.projectsError);
    } finally {
      setIsProjectsLoading(false);
    }
  }

  async function prepareAssetForEdit(asset: SouqyStudioAsset) {
    setSelectedAsset(asset);
    if (asset.assetType) setSelectedTemplate(asset.assetType);
    if (asset.formatKey) setSelectedFormat(asset.formatKey);
    setActiveTab('edit');
    setStatusMessage(copy.preparingEdit);
    try {
      const response = await fetch(downloadHrefForAsset(asset));
      if (!response.ok) throw new Error(copy.editReferenceFailed);
      const blob = await response.blob();
      const mimeType = blob.type || asset.mimeType || 'image/webp';
      const file = new File([blob], asset.downloadFilename ?? fallbackDownloadName(asset), {
        type: mimeType,
      });
      const reference = {
        id: `${asset.id ?? asset.url}-${crypto.randomUUID()}`,
        name: asset.title,
        url: URL.createObjectURL(file),
        file,
      };
      setReferences((current) => {
        const next = [reference, ...current].slice(0, 5);
        for (const removed of current.slice(4)) URL.revokeObjectURL(removed.url);
        return next;
      });
      setPrompt(copy.editPromptSeed);
      setStatusMessage(copy.editReady);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : copy.editReferenceFailed);
    }
  }

  function addReferenceImages(files: FileList | null) {
    if (!files) return;
    const remainingSlots = Math.max(0, 5 - references.length);
    const next = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingSlots)
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        file,
      }));
    if (next.length) setReferences((current) => [...current, ...next].slice(0, 5));
  }

  function removeReference(id: string) {
    setReferences((current) => {
      const removed = current.find((reference) => reference.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((reference) => reference.id !== id);
    });
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-6),
    );
  }

  return (
    <section
      className={`souqy-workplace souqy-os ${souqyStudioFontVariables}${
        hasSessionStarted ? ' has-session-started' : ''
      }${visibleMessages.length > 0 ? ' has-chat' : ''}${
        isBusy || isChatBusy ? ' is-generating' : ''
      } is-tab-${activeTab}`}
      data-theme="dark"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={
        {
          '--souqy-font': isRtl
            ? 'var(--font-arabic-text), var(--font-arabic), ui-serif, serif'
            : 'var(--font-studio-inter-tight), Inter, ui-sans-serif, system-ui, sans-serif',
          '--souqy-display': isRtl
            ? 'var(--font-arabic-serif), ui-serif, serif'
            : 'var(--font-studio-instrument-serif), Georgia, serif',
        } as CSSProperties
      }
    >
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: studioCss }} />
      <div className="souqy-atmosphere" aria-hidden>
        <DitherWave
          className="souqy-dither-wave"
          width="100%"
          height="100%"
          primaryColor="#FFFFFF"
          secondaryColor="#F2DCB5"
          tertiaryColor="#050505"
          speed={1.6}
          intensity={2}
          scale={4}
          downScale={0.6}
          opacity={0.1}
          quality="medium"
          maxFPS={45}
          pauseWhenOffscreen
        />
        <div className="souqy-grid" />
        <div className="souqy-geo" />
      </div>

      <nav className="souqy-min-sidebar" aria-label={copy.workspace}>
        <button
          type="button"
          className="souqy-sidebar-brand"
          onClick={() => setActiveTab('create')}
          aria-label={copy.createTab}
        >
          <SouqyLogo size={34} />
        </button>
        <div className="souqy-sidebar-items">
          {STUDIO_TABS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={active ? 'is-active' : ''}
                onClick={() => {
                  setActiveTab(item.id);
                  setOpenSelector(null);
                  setStatusMessage('');
                }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} />
                <span>{copy.tabLabels[item.id]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="souqy-main">
        <section
          className={hasSessionStarted ? 'souqy-hero is-exiting' : 'souqy-hero'}
          aria-hidden={hasSessionStarted}
        >
          <SouqyLogo size={112} className="souqy-hero-logo" />
          <p>{copy.eyebrow}</p>
          <h1>{copy.heroTitle}</h1>
          <span>{copy.heroBody}</span>
        </section>

        {activeTab === 'projects' ? (
          <section className="souqy-workspace-panel" aria-label={copy.projectsTab}>
            <div className="souqy-panel-heading">
              <div>
                <span>{copy.workspace}</span>
                <h2>{copy.projectsTab}</h2>
              </div>
              <button type="button" onClick={() => void refreshProjects()}>
                <RefreshCw size={15} />
                <span>{copy.refresh}</span>
              </button>
            </div>
            <form
              className="souqy-project-start"
              onSubmit={(event) => {
                event.preventDefault();
                void startProjectFromSidebar();
              }}
            >
              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder={copy.projectNamePlaceholder}
              />
              <button type="submit" disabled={isProjectsLoading}>
                <Plus size={15} />
                <span>{copy.newProject}</span>
              </button>
            </form>
            <div className="souqy-project-list">
              {projectSummaries.map((item) => (
                <article key={item.id} className={project?.id === item.id ? 'is-active' : ''}>
                  <button type="button" onClick={() => void openProjectFromSidebar(item.id)}>
                    {item.latestAssetUrl ? (
                      <i style={{ backgroundImage: `url("${item.latestAssetUrl}")` }} />
                    ) : (
                      <span>
                        <FolderKanban size={18} />
                      </span>
                    )}
                    <div>
                      <strong>{item.businessName}</strong>
                      <small>
                        {item.assetCount} {copy.assetsCount} / {item.currentStep}
                      </small>
                    </div>
                    <em>{formatShortDate(item.updatedAt)}</em>
                  </button>
                </article>
              ))}
              {!projectSummaries.length ? (
                <p className="souqy-empty-state">
                  {isProjectsLoading ? copy.loadingProjects : copy.noProjects}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'history' ? (
          <section className="souqy-workspace-panel" aria-label={copy.historyTab}>
            <div className="souqy-panel-heading">
              <div>
                <span>{copy.workspace}</span>
                <h2>{copy.historyTab}</h2>
              </div>
              <button type="button" onClick={() => void refreshLibrary()}>
                <RefreshCw size={15} />
                <span>{copy.refresh}</span>
              </button>
            </div>
            <div className="souqy-history-grid">
              {libraryAssets.map((asset, index) => (
                <article key={asset.id ?? `${asset.url}-${index}`} className="souqy-history-card">
                  <a
                    className="souqy-history-preview"
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    style={assetPreviewStyle(asset)}
                  >
                    <img src={asset.url} alt={asset.title} />
                  </a>
                  <div>
                    <strong>{asset.title}</strong>
                    <small>
                      {asset.width}x{asset.height} / {labelForAsset(asset, isRtl)}
                    </small>
                  </div>
                  <div className="souqy-history-actions">
                    <button type="button" onClick={() => void prepareAssetForEdit(asset)}>
                      <Pencil size={14} />
                      <span>{copy.editThis}</span>
                    </button>
                    <a
                      href={downloadHrefForAsset(asset)}
                      download={asset.downloadFilename ?? fallbackDownloadName(asset)}
                    >
                      <Download size={14} />
                      <span>{copy.download}</span>
                    </a>
                    <a href={asset.url} target="_blank" rel="noreferrer">
                      <Maximize2 size={14} />
                      <span>{copy.openImage}</span>
                    </a>
                  </div>
                </article>
              ))}
              {!libraryAssets.length ? (
                <p className="souqy-empty-state">
                  {isLibraryLoading ? copy.loadingHistory : copy.noAssets}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'web' ? (
          <section className="souqy-workspace-panel souqy-web-panel" aria-label={copy.webTab}>
            <div className="souqy-panel-heading souqy-web-heading">
              <div>
                <span>{copy.workspace}</span>
                <h2>{copy.webTab}</h2>
                <p>{copy.webBody}</p>
              </div>
              <div className="souqy-web-actions">
                {storefronts.length > 1 ? (
                  <label className="souqy-web-select">
                    <span>{copy.storefront}</span>
                    <select
                      value={webStorefront?.slug ?? ''}
                      onChange={(event) => setSelectedStorefrontSlug(event.target.value)}
                    >
                      {storefronts.map((storefront) => (
                        <option key={storefront.slug} value={storefront.slug}>
                          {storefront.businessName}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={() => setWebPreviewKey((current) => current + 1)}
                  disabled={!webStorefront}
                >
                  <RefreshCw size={15} />
                  <span>{copy.refresh}</span>
                </button>
                {webStorefront ? (
                  <a href={webLiveHref} target="_blank" rel="noreferrer">
                    <Maximize2 size={15} />
                    <span>{copy.openStorefront}</span>
                  </a>
                ) : null}
              </div>
            </div>
            {webStorefront ? (
              <div className="souqy-web-browser">
                <div className="souqy-web-browser-bar" aria-hidden>
                  <span />
                  <span />
                  <span />
                  <strong>{`${webStorefront.slug}.souqna.qa`}</strong>
                </div>
                <iframe
                  key={`${webStorefront.slug}-${webPreviewKey}`}
                  className="souqy-web-iframe"
                  src={webPreviewSrc}
                  title={`${copy.webTab}: ${webStorefront.businessName}`}
                />
                <form
                  className="souqy-web-prompt-dock"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void designWebsiteFromPrompt();
                  }}
                >
                  <div className="souqy-command-head souqy-web-command-head">
                    <div>
                      <span>{copy.studioCommand}</span>
                      <strong>{copy.webCommandTitle}</strong>
                    </div>
                    <small>{copy.webTab}</small>
                  </div>
                  <MetalFx
                    variant="button"
                    preset="silver"
                    theme="dark"
                    strength={0.5}
                    borderRadius={30}
                    ringCssPx={1.2}
                    normalizeHostStyles={false}
                    className="souqy-composer-metal"
                  >
                    <div className="souqy-composer-metal-host">
                      <PromptInput
                        className="souqy-composer souqy-web-composer"
                        value={webPrompt}
                        onValueChange={setWebPrompt}
                        maxHeight={92}
                        isLoading={isWebDesigning}
                        onSubmit={designWebsiteFromPrompt}
                        disabled={isWebDesigning || !webStorefront}
                      >
                        <PromptInputTextarea placeholder={copy.webPromptPlaceholder} dir="auto" />
                        <div className="souqy-composer-toolbar">
                          <PromptInputActions className="souqy-web-prompt-status">
                            <span className="souqy-status-dot" aria-hidden />
                            <span role="status" aria-live="polite">
                              {isWebDesigning
                                ? copy.webDesigning
                                : webStatusMessage || copy.webPromptHint}
                            </span>
                          </PromptInputActions>
                          <PromptInputActions>
                            <PromptInputAction tooltip={copy.webDesign}>
                              <MetalFx
                                variant="circle"
                                preset="chromatic"
                                theme="dark"
                                strength={isWebDesigning ? 0.55 : 0.88}
                                borderRadius={999}
                                ringCssPx={1.4}
                                normalizeHostStyles={false}
                                className="souqy-submit-metal"
                              >
                                <button
                                  type="submit"
                                  disabled={isWebDesigning || !webStorefront}
                                  aria-label={copy.webDesign}
                                >
                                  {isWebDesigning ? <Sparkles size={15} /> : <ArrowUp size={17} />}
                                </button>
                              </MetalFx>
                            </PromptInputAction>
                          </PromptInputActions>
                        </div>
                      </PromptInput>
                    </div>
                  </MetalFx>
                </form>
              </div>
            ) : (
              <p className="souqy-empty-state">{copy.noStorefront}</p>
            )}
          </section>
        ) : null}

        {activeTab !== 'projects' && activeTab !== 'history' && activeTab !== 'web' ? (
          <section ref={chatThreadRef} className="souqy-chat-thread" aria-label={copy.conversation}>
            <div className="souqy-chat-stream">
              {activeTab === 'edit' ? (
                <div className="souqy-edit-shelf">
                  <div>
                    <span>{copy.editTab}</span>
                    <strong>{selectedAsset?.title ?? copy.editSelectTitle}</strong>
                    <p>{references.length ? copy.editReady : copy.editSelectBody}</p>
                  </div>
                  <div className="souqy-edit-picks">
                    {libraryAssets.slice(0, 4).map((asset, index) => (
                      <button
                        key={asset.id ?? `${asset.url}-${index}`}
                        type="button"
                        onClick={() => void prepareAssetForEdit(asset)}
                        aria-label={`${copy.editThis}: ${asset.title}`}
                      >
                        <img src={asset.url} alt={asset.title} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {visibleMessages.map((message) => (
                <article
                  key={message.id}
                  className={`souqy-chat-message is-${message.role}${
                    message.status ? ` is-${message.status}` : ''
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <span className="souqy-chat-avatar" aria-hidden>
                      <SouqyLogo size={28} className="souqy-chat-logo" />
                    </span>
                  ) : null}
                  <div className="souqy-chat-bubble">
                    <div className="souqy-message-meta">
                      <strong>{message.role === 'user' ? copy.you : copy.assistantName}</strong>
                      {message.templateLabel || message.formatLabel || message.modelLabel ? (
                        <span>
                          {[message.templateLabel, message.formatLabel, message.modelLabel]
                            .filter(Boolean)
                            .join(' / ')}
                        </span>
                      ) : null}
                    </div>
                    <p>{message.content}</p>

                    {message.status === 'creating' ? (
                      <div className="souqy-message-progress" role="status" aria-live="polite">
                        <Loader variant="wave" size="sm" className="souqy-status-loader" />
                        <TextShimmer
                          as="span"
                          duration={2.6}
                          spread={18}
                          className="souqy-status-shimmer"
                        >
                          {activeTab === 'chat' ? copy.chatThinking : copy.creating}
                        </TextShimmer>
                        {activeTab === 'chat' ? null : (
                          <>
                            <span className="souqy-status-percent">{generationProgress}%</span>
                            <i
                              className="souqy-status-progress"
                              style={{ inlineSize: `${generationProgress}%` }}
                              aria-hidden
                            />
                          </>
                        )}
                      </div>
                    ) : null}

                    {message.assets?.length ? (
                      <div className="souqy-message-assets">
                        {message.assets.map((asset, index) => (
                          <article
                            key={asset.id ?? `${asset.url}-${index}`}
                            className="souqy-generated-card"
                          >
                            <a
                              className="souqy-generated-preview"
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              style={assetPreviewStyle(asset)}
                            >
                              <img src={asset.url} alt={asset.title} />
                            </a>
                            <div className="souqy-generated-meta">
                              <strong>{asset.title}</strong>
                              <small>
                                {asset.width}x{asset.height} / {labelForAsset(asset, isRtl)}
                              </small>
                            </div>
                            <div className="souqy-generated-actions">
                              <button type="button" onClick={() => void prepareAssetForEdit(asset)}>
                                <Pencil size={14} />
                                <span>{copy.editThis}</span>
                              </button>
                              <a
                                href={downloadHrefForAsset(asset)}
                                download={asset.downloadFilename ?? fallbackDownloadName(asset)}
                              >
                                <Download size={14} />
                                <span>{copy.download}</span>
                              </a>
                              <a href={asset.url} target="_blank" rel="noreferrer">
                                <Maximize2 size={14} />
                                <span>{copy.openImage}</span>
                              </a>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {showComposer ? (
          <form
            className="souqy-command-deck"
            onSubmit={(event) => {
              event.preventDefault();
              submitComposer();
            }}
          >
            <div className="souqy-command-head">
              <div>
                <span>{copy.studioCommand}</span>
                <strong>{commandTitle}</strong>
              </div>
              <small>{activeTab === 'chat' ? 'AI' : currentFormat.size}</small>
            </div>

            {activeTab === 'chat' ? null : (
              <div className="souqy-quick-prompts">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item.en}
                    type="button"
                    onClick={() => setPrompt(isRtl ? item.ar : item.en)}
                  >
                    {isRtl ? item.ar : item.en}
                  </button>
                ))}
              </div>
            )}

            {activeTab !== 'chat' && references.length > 0 ? (
              <div className="souqy-reference-gallery" aria-label={copy.attachedReferences}>
                {references.map((reference) => (
                  <article key={reference.id}>
                    <img src={reference.url} alt={reference.name || copy.attachedReference} />
                    <div>
                      <span>{reference.name || copy.attachedReference}</span>
                      <button
                        type="button"
                        onClick={() => removeReference(reference.id)}
                        aria-label={copy.removeReference}
                      >
                        x
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            <MetalFx
              variant="button"
              preset="silver"
              theme="dark"
              strength={0.5}
              borderRadius={30}
              ringCssPx={1.2}
              normalizeHostStyles={false}
              className="souqy-composer-metal"
            >
              <div className="souqy-composer-metal-host">
                <PromptInput
                  className="souqy-composer"
                  value={prompt}
                  onValueChange={setPrompt}
                  maxHeight={116}
                  isLoading={composerBusy}
                  onSubmit={submitComposer}
                  disabled={composerBusy}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    multiple
                    hidden
                    onChange={(event) => {
                      addReferenceImages(event.target.files);
                      event.target.value = '';
                    }}
                  />
                  <PromptInputTextarea placeholder={composerPlaceholder} dir="auto" />
                  <div className="souqy-composer-toolbar">
                    <PromptInputActions className="souqy-composer-actions">
                      {activeTab === 'chat' ? null : (
                        <PromptInputAction tooltip={copy.attach}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            aria-label={copy.attach}
                            disabled={composerBusy}
                          >
                            <Plus size={18} />
                          </button>
                        </PromptInputAction>
                      )}
                      {activeTab === 'chat' ? null : (
                        <div
                          className="souqy-command-controls"
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <div className="souqy-selector">
                            <button
                              type="button"
                              className="souqy-selector-trigger"
                              aria-label={copy.wireframe}
                              aria-haspopup="menu"
                              aria-expanded={openSelector === 'template'}
                              onClick={() =>
                                setOpenSelector((value) =>
                                  value === 'template' ? null : 'template',
                                )
                              }
                            >
                              <currentType.icon size={14} />
                              <strong>{isRtl ? currentType.ar : currentType.en}</strong>
                              <ChevronDown size={13} />
                            </button>
                            {openSelector === 'template' ? (
                              <div className="souqy-selector-menu" role="menu">
                                <span className="souqy-selector-title">{copy.wireframe}</span>
                                {CREATION_TYPES.map((item) => {
                                  const Icon = item.icon;
                                  const active = item.id === selectedTemplate;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      role="menuitemradio"
                                      aria-checked={active}
                                      className={active ? 'is-selected' : ''}
                                      onClick={() => {
                                        selectTemplate(item.id);
                                        setOpenSelector(null);
                                      }}
                                    >
                                      <Icon size={14} />
                                      <span>{isRtl ? item.ar : item.en}</span>
                                      {active ? <i aria-hidden /> : null}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>

                          <div className="souqy-selector souqy-selector-compact">
                            <button
                              type="button"
                              className="souqy-selector-trigger souqy-selector-trigger-icon"
                              aria-label={`${copy.size}: ${formatAspectLabel(currentFormat, isRtl)}`}
                              aria-haspopup="menu"
                              aria-expanded={openSelector === 'format'}
                              onClick={() =>
                                setOpenSelector((value) => (value === 'format' ? null : 'format'))
                              }
                            >
                              <currentFormat.icon size={14} />
                            </button>
                            {openSelector === 'format' ? (
                              <div
                                className="souqy-selector-menu souqy-selector-menu-format"
                                role="menu"
                              >
                                <span className="souqy-selector-title">Aspect Ratio</span>
                                {FORMAT_PRESETS.map((item) => {
                                  const Icon = item.icon;
                                  const active = item.id === selectedFormat;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      role="menuitemradio"
                                      aria-checked={active}
                                      className={active ? 'is-selected' : ''}
                                      onClick={() => {
                                        setSelectedFormat(item.id);
                                        setOpenSelector(null);
                                      }}
                                    >
                                      <Icon size={14} />
                                      <span>{formatAspectLabel(item, isRtl)}</span>
                                      <small>{item.size}</small>
                                      {active ? <i aria-hidden /> : null}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>

                          <div className="souqy-selector souqy-model-selector">
                            <button
                              type="button"
                              className="souqy-selector-trigger souqy-model-trigger"
                              aria-label={`${copy.model}: ${currentModel.label}`}
                              aria-haspopup="menu"
                              aria-expanded={openSelector === 'model'}
                              onClick={() =>
                                setOpenSelector((value) => (value === 'model' ? null : 'model'))
                              }
                            >
                              <Cpu size={14} />
                              <strong>{currentModel.shortLabel}</strong>
                              <span>{currentModelCost.credits}</span>
                              <ChevronDown size={13} />
                            </button>
                            {openSelector === 'model' ? (
                              <div className="souqy-selector-menu souqy-model-menu" role="menu">
                                <span className="souqy-selector-title">{copy.model}</span>
                                {SOUQY_STUDIO_MODELS.map((item) => {
                                  const active = item.id === selectedModelId;
                                  const disabled =
                                    references.length > 0 && !item.supportsReferences;
                                  const dims = currentFormatDimensions;
                                  const cost = estimateSouqyStudioModelCost({
                                    modelId: item.id,
                                    width: dims.width,
                                    height: dims.height,
                                    quality,
                                  });
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      role="menuitemradio"
                                      aria-checked={active}
                                      className={active ? 'is-selected' : ''}
                                      disabled={disabled}
                                      title={
                                        disabled ? copy.referenceModelUnsupported : item.bestFor
                                      }
                                      onClick={() => {
                                        if (disabled) return;
                                        setSelectedModelId(item.id);
                                        setOpenSelector(null);
                                      }}
                                    >
                                      <Cpu size={14} />
                                      <span className="souqy-model-copy">
                                        <strong>{item.label}</strong>
                                        <small>{item.latency} / {item.bestFor}</small>
                                        <small>
                                          {formatSouqyStudioUsd(cost.baseUsd)} base x3 ={' '}
                                          {formatSouqyStudioUsd(cost.billableUsd)}
                                        </small>
                                      </span>
                                      <em>
                                        <Coins size={12} />
                                        {cost.credits}
                                      </em>
                                      {active ? <i aria-hidden /> : null}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>

                          <div className="souqy-selector souqy-selector-compact souqy-settings-selector">
                            <button
                              type="button"
                              className="souqy-selector-trigger souqy-selector-trigger-icon"
                              aria-label={copy.settings}
                              aria-haspopup="menu"
                              aria-expanded={openSelector === 'settings'}
                              onClick={() =>
                                setOpenSelector((value) =>
                                  value === 'settings' ? null : 'settings',
                                )
                              }
                            >
                              <SlidersHorizontal size={14} />
                            </button>
                            {openSelector === 'settings' ? (
                              <div
                                className="souqy-selector-menu souqy-settings-menu"
                                role="menu"
                                onClick={(event) => event.stopPropagation()}
                                onPointerDown={(event) => event.stopPropagation()}
                              >
                                <span className="souqy-selector-title">
                                  {copy.creationSettings}
                                </span>

                                <label className="souqy-field">
                                  <span>{copy.storefront}</span>
                                  <select
                                    value={selectedStorefrontSlug}
                                    onChange={(event) =>
                                      setSelectedStorefrontSlug(event.target.value)
                                    }
                                  >
                                    <option value="">{copy.noStorefront}</option>
                                    {storefronts.map((storefront) => (
                                      <option key={storefront.slug} value={storefront.slug}>
                                        {storefront.businessName}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="souqy-field">
                                  <span>{copy.quality}</span>
                                  <select
                                    value={quality}
                                    onChange={(event) =>
                                      setQuality(
                                        event.target.value as 'standard' | 'high' | 'print',
                                      )
                                    }
                                  >
                                    <option value="standard">{copy.standard}</option>
                                    <option value="high">{copy.high}</option>
                                    <option value="print">{copy.print}</option>
                                  </select>
                                </label>

                                <label className="souqy-toggle-row">
                                  <span>{copy.bleed}</span>
                                  <input
                                    type="checkbox"
                                    checked={printBleed}
                                    onChange={(event) => setPrintBleed(event.target.checked)}
                                  />
                                </label>

                                <label className="souqy-field">
                                  <span>{copy.instructions}</span>
                                  <textarea
                                    value={brandInstructions}
                                    onChange={(event) => setBrandInstructions(event.target.value)}
                                    maxLength={500}
                                    placeholder={copy.instructionsPlaceholder}
                                  />
                                </label>

                                <label className="souqy-slider">
                                  <span>{copy.creativity}</span>
                                  <input
                                    type="range"
                                    min={0}
                                    max={10}
                                    value={creativity}
                                    onChange={(event) => setCreativity(Number(event.target.value))}
                                  />
                                  <small>{creativity}/10</small>
                                </label>

                                <div className="souqy-product-picker">
                                  <span>{copy.catalog}</span>
                                  {visibleProducts.slice(0, 6).map((product) => (
                                    <button
                                      key={product.id}
                                      type="button"
                                      className={
                                        selectedProductIds.includes(product.id) ? 'is-active' : ''
                                      }
                                      onClick={() => toggleProduct(product.id)}
                                    >
                                      {product.imageUrl ? (
                                        <i
                                          style={{ backgroundImage: `url("${product.imageUrl}")` }}
                                        />
                                      ) : (
                                        <ShoppingBag size={14} />
                                      )}
                                      <span>{product.title}</span>
                                      <small>
                                        {product.priceQar !== null
                                          ? `${product.priceQar} QAR`
                                          : product.storefrontName}
                                      </small>
                                    </button>
                                  ))}
                                  {visibleProducts.length === 0 ? <p>{copy.noProducts}</p> : null}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </PromptInputActions>
                    <PromptInputActions>
                      <PromptInputAction
                        tooltip={activeTab === 'chat' ? copy.send : copy.generateShort}
                      >
                        <MetalFx
                          variant="circle"
                          preset="chromatic"
                          theme="dark"
                          strength={composerBusy ? 0.55 : 0.88}
                          borderRadius={999}
                          ringCssPx={1.4}
                          normalizeHostStyles={false}
                          className="souqy-submit-metal"
                        >
                          <button
                            type="submit"
                            disabled={composerBusy}
                            aria-label={activeTab === 'chat' ? copy.send : copy.generateShort}
                          >
                            {composerBusy ? <Sparkles size={15} /> : <ArrowUp size={17} />}
                          </button>
                        </MetalFx>
                      </PromptInputAction>
                    </PromptInputActions>
                  </div>
                  <div
                    className={
                      composerBusy ? 'souqy-composer-status is-generating' : 'souqy-composer-status'
                    }
                    role="status"
                    aria-live="polite"
                  >
                    {composerBusy ? (
                      <>
                        <Loader variant="wave" size="sm" className="souqy-status-loader" />
                        <TextShimmer
                          as="span"
                          duration={2.6}
                          spread={18}
                          className="souqy-status-shimmer"
                        >
                          {activeTab === 'chat' ? copy.chatThinking : copy.creating}
                        </TextShimmer>
                        {activeTab === 'chat' ? null : (
                          <>
                            <span className="souqy-status-percent">{generationProgress}%</span>
                            <i
                              className="souqy-status-progress"
                              style={{ inlineSize: `${generationProgress}%` }}
                              aria-hidden
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="souqy-status-dot" aria-hidden />
                        <span>{statusMessage || copy.statusIdle}</span>
                      </>
                    )}
                  </div>
                </PromptInput>
              </div>
            </MetalFx>
          </form>
        ) : null}
      </main>
    </section>
  );
}

function assetPreviewStyle(asset: SouqyStudioAsset): CSSProperties {
  return {
    '--souqy-preview-aspect': `${asset.width} / ${asset.height}`,
  } as CSSProperties;
}

function labelForAsset(asset: SouqyStudioAsset, isRtl: boolean): string {
  if (asset.formatKey) return asset.formatKey.replace(/-/g, ' ');
  if (asset.assetType) return asset.assetType.replace(/-/g, ' ');
  return isRtl ? 'أصل سوقي' : 'Souqy asset';
}

function fallbackDownloadName(asset: SouqyStudioAsset): string {
  const extension =
    asset.mimeType === 'image/png'
      ? 'png'
      : asset.mimeType === 'image/jpeg' || asset.mimeType === 'image/jpg'
        ? 'jpg'
        : asset.mimeType === 'image/svg+xml'
          ? 'svg'
          : 'webp';
  const base = (asset.assetType ?? asset.kind ?? 'souqy-output')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'souqy-output'}-${asset.width}x${asset.height}.${extension}`;
}

function downloadHrefForAsset(asset: SouqyStudioAsset): string {
  const filename = asset.downloadFilename ?? fallbackDownloadName(asset);
  return `/api/souqy-studio/download?url=${encodeURIComponent(asset.url)}&filename=${encodeURIComponent(
    filename,
  )}`;
}

function formatAspectLabel(format: (typeof FORMAT_PRESETS)[number], isRtl: boolean): string {
  const labels: Record<StudioFormatKey, { en: string; ar: string }> = {
    'instagram-post': { en: 'Portrait (4:5)', ar: 'Portrait (4:5)' },
    'instagram-story': { en: 'Vertical (9:16)', ar: 'Vertical (9:16)' },
    tiktok: { en: 'Vertical (9:16)', ar: 'Vertical (9:16)' },
    snapchat: { en: 'Vertical (9:16)', ar: 'Vertical (9:16)' },
    'whatsapp-status': { en: 'Vertical (9:16)', ar: 'Vertical (9:16)' },
    'x-banner': { en: 'Wide (16:9)', ar: 'Wide (16:9)' },
    'a3-print': { en: 'Print (A3)', ar: 'Print (A3)' },
    'menu-print': { en: 'Classic (A4)', ar: 'Classic (A4)' },
    'product-card': { en: 'Square (1:1)', ar: 'Square (1:1)' },
    'logo-square': { en: 'Square (1:1)', ar: 'Square (1:1)' },
    'wide-banner': { en: 'Landscape (2:1)', ar: 'Landscape (2:1)' },
  };
  const label = labels[format.id];
  return isRtl ? label.ar : label.en;
}

function dimensionsForFormat(formatKey: StudioFormatKey): { width: number; height: number } {
  if (formatKey === 'instagram-story' || formatKey === 'tiktok' || formatKey === 'snapchat') {
    return { width: 1080, height: 1920 };
  }
  if (formatKey === 'whatsapp-status') return { width: 1080, height: 1920 };
  if (formatKey === 'x-banner') return { width: 1600, height: 900 };
  if (formatKey === 'a3-print') return { width: 3508, height: 4961 };
  if (formatKey === 'menu-print') return { width: 2480, height: 3508 };
  if (formatKey === 'logo-square') return { width: 1024, height: 1024 };
  if (formatKey === 'wide-banner') return { width: 2400, height: 1200 };
  if (formatKey === 'product-card') return { width: 1080, height: 1080 };
  return { width: 1080, height: 1350 };
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function cranlErrorLabel(error?: string): string {
  if (error === 'cranl_not_configured') {
    return 'The AI assistant is missing its runtime URL or API key in this environment.';
  }
  if (error === 'cranl_request_failed') return 'The AI assistant request failed.';
  if (error === 'invalid_ai_chat_job') return 'The AI assistant rejected this chat request.';
  if (error === 'job_not_found') return 'The AI assistant job was not found.';
  return sanitizeRuntimeBranding(error || 'The AI assistant failed.');
}

function cranlFailureLabel(reason: string): string {
  if (/status code 429|rate.?limit|quota|insufficient_quota/i.test(reason)) {
    return 'The AI provider returned 429. Check the AI runtime provider key, quota, billing, or rate limits.';
  }
  return sanitizeRuntimeBranding(reason);
}

function sanitizeRuntimeBranding(value: string): string {
  return value.replace(/CranL/giu, 'AI runtime').replace(/cranl/giu, 'AI runtime');
}

function extractCranlText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const output = 'output' in value ? (value as { output?: unknown }).output : value;
  if (typeof output === 'string') return output;
  if (!output || typeof output !== 'object') return '';
  if ('text' in output && typeof (output as { text?: unknown }).text === 'string') {
    return String((output as { text: string }).text);
  }
  const choices = (output as { choices?: unknown }).choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as { message?: { content?: unknown }; text?: unknown } | undefined;
    if (typeof first?.message?.content === 'string') return first.message.content;
    if (typeof first?.text === 'string') return first.text;
  }
  if ('content' in output && typeof (output as { content?: unknown }).content === 'string') {
    return String((output as { content: string }).content);
  }
  return '';
}

function studioCopy(isRtl: boolean) {
  return isRtl
    ? {
        aiMemory: 'ذاكرة الذكاء',
        aiSlogan: 'شعار ذكي',
        attach: 'إرفاق ملف',
        attachedReference: 'صورة مرفقة',
        attachedReferences: 'الصور المرفقة',
        automationLab: 'مختبر الأتمتة',
        bleed: 'هوامش طباعة',
        brandArchitect: 'معمار الهوية',
        campaignEngine: 'محرك الحملات',
        campaignSignals: 'إشارات حملة',
        catalog: 'منتجات الكتالوج',
        catalogItems: 'منتجات',
        clearerPrompt: 'اكتب وصفا أوضح للتصميم.',
        commandTitle: 'صمّم، حلّل، ونظّم من أمر واحد.',
        comparisonWall: 'جدار المقارنة',
        contextTitle: 'لوحة السياق',
        creating: 'سوقي يصمم الأصل...',
        collapse: 'طي',
        creativity: 'قوة الإبداع',
        download: 'تحميل',
        eyebrow: '',
        assistantName: 'Souqy AI',
        conversation: 'Souqy conversation',
        assetsCount: 'assets',
        chatCommandTitle: 'Ask Souqy',
        chatEmptyResult: 'The AI assistant finished without a readable answer.',
        chatFailed: 'The AI assistant failed.',
        chatPlaceholder: 'Ask Souqy for campaign ideas, prompts, or storefront advice...',
        chatReady: 'AI replied.',
        chatSystemPrompt:
          'You are Souqy Studio, a practical AI assistant for storefront owners creating ads, posters, product visuals, and launch campaigns. Keep answers concise, specific, and ready to use.',
        chatTab: 'Chat',
        chatThinking: 'Souqy is thinking...',
        chatTimedOut: 'The AI assistant is still working. Try checking again in a moment.',
        clearerChatPrompt: 'Ask Souqy something first.',
        clearerWebPrompt: 'Describe the website change in a little more detail.',
        createTab: 'Create',
        creationSettings: 'Creation settings',
        editCommandTitle: 'Edit an image',
        editNeedsReference: 'Choose or upload an image before editing.',
        editPromptPlaceholder: 'Describe the changes you want Souqy to make...',
        editPromptSeed:
          'Polish this into a premium storefront ad while preserving the original design.',
        editReady: 'Ready to edit this asset.',
        editReferenceFailed: 'Could not prepare this asset for editing.',
        editSelectBody: 'Upload a reference or choose a recent asset from History.',
        editSelectTitle: 'Choose an asset to edit',
        editTab: 'Edit',
        editThis: 'Edit',
        historyTab: 'History',
        libraryReady: 'History refreshed.',
        loadingHistory: 'Loading saved assets...',
        loadingProjects: 'Loading projects...',
        newProject: 'New',
        noProjects: 'No projects yet.',
        openStorefront: 'Open',
        preparingEdit: 'Preparing this asset for editing...',
        projectNamePlaceholder: 'Project name',
        projectNameRequired: 'Enter a project name first.',
        projectOpened: 'Project opened.',
        projectStarted: 'Project started.',
        projectsError: 'Could not load Souqy projects.',
        projectsReady: 'Projects refreshed.',
        projectsTab: 'Projects',
        refresh: 'Refresh',
        resultReady: 'Your asset is ready.',
        send: 'Send',
        settings: 'Settings',
        tabLabels: {
          projects: 'Projects',
          create: 'Create',
          edit: 'Edit',
          chat: 'Chat',
          web: 'Web',
          history: 'History',
        },
        webBody: 'Preview the selected storefront in a live browser frame.',
        webCommandTitle: 'Design this website',
        webDesign: 'Design website',
        webDesignFailed: 'Could not redesign the website. Try again.',
        webDesigning: 'Souqy is designing the storefront...',
        webDesignReady: 'Website redesigned. Preview refreshed.',
        webPromptHint: 'Ask for layout, colors, sections, copy, or product presentation changes.',
        webPromptPlaceholder: 'Tell Souqy how to redesign this storefront...',
        webTab: 'Web',
        workspace: 'Workspace',
        you: 'You',
        expand: 'توسيع',
        focus: 'تركيز',
        founderFocusBody: 'تخف الإضاءة وتختفي اللوحات الثانوية حتى يبقى الأمر الإبداعي في المنتصف.',
        founderFocusTitle: 'مساحة هادئة للعمل العميق.',
        founderMode: 'وضع المؤسس',
        generateAutomation: 'توليد تدفق ذكي',
        generateShort: 'إنشاء',
        generatedOutput: 'المخرج الناتج',
        growthOpportunity: 'فرصة نمو',
        headquarters: 'المقر الإبداعي',
        heroBody: 'اكتب طلبك بالأسفل لبدء الإنشاء',
        heroTitle: 'جاهز للإنشاء',
        high: 'عالية',
        infinityCanvas: 'اللوحة اللامحدودة',
        instructions: 'تعليمات الهوية',
        instructionsPlaceholder: 'فاخر، هادئ، مناسب للعربية، إضاءة دافئة...',
        libraryError: 'تعذر تحميل مكتبة سوقي.',
        live: 'حي',
        liveModule: 'وحدة حية',
        locked: 'مقفل',
        modules: 'وحدات سوقي',
        motionBody: 'تحويل الإخراج الحالي إلى ريل أو إعلان متحرك سيتم وصله بمحرك الفيديو لاحقا.',
        motionStoryboard: 'لوحة حركة سينمائية',
        motionStudio: 'استوديو الحركة',
        model: 'النموذج',
        noAssets: 'ستظهر أعمالك الأخيرة هنا.',
        noProducts: 'لا توجد منتجات مرتبطة بعد.',
        noSelection: 'اختر أصلا من اللوحة.',
        noStorefront: 'بدون متجر محدد',
        openModules: 'فتح الوحدات',
        openImage: 'فتح الصورة',
        operatingStudio: 'Luxury AI operating studio',
        outputs: 'مخرجات',
        preview: 'معاينة',
        previewModule: 'وحدة معاينة',
        preparing: 'نجهز مكتبة الأصول...',
        pricingSignal: 'إشارة سعر',
        promptPlaceholder: 'اكتب ما تريد من سوقي أن يصممه لهذا البراند...',
        quality: 'الدقة',
        recommendationOne: 'حوّل آخر تصميم إلى حملة واتساب وإنستغرام.',
        recommendationTwo: 'جرّب بطاقة منتج مربعة للعروض السريعة.',
        referenceModelUnsupported: 'هذا النموذج لا يدعم تعديل الصور المرجعية في هذا المسار.',
        recentOutputs: 'المخرجات الأخيرة',
        removeReference: 'إزالة المرجع',
        selected: 'الأصل المحدد',
        size: 'المقاس',
        slogan: 'إطلاقك القادم يبدأ بهوية لا تشبه السوق.',
        standard: 'قياسية',
        statusIdle: 'جاهز لاستقبال الأمر التالي.',
        storefront: 'المتجر',
        storefronts: 'متاجر',
        storeIntelligence: 'ذكاء المتجر',
        studioCommand: 'Studio Command',
        variant: 'بديل',
        wireframe: 'النوع',
        print: 'للطباعة',
      }
    : {
        aiMemory: 'AI memory',
        aiSlogan: 'AI slogan',
        attach: 'Attach file',
        attachedReference: 'Attached image',
        attachedReferences: 'Attached images',
        automationLab: 'Automation Lab',
        bleed: 'Print bleed',
        brandArchitect: 'AI Brand Architect',
        campaignEngine: 'Campaign Engine',
        campaignSignals: 'Campaign signals',
        catalog: 'Catalog products',
        catalogItems: 'Catalog',
        clearerPrompt: 'Write a clearer design prompt first.',
        clearerWebPrompt: 'Describe the website change in a little more detail.',
        commandTitle: 'Prompt',
        comparisonWall: 'Comparison wall',
        contextTitle: 'Context panel',
        creating: 'Souqy is creating the asset...',
        collapse: 'Collapse',
        creativity: 'Creative strength',
        download: 'Download',
        eyebrow: '',
        assistantName: 'Souqy AI',
        conversation: 'Souqy conversation',
        assetsCount: 'assets',
        chatCommandTitle: 'Ask Souqy',
        chatEmptyResult: 'The AI assistant finished without a readable answer.',
        chatFailed: 'The AI assistant failed.',
        chatPlaceholder: 'Ask Souqy for campaign ideas, prompts, or storefront advice...',
        chatReady: 'AI replied.',
        chatSystemPrompt:
          'You are Souqy Studio, a practical AI assistant for storefront owners creating ads, posters, product visuals, and launch campaigns. Keep answers concise, specific, and ready to use.',
        chatTab: 'Chat',
        chatThinking: 'Souqy is thinking...',
        chatTimedOut: 'The AI assistant is still working. Try checking again in a moment.',
        clearerChatPrompt: 'Ask Souqy something first.',
        createTab: 'Create',
        creationSettings: 'Creation settings',
        editCommandTitle: 'Edit an image',
        editNeedsReference: 'Choose or upload an image before editing.',
        editPromptPlaceholder: 'Describe the changes you want Souqy to make...',
        editPromptSeed:
          'Polish this into a premium storefront ad while preserving the original design.',
        editReady: 'Ready to edit this asset.',
        editReferenceFailed: 'Could not prepare this asset for editing.',
        editSelectBody: 'Upload a reference or choose a recent asset from History.',
        editSelectTitle: 'Choose an asset to edit',
        editTab: 'Edit',
        editThis: 'Edit',
        historyTab: 'History',
        libraryReady: 'History refreshed.',
        loadingHistory: 'Loading saved assets...',
        loadingProjects: 'Loading projects...',
        newProject: 'New',
        noProjects: 'No projects yet.',
        openStorefront: 'Open',
        preparingEdit: 'Preparing this asset for editing...',
        projectNamePlaceholder: 'Project name',
        projectNameRequired: 'Enter a project name first.',
        projectOpened: 'Project opened.',
        projectStarted: 'Project started.',
        projectsError: 'Could not load Souqy projects.',
        projectsReady: 'Projects refreshed.',
        projectsTab: 'Projects',
        refresh: 'Refresh',
        resultReady: 'Your asset is ready.',
        send: 'Send',
        settings: 'Settings',
        tabLabels: {
          projects: 'Projects',
          create: 'Create',
          edit: 'Edit',
          chat: 'Chat',
          web: 'Web',
          history: 'History',
        },
        webBody: 'Preview the selected storefront in a live browser frame.',
        webCommandTitle: 'Design this website',
        webDesign: 'Design website',
        webDesignFailed: 'Could not redesign the website. Try again.',
        webDesigning: 'Souqy is designing the storefront...',
        webDesignReady: 'Website redesigned. Preview refreshed.',
        webPromptHint: 'Ask for layout, colors, sections, copy, or product presentation changes.',
        webPromptPlaceholder: 'Tell Souqy how to redesign this storefront...',
        webTab: 'Web',
        workspace: 'Workspace',
        you: 'You',
        expand: 'Expand',
        focus: 'Focus',
        founderFocusBody:
          'Secondary panels recede, lighting softens, and the command dock becomes the center of gravity.',
        founderFocusTitle: 'A quiet room for high-leverage founder work.',
        founderMode: 'Founder Mode',
        generateAutomation: 'Generate automation',
        generateShort: 'Generate',
        generatedOutput: 'Generated output',
        growthOpportunity: 'Growth opportunity',
        headquarters: 'Creative HQ',
        heroBody: 'Enter a prompt below to start generating',
        heroTitle: 'Ready to Create',
        high: 'High',
        infinityCanvas: 'Infinity Canvas',
        instructions: 'Brand instructions',
        instructionsPlaceholder: 'Premium, quiet, Arabic-friendly, warm keylight...',
        libraryError: 'Could not load Souqy library.',
        live: 'Live',
        liveModule: 'Live module',
        locked: 'Locked',
        modules: 'Souqy modules',
        motionBody:
          'The current output can become a reel, story ad, or cinematic launch film when video rendering is connected.',
        motionStoryboard: 'Cinematic storyboard',
        motionStudio: 'Motion Studio',
        model: 'Model',
        noAssets: 'Recent work will appear here.',
        noProducts: 'No catalog products connected yet.',
        noSelection: 'Select an output from the canvas.',
        noStorefront: 'No storefront selected',
        openModules: 'Open modules',
        openImage: 'Open image',
        operatingStudio: 'Luxury AI operating studio',
        outputs: 'Outputs',
        preview: 'Preview',
        previewModule: 'Preview module',
        preparing: 'Preparing the asset library...',
        pricingSignal: 'Pricing signal',
        promptPlaceholder: 'Enter a prompt below to start generating',
        quality: 'Quality',
        recommendationOne: 'Turn the latest asset into a WhatsApp and Instagram launch kit.',
        recommendationTwo: 'Try a square product card for faster offer conversion.',
        referenceModelUnsupported:
          'This model does not support reference-image edits in this surface.',
        recentOutputs: 'Recent outputs',
        removeReference: 'Remove reference',
        selected: 'Selected asset',
        size: 'Size',
        slogan: 'Your next launch starts with an identity the market remembers.',
        standard: 'Standard',
        statusIdle: 'Ready for the next command.',
        storefront: 'Storefront',
        storefronts: 'Stores',
        storeIntelligence: 'Store Intelligence',
        studioCommand: 'Studio Command',
        variant: 'Variant',
        wireframe: 'Wireframe',
        print: 'Print',
      };
}

async function postSouqyStudio<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!text)
    throw new Error(
      response.ok ? 'Souqy Studio returned an empty response.' : 'Souqy Studio request failed.',
    );
  return JSON.parse(text) as T;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read reference image.'));
    reader.readAsDataURL(file);
  });
}

function TikTokIcon(props: { size?: string | number }) {
  return <span style={{ fontSize: props.size ?? 16, fontWeight: 800 }}>T</span>;
}

function GhostIcon(props: { size?: string | number }) {
  return <span style={{ fontSize: props.size ?? 16, fontWeight: 800 }}>S</span>;
}

function WhatsAppIcon(props: { size?: string | number }) {
  return <span style={{ fontSize: props.size ?? 16, fontWeight: 800 }}>W</span>;
}

function XIcon(props: { size?: string | number }) {
  return <span style={{ fontSize: props.size ?? 16, fontWeight: 800 }}>X</span>;
}

function MegaphoneIcon(props: { size?: string | number }) {
  return <Sparkles size={props.size ?? 16} />;
}

const studioCss = `
.souqy-workplace * { box-sizing: border-box; }
body:has(.souqy-workplace) nav:not(.souqy-workplace nav),
body:has(.souqy-workplace) footer,
body:has(.souqy-workplace) [data-public-chrome],
body:has(.souqy-workplace) > .fixed,
body:has(.souqy-workplace) [data-homepage-blank] { display: none !important; }
.souqy-workplace {
  --souqy-bg: #050505;
  --souqy-ink: #f4ead6;
  --souqy-muted: rgba(244, 234, 214, .62);
  --souqy-faint: rgba(244, 234, 214, .36);
  --souqy-line: rgba(244, 234, 214, .11);
  --souqy-line-strong: rgba(244, 234, 214, .2);
  --souqy-panel: rgba(18, 17, 15, .78);
  --souqy-panel-strong: rgba(27, 25, 22, .92);
  --souqy-panel-soft: rgba(244, 234, 214, .055);
  --souqy-gold: ${palette.gold};
  --souqy-gold-deep: ${palette.goldDeep};
  --souqy-maroon: ${palette.maroon};
  --souqy-maroon-deep: ${palette.maroonDeep};
  min-block-size: 100dvh;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  background: var(--souqy-bg);
  color: var(--souqy-ink);
  font-family: var(--souqy-font);
  overflow: hidden;
  isolation: isolate;
  transition: none;
}
.souqy-workplace button,
.souqy-workplace input,
.souqy-workplace select,
.souqy-workplace textarea {
  font: inherit;
}
.souqy-workplace button {
  color: inherit;
}
.souqy-atmosphere {
  position: fixed;
  inset: 0;
  z-index: -2;
  overflow: hidden;
  background: linear-gradient(180deg, #000 0%, #050505 55%, #020202 100%);
}
.souqy-atmosphere::before,
.souqy-atmosphere::after {
  content: '';
  position: absolute;
  inset: -12%;
  pointer-events: none;
}
.souqy-atmosphere::before {
  background:
    radial-gradient(circle at 50% 34%, rgba(255,255,255,.045), transparent 31%),
    radial-gradient(circle at 72% 72%, rgba(242,220,181,.025), transparent 28%);
  mix-blend-mode: screen;
}
.souqy-atmosphere::after {
  background: linear-gradient(180deg, rgba(0,0,0,.24), rgba(0,0,0,.72));
}
.souqy-dither-wave {
  position: absolute !important;
  inset: 0;
  opacity: 1;
  mix-blend-mode: screen;
  pointer-events: none;
  filter: saturate(.82) contrast(1.06);
}
.souqy-dither-wave canvas {
  inline-size: 100% !important;
  block-size: 100% !important;
}
.souqy-grid {
  display: none;
}
.souqy-geo {
  display: none;
}
.souqy-min-sidebar {
  position: relative;
  z-index: 12;
  block-size: calc(100dvh - 24px);
  margin: 12px 0 12px 12px;
  padding: 12px 8px;
  border: 1px solid rgba(244,234,214,.12);
  border-radius: 22px;
  background: rgba(0,0,0,.72);
  backdrop-filter: blur(26px) saturate(1.12);
  -webkit-backdrop-filter: blur(26px) saturate(1.12);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  box-shadow: 0 22px 80px rgba(0,0,0,.34), inset 0 1px rgba(255,255,255,.04);
}
[dir='rtl'] .souqy-min-sidebar {
  margin: 12px 12px 12px 0;
}
.souqy-sidebar-brand,
.souqy-sidebar-items button {
  border: 0;
  background: transparent;
  color: rgba(244,234,214,.72);
  cursor: pointer;
}
.souqy-sidebar-brand {
  inline-size: 54px;
  block-size: 54px;
  border: 1px solid rgba(201,169,97,.28);
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, rgba(201,169,97,.16), rgba(244,234,214,.035));
  box-shadow: inset 0 1px rgba(255,255,255,.08), 0 16px 46px rgba(0,0,0,.3);
}
.souqy-sidebar-items {
  display: grid;
  align-content: start;
  gap: 8px;
}
.souqy-sidebar-items button {
  min-block-size: 58px;
  border: 1px solid transparent;
  border-radius: 16px;
  display: grid;
  place-items: center;
  gap: 5px;
  padding: 7px 4px;
  transition:
    background .18s ease,
    border-color .18s ease,
    color .18s ease,
    transform .18s cubic-bezier(.2,.8,.2,1);
}
.souqy-sidebar-items button:hover,
.souqy-sidebar-items button.is-active {
  border-color: rgba(244,234,214,.16);
  background: linear-gradient(180deg, rgba(244,234,214,.14), rgba(244,234,214,.055));
  color: var(--souqy-ink);
  transform: translateY(-1px);
}
.souqy-sidebar-items button.is-active {
  border-color: rgba(201,169,97,.38);
  color: #050505;
  background: linear-gradient(135deg, var(--souqy-gold), #e8d8ad);
}
.souqy-sidebar-items span {
  max-inline-size: 58px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 760;
  line-height: 1.1;
}
.souqy-left-rail,
.souqy-context-panel {
  position: relative;
  z-index: 5;
  block-size: 100dvh;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(201,169,97,.36) transparent;
  background: rgba(0, 0, 0, .74);
  border-color: var(--souqy-line);
  backdrop-filter: blur(28px) saturate(1.12);
  -webkit-backdrop-filter: blur(28px) saturate(1.12);
}
.souqy-left-rail {
  margin: 12px 0 12px 14px;
  block-size: calc(100dvh - 24px);
  padding: 14px 10px;
  border-inline-end: 1px solid var(--souqy-line);
  border: 1px solid rgba(244,234,214,.1);
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  inline-size: 66px;
  overflow: hidden;
  transition: inline-size .24s ease, align-items .24s ease;
}
.is-rail-expanded .souqy-left-rail {
  inline-size: 254px;
  align-items: stretch;
}
.souqy-context-panel {
  padding: 20px;
  border-inline-start: 1px solid var(--souqy-line);
  display: none;
}
.souqy-rail-brand {
  display: grid;
  place-items: center;
  min-block-size: auto;
  margin-block-end: 18px;
}
.souqy-rail-brand > span {
  display: grid;
  place-items: center;
  inline-size: 42px;
  block-size: 42px;
  border: 1px solid rgba(201,169,97,.32);
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(201,169,97,.18), rgba(244,234,214,.04));
  color: var(--souqy-gold);
  font-family: var(--souqy-display);
  font-size: 24px;
  box-shadow: inset 0 1px rgba(255,255,255,.08), 0 20px 60px rgba(0,0,0,.34);
}
.souqy-rail-mark img {
  display: block;
  inline-size: 30px;
  block-size: 30px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(201,169,97,.18));
}
.souqy-rail-brand div {
  display: none;
}
.souqy-rail-brand strong,
.souqy-context-head strong,
.souqy-command-head strong,
.souqy-hero h1 {
  font-family: var(--souqy-display);
  letter-spacing: 0;
}
.souqy-rail-brand strong {
  display: block;
  font-size: 21px;
  font-weight: 400;
  line-height: 1;
}
.souqy-rail-brand small,
.souqy-context-head span,
.souqy-command-head span,
.souqy-topbar-title span,
.souqy-hero p {
  color: var(--souqy-gold);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .12em;
}
.souqy-module-nav {
  display: grid;
  gap: 6px;
  inline-size: 100%;
  justify-items: center;
  padding-block-end: 12px;
  flex: 1 1 auto;
  min-block-size: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.souqy-module-nav::-webkit-scrollbar {
  display: none;
}
.souqy-module-nav button {
  position: relative;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  gap: 0;
  inline-size: 46px;
  min-block-size: 42px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  padding: 0;
  color: var(--souqy-muted);
  cursor: pointer;
  text-align: start;
  overflow: hidden;
  transition:
    inline-size .22s ease,
    background .18s ease,
    border-color .18s ease,
    color .18s ease,
    padding .22s ease;
}
.souqy-module-nav button:hover,
.souqy-module-nav button.is-active {
  color: #050505;
  border-color: rgba(244,234,214,.88);
  background: rgba(244,234,214,.92);
}
.souqy-module-nav button svg {
  color: currentColor;
  grid-column: 1;
}
.souqy-module-nav span {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.souqy-module-nav small {
  display: none;
}
.is-rail-expanded .souqy-module-nav {
  justify-items: stretch;
}
.is-rail-expanded .souqy-module-nav button {
  inline-size: 100%;
  grid-template-columns: 22px minmax(0, 1fr);
  justify-items: start;
  gap: 10px;
  padding: 0 12px;
  color: rgba(244,234,214,.84);
}
.is-rail-expanded .souqy-module-nav button:hover,
.is-rail-expanded .souqy-module-nav button.is-active {
  color: #050505;
}
.is-rail-expanded .souqy-module-nav span {
  position: static;
  inline-size: auto;
  block-size: auto;
  overflow: hidden;
  clip: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-inline-size: 0;
  white-space: nowrap;
}
.is-rail-expanded .souqy-module-nav span strong {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 700;
}
.is-rail-expanded .souqy-module-nav span small {
  display: inline-flex;
  border: 1px solid rgba(244,234,214,.12);
  border-radius: 999px;
  padding: 2px 6px;
  color: rgba(244,234,214,.45);
  font-size: 9px;
  text-transform: uppercase;
}
.is-rail-expanded .souqy-module-nav button.is-active span small,
.is-rail-expanded .souqy-module-nav button:hover span small {
  border-color: rgba(0,0,0,.18);
  color: rgba(0,0,0,.56);
}
.souqy-panel-card small,
.souqy-selected-asset small {
  color: var(--souqy-muted);
}
.souqy-rail-mini {
  display: none;
}
.souqy-rail-mini div {
  min-inline-size: 0;
  border: 1px solid var(--souqy-line);
  border-radius: 8px;
  padding: 9px;
  background: rgba(0,0,0,.16);
}
.souqy-rail-mini strong {
  display: block;
  color: var(--souqy-gold);
  font-variant-numeric: tabular-nums;
}
.souqy-rail-mini span {
  display: block;
  margin-block-start: 3px;
  color: var(--souqy-faint);
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-rail-expand {
  margin-block-start: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  inline-size: 46px;
  min-block-size: 42px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--souqy-muted);
  cursor: pointer;
}
.souqy-rail-expand:hover {
  color: var(--souqy-ink);
  background: rgba(255,255,255,.08);
}
.souqy-rail-expand span {
  display: none;
  font-size: 12px;
  font-weight: 700;
}
.is-rail-expanded .souqy-rail-expand {
  inline-size: 100%;
  justify-content: flex-start;
  padding-inline: 12px;
}
.is-rail-expanded .souqy-rail-expand span {
  display: inline;
}
.souqy-main {
  position: relative;
  min-inline-size: 0;
  block-size: 100dvh;
  overflow: hidden;
  touch-action: auto;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
}
.souqy-topbar {
  position: absolute;
  z-index: 20;
  inset-block-start: 18px;
  inset-inline: 22px;
  display: none;
  align-items: center;
  gap: 10px;
}
.souqy-mobile-menu {
  display: none;
}
.souqy-topbar-title {
  display: grid;
  gap: 2px;
  min-inline-size: 158px;
}
.souqy-topbar-title strong {
  color: var(--souqy-muted);
  font-size: 12px;
  font-weight: 500;
}
.souqy-founder-toggle,
.souqy-mobile-menu {
  border: 1px solid var(--souqy-line);
  border-radius: 8px;
  background: rgba(18,17,15,.72);
  color: var(--souqy-ink);
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 45px rgba(0,0,0,.24);
}
.souqy-founder-toggle,
.souqy-mobile-menu {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-block-size: 48px;
  padding: 0 13px;
  cursor: pointer;
}
.souqy-founder-toggle.is-active {
  border-color: rgba(201,169,97,.42);
  color: var(--souqy-gold);
}
.souqy-hero {
  position: absolute;
  z-index: 4;
  inset-block-start: 17vh;
  inset-inline: 50% auto;
  transform: translateX(-50%);
  inline-size: min(520px, calc(100% - 48px));
  pointer-events: none;
  text-align: center;
  opacity: 1;
  filter: blur(0);
  transition:
    opacity .42s ease,
    transform .52s cubic-bezier(.2,.8,.2,1),
    filter .52s ease;
}
.souqy-hero.is-exiting {
  opacity: 0;
  transform: translateX(-50%) translateY(-48px) scale(.88);
  filter: blur(12px);
}
.souqy-hero-logo {
  margin: 0 auto 18px;
  pointer-events: none;
}
.souqy-hero-logo.souqy-logo::before {
  inset: -4px;
}
.souqy-hero-logo.souqy-logo::after {
  inset: -22px;
  opacity: .36;
}
.souqy-hero-logo .souqy-logo-core {
  border-color: rgba(255,241,184,.32);
  box-shadow:
    inset 0 0 0 1px rgba(255,245,198,.13),
    inset 0 0 24px rgba(0,0,0,.72),
    0 22px 70px rgba(0,0,0,.38);
}
.souqy-hero h1 {
  margin: 0;
  max-inline-size: none;
  font-family: var(--souqy-font);
  font-size: clamp(28px, 3.4vw, 40px);
  line-height: 1.05;
  font-weight: 700;
  color: rgba(255,255,255,.94);
}
.souqy-hero span {
  display: block;
  max-inline-size: none;
  margin-block-start: 8px;
  color: rgba(255,255,255,.56);
  font-size: 15px;
  line-height: 1.35;
}
.souqy-hero p {
  display: none;
}
.souqy-workspace-panel {
  position: absolute;
  z-index: 13;
  inset-block: clamp(32px, 6vh, 70px) 32px;
  inset-inline: 50% auto;
  transform: translateX(-50%);
  inline-size: min(1040px, calc(100% - 72px));
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
  overflow: hidden;
}
.souqy-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.souqy-panel-heading div {
  min-inline-size: 0;
}
.souqy-panel-heading span,
.souqy-edit-shelf span {
  color: var(--souqy-gold);
  font-size: 10px;
  font-weight: 760;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.souqy-panel-heading h2 {
  margin: 4px 0 0;
  color: rgba(255,255,255,.94);
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1;
}
.souqy-panel-heading button,
.souqy-panel-heading a,
.souqy-project-start button,
.souqy-history-actions a,
.souqy-history-actions button,
.souqy-generated-actions a,
.souqy-generated-actions button {
  min-block-size: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  background: rgba(255,255,255,.065);
  color: rgba(248,250,253,.88);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
.souqy-panel-heading button:hover,
.souqy-panel-heading a:hover,
.souqy-project-start button:hover,
.souqy-history-actions a:hover,
.souqy-history-actions button:hover,
.souqy-generated-actions a:hover,
.souqy-generated-actions button:hover {
  border-color: rgba(255,255,255,.2);
  background: rgba(255,255,255,.1);
}
.souqy-project-start {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 20px;
  background: rgba(10,10,10,.58);
  padding: 10px;
  backdrop-filter: blur(22px) saturate(1.08);
  -webkit-backdrop-filter: blur(22px) saturate(1.08);
}
.souqy-project-start input {
  min-inline-size: 0;
  border: 0;
  border-radius: 14px;
  background: rgba(255,255,255,.055);
  color: var(--souqy-ink);
  outline: none;
  padding: 0 12px;
}
.souqy-project-list,
.souqy-history-grid {
  min-block-size: 0;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 2px 2px 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(244,234,214,.18) transparent;
}
.souqy-project-list article {
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 18px;
  background: rgba(10,10,10,.62);
  backdrop-filter: blur(18px) saturate(1.05);
  -webkit-backdrop-filter: blur(18px) saturate(1.05);
}
.souqy-project-list article.is-active {
  border-color: rgba(201,169,97,.4);
  background: rgba(201,169,97,.08);
}
.souqy-project-list article > button {
  inline-size: 100%;
  min-block-size: 74px;
  border: 0;
  background: transparent;
  color: inherit;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px;
  text-align: start;
  cursor: pointer;
}
.souqy-project-list i,
.souqy-project-list article > button > span {
  inline-size: 54px;
  block-size: 54px;
  border-radius: 14px;
  background: center/cover rgba(255,255,255,.06);
}
.souqy-project-list article > button > span {
  display: grid;
  place-items: center;
  color: var(--souqy-gold);
}
.souqy-project-list strong,
.souqy-history-card strong {
  display: block;
  min-inline-size: 0;
  overflow: hidden;
  color: rgba(255,255,255,.92);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-project-list small,
.souqy-project-list em,
.souqy-history-card small,
.souqy-edit-shelf p {
  color: rgba(232,238,247,.52);
  font-size: 12px;
  font-style: normal;
}
.souqy-history-grid {
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
}
.souqy-history-card {
  min-inline-size: 0;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 20px;
  background: rgba(10,10,10,.62);
  box-shadow: inset 0 1px rgba(255,255,255,.04);
}
.souqy-history-preview {
  display: grid;
  place-items: center;
  aspect-ratio: var(--souqy-preview-aspect, 1 / 1);
  max-block-size: 290px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 0%, rgba(244,234,214,.1), transparent 36%), #050505;
}
.souqy-history-preview img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
}
.souqy-history-card > div:not(.souqy-history-actions) {
  display: grid;
  gap: 3px;
  padding: 11px 12px 8px;
}
.souqy-history-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  padding: 0 10px 10px;
}
.souqy-empty-state {
  margin: 0;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 18px;
  background: rgba(10,10,10,.52);
  color: rgba(232,238,247,.62);
  padding: 18px;
}
.souqy-edit-shelf {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 22px;
  background: rgba(10,10,10,.58);
  padding: 14px;
  backdrop-filter: blur(22px) saturate(1.08);
  -webkit-backdrop-filter: blur(22px) saturate(1.08);
}
.souqy-edit-shelf strong {
  display: block;
  margin-block-start: 4px;
  color: rgba(255,255,255,.92);
  font-size: 18px;
}
.souqy-edit-shelf p {
  margin: 5px 0 0;
}
.souqy-edit-picks {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 54px;
  gap: 8px;
  overflow-x: auto;
  max-inline-size: 260px;
}
.souqy-edit-picks button {
  inline-size: 54px;
  block-size: 54px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 14px;
  background: rgba(255,255,255,.055);
  padding: 0;
  cursor: pointer;
}
.souqy-edit-picks img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}
.souqy-web-panel {
  inline-size: min(1180px, calc(100% - 72px));
  grid-template-rows: auto minmax(0, 1fr);
}
.souqy-web-heading {
  align-items: end;
}
.souqy-web-heading p {
  margin: 6px 0 0;
  max-inline-size: 540px;
  color: rgba(232,238,247,.58);
  font-size: 13px;
  line-height: 1.45;
}
.souqy-web-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-inline-size: 0;
}
.souqy-web-actions button:disabled {
  opacity: .52;
  cursor: default;
}
.souqy-web-select {
  min-block-size: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  background: rgba(255,255,255,.055);
  color: rgba(232,238,247,.62);
  padding: 0 10px;
}
.souqy-web-select span {
  color: rgba(232,238,247,.48);
  font-size: 10px;
  font-weight: 760;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.souqy-web-select select {
  max-inline-size: 190px;
  border: 0;
  background: transparent;
  color: rgba(248,250,253,.9);
  outline: none;
  font-size: 12px;
  font-weight: 700;
}
.souqy-web-select option {
  background: #111;
  color: #f7f7f7;
}
.souqy-web-browser {
  position: relative;
  min-block-size: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 28px;
  background:
    radial-gradient(circle at 18% 0%, rgba(244,234,214,.12), transparent 34%),
    rgba(6,6,6,.78);
  box-shadow:
    0 26px 90px rgba(0,0,0,.4),
    inset 0 1px rgba(255,255,255,.055);
  backdrop-filter: blur(18px) saturate(1.05);
  -webkit-backdrop-filter: blur(18px) saturate(1.05);
}
.souqy-web-browser-bar {
  min-block-size: 42px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-block-end: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.025));
  padding: 0 14px;
}
.souqy-web-browser-bar > span {
  inline-size: 9px;
  block-size: 9px;
  border-radius: 999px;
  background: rgba(244,234,214,.3);
}
.souqy-web-browser-bar > span:nth-child(1) {
  background: #ff6b5e;
}
.souqy-web-browser-bar > span:nth-child(2) {
  background: #f5d35e;
}
.souqy-web-browser-bar > span:nth-child(3) {
  background: #65d889;
}
.souqy-web-browser-bar strong {
  min-inline-size: 0;
  margin-inline-start: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 999px;
  background: rgba(0,0,0,.24);
  color: rgba(232,238,247,.64);
  padding: 5px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-web-iframe {
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 420px;
  border: 0;
  background: #fff;
}
.souqy-chat-thread {
  position: absolute;
  z-index: 12;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: clamp(44px, 8vh, 82px) clamp(18px, 6vw, 72px) 198px;
  opacity: 0;
  pointer-events: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(244,234,214,.18) transparent;
  transition: opacity .28s ease;
}
.has-chat .souqy-chat-thread {
  opacity: 1;
  pointer-events: auto;
}
.is-tab-edit .souqy-chat-thread,
.is-tab-chat .souqy-chat-thread {
  opacity: 1;
  pointer-events: auto;
}
.souqy-chat-thread::-webkit-scrollbar {
  inline-size: 8px;
}
.souqy-chat-thread::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(244,234,214,.18);
}
.souqy-chat-stream {
  inline-size: min(880px, 100%);
  margin-inline: auto;
  display: grid;
  gap: 18px;
}
.souqy-chat-message {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  animation: souqyMessageIn .32s cubic-bezier(.2,.8,.2,1);
}
.souqy-chat-message.is-user {
  grid-template-columns: minmax(0, 1fr);
  justify-items: end;
}
.souqy-chat-avatar {
  display: grid;
  place-items: center;
  inline-size: 34px;
  block-size: 34px;
  border: 1px solid rgba(201,169,97,.28);
  border-radius: 999px;
  background: rgba(0,0,0,.48);
  box-shadow: inset 0 1px rgba(255,255,255,.06), 0 16px 40px rgba(0,0,0,.24);
}
.souqy-chat-logo {
  inline-size: 26px;
  block-size: 26px;
}
.souqy-chat-bubble {
  min-inline-size: 0;
  max-inline-size: min(720px, 100%);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 22px;
  background: rgba(13,14,16,.7);
  box-shadow: 0 20px 70px rgba(0,0,0,.34), inset 0 1px rgba(255,255,255,.045);
  padding: 14px;
  backdrop-filter: blur(22px) saturate(1.08);
  -webkit-backdrop-filter: blur(22px) saturate(1.08);
}
.souqy-chat-message.is-user .souqy-chat-bubble {
  max-inline-size: min(660px, 92%);
  border-color: rgba(244,234,214,.14);
  background: linear-gradient(180deg, rgba(244,234,214,.13), rgba(244,234,214,.07));
}
.souqy-message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-block-end: 8px;
}
.souqy-message-meta strong {
  color: rgba(255,255,255,.9);
  font-size: 12px;
  font-weight: 750;
}
.souqy-message-meta span {
  min-inline-size: 0;
  overflow: hidden;
  color: rgba(232,238,247,.46);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-chat-bubble > p {
  margin: 0;
  color: rgba(248,250,253,.86);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
}
.souqy-message-progress {
  position: relative;
  margin-block-start: 12px;
  min-block-size: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 999px;
  background: rgba(255,255,255,.04);
  padding: 6px 10px;
}
.souqy-message-assets {
  margin-block-start: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.souqy-generated-card {
  min-inline-size: 0;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.11);
  border-radius: 18px;
  background: rgba(0,0,0,.32);
  box-shadow: inset 0 1px rgba(255,255,255,.04);
}
.souqy-generated-preview {
  display: grid;
  place-items: center;
  aspect-ratio: var(--souqy-preview-aspect, 1 / 1);
  max-block-size: 360px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 0%, rgba(244,234,214,.1), transparent 36%), #050505;
}
.souqy-generated-preview img {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
}
.souqy-generated-meta {
  display: grid;
  gap: 3px;
  padding: 10px 12px 8px;
}
.souqy-generated-meta strong {
  min-inline-size: 0;
  overflow: hidden;
  color: rgba(255,255,255,.92);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-generated-meta small {
  color: rgba(232,238,247,.5);
  font-size: 11px;
}
.souqy-generated-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0 10px 10px;
}
.souqy-generated-actions a,
.souqy-generated-actions button {
  min-block-size: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  background: rgba(255,255,255,.065);
  color: rgba(248,250,253,.88);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
.souqy-generated-actions a:hover,
.souqy-generated-actions button:hover {
  border-color: rgba(255,255,255,.2);
  background: rgba(255,255,255,.1);
}
.souqy-output-view {
  position: absolute;
  z-index: 14;
  --souqy-output-aspect: 1 / 1;
  --souqy-output-ratio: 1;
  --souqy-output-max-block: min(64dvh, calc(100dvh - 320px));
  inset-block-start: clamp(54px, 8vh, 82px);
  inset-inline-start: 50%;
  transform: translateX(-50%);
  inline-size: min(1080px, calc(100% - 118px));
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 10px;
  pointer-events: auto;
}
.souqy-output-frame {
  min-block-size: 260px;
  inline-size: min(100%, calc(var(--souqy-output-max-block) * var(--souqy-output-ratio)));
  aspect-ratio: var(--souqy-output-aspect);
  max-block-size: var(--souqy-output-max-block);
  margin-inline: auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 0%, rgba(244,234,214,.08), transparent 34%),
    linear-gradient(145deg, rgba(255,255,255,.04), rgba(255,255,255,.01)),
    rgba(8,8,7,.82);
  box-shadow: 0 30px 110px rgba(0,0,0,.58), inset 0 1px rgba(255,255,255,.05);
  backdrop-filter: blur(26px) saturate(1.08);
  -webkit-backdrop-filter: blur(26px) saturate(1.08);
}
.souqy-output-frame img {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: contain;
}
.souqy-output-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid rgba(255,255,255,.11);
  border-radius: 16px;
  background: rgba(11,11,10,.82);
  box-shadow: 0 18px 60px rgba(0,0,0,.4), inset 0 1px rgba(255,255,255,.04);
  padding: 12px;
}
.souqy-output-meta > div:first-child {
  min-inline-size: 0;
  display: grid;
  gap: 3px;
}
.souqy-output-meta span,
.souqy-output-meta small {
  color: var(--souqy-muted);
  font-size: 11px;
}
.souqy-output-meta > div:first-child > span {
  color: rgba(235,241,248,.76);
  text-transform: uppercase;
  letter-spacing: .08em;
}
.souqy-output-meta strong {
  min-inline-size: 0;
  overflow: hidden;
  color: var(--souqy-ink);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-output-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}
.souqy-output-actions button,
.souqy-output-actions a {
  min-block-size: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  color: var(--souqy-ink);
  padding: 0 13px;
  text-decoration: none;
  cursor: pointer;
}
.souqy-output-actions .souqy-output-download {
  background: linear-gradient(135deg, rgba(255,255,255,.94), rgba(174,185,198,.9));
  color: #050607;
  font-weight: 750;
}
.souqy-output-actions a:hover {
  background: rgba(255,255,255,.11);
}
.souqy-output-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.souqy-output-list::-webkit-scrollbar {
  display: none;
}
.souqy-output-list button {
  flex: 0 0 56px;
  inline-size: 56px;
  block-size: 56px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  background: rgba(255,255,255,.045);
  padding: 0;
  cursor: pointer;
}
.souqy-output-list button.is-selected {
  border-color: rgba(201,169,97,.86);
  box-shadow: 0 0 0 2px rgba(201,169,97,.16);
}
.souqy-output-list img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}
.has-output-references .souqy-reference-gallery {
  grid-auto-columns: minmax(92px, 112px);
  gap: 8px;
  justify-content: center;
  max-inline-size: min(520px, 100%);
  margin-inline: auto;
}
.has-output-references .souqy-reference-gallery article {
  border-radius: 14px;
}
.has-output-references .souqy-reference-gallery img {
  aspect-ratio: 1 / 1;
}
.has-output-references .souqy-reference-gallery div {
  grid-template-columns: minmax(0, 1fr) 24px;
  padding: 6px;
}
.has-output-references .souqy-reference-gallery span {
  font-size: 10px;
}
.has-output-references .souqy-reference-gallery button {
  inline-size: 24px;
  block-size: 24px;
}
.souqy-canvas-stage {
  position: absolute;
  inset: 0;
  z-index: 6;
}
.has-output .souqy-canvas-stage {
  display: none;
}
.souqy-work-card {
  position: absolute;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(244,234,214,.18);
  background: var(--souqy-panel-strong);
  box-shadow: 0 30px 80px rgba(0,0,0,.42), 0 0 0 1px rgba(255,255,255,.025);
  cursor: grab;
}
.souqy-work-card.is-selected {
  outline: 1px solid var(--souqy-gold);
  box-shadow: 0 34px 90px rgba(0,0,0,.55), 0 0 38px rgba(201,169,97,.16);
}
.souqy-work-card img {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  pointer-events: none;
}
.souqy-work-card span {
  position: absolute;
  inset-inline: 8px;
  inset-block-end: 8px;
  border: 1px solid rgba(244,234,214,.12);
  border-radius: 999px;
  padding: 5px 8px;
  background: rgba(0,0,0,.58);
  color: rgba(244,234,214,.9);
  font-size: 10px;
  text-align: center;
  text-transform: capitalize;
  backdrop-filter: blur(10px);
}
.souqy-empty-wall {
  display: none;
}
.souqy-empty-wall div {
  aspect-ratio: 3 / 4;
  border: 1px solid rgba(244,234,214,.12);
  border-radius: 8px;
  background:
    linear-gradient(145deg, rgba(244,234,214,.08), transparent),
    rgba(0,0,0,.2);
  padding: 12px;
  color: var(--souqy-faint);
}
.souqy-empty-wall span {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.souqy-empty-wall strong {
  display: block;
  margin-block-start: 58px;
  color: rgba(201,169,97,.72);
  font-family: var(--souqy-display);
  font-size: 34px;
  font-weight: 400;
}
.souqy-command-deck {
  position: absolute;
  z-index: 30;
  inset-inline-start: 50%;
  inset-block-end: 22px;
  transform: translateX(-50%);
  inline-size: min(820px, calc(100% - 112px));
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}
[dir='rtl'] .souqy-command-deck {
  inset-inline-start: auto;
  inset-inline-end: 50%;
  transform: translateX(50%);
}
.souqy-command-head,
.souqy-command-foot,
.souqy-context-head,
.souqy-panel-title,
.souqy-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.souqy-command-head {
  display: none;
}
.souqy-command-head strong {
  display: none;
}
.souqy-command-head small {
  color: var(--souqy-muted);
  font-size: 11px;
  font-weight: 700;
}
.souqy-quick-prompts {
  display: none;
}
.souqy-quick-prompts::-webkit-scrollbar {
  display: none;
}
.souqy-quick-prompts button {
  flex: 0 0 auto;
  max-inline-size: 240px;
  border: 1px solid var(--souqy-line);
  border-radius: 999px;
  background: rgba(255,255,255,.055);
  color: var(--souqy-muted);
  padding: 7px 10px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.souqy-quick-prompts button:hover {
  color: var(--souqy-ink);
  border-color: rgba(216,226,238,.22);
}
.souqy-command-controls {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 7px;
  min-inline-size: 0;
}
.souqy-selector {
  position: relative;
  min-inline-size: 0;
}
.souqy-selector-compact {
  flex: 0 0 auto;
}
.souqy-composer .souqy-selector-trigger {
  position: relative;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-block-size: 36px;
  min-inline-size: 118px;
  max-inline-size: 156px;
  border: 1px solid rgba(255,255,255,.11);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.035));
  padding: 0 12px;
  overflow: hidden;
  color: var(--souqy-ink);
  box-shadow: inset 0 1px rgba(255,255,255,.06);
  transition:
    transform .18s cubic-bezier(.2,.8,.2,1),
    border-color .18s ease,
    background .18s ease,
    color .18s ease;
}
.souqy-composer .souqy-selector-trigger-icon {
  inline-size: 38px;
  min-inline-size: 38px;
  max-inline-size: 38px;
  padding: 0;
}
.souqy-composer .souqy-selector-trigger[aria-expanded='true'],
.souqy-composer .souqy-selector-trigger:hover {
  background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.055));
  border-color: rgba(225,235,247,.26);
  transform: translateY(-1px);
}
.souqy-composer .souqy-selector-trigger strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 650;
}
.souqy-composer .souqy-selector-trigger svg {
  flex: 0 0 auto;
}
.souqy-composer .souqy-selector-trigger svg:last-child {
  color: rgba(235,241,248,.7);
  opacity: .88;
}
.souqy-selector-menu {
  position: absolute;
  z-index: 60;
  inset-inline-start: 0;
  inset-block-end: calc(100% + 10px);
  inline-size: 222px;
  max-block-size: min(380px, 56vh);
  overflow: auto;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(16,17,19,.98), rgba(7,8,10,.96));
  box-shadow: 0 28px 70px rgba(0,0,0,.58), inset 0 1px rgba(255,255,255,.06);
  padding: 7px;
  backdrop-filter: blur(24px) saturate(1.08);
  -webkit-backdrop-filter: blur(24px) saturate(1.08);
  animation: souqyDropdownIn .18s cubic-bezier(.2,.8,.2,1);
  transform-origin: bottom left;
  scrollbar-width: thin;
  scrollbar-color: rgba(218,228,240,.22) transparent;
}
[dir='rtl'] .souqy-selector-menu {
  inset-inline-start: auto;
  inset-inline-end: 0;
  transform-origin: bottom right;
}
.souqy-selector-menu-format {
  inline-size: 236px;
}
.souqy-model-selector {
  flex: 0 1 176px;
}
.souqy-composer .souqy-model-trigger {
  min-inline-size: 148px;
  max-inline-size: 196px;
}
.souqy-composer .souqy-model-trigger > span {
  min-inline-size: 22px;
  border: 1px solid rgba(244,234,214,.18);
  border-radius: 999px;
  color: rgba(244,234,214,.86);
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 800;
}
.souqy-model-menu {
  inline-size: min(430px, calc(100vw - 40px));
  max-block-size: min(560px, calc(100dvh - 190px));
}
.souqy-composer .souqy-model-menu button {
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: start;
  min-block-size: 78px;
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 14px;
  margin-block-end: 6px;
  background: rgba(255,255,255,.035);
}
.souqy-composer .souqy-model-menu button:disabled {
  cursor: not-allowed;
  opacity: .48;
}
.souqy-composer .souqy-model-menu button.is-selected {
  border-color: rgba(244,234,214,.28);
}
.souqy-model-copy {
  display: grid !important;
  gap: 3px;
  white-space: normal !important;
}
.souqy-model-copy strong {
  color: rgba(248,250,253,.94);
  font-size: 12px;
  line-height: 1.2;
}
.souqy-composer .souqy-model-copy small {
  color: rgba(228,236,246,.52);
  font-size: 10px;
  line-height: 1.28;
  white-space: normal;
}
.souqy-model-menu em {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid rgba(244,234,214,.16);
  border-radius: 999px;
  color: rgba(244,234,214,.88);
  padding: 4px 7px;
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
}
.souqy-settings-menu {
  inline-size: min(370px, calc(100vw - 40px));
  max-block-size: min(560px, calc(100dvh - 190px));
  display: grid;
  gap: 10px;
  padding: 10px;
}
.souqy-settings-selector .souqy-settings-menu {
  inset-inline-start: auto;
  inset-inline-end: 0;
}
.souqy-settings-menu .souqy-field,
.souqy-settings-menu .souqy-slider {
  display: grid;
  gap: 6px;
}
.souqy-settings-menu .souqy-field > span,
.souqy-settings-menu .souqy-slider > span,
.souqy-settings-menu .souqy-toggle-row > span,
.souqy-settings-menu .souqy-product-picker > span {
  color: rgba(232,238,247,.68);
  font-size: 11px;
  font-weight: 750;
}
.souqy-settings-menu select,
.souqy-settings-menu textarea {
  inline-size: 100%;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  background: rgba(255,255,255,.055);
  color: rgba(248,250,253,.9);
  padding: 9px 10px;
  outline: none;
}
.souqy-settings-menu textarea {
  min-block-size: 74px;
  resize: vertical;
}
.souqy-settings-menu .souqy-toggle-row {
  min-block-size: 38px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  background: rgba(255,255,255,.04);
  padding: 0 10px;
}
.souqy-settings-menu .souqy-slider input {
  inline-size: 100%;
}
.souqy-settings-menu .souqy-product-picker {
  display: grid;
  gap: 7px;
}
.souqy-settings-menu .souqy-product-picker button {
  display: grid !important;
  grid-template-columns: 30px minmax(0, 1fr) auto !important;
  gap: 8px !important;
  inline-size: 100% !important;
  min-block-size: 42px !important;
  border: 1px solid rgba(255,255,255,.08) !important;
  border-radius: 12px !important;
  background: rgba(255,255,255,.04) !important;
  color: rgba(248,250,253,.86) !important;
  padding: 6px 8px !important;
  text-align: start !important;
}
.souqy-settings-menu .souqy-product-picker button.is-active {
  border-color: rgba(244,234,214,.28) !important;
  background: rgba(244,234,214,.1) !important;
}
.souqy-settings-menu .souqy-product-picker i {
  inline-size: 30px;
  block-size: 30px;
  border-radius: 8px;
  background-position: center;
  background-size: cover;
}
.souqy-settings-menu .souqy-product-picker button > span {
  min-inline-size: 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-settings-menu .souqy-product-picker button > small {
  color: rgba(232,238,247,.48);
  font-size: 10px;
  white-space: nowrap;
}
.souqy-settings-menu .souqy-product-picker p {
  margin: 0;
  color: rgba(232,238,247,.48);
  font-size: 12px;
}
.souqy-selector-title {
  display: block;
  padding: 7px 8px 8px;
  color: rgba(228,236,246,.68);
  font-size: 11px;
  font-weight: 750;
}
.souqy-composer .souqy-selector-menu button {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  inline-size: 100%;
  block-size: auto;
  min-block-size: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(228,236,246,.8);
  padding: 7px 8px;
  text-align: start;
  cursor: pointer;
}
.souqy-composer .souqy-selector-menu button:hover,
.souqy-composer .souqy-selector-menu button.is-selected {
  background: rgba(255,255,255,.085);
  color: var(--souqy-ink);
}
.souqy-composer .souqy-selector-menu button svg {
  color: rgba(228,236,246,.68);
}
.souqy-composer .souqy-selector-menu button span {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 650;
}
.souqy-composer .souqy-selector-menu button small {
  color: rgba(228,236,246,.42);
  font-size: 10px;
  white-space: nowrap;
}
.souqy-composer .souqy-selector-menu button i {
  position: absolute;
  inset-inline-end: 8px;
  inline-size: 4px;
  block-size: 4px;
  border-radius: 999px;
  background: rgba(238,244,252,.86);
  box-shadow: 0 0 10px rgba(210,224,240,.48);
}
.souqy-composer-metal {
  display: block !important;
  inline-size: 100%;
  border-radius: 30px;
}
.souqy-composer-metal-host {
  inline-size: 100%;
  border-radius: 30px;
}
.souqy-composer {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
  border: 1px solid rgba(255,255,255,.105);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(30,32,35,.92), rgba(16,17,19,.94)),
    rgba(18,19,21,.94);
  box-shadow:
    0 26px 84px rgba(0,0,0,.5),
    inset 0 1px rgba(255,255,255,.065),
    inset 0 -1px rgba(255,255,255,.025);
  padding: 12px;
  backdrop-filter: blur(28px) saturate(1.1);
  -webkit-backdrop-filter: blur(28px) saturate(1.1);
  transition:
    border-color .24s ease,
    box-shadow .24s ease,
    background .24s ease,
    transform .24s cubic-bezier(.2,.8,.2,1);
  animation: souqyComposerBreath 7s ease-in-out infinite;
}
.souqy-composer:focus-within {
  border-color: rgba(230,238,248,.22);
  background:
    linear-gradient(180deg, rgba(35,38,42,.95), rgba(18,20,23,.96)),
    rgba(18,19,21,.96);
  box-shadow:
    0 30px 92px rgba(0,0,0,.55),
    0 0 28px rgba(158,177,201,.08),
    inset 0 1px rgba(255,255,255,.075),
    inset 0 -1px rgba(255,255,255,.03);
  transform: translateY(-1px);
}
.souqy-composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-inline-size: 0;
}
.souqy-web-prompt-dock {
  position: absolute;
  z-index: 4;
  inset-inline: clamp(14px, 8vw, 128px);
  inset-block-end: 18px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}
.souqy-web-command-head {
  display: flex;
  margin-block-end: 8px;
  padding-inline: 8px;
  text-shadow: 0 1px 14px rgba(0,0,0,.6);
}
.souqy-web-command-head strong {
  display: block;
  color: rgba(248,250,253,.92);
  font-size: 13px;
  font-weight: 500;
}
.souqy-web-command-head small {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 999px;
  background: rgba(0,0,0,.34);
  color: rgba(232,238,247,.62);
  padding: 4px 8px;
}
.souqy-web-composer {
  gap: 7px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(28,30,33,.94), rgba(12,13,15,.96)),
    rgba(12,13,15,.96);
  box-shadow:
    0 18px 60px rgba(0,0,0,.48),
    0 0 0 1px rgba(255,255,255,.03),
    inset 0 1px rgba(255,255,255,.075);
}
.souqy-web-composer textarea {
  min-block-size: 38px;
}
.souqy-web-prompt-status {
  flex: 1 1 auto;
  min-inline-size: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(232,238,247,.55);
  font-size: 11px;
  line-height: 1.2;
}
.souqy-web-prompt-status > span:last-child {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-composer-status {
  position: relative;
  min-block-size: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  border-radius: 999px;
  color: rgba(232,238,247,.54);
  padding: 0 8px 1px;
  font-size: 11px;
  line-height: 1.2;
}
.souqy-composer-status > span:not(.souqy-status-dot):not(.souqy-status-percent) {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-composer-status.is-generating {
  border: 1px solid rgba(255,255,255,.06);
  background: rgba(255,255,255,.035);
  color: rgba(242,247,255,.8);
  padding-block: 4px;
}
.souqy-status-loader {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
}
.souqy-composer-status [class*='bg-primary'] {
  background-color: rgba(238,244,252,.84) !important;
}
.souqy-composer-status [class*='border-primary'] {
  border-color: rgba(238,244,252,.84) !important;
}
.souqy-status-shimmer {
  --foreground: rgba(255,255,255,.94);
  --muted-foreground: rgba(176,188,205,.48);
  position: relative;
  z-index: 1;
  min-inline-size: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.souqy-status-percent {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  color: rgba(245,248,252,.88);
  font-variant-numeric: tabular-nums;
  font-weight: 750;
}
.souqy-status-progress {
  position: absolute;
  inset-block: auto 0;
  inset-inline-start: 0;
  block-size: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255,255,255,.2), rgba(255,255,255,.92));
  box-shadow: 0 0 14px rgba(218,230,246,.3);
  transition: inline-size .5s cubic-bezier(.2,.8,.2,1);
}
.souqy-status-dot {
  flex: 0 0 5px;
  inline-size: 5px;
  block-size: 5px;
  border-radius: 999px;
  background: rgba(230,238,248,.54);
  box-shadow: 0 0 10px rgba(230,238,248,.24);
}
.souqy-composer-actions {
  flex: 1 1 auto;
  min-inline-size: 0;
}
.souqy-composer button {
  inline-size: 38px;
  block-size: 38px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.035));
  color: rgba(242,246,251,.9);
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: inset 0 1px rgba(255,255,255,.07);
  transition:
    transform .18s cubic-bezier(.2,.8,.2,1),
    background .18s ease,
    border-color .18s ease,
    color .18s ease,
    opacity .18s ease;
}
.souqy-composer button:hover {
  border-color: rgba(225,235,247,.22);
  background: linear-gradient(180deg, rgba(255,255,255,.13), rgba(255,255,255,.055));
  transform: translateY(-1px);
}
.souqy-submit-metal {
  display: inline-flex !important;
  border-radius: 999px;
}
.souqy-composer button[type='submit'] {
  border-color: rgba(255,255,255,.2);
  background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(184,197,214,.88));
  color: #050607;
  box-shadow:
    0 12px 32px rgba(0,0,0,.34),
    inset 0 1px rgba(255,255,255,.78);
}
.souqy-composer button[type='submit']:hover {
  background: linear-gradient(135deg, #fff, rgba(207,218,231,.94));
}
.souqy-composer button:disabled {
  cursor: wait;
  opacity: .7;
}
.souqy-composer textarea {
  min-block-size: 44px;
  max-block-size: 108px;
  resize: none;
  border: 0;
  background: transparent;
  color: inherit;
  outline: none;
  padding: 6px 8px 0;
  line-height: 1.45;
  overflow-y: auto;
  scrollbar-width: none;
}
.souqy-composer textarea::placeholder {
  color: rgba(232,238,247,.36);
}
.souqy-composer textarea::-webkit-scrollbar {
  display: none;
}
.souqy-reference-gallery {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(154px, 188px);
  gap: 10px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding-block-end: 2px;
  scrollbar-width: none;
}
.souqy-reference-gallery::-webkit-scrollbar {
  display: none;
}
.souqy-reference-gallery article {
  min-inline-size: 0;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 18px;
  background: rgba(20,20,19,.9);
  box-shadow: 0 18px 50px rgba(0,0,0,.32), inset 0 1px rgba(255,255,255,.045);
}
.souqy-reference-gallery img {
  display: block;
  inline-size: 100%;
  aspect-ratio: 4 / 3;
  object-fit: contain;
  background:
    linear-gradient(135deg, rgba(255,255,255,.035), transparent),
    rgba(0,0,0,.38);
}
.souqy-reference-gallery div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-block-start: 1px solid rgba(255,255,255,.08);
}
.souqy-reference-gallery span {
  min-inline-size: 0;
  overflow: hidden;
  color: rgba(228,236,246,.68);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-reference-gallery button {
  inline-size: 28px;
  block-size: 28px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 999px;
  background: rgba(255,255,255,.055);
  color: rgba(228,236,246,.68);
  cursor: pointer;
}
.souqy-reference-gallery button:hover {
  background: rgba(255,255,255,.1);
  color: var(--souqy-ink);
}
.souqy-command-foot {
  display: block;
  margin-block-start: 7px;
  padding: 0 16px;
  pointer-events: none;
}
.souqy-command-foot p {
  margin: 0;
  color: var(--souqy-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-command-foot > div {
  display: none;
}
.souqy-command-foot button,
.souqy-staged-action,
.souqy-export-row button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--souqy-line);
  border-radius: 8px;
  background: rgba(244,234,214,.055);
  color: var(--souqy-muted);
  min-block-size: 34px;
  padding: 0 10px;
  cursor: pointer;
  font-size: 12px;
}
.souqy-context-head {
  align-items: start;
  margin-block-end: 16px;
}
.souqy-context-head strong {
  display: block;
  font-size: 30px;
  font-weight: 400;
  line-height: 1;
  text-align: end;
}
.souqy-panel-card,
.souqy-cinema-frame,
.souqy-slogan-card,
.souqy-founder-card {
  border: 1px solid var(--souqy-line);
  border-radius: 8px;
  background: rgba(244,234,214,.055);
  padding: 14px;
  margin-block-end: 14px;
}
.souqy-panel-title span,
.souqy-field > span,
.souqy-slider > span,
.souqy-toggle-row > span,
.souqy-product-picker > span,
.souqy-selected-asset > span,
.souqy-memory-list > span {
  color: var(--souqy-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.souqy-panel-title strong {
  font-family: var(--souqy-display);
  font-size: 20px;
  font-weight: 400;
}
.souqy-field,
.souqy-slider,
.souqy-product-picker,
.souqy-selected-asset,
.souqy-memory-list {
  display: grid;
  gap: 8px;
  margin-block-end: 14px;
}
.souqy-field select,
.souqy-field textarea {
  inline-size: 100%;
  border: 1px solid var(--souqy-line);
  border-radius: 8px;
  background: rgba(0,0,0,.18);
  color: inherit;
  padding: 10px;
  outline: none;
}
.souqy-field textarea {
  min-block-size: 82px;
  resize: none;
  line-height: 1.45;
}
.souqy-toggle-row input {
  inline-size: 42px;
  block-size: 22px;
  accent-color: var(--souqy-gold);
}
.souqy-slider input {
  accent-color: var(--souqy-gold);
}
.souqy-slider small {
  color: var(--souqy-gold);
}
.souqy-product-picker button,
.souqy-memory-list a,
.souqy-format-stack button,
.souqy-campaign-list article,
.souqy-flow div {
  display: grid;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--souqy-line);
  border-radius: 8px;
  background: rgba(0,0,0,.16);
  color: inherit;
  text-align: start;
}
.souqy-product-picker button {
  grid-template-columns: 30px minmax(0, 1fr) auto;
  padding: 8px;
  cursor: pointer;
}
.souqy-product-picker button.is-active {
  border-color: rgba(201,169,97,.42);
  background: rgba(201,169,97,.09);
}
.souqy-product-picker i,
.souqy-memory-list i {
  inline-size: 30px;
  block-size: 30px;
  border-radius: 6px;
  background: center/cover;
}
.souqy-product-picker span,
.souqy-memory-list strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.souqy-product-picker small,
.souqy-product-picker p,
.souqy-selected-asset p,
.souqy-memory-list p,
.souqy-cinema-frame p,
.souqy-founder-card p {
  color: var(--souqy-muted);
  font-size: 12px;
  line-height: 1.45;
}
.souqy-selected-asset {
  border-block-start: 1px solid var(--souqy-line);
  padding-block-start: 14px;
}
.souqy-selected-asset img {
  inline-size: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--souqy-line);
}
.souqy-selected-asset a {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--souqy-gold), #d7bd7e);
  color: #080705;
  text-decoration: none;
  padding: 10px;
  font-weight: 700;
}
.souqy-memory-list a {
  grid-template-columns: 30px minmax(0, 1fr);
  padding: 8px;
  text-decoration: none;
}
.souqy-export-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.souqy-export-row button:disabled,
.souqy-format-stack button:disabled,
.souqy-staged-action:disabled {
  opacity: .58;
  cursor: default;
}
.souqy-format-stack {
  display: grid;
  gap: 9px;
  margin-block-end: 14px;
}
.souqy-format-stack button {
  grid-template-columns: 20px 1fr auto;
  min-block-size: 48px;
  padding: 0 12px;
}
.souqy-cinema-frame {
  min-block-size: 220px;
  display: flex;
  flex-direction: column;
  justify-content: end;
  background:
    linear-gradient(180deg, transparent, rgba(0,0,0,.42)),
    repeating-linear-gradient(90deg, rgba(244,234,214,.08) 0 1px, transparent 1px 28px),
    rgba(139,58,58,.08);
}
.souqy-cinema-frame > span {
  align-self: start;
  inline-size: 56px;
  block-size: 3px;
  background: var(--souqy-gold);
  margin-block-end: auto;
}
.souqy-cinema-frame strong,
.souqy-slogan-card p,
.souqy-founder-card strong {
  font-family: var(--souqy-display);
  font-size: 25px;
  font-weight: 400;
}
.souqy-campaign-list,
.souqy-recommendation-list,
.souqy-flow {
  display: grid;
  gap: 10px;
  margin-block-end: 14px;
}
.souqy-campaign-list article {
  padding: 12px;
}
.souqy-campaign-list div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block-start: 9px;
}
.souqy-campaign-list span {
  border: 1px solid var(--souqy-line);
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--souqy-muted);
  font-size: 11px;
}
.souqy-slogan-card small {
  color: var(--souqy-gold);
}
.souqy-slogan-card p {
  margin: 8px 0 0;
  line-height: 1.15;
}
.souqy-intel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-block-end: 14px;
}
.souqy-intel-grid div,
.souqy-recommendation-list article {
  border: 1px solid var(--souqy-line);
  border-radius: 8px;
  background: rgba(244,234,214,.055);
  padding: 12px;
}
.souqy-intel-grid strong {
  display: block;
  color: var(--souqy-gold);
  font-family: var(--souqy-display);
  font-size: 34px;
  font-weight: 400;
}
.souqy-intel-grid span,
.souqy-recommendation-list small {
  color: var(--souqy-muted);
  font-size: 11px;
}
.souqy-recommendation-list strong {
  display: block;
  margin-block-start: 6px;
  line-height: 1.3;
}
.souqy-flow {
  position: relative;
}
.souqy-flow::before {
  content: '';
  position: absolute;
  inset-block: 24px;
  inset-inline-start: 18px;
  inline-size: 1px;
  background: rgba(201,169,97,.35);
}
[dir='rtl'] .souqy-flow::before {
  inset-inline-start: auto;
  inset-inline-end: 18px;
}
.souqy-flow div {
  position: relative;
  z-index: 1;
  grid-template-columns: 28px 1fr;
  min-block-size: 52px;
  padding: 0 12px;
}
.souqy-flow span {
  display: grid;
  place-items: center;
  inline-size: 28px;
  block-size: 28px;
  border-radius: 999px;
  background: var(--souqy-gold);
  color: #080705;
  font-size: 12px;
  font-weight: 800;
}
.souqy-founder-card {
  display: grid;
  gap: 10px;
}
.souqy-founder-card svg {
  color: var(--souqy-gold);
}
.is-founder-mode {
  grid-template-columns: 96px minmax(0, 1fr);
}
.is-founder-mode .souqy-left-rail {
  padding-inline: 10px;
}
.is-founder-mode .souqy-rail-brand div,
.is-founder-mode .souqy-module-nav span,
.is-founder-mode .souqy-module-nav small,
.is-founder-mode .souqy-rail-mini,
.is-founder-mode .souqy-hero span,
.is-founder-mode .souqy-topbar-title,
.is-founder-mode .souqy-founder-toggle span {
  display: none;
}
.is-founder-mode .souqy-module-nav button {
  grid-template-columns: 1fr;
  justify-items: center;
}
.is-founder-mode .souqy-hero {
  opacity: .46;
}
.is-founder-mode .souqy-command-deck {
  inline-size: min(820px, calc(100vw - 160px));
}
@keyframes souqyPulse {
  0%, 100% { transform: translateX(-28%); opacity: .48; }
  50% { transform: translateX(22%); opacity: 1; }
}
@keyframes souqyDropdownIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes souqyMessageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes souqyComposerBreath {
  0%, 100% {
    box-shadow:
      0 26px 84px rgba(0,0,0,.5),
      0 0 0 rgba(158,177,201,0),
      inset 0 1px rgba(255,255,255,.065),
      inset 0 -1px rgba(255,255,255,.025);
  }
  50% {
    box-shadow:
      0 28px 88px rgba(0,0,0,.52),
      0 0 30px rgba(158,177,201,.075),
      inset 0 1px rgba(255,255,255,.075),
      inset 0 -1px rgba(255,255,255,.03);
  }
}
@keyframes wave {
  0%, 100% { transform: scaleY(.42); opacity: .48; }
  50% { transform: scaleY(1); opacity: 1; }
}
@keyframes shimmer {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}
@media (max-width: 1180px) {
  .souqy-workplace {
    grid-template-columns: 1fr;
    overflow: auto;
  }
  .souqy-min-sidebar {
    position: fixed;
    z-index: 90;
    inset-block: auto 12px;
    inset-inline: 12px;
    block-size: 70px;
    margin: 0;
    padding: 7px;
    border-radius: 22px;
    grid-template-rows: 1fr;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px;
  }
  [dir='rtl'] .souqy-min-sidebar {
    margin: 0;
  }
  .souqy-sidebar-brand {
    inline-size: 54px;
    block-size: 54px;
  }
  .souqy-sidebar-items {
    grid-auto-flow: column;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-content: stretch;
    gap: 6px;
  }
  .souqy-sidebar-items button {
    min-block-size: 54px;
    block-size: 54px;
    padding: 5px 2px;
  }
  .souqy-sidebar-items span {
    max-inline-size: 100%;
    font-size: 9px;
  }
  .souqy-left-rail {
    position: fixed;
    z-index: 80;
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: min(286px, 86vw);
    align-items: center;
    transform: translateX(-105%);
    transition: transform .24s ease;
  }
  [dir='rtl'] .souqy-left-rail {
    inset-inline-start: auto;
    inset-inline-end: 0;
    transform: translateX(105%);
  }
  .souqy-workplace.is-rail-open .souqy-left-rail {
    transform: translateX(0);
    align-items: stretch;
  }
  .souqy-workplace.is-rail-open .souqy-module-nav {
    justify-items: stretch;
  }
  .souqy-workplace.is-rail-open .souqy-module-nav button {
    inline-size: 100%;
    grid-template-columns: 22px minmax(0, 1fr);
    justify-items: start;
    gap: 10px;
    padding: 0 12px;
    color: rgba(244,234,214,.84);
  }
  .souqy-workplace.is-rail-open .souqy-module-nav button:hover,
  .souqy-workplace.is-rail-open .souqy-module-nav button.is-active {
    color: #050505;
  }
  .souqy-workplace.is-rail-open .souqy-module-nav span {
    position: static;
    inline-size: auto;
    block-size: auto;
    overflow: hidden;
    clip: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-inline-size: 0;
    white-space: nowrap;
  }
  .souqy-workplace.is-rail-open .souqy-module-nav span strong {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 13px;
    font-weight: 700;
  }
  .souqy-workplace.is-rail-open .souqy-module-nav span small {
    display: inline-flex;
    border: 1px solid rgba(244,234,214,.12);
    border-radius: 999px;
    padding: 2px 6px;
    color: rgba(244,234,214,.45);
    font-size: 9px;
    text-transform: uppercase;
  }
  .souqy-workplace.is-rail-open .souqy-rail-expand {
    inline-size: 100%;
    justify-content: flex-start;
    padding-inline: 12px;
  }
  .souqy-workplace.is-rail-open .souqy-rail-expand span {
    display: inline;
  }
  .souqy-rail-scrim {
    position: fixed;
    inset: 0;
    z-index: 70;
    border: 0;
    background: rgba(0,0,0,.54);
  }
  .souqy-main {
    min-block-size: 100dvh;
  }
  .souqy-mobile-menu {
    display: inline-flex;
  }
  .souqy-command-deck {
    inline-size: min(760px, calc(100vw - 44px));
    inset-block-end: 96px;
  }
  .souqy-context-panel {
    display: none;
  }
  .souqy-hero {
    inset-inline: 50% auto;
    max-inline-size: min(520px, calc(100% - 48px));
    transform: translateX(-50%);
  }
  .is-founder-mode {
    grid-template-columns: 1fr;
  }
  .is-founder-mode .souqy-left-rail {
    transform: translateX(-105%);
  }
}
@media (max-width: 760px) {
  .souqy-topbar {
    display: flex;
    inset-inline: 12px;
    inset-block-start: 12px;
    align-items: stretch;
    justify-content: space-between;
    gap: 8px;
  }
  .souqy-topbar-title {
    display: none;
  }
  .souqy-founder-toggle,
  .souqy-mobile-menu {
    min-inline-size: 48px;
    justify-content: center;
  }
  .souqy-founder-toggle span {
    display: none;
  }
  .souqy-hero {
    inset-block-start: 136px;
    inset-inline: 50% auto;
    inline-size: calc(100% - 36px);
    max-inline-size: 420px;
    transform: translateX(-50%);
  }
  .souqy-hero h1 {
    font-size: clamp(28px, 9vw, 40px);
  }
  .souqy-chat-thread {
    padding: 92px 12px 250px;
  }
  .souqy-chat-stream {
    gap: 14px;
  }
  .souqy-chat-message {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 8px;
  }
  .souqy-chat-message.is-user .souqy-chat-bubble {
    max-inline-size: 94%;
  }
  .souqy-chat-bubble {
    border-radius: 18px;
    padding: 12px;
  }
  .souqy-message-assets {
    grid-template-columns: 1fr;
  }
  .souqy-output-view {
    --souqy-output-max-block: min(48dvh, calc(100dvh - 380px));
    inset-block-start: 72px;
    inline-size: calc(100% - 20px);
    gap: 8px;
  }
  .souqy-output-frame {
    min-block-size: 160px;
    border-radius: 18px;
  }
  .souqy-output-meta {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
    border-radius: 14px;
    padding: 10px;
  }
  .souqy-output-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .souqy-output-actions button,
  .souqy-output-actions a {
    padding-inline: 10px;
  }
  .souqy-output-list button {
    flex-basis: 50px;
    inline-size: 50px;
    block-size: 50px;
  }
  .has-output-references .souqy-reference-gallery {
    grid-auto-columns: minmax(76px, 88px);
    justify-content: start;
  }
  .souqy-empty-wall {
    display: none;
  }
  .souqy-command-deck {
    inset-inline: 10px;
    inset-block-end: 92px;
    transform: none;
    inline-size: auto;
  }
  [dir='rtl'] .souqy-command-deck {
    inset-inline: 10px;
    transform: none;
  }
  .souqy-command-head strong {
    font-size: 18px;
  }
  .souqy-command-controls {
    flex: 1 1 auto;
    gap: 6px;
    overflow: visible;
  }
  .souqy-workspace-panel {
    inset-block: 74px 92px;
    inline-size: calc(100% - 22px);
  }
  .souqy-web-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .souqy-web-actions {
    justify-content: stretch;
    flex-wrap: wrap;
  }
  .souqy-web-actions > *,
  .souqy-web-actions button,
  .souqy-web-actions a {
    flex: 1 1 132px;
  }
  .souqy-web-select {
    justify-content: space-between;
  }
  .souqy-web-select select {
    max-inline-size: 100%;
  }
  .souqy-web-browser {
    border-radius: 20px;
  }
  .souqy-web-browser-bar strong {
    font-size: 10px;
  }
  .souqy-web-iframe {
    min-block-size: 320px;
  }
  .souqy-web-prompt-dock {
    inset-inline: 10px;
    inset-block-end: 10px;
  }
  .souqy-web-command-head {
    display: none;
  }
  .souqy-web-composer {
    border-radius: 22px;
    padding: 9px;
  }
  .souqy-web-composer textarea {
    min-block-size: 46px;
  }
  .souqy-web-prompt-status > span:last-child {
    max-inline-size: calc(100vw - 114px);
  }
  .souqy-panel-heading h2 {
    font-size: 28px;
  }
  .souqy-project-start {
    grid-template-columns: minmax(0, 1fr);
  }
  .souqy-history-grid {
    grid-template-columns: 1fr;
  }
  .souqy-history-actions,
  .souqy-generated-actions {
    grid-template-columns: 1fr;
  }
  .souqy-edit-shelf {
    grid-template-columns: 1fr;
  }
  .souqy-edit-picks {
    max-inline-size: 100%;
  }
  .souqy-selector {
    min-inline-size: 0;
    flex: 1 1 96px;
  }
  .souqy-selector-compact {
    flex: 0 0 auto;
  }
  .souqy-composer .souqy-selector-trigger {
    inline-size: 100%;
    min-inline-size: 0;
    padding-inline: 10px;
  }
  .souqy-composer .souqy-selector-trigger-icon {
    inline-size: 36px;
    min-inline-size: 36px;
    max-inline-size: 36px;
    padding: 0;
  }
  .souqy-selector-menu,
  .souqy-selector-menu-format {
    inline-size: min(242px, calc(100vw - 40px));
  }
  .souqy-model-selector {
    flex: 1 1 138px;
  }
  .souqy-model-menu {
    inline-size: min(360px, calc(100vw - 40px));
  }
  .souqy-selector-compact .souqy-selector-menu {
    inset-inline-start: auto;
    inset-inline-end: 0;
  }
  .souqy-composer textarea {
    min-block-size: 54px;
  }
  .souqy-composer {
    border-radius: 24px;
    padding: 10px;
  }
  .souqy-composer-toolbar {
    gap: 7px;
  }
  .souqy-composer button {
    inline-size: 36px;
    block-size: 36px;
  }
  .souqy-composer-actions {
    gap: 6px;
  }
  .souqy-command-foot {
    align-items: start;
    flex-direction: column;
  }
  .souqy-command-foot p {
    white-space: normal;
  }
  .souqy-command-foot button span {
    display: none;
  }
  .souqy-context-panel {
    padding: 14px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .souqy-left-rail {
    transition: none !important;
  }
  .souqy-composer {
    animation: none !important;
    transition: none !important;
  }
  .souqy-hero,
  .souqy-chat-message {
    animation: none !important;
    transition: none !important;
  }
}
`;
