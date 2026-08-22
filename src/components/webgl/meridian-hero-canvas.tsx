"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createMeridianRenderer,
  disposeScene,
  observeContextLoss,
  observeResizes,
  observeVisibility,
  sizeRendererToContainer,
  trackPointer,
} from "./engine";
import {
  basicVertexShader,
  contactShadowFragmentShader,
  fluidBlobFragmentShader,
} from "./shaders";
import { loadHeroTextures } from "./textures";
import { ASSET_PATHS } from "@/lib/assets";
import { frameLoop, prefersReducedMotion } from "@/lib/motion";
import { subscribeScroll } from "@/lib/scroll";
import { damp } from "@/lib/utils";

/**
 * MeridianHeroCanvas — the Meridian sigil.
 *
 * Composition (rebuilt for clarity after the layered texture plate read as
 * noise instead of an instrument):
 *
 *   1. Engraved astrolabe chart — a backdrop plane whose vertex shader still
 *      displaces through the depth map (multi-layer parallax, scroll-linked
 *      breathing), while the fragment shader draws precise concentric rings
 *      and radial hairlines. Sharp, quiet, intentional.
 *   2. The core — the glTF knot (PBR bone-metal), revealed through a
 *      simplex-noise fluid-blob alpha mask that trails the cursor and swells
 *      with pointer velocity (rendered to its own GPU target).
 *   3. The compass dial — a thin ring with 28 tick marks and four phase
 *      beacons that reflect the learner's current phase and capability.
 *   4. Depth dressing — particle shell, floor grid, contact shadow, ACES
 *      tone mapping.
 *
 * All animation is uniforms and object transforms mutated in the frame loop;
 * React state is never touched per frame. The loop pauses offscreen, renders
 * a single static frame under reduced motion, and the graph fully disposes.
 */

interface MeridianHeroCanvasProps {
  phaseProgress?: number;
  activePhaseNumber?: number;
}

/* Engraved chart backdrop: depth-map parallax + hairline rings and spokes. */
const chartVertexShader = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uDepthScale;
  uniform vec2 uParallax;
  uniform float uBreath;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    float depth = texture2D(uDepth, uv).r;
    vDepth = depth;
    vec3 displaced = position;
    displaced.xy += uParallax * uDepthScale * depth;
    displaced.z += uBreath * uDepthScale * 0.4 * depth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const chartFragmentShader = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uBone;
  varying vec2 vUv;
  varying float vDepth;

  float ringLine(float radius, float spacing, float thickness) {
    float r = fract(radius / spacing);
    float distanceToLine = abs(r - 0.5);
    return 1.0 - smoothstep(0.0, thickness, distanceToLine);
  }

  void main() {
    vec2 centered = vUv - 0.5;
    float radius = length(centered) * 2.0; // 0 at centre, 1 at mid-edge
    float angle = atan(centered.y, centered.x);

    // Concentric meridian rings, denser toward the rim.
    float rings = ringLine(radius, 0.16, 0.045) * 0.7
                + ringLine(radius, 0.065, 0.03) * 0.28;
    // 24 radial hairlines.
    float spokes = 1.0 - smoothstep(0.0, 0.011, abs(fract(angle / 6.2831853 * 24.0) - 0.5));
    // Depth lifts the line brightness slightly — the chart breathes with scroll.
    float lift = 0.55 + vDepth * 0.45;

    // Circular vignette so the chart floats instead of filling the frame.
    float fade = smoothstep(1.02, 0.62, radius);

    float ink = (rings * 0.5 + spokes * 0.22) * fade * lift;
    vec3 color = mix(uInk, uBone, ink);
    gl_FragColor = vec4(color, ink * 0.85);
  }
`;

export function MeridianHeroCanvas({
  phaseProgress = 0,
  activePhaseNumber = 1,
}: MeridianHeroCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState<"webgl" | "context" | null>(null);
  const phaseRef = useRef({ number: activePhaseNumber, progress: phaseProgress });

  useEffect(() => {
    phaseRef.current = { number: activePhaseNumber, progress: phaseProgress };
  }, [activePhaseNumber, phaseProgress]);

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
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 0.34, 5.55);
    camera.lookAt(0, -0.04, 0);

    /* Interactive state (uniform targets, mutated in the loop) --------- */
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, energy: 0 };
    let breath = 0;
    let scrollProgress = 0;
    let visible = true;

    /* Lighting for the PBR core ---------------------------------------- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const keyLight = new THREE.DirectionalLight(0xeeeae2, 1.9);
    keyLight.position.set(5, 6, 7);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x83968d, 1.0);
    rimLight.position.set(-6, -3, -5);
    scene.add(rimLight);

    /* 1 · Engraved chart backdrop (depth-map parallax) ------------------ */
    let chartMaterial: THREE.ShaderMaterial | null = null;
    let chartUniforms: {
      uDepth: { value: THREE.Texture | null };
      uDepthScale: { value: number };
      uParallax: { value: THREE.Vector2 };
      uBreath: { value: number };
    } | null = null;
    let cancelled = false;
    void loadHeroTextures()
      .then((textures) => {
        if (cancelled) return;
        chartUniforms = {
          uDepth: { value: textures.depth },
          uDepthScale: { value: 0.16 },
          uParallax: { value: new THREE.Vector2() },
          uBreath: { value: 0 },
        };
        chartMaterial = new THREE.ShaderMaterial({
          vertexShader: chartVertexShader,
          fragmentShader: chartFragmentShader,
          uniforms: {
            ...chartUniforms,
            uInk: { value: new THREE.Color(0x0a0c0d) },
            uBone: { value: new THREE.Color(0xeeeae2) },
          },
          transparent: true,
          depthWrite: false,
        });
        const chart = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 3.9, 96, 96), chartMaterial);
        chart.position.z = -0.85;
        scene.add(chart);
      })
      .catch(() => {
        /* Offline first run: the dial, core and dressing still carry the hero. */
      });

    /* 2 · The core — glTF knot revealed by the fluid-blob mask ----------- */
    const maskResolutionUniform = { value: new THREE.Vector2(1, 1) };
    const maskUniform = { value: null as THREE.Texture | null };
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.02, 0.35);
    coreGroup.scale.setScalar(0.8);
    scene.add(coreGroup);

    const gltfLoader = new GLTFLoader();
    void gltfLoader
      .loadAsync(ASSET_PATHS.model)
      .then((gltf) => {
        if (cancelled) return;
        gltf.scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
          const masked = material.clone();
          masked.transparent = true;
          masked.onBeforeCompile = (shader) => {
            shader.uniforms.uMask = maskUniform;
            shader.uniforms.uMaskResolution = maskResolutionUniform;
            shader.fragmentShader =
              "uniform sampler2D uMask;\nuniform vec2 uMaskResolution;\n" +
              shader.fragmentShader.replace(
                "#include <color_fragment>",
                `#include <color_fragment>
                 float maskValue = texture2D(uMask, gl_FragCoord.xy / uMaskResolution).r;
                 diffuseColor.a *= (0.07 + 0.93 * maskValue);`,
              );
          };
          masked.customProgramCacheKey = () => "meridian-fluid-mask";
          mesh.material = masked;
          mesh.renderOrder = 10;
        });
        coreGroup.add(gltf.scene);
      })
      .catch(() => {
        /* Model missing: the chart and dial carry the hero alone. */
      });

    /* 3 · Compass dial with tick marks and phase beacons ------------------ */
    const dial = new THREE.Group();
    dial.rotation.x = Math.PI / 2.3;
    scene.add(dial);
    const dialGeometry = new THREE.TorusGeometry(1.72, 0.009, 8, 160);
    const dialMaterial = new THREE.MeshBasicMaterial({ color: 0xc4c0b8, transparent: true, opacity: 0.55 });
    dial.add(new THREE.Mesh(dialGeometry, dialMaterial));
    const tickGeometry = new THREE.BoxGeometry(0.013, 0.08, 0.013);
    const tickMaterial = new THREE.MeshBasicMaterial({ color: 0x969997, transparent: true, opacity: 0.8 });
    const tickCount = 28;
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      const major = i % 7 === 0;
      const tick = new THREE.Mesh(major ? new THREE.BoxGeometry(0.018, 0.15, 0.018) : tickGeometry, tickMaterial);
      tick.position.set(Math.cos(angle) * 1.72, 0, Math.sin(angle) * 1.72);
      tick.rotation.y = -angle;
      dial.add(tick);
    }

    const beaconGeometry = new THREE.SphereGeometry(0.055, 14, 14);
    const beaconMaterials: THREE.MeshStandardMaterial[] = [];
    const beacons: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const material = new THREE.MeshStandardMaterial({ color: 0x3e4342, metalness: 0.8, roughness: 0.25, emissive: 0x000000 });
      const beacon = new THREE.Mesh(beaconGeometry, material);
      beacons.push(beacon);
      beaconMaterials.push(material);
      scene.add(beacon);
    }

    /* 4 · Depth dressing: particles, floor grid, contact shadow ---------- */
    const particleCount = 120;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 2.05 + Math.random() * 0.75;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.cos(phi) * 0.6;
      particlePositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xeeeae2,
      size: 0.03,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const grid = new THREE.GridHelper(8, 18, 0x3d4142, 0x1e2225);
    grid.position.y = -1.55;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    const shadowMat = new THREE.ShaderMaterial({
      vertexShader: basicVertexShader,
      fragmentShader: contactShadowFragmentShader,
      uniforms: { uStrength: { value: 0.6 } },
      transparent: true,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.1), shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, -1.52, 0.3);
    scene.add(contactShadow);

    /* Fluid-blob mask pipeline ------------------------------------------- */
    const maskScene = new THREE.Scene();
    const maskCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const blobMaterial = new THREE.ShaderMaterial({
      vertexShader: basicVertexShader,
      fragmentShader: fluidBlobFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(256, 256) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPointerVel: { value: new THREE.Vector2(0, 0) },
        uEnergy: { value: 0 },
      },
      transparent: true,
    });
    const maskPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blobMaterial);
    maskScene.add(maskPlane);
    const maskRenderTarget = new THREE.WebGLRenderTarget(256, 256, { depthBuffer: false });
    maskUniform.value = maskRenderTarget.texture;

    /* Observers ------------------------------------------------------------ */
    const pointerHandle = trackPointer(container, (x, y, vx, vy) => {
      pointer.x = x;
      pointer.y = y;
      pointer.vx = vx;
      pointer.vy = vy;
      pointer.energy = Math.min(1, pointer.energy + Math.hypot(vx, vy) * 0.65);
    });
    const visibilityHandle = observeVisibility(container, (value) => {
      visible = value;
    });
    const resizeHandle = observeResizes(container, () => {
      if (sizeRendererToContainer(renderer, container, camera)) {
        maskResolutionUniform.value.copy(renderer.getDrawingBufferSize(new THREE.Vector2()));
      }
    });
    const contextHandle = observeContextLoss(canvas, () => {
      setFailed("context");
      stop();
    });
    const unsubscribeScroll = subscribeScroll(({ progress }) => {
      scrollProgress = progress;
    });

    /* Phase beacon refresh (mutates materials — no scene rebuild) ---------- */
    const refreshBeacons = () => {
      const { number, progress } = phaseRef.current;
      beacons.forEach((beacon, index) => {
        const material = beaconMaterials[index];
        const phase = index + 1;
        if (phase < number) {
          material.color.set(0x83968d);
          material.emissive.set(0x83968d);
          material.emissiveIntensity = 0.5;
        } else if (phase === number) {
          material.color.set(0xeeeae2);
          material.emissive.set(0xeeeae2);
          material.emissiveIntensity = 0.55 + progress * 0.6;
        } else {
          material.color.set(0x3e4342);
          material.emissive.set(0x000000);
          material.emissiveIntensity = 0;
        }
      });
    };
    refreshBeacons();
    const beaconInterval = window.setInterval(refreshBeacons, 2000);

    /* Frame loop ------------------------------------------------------------ */
    const clock = new THREE.Clock();
    const renderFrame = (deltaMs: number) => {
      const time = clock.getElapsedTime();

      pointer.sx = damp(pointer.sx, pointer.x, 0.0012, deltaMs);
      pointer.sy = damp(pointer.sy, pointer.y, 0.0012, deltaMs);
      pointer.energy *= 0.94;
      breath = damp(breath, Math.sin(scrollProgress * Math.PI * 2) * 0.5, 0.02, deltaMs);

      // Multi-layer parallax: chart travels most, dial tilts, core counter-tilts.
      if (chartUniforms) {
        (chartUniforms.uParallax.value as THREE.Vector2).set(pointer.sx * 0.3, pointer.sy * 0.3);
        chartUniforms.uBreath.value = breath;
      }
      dial.rotation.z = time * 0.045;
      dial.rotation.y = pointer.sx * 0.14;

      beacons.forEach((beacon, index) => {
        const angle = time * 0.05 + (index * Math.PI) / 2;
        beacon.position.set(Math.cos(angle) * 1.72, Math.sin(angle * 0.7) * 0.68, Math.sin(angle) * 0.94 - 0.1);
      });

      coreGroup.rotation.y = pointer.sx * 0.5 + time * 0.16;
      coreGroup.rotation.x = -pointer.sy * 0.36 + Math.sin(time * 0.4) * 0.07;
      coreGroup.position.y = 0.02 + Math.sin(time * 0.7) * 0.05;

      particles.rotation.y = time * 0.02 + pointer.sx * 0.12;
      particles.rotation.x = time * 0.012 + pointer.sy * 0.1;
      contactShadow.position.x = pointer.sx * 0.2;

      // Fluid mask pass.
      blobMaterial.uniforms.uTime.value = time;
      (blobMaterial.uniforms.uPointer.value as THREE.Vector2).set(pointer.sx, pointer.sy);
      (blobMaterial.uniforms.uPointerVel.value as THREE.Vector2).set(pointer.vx, pointer.vy);
      blobMaterial.uniforms.uEnergy.value = pointer.energy;
      renderer.setRenderTarget(maskRenderTarget);
      renderer.render(maskScene, maskCamera);
      renderer.setRenderTarget(null);

      renderer.render(scene, camera);
    };

    let unsubscribeFrame: (() => void) | null = null;
    function stop() {
      unsubscribeFrame?.();
      unsubscribeFrame = null;
    }

    sizeRendererToContainer(renderer, container, camera);
    maskResolutionUniform.value.copy(renderer.getDrawingBufferSize(new THREE.Vector2()));

    if (reducedMotion) {
      renderFrame(16.7); // one settled frame, then stillness
    } else {
      unsubscribeFrame = frameLoop.subscribe((_, delta) => {
        if (!visible) return;
        renderFrame(delta);
      });
    }

    return () => {
      cancelled = true;
      stop();
      window.clearInterval(beaconInterval);
      pointerHandle.dispose();
      visibilityHandle.dispose();
      resizeHandle.dispose();
      contextHandle.dispose();
      unsubscribeScroll();
      disposeScene(scene);
      disposeScene(maskScene);
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      dialGeometry.dispose();
      tickGeometry.dispose();
      particleGeometry.dispose();
      beaconGeometry.dispose();
      maskRenderTarget.dispose();
      renderer.dispose();
    };
    // The scene is built once; phase changes mutate materials via refs.
  }, []);

  return (
    <div className="meridian-hero-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="meridian-hero-canvas" aria-hidden="true" />
      {failed ? (
        <div className="webgl-fallback" role="status">
          {failed === "context" ? "3d paused — gpu context lost" : "3d unavailable — quiet mode"}
        </div>
      ) : (
        <div className="canvas-telemetry-badge">
          <span className="telemetry-dot" />
          <span>Meridian sigil · Phase {activePhaseNumber} · {Math.round(phaseProgress)}%</span>
        </div>
      )}
    </div>
  );
}
