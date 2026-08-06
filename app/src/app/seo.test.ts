import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: async () => ({
    market: "de",
    host: "varnito.de",
    config: {
      code: "de",
      domain: "varnito.de",
      language: "de",
      locale: "de-DE",
      currency: "eur",
      siteUrl: "https://varnito.de",
      legalContactEmail: "kontakt@varnito.de",
    },
  }),
}));

import robots from "./robots";
import sitemap from "./sitemap";
import { SEO_INDEXABLE_PAGES, SITE_DOMAIN } from "@/shared/config/site";

describe("technical SEO routes", () => {
  it("publishes the varnito.de sitemap and blocks internal areas", async () => {
    const robotsConfig = await robots();
    const [rule] = robotsConfig.rules as Array<{
      allow?: string | string[];
      disallow?: string | string[];
    }>;

    expect(robotsConfig.sitemap).toBe(`${SITE_DOMAIN}/sitemap.xml`);
    expect(robotsConfig.rules).toHaveLength(1);
    expect(rule.allow).toEqual([
      "/",
      "/impressum",
      "/datenschutz",
      "/agb",
      "/widerruf",
      "/kontakt",
      "/registrierung",
    ]);
    expect(rule.disallow).toEqual([
      "/api/",
      "/dashboard/",
      "/operator/",
      "/onboarding",
      "/login",
      "/forgot-password",
      "/team/",
      "/c/",
    ]);
  });

  it("lists only the public indexable varnito.de pages in the sitemap", async () => {
    const entries = await sitemap();

    expect(entries).toHaveLength(SEO_INDEXABLE_PAGES.length);
    expect(entries.map((entry) => entry.url)).toEqual(
      SEO_INDEXABLE_PAGES.map((path) => `${SITE_DOMAIN}${path}`),
    );
    expect(entries[0]?.changeFrequency).toBe("weekly");
    expect(entries[0]?.priority).toBe(1);
  });
});