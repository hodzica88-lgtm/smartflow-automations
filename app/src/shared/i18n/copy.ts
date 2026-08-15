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
  pricingTaxNote: string;
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
  auth: {
    registrationEyebrow: string;
    registrationTitle: string;
    registrationLead: string;
    registrationPrice: string;
    registrationTaxNote: string;
    registrationLoginCta: string;
    registrationHomeCta: string;
    loginEyebrow: string;
    loginTitle: string;
    loginLead: string;
    loginSubmit: string;
    loginForgotPassword: string;
    forgotEyebrow: string;
    forgotTitle: string;
    forgotLead: string;
    forgotSubmit: string;
    forgotBackToLogin: string;
    forgotSent: string;
    onboardingEyebrow: string;
    onboardingTitle: string;
    onboardingLead: string;
    onboardingSubmit: string;
    onboardingTimeZones: Array<{ value: string; label: string }>;
    onboardingFields: {
      companyName: string;
      contactPerson: string;
      email: string;
      phone: string;
      website: string;
      timezone: string;
      industry: string;
      averageOrderValue: string;
      averageOrderValueHint: string;
      businessHours: string;
      industryPlaceholder: string;
      selectPlaceholder: string;
    };
    errors: {
      missingRequired: string;
      missingAverageOrderValue: string;
      invalidAverageOrderValue: string;
      invalidEmail: string;
      invalidTimezone: string;
      invalidIndustry: string;
      invalidWebsite: string;
      profilePreparationFailed: string;
      onboardingFailed: string;
      loginMissingCredentials: string;
      loginRateLimited: string;
      loginInvalidCredentials: string;
      loginProfilePreparationFailed: string;
      inactiveMember: string;
      forgotMissingEmail: string;
      forgotRateLimited: string;
    };
  };
  team: {
    duplicateAccess: string;
    inviteFailed: string;
    inviteSent: string;
    inviteRateLimited: string;
    resendFailed: string;
    resendRateLimited: string;
    removeFailed: string;
    removeRateLimited: string;
    invalidMember: string;
    noInvitation: string;
    invalidEmail: string;
    invalidFullName: string;
    invalidPassword: string;
    passwordMismatch: string;
    invalidInvitation: string;
    accessRemoved: string;
    invitationResent: string;
    activationFailed: string;
  };
  settings: {
    requiredFields: string;
    invalidEmail: string;
    invalidNotificationEmail: string;
    invalidTimezone: string;
    invalidIndustry: string;
    settingsSaveFailed: string;
    settingsSaved: string;
    inquiryTypeExists: string;
    inquiryTypeAdded: string;
    inquiryTypeNotAdded: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    lead: string;
    emailLabel: string;
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
      auth: {
        registrationEyebrow: "Varnito",
        registrationTitle: "Registrierung starten",
        registrationLead: "Für den Testzugang melden Sie sich an und legen im Anschluss Ihre Firma an. Danach kann die 30-Tage-Testphase gestartet werden.",
        registrationPrice: "299 € / Monat",
        registrationTaxNote: "zzgl. gesetzlicher Umsatzsteuer",
        registrationLoginCta: "Zum Login",
        registrationHomeCta: "Zur Startseite",
        loginEyebrow: "Varnito",
        loginTitle: "Anmelden",
        loginLead: "Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an.",
        loginSubmit: "Anmelden",
        loginForgotPassword: "Passwort vergessen?",
        forgotEyebrow: "Varnito",
        forgotTitle: "Passwort zurücksetzen",
        forgotLead: "Geben Sie Ihre E-Mail-Adresse ein. Falls ein Konto existiert, senden wir Ihnen Anweisungen zum Zurücksetzen des Passworts.",
        forgotSubmit: "E-Mail zum Zurücksetzen senden",
        forgotBackToLogin: "Zurück zur Anmeldung",
        forgotSent: "Prüfen Sie Ihr E-Mail-Postfach auf Anweisungen zum Zurücksetzen des Passworts.",
        onboardingEyebrow: "Varnito Einrichtung",
        onboardingTitle: "Unternehmen anlegen",
        onboardingLead: "Geben Sie die wichtigsten Daten ein, damit Varnito Ihren Arbeitsbereich vorbereiten kann.",
        onboardingSubmit: "Einrichtung abschließen",
        onboardingTimeZones: [
          { value: "Europe/Berlin", label: "Europe/Berlin — Deutschland" },
          { value: "Europe/Vienna", label: "Europe/Vienna — Österreich" },
          { value: "Europe/Zurich", label: "Europe/Zurich — Schweiz" },
        ],
        onboardingFields: {
          companyName: "Firmenname",
          contactPerson: "Ansprechpartner",
          email: "E-Mail",
          phone: "Telefon",
          website: "Website",
          timezone: "Zeitzone",
          industry: "Branche",
          averageOrderValue: "Ungefährer durchschnittlicher Auftragswert in Euro",
          averageOrderValueHint: "Eine grobe Schätzung reicht. Varnito nutzt sie später automatisch, um den ungefähren Wert gewonnener Aufträge zu zeigen.",
          businessHours: "Geschäftszeiten",
          industryPlaceholder: "Bitte wählen",
          selectPlaceholder: "Bitte wählen",
        },
        errors: {
          missingRequired: "Bitte füllen Sie alle Pflichtfelder aus.",
          missingAverageOrderValue: "Bitte geben Sie einen ungefähren durchschnittlichen Auftragswert an.",
          invalidAverageOrderValue: "Bitte geben Sie einen gültigen durchschnittlichen Auftragswert ein.",
          invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
          invalidTimezone: "Bitte wählen Sie eine gültige Zeitzone.",
          invalidIndustry: "Bitte wählen Sie eine gültige Branche.",
          invalidWebsite: "Die Website muss mit http:// oder https:// beginnen.",
          profilePreparationFailed: "Ihr Profil konnte nicht vorbereitet werden.",
          onboardingFailed: "Die Einrichtung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
          loginMissingCredentials: "Bitte geben Sie E-Mail-Adresse und Passwort ein.",
          loginRateLimited: "Zu viele Login-Versuche. Bitte versuchen Sie es später erneut.",
          loginInvalidCredentials: "Ungültige E-Mail-Adresse oder ungültiges Passwort.",
          loginProfilePreparationFailed: "Ihr Profil konnte nicht vorbereitet werden.",
          inactiveMember: "Dieser Mitarbeiterzugang ist nicht mehr aktiv.",
          forgotMissingEmail: "Bitte geben Sie Ihre E-Mail-Adresse ein.",
          forgotRateLimited: "Zu viele Anfragen zum Zurücksetzen des Passworts. Bitte versuchen Sie es später erneut.",
        },
      },
      team: {
        duplicateAccess: "Diese E-Mail-Adresse besitzt bereits einen Varnito-Zugang.",
        inviteFailed: "Die Einladung konnte nicht versendet werden.",
        inviteSent: "Einladung wurde versendet.",
        inviteRateLimited: "Zu viele Einladungsversuche. Bitte später erneut versuchen.",
        resendFailed: "Die alte Einladung konnte nicht ersetzt werden.",
        resendRateLimited: "Zu viele Versuche. Bitte später erneut versuchen.",
        removeFailed: "Mitarbeiterzugang konnte nicht entfernt werden.",
        removeRateLimited: "Zu viele Entfernungsversuche. Bitte später erneut versuchen.",
        invalidMember: "Dieser Zugang kann nicht entfernt werden.",
        noInvitation: "Offene Einladung wurde nicht gefunden.",
        invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        invalidFullName: "Bitte geben Sie Ihren Namen ein.",
        invalidPassword: "Das Passwort muss mindestens 8 Zeichen haben.",
        passwordMismatch: "Die Passwörter stimmen nicht überein.",
        invalidInvitation: "Der Einladungslink ist ungültig oder abgelaufen.",
        accessRemoved: "Mitarbeiterzugang wurde entfernt.",
        invitationResent: "Einladung wurde erneut versendet.",
        activationFailed: "Der Mitarbeiterzugang konnte nicht aktiviert werden.",
      },
      settings: {
        requiredFields: "Bitte füllen Sie alle erforderlichen Felder aus.",
        invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        invalidNotificationEmail: "Bitte geben Sie eine gültige Benachrichtigungs-E-Mail-Adresse ein.",
        invalidTimezone: "Bitte wählen Sie eine gültige Zeitzone.",
        invalidIndustry: "Bitte wählen Sie eine gültige Branche.",
        settingsSaveFailed: "Die Einstellungen konnten nicht gespeichert werden.",
        settingsSaved: "Einstellungen wurden gespeichert.",
        inquiryTypeExists: "Diese Anfrageart existiert bereits.",
        inquiryTypeAdded: "Anfrageart hinzugefügt.",
        inquiryTypeNotAdded: "Anfrageart konnte nicht hinzugefügt werden.",
      },
      contact: {
        eyebrow: "Kontakt",
        title: "Kontakt aufnehmen",
        lead: "Für Rückfragen zu Varnito nutzen Sie bitte die zentrale Kontakt-E-Mail. Wir antworten auf Produkt-, Datenschutz- und Vertragsanfragen über diesen Kanal.",
        emailLabel: "E-Mail",
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
      pricingValue: "299 € / Monat",
      pricingTaxNote: "zzgl. gesetzlicher Umsatzsteuer",
      pricingCopy: "Neue Firmen starten mit 30 Tagen kostenloser Testphase. Die erste Zahlung erfolgt erst, wenn die Testphase endet und Sie das Abo aktiv weiternutzen.",
      pricingMeta: [
        "Keine versteckten Gebuehren",
        "Abrechnung transparent im Billing-Bereich",
        "Umsatzsteuer wird im Checkout und auf der Rechnung separat ausgewiesen",
      ],
      faqEyebrow: "FAQ",
      faqTitle: "Haeufige Fragen.",
      faq: [
        { question: "Was ist Varnito?", answer: "Varnito ist eine schlanke Software fuer Betriebe mit Website-Anfragen. Sie hilft dabei, Anfragen zu sichern, zuzuordnen und im Team zu bearbeiten." },
        { question: "Ist Varnito ein CRM?", answer: "Nein. Varnito bleibt bewusst einfach und ersetzt kein klassisches CRM-System." },
        { question: "Wie funktioniert die 30-Tage-Testphase?", answer: "Sie legen ein Konto an, starten die Testphase und koennen Varnito 30 Tage ohne Anfangszahlung pruefen. Die erste Zahlung erfolgt erst nach dem Testende, wenn Sie aktiv weiternutzen." },
        { question: "Sind die Preise netto oder brutto?", answer: "Alle Preise verstehen sich zzgl. der gesetzlichen Umsatzsteuer. Die Umsatzsteuer wird im Checkout sowie auf der Rechnung separat ausgewiesen." },
        { question: "Muss ich meine Website ersetzen?", answer: "Nein. Varnito wird neben Ihrer bestehenden Website eingesetzt und ergaenzt den bestehenden Anfrageprozess." },
        { question: "Koennen Mitarbeiter mitarbeiten?", answer: "Ja. Mitarbeiter koennen eingeladen werden und im Team mitarbeiten." },
        { question: "Kann ich jederzeit kuendigen?", answer: "Ja. Sie kuendigen im Billing-Bereich oder im Kundenportal. Die Nutzung bleibt bis zum Ende der laufenden Periode verfuegbar." },
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
      auth: {
        registrationEyebrow: "Varnito",
        registrationTitle: "Start registration",
        registrationLead: "Sign in to create your company and start the 30-day free trial.",
        registrationPrice: "$399 / month",
        registrationTaxNote: "Taxes calculated at checkout where applicable.",
        registrationLoginCta: "Go to login",
        registrationHomeCta: "Back to home",
        loginEyebrow: "Varnito",
        loginTitle: "Sign in",
        loginLead: "Use your email address and password to continue.",
        loginSubmit: "Sign in",
        loginForgotPassword: "Forgot your password?",
        forgotEyebrow: "Varnito",
        forgotTitle: "Reset password",
        forgotLead: "Enter your email address and we will send reset instructions if an account exists.",
        forgotSubmit: "Send reset email",
        forgotBackToLogin: "Back to login",
        forgotSent: "Check your inbox for password reset instructions.",
        onboardingEyebrow: "Varnito setup",
        onboardingTitle: "Create your company",
        onboardingLead: "Enter the details Varnito needs to set up your workspace.",
        onboardingSubmit: "Finish setup",
        onboardingTimeZones: [
          { value: "Europe/Berlin", label: "Europe/Berlin — Germany" },
          { value: "Europe/Vienna", label: "Europe/Vienna — Austria" },
          { value: "Europe/Zurich", label: "Europe/Zurich — Switzerland" },
        ],
        onboardingFields: {
          companyName: "Company name",
          contactPerson: "Contact person",
          email: "Email",
          phone: "Phone",
          website: "Website",
          timezone: "Time zone",
          industry: "Industry",
          averageOrderValue: "Approximate average order value in USD",
          averageOrderValueHint: "A rough estimate is enough. Varnito will use it later to show approximate won order value.",
          businessHours: "Business hours",
          industryPlaceholder: "Please select",
          selectPlaceholder: "Please select",
        },
        errors: {
          missingRequired: "Please complete all required fields.",
          missingAverageOrderValue: "Please enter an approximate average order value.",
          invalidAverageOrderValue: "Please enter a valid average order value.",
          invalidEmail: "Please enter a valid email address.",
          invalidTimezone: "Please choose a valid time zone.",
          invalidIndustry: "Please choose a valid industry.",
          invalidWebsite: "The website must start with http:// or https://.",
          profilePreparationFailed: "Your profile could not be prepared.",
          onboardingFailed: "The setup could not be completed. Please try again.",
          loginMissingCredentials: "Please enter your email address and password.",
          loginRateLimited: "Too many sign-in attempts. Please try again later.",
          loginInvalidCredentials: "Invalid email address or password.",
          loginProfilePreparationFailed: "Your profile could not be prepared.",
          inactiveMember: "This team access is no longer active.",
          forgotMissingEmail: "Please enter your email address.",
          forgotRateLimited: "Too many password reset requests. Please try again later.",
        },
      },
      team: {
        duplicateAccess: "This email already has a Varnito account.",
        inviteFailed: "The invitation could not be sent.",
        inviteSent: "Invitation sent.",
        inviteRateLimited: "Too many invitation attempts. Please try again later.",
        resendFailed: "The previous invitation could not be replaced.",
        resendRateLimited: "Too many attempts. Please try again later.",
        removeFailed: "Team access could not be removed.",
        removeRateLimited: "Too many removal attempts. Please try again later.",
        invalidMember: "This access cannot be removed.",
        noInvitation: "No pending invitation was found.",
        invalidEmail: "Please enter a valid email address.",
        invalidFullName: "Please enter your name.",
        invalidPassword: "The password must be at least 8 characters long.",
        passwordMismatch: "The passwords do not match.",
        invalidInvitation: "The invitation link is invalid or expired.",
        accessRemoved: "Team access was removed.",
        invitationResent: "Invitation was sent again.",
        activationFailed: "The team access could not be activated.",
      },
      settings: {
        requiredFields: "Please complete all required fields.",
        invalidEmail: "Please enter a valid email address.",
        invalidNotificationEmail: "Please enter a valid notification email address.",
        invalidTimezone: "Please choose a valid time zone.",
        invalidIndustry: "Please choose a valid industry.",
        settingsSaveFailed: "The settings could not be saved.",
        settingsSaved: "Settings saved.",
        inquiryTypeExists: "This inquiry type already exists.",
        inquiryTypeAdded: "Inquiry type added.",
        inquiryTypeNotAdded: "The inquiry type could not be added.",
      },
      contact: {
        eyebrow: "Contact",
        title: "Contact us",
        lead: "For questions about Varnito, please use the central contact email. Product, privacy, and contract requests are handled through this channel.",
        emailLabel: "Email",
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
      pricingValue: "$399 / month",
      pricingTaxNote: "Taxes calculated at checkout where applicable.",
      pricingCopy: "New companies start with a 30-day free trial. First payment begins only after trial end if you continue using Varnito.",
      pricingMeta: [
        "No hidden fees",
        "Billing remains transparent",
        "Applicable taxes are calculated at checkout based on customer location",
      ],
      faqEyebrow: "FAQ",
      faqTitle: "Common questions.",
      faq: [
        { question: "What is Varnito?", answer: "Varnito is a lightweight lead workflow system for service businesses that get inquiries through their website." },
        { question: "Is Varnito a CRM?", answer: "No. Varnito stays intentionally focused and does not try to replace a full CRM." },
        { question: "How does the 30-day trial work?", answer: "Create your account, start the trial, and evaluate the platform for 30 days before any subscription payment begins." },
        { question: "Do prices include taxes?", answer: "No. Applicable taxes are calculated during checkout based on the customer's location." },
        { question: "Do I need to replace my website?", answer: "No. Varnito works alongside your current website and lead forms." },
        { question: "Can team members collaborate?", answer: "Yes. You can invite staff and manage follow-up as a team." },
        { question: "Can I cancel anytime?", answer: "Yes. You can cancel from billing or in the customer portal." },
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
