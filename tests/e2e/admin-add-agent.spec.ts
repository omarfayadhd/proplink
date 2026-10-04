import { test, expect } from "@playwright/test";
import { closeDb, hasDb, q } from "./helpers/db";
import { runId } from "./helpers/runId";
import { login } from "./helpers/login";

// Full-flow spec needs the live dev database (H1.2). Skipped in DB-less CI.
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const RUN = runId("addagent");
const ADMIN = { email: "admin@proplink.test", password: "Password123!" };
const AGENT_PASSWORD = "AgentPass123";

test.afterAll(async () => {
  // AgentProfile references User, so profiles go first.
  await q(
    `DELETE FROM "AgentProfile" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE $1)`,
    [`${RUN}%`],
  );
  await q(
    `DELETE FROM "AuditLog" WHERE "entityId" IN (SELECT id FROM "User" WHERE email LIKE $1)`,
    [`${RUN}%`],
  );
  await q(`DELETE FROM "User" WHERE email LIKE $1`, [`${RUN}%`]);
  await closeDb();
});

async function addAgent(
  page: import("@playwright/test").Page,
  fields: { name: string; email: string; agencyName: string; complianceCode: string },
) {
  await page.goto("/admin/agents/new");
  await page.fill("#name", fields.name);
  await page.fill("#email", fields.email);
  await page.fill("#agencyName", fields.agencyName);
  await page.fill("#complianceCode", fields.complianceCode);
  await page.getByRole("button", { name: "Create agent and send invite" }).click();
}

test("admin creates an agent, who sets a password from the invite and reaches the agent portal", async ({
  page,
}) => {
  const email = `${RUN}-rosa@proplink.test`;
  const code = `${RUN}-CODE`;

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin");
  await page.getByRole("link", { name: "Add agent" }).click();
  await expect(page).toHaveURL(/\/admin\/agents\/new/);

  await addAgent(page, {
    name: "Rosa Fairweather",
    email,
    agencyName: `${RUN} Fairweather & Co`,
    complianceCode: code,
  });

  await expect(page.getByText("Agent created — invite sent.")).toBeVisible();

  // The account exists as an AGENT with no password — it cannot be signed into
  // until the invite is used.
  const [user] = await q<{ id: string; role: string; passwordHash: string | null }>(
    `SELECT id, role, "passwordHash" FROM "User" WHERE email = $1`,
    [email],
  );
  expect(user.role).toBe("AGENT");
  expect(user.passwordHash).toBeNull();

  const [profile] = await q<{ agencyName: string }>(
    `SELECT "agencyName" FROM "AgentProfile" WHERE "userId" = $1`,
    [user.id],
  );
  expect(profile.agencyName).toBe(`${RUN} Fairweather & Co`);

  const [audit] = await q<{ action: string }>(
    `SELECT action FROM "AuditLog" WHERE "entityId" = $1 AND action = 'AGENT_CREATED'`,
    [user.id],
  );
  expect(audit).toBeTruthy();

  // Follow the invite exactly as the agent would.
  const inviteUrl = await page.locator("code").first().innerText();
  expect(inviteUrl).toContain("invite=1");

  await page.goto(inviteUrl);
  await expect(page.getByText("Welcome to PropLink UK")).toBeVisible();
  await page.fill("#password", AGENT_PASSWORD);
  await page.getByRole("button", { name: "Set password and continue" }).click();
  await expect(page).toHaveURL(/\/login\?welcome=1/);

  await login(page, email, AGENT_PASSWORD);
  await page.goto("/agent");
  await expect(page.getByRole("heading", { name: /Your stock/ })).toBeVisible();
  await expect(page.getByText(`${RUN} Fairweather & Co`).first()).toBeVisible();
});

test("the invite is single-use", async ({ page }) => {
  const email = `${RUN}-onceonly@proplink.test`;

  await login(page, ADMIN.email, ADMIN.password);
  await addAgent(page, {
    name: "Single Use",
    email,
    agencyName: `${RUN} Once Only Ltd`,
    complianceCode: `${RUN}-ONCE`,
  });
  const inviteUrl = await page.locator("code").first().innerText();

  await page.goto(inviteUrl);
  await page.fill("#password", AGENT_PASSWORD);
  await page.getByRole("button", { name: "Set password and continue" }).click();
  await expect(page).toHaveURL(/\/login\?welcome=1/);

  // Spending it again must fail rather than silently reset the password.
  await page.goto(inviteUrl);
  await page.fill("#password", "DifferentPass123");
  await page.getByRole("button", { name: "Set password and continue" }).click();
  await expect(page.getByTestId("agent-form-error")).toContainText(
    /invite link is used/i,
  );
});

test("a duplicate email is refused", async ({ page }) => {
  const email = `${RUN}-dupe@proplink.test`;

  await login(page, ADMIN.email, ADMIN.password);
  await addAgent(page, {
    name: "First Claim",
    email,
    agencyName: `${RUN} First Ltd`,
    complianceCode: `${RUN}-DUPE-A`,
  });
  await expect(page.getByText("Agent created — invite sent.")).toBeVisible();

  await addAgent(page, {
    name: "Second Claim",
    email,
    agencyName: `${RUN} Second Ltd`,
    complianceCode: `${RUN}-DUPE-B`,
  });
  await expect(page.getByTestId("agent-form-error")).toContainText(
    "email already exists",
  );

  const rows = await q(`SELECT id FROM "User" WHERE email = $1`, [email]);
  expect(rows).toHaveLength(1);
});

test("a duplicate compliance code is refused", async ({ page }) => {
  const code = `${RUN}-SHARED`;

  await login(page, ADMIN.email, ADMIN.password);
  await addAgent(page, {
    name: "Code Owner",
    email: `${RUN}-codeowner@proplink.test`,
    agencyName: `${RUN} Owner Ltd`,
    complianceCode: code,
  });
  await expect(page.getByText("Agent created — invite sent.")).toBeVisible();

  await addAgent(page, {
    name: "Code Thief",
    email: `${RUN}-codethief@proplink.test`,
    agencyName: `${RUN} Thief Ltd`,
    complianceCode: code,
  });
  await expect(page.getByTestId("agent-form-error")).toContainText(
    "compliance code is already in use",
  );

  // The rejected admin's user row must not have been created either.
  const rows = await q(`SELECT id FROM "User" WHERE email = $1`, [
    `${RUN}-codethief@proplink.test`,
  ]);
  expect(rows).toHaveLength(0);
});

test("a non-admin cannot reach the add-agent screen", async ({ page }) => {
  await login(page, "buyer@proplink.test", "Password123!");
  const res = await page.goto("/admin/agents/new");

  // The gate is a *rewrite*, not a redirect (`src/middleware.ts`), so the URL
  // is unchanged and the status carries the refusal — same convention as
  // `portals.spec.ts`.
  expect(res?.status()).toBe(403);
  await expect(page.getByText("403")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveCount(0);
});
