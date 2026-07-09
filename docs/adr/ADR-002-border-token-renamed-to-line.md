# ADR-002 — Brand "border" colour exposed as `line`

**Status:** Accepted · **Date:** 2026-07-09 · **Sprint:** 1 (Task 1.1)

## Context

The design brief names a brand colour `border: #D0DAE6`. In Tailwind v4, defining
`--color-border` generates utilities like `border-border`, which is noisy and
collides mentally with Tailwind's own `border-*` width/style utilities.

## Decision

Expose the token as `--color-line` → utilities `border-line`, `bg-line`, etc.
The hex value `#D0DAE6` is unchanged.

## Consequences

- Use `border-line` wherever the brief says "border colour".
- If a future designer supplies overrides, map their "border" to `line`.
