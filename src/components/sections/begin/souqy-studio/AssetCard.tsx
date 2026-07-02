'use client';
/* eslint-disable @next/next/no-img-element */

import { Download, Maximize2, Pencil } from 'lucide-react';
import type { SouqyStudioAsset } from './types';
import type { StudioCopy } from './copy';
import {
  assetPreviewStyle,
  downloadHrefForAsset,
  fallbackDownloadName,
  labelForAsset,
} from './helpers';

type Props = {
  asset: SouqyStudioAsset;
  copy: StudioCopy;
  isRtl: boolean;
  onEdit: (asset: SouqyStudioAsset) => void;
};

export function AssetCard({ asset, copy, isRtl, onEdit }: Props) {
  return (
    <article className="sqs-asset-card">
      <a
        className="sqs-asset-preview"
        href={asset.url}
        target="_blank"
        rel="noreferrer"
        style={assetPreviewStyle(asset)}
      >
        <img src={asset.url} alt={asset.title} />
      </a>
      <div className="sqs-asset-meta">
        <strong>{asset.title}</strong>
        <small>
          {asset.width}x{asset.height} / {labelForAsset(asset, isRtl)}
        </small>
      </div>
      <div className="sqs-asset-actions">
        <button type="button" onClick={() => onEdit(asset)}>
          <Pencil size={13} />
          <span>{copy.editThis}</span>
        </button>
        <a
          href={downloadHrefForAsset(asset)}
          download={asset.downloadFilename ?? fallbackDownloadName(asset)}
        >
          <Download size={13} />
          <span>{copy.download}</span>
        </a>
        <a href={asset.url} target="_blank" rel="noreferrer">
          <Maximize2 size={13} />
          <span>{copy.openImage}</span>
        </a>
      </div>
    </article>
  );
}
