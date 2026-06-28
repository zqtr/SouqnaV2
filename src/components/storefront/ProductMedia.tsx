/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from 'react';
import { isVideoMediaUrl } from '@/lib/media';

export function ProductMedia({
  url,
  title,
  style,
  controls = false,
}: {
  url: string;
  title: string;
  style?: CSSProperties;
  controls?: boolean;
}) {
  const mediaStyle: CSSProperties = {
    width: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
    display: 'block',
    background: 'color-mix(in srgb, var(--sf-ink) 6%, transparent)',
    ...style,
  };

  if (isVideoMediaUrl(url)) {
    return (
      <video
        src={url}
        aria-label={title}
        controls={controls}
        muted={!controls}
        loop={!controls}
        playsInline
        preload="metadata"
        style={mediaStyle}
      />
    );
  }

  return <img src={url} alt={title} style={mediaStyle} />;
}
