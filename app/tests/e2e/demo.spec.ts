import { expect, test, type Page } from "@playwright/test";

const closeTourIfVisible = async (page: Page) => {
  const closeButton = page.getByRole("button", { name: /Ueberspringen|Skip/i });
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
};

test.describe("DE demo", () => {
  test.use({
    extraHTTPHeaders: {
      "x-forwarded-host": "varnito.de",
    },
  });

  test("renders german market content and company", async ({ page }) => {
    await page.goto("/demo/dashboard");

    await expect(page).toHaveURL(/\/demo\/dashboard/);
    await expect(page.getByText("Demo-Modus - Aenderungen werden nicht gespeichert.")).toBeVisible();
    await expect(page.getByText("Müller Bedachungen GmbH")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ueberspringen" })).toBeVisible();
    await expect(page.getByText("Hier sehen Sie Kennzahlen und offene Aufgaben.")).toBeVisible();
  });

  test("keeps CTA links on .de domain", async ({ page }) => {
    await page.goto("/demo/dashboard");

    await expect(page.getByRole("link", { name: "Jetzt kostenlos starten" }).first()).toHaveAttribute(
      "href",
      /https:\/\/varnito\.de\/registrierung/,
    );
  });

  test("guide gives german answer and can navigate to team", async ({ page }) => {
    await page.goto("/demo/dashboard");
    await closeTourIfVisible(page);

    await page.getByRole("button", { name: /Varnito Guide/i }).click();
    await page.getByRole("button", { name: "Zeig mir das Team." }).click();

    await expect(page).toHaveURL(/\/demo\/team\?highlight=team/);
    await expect(page.getByText("Im Team-Bereich laden Sie Mitarbeitende per E-Mail ein")).toBeVisible();
  });

  test("guide returns constrained safety response for unrelated topics", async ({ page }) => {
    await page.goto("/demo/dashboard");
    await closeTourIfVisible(page);

    await page.getByRole("button", { name: /Varnito Guide/i }).click();
    await page.getByPlaceholder("Frage zu Varnito stellen...").fill("Wie wird das Wetter morgen?");
    await page.getByRole("button", { name: "Senden" }).click();

    await expect(page.getByText("Ich helfe Ihnen ausschliesslich dabei, Varnito kennenzulernen.")).toBeVisible();
  });
});

test.describe("US demo", () => {
  test.use({
    extraHTTPHeaders: {
      "x-forwarded-host": "varnito.com",
    },
  });

  test("renders english market content and company", async ({ page }) => {
    await page.goto("/demo/dashboard");

    await expect(page).toHaveURL(/\/demo\/dashboard/);
    await expect(page.getByText("Demo mode - changes are not saved.")).toBeVisible();
    await expect(page.getByText("Smith Roofing LLC")).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
    await expect(page.getByText("See live KPIs and open workload.")).toBeVisible();
  });

  test("keeps CTA links on .com domain", async ({ page }) => {
    await page.goto("/demo/dashboard");

    await expect(page.getByRole("link", { name: "Start your 30-day free trial" }).first()).toHaveAttribute(
      "href",
      /https:\/\/varnito\.com\/registrierung/,
    );
  });

  test("guide opens, closes, answers english and navigates to billing", async ({ page }) => {
    await page.goto("/demo/dashboard");
    await closeTourIfVisible(page);

    const openGuideButton = page.getByRole("button", { name: /Varnito Guide - Open guide/i });
    await openGuideButton.click();
    await page.getByRole("button", { name: "Show me billing." }).click();

    await expect(page).toHaveURL(/\/demo\/billing\?highlight=billing/);
    await expect(page.getByText("Billing shows trial state, subscription status")).toBeVisible();

    await page.getByRole("button", { name: "Close guide" }).click();
    await expect(openGuideButton).toBeVisible();
  });

  test("guide safety response in english", async ({ page }) => {
    await page.goto("/demo/dashboard");
    await closeTourIfVisible(page);

    await page.getByRole("button", { name: /Varnito Guide - Open guide/i }).click();
    await page.getByPlaceholder("Ask about Varnito...").fill("Who won the world cup?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("I can only help you explore Varnito.")).toBeVisible();
  });
});

test("demo is publicly accessible without login", async ({ page }) => {
  await page.goto("/demo/dashboard");
  await expect(page).not.toHaveURL(/\/login/);
});

test("guide can navigate to leads, team, billing and dashboard", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-host": "varnito.com",
  });
  await page.goto("/demo/dashboard");
  await closeTourIfVisible(page);
  await page.getByRole("button", { name: /Varnito Guide/i }).click();

  await page.getByRole("button", { name: "Show me the team." }).click();
  await expect(page).toHaveURL(/\/demo\/team\?highlight=team/);

  await page.getByRole("button", { name: "Show me billing." }).click();
  await expect(page).toHaveURL(/\/demo\/billing\?highlight=billing/);

  await page.getByPlaceholder("Ask about Varnito...").fill("What does the dashboard show?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page).toHaveURL(/\/demo\/dashboard\?highlight=dashboard/);

  await page.getByPlaceholder("Ask about Varnito...").fill("How does lead management work?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page).toHaveURL(/\/demo\/leads\?highlight=leads/);
});

test("demo interactions do not perform write API calls", async ({ page }) => {
  const writeCalls: string[] = [];

  page.on("request", (request) => {
    const method = request.method();
    const url = request.url();
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    if (isWrite && url.includes("/api/")) {
      writeCalls.push(`${method} ${url}`);
    }
  });

  await page.context().setExtraHTTPHeaders({
    "x-forwarded-host": "varnito.de",
  });
  await page.goto("/demo/leads");
  await closeTourIfVisible(page);

  await page.locator("select").first().selectOption("successful");
  await page.getByRole("button", { name: /Varnito Guide/i }).click();
  await page.getByRole("button", { name: "Zeig mir Billing." }).click();

  expect(writeCalls).toEqual([]);
});

test("reload resets simulated changes", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-host": "varnito.de",
  });
  await page.goto("/demo/leads");

  const firstStatusSelect = page.locator("select").first();
  await firstStatusSelect.selectOption("successful");
  await expect(firstStatusSelect).toHaveValue("successful");

  await page.reload();

  const resetStatusSelect = page.locator("select").first();
  await expect(resetStatusSelect).toHaveValue("new");
});
