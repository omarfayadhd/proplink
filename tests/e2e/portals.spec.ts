import { test, expect, type Page } from "@playwright/test";
import { hasDb } from "./helpers/db";
import { login } from "./helpers/login";

test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const PASSWORD = "Password123!";

/**
 * Every self-serve role, its portal, the two it must never reach, and the
 * accessible name of its own navigation.
 *
 * `nav` is per-role because the buyer portal wears consumer chrome (ADR-020)
 * and calls its tabs what they are; the agent, investor and admin portals
 * share `<PortalShell>`'s "Portal". The invariant under test is that a portal
 * exposes its own pages, not that every portal spells it the same way.
 */
const ROLES = [
  {
    email: "agent@proplink.test",
    home: "/agent",
    forbidden: ["/investor", "/buy"],
    nav: "Portal",
  },
  {
    email: "investor@proplink.test",
    home: "/investor",
    forbidden: ["/agent", "/buy"],
    nav: "Portal",
  },
  {
    email: "buyer@proplink.test",
    home: "/buy",
    forbidden: ["/agent", "/investor"],
    nav: "Your activity",
  },
] as const;

/**
 * The 403 is a *rewrite*, not a redirect (`src/middleware.ts`), so the URL still
 * reads as the forbidden path while the body is the access-denied page. Assert
 * the body, because asserting the URL would pass even if the gate were removed.
 */
async function expectForbidden(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should be forbidden`).toBe(403);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/access|403/i);
}

test.describe("role portals are separate", () => {
  for (const role of ROLES) {
    test(`${role.email} reaches ${role.home} and nothing else`, async ({ page }) => {
      await login(page, role.email, PASSWORD);

      await page.goto(role.home);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // The portal's own sub-nav is its only navigation — the global header
      // carries none, so an empty nav means unreachable pages.
      await expect(page.getByRole("navigation", { name: role.nav })).toBeVisible();

      for (const path of role.forbidden) {
        await expectForbidden(page, path);
      }
    });
  }

  test("signing in lands on the role's own portal, not the landing page", async ({
    page,
  }) => {
    await login(page, "buyer@proplink.test", PASSWORD);

    // `/portal` resolves the role server-side; the client never holds the map.
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/buy$/);
  });

  test("a signed-out visitor is sent to log in, then back where they were going", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/investor");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Finvestor/);
  });

  test("the investor portal states the EOI position above its figures", async ({
    page,
  }) => {
    await login(page, "investor@proplink.test", PASSWORD);
    await page.goto("/investor");

    // A compliance statement, not marketing copy (docs/CONTEXT.md §1) — it must
    // be present before any number implying money.
    await expect(page.getByTestId("eoi-notice")).toContainText(
      /expression-of-interest only/i,
    );
    await expect(page.getByTestId("kyc-card")).toBeVisible();
  });

  test("the header offers a signed-in user their own portal and no other", async ({
    page,
  }) => {
    await login(page, "agent@proplink.test", PASSWORD);
    await page.goto("/marketplace");

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Agent portal" })).toBeVisible();
    await expect(header.getByRole("link", { name: /investor portal/i })).toHaveCount(0);
    await expect(header.getByRole("link", { name: /buyer portal/i })).toHaveCount(0);
  });
});
