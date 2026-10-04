import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  appendGrowthSourceToHref,
  resolveGrowthSourceFromRequest,
  trackGrowthEvent,
} from "@/features/analytics/growth";
import { isCurrentRequestInternalAnalyticsExcluded } from "@/features/analytics/internal-traffic";
import { getRequestMarket } from "@/shared/i18n/request";
import { enforceActionRateLimit } from "@/shared/lib/rate-limit/service";

export default async function DemoIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await getRequestMarket();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const headerStore = await headers();
  const referrer = headerStore.get("referer");
  const source = await resolveGrowthSourceFromRequest({ searchParams: resolvedSearchParams, referrer });

  const rateLimit = await enforceActionRateLimit({
    scope: "demo_entry",
    maxSubmissions: 30,
    windowMinutes: 10,
  });

  if (!rateLimit.allowed) {
    redirect("/?error=demo_rate_limited");
  }

  const isExcluded = await isCurrentRequestInternalAnalyticsExcluded();

  if (!isExcluded) {
    await trackGrowthEvent({
      eventName: "demo_opened",
      market,
      isAuthenticated: false,
      source,
      searchParams: resolvedSearchParams,
      referrer,
    });
  }

  redirect(appendGrowthSourceToHref("/demo/dashboard", source));
}
