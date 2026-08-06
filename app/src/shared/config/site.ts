import { getMarketCopy } from "@/shared/i18n/copy";
import type { MarketCode } from "@/shared/i18n/market";
import { getMarketConfig } from "@/shared/i18n/market";

export const SITE_NAME = "Varnito";
export const DEFAULT_MARKET: MarketCode = "de";
export const SITE_DOMAIN = getMarketConfig(DEFAULT_MARKET).siteUrl;
export const SITE_DESCRIPTION = getMarketCopy(DEFAULT_MARKET).siteDescription;

export const LEGAL_ENTITY_NAME = "Hodzic Digital Services - Almir Hodzic";
export const LEGAL_CONTACT_EMAIL = getMarketConfig(DEFAULT_MARKET).legalContactEmail;
export const LEGAL_CONTACT_PATH = "/kontakt";
export const LEGAL_REPRESENTATIVE = "Almir Hodzic";
export const LEGAL_DOC_VERSION = "2026-08-07";

export const SEO_INDEXABLE_PAGES = [
  "/",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerruf",
  "/kontakt",
  "/registrierung",
] as const;

export const PUBLIC_PAGES = SEO_INDEXABLE_PAGES;

export const LEGAL_LINKS = [
  { href: "/impressum", label: getMarketCopy(DEFAULT_MARKET).shared.legalLinks.imprint },
  { href: "/datenschutz", label: getMarketCopy(DEFAULT_MARKET).shared.legalLinks.privacy },
  { href: "/agb", label: getMarketCopy(DEFAULT_MARKET).shared.legalLinks.terms },
  { href: "/widerruf", label: getMarketCopy(DEFAULT_MARKET).shared.legalLinks.withdrawal },
  { href: LEGAL_CONTACT_PATH, label: getMarketCopy(DEFAULT_MARKET).shared.legalLinks.contact },
] as const;
