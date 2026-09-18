"use client";

import { useEffect, useRef, useState } from "react";
import { observeResizes, observeVisibility } from "./engine";
import { frameLoop, prefersReducedMotion } from "@/lib/motion";
import { clamp, damp } from "@/lib/utils";

/**
 * ConstellationCanvas — the journey as a star map.
 *
 * Four glowing phase "stars" sit in a loose diamond, connected by faint
 * orbiting transfer arcs. Twinkling background stars drift with a slow
 * cursor parallax, and a pulsing "you are here" beacon rides the active
 * star. Clicking a star selects its phase.
 *
 * Rendered with canvas2D (crisp dots and labels, no GPU context needed),
 * DPR-clamped, paused offscreen/hidden, one static frame under reduced
 * motion, and fully torn down on unmount.
 */

export interface ConstellationPhase {
  id: string;
  name: string;
  number: number;
  percent: number;
  active: boolean;
  cleared: boolean;
}

export interface ConstellationCanvasProps {
  phases: ConstellationPhase[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

interface StarPoint {
  x: number; // normalized 0..1
  y: number;
}

interface Twinkle {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  depth: number; // parallax depth 0..1
}

/** Phase star layout in normalized space — a loose ascending diamond. */
const STAR_LAYOUT: StarPoint[] = [
  { x: 0.14, y: 0.68 },
  { x: 0.4, y: 0.34 },
  { x: 0.62, y: 0.62 },
  { x: 0.86, y: 0.28 },
];

const AMBER = "rgba(245, 167, 66,";
const VIOLET = "rgba(187, 160, 239,";
const BONE = "rgba(232, 226, 214,";

export function ConstellationCanvas({ phases, selectedId, onSelect }: ConstellationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Refs that always mirror the latest props — the draw loop reads these
  // instead of closing over stale React state.
  const phasesRef = useRef(phases);
  const selectedRef = useRef(selectedId ?? null);
  const hoveredRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const pointerRef = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const twinklesRef = useRef<Twinkle[] | null>(null);

  useEffect(() => {
    hoveredRef.current = hoveredId;
  }, [hoveredId]);

  useEffect(() => {
    phasesRef.current = phases;
    selectedRef.current = selectedId ?? null;
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const reducedMotion = prefersReducedMotion();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    // Deterministic twinkle field so re-mounts look identical.
    if (!twinklesRef.current) {
      const rand = mulberry32(0x5eed);
      const twinkles: Twinkle[] = [];
      for (let i = 0; i < 90; i++) {
        twinkles.push({
          x: rand(),
          y: rand(),
          r: 0.4 + rand() * 1.3,
          phase: rand() * Math.PI * 2,
          speed: 0.4 + rand() * 1.6,
          depth: 0.25 + rand() * 0.75,
        });
      }
      twinklesRef.current = twinkles;
    }

    const syncSize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      if (width === 0 || height === 0) return false;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    };


    /** Phase star positions in canvas pixels, with parallax applied. */
    const starPositions = (): Array<{ id: string; x: number; y: number }> => {
      const { sx, sy } = pointerRef.current;
      return phasesRef.current.slice(0, STAR_LAYOUT.length).map((phase, i) => {
        const layout = STAR_LAYOUT[i];
        return {
          id: phase.id,
          x: layout.x * width + sx * 6,
          y: layout.y * height + sy * 4,
        };
      });
    };

    const hitTest = (clientX: number, clientY: number): string | null => {
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      for (const star of starPositions()) {
        if (Math.hypot(px - star.x, py - star.y) < 22) return star.id;
      }
      return null;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointerRef.current.y = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
      const hit = hitTest(event.clientX, event.clientY);
      setHoveredId((prev) => (prev === hit ? prev : hit));
    };
    const onPointerLeave = () => {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
      setHoveredId((prev) => (prev === null ? prev : null));
    };
    const onClick = (event: MouseEvent) => {
      const hit = hitTest(event.clientX, event.clientY);
      if (hit) onSelectRef.current?.(hit);
    };
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    canvas.addEventListener("click", onClick);

    let visible = true;
    const visibilityHandle = observeVisibility(container, (value) => {
      visible = value;
    });
    const resizeHandle = observeResizes(container, () => {
      if (syncSize() && reducedMotion) drawFrame(16.7, 0);
    });

    function drawFrame(deltaMs: number, time: number) {
      if (width === 0 || height === 0) return;
      const pointer = pointerRef.current;
      pointer.sx = damp(pointer.sx, pointer.x, 0.002, deltaMs);
      pointer.sy = damp(pointer.sy, pointer.y, 0.002, deltaMs);
      const { sx, sy } = pointer;

      const current = phasesRef.current;
      const selected = selectedRef.current;
      const hovered = hoveredRef.current;
      const twinkles = twinklesRef.current ?? [];

      ctx.clearRect(0, 0, width, height);

      /* Twinkling background stars, drifting with cursor parallax. */
      for (const tw of twinkles) {
        const px = tw.x * width - sx * 14 * tw.depth;
        const py = tw.y * height - sy * 10 * tw.depth;
        const alpha = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(time * tw.speed + tw.phase));
        ctx.beginPath();
        ctx.arc(px, py, tw.r, 0, Math.PI * 2);
        ctx.fillStyle = BONE + alpha.toFixed(3) + ")";
        ctx.fill();
      }

      const stars = starPositions();


      /* Faint transfer arcs between consecutive phase stars. Each arc is a
         quadratic bezier bowed toward the map centre; a bright comet dot
         orbits along each arc endlessly. */
      for (let i = 0; i < stars.length - 1; i++) {
        const a = stars[i];
        const b = stars[i + 1];
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const cx = midX + (width / 2 - midX) * 0.22;
        const cy = midY + (height / 2 - midY) * 0.22 - 18;

        const done = current[i].cleared;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cx, cy, b.x, b.y);
        ctx.strokeStyle = done ? AMBER + "0.42)" : VIOLET + "0.22)";
        ctx.lineWidth = done ? 1.1 : 0.8;
        ctx.setLineDash(done ? [] : [3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Orbiting comet dot travelling along the transfer arc.
        const t = (time * (0.06 + i * 0.017) + i * 0.33) % 1;
        const inv = 1 - t;
        const cometX = inv * inv * a.x + 2 * inv * t * cx + t * t * b.x;
        const cometY = inv * inv * a.y + 2 * inv * t * cy + t * t * b.y;
        const cometAlpha = 0.28 + 0.5 * Math.sin(t * Math.PI);
        ctx.beginPath();
        ctx.arc(cometX, cometY, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = (done ? AMBER : VIOLET) + cometAlpha.toFixed(3) + ")";
        ctx.fill();
      }

      /* Phase stars: halo, core, slow orbiting ring, label, percent. */
      current.slice(0, stars.length).forEach((phase, i) => {
        const star = stars[i];
        const isSelected = phase.id === selected;
        const isHovered = phase.id === hovered;
        const isActive = phase.active;
        const coreR = 4.2 + (isSelected ? 1.2 : 0) + (isHovered ? 0.9 : 0);
        const tint = phase.cleared ? AMBER : isActive ? BONE : VIOLET;

        // Soft radial halo.
        const haloR = coreR * (isSelected || isHovered ? 6.5 : 5);
        const halo = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, haloR);
        halo.addColorStop(0, tint + (isActive ? 0.5 : 0.3) + ")");
        halo.addColorStop(1, tint + "0)");
        ctx.beginPath();
        ctx.arc(star.x, star.y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Slow orbiting ring (a transfer-orbit tick circling each star).
        const ringR = coreR + 5.5;
        const tickA = time * (0.5 + i * 0.11);
        ctx.beginPath();
        ctx.arc(star.x, star.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = tint + "0.18)";
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(star.x + Math.cos(tickA) * ringR, star.y + Math.sin(tickA) * ringR, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = tint + "0.8)";
        ctx.fill();

        // Core.
        ctx.beginPath();
        ctx.arc(star.x, star.y, coreR, 0, Math.PI * 2);
        ctx.fillStyle = tint + (isActive ? "1)" : phase.cleared ? "0.95)" : "0.55)");
        ctx.fill();


        // "You are here" pulsing beacon on the active phase.
        if (isActive) {
          const pulse = 0.5 + 0.5 * Math.sin(time * 2.6);
          ctx.beginPath();
          ctx.arc(star.x, star.y, ringR + 3 + pulse * 4, 0, Math.PI * 2);
          ctx.strokeStyle = BONE + (0.5 * (1 - pulse)).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Labels.
        ctx.textAlign = "center";
        ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = VIOLET + "0.75)";
        ctx.fillText(`0${clamp(phase.number, 1, 9)}`, star.x, star.y - 18);
        ctx.font = "500 11px system-ui, sans-serif";
        ctx.fillStyle = BONE + (isSelected || isHovered ? "0.95)" : "0.72)");
        ctx.fillText(phase.name, star.x, star.y + 26);
        ctx.font = "400 9px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = (phase.cleared ? AMBER : VIOLET) + "0.7)";
        ctx.fillText(phase.cleared ? "cleared" : `${Math.round(phase.percent)}%`, star.x, star.y + 39);
      });
    }

    syncSize();

    let unsubscribeFrame: (() => void) | null = null;
    let slowFrames = 0;
    let degraded = false;
    if (reducedMotion) {
      drawFrame(16.7, 0); // one static frame, then stillness
    } else {
      unsubscribeFrame = frameLoop.subscribe((time, delta) => {
        if (!visible) return;
        drawFrame(delta, time / 1000);
        // Frame-budget guard: sustained slow frames → drop DPR once.
        if (!degraded) {
          if (delta > 24) {
            slowFrames += 1;
            if (slowFrames > 20 && dpr > 1) {
              dpr = 1;
              syncSize();
              degraded = true;
            }
          } else {
            slowFrames = Math.max(0, slowFrames - 1);
          }
        }
      });
    }

    return () => {
      unsubscribeFrame?.();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
      visibilityHandle.dispose();
      resizeHandle.dispose();
      canvas.width = 0;
      canvas.height = 0;
    };
    // The draw loop reads live values through refs; mount once.
  }, []);

  return (
    <div className="constellation-canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="constellation-canvas"
        role="img"
        aria-label="Interactive phase star map"
        style={{ cursor: hoveredId ? "pointer" : "default" }}
      />
    </div>
  );
}

