"use client";

import { useEffect, useRef, useState } from "react";
import { RenderObject } from "@/components/marketing/RenderObject";
import { heroProgress, orbitTransform } from "@/lib/scrollOrbit";

/**
 * The hero: a full-bleed band of `brand` petrol carrying one floating object,
 * which the page's scroll swings through three viewing angles (ADR-008,
 * ADR-014).
 *
 * **The ground is flat colour, not a photograph.** That is the reference's
 * language, and it deletes a whole class of problem with it: `TYPE_SCRIM` and
 * the fog scrims existed only to keep ink legible over brick, and the headline
 * is now white on a token whose contrast is fixed at 9.86:1 by the token
 * itself. The terrace photograph moved to the categories split, where it is a
 * subject rather than a backdrop.
 *
 * Everything overlaid arrives as `children` from the server component, so this
 * file is the only client JavaScript the landing page ships. It publishes:
 *
 * - `data-entered` on the section, flipped on after mount, driving the staggered
 *   entrance of everything overlaid. Utilities and transitions only, no
 *   keyframes — a hand-added rule in `globals.css` goes stale under Turbopack's
 *   Tailwind cache (`src/lib/plateWash.ts`).
 * - `data-orbit`, so the reduced-motion path is assertable from an e2e test.
 *
 * Hand-rolled rather than a motion library: the whole effect is one
 * `rAF`-throttled scroll listener writing one `transform`, and the maths that
 * would be worth a dependency lives in `@/lib/scrollOrbit`, unit tested. See
 * ADR-008.
 */

/** Rotation multiplier below `sm`. A yawed plane eats horizontal room. */
const NARROW_DAMPING = 0.4;

export function HeroStage({ children }: { children: React.ReactNode }) {
  const heroRef = useRef<HTMLElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [entered, setEntered] = useState(false);

  // Split from the orbit effect so a mid-session change to the OS setting tears
  // the listener down rather than merely damping it.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // One frame after mount, so the transition has an initial state to leave.
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const plane = planeRef.current;
    if (!hero || !plane) return;

    // Reduced motion gets no scroll coupling at all, not a damped version of
    // it: scroll-linked scale is exactly the thing that provokes vestibular
    // discomfort, so the object is set square-on and left alone.
    if (reduced) {
      plane.style.transform = orbitTransform(0.5, 0);
      return;
    }

    const narrow = window.matchMedia("(max-width: 639px)");

    let raf = 0;
    let onScreen = true;
    let last = "";

    const paint = () => {
      raf = 0;
      const rect = hero.getBoundingClientRect();
      const next = orbitTransform(
        heroProgress(rect.top, rect.height),
        narrow.matches ? NARROW_DAMPING : 1,
      );
      // The rounding in `orbitTransform` is what makes this guard bite: without
      // it, float noise changes the string on frames where nothing moved.
      if (next !== last) {
        plane.style.transform = next;
        last = next;
      }
    };

    const schedule = () => {
      if (!raf && onScreen) raf = requestAnimationFrame(paint);
    };

    // Once the hero has scrolled away there is nothing to move, so the scroll
    // listener stops doing work for the whole rest of the page.
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) schedule();
    });
    observer.observe(hero);

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    narrow.addEventListener("change", schedule);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      narrow.removeEventListener("change", schedule);
    };
  }, [reduced]);

  return (
    <section
      ref={heroRef}
      data-testid="hero-stage"
      data-entered={entered ? "true" : "false"}
      className="group/hero bg-brand relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* A single soft bloom above the object, so the flat band has a light
          source rather than reading as a colour swatch. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "radial-gradient(60rem 40rem at 68% 18%, color-mix(in oklab, var(--color-pale) 16%, transparent), transparent 70%)",
        }}
      />

      {/* The object, on the orbit. Sized against the band rather than the
          content column so it stays the hero's subject at every width. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 flex w-full items-center justify-center opacity-0 transition-opacity duration-[1200ms] ease-out group-data-[entered=true]/hero:opacity-100 lg:w-[52%] lg:justify-start"
      >
        <div className="[perspective:1400px]">
          <div
            ref={planeRef}
            data-testid="hero-plane"
            data-orbit={reduced ? "static" : "live"}
            className="will-change-transform [transform-origin:50%_50%]"
            // Server-rendered at the start of the track, which is the correct
            // frame for a page opened at the top — so there is no untransformed
            // flash before the effect runs.
            style={{ transform: orbitTransform(0) }}
          >
            <RenderObject
              variant="gable"
              className="h-[22rem] w-[22rem] sm:h-[26rem] sm:w-[26rem] lg:h-[34rem] lg:w-[34rem]"
            />
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}
