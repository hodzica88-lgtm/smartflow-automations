export const SITE_NAME = "Varnito";
export const SITE_DOMAIN = "https://varnito.de";
export const SITE_DESCRIPTION =
  "Varnito sichert eingehende Anfragen, informiert den Betrieb und hält Bearbeitungen im Team klar nachvollziehbar.";

export const LEGAL_ENTITY_NAME = "Hodzic Digital Services - Almir Hodzic";
export const LEGAL_CONTACT_EMAIL = "kontakt@varnito.de";
export const LEGAL_CONTACT_PATH = "/kontakt";
export const LEGAL_DOC_VERSION = "2026-08-06";

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
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerruf" },
  { href: LEGAL_CONTACT_PATH, label: "Kontakt" },
] as const;
