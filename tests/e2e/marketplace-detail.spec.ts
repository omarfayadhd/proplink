import { test, expect } from "@playwright/test";
import { closeDb, hasDb, q } from "./helpers/db";
import { runId } from "./helpers/runId";
import { login } from "./helpers/login";

// Full-flow spec needs the live dev database (H1.2) — same convention as the
// Sprint 1/2 specs (see week2-admin.spec.ts, agent-listing-wizard.spec.ts).
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

/**
 * Unlike the other Sprint 2 specs, this one shares one set of DB fixtures
 * across its tests instead of each test creating its own. Under the config's
 * `fullyParallel: true` every test would get its own worker — and `beforeAll`/
 * `afterAll` run *per worker*, so the shared inserts would collide on the
 * primary key and one worker's teardown would delete rows another worker was
 * still reading (both observed before this line was added). `mode: "default"`
 * keeps the file in a single worker, running its tests in order, without
 * `"serial"`'s skip-the-rest-on-first-failure behaviour.
 */
test.describe.configure({ mode: "default" });

const RUN = runId("w4detail");
const LIVE_ID = `${RUN}-live`;
const DRAFT_ID = `${RUN}-draft`;
const ASKING_PENCE = 18_500_000; // £185,000

/**
 * Fixtures are inserted with raw SQL rather than driven through the Task 2.2
 * wizard + Task 2.3 approve flow: those paths already have their own specs
 * (`agent-listing-wizard`, `admin-moderation`), and re-driving them here would
 * make this spec fail for reasons that have nothing to do with the detail
 * page. Ids are supplied explicitly (Prisma generates cuids in application
 * code, not in the DB) so cleanup and assertions can key off them.
 */
test.beforeAll(async () => {
  const [profile] = await q<{ id: string }>(
    `SELECT id FROM "AgentProfile" WHERE "complianceCode" = $1`,
    ["PL-AG-0001"],
  );
  expect(
    profile,
    "seed AgentProfile PL-AG-0001 missing — run npm run db:seed",
  ).toBeTruthy();

  await q(
    `INSERT INTO "Property" (
       id, "agentProfileId", title, description, status, "addressLine1", city, region,
       postcode, "propertyType", bedrooms, "askingPriceGBP", "targetRoiPct", "epcRating",
       "createdAt", "publishedAt"
     ) VALUES ($1, $2, $3, $4, 'LIVE', $5, $6, $7, $8, 'RESIDENTIAL', 3, $9, 18.5, 'E',
       NOW(), NOW())`,
    [
      LIVE_ID,
      profile.id,
      `${RUN} — three-bed semi needing full refurbishment`,
      "Probate sale. Sound structure, dated throughout: full rewire, new roof covering and a replacement kitchen assumed in the numbers.",
      "12 Example Road",
      "Manchester",
      "Greater Manchester",
      "M1 1AE",
      ASKING_PENCE,
    ],
  );

  // PostGIS point, written the same way `listingService.setPropertyLocation`
  // does — the detail page reads it back for the static map.
  await q(
    `UPDATE "Property" SET "location" = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
     WHERE id = $1`,
    [LIVE_ID, -2.2374, 53.4808],
  );

  await q(
    `INSERT INTO "PropertyDistressTag" ("propertyId", tag) VALUES ($1, 'PROBATE'), ($1, 'RENOVATION_NEEDED')`,
    [LIVE_ID],
  );
  await q(
    `INSERT INTO "PropertyImage" (id, "propertyId", url, "sortOrder")
     VALUES ($2, $1, '/uploads/dev/e2e-detail-1.jpg', 0), ($3, $1, '/uploads/dev/e2e-detail-2.jpg', 1)`,
    [LIVE_ID, `${RUN}-img1`, `${RUN}-img2`],
  );

  // A non-public listing owned by the same agent — the 404 case.
  await q(
    `INSERT INTO "Property" (
       id, "agentProfileId", title, description, status, "addressLine1", city, region,
       postcode, "propertyType", bedrooms, "askingPriceGBP", "createdAt"
     ) VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8, 'RESIDENTIAL', 2, $9, NOW())`,
    [
      DRAFT_ID,
      profile.id,
      `${RUN} — unpublished draft`,
      "Should never be publicly visible.",
      "3 Hidden Lane",
      "Leeds",
      "West Yorkshire",
      "LS1 4AP",
      9_500_000,
    ],
  );
});

test.afterAll(async () => {
  await q(`DELETE FROM "Enquiry" WHERE "propertyId" = ANY($1::text[])`, [
    [LIVE_ID, DRAFT_ID],
  ]);
  // PropertyImage/PropertyDistressTag cascade on Property delete.
  await q(`DELETE FROM "Property" WHERE id = ANY($1::text[])`, [[LIVE_ID, DRAFT_ID]]);
  await closeDb();
});

test("a LIVE listing renders gallery, distress chips, EPC badge, price, ROI, map and agent card", async ({
  page,
}) => {
  await page.goto(`/marketplace/${LIVE_ID}`);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /three-bed semi needing full refurbishment/i,
    }),
  ).toBeVisible();

  // Gallery — main image plus a keyboard-reachable thumbnail per photo.
  const mainImage = page.getByTestId("gallery-main-image");
  await expect(mainImage).toHaveAttribute("src", "/uploads/dev/e2e-detail-1.jpg");
  await expect(mainImage).toHaveAttribute("alt", /photo 1 of 2/i);
  const thumbnails = page.getByRole("tab", { name: /Show photo/ });
  await expect(thumbnails).toHaveCount(2);
  await thumbnails.nth(1).click();
  await expect(mainImage).toHaveAttribute("src", "/uploads/dev/e2e-detail-2.jpg");

  // Distress chips + EPC badge (AGENTS.md: EPC displayed on every listing).
  await expect(page.getByText("Probate sale", { exact: true })).toBeVisible();
  await expect(page.getByText("Renovation needed", { exact: true })).toBeVisible();
  await expect(page.getByTestId("epc-badge")).toHaveText("E");

  // Money is stored as integer pence, formatted at the display boundary.
  await expect(page.getByTestId("asking-price")).toHaveText("£185,000");
  await expect(page.getByTestId("target-roi")).toContainText("18.5%");

  // Static map (mock provider — no Google key locally, H2.2/H3.1) + satellite toggle.
  const map = page.getByTestId("property-map-image");
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute("alt", /Map view of 12 Example Road, Manchester/i);
  await page.getByRole("tab", { name: "Satellite" }).click();
  await expect(map).toHaveAttribute(
    "alt",
    /Satellite view of 12 Example Road, Manchester/i,
  );

  // Agent card links through to the Task 2.4 public profile.
  const agentCard = page.getByRole("region", { name: "Listing agent" });
  await expect(
    agentCard.getByRole("link", { name: "Northgate Distressed Assets" }),
  ).toBeVisible();

  // Price history replaced both placeholders (ADR-017). It renders from seeded
  // sample comparables, and the sample notice is asserted in
  // `buyer-journey.spec.ts` — the constraint that it must never look
  // authoritative belongs with the buyer journey that reads it.
  await expect(page.getByRole("heading", { name: "Price history" })).toBeVisible();
});

test("SEO metadata: title, description, canonical and OpenGraph tags are rendered server-side", async ({
  page,
}) => {
  await page.goto(`/marketplace/${LIVE_ID}`);

  await expect(page).toHaveTitle(new RegExp(`${RUN}.*PropLink UK`));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`/marketplace/${LIVE_ID}$`),
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /£185,000 — RESIDENTIAL in Manchester, M1 1AE/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    new RegExp(RUN),
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "website",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /e2e-detail-1\.jpg$/,
  );

  // Semantic landmarks the Lighthouse SEO/a11y audits key off.
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("address")).toContainText("Manchester");
});

test("a logged-in buyer posts an enquiry and it lands as an Enquiry row for the agent", async ({
  page,
}) => {
  await login(page, "buyer@proplink.test", "Password123!");
  await page.goto(`/marketplace/${LIVE_ID}`);

  const form = page.getByRole("form", { name: "Post enquiry" });
  await expect(form).toBeVisible();

  const message = `${RUN} — is the roof quote still valid, and can I view this weekend?`;
  await form.getByLabel("Message").fill(message);
  await form.getByLabel(/Contact phone/).fill("07700 900123");
  await form.getByRole("button", { name: "Post enquiry" }).click();

  await expect(page.getByRole("status")).toContainText("Enquiry sent");

  const rows = await q<{ message: string; status: string; email: string }>(
    `SELECT e.message, e.status, u.email
       FROM "Enquiry" e JOIN "User" u ON u.id = e."fromUserId"
      WHERE e."propertyId" = $1`,
    [LIVE_ID],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].email).toBe("buyer@proplink.test");
  expect(rows[0].status).toBe("NEW");
  expect(rows[0].message).toContain(message);
  // `contactPhone` has no dedicated column — the service folds it into the message.
  expect(rows[0].message).toContain("07700 900123");
});

test("an anonymous visitor is asked to log in instead of being shown the enquiry form", async ({
  page,
}) => {
  await page.goto(`/marketplace/${LIVE_ID}`);

  await expect(page.getByRole("form", { name: "Post enquiry" })).toHaveCount(0);
  await expect(page.getByText("to contact the agent about this property.")).toBeVisible();

  // And the endpoint itself refuses, not just the UI.
  const res = await page.request.post("/api/enquiries", {
    data: { propertyId: LIVE_ID, message: `${RUN} — anonymous, must be rejected` },
  });
  expect(res.status()).toBe(401);

  const rows = await q(`SELECT id FROM "Enquiry" WHERE message LIKE $1`, [`%anonymous%`]);
  expect(rows.length).toBe(0);
});

test("a DRAFT listing 404s for the public but previews for its owning agent", async ({
  page,
}) => {
  const res = await page.request.get(`/marketplace/${DRAFT_ID}`);
  expect(res.status()).toBe(404);

  await login(page, "agent@proplink.test", "Password123!");
  await page.goto(`/marketplace/${DRAFT_ID}`);
  await expect(
    page.getByRole("heading", { level: 1, name: /unpublished draft/i }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("not yet publicly visible");
  // A preview must never be indexed, and can't be enquired on.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("form", { name: "Post enquiry" })).toHaveCount(0);
});
