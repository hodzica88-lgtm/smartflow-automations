import { headers } from "next/headers";

import { getMarketConfig, resolveMarketFromHost } from "@/shared/i18n/market";

const extractForwardedHost = (forwardedHeader: string | null) => {
  if (!forwardedHeader) {
    return null;
  }

  // RFC 7239 format example: for=1.2.3.4;host=varnito.com;proto=https
  const hostMatch = forwardedHeader.match(/(?:^|[;,\s])host=([^;\s,]+)/i);
  return hostMatch?.[1]?.trim() ?? null;
};

const firstNonEmpty = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

export const getRequestMarket = async () => {
  const headerStore = await headers();
  const host = firstNonEmpty(
    headerStore.get("x-forwarded-host"),
    extractForwardedHost(headerStore.get("forwarded")),
    headerStore.get("x-original-host"),
    headerStore.get("host"),
  );
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
