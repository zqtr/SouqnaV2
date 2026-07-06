"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { SouqnaLockup } from "@/components/primitives/SouqnaLockup";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Navigation2, type Navigation2Item } from "@/components/navigation-2";
import type { Copy } from "@/content/copy";
import type { Locale } from "@/i18n/locales";

type Props = {
  locale: Locale;
  copy: Copy;
};

/**
 * Marketing top navigation, rendered on the reactbits-pro `navigation-2`
 * capsule (installed via `npx shadcn add @reactbits-pro/navigation-2` and
 * productionized in `@/components/navigation-2`). The routing is unchanged
 * from the previous navbar — Docs, Account, Souqy Studio, home, and the
 * sign-in / sign-up flows all point at the same destinations. The registry
 * component's neutral palette is repainted to the Souqna surface/ink tokens
 * via the scoped `.sq-site-nav` overrides below, without touching the shared
 * `Navigation2` component itself.
 */
export function Navigation3({ locale, copy }: Props) {
  const [authReady, setAuthReady] = useState(false);
  const isRtl = locale === "ar";

  useEffect(() => {
    setAuthReady(true);
  }, []);

  const home = locale === "en" ? "/" : `/${locale}`;
  const docs = locale === "en" ? "/docs" : `/${locale}/docs`;
  const souqyStudio = locale === "en" ? "/begin/souqy" : `/${locale}/begin/souqy`;

  const items: Navigation2Item[] = [
    { href: docs, label: isRtl ? "الدليل" : "Docs" },
    { href: "/account", label: isRtl ? "الحساب" : "Account" },
    { href: souqyStudio, label: isRtl ? "استوديو سوقي" : "Souqy Studio" },
  ];

  const signInLabel = isRtl ? "دخول" : "Sign in";
  const signUpLabel = isRtl ? "إنشاء حساب" : "Sign up";

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[200] focus:rounded-sm focus:bg-[color:var(--surface-contrast)] focus:px-4 focus:py-2 focus:text-[color:var(--ink-on-contrast)]"
      >
        {copy.nav.skipToContent}
      </a>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: navStyles }} />
      <Navigation2
        className="sq-site-nav fixed inset-x-0 top-0 z-[100]"
        brandHref={home}
        brandLabel={copy.meta.siteName}
        brand={
          <SouqnaLockup ariaLabel="" height={28} className="text-[color:var(--ink-strong)]" />
        }
        items={items}
        actions={
          <div className="sq-site-nav-actions flex items-center gap-2">
            <ThemeToggle compact />
            <div className="sq-site-nav-locale">
              <LocaleSwitch current={locale} />
            </div>
            {!authReady ? (
              <Link href="/sign-up" className="sq-site-nav-cta">
                {signUpLabel}
              </Link>
            ) : (
              <>
                <SignedOut>
                  <Link href="/sign-in" className="sq-site-nav-signin">
                    {signInLabel}
                  </Link>
                  <Link href="/sign-up" className="sq-site-nav-cta">
                    {signUpLabel}
                  </Link>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </>
            )}
          </div>
        }
        mobileMenuFooter={
          <div className="sq-site-nav-mobile-footer flex flex-col gap-2 pt-1">
            <LocaleSwitch current={locale} />
            {authReady ? (
              <SignedOut>
                <Link href="/sign-in" className="sq-site-nav-mobile-signin">
                  {signInLabel}
                </Link>
              </SignedOut>
            ) : null}
          </div>
        }
      />
    </>
  );
}

/**
 * Repaint the reactbits `navigation-2` neutrals into the Souqna marketing
 * palette. Scoped under `.sq-site-nav` so specificity (0,2,0) beats the raw
 * Tailwind utilities baked into the shared component. Every token flips with
 * `[data-theme='dark']`, so the capsule reads correctly in both themes.
 */
const navStyles = `
  .sq-site-nav .rb-nav-shell {
    background: color-mix(in srgb, var(--surface-overlay) 82%, transparent);
    border-color: var(--surface-rule);
    box-shadow: 0 18px 50px color-mix(in srgb, var(--ink-strong) 8%, transparent);
  }
  [data-theme='dark'] .sq-site-nav .rb-nav-shell {
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.5);
  }
  .sq-site-nav .rb-nav-shell > a[aria-label] {
    color: var(--ink-strong);
  }
  .sq-site-nav .rb-nav-link {
    color: var(--ink-muted);
  }
  .sq-site-nav .rb-nav-link:hover {
    color: var(--ink-strong);
  }
  .sq-site-nav .rb-nav-link:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink-strong) 22%, transparent);
  }

  /* Mobile menu list items + hamburger */
  .sq-site-nav .lg\\:hidden a[href] {
    background: color-mix(in srgb, var(--surface-bg) 42%, transparent);
    border-color: var(--surface-rule);
    color: var(--ink-strong);
  }
  .sq-site-nav .lg\\:hidden a[href]:hover {
    background: color-mix(in srgb, var(--surface-bg) 70%, transparent);
  }
  .sq-site-nav .lg\\:hidden button[aria-expanded] {
    background: var(--surface-contrast);
    color: var(--ink-on-contrast);
  }
  .sq-site-nav .lg\\:hidden button[aria-expanded]:hover {
    background: color-mix(in srgb, var(--surface-contrast) 88%, var(--ink-on-contrast));
  }

  /* Sign-in text link (desktop actions only) */
  .sq-site-nav-signin,
  .sq-site-nav-mobile-signin {
    display: inline-flex;
    align-items: center;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-muted);
    text-decoration: none;
    transition: color 160ms ease;
  }
  .sq-site-nav-signin:hover,
  .sq-site-nav-mobile-signin:hover {
    color: var(--ink-strong);
  }

  /* Primary CTA (Sign up) */
  .sq-site-nav-cta {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    border-radius: 6px;
    padding: 8px 16px;
    background: var(--ink-strong);
    color: var(--surface-bg);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    transition: opacity 160ms ease, transform 160ms ease;
  }
  .sq-site-nav-cta:hover {
    opacity: 0.85;
    transform: translateY(-1px);
  }
  .sq-site-nav-cta:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink-strong) 30%, transparent);
  }

  /* Below lg, keep the top-bar actions minimal: locale + sign-in move into
     the mobile menu footer. */
  @media (max-width: 1023px) {
    .sq-site-nav-locale,
    .sq-site-nav-signin {
      display: none !important;
    }
  }
`;

export default Navigation3;
