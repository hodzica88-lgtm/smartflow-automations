import { describe, expect, it } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";
import { SEO_INDEXABLE_PAGES, SITE_DOMAIN } from "@/shared/config/site";

describe("technical SEO routes", () => {
  it("publishes the varnito.de sitemap and blocks internal areas", () => {
    const robotsConfig = robots();
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

  it("lists only the public indexable varnito.de pages in the sitemap", () => {
    const entries = sitemap();

    expect(entries).toHaveLength(SEO_INDEXABLE_PAGES.length);
    expect(entries.map((entry) => entry.url)).toEqual(
      SEO_INDEXABLE_PAGES.map((path) => `${SITE_DOMAIN}${path}`),
    );
    expect(entries[0]?.changeFrequency).toBe("weekly");
    expect(entries[0]?.priority).toBe(1);
  });
});