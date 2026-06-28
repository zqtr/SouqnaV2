'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Direction = 'left' | 'right';

export type CurvedLoopProps = {
  marqueeText?: string;
  speed?: number;
  className?: string;
  curveAmount?: number;
  direction?: Direction;
  interactive?: boolean;
  ariaLabel?: string;
};

const VIEWBOX_WIDTH = 1440;
const VIEWBOX_HEIGHT = 180;

export default function CurvedLoop({
  marqueeText = '',
  speed = 2,
  className,
  curveAmount = 400,
  direction = 'left',
  interactive = true,
  ariaLabel,
}: CurvedLoopProps) {
  const rawId = useId();
  const pathId = useMemo(() => `curve-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);
  const measureRef = useRef<SVGTextElement | null>(null);
  const textPathRef = useRef<SVGTextPathElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef<Direction>(direction);
  const velRef = useRef(0);
  const [spacing, setSpacing] = useState(0);
  const [offset, setOffset] = useState(0);
  const [width, setWidth] = useState(VIEWBOX_WIDTH);
  const [reducedMotion, setReducedMotion] = useState(false);

  const text = useMemo(() => {
    const clean = marqueeText.trim() || 'Add Text Here';
    return `${clean}\u00A0`;
  }, [marqueeText]);

  const responsiveCurve = useMemo(() => {
    const base = Math.max(120, Math.min(720, curveAmount));
    if (width < 520) return Math.round(base * 0.38);
    if (width < 900) return Math.round(base * 0.58);
    return base;
  }, [curveAmount, width]);

  const pathD = useMemo(() => `M-120,64 Q520,${64 + responsiveCurve} 1560,64`, [responsiveCurve]);

  const totalText = useMemo(() => {
    if (!spacing) return text;
    return Array(Math.ceil(2100 / spacing) + 2)
      .fill(text)
      .join('');
  }, [spacing, text]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (measureRef.current) {
      setSpacing(Math.max(1, measureRef.current.getComputedTextLength()));
    }
  }, [text, className, width]);

  useEffect(() => {
    if (!spacing || !textPathRef.current) return;
    const initial = -spacing;
    textPathRef.current.setAttribute('startOffset', `${initial}px`);
    setOffset(initial);
  }, [spacing]);

  useEffect(() => {
    dirRef.current = direction;
  }, [direction]);

  useEffect(() => {
    if (!spacing || reducedMotion) return;
    let frame = 0;
    const safeSpeed = Math.max(0.2, Math.min(8, speed));

    const step = () => {
      if (!dragRef.current && textPathRef.current) {
        const delta = dirRef.current === 'right' ? safeSpeed : -safeSpeed;
        const currentOffset = Number.parseFloat(
          textPathRef.current.getAttribute('startOffset') || '0',
        );
        let nextOffset = currentOffset + delta;

        if (nextOffset <= -spacing) nextOffset += spacing;
        if (nextOffset > 0) nextOffset -= spacing;

        textPathRef.current.setAttribute('startOffset', `${nextOffset}px`);
        setOffset(nextOffset);
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed, reducedMotion]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || reducedMotion) return;
    dragRef.current = true;
    lastXRef.current = event.clientX;
    velRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || reducedMotion || !dragRef.current || !textPathRef.current) return;
    const dx = event.clientX - lastXRef.current;
    lastXRef.current = event.clientX;
    velRef.current = dx;

    const currentOffset = Number.parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
    let nextOffset = currentOffset + dx;
    if (nextOffset <= -spacing) nextOffset += spacing;
    if (nextOffset > 0) nextOffset -= spacing;

    textPathRef.current.setAttribute('startOffset', `${nextOffset}px`);
    setOffset(nextOffset);
  }

  function endDrag() {
    if (!interactive) return;
    dragRef.current = false;
    if (velRef.current !== 0) dirRef.current = velRef.current > 0 ? 'right' : 'left';
  }

  const ready = spacing > 0;
  const cursor = interactive && !reducedMotion ? (dragRef.current ? 'grabbing' : 'grab') : 'auto';

  return (
    <div
      ref={wrapRef}
      className="curved-loop-jacket"
      aria-label={ariaLabel ?? text.trim()}
      style={{
        visibility: ready ? 'visible' : 'hidden',
        cursor,
        minHeight: 'clamp(88px, 16vw, 220px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        overflow: 'visible',
        touchAction: 'pan-y',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <svg
        className="curved-loop-svg"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        style={{
          userSelect: 'none',
          width: '100%',
          aspectRatio: `${VIEWBOX_WIDTH} / ${VIEWBOX_HEIGHT}`,
          overflow: 'visible',
          display: 'block',
          fontSize: 'clamp(2.4rem, 9vw, 7rem)',
          fill: 'currentColor',
          fontWeight: 800,
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        <text
          ref={measureRef}
          xmlSpace="preserve"
          className={className}
          style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
        >
          {text}
        </text>
        <defs>
          <path id={pathId} d={pathD} fill="none" stroke="transparent" />
        </defs>
        {ready ? (
          <text xmlSpace="preserve" className={cn(className)}>
            <textPath ref={textPathRef} href={`#${pathId}`} startOffset={`${offset}px`}>
              {totalText}
            </textPath>
          </text>
        ) : null}
      </svg>
    </div>
  );
}
