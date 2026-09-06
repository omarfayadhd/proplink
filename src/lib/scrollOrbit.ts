/**
 * The landing hero's scroll-driven camera orbit (ADR-008).
 *
 * Pure maths, deliberately free of DOM: the hero plate's scroll progress goes
 * in, a CSS `transform` string comes out. Keeping the interpolation here rather
 * than inside the component is what makes the motion testable at all — a
 * transform applied inside a `requestAnimationFrame` callback is otherwise only
 * observable by eye.
 */

export interface OrbitKeyframe {
  /** Scroll progress this keyframe lands on. Ascending, 0 through 1. */
  at: number;
  /** Yaw, degrees. Negative swings the plane's right edge away from the viewer. */
  rotateY: number;
  /** Pitch, degrees. Positive tips the plane's top edge away. */
  rotateX: number;
  scale: number;
  /** Vertical drift as a percentage of the plane's own height. */
  translateYPct: number;
}

/**
 * Three angles, not two: the plane swings in from the left, passes through
 * square-on at the point the headline is most readable, then swings out to the
 * right and lifts as the hero leaves. A two-keyframe track reads as a single
 * slow skew, which is not what "seen from several angles" looks like.
 */
export const ORBIT_TRACK: readonly OrbitKeyframe[] = [
  { at: 0, rotateY: -14, rotateX: 6, scale: 1.14, translateYPct: 0 },
  { at: 0.5, rotateY: 0, rotateX: 0, scale: 1.04, translateYPct: 0 },
  { at: 1, rotateY: 12, rotateX: -5, scale: 1.1, translateYPct: -4 },
];

/**
 * Three decimals. Raw interpolation emits values like `1.0700000000000003`,
 * which change the inline style string on frames where nothing visibly moved
 * and defeat the component's "skip the write if the transform is unchanged"
 * guard.
 */
const round = (n: number) => Number(n.toFixed(3));

// `<= 0` rather than `< 0` so a negative zero — which `-top / height` produces
// at rest, since the hero's rect top is exactly 0 there — normalises to +0.
const clamp01 = (n: number) => (n <= 0 ? 0 : n > 1 ? 1 : n);

/**
 * How far the hero has travelled, from its own `getBoundingClientRect()`.
 *
 * The hero sits at the top of the document, so its rect top is 0 at rest and
 * goes negative as you scroll; one hero-height of travel is the whole journey
 * from "just arrived" to "just gone". Deriving progress from the element rather
 * than from `scrollY` means the maths survives the hero changing height between
 * breakpoints without a magic number anywhere.
 *
 * @param top The hero's `rect.top`.
 * @param height The hero's `rect.height`. Zero (not laid out yet) yields 0.
 */
export function heroProgress(top: number, height: number): number {
  if (!(height > 0)) return 0;
  return clamp01(-top / height);
}

/**
 * The transform for a given point in the hero's travel.
 *
 * @param progress 0 when the hero's top meets the viewport's top, 1 when it has
 *   fully passed. Values outside that range clamp; a non-finite value (an
 *   element with no height yields `0/0`) falls back to the start of the track.
 * @param damping Multiplier on the rotation channels only, 0–1. Narrow
 *   viewports run damped because a yawed plane eats horizontal room, and
 *   `prefers-reduced-motion` runs at 0 — which flattens the plane while leaving
 *   the gentle push-in, rather than freezing the hero outright.
 */
export function orbitTransform(progress: number, damping = 1): string {
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  const d = clamp01(damping);

  // The last segment owns everything at or past its start, so `length - 2` is
  // the highest index that still has a partner to interpolate towards.
  let i = 0;
  while (i < ORBIT_TRACK.length - 2 && p > ORBIT_TRACK[i + 1].at) i++;

  const from = ORBIT_TRACK[i];
  const to = ORBIT_TRACK[i + 1];
  const span = to.at - from.at;
  const t = span === 0 ? 0 : (p - from.at) / span;
  const mix = (a: number, b: number) => a + (b - a) * t;

  return (
    `rotateY(${round(mix(from.rotateY, to.rotateY) * d)}deg) ` +
    `rotateX(${round(mix(from.rotateX, to.rotateX) * d)}deg) ` +
    `scale(${round(mix(from.scale, to.scale))}) ` +
    `translateY(${round(mix(from.translateYPct, to.translateYPct))}%)`
  );
}
