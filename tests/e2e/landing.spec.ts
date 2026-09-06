import { test, expect } from "@playwright/test";

test.describe("landing page", () => {
  // Pre-empt the GDPR banner (same reasoning as `helpers/login.ts`): it is
  // `fixed bottom-0`, so it swallows clicks on anything low in the viewport.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("proplink-cookie-consent", "essential");
    });
  });

  test("renders brand, hero stats and the primary entry points", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/PropLink UK/);
    await expect(
      page.getByRole("heading", { level: 1, name: /redefining distressed/i }),
    ).toBeVisible();

    // Hero stat row (ADR-005: replaces the full-width metrics strip). The
    // inventory figure is the one metric seeded data always makes non-zero;
    // the zero-valued ones are omitted by design, so asserting their labels
    // would assert the very thing that made the old strip look unfinished.
    const stats = page.getByTestId("hero-stats");
    await expect(stats).toBeVisible();
    await expect(stats.getByText("Total Distress Inventory")).toBeVisible();
    await expect(stats.getByTestId("metric-value").first()).toContainText("£");

    // No zero-valued metric reaches the page.
    await expect(
      stats.getByTestId("metric-value").filter({ hasText: /^0$/ }),
    ).toHaveCount(0);

    // The hero carries no links at all now (ADR-011 § Amendment). Registration
    // is reached from the header's `Get started` and the page's closing CTA;
    // `/marketplace` from the category tiles and the closing CTA.
    // Scoped by landmark: `Get started` is deliberately in both places, so an
    // unscoped locator is a strict-mode violation rather than a passing test.
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Get started" }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Get started" }),
    ).toBeVisible();

    // EOI compliance notice must be present
    await expect(page.getByText(/expression-of-interest only/i)).toBeVisible();
  });

  test("the category tiles are real pre-filtered marketplace searches", async ({
    page,
  }) => {
    await page.goto("/");

    // These replaced the showcase row as the page's route into the catalogue
    // when it was removed, so the link-through is worth holding onto.
    const tile = page.getByRole("link", { name: /Probate sales/ });
    await expect(tile).toBeVisible();
    await tile.click();

    await expect(page).toHaveURL(/\/marketplace\?tags=PROBATE/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/marketplace/i);
  });
  test("the hero image swings through several angles as the page scrolls", async ({
    page,
  }) => {
    await page.goto("/");

    const plane = page.getByTestId("hero-plane");
    await expect(plane).toHaveAttribute("data-orbit", "live");

    const heroHeight = await page
      .getByTestId("hero-stage")
      .evaluate((el) => el.getBoundingClientRect().height);
    const transformAt = async (fraction: number) => {
      await page.evaluate(
        (y) => window.scrollTo(0, y),
        Math.round(heroHeight * fraction),
      );
      // One rAF for the scroll handler, one for the style write to land.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
      return plane.evaluate((el) => el.style.transform);
    };

    // Three distinct angles, not one slow drift: the plane yaws in from the
    // left, passes square-on where the headline is most readable, and swings
    // out to the right as the hero leaves (ADR-008).
    const yaw = async (fraction: number) =>
      Number(/rotateY\((-?[\d.]+)deg\)/.exec(await transformAt(fraction))?.[1]);

    expect(await yaw(0)).toBeLessThan(-10);
    expect(Math.abs(await yaw(0.5))).toBeLessThan(1);
    expect(await yaw(1)).toBeGreaterThan(8);
  });

  test("the hero holds still for a visitor who asks for reduced motion", async ({
    browser,
  }) => {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.goto("/");

    const plane = page.getByTestId("hero-plane");
    await expect(plane).toHaveAttribute("data-orbit", "static");

    const settle = async () =>
      page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
    await settle();
    const before = await plane.evaluate((el) => el.style.transform);

    // Scroll-linked scale is the part that provokes vestibular discomfort, so
    // reduced motion gets no coupling at all rather than a damped version.
    await page.evaluate(() => window.scrollTo(0, 600));
    await settle();
    expect(await plane.evaluate((el) => el.style.transform)).toBe(before);
    expect(before).not.toContain("rotateY(-14deg)");

    await page.close();
  });
});
