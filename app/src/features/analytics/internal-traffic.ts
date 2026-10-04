import { cookies } from "next/headers";

import { normalizeHostForMarket } from "@/shared/i18n/market";
import { getRequestMarket } from "@/shared/i18n/request";

export const INTERNAL_ANALYTICS_COOKIE_NAME = "varnito_internal_analytics_excluded";

export const INTERNAL_ANALYTICS_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 365 * 24 * 60 * 60,
};

export const isInternalAnalyticsExcluded = ({
  host,
  cookieValue,
}: {
  host?: string | null;
  cookieValue?: string | null;
} = {}) => {
  const normalizedHost = normalizeHostForMarket(host);
  const localHostExcluded = ["localhost", "127.0.0.1", "us.localhost"].includes(normalizedHost);

  return localHostExcluded || cookieValue === "1";
};

export const isCurrentRequestInternalAnalyticsExcluded = async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(INTERNAL_ANALYTICS_COOKIE_NAME)?.value ?? null;
  const { host } = await getRequestMarket();

  return isInternalAnalyticsExcluded({ host, cookieValue });
};
