import type { DemoLeadStatus, DemoMarket } from "@/features/demo/types";

export type DemoTourStep = {
  route: string;
  title: string;
  text: string;
};

type DemoCopy = {
  nav: {
    dashboard: string;
    leads: string;
    team: string;
    billing: string;
    settings: string;
  };
  demoCompanyLabel: string;
  banner: string;
  startFreeButton: string;
  ctaTitle: string;
  ctaButton: string;
  dashboard: {
    description: string;
    toLeads: string;
    toSettings: string;
    newLeads: string;
    contacted: string;
    successful: string;
    openInquiries: string;
    allLeads: string;
  };
  leadStatusLabels: Record<DemoLeadStatus, string>;
  leads: {
    description: string;
    details: string;
    status: string;
    assignee: string;
    unassigned: string;
  };
  leadDetail: {
    notFound: string;
    backToLeads: string;
    contactData: string;
    phone: string;
    email: string;
    inquiry: string;
    editLead: string;
    notes: string;
  };
  team: {
    description: string;
    inviteTitle: string;
    inviteButton: string;
    resend: string;
    remove: string;
    roleOwner: string;
    roleMember: string;
    statusActive: string;
    statusPending: string;
  };
  billing: {
    description: string;
    subscriptionStatus: string;
    product: string;
    status: string;
    active: string;
    trial: string;
    nextInvoice: string;
    pauseDemo: string;
    startDemo: string;
    portalDemo: string;
  };
  settings: {
    title: string;
    description: string;
    company: string;
    contactPerson: string;
    companyEmail: string;
    notificationEmail: string;
    phone: string;
    website: string;
    timezone: string;
    businessHours: string;
    saveSimulation: string;
    inquiryTypes: string;
    newInquiryType: string;
    add: string;
    active: string;
    inactive: string;
  };
  tour: {
    ariaLabel: string;
    stepLabel: (current: number, total: number) => string;
    skip: string;
    next: string;
    finish: string;
    doneAria: string;
    steps: DemoTourStep[];
  };
  guide: {
    name: string;
    open: string;
    close: string;
    welcome: string;
    placeholder: string;
    send: string;
    suggestions: string[];
    safety: string;
  };
};

export const DEMO_COPY: Record<DemoMarket, DemoCopy> = {
  de: {
    nav: {
      dashboard: "Dashboard",
      leads: "Leads",
      team: "Team",
      billing: "Billing",
      settings: "Einstellungen",
    },
    demoCompanyLabel: "Demo-Unternehmen",
    banner: "Demo-Modus - Aenderungen werden nicht gespeichert.",
    startFreeButton: "Jetzt kostenlos starten",
    ctaTitle: "30 Tage kostenlos testen",
    ctaButton: "Jetzt kostenlos starten",
    dashboard: {
      description: "Erleben Sie den Produkt-Flow mit realistischen Beispieldaten.",
      toLeads: "Leads",
      toSettings: "Einstellungen",
      newLeads: "Neue Anfragen",
      contacted: "Kontaktiert",
      successful: "Erfolgreich",
      openInquiries: "Offene Anfragen",
      allLeads: "Alle Leads",
    },
    leadStatusLabels: {
      new: "Neu",
      contacted: "Kontaktiert",
      successful: "Erfolgreich",
      unsuccessful: "Nicht erfolgreich",
    },
    leads: {
      description: "Aktualisieren Sie Status, Zustaendigkeit und Pipeline direkt.",
      details: "Details",
      status: "Status",
      assignee: "Zustaendig",
      unassigned: "Nicht zugewiesen",
    },
    leadDetail: {
      notFound: "Lead nicht gefunden",
      backToLeads: "Zurueck zu Leads",
      contactData: "Kontaktdaten",
      phone: "Telefon",
      email: "E-Mail",
      inquiry: "Anfrage",
      editLead: "Lead bearbeiten",
      notes: "Notizen",
    },
    team: {
      description: "Simulieren Sie Team-Onboarding und Zugriffsverwaltung.",
      inviteTitle: "Mitarbeiter einladen",
      inviteButton: "Einladen",
      resend: "Einladung erneut senden",
      remove: "Entfernen",
      roleOwner: "Inhaber",
      roleMember: "Mitarbeiter",
      statusActive: "Aktiv",
      statusPending: "Ausstehend",
    },
    billing: {
      description: "Checkout- und Portal-Aktionen werden nur lokal simuliert.",
      subscriptionStatus: "Abo-Status",
      product: "Produkt",
      status: "Status",
      active: "Aktiv",
      trial: "Testphase",
      nextInvoice: "Naechste Abrechnung",
      pauseDemo: "Abo pausieren (Demo)",
      startDemo: "Abo starten (Demo)",
      portalDemo: "Stripe-Portal simulieren",
    },
    settings: {
      title: "Einstellungen",
      description: "Firmendaten, Benachrichtigungen und Anfragearten werden live simuliert.",
      company: "Firma",
      contactPerson: "Ansprechpartner",
      companyEmail: "E-Mail",
      notificationEmail: "Benachrichtigungs-E-Mail",
      phone: "Telefon",
      website: "Website",
      timezone: "Zeitzone",
      businessHours: "Business Hours",
      saveSimulation: "Aenderungen simulieren",
      inquiryTypes: "Anfragearten",
      newInquiryType: "Neue Anfrageart",
      add: "Hinzufuegen",
      active: "Aktiv",
      inactive: "Inaktiv",
    },
    tour: {
      ariaLabel: "Produkt-Tour",
      stepLabel: (current, total) => `Schritt ${current} von ${total}`,
      skip: "Ueberspringen",
      next: "Weiter",
      finish: "Tour abschliessen",
      doneAria: "Demo Abschluss",
      steps: [
        { route: "/demo/dashboard", title: "Dashboard", text: "Hier sehen Sie Kennzahlen und offene Aufgaben. Das ist Ihre taegliche Uebersicht." },
        { route: "/demo/leads", title: "Leads", text: "Alle Anfragen stehen in einer Liste. Status und Zustaendigkeit sind direkt anpassbar." },
        { route: "/demo/leads/lead-de-1", title: "Lead-Details", text: "In der Detailansicht pruefen Sie alle Kontaktdaten. Notizen und Status bleiben in einem Flow." },
        { route: "/demo/team", title: "Team", text: "Laden Sie Mitarbeitende mit einer E-Mail ein. Offene und aktive Zugaenge verwalten Sie hier." },
        { route: "/demo/billing", title: "Billing", text: "Abo-Status und naechste Verlaengerung sind sofort sichtbar. Aktionen werden nur simuliert." },
        { route: "/demo/settings", title: "Einstellungen", text: "Pflegen Sie Firmendaten und Anfragearten. Alles bleibt nur im Browser gespeichert." },
      ],
    },
    guide: {
      name: "Varnito Guide",
      open: "Guide oeffnen",
      close: "Guide schliessen",
      welcome: "Ich helfe Ihnen bei Fragen zur Demo und zu Varnito-Funktionen.",
      placeholder: "Frage zu Varnito stellen...",
      send: "Senden",
      suggestions: [
        "Wie funktioniert die Lead-Verwaltung?",
        "Wie lade ich Mitarbeiter ein?",
        "Was zeigt das Dashboard?",
        "Wie funktioniert die Testphase?",
        "Was passiert bei einer Kuendigung?",
        "Wie werden Anfragen beantwortet?",
        "Zeig mir das Team.",
        "Zeig mir Billing.",
      ],
      safety: "Ich helfe Ihnen ausschliesslich dabei, Varnito kennenzulernen.",
    },
  },
  us: {
    nav: {
      dashboard: "Dashboard",
      leads: "Leads",
      team: "Team",
      billing: "Billing",
      settings: "Settings",
    },
    demoCompanyLabel: "Demo company",
    banner: "Demo mode - changes are not saved.",
    startFreeButton: "Start your 30-day free trial",
    ctaTitle: "Start your 30-day free trial",
    ctaButton: "Start your 30-day free trial",
    dashboard: {
      description: "Explore the product flow with realistic sample data.",
      toLeads: "Leads",
      toSettings: "Settings",
      newLeads: "New leads",
      contacted: "Contacted",
      successful: "Successful",
      openInquiries: "Open inquiries",
      allLeads: "All leads",
    },
    leadStatusLabels: {
      new: "New",
      contacted: "Contacted",
      successful: "Successful",
      unsuccessful: "Unsuccessful",
    },
    leads: {
      description: "Update status, ownership, and pipeline flow instantly.",
      details: "Details",
      status: "Status",
      assignee: "Assignee",
      unassigned: "Unassigned",
    },
    leadDetail: {
      notFound: "Lead not found",
      backToLeads: "Back to leads",
      contactData: "Contact details",
      phone: "Phone",
      email: "Email",
      inquiry: "Inquiry",
      editLead: "Update lead",
      notes: "Notes",
    },
    team: {
      description: "Simulate team onboarding and access updates.",
      inviteTitle: "Invite team members",
      inviteButton: "Invite",
      resend: "Resend invite",
      remove: "Remove",
      roleOwner: "Owner",
      roleMember: "Member",
      statusActive: "Active",
      statusPending: "Pending",
    },
    billing: {
      description: "Checkout and portal actions are simulated locally only.",
      subscriptionStatus: "Subscription status",
      product: "Product",
      status: "Status",
      active: "Active",
      trial: "Trial",
      nextInvoice: "Next invoice",
      pauseDemo: "Pause subscription (Demo)",
      startDemo: "Start subscription (Demo)",
      portalDemo: "Simulate Stripe portal",
    },
    settings: {
      title: "Settings",
      description: "Company profile, notifications, and inquiry types update in local demo state.",
      company: "Company",
      contactPerson: "Contact person",
      companyEmail: "Email",
      notificationEmail: "Notification email",
      phone: "Phone",
      website: "Website",
      timezone: "Time zone",
      businessHours: "Business hours",
      saveSimulation: "Simulate changes",
      inquiryTypes: "Inquiry types",
      newInquiryType: "New inquiry type",
      add: "Add",
      active: "Active",
      inactive: "Inactive",
    },
    tour: {
      ariaLabel: "Product tour",
      stepLabel: (current, total) => `Step ${current} of ${total}`,
      skip: "Skip",
      next: "Next",
      finish: "Finish tour",
      doneAria: "Demo completion",
      steps: [
        { route: "/demo/dashboard", title: "Dashboard", text: "See live KPIs and open workload. This is your daily control center." },
        { route: "/demo/leads", title: "Leads", text: "Review every inquiry in one list. Update status and owner instantly." },
        { route: "/demo/leads/lead-us-1", title: "Lead details", text: "Open one lead to inspect context. Keep notes and ownership in sync." },
        { route: "/demo/team", title: "Team", text: "Invite teammates in seconds. Manage active and pending access." },
        { route: "/demo/billing", title: "Billing", text: "Track plan and renewal at a glance. Simulate actions without Stripe." },
        { route: "/demo/settings", title: "Settings", text: "Adapt company profile and inquiry types. Changes stay local in this demo." },
      ],
    },
    guide: {
      name: "Varnito Guide",
      open: "Open guide",
      close: "Close guide",
      welcome: "I can help you understand the demo and core Varnito workflows.",
      placeholder: "Ask about Varnito...",
      send: "Send",
      suggestions: [
        "How does lead management work?",
        "How do I invite team members?",
        "What does the dashboard show?",
        "How does the free trial work?",
        "What happens after cancellation?",
        "How are inquiries handled?",
        "Show me the team.",
        "Show me billing.",
      ],
      safety: "I can only help you explore Varnito.",
    },
  },
};

export const getDemoCopy = (market: DemoMarket) => DEMO_COPY[market];
