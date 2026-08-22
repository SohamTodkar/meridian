"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createMeridianRenderer,
  observeContextLoss,
  observeResizes,
  observeVisibility,
  trackPointer,
} from "./engine";
import { blackholeFragmentShader, blackholeVertexShader } from "./blackhole-shader";
import { frameLoop, prefersReducedMotion } from "@/lib/motion";
import { damp } from "@/lib/utils";

/**
 * MeridianHeroCanvas — the Gargantua core.
 *
 * A real raytraced black hole replaces the sigil: per-pixel geodesic
 * integration bends light around the event horizon, the Keplerian
 * accretion disk is lensed into the iconic halo, Doppler beaming brightens
 * the approaching side, and escaping rays land on a lensed starfield.
 *
 * Interaction contract: the camera orbits with the cursor (lerped, never
 * re-rendered through React), pointer-velocity energy drives the disk
 * turbulence, and an adaptive resolution guard drops the pixel ratio once
 * if a device can't hold the frame budget. The loop pauses offscreen,
 * renders a single static frame under reduced motion, and the whole
 * pipeline disposes on unmount.
 */

interface MeridianHeroCanvasProps {
  phaseProgress?: number;
  activePhaseNumber?: number;
}

export function MeridianHeroCanvas({
  phaseProgress = 0,
  activePhaseNumber = 1,
}: MeridianHeroCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState<"webgl" | "context" | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const reducedMotion = prefersReducedMotion();

    const renderer = createMeridianRenderer(canvas);
    if (!renderer) {
      setFailed("webgl");
      return;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    // Start conservative; the frame-budget guard below may lower it once.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      vertexShader: blackholeVertexShader,
      fragmentShader: blackholeFragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3() },
        uCamMatrix: { value: new THREE.Matrix3() },
        uFov: { value: Math.tan((52 * Math.PI) / 360) },
        uEnergy: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    /* Camera orbit state — the Interstellar view: just above the disk. */
    const BASE_DISTANCE = 14.2;
    const BASE_ELEVATION = 0.13;
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, energy: 0 };
    const camPos = new THREE.Vector3();
    const target = new THREE.Vector3(0, 0, 0);
    const m = new THREE.Matrix4();
    const basis = new THREE.Matrix3();

    function updateCamera(time: number) {
      const azimuth = pointer.sx * 0.42 + time * 0.008;
      const elevation = BASE_ELEVATION - pointer.sy * 0.2;
      camPos.set(
        Math.sin(azimuth) * Math.cos(elevation) * BASE_DISTANCE,
        Math.sin(elevation) * BASE_DISTANCE,
        Math.cos(azimuth) * Math.cos(elevation) * BASE_DISTANCE,
      );
      m.lookAt(camPos, target, THREE.Object3D.DEFAULT_UP);
      basis.setFromMatrix4(m);
      (material.uniforms.uCamPos.value as THREE.Vector3).copy(camPos);
      (material.uniforms.uCamMatrix.value as THREE.Matrix3).copy(basis);
    }

    const syncResolution = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return false;
      renderer.setSize(width, height, false);
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      (material.uniforms.uResolution.value as THREE.Vector2).copy(size);
      return true;
    };

    /* Observers ---------------------------------------------------------- */
    const pointerHandle = trackPointer(container, (x, y, vx, vy) => {
      pointer.x = x;
      pointer.y = y;
      pointer.energy = Math.min(1, pointer.energy + Math.hypot(vx, vy) * 0.7);
    });
    let visible = true;
    const visibilityHandle = observeVisibility(container, (value) => {
      visible = value;
    });
    const resizeHandle = observeResizes(container, syncResolution);
    const contextHandle = observeContextLoss(canvas, () => {
      setFailed("context");
      stop();
    });

    /* Frame loop with a one-way adaptive resolution guard. -------------- */
    const clock = new THREE.Clock();
    let slowFrames = 0;
    let degraded = false;

    const renderFrame = (deltaMs: number) => {
      const time = clock.getElapsedTime();
      pointer.sx = damp(pointer.sx, pointer.x, 0.0015, deltaMs);
      pointer.sy = damp(pointer.sy, pointer.y, 0.0015, deltaMs);
      pointer.energy *= 0.94;
      material.uniforms.uTime.value = time;
      material.uniforms.uEnergy.value = pointer.energy;
      updateCamera(time);
      renderer.render(scene, camera);
    };

    let unsubscribeFrame: (() => void) | null = null;
    function stop() {
      unsubscribeFrame?.();
      unsubscribeFrame = null;
    }

    syncResolution();

    if (reducedMotion) {
      renderFrame(16.7); // one settled frame, then stillness
    } else {
      unsubscribeFrame = frameLoop.subscribe((_, delta) => {
        if (!visible) return;
        renderFrame(delta);
        // Frame-budget guard: 14 consecutive slow frames → drop DPR once.
        if (!degraded) {
          if (delta > 24) {
            slowFrames += 1;
            if (slowFrames > 14) {
              renderer.setPixelRatio(1);
              syncResolution();
              degraded = true;
            }
          } else {
            slowFrames = Math.max(0, slowFrames - 1);
          }
        }
      });
    }

    return () => {
      stop();
      pointerHandle.dispose();
      visibilityHandle.dispose();
      resizeHandle.dispose();
      contextHandle.dispose();
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="meridian-hero-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="meridian-hero-canvas" aria-hidden="true" />
      {failed ? (
        <div className="webgl-fallback" role="status">
          {failed === "context" ? "core paused — gpu context lost" : "core unavailable — quiet mode"}
        </div>
      ) : (
        <div className="canvas-telemetry-badge">
          <span className="telemetry-dot" />
          <span>Gargantua core · Phase {activePhaseNumber} · {Math.round(phaseProgress)}%</span>
        </div>
      )}
    </div>
  );
}
