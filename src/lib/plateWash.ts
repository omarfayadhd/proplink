/**
 * The dark plate wash: three radial washes over `--color-primary`.
 *
 * Originally shared by the landing hero plate and the `SiteHeader` pill, so the
 * two navy surfaces were one material rather than two lookalikes that could
 * drift apart. Both are gone — the hero is a photograph (ADR-007) and the
 * header is a flush unfilled bar (ADR-009) — so `<AuthShell>`'s brand plate is
 * now its only consumer. Kept rather than inlined there because it is still the
 * definition of what a PropLink dark plate looks like, and the next one should
 * match it rather than invent a second recipe.
 *
 * Sized in `rem`, positioned in `%`, so it reads as broad fields on a tall
 * plate. Since ADR-009 its travel is ink → ember rather than navy → blue.
 *
 * Always pair with `bg-primary`: every wash fades to `transparent` and relies on
 * that base underneath.
 *
 * A TS constant rather than a class in `globals.css` on purpose. Turbopack's
 * Tailwind cache serves stale CSS for hand-added rules (ARCHITECTURE.md
 * § Design system records the same trap for `@theme`), so a `.plate-wash` class
 * silently did not exist in the served stylesheet and both surfaces rendered
 * flat navy. An inline `backgroundImage` cannot go stale.
 */
export const PLATE_WASH =
  "radial-gradient(55rem 34rem at 12% -12%, var(--color-secondary), transparent 62%), " +
  "radial-gradient(38rem 26rem at 96% 8%, var(--color-accent), transparent 66%), " +
  "radial-gradient(30rem 24rem at 70% 108%, var(--color-secondary), transparent 70%)";
