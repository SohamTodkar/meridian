"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useIdeasUi } from "@/state/ideas-ui";

function RotatingModel() {
  const progress = useIdeasUi((state) => state.scrollProgress);
  const group = useRef<THREE.Group>(null);
  useFrame(() => { if (group.current) group.current.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(progress * Math.PI * 1.4, progress * Math.PI * 2.2, 0)), 0.08); });
  return <group ref={group}><mesh><dodecahedronGeometry args={[0.9, 1]} /><meshStandardMaterial color="#ff5638" metalness={0.75} roughness={0.24} /></mesh></group>;
}

export function ModelViewer() { return <div className="model-viewer"><div className="model-fallback" aria-hidden="true" /><Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3.2], fov: 48 }} gl={{ alpha: true, antialias: false }}><ambientLight intensity={1.2} /><directionalLight position={[2, 3, 4]} intensity={2} color="#ff5638" /><RotatingModel /><OrbitControls enablePan={false} enableZoom={false} /></Canvas><span className="model-caption">Scroll-driven PBR study</span></div>; }
