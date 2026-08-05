import { expect, test } from "@playwright/test";

test("login page loads", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response).not.toBeNull();
  expect(response?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/login/);
});

test("guest is redirected from dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test("public inquiry page loads", async ({ page }) => {
  const response = await page.goto("/c/00000000-0000-4000-8000-000000000001/inquiry");

  expect(response).not.toBeNull();
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByRole("heading", { name: "Kontaktanfrage" })).toBeVisible();
});

test("billing page is protected", async ({ page }) => {
  await page.goto("/dashboard/billing");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fbilling/);
});

test("team accept page loads", async ({ page }) => {
  const response = await page.goto("/team/accept");

  expect(response).not.toBeNull();
  expect(response?.status()).toBeLessThan(500);
  await expect(
    page.getByRole("heading", {
      name: /Zugang einrichten|Einladung nicht mehr gültig/i,
    }),
  ).toBeVisible();
});

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("/api/internal/health");

  expect([200, 401, 503]).toContain(response.status());
  const payload = (await response.json()) as {
    app?: unknown;
    counts?: unknown;
    database?: unknown;
    ok?: unknown;
  };

  expect(payload).toHaveProperty("app");
  expect(payload).toHaveProperty("database");
  expect(payload).toHaveProperty("counts");
  expect(payload).toHaveProperty("ok");
});