import { test, expect, type Page } from "@playwright/test";
import { closeDb, hasDb, q } from "./helpers/db";

// Full-flow spec needs the live dev database (H1.2) — same convention as the
// Sprint 1/2 specs (see week2-admin.spec.ts, agent-listing-wizard.spec.ts).
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const RUN = `w2profile-${Date.now()}`;

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/");
}

test.afterAll(async () => {
  await q(`DELETE FROM "CaseStudy" WHERE title LIKE $1`, [`${RUN}%`]);
  await q(`DELETE FROM "Appraisal" WHERE review LIKE $1`, [`${RUN}%`]);
  await closeDb();
});

test("agent adds a case study and it renders with capex/margin on the public profile", async ({
  page,
}) => {
  const [profile] = await q<{ id: string }>(
    `SELECT id FROM "AgentProfile" WHERE "complianceCode" = $1`,
    ["PL-AG-0001"],
  );
  expect(profile).toBeTruthy();

  await login(page, "agent@proplink.test", "Password123!");
  await page.goto("/agent/profile");

  const card = page.locator(`[data-testid="agent-profile-card-${profile.id}"]`);
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Add case study" }).click();
  const title = `${RUN} — probate semi refurb`;
  await card.getByLabel("Title").fill(title);
  await card.getByLabel("Capex (£)").fill("45000");
  await card.getByLabel("Net margin (£)").fill("22000");
  await card
    .getByLabel("Description")
    .fill("Bought at auction, gutted and re-wired, sold within 4 months.");
  await card.getByRole("button", { name: "Add case study" }).click();

  await expect(page.getByRole("status")).toContainText("Case study added");
  await expect(card.getByText(title)).toBeVisible();

  // Public profile page — no login required to view.
  await page.goto(`/agents/${profile.id}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByTestId("case-study-capex")).toContainText("£45,000");
  await expect(page.getByTestId("case-study-net-margin")).toContainText("£22,000");
  await expect(
    page.getByText("Bought at auction, gutted and re-wired, sold within 4 months."),
  ).toBeVisible();
});

test("an unqualified investor cannot post an appraisal (server-enforced 403)", async ({
  page,
}) => {
  const [profile] = await q<{ id: string }>(
    `SELECT id FROM "AgentProfile" WHERE "complianceCode" = $1`,
    ["PL-AG-0002"],
  );
  expect(profile).toBeTruthy();

  // investor@proplink.test has no Enquiry/Deal fixtures against this agent's
  // listings in the seed data — unqualified by construction, no setup needed.
  await login(page, "investor@proplink.test", "Password123!");
  await page.goto(`/agents/${profile.id}`);

  // UI: the review form is not offered, and the reason is explained instead.
  await expect(page.getByTestId("appraisal-ineligible-reason")).toContainText(
    "enquiry or been party to a deal",
  );
  await expect(page.getByLabel("Rating")).toHaveCount(0);

  // API: direct POST is rejected server-side too, not just hidden in the UI.
  const res = await page.request.post(`/api/agents/${profile.id}/appraisals`, {
    data: { rating: 5, review: `${RUN} — should never be created` },
  });
  expect(res.status()).toBe(403);

  const rows = await q(`SELECT id FROM "Appraisal" WHERE review LIKE $1`, [`${RUN}%`]);
  expect(rows.length).toBe(0);
});
