export const INDUSTRY_OPTIONS = [
  "Handwerk / Bau",
  "Kfz-Werkstatt",
  "Autohaus",
  "Reinigungsfirma",
  "Pflegedienst",
  "Umzugsunternehmen",
  "Fahrschule",
  "Immobilienmakler",
  "Sonstige Branche",
] as const;

export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number];

export const INDUSTRY_INQUIRY_TYPE_TEMPLATES: Record<IndustryOption, readonly string[]> = {
  "Handwerk / Bau": [
    "Angebot anfordern",
    "Beratung",
    "Reparatur",
    "Renovierung / Sanierung",
    "Montage / Neubau",
    "Wartung",
    "Dringende Anfrage",
    "Sonstiges",
  ],
  "Kfz-Werkstatt": [
    "Inspektion",
    "Reparatur",
    "Reifenwechsel",
    "Hauptuntersuchung",
    "Unfall / Schaden",
    "Diagnose",
    "Wartung",
    "Sonstiges",
  ],
  Autohaus: [
    "Fahrzeugkauf",
    "Probefahrt",
    "Inzahlungnahme",
    "Finanzierung / Leasing",
    "Gebrauchtwagen",
    "Neuwagen",
    "Fahrzeug verkaufen",
    "Sonstiges",
  ],
  Reinigungsfirma: [
    "Büroreinigung",
    "Unterhaltsreinigung",
    "Grundreinigung",
    "Fensterreinigung",
    "Bauendreinigung",
    "Privathaushalt",
    "Angebot anfordern",
    "Sonstiges",
  ],
  Pflegedienst: [
    "Erstberatung",
    "Ambulante Pflege",
    "Haushaltshilfe",
    "Betreuung",
    "Verhinderungspflege",
    "Pflegegrad-Beratung",
    "Kapazitätsanfrage",
    "Sonstiges",
  ],
  Umzugsunternehmen: [
    "Privatumzug",
    "Firmenumzug",
    "Fernumzug",
    "Entrümpelung",
    "Möbelmontage",
    "Ein- und Auspackservice",
    "Besichtigung / Angebot",
    "Sonstiges",
  ],
  Fahrschule: [
    "Führerschein Klasse B",
    "Motorradführerschein",
    "Lkw- / Busführerschein",
    "Auffrischungsfahrt",
    "Intensivkurs",
    "Führerschein-Umschreibung",
    "Preisanfrage",
    "Sonstiges",
  ],
  Immobilienmakler: [
    "Immobilie verkaufen",
    "Immobilie kaufen",
    "Immobilie vermieten",
    "Immobilie mieten",
    "Immobilienbewertung",
    "Besichtigung",
    "Beratung",
    "Sonstiges",
  ],
  "Sonstige Branche": [
    "Angebot anfordern",
    "Beratung",
    "Rückrufbitte",
    "Terminwunsch",
    "Reklamation",
    "Allgemeine Anfrage",
    "Sonstiges",
  ],
};

export const isSupportedIndustry = (value: string): value is IndustryOption =>
  INDUSTRY_OPTIONS.includes(value as IndustryOption);

export const getInquiryTypeTemplateForIndustry = (industry: string): readonly string[] =>
  isSupportedIndustry(industry) ? INDUSTRY_INQUIRY_TYPE_TEMPLATES[industry] : [];

export const normalizeInquiryTypeName = (value: string) => value.trim();
