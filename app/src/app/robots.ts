import type { MetadataRoute } from "next";

import { getRequestMarket } from "@/shared/i18n/request";

const DISALLOWED_PATHS = [
  "/api/",
  "/dashboard/",
  "/operator/",
  "/onboarding",
  "/login",
  "/forgot-password",
  "/team/",
  "/c/",
] as const;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { config } = await getRequestMarket();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/impressum", "/datenschutz", "/agb", "/widerruf", "/kontakt", "/registrierung"],
        disallow: [...DISALLOWED_PATHS],
      },
    ],
    sitemap: `${config.siteUrl}/sitemap.xml`,
    host: config.siteUrl,
  };
}