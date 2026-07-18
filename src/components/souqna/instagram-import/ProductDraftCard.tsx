'use client';

import type { DraftProduct } from '@/lib/instagram/types';
import type { Locale } from '@/i18n/locales';
import type { ImportCopy } from './copy';

/**
 * Compact draft preview used inside the review chat (read-only) and the
 * summary list (editable + include toggle). Styling comes from the
 * `.ig-*` classes defined in InstagramImportStep's style block, themed
 * via the `--ig-*` custom properties set on the step root.
 */
export function ProductDraftCard({
  draft,
  copy,
  locale,
  isRtl,
  editable = false,
  onEdit,
  onToggle,
}: {
  draft: DraftProduct;
  copy: ImportCopy;
  locale: Locale;
  isRtl: boolean;
  editable?: boolean;
  onEdit?: (patch: Partial<DraftProduct>) => void;
  onToggle?: () => void;
}) {
  const title =
    (locale === 'ar' ? (draft.titleAr ?? draft.titleEn) : (draft.titleEn ?? draft.titleAr)) ?? '—';
  const secondary = locale === 'ar' ? draft.titleEn : draft.titleAr;
  const pills = [...draft.sizeOptions, ...draft.variantOptions].slice(0, 6);

  return (
    <div className={`ig-card${draft.isProduct ? '' : ' is-excluded'}`}>
      {draft.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- ephemeral import preview, remote blob host
        <img className="ig-card-img" src={draft.imageUrl} alt={title} loading="lazy" />
      ) : (
        <div className="ig-card-img is-empty" aria-hidden />
      )}
      <div className="ig-card-body">
        {editable ? (
          <label className="ig-card-edit">
            <span>{copy.editTitle}</span>
            <input
              value={title === '—' ? '' : title}
              dir={isRtl ? 'rtl' : 'ltr'}
              onChange={(event) =>
                onEdit?.(
                  locale === 'ar'
                    ? { titleAr: event.target.value }
                    : { titleEn: event.target.value },
                )
              }
            />
          </label>
        ) : (
          <div className="ig-card-title">
            <b>{title}</b>
            {secondary && secondary !== title ? (
              <small dir={isRtl ? 'ltr' : 'rtl'}>{secondary}</small>
            ) : null}
          </div>
        )}

        <div className="ig-card-meta">
          {editable ? (
            <label className="ig-card-edit ig-card-edit-price">
              <span>{copy.editPrice}</span>
              <input
                type="number"
                min={0}
                inputMode="decimal"
                dir="ltr"
                value={draft.priceQar ?? ''}
                placeholder="—"
                onChange={(event) => {
                  const n = Number.parseFloat(event.target.value);
                  onEdit?.({ priceQar: Number.isFinite(n) && n > 0 ? n : null });
                }}
              />
            </label>
          ) : (
            <span className={`ig-price${draft.priceQar === null ? ' is-missing' : ''}`}>
              {draft.priceQar !== null ? `QAR ${draft.priceQar}` : copy.noPrice}
            </span>
          )}
          {draft.priceQar === null && draft.isProduct ? (
            <span className="ig-badge">{copy.draftBadge}</span>
          ) : null}
          {draft.category ? <span className="ig-pill">{draft.category}</span> : null}
          {pills.map((pill) => (
            <span key={pill} className="ig-pill is-option">
              {pill}
            </span>
          ))}
        </div>
      </div>
      {onToggle ? (
        <button
          type="button"
          className={`ig-toggle${draft.isProduct ? ' is-on' : ''}`}
          onClick={onToggle}
          aria-pressed={draft.isProduct}
        >
          {draft.isProduct ? copy.included : copy.excluded}
        </button>
      ) : null}
    </div>
  );
}
