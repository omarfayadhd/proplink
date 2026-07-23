import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { closeDb, hasDb, q } from "./helpers/db";

// Full-flow specs need the live dev database (H1.2). Skipped in DB-less CI.
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const RUN = `w2auth-${Date.now()}`;
const PASSWORD = "Password123";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/");
}

test.afterAll(async () => {
  await q(`DELETE FROM "User" WHERE email LIKE $1`, [`${RUN}%`]);
  await closeDb();
});

for (const role of ["AGENT", "INVESTOR", "BUYER"] as const) {
  test(`register → verify email → login as ${role}`, async ({ page, request }) => {
    const email = `${RUN}-${role.toLowerCase()}@proplink.test`;

    // Register through the API (the form itself is covered by auth-pages spec).
    const res = await request.post("/api/register", {
      data: { email, password: PASSWORD, name: `E2E ${role}`, role, gdprConsent: true },
    });
    expect(res.status()).toBe(201);

    const [user] = await q<{ id: string; role: string; emailVerified: Date | null }>(
      `SELECT id, role, "emailVerified" FROM "User" WHERE email = $1`,
      [email],
    );
    expect(user.role).toBe(role);
    expect(user.emailVerified).toBeNull();

    // The mailer is console-only in dev — mint a token exactly as the service
    // does (sha256 stored, raw in the link), then follow the link.
    const raw = `${RUN}-token-${user.id}`;
    await q(
      `INSERT INTO "VerificationToken" (id, "userId", token, purpose, "expiresAt")
       VALUES ($1, $2, $3, 'EMAIL_VERIFY', NOW() + interval '1 hour')`,
      [`${RUN}-tid-${role}`, user.id, createHash("sha256").update(raw).digest("hex")],
    );

    await page.goto(`/verify-email?token=${raw}`);
    await expect(page.getByText("Email verified ✓")).toBeVisible();

    const [verified] = await q<{ emailVerified: Date | null }>(
      `SELECT "emailVerified" FROM "User" WHERE id = $1`,
      [user.id],
    );
    expect(verified.emailVerified).not.toBeNull();

    // And the role can log in through the real UI.
    await login(page, email, PASSWORD);
    await expect(page.getByTestId("kyc-pill")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
}

test("GDPR erasure anonymises the account but keeps the row", async ({ request }) => {
  const email = `${RUN}-erase@proplink.test`;

  const reg = await request.post("/api/register", {
    data: {
      email,
      password: PASSWORD,
      name: "Erase Me",
      role: "BUYER",
      gdprConsent: true,
    },
  });
  const { userId } = (await reg.json()) as { userId: string };

  // Authenticate this API context, then call the erasure endpoint.
  const csrf = await (await request.get("/api/auth/csrf")).json();
  await request.post("/api/auth/callback/credentials", {
    form: { csrfToken: csrf.csrfToken, email, password: PASSWORD },
  });

  const del = await request.delete("/api/me");
  expect(del.status()).toBe(200);

  const [erased] = await q<{
    email: string;
    name: string;
    passwordHash: string | null;
    active: boolean;
  }>(`SELECT email, name, "passwordHash", active FROM "User" WHERE id = $1`, [userId]);
  expect(erased.email).toBe(`erased-${userId}@anonymised.invalid`);
  expect(erased.name).toBe("Erased User");
  expect(erased.passwordHash).toBeNull();
  expect(erased.active).toBe(false);

  await q(`DELETE FROM "User" WHERE id = $1`, [userId]);
});
