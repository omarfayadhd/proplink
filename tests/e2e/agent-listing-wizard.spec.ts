import { test, expect } from "@playwright/test";
import { closeDb, hasDb, q } from "./helpers/db";
import { runId } from "./helpers/runId";
import { login } from "./helpers/login";

// Full-flow spec needs the live dev database (H1.2) — same convention as the
// Sprint 1 specs. The "a 4th LIVE listing is blocked by the limit" criterion
// from the sprint plan is covered at the service level instead of here:
// approving a listing to LIVE is an ADMIN action that only exists as a
// service function (`transitionStatus`) until Task 2.3 ships the admin
// moderation route/UI — see tests/unit/listing-service.test.ts.
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const RUN = runId("w2listing");

test.afterAll(async () => {
  await q(`DELETE FROM "Property" WHERE title LIKE $1`, [`${RUN}%`]);
  await closeDb();
});

test("agent completes the 5-step wizard and submits for review", async ({ page }) => {
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
  await page.fill("#title", `${RUN} — Three-bed semi needing full refurbishment`);
  await page.fill(
    "#description",
    "Probate sale, vacant since 2024, subsidence reported on the rear elevation.",
  );
  await page.selectOption("#propertyType", "RESIDENTIAL");
  await page.fill("#bedrooms", "3");
  await page.fill("#askingPricePounds", "150000");

  // Save Draft becomes available once the core fields are filled.
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");

  // Step 3 — distress tags + pricing safeguard
  await page.getByRole("button", { name: "3. Distress tags" }).click();
  await page.getByRole("button", { name: "Probate sale" }).click();
  await page.getByRole("button", { name: "Subsidence" }).click();
  await page.check("#pricingSafeguardAck");

  // Step 4 — media (EPC rating; photos/certs are optional for submission)
  await page.getByRole("button", { name: "4. Media" }).click();
  await page.selectOption("#epcRating", "D");

  // Step 5 — review & submit
  await page.getByRole("button", { name: "5. Review" }).click();
  await expect(page.getByText("Ready to submit for review.")).toBeVisible();
  await page.getByRole("button", { name: "Submit for review" }).click();

  await page.waitForURL("**/agent/listings");
  // Scoped: the "Draft saved" toast from the mid-flow Save Draft click above
  // can still be visible (4s auto-dismiss) when this one fires, which trips
  // Playwright's strict-mode check on a bare getByRole("status").
  await expect(
    page.getByRole("status").filter({ hasText: "submitted for review" }),
  ).toBeVisible();

  const [property] = await q<{ status: string }>(
    `SELECT status FROM "Property" WHERE title = $1`,
    [`${RUN} — Three-bed semi needing full refurbishment`],
  );
  expect(property.status).toBe("PENDING_REVIEW");
});
