import type { ComponentType } from 'react';
import type { Locale } from '@/i18n/locales';

export type StudioIconProps = { size?: string | number };
export type StudioIcon = ComponentType<StudioIconProps>;

export type CreationTemplate =
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

export type StudioFormatKey =
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

export type SouqyStudioAsset = {
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

export type SouqyStudioProject = {
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

export type CatalogStorefront = {
  slug: string;
  businessName: string;
  locale: Locale;
};

export type CatalogProduct = {
  id: string;
  storefrontSlug: string;
  storefrontName: string;
  title: string;
  description: string | null;
  priceQar: number | null;
  imageUrl: string | null;
  category: string | null;
};

export type ReferenceImage = {
  id: string;
  name: string;
  url: string;
  file: File;
};

export type StudioTab = 'projects' | 'create' | 'edit' | 'chat' | 'web' | 'history';

export type StudioChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'creating' | 'done' | 'error';
  assets?: SouqyStudioAsset[];
  templateLabel?: string;
  formatLabel?: string;
  modelLabel?: string;
};

export type StudioTextMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'creating' | 'done' | 'error';
  assets?: undefined;
  templateLabel?: string;
  formatLabel?: string;
  modelLabel?: string;
};

export type SouqyStudioChatCost = {
  inputTokens: number;
  outputTokens: number;
  baseUsd: number;
  billableUsd: number;
  credits: number;
  multiplier: number;
};

export type SouqyStudioChatStreamMeta = {
  provider?: string;
  backend?: string;
  model?: string;
  cost?: SouqyStudioChatCost;
};

export type SouqyStudioChatStreamDone = SouqyStudioChatStreamMeta & {
  text?: string;
  latencyMs?: number;
};

export type StudioThreadMessage = StudioChatMessage | StudioTextMessage;

export type StudioProjectSummary = {
  id: string;
  businessName: string;
  locale: Locale;
  currentStep: SouqyStudioProject['currentStep'];
  storefrontSlug: string | null;
  assetCount: number;
  latestAssetUrl: string | null;
  updatedAt: string;
};

export type LibraryState =
  | {
      status: 'success';
      project: SouqyStudioProject | null;
      assets: SouqyStudioAsset[];
      counts: Record<string, number>;
      storefronts: CatalogStorefront[];
      products: CatalogProduct[];
    }
  | { status: 'error'; message: string };

export type ProjectState =
  | { status: 'success'; project: SouqyStudioProject }
  | { status: 'error'; message: string };

export type GenerateState =
  | { status: 'success'; assets: SouqyStudioAsset[] }
  | { status: 'error'; message: string };

export type ProjectsState =
  | { status: 'success'; projects: StudioProjectSummary[] }
  | { status: 'error'; message: string };

export type CranlJobSubmissionState =
  | {
      ok: true;
      job: {
        queue: 'ai-chat';
        jobId: string;
        status: 'queued';
      };
    }
  | { ok: false; error?: string };

export type CranlJobStatusState =
  | {
      ok: true;
      job: {
        state: string;
        failedReason?: string | null;
        returnvalue?: unknown;
      };
    }
  | { ok: false; error?: string };

export type StudioQuality = 'standard' | 'high' | 'print';

/**
 * UI view models for the agent-workspace shell. These never leave the
 * client; API payloads and server contracts stay on the types above.
 */
export type StudioModeKind = 'thread' | 'panel';

export type StudioModeMeta = {
  id: StudioTab;
  icon: StudioIcon;
  kind: StudioModeKind;
};

export type StudioStatusTone = 'idle' | 'busy' | 'done' | 'error';

export type StudioStatus = {
  tone: StudioStatusTone;
  message: string;
};

export type StudioPanelState = {
  isContextOpen: boolean;
};
