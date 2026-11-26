import type { MarketCode } from "@/shared/i18n/market";

export const PARTNER_APPLICATION_STATUSES = [
  "new",
  "in_review",
  "contacted",
  "accepted",
  "rejected",
] as const;

export type PartnerApplicationStatus = (typeof PARTNER_APPLICATION_STATUSES)[number];

export type PartnerApplicationRecord = {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  website: string | null;
  country: string;
  description: string;
  privacy_accepted: boolean;
  source: string;
  status: PartnerApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type PartnerApplicationInput = {
  name: string;
  company: string;
  email: string;
  website?: string | null;
  country: string;
  message: string;
  privacyAccepted: boolean;
  source?: string;
  market?: MarketCode;
  honeypot?: string;
};

const trimValue = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
};

const normalizeEmail = (value: string) => trimValue(value).toLowerCase();

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidWebsite = (value: string | null | undefined) => {
  if (!value || !trimValue(value)) {
    return true;
  }

  const normalized = trimValue(value);
  return /^https?:\/\//i.test(normalized) || /^www\./i.test(normalized) || /^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(normalized);
};

export const formatPartnerApplicationStatus = (status: string, market: MarketCode = "de") => {
  const labels: Record<PartnerApplicationStatus, { de: string; us: string }> = {
    new: { de: "Neu", us: "New" },
    in_review: { de: "In Prüfung", us: "In review" },
    contacted: { de: "Kontaktiert", us: "Contacted" },
    accepted: { de: "Angenommen", us: "Accepted" },
    rejected: { de: "Abgelehnt", us: "Rejected" },
  };

  return labels[status as PartnerApplicationStatus]?.[market] ?? status;
};

export const validatePartnerApplicationInput = (input: PartnerApplicationInput) => {
  const name = trimValue(input.name);
  const company = trimValue(input.company);
  const email = normalizeEmail(input.email);
  const website = trimValue(input.website ?? "");
  const country = trimValue(input.country);
  const message = trimValue(input.message);
  const privacyAccepted = Boolean(input.privacyAccepted);
  const honeypot = trimValue(input.honeypot ?? "");

  if (honeypot) {
    return { ok: false as const, error: "Invalid submission." };
  }

  if (!name || name.length > 120) {
    return { ok: false as const, error: "Please enter your name." };
  }

  if (!company || company.length > 160) {
    return { ok: false as const, error: "Please enter your company or agency name." };
  }

  if (!email || !isValidEmail(email)) {
    return { ok: false as const, error: "Please enter a valid business email address." };
  }

  if (!country || country.length > 120) {
    return { ok: false as const, error: "Please choose your country." };
  }

  if (!message || message.length < 20 || message.length > 2000) {
    return { ok: false as const, error: "Please describe your company and the collaboration you have in mind." };
  }

  if (!privacyAccepted) {
    return { ok: false as const, error: "Please accept the privacy notice before submitting." };
  }

  if (website && !isValidWebsite(website)) {
    return { ok: false as const, error: "Please enter a valid website URL or leave it blank." };
  }

  return {
    ok: true as const,
    normalized: {
      fullName: name,
      companyName: company,
      email,
      website: website || null,
      country,
      description: message,
      privacyAccepted,
      source: input.source ?? "public_form",
      market: input.market ?? "de",
    },
  };
};
