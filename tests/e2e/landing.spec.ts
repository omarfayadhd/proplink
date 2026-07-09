import { test, expect } from "@playwright/test";

test.describe("landing page", () => {
  test("renders brand, metrics strip and auth links", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/PropLink UK/);
    await expect(
      page.getByRole("heading", { name: /distressed property market/i }),
    ).toBeVisible();

    // Global metrics strip labels
    await expect(page.getByText("Total Distress Inventory")).toBeVisible();
    await expect(page.getByText("Completed Syndicate Deals")).toBeVisible();

    // Auth entry points
    await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();

    // EOI compliance notice must be present
    await expect(page.getByText(/expression-of-interest only/i)).toBeVisible();
  });
});
