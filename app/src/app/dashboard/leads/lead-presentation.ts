export const STATUS_LABELS: Record<string, string> = {
  new: "Neue Anfrage",
  contacted: "Kontaktiert",
  successful: "Erfolgreich",
  unsuccessful: "Nicht erfolgreich",
};

export const SUCCESSFUL_OUTCOMES = [
  { value: "appointment_scheduled", label: "Termin vereinbart" },
  { value: "offer_created", label: "Angebot erstellt" },
  { value: "job_won", label: "Auftrag erhalten" },
];

export const UNSUCCESSFUL_OUTCOMES = [
  { value: "price_comparison", label: "Preisvergleich" },
  { value: "no_interest", label: "Kein Interesse" },
  { value: "unreachable", label: "Nicht erreichbar" },
  { value: "outside_service_area", label: "Außerhalb Einsatzgebiet" },
  { value: "too_expensive", label: "Zu teuer" },
  { value: "other", label: "Sonstiges" },
];

export const LEAD_STATUSES = ["new", "contacted", "successful", "unsuccessful"];

export const primaryActionStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "2.75rem",
  padding: "12px 18px",
  borderRadius: 8,
  background: "var(--gold)",
  color: "var(--card)",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
} as const;

export const secondaryActionStyle = {
  ...primaryActionStyle,
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
} as const;

export type LeadCard = {
  id: string;
  leadName: string;
  contactLabel: string;
  inquiryType: string;
  notes: string | null;
  status: string;
  createdAtLabel: string;
  assignedUserId: string | null;
  assignedLabel: string;
  successfulOutcome: string | null;
  unsuccessfulOutcome: string | null;
  history: { id: string; label: string }[];
};

export type LeadAssignee = { id: string; label: string };
