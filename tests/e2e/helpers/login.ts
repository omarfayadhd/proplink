import { expect, type Page } from "@playwright/test";

/**
 * Signs in through the real credentials form and does not return until the
 * session is actually live.
 *
 * Five specs each grew their own copy of fill-click-`waitForURL("**\/")`, and
 * every copy had the same two races. This is the consolidated, hardened
 * version:
 *
 *  1. **Pre-empt the GDPR cookie banner** (`CookieBanner.tsx` —
 *     `localStorage`-backed under `proplink-cookie-consent`, despite the name)
 *     via `addInitScript`, which runs before page scripts on every subsequent
 *     navigation for this `page`. Nothing ever dismisses the banner otherwise,
 *     and being `fixed inset-x-0 bottom-0` it swallows clicks on any
 *     bottom-of-viewport control (the moderation modal's Approve/Reject, the
 *     enquiry form's submit).
 *  2. **Clear cookies first**, so a stale session/CSRF cookie from a previous
 *     sign-in in the same context can't shadow or race the new one. Note this
 *     also drops the `proplink_active_agent_profile` cookie, so an agent's
 *     active profile resets to the first alphabetically after each login.
 *  3. **Retry the whole sequence, not just the check.** The login page calls
 *     `signIn({ redirect: false })` and then client-side `router.push("/")`, so
 *     a `waitForURL` can resolve before the session cookie is live — or, worse,
 *     the click can land before hydration and never run `onSubmit` at all.
 *     Polling only the post-condition can never recover from that lost click,
 *     which is exactly how it failed (~1 run in 6, on whichever spec lost the
 *     race). Waiting on the credentials callback response proves the submit
 *     really fired, and wrapping the navigate/fill/click in `toPass` means a
 *     lost click is simply retried.
 *  4. The post-condition is `/api/auth/session` reporting this email — the
 *     actual invariant, and one a stale pre-existing session cannot satisfy.
 */
export async function login(page: Page, email: string, password: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem("proplink-cookie-consent", "essential");
  });
  await page.context().clearCookies();

  await expect(async () => {
    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials"), {
        timeout: 5_000,
      }),
      page.click("button[type=submit]"),
    ]);

    const res = await page.request.get("/api/auth/session");
    const body = await res.json().catch(() => null);
    expect(body?.user?.email).toBe(email);
  }).toPass({ timeout: 20_000 });
}
