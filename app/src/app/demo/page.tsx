import { redirect } from "next/navigation";

import { trackAnalyticsEvent } from "@/features/analytics/events";
import { getRequestMarket } from "@/shared/i18n/request";
import { enforceActionRateLimit } from "@/shared/lib/rate-limit/service";

export default async function DemoIndexPage() {
  const { market } = await getRequestMarket();

  const rateLimit = await enforceActionRateLimit({
    scope: "demo_entry",
    maxSubmissions: 30,
    windowMinutes: 10,
  });

  if (!rateLimit.allowed) {
    redirect("/?error=demo_rate_limited");
  }

  trackAnalyticsEvent({
    eventName: "demo_entry",
    market,
    isAuthenticated: false,
  });

  redirect("/demo/dashboard");
}
