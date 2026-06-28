'use client';

import CurvedLoop from '@/components/souqna-motion/curved-loop';
import type { BlockRenderProps } from './BlockContext';
import type { CurvedLoopProps } from '@/lib/blocks/types';

const TONE_COLOR: Record<NonNullable<CurvedLoopProps['tone']>, string> = {
  ink: 'var(--sf-ink)',
  accent: 'var(--sf-accent)',
  gold: '#c9a961',
  muted: 'color-mix(in srgb, var(--sf-ink) 58%, var(--sf-ground))',
};

const SIZE_STYLE: Record<
  NonNullable<CurvedLoopProps['size']>,
  { paddingBlock: string; scale: string }
> = {
  compact: { paddingBlock: 'clamp(10px, 3vw, 24px)', scale: '0.72' },
  standard: { paddingBlock: 'clamp(18px, 5vw, 52px)', scale: '0.88' },
  hero: { paddingBlock: 'clamp(26px, 7vw, 84px)', scale: '1' },
};

export function CurvedLoopBlock({ block, ctx }: BlockRenderProps<CurvedLoopProps>) {
  const p = block.props;
  const text = p.marqueeText?.trim() || 'Add Text Here';
  const size = SIZE_STYLE[p.size ?? 'standard'];
  const tone = TONE_COLOR[p.tone ?? 'accent'];
  const textIsRtl = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/.test(text);
  const fontFamily = textIsRtl
    ? 'var(--font-arabic-serif), var(--font-arabic), serif'
    : 'var(--font-serif), var(--font-sans)';

  return (
    <section
      dir={ctx.isRtl ? 'rtl' : 'ltr'}
      style={{
        width: '100%',
        overflow: 'hidden',
        paddingBlock: size.paddingBlock,
        color: tone,
      }}
    >
      <div
        style={{
          width: 'min(100%, 1480px)',
          marginInline: 'auto',
          transform: `scale(${size.scale})`,
          transformOrigin: 'center',
        }}
      >
        <CurvedLoop
          marqueeText={text}
          speed={p.speed ?? 1.6}
          curveAmount={p.curveAmount ?? 360}
          direction={p.direction ?? (ctx.isRtl ? 'right' : 'left')}
          interactive={p.interactive ?? true}
          className="souqna-curved-loop-text"
          ariaLabel={text}
        />
      </div>
      <style>{`
        .souqna-curved-loop-text {
          font-family: ${fontFamily};
          letter-spacing: 0;
        }
      `}</style>
    </section>
  );
}
