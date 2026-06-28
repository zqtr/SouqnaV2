'use client';

import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  /** When true, render a tiny icon-only button. Default: icon + label. */
  compact?: boolean;
  /** Optional label override; defaults to active-theme aware copy. */
  label?: string;
  /** Additional className; the component already applies a base style. */
  className?: string;
};

/**
 * Sun / moon icon button that flips the active theme. Persists via the
 * cookie so a hard refresh paints the chosen theme immediately.
 *
 * The button always shows the *target* theme's glyph (i.e. moon when
 * we're in light mode, sun when we're in dark mode) so the icon reads
 * as "click to go to that mode".
 */
export function ThemeToggle({ compact = false, label, className }: Props) {
  const { theme, toggle } = useTheme();
  const targetIsDark = theme === 'light';
  const targetLabel = label ?? (targetIsDark ? 'Dark mode' : 'Light mode');

  return (
    <Button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${targetIsDark ? 'dark' : 'light'} mode`}
      title={targetLabel}
      variant="outline"
      size={compact ? 'icon-sm' : 'sm'}
      className={cn(
        'border-border bg-background/80 text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground',
        compact ? 'rounded-full' : 'rounded-md font-mono text-[11px] uppercase tracking-[0.1em]',
        className,
      )}
    >
      <ThemeGlyph theme={targetIsDark ? 'dark' : 'light'} />
      {compact ? null : <span>{targetLabel}</span>}
    </Button>
  );
}

function ThemeGlyph({ theme }: { theme: 'light' | 'dark' }) {
  if (theme === 'dark') {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
