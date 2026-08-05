import type { MetadataRoute } from "next";

import { SITE_DOMAIN } from "@/shared/config/site";

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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/impressum", "/datenschutz", "/agb", "/widerruf", "/kontakt", "/registrierung"],
        disallow: [...DISALLOWED_PATHS],
      },
    ],
    sitemap: `${SITE_DOMAIN}/sitemap.xml`,
    host: SITE_DOMAIN,
  };
}