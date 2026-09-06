import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { closeDb, hasDb, q } from "./helpers/db";
import { runId } from "./helpers/runId";
import { login } from "./helpers/login";

// Full-flow specs need the live dev database (H1.2). Skipped in DB-less CI.
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const RUN = runId("w2auth");
const PASSWORD = "Password123";

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

    // The mailer is console-only in dev, and only the sha256 of the token is
    // stored — so the raw value in the "emailed" link can't be read back out
    // of the DB. Instead of inserting a competing row, wait for the one
    // `registerUser` creates and rewrite its hash to a value this test knows.
    //
    // Inserting our own row races: `registerUser` fires
    // `requestEmailVerification` without awaiting it (deliberately — a mailer
    // outage must not fail registration), so `createToken` can land *after*
    // the 201 response, and its "invalidate any previous unused tokens for
    // this purpose" `deleteMany` would delete a row inserted here in between.
    // That made this spec fail intermittently, on a different role each run.
    const raw = `${RUN}-token-${user.id}`;
    await expect(async () => {
      const updated = await q(
        `UPDATE "VerificationToken" SET token = $2
          WHERE "userId" = $1 AND purpose = 'EMAIL_VERIFY' AND "usedAt" IS NULL
          RETURNING id`,
        [user.id, createHash("sha256").update(raw).digest("hex")],
      );
      expect(updated).toHaveLength(1);
    }).toPass({ timeout: 5_000 });

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
