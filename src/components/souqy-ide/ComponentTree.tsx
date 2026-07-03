'use client';

import { blockLabel, type BlockLike } from '@/lib/souqy-ide/blocksDoc';
import type { IdePageSummary } from '@/app/actions/souqyIde';
import type { StudioCopy } from '@/components/sections/begin/souqy-studio/copy';

type Props = {
  copy: StudioCopy;
  pages: IdePageSummary[];
  activePageId: string;
  blocks: BlockLike[];
  selectedIndex: number;
  onSelectPage: (pageId: string) => void;
  onSelectBlock: (index: number) => void;
};

export function ComponentTree({
  copy,
  pages,
  activePageId,
  blocks,
  selectedIndex,
  onSelectPage,
  onSelectBlock,
}: Props) {
  return (
    <div className="sqs-ide-tree">
      <div className="sqs-ide-tree-head">
        <small>{copy.ideComponents}</small>
        {pages.length > 1 ? (
          <select
            value={activePageId}
            aria-label={copy.idePage}
            onChange={(event) => onSelectPage(event.target.value)}
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.isHome ? `⌂ ${page.title}` : page.title}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <ul role="listbox" aria-label={copy.ideComponents}>
        {blocks.map((block, index) => {
          const label = blockLabel(block);
          const selected = index === selectedIndex;
          return (
            <li key={`${block.type}-${index}`}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className={selected ? 'is-selected' : ''}
                onClick={() => onSelectBlock(index)}
              >
                <span className="sqs-ide-tree-type">{block.type}</span>
                {label ? <span className="sqs-ide-tree-label">{label}</span> : null}
              </button>
            </li>
          );
        })}
        {!blocks.length ? <li className="sqs-ide-tree-empty">{copy.ideNoBlocks}</li> : null}
      </ul>
    </div>
  );
}
