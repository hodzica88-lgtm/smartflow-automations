export const SUPPORT_KNOWLEDGE_BASE = {
  de: [
    "Die Einrichtung ist im Dashboard unter Einstellungen und Firmendaten zu finden.",
    "Anfragen und Leads werden im Dashboard unter Anfragen / Leads verwaltet.",
    "Der Status eines Leads wird im jeweiligen Lead-Detail oder in der Lead-Liste bearbeitet.",
    "Teammitglieder und Zugänge verwalten Sie über den Bereich Team oder Benutzerverwaltung.",
    "Wenn Sie Branding oder visuelle Einstellungen ändern möchten, nutzen Sie die Einstellungen im Dashboard.",
    "Zum Login nutzen Sie Ihre E-Mail und das Passwort. Wenn nötig, setzen Sie das Passwort zurück.",
    "Im Demo- oder Trial-Bereich können Sie die Einrichtung und ersten Schritte testen, ohne eine Bezahlung zu veranlassen.",
    "Varnito hilft bei der Verwaltung von Anfragen, Leads und Teamzugängen im Betrieb.",
  ],
  en: [
    "Settings and company details live in the dashboard under Settings.",
    "Leads and requests are managed in the Dashboard under Leads or Requests.",
    "You can update lead status directly from the lead detail view or list.",
    "Team members and access are managed from the Team section in the dashboard.",
    "Branding and appearance settings are configured from the dashboard settings area.",
    "Use your email and password to sign in. If needed, reset your password from the login flow.",
    "The demo or trial area is meant to test the setup and first steps without making a payment decision.",
    "Varnito helps manage incoming inquiries, leads, and team access from the dashboard.",
  ],
} as const;

export const getSupportKnowledgeAnswer = (language: "de" | "en", question: string) => {
  const normalized = question.toLowerCase();

  const template =
    language === "de"
      ? "Vielen Dank für Ihre Nachricht. Für Varnito gilt: "
      : "Thank you for your message. For Varnito, the practical answer is: ";

  if (normalized.includes("dashboard") || normalized.includes("einstellung") || normalized.includes("settings")) {
    return `${template}${SUPPORT_KNOWLEDGE_BASE[language][0]}`;
  }

  if (normalized.includes("lead") || normalized.includes("anfrage") || normalized.includes("request")) {
    return `${template}${SUPPORT_KNOWLEDGE_BASE[language][1]}`;
  }

  if (normalized.includes("status") || normalized.includes("statusbearbeitung") || normalized.includes("status update")) {
    return `${template}${SUPPORT_KNOWLEDGE_BASE[language][2]}`;
  }

  if (normalized.includes("team") || normalized.includes("mitarbeiter") || normalized.includes("member")) {
    return `${template}${SUPPORT_KNOWLEDGE_BASE[language][3]}`;
  }

  if (normalized.includes("branding") || normalized.includes("design") || normalized.includes("branding")) {
    return `${template}${SUPPORT_KNOWLEDGE_BASE[language][4]}`;
  }

  if (normalized.includes("login") || normalized.includes("passwort") || normalized.includes("password") || normalized.includes("sign in")) {
    return `${template}${SUPPORT_KNOWLEDGE_BASE[language][5]}`;
  }

  if (normalized.includes("demo") || normalized.includes("trial") || normalized.includes("test")) {
    return `${template}${SUPPORT_KNOWLEDGE_BASE[language][6]}`;
  }

  return `${template}${SUPPORT_KNOWLEDGE_BASE[language][7]}`;
};
