"use client";

import { Environment } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function mapTexture(kind: "depth" | "alpha" | "roughness") {
  const size = 64;
  const pixels = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const nx = (x / (size - 1)) * 2 - 1;
    const ny = (y / (size - 1)) * 2 - 1;
    const radius = Math.sqrt(nx * nx + ny * ny);
    const index = y * size + x;
    if (kind === "depth") pixels[index] = Math.round(80 + 175 * Math.max(0, 1 - radius));
    if (kind === "alpha") pixels[index] = radius < 1.1 ? 255 : 0;
    if (kind === "roughness") pixels[index] = Math.round(120 + 80 * Math.sin(x * 0.43) * Math.cos(y * 0.36));
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RedFormat);
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function PortraitPlane() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const base = useMemo(() => {
    const size = 128;
    const pixels = new Uint8Array(size * size * 3);
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 3;
      const edge = Math.min(1, Math.hypot((x / size) - 0.68, (y / size) - 0.5) * 1.4);
      pixels[index] = 28 + Math.round((1 - edge) * 88);
      pixels[index + 1] = 28 + Math.round((1 - edge) * 22);
      pixels[index + 2] = 29 + Math.round((1 - edge) * 17);
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    return texture;
  }, []);
  const pointer = useRef(new THREE.Vector2(0, 0));
  const previous = useRef(new THREE.Vector2(0, 0));
  const depth = useMemo(() => mapTexture("depth"), []);
  const alpha = useMemo(() => mapTexture("alpha"), []);
  const roughness = useMemo(() => mapTexture("roughness"), []);

  useFrame(({ clock, pointer: viewportPointer }) => {
    if (!material.current) return;
    pointer.current.lerp(viewportPointer, 0.08);
    const velocity = pointer.current.clone().sub(previous.current);
    previous.current.copy(pointer.current);
    const { uniforms } = material.current;
    const time = uniforms.uTime;
    const cursor = uniforms.uPointer;
    const movement = uniforms.uVelocity;
    if (time && cursor && movement) {
      time.value = clock.getElapsedTime();
      (cursor.value as THREE.Vector2).copy(pointer.current);
      (movement.value as THREE.Vector2).lerp(velocity, 0.15);
    }
  });

  return <mesh><planeGeometry args={[8.6, 5.2, 96, 96]} /><shaderMaterial ref={material} transparent uniforms={{ uBase: { value: base }, uDepth: { value: depth }, uAlpha: { value: alpha }, uRoughness: { value: roughness }, uPointer: { value: new THREE.Vector2() }, uVelocity: { value: new THREE.Vector2() }, uTime: { value: 0 } }} vertexShader={`
    uniform sampler2D uDepth;
    uniform vec2 uPointer;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normal;
      float depth = texture2D(uDepth, uv).r;
      vec3 displaced = position;
      displaced.z += (depth - 0.48) * 0.92;
      displaced.xy += uPointer * depth * vec2(0.12, 0.08);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }`} fragmentShader={`
    uniform sampler2D uBase;
    uniform sampler2D uAlpha;
    uniform sampler2D uRoughness;
    uniform vec2 uPointer;
    uniform vec2 uVelocity;
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) { vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
    float fbm(vec2 p) { float n=0.; n+=noise(p); n+=.5*noise(p*2.02); n+=.25*noise(p*4.03); return n/.875; }
    void main() {
      vec4 image = texture2D(uBase, vUv);
      float subject = texture2D(uAlpha, vUv).r;
      float rough = texture2D(uRoughness, vUv).r;
      vec2 cursor = uPointer * 0.24 + vec2(.5);
      float blob = length(vUv - cursor) - 0.18 - fbm(vUv * 4. + uTime*.2 + uVelocity*12.)*.15;
      float fluidMask = smoothstep(.28, -.05, blob);
      vec3 light = normalize(vec3(-.32, .55, .8));
      float diffuse = max(dot(normalize(vNormal), light), 0.0);
      float specular = pow(max(diffuse, 0.0), mix(3., 20., 1.-rough)) * .25;
      vec3 lit = image.rgb * (.72 + diffuse*.28) + specular;
      float a = subject * mix(.82, 1., fluidMask);
      if (a < .06) discard;
      gl_FragColor = vec4(lit, a);
    }`} /></mesh>;
}

function PbrObject() {
  const object = useRef<THREE.Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!object.current) return;
    object.current.rotation.set(-0.2 + pointer.y * 0.16, clock.getElapsedTime() * 0.32 + pointer.x * 0.45, 0.14);
    object.current.position.y = 0.12 + Math.sin(clock.getElapsedTime() * 1.4) * 0.08;
  });
  return <group ref={object} position={[1.6, -0.35, 0.82]} scale={0.8}><mesh><icosahedronGeometry args={[0.9, 2]} /><meshStandardMaterial color="#ff5638" metalness={0.78} roughness={0.24} /></mesh></group>;
}

function HeroScene() {
  return <><ambientLight intensity={1.15} /><directionalLight position={[-2, 3, 4]} intensity={2.4} color="#fff1e8" /><PortraitPlane /><PbrObject /><mesh rotation-x={-Math.PI / 2} position={[0, -2.15, -0.1]}><circleGeometry args={[2.45, 48]} /><meshBasicMaterial color="#050506" transparent opacity={0.45} /></mesh><Environment preset="city" /></>;
}

export function Hero3D() { return <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.8], fov: 46 }} gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}><HeroScene /></Canvas>; }
