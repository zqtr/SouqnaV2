import type { BlockRenderProps } from './BlockContext';
import type { TextProps } from '@/lib/blocks/types';
import { TextEffectRenderer } from './TextEffectRenderer';

/**
 * Editorial copy block — eyebrow, optional heading, body. The serif emphasis
 * variant wraps the body in italic serif for a quote-like effect.
 */
export function TextBlock({ block, ctx }: BlockRenderProps<TextProps>) {
  const { isRtl } = ctx;
  const props = block.props;
  const fontFamily = isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)';
  const serifFamily = isRtl ? 'var(--font-arabic-serif), serif' : 'var(--font-serif), serif';
  const align = props.align ?? 'start';
  const emphasis = props.emphasis ?? 'plain';
  const textAlign = align === 'end' ? 'right' : align === 'center' ? 'center' : 'left';

  return (
    <section style={{ padding: 'clamp(20px, 3vw, 36px) 0', textAlign }}>
      {props.eyebrow ? (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--sf-accent)',
            marginBottom: 14,
          }}
        >
          {props.eyebrow}
        </div>
      ) : null}
      {props.heading ? (
        <TextEffectRenderer
          as="h2"
          effect={block.style?.textEffect}
          style={{
            fontFamily: serifFamily,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'calc(clamp(24px, 3.6vw, 40px) * var(--sf-font-scale, 1))',
            lineHeight: 1.15,
            margin: '0 0 16px',
          }}
        >
          {props.heading}
        </TextEffectRenderer>
      ) : null}
      {/* The text effect rides the heading when there is one; on a
          body-only block it applies to the body itself, so a standalone
          paragraph still animates. */}
      <TextEffectRenderer
        as="div"
        effect={props.heading ? undefined : block.style?.textEffect}
        style={{
          fontFamily: emphasis === 'serif' ? serifFamily : fontFamily,
          fontStyle: emphasis === 'serif' ? 'italic' : 'normal',
          fontSize: 'calc(clamp(15px, 1.6vw, 18px) * var(--sf-font-scale, 1))',
          lineHeight: 1.65,
          color: 'color-mix(in srgb, var(--sf-ink) 80%, transparent)',
          maxWidth: align === 'center' ? 640 : 720,
          marginInline: align === 'center' ? 'auto' : 0,
          whiteSpace: 'pre-wrap',
        }}
      >
        {props.body}
      </TextEffectRenderer>
    </section>
  );
}
