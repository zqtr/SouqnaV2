'use client';

import * as React from 'react';
import * as ReactModule from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import type { BlockContext } from '@/components/storefront/blocks/BlockContext';
import { CartProvider } from '@/components/storefront/cart/CartContext';
import { palettes, paletteCssVars, type PaletteId } from '@/lib/palettes';
import { parseProFrameParentMessage } from '@/lib/proRuntime';
import { BrowserSouqyProvider, browserSouqnaSdk } from '@/sdk/browser';

type Props = {
  channelId: string;
  context: BlockContext;
};

type EvaluatedModule = {
  default?: React.ComponentType;
  theme?: BlockContext['theme'];
};

type BoundaryProps = {
  channelId: string;
  requestId: number;
  children: React.ReactNode;
};

type BoundaryState = { failed: boolean };

class RuntimeBoundary extends React.Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    window.parent.postMessage(
      {
        type: 'souqna:pro-runtime:runtime_error',
        channelId: this.props.channelId,
        requestId: this.props.requestId,
        message: error.message,
      },
      '*',
    );
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ProLivePreviewRuntime({ channelId, context }: Props) {
  const [phase, setPhase] = React.useState<'booting' | 'waiting' | 'evaluating'>('booting');
  const [rendered, setRendered] = React.useState<{
    requestId: number;
    Component: React.ComponentType;
    css: string;
    theme: BlockContext['theme'];
  } | null>(null);

  React.useEffect(() => {
    function receiveUpdate(event: MessageEvent) {
      if (event.source !== window.parent) return;
      const message = parseProFrameParentMessage(event.data, channelId);
      if (!message) return;
      setPhase('evaluating');
      try {
        const evaluated = evaluateArtifact(message.code);
        if (!evaluated.default) throw new Error('The generated storefront does not export a default component.');
        setRendered({
          requestId: message.requestId,
          Component: evaluated.default,
          css: message.css,
          theme: evaluated.theme ?? context.theme,
        });
      } catch (error) {
        window.parent.postMessage(
          {
            type: 'souqna:pro-runtime:runtime_error',
            channelId,
            requestId: message.requestId,
            message: error instanceof Error ? error.message : 'The Instant Draft could not render.',
          },
          '*',
        );
      }
    }

    window.addEventListener('message', receiveUpdate);
    setPhase('waiting');
    window.parent.postMessage({ type: 'souqna:pro-runtime:ready', channelId }, '*');
    return () => window.removeEventListener('message', receiveUpdate);
  }, [channelId, context.theme]);

  React.useEffect(() => {
    if (!rendered) return;
    window.parent.postMessage(
      { type: 'souqna:pro-runtime:rendered', channelId, requestId: rendered.requestId },
      '*',
    );
  }, [channelId, rendered]);

  const theme = rendered?.theme ?? context.theme;
  const paletteId = (theme.palette ?? context.storefront.palette ?? 'sand_gold') as PaletteId;
  const palette = palettes[paletteId] ?? palettes.sand_gold;
  const colourTheme = theme.themeBehaviour === 'dark' ? 'dark' : 'light';
  const frameStyle: React.CSSProperties = {
    ...paletteCssVars(palette, colourTheme),
    background: rendered ? (theme.pageBg ?? 'var(--sf-ground)') : '#090806',
    color: rendered ? 'var(--sf-ink)' : '#8f8678',
    minHeight: '100dvh',
    colorScheme: rendered ? colourTheme : 'dark',
  };

  return (
    <div
      dir={context.isRtl ? 'rtl' : 'ltr'}
      style={frameStyle}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('a,button,[role="button"]')) event.preventDefault();
      }}
      onSubmitCapture={(event) => event.preventDefault()}
    >
      <style dangerouslySetInnerHTML={{ __html: BASE_STYLES }} />
      {rendered ? <style dangerouslySetInnerHTML={{ __html: rendered.css }} /> : null}
      {rendered ? (
        <CartProvider
          storefrontSlug={context.storefront.slug}
          currency="QAR"
          enabled={false}
        >
          <BrowserSouqyProvider context={{ ...context, theme, isPreview: true }}>
            <RuntimeBoundary
              key={rendered.requestId}
              channelId={channelId}
              requestId={rendered.requestId}
            >
              <rendered.Component />
            </RuntimeBoundary>
          </BrowserSouqyProvider>
        </CartProvider>
      ) : (
        <div style={FRAME_STATUS_STYLE} role="status">
          {context.isRtl
            ? phase === 'evaluating'
              ? 'جارٍ رسم المسودة الفورية…'
              : phase === 'waiting'
                ? 'بانتظار الكود المترجم…'
                : 'جارٍ تجهيز المسودة الفورية…'
            : phase === 'evaluating'
              ? 'Rendering Instant Draft…'
              : phase === 'waiting'
                ? 'Waiting for compiled draft…'
                : 'Preparing Instant Draft…'}
        </div>
      )}
    </div>
  );
}

function evaluateArtifact(code: string): EvaluatedModule {
  const runtimeModule = { exports: {} as EvaluatedModule };
  const captiveRequire = (specifier: string): unknown => {
    if (specifier === 'react') return ReactModule;
    if (specifier === 'react/jsx-runtime') return JsxRuntime;
    if (specifier === '@souqna/sdk') return browserSouqnaSdk;
    throw new Error(`Import '${specifier}' is not allowed in Souqna Code.`);
  };
  const execute = new Function('module', 'exports', 'require', code);
  execute(runtimeModule, runtimeModule.exports, captiveRequire);
  return runtimeModule.exports;
}

const BASE_STYLES = `
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:var(--font-ui,system-ui,sans-serif);background:var(--sf-ground);color:var(--sf-ink)}
body{overflow-x:hidden}
a,button,[role="button"]{cursor:default}
img{max-width:100%;height:auto}
main{min-height:100dvh}
`;

const FRAME_STATUS_STYLE: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'grid',
  placeItems: 'center',
  padding: 32,
  color: 'color-mix(in srgb, var(--sf-ink) 58%, transparent)',
  fontSize: 12,
};
