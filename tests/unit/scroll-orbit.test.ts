import { describe, expect, it } from "vitest";
import { ORBIT_TRACK, heroProgress, orbitTransform } from "@/lib/scrollOrbit";

describe("heroProgress", () => {
  it("is 0 while the hero's top edge is still at the viewport's top", () => {
    expect(heroProgress(0, 800)).toBe(0);
  });

  it("is 1 once the hero has travelled its own height", () => {
    expect(heroProgress(-800, 800)).toBe(1);
  });

  it("is 0.5 halfway through the hero's travel", () => {
    expect(heroProgress(-400, 800)).toBe(0.5);
  });

  it("clamps to 0 when the hero is pushed below the viewport top", () => {
    // Rubber-band scrolling on iOS reports a positive top at rest.
    expect(heroProgress(120, 800)).toBe(0);
  });

  it("clamps to 1 once the hero is well past", () => {
    expect(heroProgress(-5000, 800)).toBe(1);
  });

  it("is 0 for a hero that has not been laid out yet", () => {
    // A zero height would otherwise divide to NaN and poison the transform.
    expect(heroProgress(0, 0)).toBe(0);
  });
});

describe("orbitTransform", () => {
  it("returns the first keyframe's transform at progress 0", () => {
    expect(orbitTransform(0)).toBe(
      "rotateY(-14deg) rotateX(6deg) scale(1.14) translateY(0%)",
    );
  });

  it("returns the last keyframe's transform at progress 1", () => {
    expect(orbitTransform(1)).toBe(
      "rotateY(12deg) rotateX(-5deg) scale(1.1) translateY(-4%)",
    );
  });

  it("passes through the neutral middle keyframe at half progress", () => {
    expect(orbitTransform(0.5)).toBe(
      "rotateY(0deg) rotateX(0deg) scale(1.04) translateY(0%)",
    );
  });

  it("interpolates linearly between two keyframes", () => {
    // 0.25 is the midpoint of the first pair (0 → 0.5), so every channel should
    // read exactly halfway between them: -14→0, 6→0, 1.14→1.04.
    expect(orbitTransform(0.25)).toBe(
      "rotateY(-7deg) rotateX(3deg) scale(1.09) translateY(0%)",
    );
  });

  it("keeps the track's keyframes in ascending progress order", () => {
    const positions = ORBIT_TRACK.map((frame) => frame.at);
    expect(positions).toStrictEqual([...positions].sort((a, b) => a - b));
    expect(positions.at(0)).toBe(0);
    expect(positions.at(-1)).toBe(1);
  });

  it("clamps progress outside 0–1 to the track's ends", () => {
    expect(orbitTransform(-3)).toBe(orbitTransform(0));
    expect(orbitTransform(4)).toBe(orbitTransform(1));
  });

  it("treats a non-finite progress as the start of the track", () => {
    expect(orbitTransform(Number.NaN)).toBe(orbitTransform(0));
  });

  it("damping scales the rotation down without touching scale or translate", () => {
    // Half damping is the narrow-viewport setting: a tilted plane eats
    // horizontal room on a phone, but the push-in should survive intact.
    expect(orbitTransform(0, 0.5)).toBe(
      "rotateY(-7deg) rotateX(3deg) scale(1.14) translateY(0%)",
    );
  });

  it("zero damping flattens the plane but keeps the push-in", () => {
    expect(orbitTransform(1, 0)).toBe(
      "rotateY(0deg) rotateX(0deg) scale(1.1) translateY(-4%)",
    );
  });

  it("rounds interpolated channels so the transform string stays stable", () => {
    // Floating-point interpolation otherwise emits values like
    // 1.0700000000000003, which churn the inline style on every frame.
    expect(orbitTransform(1 / 3)).not.toMatch(/\d\.\d{4}/);
  });
});
