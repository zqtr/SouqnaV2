"use client";

import React, { useRef, useEffect, useState, useCallback, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import DitherWave from "@/components/dither-wave";
import HalftoneWave from "@/components/halftone-wave";
import { useReducedMotion } from "framer-motion";

/**
 * Souqy IDE Dithered/Halftone Visual System
 * 
 * Unified, reusable signature treatment for backgrounds, transitions,
 * loading states, selection states, and component states across the Souqy IDE.
 * 
 * Extends HalftoneWave (R3F dot-field) and DitherWave (Three.js procedural).
 * 
 * Design goals:
 * - Reusability: single source of truth with mode presets + prop overrides
 * - Performance: reduced-motion guard, FPS caps, offscreen pause, optional static canvas fallback,
 *   lazy Three init only for rich modes, CSS layers for lightweight states
 * - Signature: consistent Souqna cream/coal/black palette with subtle dither/halftone texture
 * - IDE integration: explicit support for loading, selection, transitions, component surfaces
 */

export type DitherMode =
  | "background"      // full-bleed ambient field (DitherWave)
  | "halftone"        // dot-matrix hero/overlay (HalftoneWave)
  | "loading"         // animated pulse + scan for async states
  | "selection"       // interactive highlight on cards/panels
  | "transition"      // crossfade / page change veil
  | "component"       // lightweight inline surface treatment
  | "grain";          // fine noise layer (static or low-cost)

export interface DitherSystemProps {
  mode?: DitherMode;
  /** Container sizing */
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** Animation speed (0.1–3) */
  speed?: number;
  /** Visual intensity / opacity multiplier */
  intensity?: number;
  /** Color palette override (cream-forward for IDE) */
  colorA?: string;
  colorB?: string;
  colorC?: string;
  /** Enable cursor proximity boost (halftone/selection) */
  cursorInteraction?: boolean;
  /** Quality vs perf tradeoff */
  quality?: "low" | "medium" | "high";
  /** Cap FPS for battery/perf */
  maxFPS?: number;
  /** Auto-pause when offscreen */
  pauseWhenOffscreen?: boolean;
  /** Force static (no WebGL) for ultra-light states */
  static?: boolean;
  /** Additional data attrs for theming/debug */
  "data-state"?: string;
}

/** Preset configs tuned for Souqy IDE surfaces */
const MODE_PRESETS: Record<DitherMode, Partial<DitherSystemProps>> = {
  background: {
    speed: 1.4,
    intensity: 0.12,
    colorA: "#FFFFFF",
    colorB: "#F4EAD6",
    colorC: "#050505",
    quality: "medium",
    maxFPS: 42,
    pauseWhenOffscreen: true,
  },
  halftone: {
    speed: 0.6,
    intensity: 0.55,
    colorA: "#F4EAD6",
    colorB: "#E8DCC4",
    colorC: "#0A0A0A",
    quality: "high",
    maxFPS: 55,
    cursorInteraction: true,
  },
  loading: {
    speed: 2.2,
    intensity: 0.35,
    colorA: "#FFFFFF",
    colorB: "#F4EAD6",
    colorC: "#111111",
    quality: "low",
    maxFPS: 30,
    pauseWhenOffscreen: false,
  },
  selection: {
    speed: 1.1,
    intensity: 0.65,
    colorA: "#F4EAD6",
    colorB: "#E8DCC4",
    colorC: "#1C1A18",
    quality: "medium",
    maxFPS: 48,
    cursorInteraction: true,
  },
  transition: {
    speed: 0.9,
    intensity: 0.28,
    colorA: "#F4EAD6",
    colorB: "#FFFFFF",
    colorC: "#030303",
    quality: "medium",
    maxFPS: 60,
    pauseWhenOffscreen: true,
  },
  component: {
    speed: 0.4,
    intensity: 0.18,
    colorA: "#E8DCC4",
    colorB: "#F4EAD6",
    colorC: "#131211",
    quality: "low",
    maxFPS: 24,
    static: true,
  },
  grain: {
    speed: 0.2,
    intensity: 0.08,
    colorA: "#F4EAD6",
    colorB: "#E8DCC4",
    colorC: "#0A0A0A",
    quality: "low",
    maxFPS: 20,
    static: true,
  },
};

function DitherHalftoneSystem({
  mode = "background",
  width = "100%",
  height = "100%",
  className,
  style,
  children,
  speed,
  intensity,
  colorA,
  colorB,
  colorC,
  cursorInteraction,
  quality,
  maxFPS,
  pauseWhenOffscreen,
  static: forceStatic,
  ...rest
}: DitherSystemProps) {
  const reduced = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const preset = MODE_PRESETS[mode];
  const finalSpeed = speed ?? preset.speed ?? 1;
  const finalIntensity = intensity ?? preset.intensity ?? 0.2;
  const finalColorA = colorA ?? preset.colorA ?? "#FFFFFF";
  const finalColorB = colorB ?? preset.colorB ?? "#F4EAD6";
  const finalColorC = colorC ?? preset.colorC ?? "#050505";
  const finalQuality = quality ?? preset.quality ?? "medium";
  const finalMaxFPS = maxFPS ?? preset.maxFPS ?? 45;
  const finalPause = pauseWhenOffscreen ?? preset.pauseWhenOffscreen ?? true;
  const useStatic = forceStatic ?? preset.static ?? false;

  // Visibility observer for perf (pause expensive renders)
  useEffect(() => {
    if (!finalPause || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.05, rootMargin: "200px" }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [finalPause]);

  const shouldRender = !reduced && isVisible;
  const effectiveIntensity = reduced ? Math.min(finalIntensity, 0.05) : finalIntensity;

  // Lightweight static canvas dither for component/grain modes (no Three.js cost)
  const StaticDither = useCallback(() => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.offsetWidth * dpr;
      const h = canvas.offsetHeight * dpr;
      canvas.width = w;
      canvas.height = h;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = finalColorC;
      ctx.fillRect(0, 0, w, h);

      // Bayer-like dither pattern (lightweight, reusable)
      const cell = mode === "grain" ? 2 : 3;
      ctx.fillStyle = finalColorA;
      for (let y = 0; y < h / dpr; y += cell) {
        for (let x = 0; x < w / dpr; x += cell) {
          const n = ((x * 73 + y * 37) % 17) / 17;
          if (n > 0.6) {
            ctx.globalAlpha = 0.12 * effectiveIntensity;
            ctx.fillRect(x, y, cell * 0.6, cell * 0.6);
          }
        }
      }
      ctx.globalAlpha = 1;
    }, [finalColorA, finalColorC, effectiveIntensity, mode]);

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%", mixBlendMode: "screen", opacity: effectiveIntensity }}
      />
    );
  }, [finalColorA, finalColorC, effectiveIntensity, mode]);

  if (useStatic || mode === "component" || mode === "grain") {
    return (
      <div
        ref={containerRef}
        className={cn("relative overflow-hidden", className)}
        style={{ width, height, ...style }}
        data-dither-mode={mode}
        {...rest}
      >
        <StaticDither />
        {children}
      </div>
    );
  }

  // Rich animated modes — delegate to existing proven components
  const commonProps = {
    width,
    height,
    className: cn(
      mode === "selection" && "mix-blend-screen pointer-events-none",
      mode === "loading" && "animate-[ditherPulse_1.8s_ease-in-out_infinite]",
      className
    ),
    speed: finalSpeed,
    intensity: effectiveIntensity,
    primaryColor: finalColorA,
    secondaryColor: finalColorB,
    tertiaryColor: finalColorC,
    quality: finalQuality,
    maxFPS: finalMaxFPS,
    pauseWhenOffscreen: finalPause,
    opacity: effectiveIntensity,
    cursorInteraction: cursorInteraction ?? preset.cursorInteraction,
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height, ...style }}
      data-dither-mode={mode}
      data-state={rest["data-state"]}
      {...rest}
    >
      {mode === "halftone" || mode === "selection" ? (
        <HalftoneWave
          {...commonProps}
          noiseScale={mode === "selection" ? 1.8 : 2.4}
          gridDensity={mode === "selection" ? 38 : 28}
          dotSize={mode === "selection" ? 0.72 : 0.58}
          softness={0.6}
          contrastMin={0.15}
          contrastMax={0.92}
          scrollX={0.08}
          scrollY={0.03}
          rotation={mode === "selection" ? 12 : 0}
          backgroundColor={finalColorC}
        />
      ) : (
        <DitherWave
          {...commonProps}
          downScale={mode === "loading" ? 0.75 : 0.55}
          scale={mode === "loading" ? 3.2 : 4.8}
        />
      )}

      {/* State-specific overlays for IDE polish */}
      {mode === "loading" && (
        <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,rgba(244,234,214,0.06)_4px,transparent_7px)] pointer-events-none" />
      )}
      {mode === "selection" && (
        <div className="absolute inset-0 border border-[rgba(244,234,214,0.35)] rounded-[inherit] pointer-events-none" />
      )}
      {mode === "transition" && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
      )}

      {children}
    </div>
  );
}

export default DitherHalftoneSystem;

/* 
 * Usage examples for Souqy IDE:
 *
 * <DitherHalftoneSystem mode="background" />          // studio atmosphere
 * <DitherHalftoneSystem mode="loading" />             // async generation overlay
 * <DitherHalftoneSystem mode="selection" intensity={0.8} /> // active card/panel
 * <DitherHalftoneSystem mode="component" static />    // button surfaces, inspectors
 *
 * Reusability: import once, use everywhere in studio/builder/portal.
 * Performance: static fallback, intersection pause, reduced-motion clamp, quality presets.
 * Signature: always respects --sqs-cream / coal palette via presets.
 */
