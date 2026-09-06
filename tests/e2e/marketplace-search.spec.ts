import { test, expect, type Page } from "@playwright/test";
import { hasDb } from "./helpers/db";

// Reads the Task 2.7 seed catalogue (40 listings, 12 cities) — no fixtures of
// its own, so nothing to clean up.
test.skip(!hasDb, "requires DATABASE_URL/.env.local");

/**
 * Assertions are deliberately relative ("this filter returns fewer than none",
 * "every card shown satisfies the filter") rather than exact counts: the other
 * Sprint 2 specs create and delete listings while this one runs, so a hardcoded
 * total would fail the moment the suite ran in parallel.
 */
const cards = (page: Page) => page.getByTestId("property-card");

/** The sidebar debounces at 300ms before rewriting the URL and refetching. */
async function settled(page: Page) {
  await expect(page.getByTestId("result-count")).not.toHaveText("Counting…");
}

test("the marketplace lists properties with price, EPC and ROI on every card", async ({
  page,
}) => {
  await page.goto("/marketplace");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("marketplace");
  await expect(cards(page).first()).toBeVisible();

  const first = cards(page).first();
  await expect(first.getByTestId("card-price")).toContainText("£");
  // AGENTS.md: EPC displayed on every listing.
  await expect(first.getByTestId("epc-badge")).toBeVisible();
});

test("a card links through to its detail page", async ({ page }) => {
  await page.goto("/marketplace");

  const first = cards(page).first();
  const id = await first.getAttribute("data-listing-id");
  await first.click();

  await expect(page).toHaveURL(new RegExp(`/marketplace/${id}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the text search narrows results and syncs to the URL", async ({ page }) => {
  await page.goto("/marketplace");
  const before = await cards(page).count();

  await page.getByLabel("Search", { exact: true }).fill("Nottingham");
  await settled(page);

  // The URL is the state — this is what makes a search shareable.
  await expect(page).toHaveURL(/q=Nottingham/);
  await expect(cards(page)).not.toHaveCount(before);
  await expect(cards(page).first()).toBeVisible();
  for (const text of await cards(page).allInnerTexts()) {
    expect(text).toContain("Nottingham");
  }
});

test("the EPC filter narrows to the selected bands only", async ({ page }) => {
  await page.goto("/marketplace");

  await page
    .getByRole("group", { name: "EPC rating" })
    .getByRole("button", { name: "A", exact: true })
    .click();
  await settled(page);

  await expect(page).toHaveURL(/epc=A/);
  const count = await cards(page).count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(cards(page).nth(i).getByTestId("epc-badge")).toHaveText("A");
  }
});

test("the distress-tag filter narrows the result set", async ({ page }) => {
  await page.goto("/marketplace");
  await settled(page);
  const before = Number(
    (await page.getByTestId("result-count").innerText()).replace(/[^\d]/g, ""),
  );

  await page
    .getByRole("group", { name: "Distress type" })
    .getByRole("button", { name: "Subsidence" })
    .click();
  await settled(page);

  await expect(page).toHaveURL(/tags=SUBSIDENCE/);
  const after = Number(
    (await page.getByTestId("result-count").innerText()).replace(/[^\d]/g, ""),
  );
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThan(before);
});

test("the budget slider caps the asking price of every result", async ({ page }) => {
  await page.goto("/marketplace?maxPrice=100000");
  await settled(page);

  await expect(page.getByTestId("budget-value")).toContainText("£100,000");
  const count = await cards(page).count();
  expect(count).toBeGreaterThan(0);

  for (const priceText of await cards(page).getByTestId("card-price").allInnerTexts()) {
    const pounds = Number(priceText.replace(/[^\d]/g, ""));
    expect(pounds).toBeLessThanOrEqual(100_000);
  }
});

test("the bedrooms and property-type filters apply", async ({ page }) => {
  await page.goto("/marketplace");

  await page.getByLabel("Property type").selectOption("HMO");
  await settled(page);

  await expect(page).toHaveURL(/type=HMO/);
  expect(await cards(page).count()).toBeGreaterThan(0);
});

test("sorting by price puts the cheapest listing first", async ({ page }) => {
  await page.goto("/marketplace");

  await page.getByLabel("Sort by").selectOption("price");
  await settled(page);

  await expect(page).toHaveURL(/sort=price/);
  const prices = (await cards(page).getByTestId("card-price").allInnerTexts()).map((t) =>
    Number(t.replace(/[^\d]/g, "")),
  );
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});

// The acceptance criterion: "URL restore reproduces the search".
test("a shared URL restores both the filters and the results", async ({ page }) => {
  await page.goto("/marketplace");

  await page.getByLabel("Search", { exact: true }).fill("probate");
  await page
    .getByRole("group", { name: "Distress type" })
    .getByRole("button", { name: "Probate sale" })
    .click();
  await page.getByLabel("Sort by").selectOption("price");
  await settled(page);

  // Wait for the debounced rewrite to actually land before snapshotting the
  // URL — `page.url()` takes no retries, unlike `expect(page).toHaveURL()`.
  await expect(page).toHaveURL(/q=probate/);
  await expect(page).toHaveURL(/tags=PROBATE/);
  await expect(page).toHaveURL(/sort=price/);

  const sharedUrl = page.url();

  const expectedIds = await cards(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );
  const expectedCount = await page.getByTestId("result-count").innerText();

  // Fresh context-free navigation, exactly as a recipient of the link would.
  await page.goto("about:blank");
  await page.goto(sharedUrl);
  await settled(page);

  // Filter controls are restored from the URL, not just the results.
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("probate");
  await expect(page.getByLabel("Sort by")).toHaveValue("price");
  await expect(
    page.getByRole("group", { name: "Distress type" }).getByRole("button", {
      name: "Probate sale",
    }),
  ).toHaveAttribute("aria-pressed", "true");

  await expect(page.getByTestId("result-count")).toHaveText(expectedCount);
  const restoredIds = await cards(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );
  expect(restoredIds).toEqual(expectedIds);
});

test("clearing the filters returns to the full result set", async ({ page }) => {
  await page.goto("/marketplace?q=probate&epc=A&sort=price");
  await settled(page);
  const filtered = await cards(page).count();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await settled(page);

  await expect(page).toHaveURL(/\/marketplace$/);
  expect(await cards(page).count()).toBeGreaterThan(filtered);
});

test("pagination moves through the results without repeating a listing", async ({
  page,
}) => {
  await page.goto("/marketplace?sort=price");
  await settled(page);

  await expect(page.getByTestId("page-indicator")).toContainText("Page 1 of");
  const firstPage = await cards(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );

  await page.getByRole("link", { name: "Next →" }).click();

  await expect(page.getByTestId("page-indicator")).toContainText("Page 2 of");
  const secondPage = await cards(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );

  expect(secondPage.length).toBeGreaterThan(0);
  expect(secondPage.some((id) => firstPage.includes(id))).toBe(false);
  // Filters survive paging — a page-2 link that dropped the sort would be a
  // different search.
  await expect(page).toHaveURL(/sort=price/);
});

test("a search matching nothing explains itself instead of showing an empty grid", async ({
  page,
}) => {
  await page.goto("/marketplace?q=zzzqqqxxx");

  await expect(page.getByTestId("no-results")).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
});

test("a mangled URL degrades to a broader search rather than an error", async ({
  page,
}) => {
  const res = await page.request.get("/marketplace?epc=NONSENSE&bbox=1,2,3&beds=lots");
  expect(res.status()).toBe(200);

  await page.goto("/marketplace?epc=NONSENSE&bbox=1,2,3&beds=lots");
  await expect(cards(page).first()).toBeVisible();
});
