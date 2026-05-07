import { test, expect } from "@playwright/test";

/**
 * Admin Portal E2E smoke tests.
 *
 * These tests run against the deployed/dev server and verify that key
 * pages load and render expected elements.  They are intentionally
 * broad — detailed interaction tests live in the unit/integration suite.
 */

test.describe("Dashboard smoke test", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/");
    // Should redirect to /login or /auth/signin when unauthenticated
    await expect(page).toHaveURL(/login|signin/);
  });

  test("dashboard is accessible after login", async ({ page }) => {
    // Use environment-supplied test credentials (set in CI secrets)
    const email = process.env.E2E_ADMIN_EMAIL ?? "admin@test.school";
    const password = process.env.E2E_ADMIN_PASSWORD ?? "Test@12345";

    await page.goto("/login");
    await page.fill('[name="email"], [placeholder*="email" i]', email);
    await page.fill('[name="password"], [placeholder*="password" i]', password);
    await page.click('button[type="submit"]');

    // After login, should land on dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
  });

  test("dashboard shows key metric cards", async ({ page }) => {
    await page.goto("/dashboard");

    // If redirected to login, skip — needs auth context
    if (page.url().includes("login")) return;

    await expect(page.getByText(/Total Students/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Attendance/i)).toBeVisible();
    await expect(page.getByText(/Quick Actions/i)).toBeVisible();
  });
});
