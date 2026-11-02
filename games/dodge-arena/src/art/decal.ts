import { AdditiveBlending, FrontSide, ShaderMaterial, type IUniform, type Side } from 'three';
import { ARENA_RADIUS, RING_WIDTH } from '../tuning.ts';

const VERTEX = /* glsl */ `
  varying vec2 vPlace;
  varying vec2 vUv;
  varying vec3 vTint;
  varying vec2 vCentre;
  varying float vReach;
  void main() {
    vec4 place = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vPlace = place.xz;
    vCentre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
    vReach = length((instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
    vUv = uv;
    vTint = instanceColor;
    gl_Position = projectionMatrix * viewMatrix * place;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uEdge;
  uniform float uClock;
  uniform float uPattern;
  uniform float uBand;
  varying vec2 vPlace;
  varying vec2 vUv;
  varying vec3 vTint;
  varying vec2 vCentre;
  varying float vReach;
  void main() {
    if (length(vPlace) > uEdge) discard;
    float glow = 1.0;
    if (uPattern > 2.5) {
      // A band exactly as wide as what it hits, with a soft halo. The disc is drawn two band-widths past the edge to fit the halo.
      float off = abs(length(vPlace - vCentre) - (vReach - uBand * 2.0));
      glow = (1.0 - smoothstep(uBand * 0.8, uBand, off)) * 1.5 + (1.0 - smoothstep(uBand, uBand * 2.0, off)) * 0.5;
      if (glow < 0.01) discard;
    } else if (uPattern > 0.5 && uPattern < 1.5) {
      float centre = abs(vUv.x - 0.5) * 2.0;
      float chevron = fract(vUv.y * 12.0 - uClock * 2.4 - centre * 0.8);
      float rails = smoothstep(0.82, 0.98, centre);
      glow = 0.28 + rails * 0.9 + smoothstep(0.55, 0.9, chevron) * 0.45;
    } else if (uPattern > 1.5) {
      float away = length(vUv - 0.5) * 2.0;
      glow = smoothstep(0.86, 0.97, away) * smoothstep(1.0, 0.98, away) * 1.6 + 0.1;
      if (away > 1.0) discard;
    }
    gl_FragColor = vec4(vTint * glow, 1.0);
    #include <colorspace_fragment>
  }
`;

export type DecalPattern = 'plain' | 'lane' | 'disc' | 'band';
const PATTERNS: Record<DecalPattern, number> = { plain: 0, lane: 1, disc: 2, band: 3 };

/** A glowing mark that stops at the arena's edge, so warnings never hang out over empty space. */
export function decalMaterial(pattern: DecalPattern, clock: IUniform<number>, side: Side = FrontSide): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uEdge: { value: ARENA_RADIUS },
      uClock: clock,
      uPattern: { value: PATTERNS[pattern] },
      uBand: { value: RING_WIDTH / 2 },
    },
    transparent: true,
    depthWrite: false,
    side,
    blending: AdditiveBlending,
  });
}
