"use client";

import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Navigation2Item = {
  label: string;
  href: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  children?: Navigation2Item[];
};

type Navigation2Props = {
  actions?: ReactNode;
  brand: ReactNode;
  brandHref: string;
  brandLabel: string;
  className?: string;
  items: Navigation2Item[];
  mobileMenuFooter?: ReactNode;
};

/**
 * reactbits-pro `navigation-2` — a centered floating bar whose grouped items
 * expand an in-container mega-menu on hover (installed via
 * `npx shadcn add @reactbits-pro/navigation-2`). The registry demo is
 * hardcoded ("Flowbase", Violet Storm background); this is the prop-driven
 * adaptation: brand / items / actions are supplied by the caller and the
 * full-screen demo wrapper is dropped.
 *
 * Colours come from the `.rb-nav-*` hooks below (brand-token defaults) so each
 * page can repaint the shell to its own palette (`.sq-home-nav`, `.sq-site-nav`,
 * `.sq-docs-nav`) without editing this component. Mega-menu cards inherit the
 * repainted text colour via `currentColor`, so they follow any palette.
 */
export function Navigation2({
  actions,
  brand,
  brandHref,
  brandLabel,
  className,
  items,
  mobileMenuFooter,
}: Navigation2Props) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const active = items.find((item) => item.href === activeMenu && item.children?.length);

  return (
    <nav className={cn("relative z-40 w-full px-4 py-4", className)} aria-label="Primary">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: navBaseStyles }} />
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Desktop */}
        <motion.div
          className="relative mx-auto hidden lg:block"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, ease: [0.4, 0, 0.2, 1] }}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <div className="rb-nav-shell mx-auto w-fit overflow-hidden rounded-3xl border backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-2 py-3 pe-3 ps-6">
              <a
                href={brandHref}
                aria-label={brandLabel}
                className="me-6 flex items-center no-underline"
              >
                {brand}
              </a>

              <div className="flex items-center gap-1">
                {items.map((item) =>
                  item.children?.length ? (
                    <button
                      key={item.href}
                      type="button"
                      onMouseEnter={() => setActiveMenu(item.href)}
                      className="rb-nav-link rounded-full px-4 py-2 text-sm font-light tracking-tight"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <a
                      key={item.href}
                      href={item.href}
                      onMouseEnter={() => setActiveMenu(null)}
                      className="rb-nav-link rounded-full px-4 py-2 text-sm font-light tracking-tight no-underline"
                    >
                      {item.label}
                    </a>
                  ),
                )}
              </div>

              {actions ? <div className="ms-6 flex items-center gap-2">{actions}</div> : null}
            </div>

            <AnimatePresence>
              {active ? (
                <motion.div
                  key={active.href}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rb-nav-dropdown p-2">
                    <div className="grid w-[min(620px,80vw)] grid-cols-2 gap-3">
                      {active.children!.map((child, index) => (
                        <motion.a
                          key={child.href}
                          href={child.href}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05, ease: "easeOut" }}
                          className="rb-nav-card group flex items-start gap-3 rounded-2xl border p-4 no-underline transition-[border-color,background-color] duration-200"
                        >
                          {child.icon ? (
                            <span className="rb-nav-card-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                              <child.icon className="h-5 w-5" />
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className="rb-nav-card-title block text-sm font-medium tracking-tight">
                              {child.label}
                            </span>
                            {child.description ? (
                              <span className="rb-nav-card-desc mt-0.5 block text-xs leading-snug">
                                {child.description}
                              </span>
                            ) : null}
                          </span>
                        </motion.a>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Mobile */}
        <motion.div
          className="lg:hidden"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="rb-nav-shell overflow-hidden rounded-3xl border backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 py-3 pe-3 ps-4">
              <a href={brandHref} aria-label={brandLabel} className="flex items-center no-underline">
                {brand}
              </a>

              <div className="flex items-center gap-2">
                {actions}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  className="rb-nav-burger flex h-10 w-10 items-center justify-center rounded-lg"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {mobileMenuOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-2 px-4 pb-4 pt-1">
                    {items.map((item, index) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.035, ease: "easeOut" }}
                      >
                        <a
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="rb-nav-mobile-link block rounded-2xl border px-4 py-3 text-sm font-medium no-underline"
                        >
                          {item.label}
                        </a>
                        {item.children?.length ? (
                          <div className="mt-2 grid gap-2 ps-3">
                            {item.children.map((child) => (
                              <a
                                key={child.href}
                                href={child.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="rb-nav-mobile-sublink block rounded-xl border px-4 py-2.5 text-sm no-underline"
                              >
                                {child.label}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </motion.div>
                    ))}
                    {mobileMenuFooter ? <div className="pt-1">{mobileMenuFooter}</div> : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </nav>
  );
}

/**
 * Brand-token defaults for the `.rb-nav-*` hooks. Single-class selectors so the
 * per-page descendant repaints (`.sq-home-nav .rb-nav-shell`, …) win over these.
 * Cards use `currentColor` so they inherit whatever text colour a page's palette
 * repaint applies to the dropdown, and read correctly in light and dark.
 */
const navBaseStyles = `
  .rb-nav-shell {
    background: color-mix(in srgb, var(--surface-overlay) 72%, transparent);
    border-color: var(--surface-rule);
    box-shadow: 0 18px 50px color-mix(in srgb, var(--ink-strong) 8%, transparent);
  }
  .rb-nav-link {
    color: var(--ink-muted);
    background: transparent;
    border: 0;
    cursor: pointer;
    transition: color 160ms ease, background-color 160ms ease;
  }
  .rb-nav-link:hover {
    color: var(--ink-strong);
    background: color-mix(in srgb, var(--ink-strong) 6%, transparent);
  }
  .rb-nav-dropdown {
    color: var(--ink-strong);
    border-top: 1px solid color-mix(in srgb, var(--ink-strong) 8%, transparent);
  }
  .rb-nav-card {
    color: inherit;
    border-color: color-mix(in srgb, currentColor 14%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
  }
  .rb-nav-card:hover {
    border-color: color-mix(in srgb, currentColor 26%, transparent);
    background: color-mix(in srgb, currentColor 7%, transparent);
  }
  .rb-nav-card-icon {
    background: color-mix(in srgb, currentColor 10%, transparent);
    color: inherit;
  }
  .rb-nav-card-title {
    color: inherit;
  }
  .rb-nav-card-desc {
    color: inherit;
    opacity: 0.62;
  }
  .rb-nav-burger {
    background: var(--surface-contrast);
    color: var(--ink-on-contrast);
    transition: opacity 160ms ease;
  }
  .rb-nav-burger:hover {
    opacity: 0.88;
  }
  .rb-nav-mobile-link {
    color: var(--ink-strong);
    border-color: var(--surface-rule);
    background: color-mix(in srgb, var(--surface-bg) 40%, transparent);
  }
  .rb-nav-mobile-sublink {
    color: var(--ink-muted);
    border-color: var(--surface-rule);
  }
`;

export default Navigation2;
