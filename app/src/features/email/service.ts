import { SITE_DOMAIN, SITE_NAME } from "@/shared/config/site";

export type EmailTemplate = {
  subject: string;
  body: string;
};

export type EmailBranding = {
  companyName?: string | null;
  signature?: string | null;
  primaryColor?: string | null;
  logoUrl?: string | null;
};

export type TransactionalEmailType =
  | "welcome"
  | "email_confirmation"
  | "password_reset"
  | "password_changed"
  | "team_invited"
  | "invite_accepted"
  | "new_inquiry"
  | "customer_confirmation"
  | "trial_started"
  | "trial_ends_7_days"
  | "trial_ends_tomorrow"
  | "trial_ended"
  | "checkout_success"
  | "payment_success"
  | "payment_failed"
  | "subscription_canceled"
  | "subscription_reactivated"
  | "member_removed";

const FALLBACK_COLOR = "#0f766e";

const EMAIL_TEMPLATES: Record<TransactionalEmailType, EmailTemplate> = {
  welcome: {
    subject: "Willkommen bei Varnito",
    body: [
      "Hallo {{name}},",
      "",
      "willkommen bei Varnito. Ihr Zugang ist vorbereitet.",
      "",
      "Zum Einstieg: {{dashboard_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  email_confirmation: {
    subject: "Bitte bestaetigen Sie Ihre E-Mail-Adresse",
    body: [
      "Hallo {{name}},",
      "",
      "bitte bestaetigen Sie Ihre E-Mail-Adresse, damit Sie Varnito weiter nutzen koennen.",
      "",
      "Bestaetigung: {{confirmation_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  password_reset: {
    subject: "Passwort zuruecksetzen",
    body: [
      "Hallo {{name}},",
      "",
      "Sie koennen Ihr Passwort ueber den folgenden Link zuruecksetzen:",
      "{{reset_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  password_changed: {
    subject: "Ihr Passwort wurde geaendert",
    body: [
      "Hallo {{name}},",
      "",
      "das Passwort fuer Ihr Varnito-Konto wurde soeben geaendert.",
      "Falls Sie das nicht waren, setzen Sie das Passwort sofort zurueck: {{reset_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  team_invited: {
    subject: "Sie wurden zu Varnito eingeladen",
    body: [
      "Hallo {{name}},",
      "",
      "Sie wurden zu {{company_name}} in Varnito eingeladen.",
      "Bitte bestaetigen Sie die Einladung und legen Sie Ihren Zugang an:",
      "{{invite_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  invite_accepted: {
    subject: "Einladung angenommen",
    body: [
      "Hallo {{name}},",
      "",
      "{{full_name}} hat die Einladung angenommen und den Zugang aktiviert.",
      "",
      "Dashboard: {{dashboard_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  new_inquiry: {
    subject: "Neue Anfrage fuer {{company_name}}",
    body: [
      "Neue Anfrage eingegangen.",
      "",
      "Name: {{lead_name}}",
      "Telefon: {{lead_phone}}",
      "E-Mail: {{lead_email}}",
      "Anfrageart: {{lead_inquiry_type}}",
      "Nachricht: {{lead_message}}",
      "",
      "Dashboard: {{dashboard_url}}",
      "",
      "{{signature}}",
    ].join("\n"),
  },
  customer_confirmation: {
    subject: "Ihre Anfrage bei {{company_name}} ist eingegangen",
    body: [
      "Hallo {{lead_name}},",
      "",
      "vielen Dank fuer Ihre Anfrage bei {{company_name}}. Wir melden uns zeitnah bei Ihnen.",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  trial_started: {
    subject: "Ihre Testphase mit Varnito hat begonnen",
    body: [
      "Hallo {{name}},",
      "",
      "Ihre 30-taegige Testphase mit Varnito wurde gestartet.",
      "Die Verwaltung finden Sie hier: {{dashboard_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  trial_ends_7_days: {
    subject: "Ihre Testphase endet in 7 Tagen",
    body: [
      "Hallo {{name}},",
      "",
      "Ihre Testphase fuer {{company_name}} endet in 7 Tagen.",
      "Pruefen Sie Billing und Zugang hier: {{billing_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  trial_ends_tomorrow: {
    subject: "Ihre Testphase endet morgen",
    body: [
      "Hallo {{name}},",
      "",
      "Ihre Testphase fuer {{company_name}} endet morgen.",
      "Bitte pruefen Sie Ihren Zugang hier: {{billing_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  trial_ended: {
    subject: "Ihre Testphase ist beendet",
    body: [
      "Hallo {{name}},",
      "",
      "Die Testphase fuer {{company_name}} ist beendet.",
      "Wenn Sie Varnito weiter nutzen moechten, oeffnen Sie Billing: {{billing_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  checkout_success: {
    subject: "Checkout erfolgreich abgeschlossen",
    body: [
      "Hallo {{name}},",
      "",
      "der Checkout fuer {{company_name}} wurde erfolgreich abgeschlossen.",
      "Zum Billing-Bereich: {{billing_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  payment_success: {
    subject: "Zahlung erfolgreich",
    body: [
      "Hallo {{name}},",
      "",
      "Ihre Zahlung wurde erfolgreich verarbeitet.",
      "Billing: {{billing_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  payment_failed: {
    subject: "Zahlung fehlgeschlagen",
    body: [
      "Hallo {{name}},",
      "",
      "Eine Zahlung fuer {{company_name}} konnte nicht verarbeitet werden.",
      "Bitte pruefen Sie Ihre Zahlungsdaten im Billing-Bereich: {{billing_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  subscription_canceled: {
    subject: "Abonnement gekuendigt",
    body: [
      "Hallo {{name}},",
      "",
      "Ihr Abonnement fuer {{company_name}} wurde gekuendigt.",
      "Sie koennen es im Billing-Bereich ueberpruefen: {{billing_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  subscription_reactivated: {
    subject: "Abonnement reaktiviert",
    body: [
      "Hallo {{name}},",
      "",
      "Ihr Abonnement fuer {{company_name}} wurde wieder aktiviert.",
      "Billing: {{billing_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  member_removed: {
    subject: "Mitarbeiterzugang entfernt",
    body: [
      "Hallo {{name}},",
      "",
      "Der Zugang von {{member_name}} wurde entfernt.",
      "Falls das nicht beabsichtigt war, pruefen Sie bitte die Teamverwaltung: {{dashboard_url}}",
      "",
      "Viele Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
};

const replaceTemplateVariables = (
  content: string,
  values: Record<string, string | null | undefined>,
) => {
  let output = content;

  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, (value ?? "").trim());
  }

  return output;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const bodyToHtml = (body: string) =>
  body
    .split("\n")
    .map((line) => (line.trim().length > 0 ? `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>` : "<div style=\"height:8px;\"></div>"))
    .join("");

const resolveCompanyName = (branding?: EmailBranding | null) =>
  branding?.companyName?.trim() || SITE_NAME;

const resolveSignature = (branding?: EmailBranding | null) =>
  branding?.signature?.trim() || SITE_NAME;

export const getTransactionalEmailTemplate = (type: TransactionalEmailType) => {
  return EMAIL_TEMPLATES[type];
};

export const composeTransactionalEmail = (
  type: TransactionalEmailType,
  values: Record<string, string | null | undefined>,
  branding?: EmailBranding | null,
) => {
  const template = getTransactionalEmailTemplate(type);
  const companyName = resolveCompanyName(branding);
  const signature = resolveSignature(branding);
  const nextValues = {
    company_name: companyName,
    dashboard_url: `${SITE_DOMAIN}/dashboard`,
    billing_url: `${SITE_DOMAIN}/dashboard/billing`,
    confirmation_url: `${SITE_DOMAIN}/login`,
    invite_url: `${SITE_DOMAIN}/team/accept`,
    reset_url: `${SITE_DOMAIN}/forgot-password`,
    signature,
    ...values,
  };

  const subject = replaceTemplateVariables(template.subject, nextValues);
  const body = replaceTemplateVariables(template.body, nextValues);
  const color = branding?.primaryColor?.trim() || FALLBACK_COLOR;

  return {
    subject,
    textContent: body,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;max-width:680px;margin:0 auto;">
        <div style="border-top:3px solid ${escapeHtml(color)};padding-top:16px;">
          ${branding?.logoUrl ? `<img src="${escapeHtml(branding.logoUrl)}" alt="Logo" style="max-height:48px;max-width:180px;display:block;margin-bottom:16px;"/>` : ""}
          ${bodyToHtml(body)}
          <p style="margin:18px 0 0;color:#4b5563;">${escapeHtml(signature)}</p>
        </div>
      </div>
    `.trim(),
  };
};
