'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintControls() {
  return (
    <div className="controls">
      <Button
        type="button"
        onClick={() => window.print()}
        size="sm"
        className="rounded-md bg-[color:var(--ink-strong,#18181b)] text-[color:var(--surface-bg,#fff)] hover:bg-[color:color-mix(in_srgb,var(--ink-strong,#18181b)_88%,transparent)]"
      >
        <Printer data-icon="inline-start" />
        Print
      </Button>
      <span style={{ marginInlineStart: 12, fontSize: 10, color: '#71717a' }}>
        Use your browser&apos;s &ldquo;Save as PDF&rdquo; to export.
      </span>
    </div>
  );
}

export function PrintAutoTrigger() {
  useEffect(() => {
    const id = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
