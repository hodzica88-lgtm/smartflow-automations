import type { MetadataRoute } from "next";

import { SEO_INDEXABLE_PAGES } from "@/shared/config/site";
import { getRequestMarket } from "@/shared/i18n/request";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { config } = await getRequestMarket();
  const updatedAt = new Date();

  return SEO_INDEXABLE_PAGES.map((path) => ({
    url: `${config.siteUrl}${path}`,
    lastModified: updatedAt,
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.6,
  }));
}