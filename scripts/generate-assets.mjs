/**
 * Meridian asset generator.
 *
 * Produces the binary assets the WebGL layer loads at runtime:
 *   public/assets/textures/base.png        – monochrome topographic base image
 *   public/assets/textures/depth.png       – parallax depth map (white = near)
 *   public/assets/textures/alpha.png       – high-contrast notched-square cutout mask
 *   public/assets/textures/roughness.png   – smooth value-noise roughness map
 *   public/assets/textures/normal.png      – tangent-space normal map derived from depth
 *   public/assets/models/meridian-knot.glb – glTF 2.0 binary, PBR metallic material
 *
 * Everything is generated deterministically with zero external dependencies
 * (PNG chunks are encoded by hand; the glb is assembled per the glTF 2.0 spec)
 * so the site keeps its local-first, no-CDN guarantee.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const outTextures = join(root, "public", "assets", "textures");
const outModels = join(root, "public", "assets", "models");
mkdirSync(outTextures, { recursive: true });
mkdirSync(outModels, { recursive: true });

/* ------------------------------------------------------------------ */
/* PNG encoding (8-bit grayscale and RGB, non-interlaced)             */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

/** Encode `pixels` (Uint8Array, `channels` per pixel, row-major) as a PNG. */
function encodePng(width, height, channels, pixels) {
  const colorType = channels === 1 ? 0 : 2; // grayscale | truecolor
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Deterministic value noise                                           */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function makeValueNoise(gridSize, seed) {
  const random = mulberry32(seed);
  const grid = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < grid.length; i++) grid[i] = random();
  const at = (x, y) => grid[((y % gridSize) + gridSize) % gridSize * gridSize + (((x % gridSize) + gridSize) % gridSize)];
  return (u, v) => {
    const fx = u * gridSize;
    const fy = v * gridSize;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smoothstep(0, 1, fx - x0);
    const ty = smoothstep(0, 1, fy - y0);
    const a = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const b = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  };
}

/* ------------------------------------------------------------------ */
/* Texture maps                                                        */
/* ------------------------------------------------------------------ */

const SIZE = 512;

function writeTexture(name, channels, sample) {
  const pixels = new Uint8Array(SIZE * SIZE * channels);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / (SIZE - 1);
      const v = y / (SIZE - 1);
      const values = sample(u, v);
      const offset = (y * SIZE + x) * channels;
      for (let c = 0; c < channels; c++) pixels[offset + c] = Math.round(Math.min(1, Math.max(0, values[c])) * 255);
    }
  }
  const png = encodePng(SIZE, SIZE, channels, pixels);
  writeFileSync(join(outTextures, name), png);
  console.log(`wrote textures/${name} (${(png.length / 1024).toFixed(1)} kB)`);
}

// Base image: quiet monochrome topography — contour bands over soft radial glow.
const contourNoise = makeValueNoise(6, 0x4d455249);
const glowNoise = makeValueNoise(3, 0x44414e31);
writeTexture("base.png", 1, (u, v) => {
  const n = contourNoise(u, v);
  const elevation = n * 0.72 + glowNoise(u, v) * 0.18 + 0.05;
  const contour = Math.abs(((elevation * 14) % 1) - 0.5) * 2;
  const band = smoothstep(0.72, 0.95, contour);
  const dx = u - 0.5;
  const dy = v - 0.5;
  const radial = 1 - smoothstep(0.12, 0.62, Math.sqrt(dx * dx + dy * dy));
  const value = 0.1 + elevation * 0.34 + band * 0.16 + radial * 0.34;
  return [value];
});

// Depth map: white (near) at the centre falling to black at the frame edge.
writeTexture("depth.png", 1, (u, v) => {
  const dx = (u - 0.5) * 2;
  const dy = (v - 0.5) * 2;
  const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
  return [1 - smoothstep(0.1, 1.0, d)];
});

// Alpha cutout: the brand notched square — hard white shape on black.
const NOTCH = 0.09;
writeTexture("alpha.png", 1, (u, v) => {
  const inside =
    u > NOTCH && u < 1 - NOTCH && v > NOTCH && v < 1 - NOTCH &&
    !(u > 1 - 2.2 * NOTCH && v < 2.2 * NOTCH && (u - (1 - 2.2 * NOTCH)) + (2.2 * NOTCH - v) > 2.2 * NOTCH - NOTCH) &&
    !(u < 2.2 * NOTCH && v > 1 - 2.2 * NOTCH && ((2.2 * NOTCH - u) + (v - (1 - 2.2 * NOTCH))) > 2.2 * NOTCH - NOTCH);
  return [inside ? 1 : 0];
});

// Roughness: darker = sharper reflections; soft marbling across the plate.
const roughNoise = makeValueNoise(5, 0x524f4748);
writeTexture("roughness.png", 1, (u, v) => {
  const marble = Math.sin((u + roughNoise(u, v) * 0.9) * Math.PI * 4) * 0.5 + 0.5;
  const value = 0.16 + roughNoise(u, v) * 0.34 + marble * 0.2;
  return [value];
});

// Normal map: derived from the depth gradient (tangent space, RGB).
function depthAt(u, v) {
  const dx = (u - 0.5) * 2;
  const dy = (v - 0.5) * 2;
  const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
  return 1 - smoothstep(0.1, 1.0, d);
}
writeTexture("normal.png", 3, (u, v) => {
  const eps = 1 / SIZE;
  const gx = depthAt(u + eps, v) - depthAt(u - eps, v);
  const gy = depthAt(u, v + eps) - depthAt(u, v - eps);
  const nx = -gx * 2.2;
  const ny = -gy * 2.2;
  const nz = 1;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return [(nx / len) * 0.5 + 0.5, (ny / len) * 0.5 + 0.5, (nz / len) * 0.5 + 0.5];
});

/* ------------------------------------------------------------------ */
/* glTF binary (.glb) with a PBR material                              */
/* ------------------------------------------------------------------ */

function buildGlb() {
  const geometry = new THREE.TorusKnotGeometry(0.62, 0.215, 140, 28);
  geometry.rotateX(Math.PI / 2);
  const index = geometry.index.array;
  const position = geometry.attributes.position.array;
  const normal = geometry.attributes.normal.array;

  // Compute POSITION accessor min/max (required by the spec).
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < position.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = position[i + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }

  const binary = Buffer.alloc(index.byteLength + position.byteLength + normal.byteLength + 12); // +12 padding headroom
  let byteOffset = 0;
  const bufferViews = [];
  const accessors = [];

  function pushView(typedArray, target) {
    Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength).copy(binary, byteOffset);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: typedArray.byteLength, target });
    const view = { bufferView: bufferViews.length - 1, componentType: 0, count: 0, type: "" };
    byteOffset += typedArray.byteLength;
    return view;
  }

  const indexView = pushView(index, 34963 /* ELEMENT_ARRAY_BUFFER */);
  indexView.componentType = index instanceof Uint32Array ? 5125 : 5123;
  indexView.count = index.length;
  indexView.type = "SCALAR";
  accessors.push(indexView);

  const positionView = pushView(position, 34962 /* ARRAY_BUFFER */);
  positionView.componentType = 5126;
  positionView.count = position.length / 3;
  positionView.type = "VEC3";
  positionView.min = min.map((value) => Math.round(value * 1e4) / 1e4);
  positionView.max = max.map((value) => Math.round(value * 1e4) / 1e4);
  accessors.push(positionView);

  const normalView = pushView(normal, 34962);
  normalView.componentType = 5126;
  normalView.count = normal.length / 3;
  normalView.type = "VEC3";
  accessors.push(normalView);

  const gltf = {
    asset: { version: "2.0", generator: "Meridian asset generator" },
    scene: 0,
    scenes: [{ name: "MeridianKnot", nodes: [0] }],
    nodes: [{ name: "MeridianKnot", mesh: 0 }],
    meshes: [
      {
        name: "MeridianKnot",
        primitives: [{ attributes: { POSITION: 1, NORMAL: 2 }, indices: 0, material: 0 }],
      },
    ],
    materials: [
      {
        name: "BoneMetal",
        doubleSided: false,
        pbrMetallicRoughness: {
          baseColorFactor: [0.933, 0.918, 0.894, 1],
          metallicFactor: 0.92,
          roughnessFactor: 0.24,
        },
      },
    ],
    accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
  };

  const jsonText = JSON.stringify(gltf);
  const jsonChunk = Buffer.from(jsonText, "utf8");
  const jsonPadding = Buffer.alloc((4 - (jsonChunk.length % 4)) % 4, 0x20);
  const binPadding = Buffer.alloc((4 - (byteOffset % 4)) % 4, 0);
  const jsonLength = jsonChunk.length + jsonPadding.length;
  const binLength = byteOffset + binPadding.length;
  const totalLength = 12 + 8 + jsonLength + 8 + binLength;

  const glb = Buffer.alloc(totalLength);
  glb.writeUInt32LE(0x46546c67, 0); // magic "glTF"
  glb.writeUInt32LE(2, 4); // version
  glb.writeUInt32LE(totalLength, 8);
  glb.writeUInt32LE(jsonLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16); // "JSON"
  jsonChunk.copy(glb, 20);
  jsonPadding.copy(glb, 20 + jsonChunk.length);
  const binHeader = 20 + jsonLength;
  glb.writeUInt32LE(binLength, binHeader);
  glb.writeUInt32LE(0x004e4942, binHeader + 4); // "BIN"
  binary.copy(glb, binHeader + 8, 0, byteOffset);
  binPadding.copy(glb, binHeader + 8 + byteOffset);

  writeFileSync(join(outModels, "meridian-knot.glb"), glb);
  console.log(`wrote models/meridian-knot.glb (${(glb.length / 1024).toFixed(1)} kB, ${accessors[1].count} vertices)`);
  geometry.dispose();
}

buildGlb();
console.log("asset generation complete");
