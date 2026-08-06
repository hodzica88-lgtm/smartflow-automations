export type MarketCode = "de" | "us";

export type MarketConfig = {
  code: MarketCode;
  domain: string;
  language: "de" | "en";
  locale: "de-DE" | "en-US";
  currency: "eur" | "usd";
  siteUrl: string;
  legalContactEmail: string;
};

const MARKET_CONFIG: Record<MarketCode, MarketConfig> = {
  de: {
    code: "de",
    domain: "varnito.de",
    language: "de",
    locale: "de-DE",
    currency: "eur",
    siteUrl: "https://varnito.de",
    legalContactEmail: "kontakt@varnito.de",
  },
  us: {
    code: "us",
    domain: "varnito.com",
    language: "en",
    locale: "en-US",
    currency: "usd",
    siteUrl: "https://varnito.com",
    legalContactEmail: "contact@varnito.com",
  },
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export const getMarketConfig = (market: MarketCode): MarketConfig => MARKET_CONFIG[market];

const normalizeHost = (input: string | null | undefined) => {
  if (!input) {
    return "";
  }

  const trimmed = input.trim().toLowerCase();
  return trimmed.includes(":") ? trimmed.split(":")[0] ?? trimmed : trimmed;
};

export const resolveMarketFromHost = (host: string | null | undefined): MarketCode => {
  const normalized = normalizeHost(host);

  if (!normalized || LOCAL_HOSTS.has(normalized)) {
    return "de";
  }

  if (normalized.endsWith("varnito.com")) {
    return "us";
  }

  return "de";
};

export const resolveSiteUrlFromHost = (host: string | null | undefined) =>
  getMarketConfig(resolveMarketFromHost(host)).siteUrl;
