/**
 * Per-worker unique prefix for a spec's DB fixtures.
 *
 * Every spec tags the rows it creates with a prefix and deletes
 * `WHERE ... LIKE '<prefix>%'` in `afterAll`. That prefix must be unique **per
 * worker**, not just per run: with `fullyParallel: true` each test gets its own
 * worker process, the spec module is loaded once per worker, and `afterAll`
 * runs once per worker. Two workers that load the module in the same
 * millisecond therefore share a `Date.now()`-only prefix — and the first one to
 * finish deletes the other's fixtures mid-test.
 *
 * That produced a genuine ~1-in-5 flake in `admin-moderation.spec.ts` (the
 * reject test's listing vanished from `/agent/listings` because the approve
 * test's worker had already torn down everything sharing its prefix).
 *
 * `TEST_WORKER_INDEX` is set by Playwright in each worker process; the pid is a
 * belt-and-braces guard for anything that runs a spec outside the runner.
 */
export function runId(prefix: string): string {
  const worker = process.env.TEST_WORKER_INDEX ?? "x";
  return `${prefix}-w${worker}p${process.pid}-${Date.now()}`;
}
