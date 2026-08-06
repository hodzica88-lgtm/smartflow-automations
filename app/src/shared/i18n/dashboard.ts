import type { MarketCode } from "@/shared/i18n/market";

type DashboardCopy = {
  navSettings: string;
  navHelp: string;
  navNotifications: string;
  navBell: string;
  back: string;
  logout: string;
  overviewTitle: string;
  overviewCopy: string;
  noLeadsTitle: string;
  noLeadsCopy: string;
  manageLeads: string;
  companySettings: string;
  newLeads: string;
  contacted: string;
  successful: string;
  unsuccessful: string;
  checkEmailDelivery: string;
  checkEmailDeliveryCopy: string;
  failedNotificationsLastDays: (count: number) => string;
  openSettings: string;
  last30DaysTitle: string;
  last30DaysCopy: string;
  openAnalytics: string;
  totalInquiries: string;
  stillOpen: string;
  noClosedLeads: string;
  successRate: (rate: number) => string;
  leadOverviewTitle: string;
  leadOverviewCopy: string;
  toLeads: string;
  openInquiriesTitle: string;
  openInquiriesCopy: string;
  showAllInquiries: string;
  noOpenInquiries: string;
  unknownContact: string;
  notProvided: string;
};

type BillingCopy = {
  back: string;
  statusHeading: string;
  statusAccessGranted: string;
  statusAccessBlocked: string;
  statusTrialUntil: string;
  statusCurrentPeriodUntil: string;
  statusCancellationPlanned: string;
  statusCancellationDate: string;
  yes: string;
  no: string;
  subscriptionHeading: string;
  subscriptionText: string;
  legalAcceptance: string;
  startSubscription: string;
  manageSubscription: string;
  ownerOnly: string;
  checkoutSuccess: string;
  checkoutCanceled: string;
  statusText: Record<string, string>;
};

type TeamCopy = {
  backToLeads: string;
  sectionLabel: string;
  title: string;
  description: string;
  inviteTitle: string;
  inviteDescription: string;
  emailLabel: string;
  emailPlaceholder: string;
  sendInvite: string;
  accessTitle: string;
  ownerLabel: string;
  pendingLabel: string;
  activeLabel: string;
  resend: string;
  removeAccess: string;
  auditDescription: string;
  auditEmptyTitle: string;
  auditEmptyMessage: string;
};

type NotificationsCopy = {
  sectionLabel: string;
  heading: string;
  subheading: string;
  markAllRead: string;
  backToDashboard: string;
  empty: string;
  read: string;
  unread: string;
  markRead: string;
};

type OperatorCopy = {
  sectionLabel: string;
  title: string;
  copy: string;
  toCustomerDashboard: string;
  logout: string;
  searchTitle: string;
  searchCopy: string;
  searchPlaceholder: string;
  searchButton: string;
  metrics: {
    activeCompanies: string;
    totalUsers: string;
    leadsLast30d: string;
    errorsLast24h: string;
    dueQueue: string;
    companiesNeedingAttention: string;
  };
};

export const DASHBOARD_COPY: Record<MarketCode, DashboardCopy> = {
  de: {
    navSettings: "Einstellungen",
    navHelp: "Hilfe",
    navNotifications: "Benachrichtigungen",
    navBell: "Glocke",
    back: "Zurueck",
    logout: "Abmelden",
    overviewTitle: "Ihre Uebersicht",
    overviewCopy: "Schneller Ueberblick ueber Ihre aktuellen Leads und den Weg zur Lead-Verwaltung.",
    noLeadsTitle: "Keine Leads vorhanden",
    noLeadsCopy: "Sobald neue Anfragen eingehen, sehen Sie hier die wichtigsten Lead-Zahlen.",
    manageLeads: "Leads verwalten",
    companySettings: "Firmeneinstellungen",
    newLeads: "Neue Anfragen",
    contacted: "Kontaktiert",
    successful: "Erfolgreich",
    unsuccessful: "Nicht erfolgreich",
    checkEmailDelivery: "E-Mail-Versand pruefen",
    checkEmailDeliveryCopy: "Mindestens eine Benachrichtigung konnte nicht versendet werden.",
    failedNotificationsLastDays: (count) => `${count} fehlgeschlagene Benachrichtigungen in den letzten 7 Tagen.`,
    openSettings: "Einstellungen oeffnen",
    last30DaysTitle: "Auswertung der letzten 30 Tage",
    last30DaysCopy: "Aktuelle Ergebnisse und offene Anfragen im gewaehlten Zeitraum.",
    openAnalytics: "Auswertungen oeffnen",
    totalInquiries: "Anfragen insgesamt",
    stillOpen: "Noch offen",
    noClosedLeads: "Noch keine abgeschlossenen Anfragen",
    successRate: (rate) => `Erfolgsquote: ${rate} %`,
    leadOverviewTitle: "Lead-Uebersicht",
    leadOverviewCopy: "Gehen Sie zur Lead-Verwaltung, um Status und Ergebnisse zu aktualisieren.",
    toLeads: "Zu Leads",
    openInquiriesTitle: "Offene Anfragen",
    openInquiriesCopy: "Hier sehen Sie die aeltesten offenen Anfragen zuerst.",
    showAllInquiries: "Alle Anfragen anzeigen",
    noOpenInquiries: "Aktuell sind keine offenen Anfragen vorhanden.",
    unknownContact: "Unbekannter Kontakt",
    notProvided: "Nicht angegeben",
  },
  us: {
    navSettings: "Settings",
    navHelp: "Help",
    navNotifications: "Notifications",
    navBell: "Bell",
    back: "Back",
    logout: "Log out",
    overviewTitle: "Your overview",
    overviewCopy: "Quick view of current leads and a direct path into lead operations.",
    noLeadsTitle: "No leads yet",
    noLeadsCopy: "As soon as new inquiries arrive, your key lead metrics will appear here.",
    manageLeads: "Manage leads",
    companySettings: "Company settings",
    newLeads: "New leads",
    contacted: "Contacted",
    successful: "Successful",
    unsuccessful: "Unsuccessful",
    checkEmailDelivery: "Check email delivery",
    checkEmailDeliveryCopy: "At least one notification could not be sent.",
    failedNotificationsLastDays: (count) => `${count} failed notifications in the last 7 days.`,
    openSettings: "Open settings",
    last30DaysTitle: "Last 30 days",
    last30DaysCopy: "Current outcomes and open leads in the selected period.",
    openAnalytics: "Open analytics",
    totalInquiries: "Total inquiries",
    stillOpen: "Still open",
    noClosedLeads: "No closed leads yet",
    successRate: (rate) => `Success rate: ${rate}%`,
    leadOverviewTitle: "Lead overview",
    leadOverviewCopy: "Open lead management to update status and outcomes.",
    toLeads: "Go to leads",
    openInquiriesTitle: "Open inquiries",
    openInquiriesCopy: "Oldest open inquiries are shown first.",
    showAllInquiries: "View all inquiries",
    noOpenInquiries: "There are currently no open inquiries.",
    unknownContact: "Unknown contact",
    notProvided: "Not provided",
  },
};

export const BILLING_COPY: Record<MarketCode, BillingCopy> = {
  de: {
    back: "Zurueck",
    statusHeading: "Status",
    statusAccessGranted: "Freigeschaltet",
    statusAccessBlocked: "Gesperrt",
    statusTrialUntil: "Testphase bis",
    statusCurrentPeriodUntil: "Aktueller Zeitraum bis",
    statusCancellationPlanned: "Kuendigung geplant",
    statusCancellationDate: "Kuendigungsdatum",
    yes: "Ja",
    no: "Nein",
    subscriptionHeading: "Abonnement",
    subscriptionText: "Neue Firmen erhalten einmalig 30 Tage Testphase.",
    legalAcceptance: "Ich bestaetige die AGB und die Datenschutzerklaerung fuer die Testphase und den Checkout.",
    startSubscription: "Abo starten",
    manageSubscription: "Abonnement verwalten",
    ownerOnly: "Nur der Eigentuemer kann Billing verwalten.",
    checkoutSuccess: "Stripe Checkout wurde erfolgreich abgeschlossen.",
    checkoutCanceled: "Der Checkout wurde abgebrochen.",
    statusText: {
      trial_expired: "Die Testphase ist abgelaufen. Bitte starten Sie jetzt Ihr Abonnement.",
      payment_required: "Ihr Zugriff ist pausiert, bis Stripe wieder eine erfolgreiche Zahlung bestaetigt.",
      checkout_incomplete: "Der letzte Checkout wurde nicht abgeschlossen. Bitte starten Sie ihn erneut.",
      subscription_paused: "Das Abonnement ist pausiert. Bitte pruefen Sie Ihr Stripe-Kundenportal.",
      subscription_canceled: "Das Abonnement ist beendet. Bitte starten Sie ein neues Abonnement, um Varnito weiter zu nutzen.",
      no_subscription: "Fuer diese Firma ist noch kein aktives Abonnement hinterlegt.",
      default: "Verwalten Sie hier Testphase und Abonnement Ihrer Firma.",
    },
  },
  us: {
    back: "Back",
    statusHeading: "Status",
    statusAccessGranted: "Active",
    statusAccessBlocked: "Blocked",
    statusTrialUntil: "Trial until",
    statusCurrentPeriodUntil: "Current period until",
    statusCancellationPlanned: "Cancellation scheduled",
    statusCancellationDate: "Cancellation date",
    yes: "Yes",
    no: "No",
    subscriptionHeading: "Subscription",
    subscriptionText: "New companies receive a one-time 30-day trial.",
    legalAcceptance: "I confirm the Terms and Privacy Notice for the trial and checkout flow.",
    startSubscription: "Start subscription",
    manageSubscription: "Manage subscription",
    ownerOnly: "Only the owner can manage billing.",
    checkoutSuccess: "Stripe checkout completed successfully.",
    checkoutCanceled: "Checkout was canceled.",
    statusText: {
      trial_expired: "Your trial has ended. Start your subscription to continue.",
      payment_required: "Access is paused until Stripe confirms a successful payment.",
      checkout_incomplete: "The last checkout was not completed. Please try again.",
      subscription_paused: "The subscription is paused. Please review your Stripe customer portal.",
      subscription_canceled: "The subscription has ended. Start a new subscription to continue using Varnito.",
      no_subscription: "No active subscription is currently stored for this company.",
      default: "Manage your trial and subscription settings here.",
    },
  },
};

export const TEAM_COPY: Record<MarketCode, TeamCopy> = {
  de: {
    backToLeads: "Zurueck zu den Leads",
    sectionLabel: "Mitarbeiter",
    title: "Zugaenge verwalten",
    description: "Mitarbeiter erhalten ausschliesslich einen einfachen Zugang zur Lead-Bearbeitung.",
    inviteTitle: "Mitarbeiter einladen",
    inviteDescription: "E-Mail-Adresse genuegt. Der Mitarbeiter legt Name und Passwort selbst fest.",
    emailLabel: "E-Mail-Adresse",
    emailPlaceholder: "mitarbeiter@unternehmen.de",
    sendInvite: "Einladung senden",
    accessTitle: "Zugaenge",
    ownerLabel: "Inhaber",
    pendingLabel: "Einladung offen",
    activeLabel: "Aktiv",
    resend: "Erneut senden",
    removeAccess: "Zugang entfernen",
    auditDescription: "Zeit, Benutzer und Aktion der wichtigsten Aenderungen.",
    auditEmptyTitle: "Noch keine Ereignisse",
    auditEmptyMessage: "Sobald Aenderungen erfolgen, erscheinen sie hier.",
  },
  us: {
    backToLeads: "Back to leads",
    sectionLabel: "Team",
    title: "Manage access",
    description: "Team members get streamlined access focused on lead handling.",
    inviteTitle: "Invite team members",
    inviteDescription: "An email address is enough. Each member sets name and password during signup.",
    emailLabel: "Email address",
    emailPlaceholder: "teammember@company.com",
    sendInvite: "Send invite",
    accessTitle: "Access",
    ownerLabel: "Owner",
    pendingLabel: "Invite pending",
    activeLabel: "Active",
    resend: "Resend",
    removeAccess: "Remove access",
    auditDescription: "Timestamp, user, and action for key account changes.",
    auditEmptyTitle: "No events yet",
    auditEmptyMessage: "Events will appear here as soon as updates are made.",
  },
};

export const NOTIFICATION_CENTER_COPY: Record<MarketCode, NotificationsCopy> = {
  de: {
    sectionLabel: "Benachrichtigungen",
    heading: "Notification Center",
    subheading: "Neue Anfrage, Team-Ereignisse und Billing-Hinweise an einem Ort.",
    markAllRead: "Alle als gelesen markieren",
    backToDashboard: "Zurueck zum Dashboard",
    empty: "Noch keine Benachrichtigungen vorhanden.",
    read: "Gelesen",
    unread: "Ungelesen",
    markRead: "Als gelesen markieren",
  },
  us: {
    sectionLabel: "Notifications",
    heading: "Notification Center",
    subheading: "New leads, team activity, and billing updates in one place.",
    markAllRead: "Mark all as read",
    backToDashboard: "Back to dashboard",
    empty: "No notifications yet.",
    read: "Read",
    unread: "Unread",
    markRead: "Mark as read",
  },
};

export const OPERATOR_COPY: Record<MarketCode, OperatorCopy> = {
  de: {
    sectionLabel: "Varnito Betreiberbereich",
    title: "Systemuebersicht",
    copy: "Zentrale Uebersicht ueber Kundenunternehmen, Leads, Abonnements und Benachrichtigungsprobleme.",
    toCustomerDashboard: "Kundendashboard",
    logout: "Abmelden",
    searchTitle: "Suche",
    searchCopy: "Nach Firma, E-Mail oder Abo-Status suchen.",
    searchPlaceholder: "Firma suchen",
    searchButton: "Suchen",
    metrics: {
      activeCompanies: "Aktive Unternehmen",
      totalUsers: "Benutzer insgesamt",
      leadsLast30d: "Leads letzte 30 Tage",
      errorsLast24h: "Fehler letzte 24 Stunden",
      dueQueue: "Faellige Queue-Eintraege",
      companiesNeedingAttention: "Unternehmen mit Warnung",
    },
  },
  us: {
    sectionLabel: "Varnito operator area",
    title: "System overview",
    copy: "Central view of customer companies, leads, subscriptions, and notification issues.",
    toCustomerDashboard: "Customer dashboard",
    logout: "Log out",
    searchTitle: "Search",
    searchCopy: "Search by company, email, or subscription status.",
    searchPlaceholder: "Search company",
    searchButton: "Search",
    metrics: {
      activeCompanies: "Active companies",
      totalUsers: "Total users",
      leadsLast30d: "Leads in last 30 days",
      errorsLast24h: "Errors in last 24h",
      dueQueue: "Due queue entries",
      companiesNeedingAttention: "Companies needing attention",
    },
  },
};
