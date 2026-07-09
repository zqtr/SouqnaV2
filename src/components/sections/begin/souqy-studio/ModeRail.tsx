'use client';

import { SouqyLogo } from '@/components/admin/SouqyLogo';
import { isSouqyIdeSliceEnabled } from '@/lib/souqy-ide/flags';
import { STUDIO_MODES } from './catalog';
import type { StudioCopy } from './copy';
import type { StudioTab } from './types';

type Props = {
  activeTab: StudioTab;
  copy: StudioCopy;
  onSelect: (tab: StudioTab) => void;
};

export function ModeRail({ activeTab, copy, onSelect }: Props) {
  return (
    <nav className="sqs-rail" aria-label={copy.workspace}>
      <button
        type="button"
        className="sqs-rail-brand"
        onClick={() => onSelect('create')}
        aria-label={copy.modeLabels.create}
      >
        <SouqyLogo size={32} />
      </button>
      <div className="sqs-rail-modes" role="tablist" aria-label={copy.workspace}>
        {STUDIO_MODES.filter((mode) => mode.id !== 'code' || isSouqyIdeSliceEnabled('code-v1')).map(
          (mode, index) => {
            const Icon = mode.icon;
            const active = activeTab === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? 'sqs-rail-btn is-active' : 'sqs-rail-btn'}
                title={copy.modeLabels[mode.id]}
                onClick={() => onSelect(mode.id)}
              >
                <Icon size={18} />
                <b className="sqs-rail-num" aria-hidden>
                  {index + 1}
                </b>
                <span className="sqs-rail-tip">{copy.modeLabels[mode.id]}</span>
              </button>
            );
          },
        )}
      </div>
      <span className="sqs-rail-foot" aria-hidden>
        Souqy Studio
      </span>
    </nav>
  );
}
