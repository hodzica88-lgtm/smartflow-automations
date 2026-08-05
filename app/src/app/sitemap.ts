import type { MetadataRoute } from "next";

import { SEO_INDEXABLE_PAGES, SITE_DOMAIN } from "@/shared/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const updatedAt = new Date();

  return SEO_INDEXABLE_PAGES.map((path) => ({
    url: `${SITE_DOMAIN}${path}`,
    lastModified: updatedAt,
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.6,
  }));
}