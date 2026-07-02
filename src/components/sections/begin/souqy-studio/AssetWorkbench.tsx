'use client';

import { RefreshCw } from 'lucide-react';
import { AssetCard } from './AssetCard';
import type { StudioCopy } from './copy';
import type { SouqyStudioAsset } from './types';

type Props = {
  copy: StudioCopy;
  isRtl: boolean;
  assets: SouqyStudioAsset[];
  isLoading: boolean;
  onEditAsset: (asset: SouqyStudioAsset) => void;
  onRefresh: () => void;
};

export function AssetWorkbench({ copy, isRtl, assets, isLoading, onEditAsset, onRefresh }: Props) {
  return (
    <section className="sqs-panel" aria-label={copy.modeLabels.history}>
      <div className="sqs-panel-head">
        <span className="sqs-context-kicker">{copy.modeHints.history}</span>
        <button type="button" onClick={onRefresh}>
          <RefreshCw size={14} />
          <span>{copy.refresh}</span>
        </button>
      </div>
      <div className="sqs-history-grid">
        {assets.map((asset, index) => (
          <AssetCard
            key={asset.id ?? `${asset.url}-${index}`}
            asset={asset}
            copy={copy}
            isRtl={isRtl}
            onEdit={onEditAsset}
          />
        ))}
      </div>
      {!assets.length ? (
        <p className="sqs-empty">{isLoading ? copy.loadingHistory : copy.noAssets}</p>
      ) : null}
    </section>
  );
}
