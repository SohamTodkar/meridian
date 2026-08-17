"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface PhaseGeometryViewerProps {
  phaseNumber: number;
  phaseName: string;
  cleared?: boolean;
  locked?: boolean;
  progressPercent?: number;
  size?: "sm" | "md" | "lg";
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.z = 4.8;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    const updateDimensions = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    updateDimensions();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xeeeae2, 1.8);
    dirLight1.position.set(3, 4, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(cleared ? 0x83968d : 0xc4c0b8, 1.2);
    dirLight2.position.set(-4, -2, -3);
    scene.add(dirLight2);

    // Group for rotation
    const group = new THREE.Group();
    scene.add(group);

    // Dynamic Geometry based on Phase Number
    let geom: THREE.BufferGeometry;
    if (phaseNumber === 1) {
      geom = new THREE.OctahedronGeometry(1.2, 0);
    } else if (phaseNumber === 2) {
      geom = new THREE.DodecahedronGeometry(1.15, 0);
    } else if (phaseNumber === 3) {
      geom = new THREE.IcosahedronGeometry(1.2, 0);
    } else {
      geom = new THREE.TorusKnotGeometry(0.75, 0.28, 64, 16);
    }

    // Material
    const baseColor = cleared ? 0x83968d : locked ? 0x3e4342 : 0xeeeae2;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x121415,
      metalness: 0.9,
      roughness: 0.2,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geom, bodyMat);
    group.add(mesh);

    // Wireframe Cage
    const wireMat = new THREE.MeshBasicMaterial({
      color: baseColor,
      wireframe: true,
      transparent: true,
      opacity: locked ? 0.25 : 0.75,
    });
    const wireMesh = new THREE.Mesh(geom, wireMat);
    wireMesh.scale.setScalar(1.02);
    group.add(wireMesh);

    // Halo Torus
    const haloGeo = new THREE.TorusGeometry(1.6, 0.012, 16, 60);
    const haloMat = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: locked ? 0.15 : 0.4,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2.5;
    group.add(halo);

    // Scroll Integration via Quaternions
    let scrollRotation = 0;
    const handleScroll = () => {
      scrollRotation = window.scrollY * 0.003;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Interactive Drag / Hover Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let dragRotX = 0;
    let dragRotY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) {
        // Subtle tilt on hover
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        dragRotY = x * 0.4;
        dragRotX = -y * 0.4;
        return;
      }
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      dragRotY += deltaX * 0.01;
      dragRotX += deltaY * 0.01;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Visibility Observer
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // Combine auto-rotation, scroll rotation, and drag tilt
      group.rotation.x = dragRotX + scrollRotation * 0.6 + Math.sin(elapsed * 0.6) * 0.15;
      group.rotation.y = dragRotY + elapsed * 0.25 + scrollRotation;
      halo.rotation.z = elapsed * 0.3;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      updateDimensions();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", handleResize);

      geom.dispose();
      haloGeo.dispose();
      bodyMat.dispose();
      wireMat.dispose();
      haloMat.dispose();
      renderer.dispose();
    };
  }, [phaseNumber, cleared, locked]);

  return (
    <div className={`phase-geometry-container size-${size}`} ref={containerRef} aria-label={`${phaseName} 3D geometry node`}>
      <canvas ref={canvasRef} className="phase-geometry-canvas" />
      <div className="phase-geometry-overlay">
        <span className="geometry-phase-tag">PHASE 0{phaseNumber} · {phaseName}</span>
        <span className="geometry-phase-status">
          {cleared ? "CLEARED" : locked ? "LOCKED" : `${progressPercent}% CAPABILITY`}
        </span>
      </div>
    </div>
  );
}
