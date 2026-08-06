import { redirect } from "next/navigation";

import { trackAnalyticsEvent } from "@/features/analytics/events";
import { getRequestMarket } from "@/shared/i18n/request";

export default async function DemoIndexPage() {
  const { market } = await getRequestMarket();

  trackAnalyticsEvent({
    eventName: "demo_entry",
    market,
    isAuthenticated: false,
  });

  redirect("/demo/dashboard");
}
