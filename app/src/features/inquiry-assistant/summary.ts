export const FALLBACK_INQUIRY_TYPE = "Allgemeine Anfrage";

export type MarketCode = "de" | "us" | "unknown";

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

export const normalizeInquiryTypeName = (value: string) =>
  normalizeWhitespace(value).replace(/[\u00A0]/g, " ");

export const resolveInquiryTypeOption = (
  candidate: string | null | undefined,
  allowedInquiryTypes: string[],
  fallbackType = FALLBACK_INQUIRY_TYPE,
) => {
  const validAllowedTypes = allowedInquiryTypes.length > 0 ? allowedInquiryTypes : [fallbackType];
  const trimmedCandidate = typeof candidate === "string" ? normalizeInquiryTypeName(candidate) : "";

  if (!trimmedCandidate) {
    return validAllowedTypes[0] ?? fallbackType;
  }

  const directMatch = validAllowedTypes.find(
    (entry) => normalizeInquiryTypeName(entry) === trimmedCandidate,
  );
  if (directMatch) {
    return directMatch;
  }

  const caseInsensitiveMatch = validAllowedTypes.find(
    (entry) => normalizeInquiryTypeName(entry).toLowerCase() === trimmedCandidate.toLowerCase(),
  );
  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  return validAllowedTypes[0] ?? fallbackType;
};

export const combineInquiryDescription = (...values: Array<string | null | undefined>) =>
  values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n");

export const buildContextualFollowUpQuestion = ({
  description,
  market,
}: {
  description: string;
  market?: MarketCode | "unknown";
}) => {
  const text = normalizeWhitespace(description).toLowerCase();
  const german = market !== "us";

  if (/heizung|heizungs|heizkörper|radiator|heating|boiler/.test(text)) {
    return german
      ? "Verstanden. Können Sie kurz beschreiben, was genau nicht funktioniert – wird die Heizung gar nicht warm, zeigt sie eine Fehlermeldung oder macht sie ungewöhnliche Geräusche?"
      : "Understood. Can you briefly describe what is failing — is the heating not warming up at all, is there an error code, or is it making unusual noises?";
  }

  if (/klima|klimaanlage|ac|air conditioning|cooling/.test(text)) {
    return german
      ? "Verstanden. Funktioniert die Klimaanlage gar nicht, liefert sie zu wenig Kühlung oder zeigt sie eine Fehlermeldung?"
      : "Understood. Is the cooling system not working at all, delivering too little cooling, or showing an error?";
  }

  if (/rohr|wasser|leitung|sanitär|plumbing|pipe|water|drain/.test(text)) {
    return german
      ? "Verstanden. Ist das Problem ein Wasserverlust, ein verstopfter Ablauf oder ein Defekt an einer Leitung?"
      : "Understood. Is this a leak, a blocked drain, or a damaged pipe or fixture?";
  }

  if (/elektro|strom|steckdose|installation|electrical|power|outlet|wiring/.test(text)) {
    return german
      ? "Verstanden. Ist die Anlage komplett ohne Strom, gibt es ein Problem mit einer Sicherung oder einer Steckdose, oder ist ein Gerät betroffen?"
      : "Understood. Is the issue total power loss, a tripped breaker or outlet, or a specific appliance affected?";
  }

  if (/dach|abdichtung|roof|waterproofing|leak/.test(text)) {
    return german
      ? "Verstanden. Ist das Problem ein Leck, eine undichte Stelle oder ein sichtbarer Schaden am Dachbereich?"
      : "Understood. Is this a leak, a visible roof defect, or a damaged area that needs attention?";
  }

  return german
    ? "Verstanden. Können Sie kurz beschreiben, was genau nicht funktioniert und welche Auswirkungen das auf Sie hat?"
    : "Understood. Can you briefly describe what is failing and what impact it is having?";
};

export const buildInquirySummary = ({
  firstName,
  lastName,
  address,
  phone,
  email,
  inquiryType,
  description,
  contextualAnswer,
  market,
  allowedInquiryTypes,
}: {
  firstName: string;
  lastName: string;
  address: string;
  phone?: string;
  email?: string;
  inquiryType: string;
  description?: string | null;
  contextualAnswer?: string | null;
  market?: MarketCode | "unknown";
  allowedInquiryTypes?: string[];
}) => {
  const name = `${firstName} ${lastName}`.trim();
  const german = market === "de" || market === "unknown";
  const issueText = combineInquiryDescription(description, contextualAnswer);
  const typeList = allowedInquiryTypes && allowedInquiryTypes.length > 0 ? allowedInquiryTypes : [FALLBACK_INQUIRY_TYPE];
  const resolvedInquiryType = resolveInquiryTypeOption(inquiryType, typeList, FALLBACK_INQUIRY_TYPE);
  const fallbackType = normalizeInquiryTypeName(FALLBACK_INQUIRY_TYPE).toLowerCase();
  const normalizedResolvedType = normalizeInquiryTypeName(resolvedInquiryType).toLowerCase();
  const shouldShowType = Boolean(resolvedInquiryType) && normalizedResolvedType !== fallbackType && normalizedResolvedType !== "general inquiry";

  const summaryLines = [
    `${german ? "Alles klar. Ich habe:" : "Everything is clear. I have:"}`,
    "",
  ];

  if (issueText) {
    summaryLines.push(`${german ? "Anliegen:" : "Issue:"}`);
    summaryLines.push(issueText);
    summaryLines.push("");
  }

  if (shouldShowType) {
    summaryLines.push(`${german ? "Anfrageart:" : "Request type:"}`);
    summaryLines.push(resolvedInquiryType);
    summaryLines.push("");
  }

  summaryLines.push(`${german ? "Name:" : "Name:"}`);
  summaryLines.push(name || (german ? "Kunde" : "Customer"));
  summaryLines.push("");

  summaryLines.push(`${german ? "Adresse:" : "Address:"}`);
  summaryLines.push(address || (german ? "Adresse nicht angegeben" : "Address not provided"));
  summaryLines.push("");

  if (phone) {
    summaryLines.push(`${german ? "Telefon:" : "Phone:"}`);
    summaryLines.push(phone);
    summaryLines.push("");
  }

  if (email) {
    summaryLines.push(`${german ? "E-Mail:" : "Email:"}`);
    summaryLines.push(email);
    summaryLines.push("");
  }

  summaryLines.push(german ? "Soll ich die Anfrage jetzt senden?" : "Do you want to send this request now?");

  return summaryLines.join("\n");
};
