import { expect, test } from "@playwright/test";

for (const market of ["de", "us"] as const) {
  test.describe(`${market.toUpperCase()} public help navigation`, () => {
    test.use({ extraHTTPHeaders: { "x-forwarded-host": `varnito.${market === "de" ? "de" : "com"}` } });

    for (const action of [
      { label: market === "de" ? "Anmelden" : "Sign in", pathname: "/login" },
      { label: market === "de" ? "Varnito testen" : "Try Varnito", pathname: "/registrierung" },
      { label: market === "de" ? "Demo ansehen" : "View demo", pathname: "/demo/dashboard" },
    ]) {
      test(`opens ${action.pathname} using ${action.label}`, async ({ page }) => {
        await page.goto("/");
        const origin = new URL(page.url()).origin;
        await page.getByRole("button", { name: action.label, exact: true }).click();
        await expect(page).toHaveURL((url) => url.origin === origin && url.pathname === action.pathname);
      });
    }

    for (const reportProblem of [false, true]) {
      test(`opens the ${reportProblem ? "problem report" : "support"} mail action`, async ({ page }) => {
        await page.goto("/");
        const session = await page.context().newCDPSession(page);
        await session.send("Page.enable");
        const requestedNavigation = new Promise<string>((resolve) => {
          session.on("Page.frameRequestedNavigation", (event) => resolve(event.url));
        });
        const label = reportProblem ? (market === "de" ? "Problem melden" : "Report a problem") : "Support";
        await page.getByRole("button", { name: label, exact: true }).click();
        const expectedUrl = reportProblem
          ? `mailto:support@varnito.com?subject=Varnito%20%E2%80%93%20${market === "de" ? "Problem%20melden" : "Report%20a%20problem"}`
          : "mailto:support@varnito.com";
        expect(await requestedNavigation).toBe(expectedUrl);
        await session.detach();
      });
    }
  });
}
