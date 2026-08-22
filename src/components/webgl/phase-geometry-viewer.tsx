"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createMeridianRenderer,
  disposeScene,
  observeContextLoss,
  observeResizes,
  observeVisibility,
  sizeRendererToContainer,
} from "./engine";
import { frameLoop, prefersReducedMotion } from "@/lib/motion";
import { scrollState } from "@/lib/scroll";
import { clamp } from "@/lib/utils";

/**
 * PhaseGeometryViewer — the phase instrument, rebuilt.
 *
 * What made the old version poor (flat solid + lazy wireframe + halo ring,
 * no tone mapping) is gone. The new object is a dark-glass solid lit by a
 * fresnel-rim shader, set inside a compass-dial of tick marks, floating over
 * a fading floor grid with a soft contact shadow. ACES tone mapping gives
 * the highlights a filmic roll-off. Scroll progress still drives the
 * quaternion rotation; drag still lets you inspect it by hand; the loop
 * still pauses offscreen and freezes to one frame under reduced motion.
 */

interface PhaseGeometryViewerProps {
  phaseNumber: number;
  phaseName: string;
  cleared?: boolean;
  locked?: boolean;
  progressPercent?: number;
  size?: "sm" | "md" | "lg";
}

/* Fresnel-rim material: dark body, bone rim light, single key light. */
const instrumentVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDirW = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const instrumentFragment = /* glsl */ `
  uniform vec3 uBody;
  uniform vec3 uRim;
  uniform vec3 uKey;
  uniform float uRimPower;
  uniform float uIntensity;
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  void main() {
    vec3 normal = normalize(vNormalW);
    vec3 viewDir = normalize(vViewDirW);
    // Fresnel rim: brightest where the surface turns away from the eye.
    float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), uRimPower);
    // One soft key light from upper-left, plus gentle fill from below.
    vec3 keyDir = normalize(vec3(-0.45, 0.85, 0.55));
    vec3 fillDir = normalize(vec3(0.3, -0.6, 0.5));
    float diffuse = max(dot(normal, keyDir), 0.0) * 0.32 + max(dot(normal, fillDir), 0.0) * 0.1;
    vec3 color = uBody + uBody * diffuse + uRim * fresnel * uIntensity;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function geometryForPhase(phaseNumber: number): THREE.BufferGeometry {
  switch (phaseNumber) {
    case 1:
      return new THREE.OctahedronGeometry(1.24, 2);
    case 2:
      return new THREE.DodecahedronGeometry(1.18, 1);
    case 3:
      return new THREE.IcosahedronGeometry(1.22, 2);
    default:
      return new THREE.TorusKnotGeometry(0.74, 0.27, 160, 32);
  }
}

export function PhaseGeometryViewer({
  phaseNumber,
  phaseName,
  cleared = false,
  locked = false,
  progressPercent = 0,
  size = "md",
}: PhaseGeometryViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const renderer = createMeridianRenderer(canvas);
    if (!renderer) {
      setFailed(true);
      return;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0.55, 4.9);
    camera.lookAt(0, -0.05, 0);

    const rim = new THREE.Color(cleared ? 0x9db3a8 : locked ? 0x565b59 : 0xeeeae2);

    /* The solid -------------------------------------------------- */
    const geometry = geometryForPhase(phaseNumber);
    const solidMaterial = new THREE.ShaderMaterial({
      vertexShader: instrumentVertex,
      fragmentShader: instrumentFragment,
      uniforms: {
        uBody: { value: new THREE.Color(0x0e1113) },
        uRim: { value: rim },
        uKey: { value: new THREE.Color(0xeeeae2) },
        uRimPower: { value: 2.1 },
        uIntensity: { value: locked ? 0.5 : 1.0 },
      },
    });
    const solid = new THREE.Mesh(geometry, solidMaterial);
    const stage = new THREE.Group();
    stage.add(solid);
    scene.add(stage);

    /* Compass dial: thin ring + 28 tick marks --------------------- */
    const dial = new THREE.Group();
    const ringGeometry = new THREE.TorusGeometry(1.92, 0.008, 8, 160);
    const dialMaterial = new THREE.MeshBasicMaterial({ color: rim, transparent: true, opacity: 0.5 });
    dial.add(new THREE.Mesh(ringGeometry, dialMaterial));
    const tickGeometry = new THREE.BoxGeometry(0.012, 0.075, 0.012);
    const tickMaterial = new THREE.MeshBasicMaterial({ color: rim, transparent: true, opacity: 0.85 });
    const tickCount = 28;
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      const tick = new THREE.Mesh(i % 7 === 0 ? new THREE.BoxGeometry(0.016, 0.14, 0.016) : tickGeometry, tickMaterial);
      tick.position.set(Math.cos(angle) * 1.92, 0, Math.sin(angle) * 1.92);
      tick.rotation.y = -angle;
      dial.add(tick);
    }
    dial.rotation.x = Math.PI / 2.18;
    stage.add(dial);

    /* Particle shell ---------------------------------------------- */
    const particleCount = 110;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 2.15 + Math.random() * 0.7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.cos(phi) * 0.55;
      particlePositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: rim,
      size: 0.028,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    /* Floor grid + contact shadow ---------------------------------- */
    const grid = new THREE.GridHelper(9, 22, 0x3d4142, 0x22262a);
    grid.position.y = -1.62;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    scene.add(grid);

    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext("2d");
    if (shadowContext) {
      const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 62);
      gradient.addColorStop(0, "rgba(0,0,0,0.62)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.6;
    scene.add(shadow);

    /* Drag interaction --------------------------------------------- */
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let dragX = 0;
    let dragY = 0;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      container.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      dragY += (event.clientX - lastX) * 0.0085;
      dragX += (event.clientY - lastY) * 0.0085;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
    };
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);

    let visible = true;
    const visibilityHandle = observeVisibility(container, (value) => {
      visible = value;
    });
    const resizeHandle = observeResizes(container, () => sizeRendererToContainer(renderer, container, camera));
    const contextHandle = observeContextLoss(canvas, () => {
      setFailed(true);
      stop();
    });

    /* Motion -------------------------------------------------------- */
    const scrollAxis = new THREE.Vector3(0.3, 1, 0.16).normalize();
    const scrollQuaternion = new THREE.Quaternion();
    const dragQuaternion = new THREE.Quaternion();
    const eulerHelper = new THREE.Euler();
    const baseFloat = Math.random() * Math.PI * 2;

    const renderFrame = (time: number) => {
      const seconds = time / 1000;
      const scrollAngle = scrollState.progress * Math.PI * 2;
      scrollQuaternion.setFromAxisAngle(scrollAxis, scrollAngle);
      eulerHelper.set(dragX, dragY, 0);
      dragQuaternion.setFromEuler(eulerHelper);
      stage.quaternion.slerpQuaternions(scrollQuaternion, dragQuaternion, 0.55);
      // Gentle idle drift + float (skipped when locked — the object sleeps).
      if (!locked) {
        stage.rotateY(seconds * 0.00016);
        stage.position.y = Math.sin(seconds * 0.7 + baseFloat) * 0.05;
      }
      dial.rotation.z = seconds * 0.00004;
      particles.rotation.y = seconds * 0.00003;
      renderer.render(scene, camera);
    };

    let unsubscribeFrame: (() => void) | null = null;
    function stop() {
      unsubscribeFrame?.();
      unsubscribeFrame = null;
    }

    sizeRendererToContainer(renderer, container, camera);

    if (prefersReducedMotion()) {
      renderFrame(performance.now());
    } else {
      unsubscribeFrame = frameLoop.subscribe((_, delta) => {
        if (!visible) return;
        renderFrame(performance.now());
        void delta;
      });
    }

    return () => {
      stop();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      visibilityHandle.dispose();
      resizeHandle.dispose();
      contextHandle.dispose();
      disposeScene(scene);
      grid.geometry.dispose();
      ringGeometry.dispose();
      tickGeometry.dispose();
      particleGeometry.dispose();
      shadowTexture.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
    };
    // Rebuild only when the phase shape or state genuinely changes.
  }, [phaseNumber, cleared, locked]);

  return (
    <div>
      <div
        className={`phase-geometry-container size-${size}`}
        ref={containerRef}
        role="img"
        aria-label={`${phaseName} phase instrument`}
      >
        <canvas ref={canvasRef} className="phase-geometry-canvas" aria-hidden="true" />
        {failed && <div className="webgl-fallback">instrument offline</div>}
        <div className="phase-geometry-overlay">
          <span className="geometry-phase-tag">Phase 0{clamp(phaseNumber, 1, 4)} — {phaseName}</span>
          <span className="geometry-phase-status">
            {cleared ? "cleared" : locked ? "locked" : `${Math.round(progressPercent)}% capability`}
          </span>
        </div>
      </div>
      <div className="geometry-caption">
        <span>drag to inspect · scroll rotates</span>
        <span>fresnel instrument · local render</span>
      </div>
    </div>
  );
}
