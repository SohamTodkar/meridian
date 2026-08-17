"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 7.5;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    const updateSize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    updateSize();

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xeeeae2, 2.0);
    keyLight.position.set(5, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x83968d, 1.5);
    rimLight.position.set(-5, -3, -4);
    scene.add(rimLight);

    // --- Astrolabe Hierarchy Group ---
    const astrolabeGroup = new THREE.Group();
    scene.add(astrolabeGroup);

    // 1. Outer Meridian Ring
    const outerRingGeo = new THREE.TorusGeometry(2.3, 0.022, 16, 100);
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xeeeae2,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: false,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, metalMat);
    astrolabeGroup.add(outerRing);

    // 2. Middle Gimbal Ring (Rotated 45deg)
    const midRingGeo = new THREE.TorusGeometry(1.85, 0.018, 16, 90);
    const midRingMat = new THREE.MeshStandardMaterial({
      color: 0xc4c0b8,
      metalness: 0.7,
      roughness: 0.35,
    });
    const midRing = new THREE.Mesh(midRingGeo, midRingMat);
    midRing.rotation.x = Math.PI / 3;
    astrolabeGroup.add(midRing);

    // 3. Ecliptic Coordinate Ring (Slanted)
    const eclipticRingGeo = new THREE.TorusGeometry(1.4, 0.015, 16, 80);
    const eclipticMat = new THREE.MeshStandardMaterial({
      color: 0x83968d,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x83968d,
      emissiveIntensity: 0.2,
    });
    const eclipticRing = new THREE.Mesh(eclipticRingGeo, eclipticMat);
    eclipticRing.rotation.y = Math.PI / 4;
    eclipticRing.rotation.z = Math.PI / 6;
    astrolabeGroup.add(eclipticRing);

    // 4. Central Quantum Core (Icosahedron & Geodesic Wireframe)
    const coreGeo = new THREE.IcosahedronGeometry(0.8, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x121415,
      metalness: 0.9,
      roughness: 0.1,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    astrolabeGroup.add(coreMesh);

    // Wireframe overlay for core
    const wireGeo = new THREE.IcosahedronGeometry(0.81, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xeeeae2,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    astrolabeGroup.add(wireMesh);

    // 5. Phase Milestone Orbiting Beacons
    const beaconCount = 4;
    const beacons: THREE.Mesh[] = [];
    for (let i = 0; i < beaconCount; i++) {
      const beaconGeo = new THREE.SphereGeometry(0.065, 16, 16);
      const isCurrent = i + 1 === activePhaseNumber;
      const isCompleted = i + 1 < activePhaseNumber;
      
      const beaconMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? 0xeeeae2 : isCompleted ? 0x83968d : 0x3e4342,
        emissive: isCurrent ? 0xeeeae2 : isCompleted ? 0x83968d : 0x000000,
        emissiveIntensity: isCurrent ? 0.9 : isCompleted ? 0.5 : 0,
        metalness: 0.8,
        roughness: 0.2,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beacons.push(beaconMesh);
      scene.add(beaconMesh);
    }

    // 6. Constellation Particle Field
    const particleCount = 140;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.0 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
      particleScales[i] = Math.random() * 0.035 + 0.015;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xeeeae2,
      size: 0.04,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- Interactive Mouse Dynamics & Parallax ---
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const rect = container.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

      targetRotY = x * 0.55;
      targetRotX = -y * 0.45;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });

    // --- Optimization with IntersectionObserver ---
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // --- Animation Loop ---
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsedTime = clock.getElapsedTime();

      // Smooth lerp for mouse parallax
      currentRotX += (targetRotX - currentRotX) * 0.06;
      currentRotY += (targetRotY - currentRotY) * 0.06;

      astrolabeGroup.rotation.x = currentRotX + elapsedTime * 0.12;
      astrolabeGroup.rotation.y = currentRotY + elapsedTime * 0.18;

      midRing.rotation.x = Math.PI / 3 + Math.sin(elapsedTime * 0.5) * 0.2;
      midRing.rotation.y = elapsedTime * 0.25;

      eclipticRing.rotation.z = Math.PI / 6 + Math.cos(elapsedTime * 0.4) * 0.25;
      eclipticRing.rotation.y = -elapsedTime * 0.22;

      coreMesh.rotation.y = -elapsedTime * 0.35;
      coreMesh.rotation.x = elapsedTime * 0.2;
      wireMesh.rotation.y = -elapsedTime * 0.35;
      wireMesh.rotation.x = elapsedTime * 0.2;

      // Animate Beacon Orbits
      beacons.forEach((beacon, i) => {
        const speed = 0.4 + i * 0.15;
        const orbitRadius = 1.6 + i * 0.35;
        const angle = elapsedTime * speed + (i * Math.PI) / 2;
        const slant = (i * Math.PI) / 6;

        beacon.position.x = Math.cos(angle) * orbitRadius;
        beacon.position.y = Math.sin(angle) * Math.sin(slant) * orbitRadius;
        beacon.position.z = Math.sin(angle) * Math.cos(slant) * orbitRadius;
      });

      // Slowly rotate particle field
      particles.rotation.y = elapsedTime * 0.04 + currentRotY * 0.3;
      particles.rotation.x = elapsedTime * 0.02 + currentRotX * 0.3;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      updateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      // Clean up geometries and materials
      outerRingGeo.dispose();
      midRingGeo.dispose();
      eclipticRingGeo.dispose();
      coreGeo.dispose();
      wireGeo.dispose();
      particleGeo.dispose();

      metalMat.dispose();
      midRingMat.dispose();
      eclipticMat.dispose();
      coreMat.dispose();
      wireMat.dispose();
      particleMat.dispose();
      beacons.forEach((b) => {
        b.geometry.dispose();
        (b.material as THREE.Material).dispose();
      });

      renderer.dispose();
    };
  }, [activePhaseNumber, phaseProgress]);

  return (
    <div className="meridian-hero-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="meridian-hero-canvas" />
      <div className="canvas-telemetry-badge">
        <span className="telemetry-dot" />
        <span className="telemetry-label">ASTROLABE 3D // PHASE {activePhaseNumber}</span>
      </div>
    </div>
  );
}
