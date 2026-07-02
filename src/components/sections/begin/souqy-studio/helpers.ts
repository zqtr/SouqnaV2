import type { CSSProperties } from 'react';
import type { StudioFormatKey, SouqyStudioAsset } from './types';

export async function postSouqyStudio<T>(path: string, payload: unknown): Promise<T> {
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

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read reference image.'));
    reader.readAsDataURL(file);
  });
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function cranlErrorLabel(error?: string): string {
  if (error === 'cranl_not_configured') {
    return 'The AI assistant is missing its runtime URL or API key in this environment.';
  }
  if (error === 'cranl_request_failed') return 'The AI assistant request failed.';
  if (error === 'invalid_ai_chat_job') return 'The AI assistant rejected this chat request.';
  if (error === 'job_not_found') return 'The AI assistant job was not found.';
  return sanitizeRuntimeBranding(error || 'The AI assistant failed.');
}

export function cranlFailureLabel(reason: string): string {
  if (/status code 429|rate.?limit|quota|insufficient_quota/i.test(reason)) {
    return 'The AI provider returned 429. Check the AI runtime provider key, quota, billing, or rate limits.';
  }
  return sanitizeRuntimeBranding(reason);
}

function sanitizeRuntimeBranding(value: string): string {
  return value.replace(/CranL/giu, 'AI runtime').replace(/cranl/giu, 'AI runtime');
}

export function extractCranlText(value: unknown): string {
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

export function assetPreviewStyle(asset: SouqyStudioAsset): CSSProperties {
  return {
    '--sqs-preview-aspect': `${asset.width} / ${asset.height}`,
  } as CSSProperties;
}

export function labelForAsset(asset: SouqyStudioAsset, isRtl: boolean): string {
  if (asset.formatKey) return asset.formatKey.replace(/-/g, ' ');
  if (asset.assetType) return asset.assetType.replace(/-/g, ' ');
  return isRtl ? 'أصل سوقي' : 'Souqy asset';
}

export function fallbackDownloadName(asset: SouqyStudioAsset): string {
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

export function downloadHrefForAsset(asset: SouqyStudioAsset): string {
  const filename = asset.downloadFilename ?? fallbackDownloadName(asset);
  return `/api/souqy-studio/download?url=${encodeURIComponent(asset.url)}&filename=${encodeURIComponent(
    filename,
  )}`;
}

export function aspectLabelForFormat(formatKey: StudioFormatKey): string {
  const labels: Record<StudioFormatKey, string> = {
    'instagram-post': 'Portrait (4:5)',
    'instagram-story': 'Vertical (9:16)',
    tiktok: 'Vertical (9:16)',
    snapchat: 'Vertical (9:16)',
    'whatsapp-status': 'Vertical (9:16)',
    'x-banner': 'Wide (16:9)',
    'a3-print': 'Print (A3)',
    'menu-print': 'Classic (A4)',
    'product-card': 'Square (1:1)',
    'logo-square': 'Square (1:1)',
    'wide-banner': 'Landscape (2:1)',
  };
  return labels[formatKey];
}

export function dimensionsForFormat(formatKey: StudioFormatKey): {
  width: number;
  height: number;
} {
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

export function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}
