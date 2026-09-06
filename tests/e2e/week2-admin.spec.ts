import { test, expect } from "@playwright/test";
import { closeDb, hasDb, q } from "./helpers/db";
import { runId } from "./helpers/runId";
import { login } from "./helpers/login";

test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const RUN = runId("w2admin");

test.afterAll(async () => {
  await q(
    `DELETE FROM "AuditLog" WHERE "entityId" IN (SELECT id FROM "User" WHERE email LIKE $1)`,
    [`${RUN}%`],
  );
  await q(`DELETE FROM "User" WHERE email LIKE $1`, [`${RUN}%`]);
  await closeDb();
});

test("non-admin hitting /admin gets the 403 page", async ({ page }) => {
  await login(page, "investor@proplink.test", "Password123!");
  await page.goto("/admin");
  await expect(page.getByText("403")).toBeVisible();
  await expect(page.getByText(/don't have access/i)).toBeVisible();
});

test("anonymous hitting /admin is sent to login", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForURL("**/login**");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("admin deactivates a user and an audit row is written", async ({
  page,
  request,
}) => {
  const email = `${RUN}-victim@proplink.test`;

  const reg = await request.post("/api/register", {
    data: {
      email,
      password: "Password123",
      name: "Deactivate Me",
      role: "BUYER",
      gdprConsent: true,
    },
  });
  const { userId } = (await reg.json()) as { userId: string };

  await login(page, "admin@proplink.test", "Password123!");
  await page.goto(`/admin?q=${RUN}-victim`);

  const row = page.locator("tr", { hasText: email });
  await expect(row.getByText("Active")).toBeVisible();
  await row.getByRole("button", { name: "Deactivate" }).click();

  await expect(
    page.locator("tr", { hasText: email }).getByText("Deactivated"),
  ).toBeVisible();

  const audits = await q(
    `SELECT id FROM "AuditLog" WHERE entity = 'User' AND "entityId" = $1 AND action = 'USER_DEACTIVATED'`,
    [userId],
  );
  expect(audits.length).toBe(1);

  // Deactivated users can no longer log in.
  const csrf = await (await request.get("/api/auth/csrf")).json();
  await request.post("/api/auth/callback/credentials", {
    form: { csrfToken: csrf.csrfToken, email, password: "Password123" },
  });
  const session = await (await request.get("/api/auth/session")).json();
  expect(session?.user?.email ?? null).not.toBe(email);
});

test("/dev/ui renders every primitive", async ({ page }) => {
  await page.goto("/dev/ui");
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary" })).toBeVisible();
  for (const rating of ["A", "D", "G"]) {
    await expect(page.getByTestId("epc-badge").filter({ hasText: rating })).toBeVisible();
  }
  await expect(page.getByRole("progressbar")).toBeVisible();
  // Modal opens and closes
  await page.getByRole("button", { name: "Open modal" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  // Toast fires
  await page.getByRole("button", { name: "Success toast" }).click();
  await expect(page.getByRole("status")).toContainText("Listing saved");
});

test("global metrics show computed values from the DB", async ({ page }) => {
  await page.goto("/");
  // The Task 1.5 metrics now live in the landing hero rather than in a
  // full-width strip above the header (ADR-005), and zero-valued ones are
  // omitted — so the count is the number of metrics that currently have a
  // value, not a fixed four.
  const values = page.getByTestId("hero-stats").getByTestId("metric-value");
  expect(await values.count()).toBeGreaterThanOrEqual(1);
  // Values are computed, not stubbed. Asserting the format rather than a
  // figure: the seed's 30 LIVE listings (Task 2.7) make the inventory total
  // non-zero, and the E2E specs add and remove listings of their own as they
  // run, so any exact number would be a moving target.
  await expect(values.first()).toContainText("£");
});
