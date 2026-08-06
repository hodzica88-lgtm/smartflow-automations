import { headers } from "next/headers";

import { getMarketConfig, resolveMarketFromHost } from "@/shared/i18n/market";

export const getRequestMarket = async () => {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const market = resolveMarketFromHost(host);

  return {
    market,
    config: getMarketConfig(market),
    host,
  };
};

export const formatDateTimeForLocale = (value: string | null, locale: "de-DE" | "en-US") => {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};
