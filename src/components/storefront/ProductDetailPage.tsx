import type { CSSProperties } from 'react';
import { ShoppingBag } from 'lucide-react';
import type { Storefront as StorefrontData } from '@/lib/brief';
import type { Product } from '@/lib/products';
import { isImageMediaUrl, isVideoMediaUrl } from '@/lib/media';
import { AddToCartButton } from './cart/AddToCartButton';
import { PriceText, formatMonthlyPrice, formatPrice } from './blocks/helpers';

export function ProductDetailPage({
  storefront,
  product,
  storefrontBaseHref,
  allowCart = true,
}: {
  storefront: StorefrontData;
  product: Product;
  storefrontBaseHref: string;
  allowCart?: boolean;
}): JSX.Element {
  const isRtl = storefront.locale === 'ar';
  const isSoldOut = product.status === 'sold_out';
  const isMonthly =
    product.pricingMode === 'monthly_payment' && typeof product.monthlyPriceQar === 'number';
  const displayPrice = isMonthly ? product.monthlyPriceQar : product.priceQar;
  const hasPrice = typeof displayPrice === 'number';
  const canCart = allowCart && !isSoldOut && hasPrice;
  const mediaIsVideo = isVideoMediaUrl(product.imageUrl);
  const priceText =
    hasPrice && isMonthly
      ? formatMonthlyPrice(displayPrice, isRtl)
      : hasPrice
        ? formatPrice(displayPrice, isRtl)
        : isRtl
          ? 'حسب الطلب'
          : 'On request';

  return (
    <main
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        width: 'min(1180px, 92vw)',
        marginInline: 'auto',
        paddingBlock: 'clamp(34px, 6vw, 92px)',
      }}
    >
      <a href={storefrontBaseHref} style={backLinkStyle()}>
        {isRtl ? 'العودة للمتجر' : 'Back to storefront'}
      </a>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: 'clamp(28px, 5vw, 72px)',
          alignItems: 'start',
        }}
      >
        <div style={mediaShellStyle()}>
          {product.imageUrl ? (
            <ProductMedia
              url={product.imageUrl}
              title={product.mediaAltText || product.title}
              isVideo={mediaIsVideo}
            />
          ) : (
            <div style={emptyMediaStyle()}>{isRtl ? 'بدون صورة' : 'No image'}</div>
          )}
        </div>

        <div style={{ paddingBlock: 'clamp(4px, 2vw, 26px)' }}>
          {product.category ? (
            <a
              href={`${storefrontBaseHref}/products`}
              style={{
                display: 'inline-flex',
                marginBlockEnd: 14,
                color: 'var(--sf-accent)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              {product.category}
            </a>
          ) : null}

          {product.badges.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBlockEnd: 16 }}>
              {product.badges.slice(0, 4).map((badge) => (
                <span key={badge} style={badgeStyle()}>
                  {badge}
                </span>
              ))}
            </div>
          ) : null}

          <h1
            style={{
              margin: 0,
              color: 'var(--sf-ink)',
              fontFamily: isRtl
                ? 'var(--font-arabic-serif), var(--font-serif), serif'
                : 'var(--font-serif), serif',
              fontSize: 'clamp(42px, 8vw, 92px)',
              lineHeight: 0.98,
              fontWeight: 700,
            }}
          >
            {product.title}
          </h1>

          {product.subtitle ? (
            <p
              style={{
                margin: 'clamp(14px, 2.2vw, 22px) 0 0',
                color: 'color-mix(in srgb, var(--sf-ink) 78%, transparent)',
                fontSize: 'clamp(18px, 2vw, 24px)',
                lineHeight: 1.45,
                fontWeight: 600,
              }}
            >
              {product.subtitle}
            </p>
          ) : null}

          {product.description ? (
            <p
              style={{
                margin: 'clamp(22px, 4vw, 38px) 0 0',
                color: 'color-mix(in srgb, var(--sf-ink) 70%, transparent)',
                fontSize: 'clamp(17px, 2.2vw, 22px)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}
            >
              {product.description}
            </p>
          ) : null}

          <div style={purchaseRowStyle()}>
            {hasPrice && !isMonthly ? (
              <PriceText price={displayPrice} isRtl={isRtl} style={priceStyle()} />
            ) : (
              <strong style={priceStyle()}>{priceText}</strong>
            )}

            {canCart ? (
              <AddToCartButton
                productId={product.id}
                title={product.title}
                priceQar={displayPrice}
                imageUrl={
                  mediaIsVideo || !isImageMediaUrl(product.imageUrl) ? null : product.imageUrl
                }
                sizeOptions={product.sizeOptions}
                sizeOptionPrices={product.sizeOptionPrices}
                allowCustomSize={product.allowCustomSize}
                variantOptions={product.variantOptions}
                variantOptionPrices={product.variantOptionPrices}
                requiresHeightInput={product.requiresHeightInput}
                heightInputLabel={product.heightInputLabel}
                heightOptions={product.heightOptions}
                isRtl={isRtl}
                icon={<ShoppingBag size={20} aria-hidden />}
                style={{
                  minHeight: 56,
                  paddingInline: 24,
                  border: 0,
                  background: 'color-mix(in srgb, var(--sf-accent) 82%, #d6ad57)',
                  color: 'var(--sf-ground)',
                }}
              />
            ) : (
              <span style={disabledPurchaseStyle()}>
                {!allowCart
                  ? isRtl
                    ? 'الشراء معطل في المعاينة'
                    : 'Purchasing disabled in preview'
                  : isSoldOut
                    ? isRtl
                      ? 'نفد'
                      : 'Sold out'
                    : priceText}
              </span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductMedia({ url, title, isVideo }: { url: string; title: string; isVideo: boolean }) {
  const style: CSSProperties = {
    width: '100%',
    aspectRatio: '4 / 5',
    objectFit: 'contain',
    objectPosition: 'center',
    display: 'block',
    background: 'color-mix(in srgb, var(--sf-ground) 70%, transparent)',
  };
  if (isVideo) {
    return (
      <video src={url} aria-label={title} style={style} controls playsInline preload="metadata" />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={title} style={style} />;
}

function backLinkStyle(): CSSProperties {
  return {
    display: 'inline-flex',
    marginBlockEnd: 28,
    color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textDecoration: 'none',
  };
}

function mediaShellStyle(): CSSProperties {
  return {
    overflow: 'hidden',
    borderRadius: 32,
    border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
    background: 'color-mix(in srgb, var(--sf-ink) 6%, transparent)',
  };
}

function emptyMediaStyle(): CSSProperties {
  return {
    aspectRatio: '4 / 5',
    display: 'grid',
    placeItems: 'center',
    color: 'color-mix(in srgb, var(--sf-ink) 52%, transparent)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  };
}

function badgeStyle(): CSSProperties {
  return {
    borderRadius: 999,
    border: '1px solid color-mix(in srgb, var(--sf-accent) 34%, transparent)',
    background: 'color-mix(in srgb, var(--sf-accent) 12%, transparent)',
    color: 'var(--sf-accent)',
    padding: '6px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  };
}

function purchaseRowStyle(): CSSProperties {
  return {
    marginBlockStart: 'clamp(28px, 5vw, 52px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
    paddingBlockStart: 28,
    borderTop: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
  };
}

function priceStyle(): CSSProperties {
  return {
    color: 'var(--sf-ink)',
    fontFamily: 'var(--font-serif), serif',
    fontWeight: 700,
    fontSize: 'clamp(34px, 5vw, 64px)',
    whiteSpace: 'nowrap',
  };
}

function disabledPurchaseStyle(): CSSProperties {
  return {
    borderRadius: 999,
    padding: '14px 20px',
    background: 'color-mix(in srgb, var(--sf-ink) 10%, transparent)',
    color: 'color-mix(in srgb, var(--sf-ink) 70%, transparent)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };
}
