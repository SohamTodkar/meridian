/**
 * The Gargantua shader — an Interstellar-style black hole, raytraced per
 * pixel in a single fragment pass.
 *
 * Physics of the image (compact Schwarzschild geodesic bend):
 *   - Every pixel fires a ray that is integrated through the field; the
 *     bend term −1.5·h²·p/r⁵ (h² = conserved angular momentum) reproduces
 *     the real photon behaviour: the disk behind the hole is lensed over
 *     and under the event horizon, forming the iconic halo.
 *   - Rays falling inside r < 1 (the horizon, in units of rs) go black.
 *   - Each disk-plane crossing accumulates emission: a Keplerian
 *     differentially-rotating disk (inner orbits faster) with sheared
 *     noise streaks, temperature ramp white → cream → amber → dust, and
 *     Doppler beaming (the approaching side burns brighter).
 *   - Escaping rays sample a procedural starfield — automatically lensed,
 *     because the star direction is the bent ray direction.
 *   - A soft emission term near the photon sphere adds glow with no
 *     post-processing (the performance lock forbids bloom passes).
 *
 * Cursor energy (pointer velocity) drives disk turbulence so the core
 * answers the hand.
 */

export const blackholeVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const blackholeFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uCamPos;      // camera position (orbits with the cursor)
  uniform mat3 uCamMatrix;   // camera basis (right, up, forward)
  uniform float uFov;        // tangent of half-fov
  uniform float uEnergy;     // pointer velocity energy 0..1

  varying vec2 vUv;

  const int STEPS = 120;
  const float DISK_IN = 2.15;
  const float DISK_OUT = 7.6;

  /* --- cheap value noise, streak-friendly ------------------------- */
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p = p * 2.13 + vec2(11.7, 5.3);
      amp *= 0.5;
    }
    return v;
  }

  /* --- accretion disk emission at a hit point ---------------------- */
  vec3 diskEmission(vec3 hit, vec3 rayDir, out float alpha) {
    float r = length(hit.xz);
    float t = clamp((r - DISK_IN) / (DISK_OUT - DISK_IN), 0.0, 1.0);

    // Keplerian differential rotation: inner material orbits faster.
    float orbitSpeed = 2.4 / pow(r, 1.5);
    float angle = atan(hit.z, hit.x) + uTime * orbitSpeed;

    // Sheared streaks: noise stretched along the flow, sharpened by cursor energy.
    float streak = fbm(vec2(r * 3.1 - uTime * 0.22, angle * 2.2));
    float turbulence = fbm(vec2(r * 7.0, angle * 6.0 + uTime * 0.35)) * (0.35 + uEnergy * 0.5);
    float density = smoothstep(0.0, 0.22, t) * (1.0 - smoothstep(0.62, 1.0, t));
    density *= 0.55 + 0.75 * streak + turbulence;

    // Temperature ramp: white-hot inner rim → cream → amber → cold dust.
    vec3 white = vec3(1.30, 1.22, 1.08);
    vec3 cream = vec3(1.05, 0.92, 0.72);
    vec3 amber = vec3(0.86, 0.56, 0.28);
    vec3 dust  = vec3(0.30, 0.19, 0.11);
    vec3 color = t < 0.28
      ? mix(white, cream, t / 0.28)
      : t < 0.66
        ? mix(cream, amber, (t - 0.28) / 0.38)
        : mix(amber, dust, (t - 0.66) / 0.34);

    // Doppler beaming: the side of the disk rotating toward the observer glows.
    vec3 tangential = normalize(vec3(-hit.z, 0.0, hit.x));
    float doppler = 1.0 + 0.85 * dot(tangential, -rayDir);
    doppler = clamp(doppler, 0.25, 2.1);

    // Inner rim burns brightest (gravitational blueshift + density).
    float rim = 1.0 + 2.6 * pow(1.0 - t, 6.0);

    alpha = clamp(density, 0.0, 1.0);
    return color * density * doppler * rim * 1.35;
  }

  /* --- procedural starfield on a direction -------------------------- */
  vec3 stars(vec3 dir) {
    vec3 color = vec3(0.0);
    for (int layer = 0; layer < 2; layer++) {
      float scale = layer == 0 ? 34.0 : 57.0;
      vec2 uv = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0))) * scale;
      vec2 cell = floor(uv);
      vec2 f = fract(uv);
      float star = hash(cell);
      if (star > 0.995) {
        vec2 center = vec2(hash(cell + 3.1), hash(cell + 7.7));
        float d = length(f - center);
        float glow = smoothstep(0.12, 0.0, d);
        float brightness = (star - 0.995) * 190.0;
        float tint = hash(cell + 1.3);
        color += glow * brightness * mix(vec3(0.82, 0.85, 0.9), vec3(1.0, 0.94, 0.84), tint);
      }
    }
    return color;
  }

  void main() {
    // Primary ray through the pixel.
    vec2 screen = (vUv * 2.0 - 1.0);
    screen.x *= uResolution.x / max(uResolution.y, 1.0);
    vec3 dir = normalize(uCamMatrix * vec3(screen * uFov, 1.0));
    vec3 pos = uCamPos;

    // Conserved squared angular momentum about the hole.
    vec3 h = cross(pos, dir);
    float h2 = dot(h, h);

    vec3 accum = vec3(0.0);   // accumulated emission (front-to-back)
    float transmittance = 1.0;
    bool captured = false;
    bool escaped = false;

    for (int i = 0; i < STEPS; i++) {
      float r2 = dot(pos, pos);
      float r = sqrt(r2);

      if (r < 1.0) { captured = true; break; }          // event horizon
      if (r > 42.0 && dot(pos, dir) > 0.0) { escaped = true; break; }

      // Adaptive step: fine near the hole, coarse far away.
      float dt = 0.045 + 0.11 * clamp((r - 1.0) / 8.0, 0.0, 1.0);

      // Geodesic bend (Schwarzschild, rs = 1).
      vec3 accel = -1.5 * h2 * pos / (r2 * r2 * r);
      dir += accel * dt;
      dir = normalize(dir);
      vec3 newPos = pos + dir * dt;

      // Disk-plane crossing between pos and newPos.
      if (pos.y * newPos.y < 0.0) {
        float t = pos.y / (pos.y - newPos.y);
        vec3 hit = mix(pos, newPos, t);
        float rr = length(hit.xz);
        if (rr > DISK_IN && rr < DISK_OUT) {
          float alpha;
          vec3 emission = diskEmission(hit, dir, alpha);
          accum += emission * transmittance;
          transmittance *= (1.0 - alpha * 0.72);
        }
      }

      // Photon-sphere glow (bloom without post-processing).
      float glow = dt * 0.055 / (r2 * r2 + 0.35);
      accum += glow * vec3(1.15, 0.95, 0.72) * transmittance;

      pos = newPos;
    }

    // Background: lensed stars for escaping rays; deep ink otherwise.
    vec3 background = escaped ? stars(dir) * 0.85 : vec3(0.012, 0.014, 0.016);
    vec3 color = accum + background * transmittance;

    // Faint vignette so the stage floats inside its notched frame.
    float edge = 1.0 - 0.35 * dot(screen * 0.55, screen * 0.55);
    color *= edge;

    gl_FragColor = vec4(color, 1.0);
  }
`;
