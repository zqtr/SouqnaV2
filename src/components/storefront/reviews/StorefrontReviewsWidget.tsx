'use client';

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import type { ReviewsSettings, StorefrontReview } from '@/lib/apps/reviews';
import type { ShadcnReviewsProps } from '@/lib/blocks/types';

type StaticReview = NonNullable<ShadcnReviewsProps['reviews']>[number];

type Props = {
  storefrontSlug: string;
  isRtl: boolean;
  variant: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  previewFallbackReviews?: StaticReview[];
};

type ApiPayload = {
  ok: boolean;
  enabled?: boolean;
  error?: string;
  settings?: ReviewsSettings;
  reviews?: StorefrontReview[];
};

const FALLBACK_SETTINGS: ReviewsSettings = {
  enabled: true,
  allowVisitorSubmissions: true,
  autoPublish: false,
  showReviewerName: true,
  showReviewTitle: true,
  showReviewDate: true,
  showAverageRating: true,
  minimumRating: 1,
  maxVisible: 6,
  sort: 'featured_first',
};

const COPY = {
  en: {
    loading: 'Loading reviews...',
    empty: 'No reviews yet. Be the first to share your experience.',
    disabled: 'Reviews are not enabled for this storefront.',
    formTitle: 'Write a review',
    name: 'Your name',
    title: 'Short title',
    body: 'Your review',
    rating: 'Rating',
    submit: 'Send review',
    sending: 'Sending...',
    sentPending: 'Review sent. The store will approve it before it appears.',
    sentPublished: 'Review published. Thank you.',
    error: 'Could not send the review. Try again.',
    average: 'Average rating',
    reviews: 'reviews',
    preview: 'Builder preview',
  },
  ar: {
    loading: 'جاري تحميل التقييمات...',
    empty: 'لا توجد تقييمات بعد. كن أول من يشارك تجربته.',
    disabled: 'التقييمات غير مفعلة لهذا المتجر.',
    formTitle: 'اكتب تقييماً',
    name: 'اسمك',
    title: 'عنوان قصير',
    body: 'تقييمك',
    rating: 'التقييم',
    submit: 'إرسال التقييم',
    sending: 'جاري الإرسال...',
    sentPending: 'تم إرسال التقييم. سيظهر بعد موافقة المتجر.',
    sentPublished: 'تم نشر التقييم. شكراً لك.',
    error: 'تعذر إرسال التقييم. حاول مرة أخرى.',
    average: 'متوسط التقييم',
    reviews: 'تقييم',
    preview: 'معاينة المصمم',
  },
} as const;

export function StorefrontReviewsWidget({
  storefrontSlug,
  isRtl,
  variant,
  kicker,
  title,
  subtitle,
  previewFallbackReviews = [],
}: Props) {
  const t = COPY[isRtl ? 'ar' : 'en'];
  const [settings, setSettings] = useState<ReviewsSettings>(FALLBACK_SETTINGS);
  const [reviews, setReviews] = useState<StorefrontReview[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reviews?store=${encodeURIComponent(storefrontSlug)}`, { cache: 'no-store' })
      .then((res) => res.json() as Promise<ApiPayload>)
      .then((payload) => {
        if (cancelled) return;
        if (!payload.ok) throw new Error(payload.error ?? 'reviews failed');
        setEnabled(payload.enabled !== false);
        setSettings(payload.settings ?? FALLBACK_SETTINGS);
        setReviews(payload.reviews ?? []);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storefrontSlug, t.error]);

  const previewReviews = useMemo(
    () => previewFallbackReviews.map((review, index) => staticToReview(review, index, isRtl)),
    [isRtl, previewFallbackReviews],
  );
  const visibleReviews = reviews.length > 0 ? reviews : previewReviews;
  const average =
    visibleReviews.length > 0
      ? visibleReviews.reduce((sum, review) => sum + review.rating, 0) / visibleReviews.length
      : 0;

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          store: storefrontSlug,
          customerName: name,
          rating,
          title: reviewTitle,
          body,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        status?: 'pending' | 'published';
        review?: StorefrontReview | null;
        error?: string;
      };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'review failed');
      if (payload.review) setReviews((current) => [payload.review!, ...current]);
      setName('');
      setReviewTitle('');
      setBody('');
      setRating(5);
      setMessage(payload.status === 'published' ? t.sentPublished : t.sentPending);
    } catch {
      setMessage(t.error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!enabled && previewFallbackReviews.length === 0) return null;

  return (
    <div style={wrapStyle}>
      {kicker || title || subtitle ? (
        <header style={headingStyle}>
          {kicker ? <span style={kickerStyle}>{kicker}</span> : null}
          {title ? <h2 style={titleStyle(isRtl)}>{title}</h2> : null}
          {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
        </header>
      ) : null}
      {loading ? <p style={mutedStyle}>{t.loading}</p> : null}
      {error ? <p style={alertStyle}>{error}</p> : null}
      {!enabled ? <p style={alertStyle}>{t.disabled}</p> : null}
      {settings.showAverageRating && visibleReviews.length > 0 ? (
        <div style={averageStyle}>
          <strong>{average.toFixed(1)}</strong>
          <span>{t.average}</span>
          <span>
            {visibleReviews.length} {t.reviews}
          </span>
        </div>
      ) : null}

      {visibleReviews.length > 0 ? (
        <div style={reviewsGridStyle(variant)}>
          {visibleReviews.map((review) => (
            <article key={review.id} style={reviewCardStyle}>
              <Stars rating={review.rating} label={`${review.rating}/5`} />
              {settings.showReviewTitle && review.title ? (
                <h3 style={reviewTitleStyle}>{review.title}</h3>
              ) : null}
              <p style={reviewBodyStyle}>{review.body}</p>
              <div style={reviewFooterStyle}>
                {settings.showReviewerName ? <strong>{review.customerName}</strong> : <span />}
                {settings.showReviewDate ? <span>{formatDate(review.createdAt, isRtl)}</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : !loading ? (
        <p style={emptyStyle}>{t.empty}</p>
      ) : null}

      {settings.allowVisitorSubmissions && enabled ? (
        <form onSubmit={submitReview} style={formStyle}>
          <h3 style={formTitleStyle}>{t.formTitle}</h3>
          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span>{t.name}</span>
              <input
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              <span>{t.rating}</span>
              <select
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                style={inputStyle}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value}/5
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label style={fieldStyle}>
            <span>{t.title}</span>
            <input
              maxLength={120}
              value={reviewTitle}
              onChange={(event) => setReviewTitle(event.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span>{t.body}</span>
            <textarea
              required
              minLength={4}
              maxLength={1200}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
            />
          </label>
          <div style={submitRowStyle}>
            <button type="submit" disabled={submitting} style={submitStyle}>
              {submitting ? t.sending : t.submit}
            </button>
            {previewFallbackReviews.length > 0 && reviews.length === 0 ? (
              <span style={previewPillStyle}>{t.preview}</span>
            ) : null}
          </div>
          {message ? <p style={messageStyle}>{message}</p> : null}
        </form>
      ) : null}
    </div>
  );
}

function staticToReview(review: StaticReview, index: number, isRtl: boolean): StorefrontReview {
  return {
    id: `preview-${index}`,
    storefrontSlug: 'preview',
    productId: review.productId ?? null,
    productTitle: null,
    customerName: isRtl ? review.nameAr || review.nameEn || '' : review.nameEn || review.nameAr || '',
    rating: Math.max(1, Math.min(5, Math.round(review.rating ?? 5))),
    title: null,
    body: isRtl ? review.quoteAr || review.quoteEn || '' : review.quoteEn || review.quoteAr || '',
    status: 'published',
    isFeatured: false,
    source: 'preview',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span aria-label={label} style={starsStyle}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} aria-hidden>
          {index < Math.round(rating) ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

function formatDate(value: string, isRtl: boolean) {
  return new Date(value).toLocaleDateString(isRtl ? 'ar-QA' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const wrapStyle: CSSProperties = {
  display: 'grid',
  gap: 18,
};

const headingStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  maxWidth: 760,
};

const kickerStyle: CSSProperties = {
  width: 'fit-content',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--sf-accent) 16%, transparent)',
  color: 'var(--sf-accent)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

function titleStyle(isRtl: boolean): CSSProperties {
  return {
    margin: 0,
    fontFamily: isRtl ? 'var(--font-arabic-serif), var(--font-serif), serif' : 'var(--font-serif), serif',
    fontSize: 'clamp(30px, 5vw, 64px)',
    lineHeight: 1,
    letterSpacing: 0,
  };
}

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: 'color-mix(in srgb, currentColor 68%, transparent)',
  fontSize: 'clamp(14px, 1.5vw, 18px)',
  lineHeight: 1.7,
};

function reviewsGridStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns:
      variant === 'reviews23'
        ? 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))'
        : 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: 14,
  };
}

const reviewCardStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: 18,
  borderRadius: 22,
  background: 'color-mix(in srgb, var(--sf-ground) 92%, white)',
  border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
  boxShadow: '0 20px 60px -48px color-mix(in srgb, var(--sf-ink) 75%, transparent)',
};

const starsStyle: CSSProperties = {
  display: 'inline-flex',
  gap: 2,
  color: 'var(--sf-accent)',
  letterSpacing: 0,
};

const reviewTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.2,
};

const reviewBodyStyle: CSSProperties = {
  margin: 0,
  lineHeight: 1.7,
  color: 'color-mix(in srgb, var(--sf-ink) 72%, transparent)',
};

const reviewFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  color: 'color-mix(in srgb, var(--sf-ink) 58%, transparent)',
  fontSize: 13,
};

const averageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  flexWrap: 'wrap',
  width: 'fit-content',
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid color-mix(in srgb, var(--sf-accent) 26%, transparent)',
  background: 'color-mix(in srgb, var(--sf-accent) 10%, transparent)',
};

const formStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: 16,
  borderRadius: 22,
  border: '1px solid color-mix(in srgb, var(--sf-accent) 24%, transparent)',
  background: 'color-mix(in srgb, var(--sf-ground) 88%, transparent)',
};

const formTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
  color: 'color-mix(in srgb, var(--sf-ink) 70%, transparent)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid color-mix(in srgb, var(--sf-ink) 16%, transparent)',
  borderRadius: 12,
  background: 'var(--sf-ground)',
  color: 'var(--sf-ink)',
  padding: '11px 12px',
  font: 'inherit',
  outline: 'none',
};

const submitRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
};

const submitStyle: CSSProperties = {
  border: 0,
  borderRadius: 999,
  background: 'var(--sf-ink)',
  color: 'var(--sf-ground)',
  padding: '11px 16px',
  fontWeight: 800,
  cursor: 'pointer',
};

const previewPillStyle: CSSProperties = {
  borderRadius: 999,
  border: '1px solid color-mix(in srgb, var(--sf-accent) 32%, transparent)',
  padding: '5px 9px',
  color: 'var(--sf-accent)',
  fontSize: 12,
};

const mutedStyle: CSSProperties = {
  margin: 0,
  color: 'color-mix(in srgb, var(--sf-ink) 58%, transparent)',
};

const emptyStyle: CSSProperties = {
  margin: 0,
  border: '1px dashed color-mix(in srgb, var(--sf-ink) 18%, transparent)',
  borderRadius: 18,
  padding: 18,
  color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)',
};

const alertStyle: CSSProperties = {
  ...emptyStyle,
  borderStyle: 'solid',
  color: 'var(--sf-ink)',
  background: 'color-mix(in srgb, var(--sf-accent) 10%, transparent)',
};

const messageStyle: CSSProperties = {
  margin: 0,
  color: 'color-mix(in srgb, var(--sf-ink) 70%, transparent)',
  fontSize: 13,
};
