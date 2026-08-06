import { expect, test } from "@playwright/test";

test("demo dashboard is publicly accessible", async ({ page }) => {
  const response = await page.goto("/demo/dashboard");

  expect(response).not.toBeNull();
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByText("Demo-Modus - Aenderungen werden nicht gespeichert.")).toBeVisible();
  await expect(page.getByText(/Mueller Bedachungen GmbH|Smith Roofing LLC/)).toBeVisible();
});

test("guided demo tour can complete and shows CTA", async ({ page }) => {
  await page.goto("/demo/settings");

  const skipButton = page.getByRole("button", { name: "Ueberspringen" });
  await expect(skipButton).toBeVisible();

  await page.getByRole("button", { name: "Tour abschliessen" }).click();

  await expect(page.getByText("30 Tage kostenlos testen")).toBeVisible();
  await expect(page.getByLabel("Demo Abschluss").getByRole("link", { name: "Jetzt kostenlos starten" })).toBeVisible();
});

test("lead status can be changed in demo without backend", async ({ page }) => {
  await page.goto("/demo/leads");

  const firstStatusSelect = page.locator("select").first();
  await firstStatusSelect.selectOption("successful");
  await expect(firstStatusSelect).toHaveValue("successful");

  await page.reload();

  const resetStatusSelect = page.locator("select").first();
  await expect(resetStatusSelect).toHaveValue("new");
});
