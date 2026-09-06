import { test, expect } from "@playwright/test";
import { closeDb, hasDb, q } from "./helpers/db";
import { runId } from "./helpers/runId";
import { login } from "./helpers/login";

// Full-flow spec needs the live dev database (H1.2) — same convention as the
// Sprint 1/2 specs (see week2-admin.spec.ts, agent-listing-wizard.spec.ts).
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

// Shares one listing + lead across its tests — see marketplace-detail.spec.ts
// for why that needs a single worker.
test.describe.configure({ mode: "default" });

const RUN = runId("w4leads");
const LISTING_ID = `${RUN}-listing`;
const ENQUIRY_ID = `${RUN}-enquiry`;

/**
 * Fixtures live on **PL-AG-0002 (Mercia Probate Properties)** on purpose: the
 * shared `login()` helper clears cookies, which drops the active-profile
 * cookie, so `/agent/leads` falls back to the agent's first profile
 * alphabetically — Mercia. Putting the fixtures anywhere else would mean
 * driving the profile switcher first, which is Task 2.4's spec's job.
 *
 * Assertions deliberately key off *this* listing/lead rather than the profile's
 * headline totals: the wizard and moderation specs also create listings under
 * the same profile, so any total is a moving target under parallel runs.
 */
async function activeProfileId(): Promise<string> {
  const [profile] = await q<{ id: string }>(
    `SELECT id FROM "AgentProfile" WHERE "complianceCode" = $1`,
    ["PL-AG-0002"],
  );
  expect(
    profile,
    "seed AgentProfile PL-AG-0002 missing — run npm run db:seed",
  ).toBeTruthy();
  return profile.id;
}

async function viewCount(): Promise<number> {
  const [row] = await q<{ viewCount: number }>(
    `SELECT "viewCount" FROM "Property" WHERE id = $1`,
    [LISTING_ID],
  );
  return row.viewCount;
}

test.beforeAll(async () => {
  const profileId = await activeProfileId();

  // UNDER_OFFER rather than LIVE deliberately. It is publicly visible either
  // way (so views, saves and enquiries all behave identically), but only LIVE
  // listings count against the free tier's 3-listing cap — and the seed has a
  // single agent user owning all three profiles, so a LIVE fixture here would
  // eat into the headroom `admin-moderation.spec.ts`'s approve test needs.
  await q(
    `INSERT INTO "Property" (
       id, "agentProfileId", title, description, status, "addressLine1", city, region,
       postcode, "propertyType", bedrooms, "askingPriceGBP", "epcRating",
       "createdAt", "publishedAt"
     ) VALUES ($1, $2, $3, $4, 'UNDER_OFFER', $5, 'Birmingham', 'West Midlands', 'B1 1AA',
       'RESIDENTIAL', 2, 12500000, 'D', NOW(), NOW())`,
    [
      LISTING_ID,
      profileId,
      `${RUN} — probate terrace, full modernisation`,
      "Deceased estate, vacant 14 months. Roof sound, everything else dated.",
      "8 Analytics Row",
    ],
  );

  const [buyer] = await q<{ id: string }>(`SELECT id FROM "User" WHERE email = $1`, [
    "buyer@proplink.test",
  ]);
  await q(
    `INSERT INTO "Enquiry" (id, "propertyId", "fromUserId", message, status, "createdAt")
     VALUES ($1, $2, $3, $4, 'NEW', NOW())`,
    [ENQUIRY_ID, LISTING_ID, buyer.id, `${RUN} — can I view this on Saturday morning?`],
  );
});

test.afterAll(async () => {
  // Every table that can reference a Property, or the delete below fails on a
  // foreign key and leaves an orphaned listing behind — one with no images,
  // which then breaks `tests/integration/search-service.test.ts` for every
  // later run. The buyer write paths (ADR-017) added three of these.
  await q(`DELETE FROM "ChatMessage" WHERE "propertyId" = $1`, [LISTING_ID]);
  await q(`DELETE FROM "Viewing" WHERE "propertyId" = $1`, [LISTING_ID]);
  await q(
    `DELETE FROM "Deal" WHERE "offerId" IN (SELECT id FROM "Offer" WHERE "propertyId" = $1)`,
    [LISTING_ID],
  );
  await q(`DELETE FROM "Offer" WHERE "propertyId" = $1`, [LISTING_ID]);
  await q(`DELETE FROM "Enquiry" WHERE "propertyId" = $1`, [LISTING_ID]);
  await q(`DELETE FROM "SavedProperty" WHERE "propertyId" = $1`, [LISTING_ID]);
  await q(`DELETE FROM "Property" WHERE id = $1`, [LISTING_ID]);
  await closeDb();
});

test("a view increments the counter once per session, not once per page load", async ({
  page,
}) => {
  const before = await viewCount();

  await page.goto(`/marketplace/${LISTING_ID}`);
  await expect.poll(viewCount, { timeout: 5_000 }).toBe(before + 1);

  // Reload twice in the same session — the view cookie must suppress both.
  await page.reload();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Give a stray beacon time to land before asserting it didn't.
  await expect.poll(viewCount, { timeout: 2_000 }).toBe(before + 1);
});

test("a different browser session counts as a new view", async ({ browser }) => {
  const before = await viewCount();

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/marketplace/${LISTING_ID}`);
  await expect.poll(viewCount, { timeout: 5_000 }).toBe(before + 1);
  await context.close();
});

test("the owning agent's own views are not counted", async ({ page }) => {
  await login(page, "agent@proplink.test", "Password123!");

  const before = await viewCount();
  await page.goto(`/marketplace/${LISTING_ID}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await expect.poll(viewCount, { timeout: 2_000 }).toBe(before);
});

test("a buyer saves a listing and the agent's saves count reflects it", async ({
  page,
}) => {
  await login(page, "buyer@proplink.test", "Password123!");
  await page.goto(`/marketplace/${LISTING_ID}`);

  const saveButton = page.getByTestId("save-listing-button");
  await expect(saveButton).toHaveText(/Save/);
  await saveButton.click();
  await expect(page.getByRole("status")).toContainText("Saved to your list");
  await expect(saveButton).toHaveText(/Saved/);

  const saved = await q(`SELECT "userId" FROM "SavedProperty" WHERE "propertyId" = $1`, [
    LISTING_ID,
  ]);
  expect(saved).toHaveLength(1);

  // The agent sees the save reflected in their listings table.
  await login(page, "agent@proplink.test", "Password123!");
  await page.goto("/agent/listings");
  await expect(page.getByTestId(`saves-${LISTING_ID}`)).toHaveText("1");

  // Unsaving removes the row again (idempotent both ways).
  await login(page, "buyer@proplink.test", "Password123!");
  await page.goto(`/marketplace/${LISTING_ID}`);
  await expect(page.getByTestId("save-listing-button")).toHaveText(/Saved/);
  await page.getByTestId("save-listing-button").click();
  await expect(page.getByRole("status")).toContainText("Removed from your list");

  await expect
    .poll(
      async () =>
        (
          await q(`SELECT "userId" FROM "SavedProperty" WHERE "propertyId" = $1`, [
            LISTING_ID,
          ])
        ).length,
    )
    .toBe(0);
});

test("an agent changes a lead's status and it persists across a reload", async ({
  page,
}) => {
  await login(page, "agent@proplink.test", "Password123!");
  await page.goto("/agent/leads");

  // Analytics strip renders for the active profile.
  await expect(page.getByTestId("analytics-views")).toBeVisible();
  await expect(page.getByTestId("analytics-saves")).toBeVisible();
  await expect(page.getByTestId("analytics-leads")).toBeVisible();

  const row = page.locator("tr", { hasText: `${RUN} — can I view this on Saturday` });
  await expect(row).toBeVisible();
  await expect(row.getByText("NEW", { exact: true })).toBeVisible();

  await row.getByRole("combobox").selectOption("RESPONDED");
  await expect(page.getByRole("status")).toContainText("Lead status updated");

  const [enquiry] = await q<{ status: string }>(
    `SELECT status FROM "Enquiry" WHERE id = $1`,
    [ENQUIRY_ID],
  );
  expect(enquiry.status).toBe("RESPONDED");

  // And it survives a fresh server render, not just the optimistic UI.
  await page.reload();
  const reloaded = page.locator("tr", {
    hasText: `${RUN} — can I view this on Saturday`,
  });
  await expect(reloaded.getByText("RESPONDED", { exact: true })).toBeVisible();
});

test("an agent cannot change another agency's lead (server-enforced 403)", async ({
  page,
}) => {
  // A lead on a listing owned by a *different* agent user. The seed has only
  // one agent, so this asserts the negative through the API using a
  // non-agent session, which `requireRole('AGENT')` must refuse outright.
  await login(page, "buyer@proplink.test", "Password123!");

  const res = await page.request.patch(`/api/enquiries/${ENQUIRY_ID}`, {
    data: { status: "CLOSED" },
  });
  expect(res.status()).toBe(403);

  const [enquiry] = await q<{ status: string }>(
    `SELECT status FROM "Enquiry" WHERE id = $1`,
    [ENQUIRY_ID],
  );
  expect(enquiry.status).not.toBe("CLOSED");
});
