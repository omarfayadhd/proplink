import { test, expect, type Page } from "@playwright/test";
import { hasDb } from "./helpers/db";
import { login } from "./helpers/login";

test.skip(!hasDb, "requires DATABASE_URL/.env.local");

const BUYER = "buyer@proplink.test";
const PASSWORD = "Password123!";

/**
 * A listing from the **seed catalogue**, never "whatever sorts first".
 *
 * These tests write viewings, offers and chat messages against whatever they
 * pick. Other specs create their own fixture listings and delete them in
 * `afterAll`; picking the newest card would target one of those, leave rows
 * behind it cannot delete, and orphan the listing — which is exactly how the
 * integration suite started failing. Seeded ids are stable and nobody deletes
 * them.
 */
async function seededListingId(page: Page): Promise<string> {
  await page.goto("/marketplace");
  // The attribute is on the card itself, not a descendant, so this is an
  // attribute selector rather than a `filter({ has })`.
  const id = await page
    .locator('[data-testid="property-card"][data-listing-id^="seed-listing-"]')
    .first()
    .getAttribute("data-listing-id");
  expect(id, "seeded marketplace should have at least one seed listing").toBeTruthy();
  return id as string;
}

test.describe("buyer portal", () => {
  test("the search opens on results, not on a finance form", async ({ page }) => {
    await login(page, BUYER, PASSWORD);
    await page.goto("/buy");

    // The whole point of ADR-020: a consumer arrives to look at houses, so
    // properties are on screen before anything is asked of them.
    await expect(page.getByTestId("results-grid")).toBeVisible();
    await expect(page.getByTestId("property-card").first()).toBeVisible();

    // The affordability calculator still exists — it is inside `Price`, not in
    // front of the results. Asserting it is *absent* on load is the assertion
    // that would have caught the old layout.
    await expect(page.getByTestId("affordability")).toHaveCount(0);

    // The defect vocabulary is one click inside `More`, not the opening
    // question (Task 5.7's intent, re-expressed as a popover).
    await expect(page.getByRole("button", { name: "Subsidence" })).toHaveCount(0);
    await page.getByRole("button", { name: /^More/ }).click();
    await expect(page.getByRole("button", { name: "Subsidence" })).toBeVisible();
  });

  test("the affordability calculator computes a budget and applies it to the search", async ({
    page,
  }) => {
    await login(page, BUYER, PASSWORD);
    await page.goto("/buy");

    await page.getByRole("button", { name: /^Price/ }).click();
    await page.getByText("Work out what I can afford").click();

    // £50k deposit + £60k × 4.5 = £320,000. The maths is unit-tested; this
    // proves the wiring, and that the budget reaches the search as `maxPrice`.
    await expect(page.getByTestId("max-budget")).toHaveText("£320,000");

    await page.getByRole("button", { name: /Use £320,000 as my budget/ }).click();

    // The hook debounces before it rewrites the URL, hence the URL assertion
    // rather than a click-then-read.
    await expect(page).toHaveURL(/maxPrice=320000/);
    await expect(page.getByTestId("budget-value")).toHaveText("£320,000");
  });

  test("a buyer saves a property from the grid and finds it in their shortlist", async ({
    page,
  }) => {
    await login(page, BUYER, PASSWORD);
    await page.goto("/buy");

    const card = page
      .locator('[data-testid="property-card"][data-listing-id^="seed-listing-"]')
      .first();
    const id = await card.getAttribute("data-listing-id");
    const heart = card.getByTestId("card-save-button");

    // The heart flips optimistically, so `aria-pressed` alone proves nothing
    // reached the server — and navigating away can abort the in-flight fetch.
    // Wait on the response to `/save` instead.
    const saveSettled = (method: "POST" | "DELETE") =>
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/listings/${id}/save`) && r.request().method() === method,
      );

    // Start from a known state: the seed and earlier runs may have saved it.
    if ((await heart.getAttribute("aria-pressed")) === "true") {
      await Promise.all([saveSettled("DELETE"), heart.click()]);
      await expect(heart).toHaveAttribute("aria-pressed", "false");
    }

    await Promise.all([saveSettled("POST"), heart.click()]);
    await expect(heart).toHaveAttribute("aria-pressed", "true");

    await page.goto("/buy/saved");
    await expect(page.locator(`[data-listing-id="${id}"]`)).toBeVisible();
  });

  test("the results layout choice survives in the URL", async ({ page }) => {
    await login(page, BUYER, PASSWORD);
    await page.goto("/buy");

    await page.getByRole("link", { name: "list", exact: true }).click();
    await expect(page).toHaveURL(/view=list/);

    // Reloading proves the view is genuinely in the URL rather than in state
    // that merely wrote to it.
    await page.reload();
    await expect(page.getByRole("link", { name: "list", exact: true })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("a buyer requests a viewing and sees it in their portal", async ({ page }) => {
    await login(page, BUYER, PASSWORD);
    const id = await seededListingId(page);

    await page.goto(`/marketplace/${id}`);
    await page.getByRole("tab", { name: "Book a viewing" }).click();
    await page.getByRole("button", { name: "Request viewing" }).click();

    // Either it lands, or the seed already left one pending — both prove the
    // route ran and the one-request-per-property rule held.
    await expect(
      page.getByText(/Viewing requested|already have a viewing/),
    ).toBeVisible();

    await page.goto("/buy/viewings");
    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("a buyer submits an offer and it appears against the asking price", async ({
    page,
  }) => {
    await login(page, BUYER, PASSWORD);
    const id = await seededListingId(page);

    await page.goto(`/marketplace/${id}`);
    await page.getByRole("tab", { name: "Make an offer" }).click();
    await page.getByLabel("Your offer").fill("123456");
    await page.getByRole("button", { name: "Submit offer" }).click();
    await expect(page.getByText(/Offer submitted|already have an offer/)).toBeVisible();

    await page.goto("/buy/offers");
    await expect(page.getByText(/Asking £/).first()).toBeVisible();
  });

  test("a buyer messages the agent and the thread persists", async ({ page }) => {
    await login(page, BUYER, PASSWORD);
    const id = await seededListingId(page);

    await page.goto(`/marketplace/${id}`);
    await page.getByRole("tab", { name: "Message agent" }).click();
    // Scoped: the enquiry form further down the page has its own "Message"
    // field, so an unscoped label is a strict-mode violation.
    const actions = page.getByTestId("buyer-actions");
    await actions.getByLabel("Message").fill("Is the roof report available?");
    await actions.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Message sent to the agent.")).toBeVisible();

    await page.goto("/buy/messages");
    // `.first()`: repeated runs leave the same message on more than one
    // property's thread, and that is correct behaviour rather than residue to
    // assert against.
    await expect(page.getByText("Is the roof report available?").first()).toBeVisible();
  });

  test("the price history says on its face that it is sample data", async ({ page }) => {
    await login(page, BUYER, PASSWORD);
    const id = await seededListingId(page);
    await page.goto(`/marketplace/${id}`);

    // Non-negotiable while the Land Registry ingest is outstanding (ADR-017):
    // a price chart that looks authoritative but is invented must say so.
    await expect(page.getByTestId("comparables-sample-notice")).toContainText(
      /not HM Land Registry records/i,
    );
  });

  test("an agent never sees the buyer's write actions on a listing", async ({ page }) => {
    await login(page, "agent@proplink.test", PASSWORD);
    const id = await seededListingId(page);
    await page.goto(`/marketplace/${id}`);

    await expect(page.getByTestId("buyer-actions")).toHaveCount(0);
  });
});
