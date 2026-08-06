import type { MarketCode } from "@/shared/i18n/market";

type LandingStep = {
  title: string;
  text: string;
};

type QAPair = {
  question: string;
  answer: string;
};

type LandingCopy = {
  metadataTitle: string;
  siteDescription: string;
  kicker: string;
  heroTitle: string;
  heroLead: string;
  primaryCta: string;
  secondaryCta: string;
  supporting: string;
  previewDashboardTitle: string;
  previewDashboardText: string;
  previewLeadsTitle: string;
  previewLeadsText: string;
  previewBillingTitle: string;
  previewBillingText: string;
  problemEyebrow: string;
  problemTitle: string;
  problemItems: string[];
  solutionEyebrow: string;
  solutionTitle: string;
  solutionSteps: LandingStep[];
  benefitsEyebrow: string;
  benefitsTitle: string;
  benefits: string[];
  functionsEyebrow: string;
  functionsTitle: string;
  functions: LandingStep[];
  viewsEyebrow: string;
  viewsTitle: string;
  views: LandingStep[];
  pricingEyebrow: string;
  pricingTitle: string;
  pricingLabel: string;
  pricingValue: string;
  pricingCopy: string;
  pricingMeta: string[];
  faqEyebrow: string;
  faqTitle: string;
  faq: QAPair[];
  ctaEyebrow: string;
  ctaTitle: string;
  ctaText: string;
  ctaBackToTop: string;
};

type SharedCopy = {
  legalNavLabel: string;
  legalLinks: {
    imprint: string;
    privacy: string;
    terms: string;
    withdrawal: string;
    contact: string;
  };
};

type MarketCopy = {
  siteDescription: string;
  shared: SharedCopy;
  landing: LandingCopy;
};

const COPY: Record<MarketCode, MarketCopy> = {
  de: {
    siteDescription:
      "Varnito sichert eingehende Anfragen, informiert den Betrieb und hält Bearbeitungen im Team klar nachvollziehbar.",
    shared: {
      legalNavLabel: "Rechtliches",
      legalLinks: {
        imprint: "Impressum",
        privacy: "Datenschutz",
        terms: "AGB",
        withdrawal: "Widerruf",
        contact: "Kontakt",
      },
    },
    landing: {
      metadataTitle: "Keine Kundenanfrage mehr verlieren",
      siteDescription:
        "Varnito sichert eingehende Anfragen, informiert den Betrieb und hält Bearbeitungen im Team klar nachvollziehbar.",
      kicker: "Varnito.de fuer Betriebe mit Website-Anfragen",
      heroTitle: "Keine Kundenanfrage mehr verlieren.",
      heroLead:
        "Varnito sichert eingehende Anfragen, informiert den Betrieb sofort und macht den Bearbeitungsstatus im Team klar nachvollziehbar.",
      primaryCta: "30 Tage kostenlos testen",
      secondaryCta: "So funktioniert Varnito",
      supporting: "Fuer Handwerksbetriebe und kleine Dienstleistungsunternehmen mit etwa 1 bis 20 Mitarbeitern.",
      previewDashboardTitle: "Neue Anfrage",
      previewDashboardText: "Eine zentrale Ansicht fuer offene Leads, Status und letzte 30 Tage.",
      previewLeadsTitle: "Bearbeitung im Team",
      previewLeadsText: "Status und Ergebnis bleiben fuer alle Beteiligten nachvollziehbar.",
      previewBillingTitle: "30 Tage Testphase",
      previewBillingText: "Transparent, ohne versteckte Gebuehren oder unnoetige Produktversprechen.",
      problemEyebrow: "Problem",
      problemTitle: "Anfragen gehen im Alltag unter.",
      problemItems: [
        "E-Mails und Formulare werden unuebersichtlich",
        "Langsame Antworten kosten Zeit",
        "Im Team fehlt eine gemeinsame Sicht",
      ],
      solutionEyebrow: "Loesung",
      solutionTitle: "So funktioniert Varnito.",
      solutionSteps: [
        { title: "Anfrage geht ein", text: "Die Anfrage kommt aus Ihrer Website oder dem Kontaktformular ins System." },
        { title: "Betrieb wird informiert", text: "Neue Anfragen werden intern weitergegeben, damit niemand lange suchen muss." },
        { title: "Bearbeitung bleibt nachvollziehbar", text: "Im Dashboard sehen Sie Status, Teamzugriffe und die letzten Ergebnisse auf einen Blick." },
      ],
      benefitsEyebrow: "Vorteile",
      benefitsTitle: "Nur echte Kundenvorteile.",
      benefits: [
        "Keine Anfrage uebersehen",
        "Schneller reagieren",
        "Klare Teamuebersicht",
        "Weniger Verwaltungsaufwand",
        "Ergebnisse der letzten 30 Tage sehen",
        "Keine komplizierte CRM-Einfuehrung",
      ],
      functionsEyebrow: "Funktionen",
      functionsTitle: "Nur das, was heute schon existiert.",
      functions: [
        { title: "Anfragen sichern", text: "Website-Anfragen landen geordnet im Dashboard und werden nicht nur in einzelnen Postfaechern gesucht." },
        { title: "Sofort informieren", text: "Neue Anfragen werden intern weitergegeben, damit der Betrieb schneller reagieren kann." },
        { title: "Status nachvollziehen", text: "Der Bearbeitungsstand bleibt sichtbar, damit das Team weiss, was schon erledigt ist." },
        { title: "Ergebnisse auswerten", text: "Die letzten 30 Tage sind im Dashboard schnell sichtbar, ohne auf schwere Berichte umzusteigen." },
      ],
      viewsEyebrow: "Produktansichten",
      viewsTitle: "Echte Produktbereiche statt erfundener Referenzen.",
      views: [
        { title: "Vertrieb und Einstieg", text: "Diese Seite zeigt, wie Varnito ohne CRM-Sprache die Anfragebearbeitung vereinfacht." },
        { title: "Leads und Status", text: "Im internen Bereich werden offene Anfragen und Auswertungen sichtbar." },
        { title: "Testphase und Abo", text: "Der Billing-Bereich regelt den Zugang transparent und ohne versteckte Zusatzoptionen." },
      ],
      pricingEyebrow: "Preis",
      pricingTitle: "Varnito Pro Monatsabo.",
      pricingLabel: "Varnito Pro",
      pricingValue: "Preis wird im Checkout geladen",
      pricingCopy: "Neue Firmen starten mit 30 Tagen kostenloser Testphase. Die erste Zahlung erfolgt erst, wenn die Testphase endet und Sie das Abo aktiv weiternutzen.",
      pricingMeta: [
        "Keine versteckten Gebuehren",
        "Abrechnung transparent im Billing-Bereich",
        "Umsatzsteuer wird entsprechend der tatsaechlichen Preislogik ausgewiesen",
      ],
      faqEyebrow: "FAQ",
      faqTitle: "Haeufige Fragen.",
      faq: [
        { question: "Was ist Varnito?", answer: "Varnito ist eine schlanke Software fuer Betriebe mit Website-Anfragen. Sie hilft dabei, Anfragen zu sichern, zuzuordnen und im Team zu bearbeiten." },
        { question: "Ist Varnito ein CRM?", answer: "Nein. Varnito bleibt bewusst einfach und ersetzt kein klassisches CRM-System." },
        { question: "Wie funktioniert die 30-Tage-Testphase?", answer: "Sie legen ein Konto an, starten die Testphase und koennen Varnito 30 Tage ohne Anfangszahlung pruefen. Die erste Zahlung erfolgt erst nach dem Testende, wenn Sie aktiv weiternutzen." },
        { question: "Muss ich meine Website ersetzen?", answer: "Nein. Varnito wird neben Ihrer bestehenden Website eingesetzt und ergaenzt den bestehenden Anfrageprozess." },
        { question: "Koennen Mitarbeiter mitarbeiten?", answer: "Ja. Mitarbeiter koennen eingeladen werden und im Team mitarbeiten." },
        { question: "Kann ich jederzeit kuendigen?", answer: "Ja. Sie kuendigen im Billing-Bereich oder im Stripe-Kundenportal. Die Nutzung bleibt bis zum Ende der laufenden Periode verfuegbar." },
        { question: "Was passiert nach einer Kuendigung?", answer: "Ihr Zugriff endet nach der gebuchten Periode. Ihre Daten bleiben nicht durch Marketing geloescht, sondern folgen den geltenden Aufbewahrungs- und Loeschregeln." },
        { question: "Wie werden meine Daten geschuetzt?", answer: "Varnito nutzt Mandantentrennung, Supabase, Stripe und technisch notwendige Authentifizierung. Es werden keine unnoetigen Tracking-Dienste eingesetzt." },
      ],
      ctaEyebrow: "Jetzt starten",
      ctaTitle: "30 Tage kostenlos testen.",
      ctaText: "Ohne kuenstliche Verknappung, ohne Countdown und ohne unnoetige Versprechen.",
      ctaBackToTop: "Nach oben",
    },
  },
  us: {
    siteDescription:
      "Varnito captures incoming leads, alerts your team instantly, and keeps every follow-up step clear.",
    shared: {
      legalNavLabel: "Legal",
      legalLinks: {
        imprint: "Imprint",
        privacy: "Privacy",
        terms: "Terms",
        withdrawal: "Cancellation",
        contact: "Contact",
      },
    },
    landing: {
      metadataTitle: "Never Lose Another Lead",
      siteDescription:
        "Varnito captures incoming leads, alerts your team instantly, and keeps every follow-up step clear.",
      kicker: "Varnito for home service businesses",
      heroTitle: "Never lose another lead.",
      heroLead:
        "Varnito captures every website inquiry, alerts your office right away, and keeps lead progress visible for the whole team.",
      primaryCta: "Start your 30-day free trial",
      secondaryCta: "How Varnito works",
      supporting: "Built for home service teams with around 1 to 20 employees.",
      previewDashboardTitle: "New lead",
      previewDashboardText: "One clear view for open leads, status updates, and your last 30 days.",
      previewLeadsTitle: "Team follow-up",
      previewLeadsText: "Everyone sees what is done, what is pending, and who owns each lead.",
      previewBillingTitle: "30-day trial",
      previewBillingText: "Straightforward billing with no hidden fees and no inflated feature promises.",
      problemEyebrow: "Problem",
      problemTitle: "Leads slip through the cracks during busy days.",
      problemItems: [
        "Email and form submissions get scattered",
        "Slow responses cost real opportunities",
        "Teams lack one shared lead view",
      ],
      solutionEyebrow: "Solution",
      solutionTitle: "How Varnito works.",
      solutionSteps: [
        { title: "A lead comes in", text: "Website and contact form inquiries flow into one organized workspace." },
        { title: "Your team gets alerted", text: "New leads are routed internally so nobody has to dig through inboxes." },
        { title: "Progress stays visible", text: "Your dashboard shows lead status, team ownership, and outcomes at a glance." },
      ],
      benefitsEyebrow: "Benefits",
      benefitsTitle: "Practical wins for daily operations.",
      benefits: [
        "Miss fewer opportunities",
        "Respond faster",
        "Keep your team aligned",
        "Reduce admin overhead",
        "Track the last 30 days quickly",
        "Skip heavy CRM rollouts",
      ],
      functionsEyebrow: "Capabilities",
      functionsTitle: "Only what already exists in the product.",
      functions: [
        { title: "Capture leads", text: "Website inquiries land in the dashboard instead of getting buried in individual inboxes." },
        { title: "Alert instantly", text: "Your team gets notified right away so follow-up starts sooner." },
        { title: "Track status", text: "Lead progress remains visible so everyone knows what is already handled." },
        { title: "Review outcomes", text: "See your last 30 days in seconds without switching to heavy reporting stacks." },
      ],
      viewsEyebrow: "Product areas",
      viewsTitle: "Real screens, not made-up references.",
      views: [
        { title: "Marketing and onboarding", text: "The landing page explains Varnito in plain language for service operators." },
        { title: "Leads and status", text: "The internal area shows open inquiries, assignments, and results." },
        { title: "Trial and billing", text: "Billing stays transparent with a clear trial and subscription workflow." },
      ],
      pricingEyebrow: "Pricing",
      pricingTitle: "Varnito Pro monthly subscription.",
      pricingLabel: "Varnito Pro",
      pricingValue: "Price is loaded at checkout",
      pricingCopy: "New companies start with a 30-day free trial. First payment begins only after trial end if you continue using Varnito.",
      pricingMeta: [
        "No hidden fees",
        "Billing remains transparent",
        "Taxes are handled according to your actual pricing setup",
      ],
      faqEyebrow: "FAQ",
      faqTitle: "Common questions.",
      faq: [
        { question: "What is Varnito?", answer: "Varnito is a lightweight lead workflow system for service businesses that get inquiries through their website." },
        { question: "Is Varnito a CRM?", answer: "No. Varnito stays intentionally focused and does not try to replace a full CRM." },
        { question: "How does the 30-day trial work?", answer: "Create your account, start the trial, and evaluate the platform for 30 days before any subscription payment begins." },
        { question: "Do I need to replace my website?", answer: "No. Varnito works alongside your current website and lead forms." },
        { question: "Can team members collaborate?", answer: "Yes. You can invite staff and manage follow-up as a team." },
        { question: "Can I cancel anytime?", answer: "Yes. You can cancel from billing or in the Stripe customer portal." },
        { question: "What happens after cancellation?", answer: "Access remains available through the paid period, then ends based on subscription state." },
        { question: "How is data protected?", answer: "Varnito uses tenant isolation, Supabase, Stripe, and required authentication flows." },
      ],
      ctaEyebrow: "Get started",
      ctaTitle: "Start your 30-day free trial.",
      ctaText: "No countdown timers. No gimmicks. Just a clear product workflow.",
      ctaBackToTop: "Back to top",
    },
  },
};

export const getMarketCopy = (market: MarketCode) => COPY[market];
