"use client";

/**
 * Shared WebGL engine plumbing: renderer setup, visibility gating, resize
 * observation, context-loss recovery, and complete disposal. Every canvas in
 * Meridian goes through these helpers so the performance rules (DPR clamp,
 * pause offscreen, leak-free teardown) hold everywhere.
 */

import * as THREE from "three";

export interface EngineHandles {
  dispose: () => void;
}

export function createMeridianRenderer(
  canvas: HTMLCanvasElement,
  options: { preserveDrawingBuffer?: boolean } = {},
): THREE.WebGLRenderer | null {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    return renderer;
  } catch {
    return null;
  }
}

export function sizeRendererToContainer(
  renderer: THREE.WebGLRenderer,
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
): boolean {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width === 0 || height === 0) return false;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  return true;
}

export function observeVisibility(container: HTMLElement, onChange: (visible: boolean) => void): EngineHandles {
  if (typeof IntersectionObserver === "undefined") {
    onChange(true);
    return { dispose: () => {} };
  }
  const observer = new IntersectionObserver((entries) => onChange(entries[0]?.isIntersecting ?? true), { threshold: 0.02 });
  observer.observe(container);
  return { dispose: () => observer.disconnect() };
}

export function observeResizes(container: HTMLElement, onResize: () => void): EngineHandles {
  if (typeof ResizeObserver === "undefined") {
    const handler = () => onResize();
    window.addEventListener("resize", handler);
    return { dispose: () => window.removeEventListener("resize", handler) };
  }
  const observer = new ResizeObserver(() => onResize());
  observer.observe(container);
  return { dispose: () => observer.disconnect() };
}

export function observeContextLoss(canvas: HTMLCanvasElement, onLost: () => void): EngineHandles {
  const handler = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", handler);
  return { dispose: () => canvas.removeEventListener("webglcontextlost", handler) };
}

/** Pointer normalised to [-1, 1] within a container, passive listeners. */
export function trackPointer(
  container: HTMLElement,
  onMove: (x: number, y: number, velocityX: number, velocityY: number) => void,
): EngineHandles {
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  const handle = (clientX: number, clientY: number) => {
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const now = performance.now();
    const dt = Math.max(8, now - lastTime);
    const vx = lastTime ? (clientX - lastX) / dt : 0;
    const vy = lastTime ? (clientY - lastY) / dt : 0;
    lastX = clientX;
    lastY = clientY;
    lastTime = now;
    onMove(x, y, vx, vy);
  };
  const onMouse = (event: MouseEvent) => handle(event.clientX, event.clientY);
  const onTouch = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (touch) handle(touch.clientX, touch.clientY);
  };
  window.addEventListener("mousemove", onMouse, { passive: true });
  container.addEventListener("touchmove", onTouch, { passive: true });
  return {
    dispose: () => {
      window.removeEventListener("mousemove", onMouse);
      container.removeEventListener("touchmove", onTouch);
    },
  };
}

/** Dispose every geometry, material and texture in a scene graph. */
export function disposeScene(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    const list = Array.isArray(material) ? material : [material];
    for (const item of list) {
      for (const value of Object.values(item)) {
        const texture = value as THREE.Texture | undefined;
        if (texture && texture.isTexture) texture.dispose();
      }
      item.dispose();
    }
  });
}
