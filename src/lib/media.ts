export type StorefrontMediaKind = 'image' | 'video' | 'file';

export const STOREFRONT_IMAGE_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
] as const;

export const STOREFRONT_VIDEO_CONTENT_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-m4v',
] as const;

export const STOREFRONT_UPLOAD_CONTENT_TYPES = [
  ...STOREFRONT_IMAGE_CONTENT_TYPES,
  ...STOREFRONT_VIDEO_CONTENT_TYPES,
] as const;

export const STOREFRONT_MEDIA_ACCEPT = STOREFRONT_UPLOAD_CONTENT_TYPES.join(',');

export const STOREFRONT_MEDIA_FORMATS_LABEL = 'PNG · JPG · WEBP · GIF · SVG · MP4 · WEBM · MOV';

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg|avif|ico)(?:[?#].*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i;

export function mediaKindFromContentType(contentType?: string | null): StorefrontMediaKind {
  const normalized = contentType?.toLowerCase().split(';')[0]?.trim() ?? '';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized.startsWith('image/')) return 'image';
  return 'file';
}

export function mediaKindFromUrl(url?: string | null): StorefrontMediaKind {
  if (!url) return 'file';
  if (VIDEO_EXTENSIONS.test(url) || /\/video\/|video\/upload/i.test(url)) return 'video';
  if (IMAGE_EXTENSIONS.test(url)) return 'image';
  return 'file';
}

export function mediaKindFromUrlOrContentType(
  url?: string | null,
  contentType?: string | null,
): StorefrontMediaKind {
  const byType = mediaKindFromContentType(contentType);
  if (byType !== 'file') return byType;
  return mediaKindFromUrl(url);
}

export function isVideoMediaUrl(url?: string | null): boolean {
  return mediaKindFromUrl(url) === 'video';
}

export function isImageMediaUrl(url?: string | null): boolean {
  return mediaKindFromUrl(url) === 'image';
}
