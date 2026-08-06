import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  market: "de" as "de" | "us",
}));

vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: async () => {
    if (state.market === "us") {
      return {
        market: "us",
        host: "varnito.com",
        config: {
          code: "us",
          domain: "varnito.com",
          language: "en",
          locale: "en-US",
          currency: "usd",
          siteUrl: "https://varnito.com",
          legalContactEmail: "contact@varnito.com",
        },
      };
    }

    return {
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
    };
  },
}));

import robots from "./robots";
import sitemap from "./sitemap";
import { SEO_INDEXABLE_PAGES, SITE_DOMAIN } from "@/shared/config/site";

describe("technical SEO routes", () => {
  it("publishes the varnito.de sitemap and blocks internal areas", async () => {
    state.market = "de";
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
    state.market = "de";
    const entries = await sitemap();

    expect(entries).toHaveLength(SEO_INDEXABLE_PAGES.length);
    expect(entries.map((entry) => entry.url)).toEqual(
      SEO_INDEXABLE_PAGES.map((path) => `${SITE_DOMAIN}${path}`),
    );
    expect(entries[0]?.changeFrequency).toBe("weekly");
    expect(entries[0]?.priority).toBe(1);
  });

  it("publishes varnito.com robots and sitemap for US market", async () => {
    state.market = "us";

    const robotsConfig = await robots();
    const entries = await sitemap();

    expect(robotsConfig.sitemap).toBe("https://varnito.com/sitemap.xml");
    expect(robotsConfig.host).toBe("https://varnito.com");
    expect(entries[0]?.url).toBe("https://varnito.com/");
  });
});