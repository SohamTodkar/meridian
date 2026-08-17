export const fluidRippleVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fluidRippleFragmentShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    vec2 mouseNorm = uMouse / uResolution.xy;
    
    // Calculate distance from mouse pointer
    float dist = distance(st, mouseNorm);
    
    // Dynamic ripple wave simulation
    float ripple = sin(dist * 28.0 - uTime * 3.5) * exp(-dist * 6.0) * uIntensity;
    
    // Subtle chromatic dispersion
    float r = sin(dist * 30.0 - uTime * 3.6) * 0.5 + 0.5;
    float g = sin(dist * 28.0 - uTime * 3.5) * 0.5 + 0.5;
    float b = sin(dist * 26.0 - uTime * 3.4) * 0.5 + 0.5;
    
    vec3 color = vec3(0.93, 0.92, 0.89); // Bone palette
    float alpha = smoothstep(0.4, 0.0, dist) * 0.18 + ripple * 0.12;
    
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.35));
  }
`;

export const particleVertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  attribute float aScale;
  attribute vec3 aVelocity;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    
    // Mouse repulsion and orbital drift
    float dist = distance(pos.xy, uMouse * 8.0);
    pos.z += sin(uTime * 1.5 + pos.x * 0.1) * 0.3;
    pos.x += aVelocity.x * sin(uTime * 0.8);
    pos.y += aVelocity.y * cos(uTime * 0.8);
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aScale * (18.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    vAlpha = smoothstep(25.0, 5.0, -mvPosition.z) * 0.75;
  }
`;

export const particleFragmentShader = `
  varying float vAlpha;

  void main() {
    // Render soft circular particles
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
    gl_FragColor = vec4(0.93, 0.92, 0.89, alpha);
  }
`;
