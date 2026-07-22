import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    typedRoutes: false,
    outputFileTracingIncludes: {
      '/api/pro/compiler/[version]/esbuild.wasm': ['./node_modules/esbuild-wasm/esbuild.wasm'],
    },
  },
  // Image optimization: founders upload originals up to 50 MB to Vercel
  // Blob and they were served raw to shoppers. Routing them through the
  // Next optimizer (`/_next/image`) resizes to the display size, negotiates
  // AVIF/WebP by Accept header, and CDN-caches the result. Only the hosts
  // below are optimizable; anything else falls back to the raw URL in
  // StoreImage so external/pasted images still render.
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // The web dashboard and Expo web builder mount this route in an
      // iframe so founders can edit blocks against the real renderer.
      // Expo web runs on :8081 in dev, so CSP allows that local parent.
      {
        source: '/account/:slug/preview',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOW-FROM http://localhost:8081' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' http://localhost:8081 http://127.0.0.1:8081" },
        ],
      },
      // Same relaxation for the ephemeral template-preview route used by
      // the Site inspector's "Browse all templates" modal — the founder
      // sees their real products inside each template variant via a
      // same-origin iframe stack.
      {
        source: '/account/:slug/preview/template/:templateId',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      // The Souqy IDE's "live" preview frames the real storefront route
      // (`/brief/<slug>`) so founders review the site exactly as customers
      // see it — including navigating into product pages inside the frame.
      // SAMEORIGIN keeps third-party clickjacking blocked; only the studio
      // (same origin) may embed it. Without this the global DENY leaves the
      // preview pane blank white.
      {
        source: '/brief/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      {
        source: '/account/:slug/pro-live-preview',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

/**
 * Sentry — wraps the Next config to upload sourcemaps + auto-instrument
 * route handlers + tunnel client events through `/monitoring` so ad
 * blockers don't drop them. Build is silent locally; CI gets logs only
 * when `SENTRY_AUTH_TOKEN` is present (set in Vercel project env).
 */
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
  hideSourceMaps: true,
  telemetry: false,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
