import type { CSSProperties, ImgHTMLAttributes } from 'react';
import { optimizedImageAttrs } from '@/lib/image';

type StoreImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> & {
  src: string;
  alt: string;
  /**
   * Responsive `sizes`. Tell the browser how wide the image renders so it can
   * pick the smallest adequate candidate from the srcSet. Default assumes a
   * roughly half-viewport slot on desktop.
   */
  sizes?: string;
  /**
   * Above-the-fold / LCP image: load eagerly with high fetch priority instead
   * of the lazy default.
   */
  priority?: boolean;
  quality?: number;
  style?: CSSProperties;
};

/**
 * Drop-in replacement for a storefront `<img>` that serves resized,
 * format-negotiated, CDN-cached images via the Next optimizer while keeping
 * the caller's existing inline styles / className / layout intact.
 *
 * Server-safe (no hooks) so it renders inside the server-rendered storefront
 * blocks. Non-optimizable sources (SVG, GIF, data URIs, unknown hosts) fall
 * back to the raw URL automatically.
 */
export function StoreImage({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, 600px',
  priority = false,
  quality,
  ...rest
}: StoreImageProps) {
  const { src: resolvedSrc, srcSet } = optimizedImageAttrs(src, quality);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional: optimizer URL via srcSet, layout preserved
    <img
      {...rest}
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  );
}
