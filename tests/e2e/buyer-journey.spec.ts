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
  test("the search is the portal's home, with distress filters collapsed", async ({
    page,
  }) => {
    await login(page, BUYER, PASSWORD);
    await page.goto("/buy");

    // B2C framing (Task 5.7): a consumer searches on price and beds first, so
    // the defect chips start closed rather than absent.
    await expect(page.getByTestId("results-grid")).toBeVisible();

    // The disclosure summary is visible; the chips inside it are not, until it
    // is opened. Asserting the inner label would assert the opposite of the
    // behaviour under test.
    const disclosure = page.locator("details");
    await expect(disclosure).toHaveCount(1);
    expect(await disclosure.evaluate((el: HTMLDetailsElement) => el.open)).toBe(false);
    await expect(disclosure.locator("summary")).toContainText("Distress type");

    await disclosure.locator("summary").click();
    await expect(page.getByRole("button", { name: "Subsidence" })).toBeVisible();
  });

  test("the affordability calculator computes a budget and searches on it", async ({
    page,
  }) => {
    await login(page, BUYER, PASSWORD);
    await page.goto("/buy");

    // £50k deposit + £60k × 4.5 = £320,000. The maths is unit-tested; this
    // proves the wiring, and that the budget reaches the search as `maxPrice`.
    await expect(page.getByTestId("max-budget")).toHaveText("£320,000");

    await page.getByRole("link", { name: /Show listings up to/ }).click();
    await expect(page).toHaveURL(/\/buy\?maxPrice=320000/);
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
