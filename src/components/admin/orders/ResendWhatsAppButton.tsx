'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, MessageCircle, X } from 'lucide-react';
import { resendOrderWhatsAppConfirmation, type ResendWhatsAppState } from '@/app/actions/orders';
import { Button } from '@/components/ui/button';

export function ResendWhatsAppButton({
  storefrontSlug,
  orderId,
  disabled,
}: {
  storefrontSlug: string;
  orderId: number;
  disabled?: boolean;
}) {
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ResendWhatsAppState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 5200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast]);

  return (
    <>
      <Button
        type="button"
        disabled={disabled || sending}
        onClick={async () => {
          setSending(true);
          try {
            const result = await resendOrderWhatsAppConfirmation(storefrontSlug, orderId);
            setToast(result);
          } finally {
            setSending(false);
          }
        }}
        variant="outline"
        className="mt-3.5 h-10 w-full rounded-md border-[color:color-mix(in_srgb,var(--admin-accent,#7a3d2d)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--admin-accent,#7a3d2d)_10%,var(--surface-bg))] text-[color:var(--ink-strong)] hover:bg-[color:color-mix(in_srgb,var(--admin-accent,#7a3d2d)_16%,var(--surface-bg))]"
      >
        {sending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <MessageCircle data-icon="inline-start" />
        )}
        <span>{sending ? 'Sending...' : 'Resend WhatsApp'}</span>
        <span aria-hidden style={{ opacity: 0.42 }}>
          ·
        </span>
        <span lang="ar" dir="rtl" style={{ fontFamily: 'var(--font-arabic, var(--font-sans))' }}>
          {sending ? 'جار الإرسال...' : 'إعادة إرسال واتساب'}
        </span>
      </Button>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            insetInlineEnd: 24,
            bottom: 24,
            zIndex: 80,
            width: 'min(380px, calc(100vw - 32px))',
            border:
              toast.status === 'success'
                ? '1px solid color-mix(in srgb, #2f7d5b 42%, transparent)'
                : '1px solid color-mix(in srgb, var(--color-maroon, #8b3a3a) 42%, transparent)',
            borderRadius: 14,
            background:
              'color-mix(in srgb, var(--surface-elevated, #fff) 92%, transparent)',
            boxShadow: '0 22px 70px color-mix(in srgb, #140b08 18%, transparent)',
            backdropFilter: 'blur(18px)',
            padding: 16,
            color: 'var(--ink-strong)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>
                {toast.status === 'success' ? 'Owner notice' : 'Owner notice'}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.45 }}>
                {toast.message}
              </p>
              <p
                lang="ar"
                dir="rtl"
                style={{
                  margin: '4px 0 0',
                  fontFamily: 'var(--font-arabic, var(--font-sans))',
                  fontSize: 13.5,
                  lineHeight: 1.55,
                }}
              >
                {toast.arMessage}
              </p>
            </div>
            <Button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
              variant="ghost"
              size="icon-sm"
              className="rounded-md text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-bg)] hover:text-[color:var(--ink-strong)]"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
