export const FALLBACK_INQUIRY_TYPE = "Allgemeine Anfrage";

export type MarketCode = "de" | "us" | "unknown";

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeInquiryTypeName = (value: string) =>
  normalizeWhitespace(value).replace(/[\u00A0]/g, " ");

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
}) => {
  const name = `${firstName} ${lastName}`.trim();
  const german = market === "de" || market === "unknown";
  const issueText = [description?.trim(), contextualAnswer?.trim()].filter(Boolean).join("\n");
  const fallbackType = normalizeInquiryTypeName(FALLBACK_INQUIRY_TYPE).toLowerCase();
  const normalizedInquiryType = normalizeInquiryTypeName(inquiryType).toLowerCase();
  const shouldShowType = inquiryType && normalizedInquiryType !== fallbackType && normalizedInquiryType !== "general inquiry";

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
    summaryLines.push(inquiryType);
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
