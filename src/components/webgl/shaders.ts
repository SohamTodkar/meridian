/**
 * Meridian shader library.
 *
 *  parallaxVertex      — depth-map-driven displacement for the layered hero
 *  subjectFragment     — alpha cutout + roughness-modulated directional light
 *  contactShadowFragment — soft grounding shadow under the subject
 *  fluidBlobFragment   — simplex-noise fluid blobs that trail the cursor and
 *                        gate the glTF overlay as a dynamic alpha mask
 */

/* ------------------------------------------------------------------ */
/* Multi-layer parallax subject                                        */
/* ------------------------------------------------------------------ */

export const parallaxVertexShader = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uDepthScale;
  uniform vec2 uParallax;   // smoothed pointer offset, -1..1
  uniform float uBreath;    // slow scroll-linked breathing, -1..1
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    // White in the depth map is nearest: it travels the most.
    float depth = texture2D(uDepth, uv).r;
    vDepth = depth;
    vec3 displaced = position;
    displaced.xy += uParallax * uDepthScale * depth;
    displaced.z += uBreath * uDepthScale * 0.35 * depth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const subjectFragmentShader = /* glsl */ `
  uniform sampler2D uBase;
  uniform sampler2D uAlpha;
  uniform sampler2D uRoughness;
  uniform sampler2D uNormal;
  uniform vec2 uLightDir;   // directional light in screen space
  uniform float uTint;      // layer darkening, back layers < 1
  uniform float uAlphaHard; // 1 = strict cutout, 0 = soft
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vec4 base = texture2D(uBase, vUv);
    float alphaMap = texture2D(uAlpha, vUv).r;
    if (uAlphaHard > 0.5 && alphaMap < 0.5) discard;

    // Roughness drives specular width: darker map = tighter highlight.
    float rough = texture2D(uRoughness, vUv).r;
    vec3 normal = normalize(texture2D(uNormal, vUv).rgb * 2.0 - 1.0);
    vec3 lightDir = normalize(vec3(uLightDir, 0.9));

    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), mix(96.0, 8.0, rough)) * (1.0 - rough * 0.55);

    vec3 ink = vec3(0.031, 0.035, 0.039);
    vec3 bone = vec3(0.933, 0.918, 0.886);
    vec3 color = mix(ink, bone, base.r * uTint);
    color += bone * specular * 0.35 * uTint;
    color *= 0.55 + 0.45 * diffuse;

    float alpha = uAlphaHard > 0.5 ? 1.0 : smoothstep(0.15, 0.75, alphaMap) * 0.42;
    gl_FragColor = vec4(color, alpha);
  }
`;

/* ------------------------------------------------------------------ */
/* Contact shadow                                                      */
/* ------------------------------------------------------------------ */

export const contactShadowFragmentShader = /* glsl */ `
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    float d = distance(vUv, vec2(0.5));
    float falloff = smoothstep(0.5, 0.06, d);
    gl_FragColor = vec4(0.0, 0.0, 0.0, falloff * falloff * uStrength);
  }
`;

export const basicVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/* Fluid blob mask (simplex noise, cursor-trailing)                    */
/* ------------------------------------------------------------------ */

/* Classic Ashima 2D simplex noise (public domain). */
const simplexNoiseGlsl = /* glsl */ `
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

export const fluidBlobFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;      // smoothed cursor, -1..1
  uniform vec2 uPointerVel;   // cursor velocity, px/ms
  uniform float uEnergy;      // 0 idle .. 1 fast motion
  const int BLOB_COUNT = 4;

  varying vec2 vUv;
  ${simplexNoiseGlsl}

  void main() {
    vec2 st = vUv * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);

    // Blob field: one blob rides the cursor, the rest trail it with noise.
    float field = 0.0;
    vec2 anchor = uPointer * 0.5 + 0.5;
    anchor.x *= uResolution.x / max(uResolution.y, 1.0);
    for (int i = 0; i < BLOB_COUNT; i++) {
      float fi = float(i);
      float speed = 0.35 + fi * 0.22;
      vec2 drift = vec2(
        snoise(vec2(uTime * speed, fi * 17.31)),
        snoise(vec2(fi * 11.7, uTime * speed * 0.8))
      ) * (0.08 + fi * 0.05);
      vec2 center = anchor + drift;
      float radius = 0.055 + fi * 0.028 + uEnergy * 0.05;
      float d = distance(st, center);
      field += radius * radius / (d * d + 0.0015);
    }

    // Noise-turbulence edge keeps the blobs fluid instead of spherical.
    float turbulence = snoise(st * 4.0 + uTime * 0.35) * 0.16 + 0.08;
    float mask = smoothstep(0.9 + 0.25 - uEnergy * 0.35 - turbulence, 1.6, field);

    // Background ambience so the mask is never fully empty.
    float ambient = smoothstep(0.35, 0.0, distance(st, anchor)) * (0.06 + uEnergy * 0.1);
    float value = clamp(mask + ambient, 0.0, 1.0);

    gl_FragColor = vec4(vec3(value), value);
  }
`;
