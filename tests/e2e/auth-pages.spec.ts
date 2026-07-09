import { test, expect } from "@playwright/test";

test.describe("auth pages", () => {
  test("register page offers role selection and GDPR consent", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: /create your account/i }),
    ).toBeVisible();

    // Self-serve roles only — no Admin option
    await expect(page.getByRole("radio", { name: /investor/i })).toBeAttached();
    await expect(page.getByRole("radio", { name: /agent/i })).toBeAttached();
    await expect(page.getByRole("radio", { name: /buyer/i })).toBeAttached();
    await expect(page.getByRole("radio", { name: /admin/i })).toHaveCount(0);

    await expect(page.getByRole("checkbox")).toBeAttached();
    await expect(page.getByText(/privacy policy/i)).toBeVisible();
  });

  test("login page renders credentials form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
  });
});
