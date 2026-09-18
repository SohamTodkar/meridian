/**
 * The Gargantua shader — an Interstellar-style black hole, raytraced per
 * pixel in a single fragment pass.
 *
 * Physics of the image (compact Schwarzschild geodesic bend, rs = 1):
 *   - Every pixel fires a ray that is integrated through the field; the
 *     bend term -1.5 * h² * p / r⁵ (h² = conserved angular momentum)
 *     reproduces real photon behaviour: the disk behind the hole is lensed
 *     over and under the event horizon, forming the iconic halo.
 *   - Rays falling inside r < 1 (the horizon) go black.
 *   - Each disk-plane crossing accumulates emission: a Keplerian
 *     differentially-rotating disk (inner orbits faster) with five octaves
 *     of sheared fbm streaks, a five-stop blackbody temperature ramp
 *     (white-hot inner rim -> cream -> amber -> ember -> deep dust), and
 *     TRUE relativistic Doppler beaming — beta(r) = 0.55 / sqrt(r),
 *     delta = 1 / (gamma * (1 - beta * dot(v, -rayDir))), intensity scales
 *     by delta³ and the colour shifts blue on approach / red on recede.
 *   - A thin vertical puffiness term accumulates emission for rays that
 *     graze the disk midplane without exactly crossing it.
 *   - Escaping rays sample a three-layer procedural starfield with bright
 *     diffraction-sparkled stars and a faint milky-way band — all lensed
 *     naturally, because the star direction is the bent ray direction.
 *   - A sharp pale-gold photon-ring glow near r = 1.5 plus a soft
 *     volumetric halo give bloom with no post-processing (the performance
 *     lock forbids bloom passes).
 *   - uBurst (0..1) drives a radial gold starburst celebration shimmer:
 *     sparkling rays erupting from the disk when a study session completes.
 *   - Gravitational redshift dims and reddens emission near the horizon.
 *
 * Cursor energy (pointer velocity) drives disk turbulence so the core
 * answers the hand. uProgress pushes the camera ever so slightly closer
 * as the journey advances.
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
  uniform float uBurst;      // completion starburst envelope 0..1
  uniform float uProgress;   // journey progress 0..1 (subtle push-in)

  varying vec2 vUv;

  const int STEPS = 150;
  const float DISK_IN = 2.3;
  const float DISK_OUT = 9.0;
  const float ESCAPE_R = 30.0;

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
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p = p * 2.13 + vec2(11.7, 5.3);
      amp *= 0.5;
    }
    return v;
  }

  /* --- completion starburst: sparkling radial rays from the disk ---- */
  float burstShimmer(vec3 hit, vec3 rayDir) {
    float r = length(hit.xz);
    float angle = atan(hit.z, hit.x);
    float rays = pow(abs(sin(angle * 22.0 + uTime * 3.0)), 42.0);
    rays += 0.6 * pow(abs(sin(angle * 9.0 - uTime * 1.7)), 26.0);
    float spark = noise(vec2(angle * 34.0, uTime * 11.0));
    float envelope = exp(-abs(r - 3.1) * 0.5) * smoothstep(9.0, 4.5, r);
    float facing = 0.6 + 0.4 * abs(dot(rayDir, normalize(hit)));
    return rays * (0.45 + 0.55 * spark) * envelope * facing;
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
    float fine = fbm(vec2(r * 13.0 + uTime * 0.1, angle * 11.0)) * 0.16;
    float density = smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.6, 1.0, t));
    density *= 0.5 + 0.72 * streak + turbulence + fine;

    // Blackbody temperature ramp: white-hot inner rim -> cream -> amber ->
    // ember orange -> deep dust red-brown.
    vec3 white = vec3(1.32, 1.26, 1.18);
    vec3 cream = vec3(1.06, 0.93, 0.72);
    vec3 amber = vec3(0.96, 0.655, 0.258);
    vec3 ember = vec3(0.62, 0.31, 0.13);
    vec3 dust  = vec3(0.28, 0.17, 0.10);
    vec3 color = t < 0.22
      ? mix(white, cream, t / 0.22)
      : t < 0.5
        ? mix(cream, amber, (t - 0.22) / 0.28)
        : t < 0.76
          ? mix(amber, ember, (t - 0.5) / 0.26)
          : mix(ember, dust, (t - 0.76) / 0.24);

    // True relativistic Doppler beaming: disk material orbits tangentially
    // at beta = 0.55 / sqrt(r); the approaching side burns brighter and
    // shifts blue, the receding side dims and reddens.
    vec3 vel = normalize(vec3(-hit.z, 0.0, hit.x));
    float beta = clamp(0.55 / sqrt(r), 0.0, 0.72);
    float gamma = 1.0 / sqrt(1.0 - beta * beta);
    float delta = 1.0 / (gamma * (1.0 - beta * dot(vel, -rayDir)));
    float beam = clamp(pow(delta, 3.0), 0.15, 6.0);
    vec3 blueTint = vec3(0.82, 0.9, 1.12);
    vec3 redTint = vec3(1.08, 0.9, 0.78);
    float shift = clamp((delta - 1.0) * 1.4, 0.0, 0.55);
    color *= mix(mix(redTint, vec3(1.0), clamp(delta * 2.2, 0.0, 1.0)), blueTint, shift);

    // Inner rim burns brightest (gravitational blueshift + density).
    float rim = 1.0 + 2.6 * pow(1.0 - t, 6.0);

    // Gentle gravitational redshift dims and reddens close to the horizon.
    float redshift = sqrt(max(1.0 - 1.0 / r, 0.12));
    color = mix(color * vec3(1.02, 0.86, 0.7), color, redshift);

    vec3 emission = color * density * beam * rim * redshift * 1.15;
    emission += vec3(1.0, 0.84, 0.52) * burstShimmer(hit, rayDir) * uBurst * 1.6;

    alpha = clamp(density, 0.0, 1.0);
    return emission;
  }


  /* --- procedural starfield on a direction -------------------------- */
  vec3 stars(vec3 dir) {
    vec3 color = vec3(0.0);
    // Three parallax layers of cell stars; the outermost also carries a
    // handful of bright stars with diffraction spikes.
    for (int layer = 0; layer < 3; layer++) {
      float scale = layer == 0 ? 26.0 : (layer == 1 ? 48.0 : 78.0);
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
        // Bright stars in the outer layer throw diffraction spikes.
        if (layer == 2 && star > 0.9991) {
          vec2 dvec = f - center;
          float dx = abs(dvec.x);
          float dy = abs(dvec.y);
          float spike = pow(max(0.0, 1.0 - dx * 3.2), 14.0) * smoothstep(0.16, 0.0, dy);
          spike += pow(max(0.0, 1.0 - dy * 3.2), 14.0) * smoothstep(0.16, 0.0, dx);
          color += spike * 1.4 * vec3(0.9, 0.94, 1.0);
        }
      }
    }
    // A faint milky-way band along a tilted galactic plane.
    float band = exp(-abs(dot(dir, normalize(vec3(0.22, 1.0, -0.12)))) * 3.6);
    color += band * (0.028 + fbm(dir.xy * 4.0 + vec2(3.7, 1.3)) * 0.055) * vec3(0.72, 0.78, 0.92);
    return color;
  }


  void main() {
    // Primary ray through the pixel. Three's lookAt basis aims the camera
    // down its -Z axis, so the forward component here is -1.
    vec2 screen = (vUv * 2.0 - 1.0);
    screen.x *= uResolution.x / max(uResolution.y, 1.0);
    vec3 dir = normalize(uCamMatrix * vec3(screen * uFov, -1.0));
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
      if (r > ESCAPE_R && dot(pos, dir) > 0.0) { escaped = true; break; }

      // Adaptive step: fine near the hole, coarse far away (coarse enough
      // that escaping rays reach the starfield within the step budget).
      float dt = 0.04 + 0.22 * clamp((r - 1.0) / 6.0, 0.0, 1.0);

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


      // Thin vertical puffiness: rays grazing the disk midplane pick up a
      // faint wisp even when they never cross it.
      float rrNow = length(pos.xz);
      if (rrNow > DISK_IN && rrNow < DISK_OUT) {
        float thickness = 0.09 + 0.028 * (rrNow - DISK_IN);
        float wisp = exp(-(pos.y * pos.y) / (thickness * thickness));
        accum += wisp * dt * 0.04 * vec3(1.0, 0.78, 0.5) * transmittance;
      }

      // Photon-sphere ring: a sharp pale-gold line near r = 1.5, wrapped
      // in the old soft halo so it blooms without post-processing.
      float ring = exp(-pow((r - 1.5) * 7.0, 2.0));
      accum += ring * dt * 0.62 * vec3(1.05, 0.9, 0.62) * transmittance;
      float glow = dt * 0.055 / (r2 * r2 + 0.35);
      accum += glow * vec3(1.15, 0.95, 0.72) * transmittance;

      // Celebration starburst: a golden veil filling the whole field while
      // uBurst is up, so the shimmer reads even off the disk.
      float burstVeil = uBurst * uBurst * (0.6 + 0.4 * noise(vec2(uTime * 9.0, r * 2.0)));
      accum += burstVeil * dt * 0.05 * vec3(1.0, 0.85, 0.5) * transmittance;

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

