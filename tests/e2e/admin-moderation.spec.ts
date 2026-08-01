import { test, expect, type Page } from "@playwright/test";
import { closeDb, hasDb, q } from "./helpers/db";

// Full-flow spec needs the live dev database (H1.2) — same convention as the
// Sprint 1/2 specs (see week2-admin.spec.ts, agent-listing-wizard.spec.ts).
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const RUN = `w2mod-${Date.now()}`;

/**
 * This spec is the first to re-login mid-test in the same browser context
 * (agent -> admin -> agent), unlike week2-admin.spec.ts/agent-listing-wizard.spec.ts
 * which each log in exactly once. Two hardenings over the simple
 * fill+click+waitForURL used elsewhere:
 *  1. `clearCookies()` first — a clean slate before every sign-in, so a stale
 *     session/CSRF cookie from the *previous* login can't race with or shadow
 *     the new one.
 *  2. A deterministic post-condition instead of a loose waitForURL match on
 *     the home route: the login page calls `signIn({ redirect: false })` then does a
 *     client-side `router.push("/")`, so a URL-based wait can resolve before
 *     the session cookie is actually live — or, on a slow/raced hydration,
 *     before the click's `onSubmit` handler even ran. Polling
 *     `/api/auth/session` for the expected email is the actual invariant we
 *     need ("this call ends with an X session or throws"), and — unlike a URL
 *     match — it can't be satisfied by a stale, pre-existing session.
 *  3. Pre-empt the GDPR cookie-consent banner
 *     (`src/components/layout/CookieBanner.tsx` — `localStorage`-backed, key
 *     `proplink-cookie-consent`, NOT an actual cookie despite the name) via
 *     `addInitScript`, which runs before any page script on every subsequent
 *     navigation for this `page`'s lifetime. Without this the banner mounts
 *     on every fresh navigation (nothing ever dismisses it) and, being
 *     `fixed inset-x-0 bottom-0`, intercepts pointer events on any
 *     bottom-of-viewport control — here, the moderation modal's
 *     Approve/Reject buttons.
 */
async function login(page: Page, email: string, password: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem("proplink-cookie-consent", "essential");
  });

  await page.context().clearCookies();
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");

  await expect(async () => {
    const res = await page.request.get("/api/auth/session");
    const body = await res.json().catch(() => null);
    expect(body?.user?.email).toBe(email);
  }).toPass({ timeout: 10_000 });
}

/** Drives the Task 2.2 wizard (same steps as agent-listing-wizard.spec.ts) to PENDING_REVIEW. */
async function submitListingForReview(page: Page, title: string) {
  await login(page, "agent@proplink.test", "Password123!");

  await page.goto("/agent/listings/new");
  await expect(page.getByRole("heading", { name: "Address & location" })).toBeVisible();

  // Step 1 — address
  await page.fill("#addressLine1", "12 Example Road");
  await page.fill("#city", "Manchester");
  await page.fill("#region", "Greater Manchester");
  await page.fill("#postcode", "M1 1AE");

  // Step 2 — details
  await page.getByRole("button", { name: "2. Details" }).click();
  await page.fill("#title", title);
  await page.fill(
    "#description",
    "Probate sale, vacant since 2024, subsidence reported on the rear elevation.",
  );
  await page.selectOption("#propertyType", "RESIDENTIAL");
  await page.fill("#bedrooms", "3");
  await page.fill("#askingPricePounds", "150000");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");

  // Step 3 — distress tags + pricing safeguard
  await page.getByRole("button", { name: "3. Distress tags" }).click();
  await page.getByRole("button", { name: "Probate sale" }).click();
  await page.getByRole("button", { name: "Subsidence" }).click();
  await page.check("#pricingSafeguardAck");

  // Step 4 — media (EPC rating)
  await page.getByRole("button", { name: "4. Media" }).click();
  await page.selectOption("#epcRating", "D");

  // Step 5 — review & submit
  await page.getByRole("button", { name: "5. Review" }).click();
  await page.getByRole("button", { name: "Submit for review" }).click();

  await page.waitForURL("**/agent/listings");
  // Scoped: the "Draft saved" toast from the mid-flow Save Draft click (line
  // above) can still be visible (4s auto-dismiss) when this one fires, which
  // trips Playwright's strict-mode check on a bare getByRole("status").
  await expect(
    page.getByRole("status").filter({ hasText: "submitted for review" }),
  ).toBeVisible();
}

test.afterAll(async () => {
  await q(
    `DELETE FROM "AuditLog" WHERE entity = 'Property' AND "entityId" IN (SELECT id FROM "Property" WHERE title LIKE $1)`,
    [`${RUN}%`],
  );
  await q(`DELETE FROM "Property" WHERE title LIKE $1`, [`${RUN}%`]);
  await closeDb();
});

test("admin approves a pending listing to LIVE", async ({ page }) => {
  const title = `${RUN} — approve — Three-bed semi needing full refurbishment`;
  await submitListingForReview(page, title);

  await login(page, "admin@proplink.test", "Password123!");
  await page.goto("/admin/moderation");

  const row = page.locator("tr", { hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Review" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status")).toContainText("approved");

  // Approved listing drops out of the PENDING_REVIEW queue.
  await expect(page.locator("tr", { hasText: title })).toHaveCount(0);

  const [property] = await q<{ status: string; publishedAt: string | null }>(
    `SELECT status, "publishedAt" FROM "Property" WHERE title = $1`,
    [title],
  );
  expect(property.status).toBe("LIVE");
  expect(property.publishedAt).not.toBeNull();

  const audits = await q(
    `SELECT id FROM "AuditLog" WHERE entity = 'Property' AND action = 'LISTING_APPROVED'
       AND "entityId" = (SELECT id FROM "Property" WHERE title = $1)`,
    [title],
  );
  expect(audits.length).toBe(1);

  // Sprint-plan acceptance criterion: the listing shows a LIVE badge.
  await login(page, "agent@proplink.test", "Password123!");
  await page.goto("/agent/listings");
  await expect(page.locator("tr", { hasText: title }).getByText("LIVE")).toBeVisible();
});

test("admin rejects a pending listing with a reason", async ({ page }) => {
  const title = `${RUN} — reject — Three-bed semi needing full refurbishment`;
  await submitListingForReview(page, title);

  await login(page, "admin@proplink.test", "Password123!");
  await page.goto("/admin/moderation");

  const row = page.locator("tr", { hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Review" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Rejection reason (required)")
    .fill("Missing EPC certificate detail");
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByRole("status")).toContainText("rejected");

  // Rejected listing drops out of the PENDING_REVIEW queue too.
  await expect(page.locator("tr", { hasText: title })).toHaveCount(0);

  const [property] = await q<{ status: string; rejectionReason: string | null }>(
    `SELECT status, "rejectionReason" FROM "Property" WHERE title = $1`,
    [title],
  );
  expect(property.status).toBe("DRAFT");
  expect(property.rejectionReason).toBe("Missing EPC certificate detail");

  const audits = await q(
    `SELECT id FROM "AuditLog" WHERE entity = 'Property' AND action = 'LISTING_REJECTED'
       AND "entityId" = (SELECT id FROM "Property" WHERE title = $1)`,
    [title],
  );
  expect(audits.length).toBe(1);

  // Agent sees why it bounced back to DRAFT.
  await login(page, "agent@proplink.test", "Password123!");
  await page.goto("/agent/listings");
  await expect(
    page.locator("tr", { hasText: title }).getByText(/Rejected: Missing EPC certificate/),
  ).toBeVisible();
});
