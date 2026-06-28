'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  deleteReviewAction,
  moderateReviewAction,
  saveReviewsSettingsAction,
  toggleReviewFeaturedAction,
} from '@/app/actions/reviews';
import type {
  ReviewsSettings,
  ReviewsSort,
  StorefrontReview,
  ReviewStatus,
} from '@/lib/apps/reviews';
import {
  AppField,
  AppSettingsCard,
  AppToggle,
  appInputStyle,
} from './AppSettingsCard';

type Props = {
  storefrontSlug: string;
  initial: ReviewsSettings;
  reviews: StorefrontReview[];
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending',
  published: 'Published',
  hidden: 'Hidden',
};

export function ReviewsSettingsForm({ storefrontSlug, initial, reviews: initialReviews }: Props) {
  const [settings, setSettings] = useState<ReviewsSettings>(initial);
  const [reviews, setReviews] = useState<StorefrontReview[]>(initialReviews);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [moderating, startModerating] = useTransition();
  const counts = useMemo(() => {
    return reviews.reduce(
      (acc, review) => {
        acc[review.status] += 1;
        return acc;
      },
      { pending: 0, published: 0, hidden: 0 } satisfies Record<ReviewStatus, number>,
    );
  }, [reviews]);

  function patch(partial: Partial<ReviewsSettings>) {
    setSettings((current) => ({ ...current, ...partial }));
  }

  function updateLocal(reviewId: string, patchReview: Partial<StorefrontReview>) {
    setReviews((current) =>
      current.map((review) => (review.id === reviewId ? { ...review, ...patchReview } : review)),
    );
  }

  function runReviewAction(
    reviewId: string,
    action: () => Promise<{ status: 'success' | 'error'; message?: string }>,
    onSuccess: () => void,
  ) {
    setBusyReviewId(reviewId);
    startModerating(async () => {
      const result = await action();
      if (result.status === 'success') onSuccess();
      else window.alert(result.message ?? 'Could not update review.');
      setBusyReviewId(null);
    });
  }

  return (
    <AppSettingsCard
      eyebrow="Customise"
      title="Souqna Reviews"
      description="Turn customer reviews into store trust. Visitors can submit Arabic or English reviews from Souqna Reviews components; you choose what is shown and moderate every submission here."
      onSave={async () => saveReviewsSettingsAction({ storefrontSlug, settings })}
    >
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Display</legend>
        <div className="reviews-settings-grid" style={settingsGridStyle}>
          <AppToggle
            label="Reviews app is on"
            hint="When off, Reviews components stop rendering on the public storefront."
            value={settings.enabled}
            onChange={(enabled) => patch({ enabled })}
          />
          <AppToggle
            label="Visitors can write reviews"
            hint="When off, published reviews still show but the form is hidden."
            value={settings.allowVisitorSubmissions}
            onChange={(allowVisitorSubmissions) => patch({ allowVisitorSubmissions })}
          />
          <AppToggle
            label="Auto-publish new reviews"
            hint="Off means new reviews enter Pending until you approve them."
            value={settings.autoPublish}
            onChange={(autoPublish) => patch({ autoPublish })}
          />
          <AppToggle
            label="Show reviewer name"
            value={settings.showReviewerName}
            onChange={(showReviewerName) => patch({ showReviewerName })}
          />
          <AppToggle
            label="Show review title"
            value={settings.showReviewTitle}
            onChange={(showReviewTitle) => patch({ showReviewTitle })}
          />
          <AppToggle
            label="Show review date"
            value={settings.showReviewDate}
            onChange={(showReviewDate) => patch({ showReviewDate })}
          />
          <AppToggle
            label="Show average rating"
            value={settings.showAverageRating}
            onChange={(showAverageRating) => patch({ showAverageRating })}
          />
        </div>
        <div style={controlsGridStyle}>
          <AppField label="Reviews to show">
            <input
              type="number"
              min={1}
              max={24}
              value={settings.maxVisible}
              onChange={(event) => patch({ maxVisible: Number(event.target.value) || 1 })}
              style={appInputStyle}
            />
          </AppField>
          <AppField label="Minimum rating">
            <select
              value={settings.minimumRating}
              onChange={(event) => patch({ minimumRating: Number(event.target.value) })}
              style={appInputStyle}
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}+ stars
                </option>
              ))}
            </select>
          </AppField>
          <AppField label="Sort">
            <select
              value={settings.sort}
              onChange={(event) => patch({ sort: event.target.value as ReviewsSort })}
              style={appInputStyle}
            >
              <option value="featured_first">Featured first</option>
              <option value="newest">Newest first</option>
              <option value="highest_rating">Highest rating</option>
            </select>
          </AppField>
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Reviews tab</legend>
        <div style={countRowStyle}>
          <CountPill label="Pending" value={counts.pending} />
          <CountPill label="Published" value={counts.published} />
          <CountPill label="Hidden" value={counts.hidden} />
        </div>
        {reviews.length === 0 ? (
          <p style={emptyStyle}>
            No customer reviews yet. Add a Souqna Reviews component in Builder, then visitor submissions
            will appear here for moderation.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {reviews.map((review) => (
              <ReviewRow
                key={review.id}
                review={review}
                busy={moderating && busyReviewId === review.id}
                onStatus={(status) =>
                  runReviewAction(
                    review.id,
                    () => moderateReviewAction({ storefrontSlug, reviewId: review.id, status }),
                    () => updateLocal(review.id, { status }),
                  )
                }
                onFeatured={(isFeatured) =>
                  runReviewAction(
                    review.id,
                    () =>
                      toggleReviewFeaturedAction({
                        storefrontSlug,
                        reviewId: review.id,
                        isFeatured,
                      }),
                    () => updateLocal(review.id, { isFeatured }),
                  )
                }
                onDelete={() => {
                  if (!window.confirm('Delete this review? This cannot be undone.')) return;
                  runReviewAction(
                    review.id,
                    () => deleteReviewAction({ storefrontSlug, reviewId: review.id }),
                    () => setReviews((current) => current.filter((item) => item.id !== review.id)),
                  );
                }}
              />
            ))}
          </div>
        )}
      </fieldset>
      <style>{`
        @media (max-width: 760px) {
          .reviews-settings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AppSettingsCard>
  );
}

function ReviewRow({
  review,
  busy,
  onStatus,
  onFeatured,
  onDelete,
}: {
  review: StorefrontReview;
  busy: boolean;
  onStatus: (status: ReviewStatus) => void;
  onFeatured: (isFeatured: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <article style={reviewRowStyle}>
      <div style={{ minWidth: 0, flex: '1 1 280px' }}>
        <div style={reviewMetaStyle}>
          <span style={statusPillStyle(review.status)}>{STATUS_LABELS[review.status]}</span>
          {review.isFeatured ? <span style={featuredPillStyle}>Featured</span> : null}
          <span>{review.rating}/5</span>
          <span>{formatDate(review.createdAt)}</span>
          {review.productTitle ? <span>{review.productTitle}</span> : null}
        </div>
        <h4 style={reviewTitleStyle}>{review.title || review.customerName}</h4>
        <p style={reviewBodyStyle}>{review.body}</p>
        <p style={reviewNameStyle}>{review.customerName}</p>
      </div>
      <div style={actionsStyle}>
        {review.status !== 'published' ? (
          <ActionButton disabled={busy} onClick={() => onStatus('published')}>
            Publish
          </ActionButton>
        ) : null}
        {review.status !== 'hidden' ? (
          <ActionButton disabled={busy} onClick={() => onStatus('hidden')}>
            Hide
          </ActionButton>
        ) : null}
        {review.status !== 'pending' ? (
          <ActionButton disabled={busy} onClick={() => onStatus('pending')}>
            Pending
          </ActionButton>
        ) : null}
        <ActionButton disabled={busy} onClick={() => onFeatured(!review.isFeatured)}>
          {review.isFeatured ? 'Unfeature' : 'Feature'}
        </ActionButton>
        <ActionButton danger disabled={busy} onClick={onDelete}>
          Delete
        </ActionButton>
      </div>
    </article>
  );
}

function ActionButton({
  children,
  disabled,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '7px 10px',
        borderRadius: 999,
        border: danger
          ? '1px solid color-mix(in srgb, var(--color-maroon, #8b3a3a) 42%, transparent)'
          : '1px solid var(--surface-rule-strong)',
        background: 'transparent',
        color: danger ? 'var(--color-maroon, #8b3a3a)' : 'var(--ink-strong)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
      }}
    >
      {children}
    </button>
  );
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <span style={countPillStyle}>
      <strong>{value}</strong>
      {label}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const fieldsetStyle: React.CSSProperties = {
  border: '1px solid var(--surface-rule)',
  borderRadius: 10,
  padding: 14,
  margin: 0,
  display: 'grid',
  gap: 14,
};

const legendStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--ink-muted)',
  padding: '0 6px',
};

const settingsGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
};

const controlsGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
};

const countRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const countPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  borderRadius: 999,
  border: '1px solid var(--surface-rule)',
  padding: '6px 10px',
  color: 'var(--ink-muted)',
  fontSize: 12,
};

const emptyStyle: React.CSSProperties = {
  margin: 0,
  border: '1px dashed var(--surface-rule)',
  borderRadius: 10,
  padding: 14,
  color: 'var(--ink-muted)',
  fontSize: 13,
  lineHeight: 1.55,
};

const reviewRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 14,
  flexWrap: 'wrap',
  border: '1px solid var(--surface-rule)',
  borderRadius: 12,
  padding: 14,
  background: 'color-mix(in srgb, var(--ink-strong) 3%, transparent)',
};

const reviewMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  color: 'var(--ink-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};

const featuredPillStyle: React.CSSProperties = {
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--admin-accent) 15%, transparent)',
  color: 'var(--admin-accent)',
  padding: '3px 8px',
};

function statusPillStyle(status: ReviewStatus): React.CSSProperties {
  const color =
    status === 'published'
      ? 'var(--admin-accent)'
      : status === 'hidden'
        ? 'var(--color-maroon, #8b3a3a)'
        : 'var(--ink-muted)';
  return {
    borderRadius: 999,
    border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
    color,
    padding: '3px 8px',
  };
}

const reviewTitleStyle: React.CSSProperties = {
  margin: '10px 0 0',
  color: 'var(--ink-strong)',
  fontSize: 15,
};

const reviewBodyStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: 'var(--ink-strong)',
  fontSize: 13,
  lineHeight: 1.55,
};

const reviewNameStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: 'var(--ink-muted)',
  fontSize: 12,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: 8,
  flex: '0 1 280px',
};
