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
  inquiryShare: {
    title: string;
    linkLabel: string;
    linkDescription: string;
    copyLink: string;
    copied: string;
    copyFailed: string;
    embedLabel: string;
    embedDescription: string;
    copyEmbedCode: string;
    qrLabel: string;
    qrDescription: string;
    qrLoading: string;
    downloadQrCode: string;
    downloadFailed: string;
    qrAriaLabel: string;
    embedTitle: string;
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
      inquiryShare: {
        title: "Anfrageformular teilen",
        linkLabel: "Anfrage-Link",
        linkDescription: "Diesen Link können Sie per E-Mail, WhatsApp oder auf Ihrer Website teilen.",
        copyLink: "Link kopieren",
        copied: "Kopiert",
        copyFailed: "Kopieren nicht moeglich",
        embedLabel: "Embed-Code",
        embedDescription: "Diesen Code können Sie in Ihre Website einfügen.",
        copyEmbedCode: "Embed-Code kopieren",
        qrLabel: "QR-Code",
        qrDescription: "Diesen QR-Code können Sie ausdrucken oder auf Flyern und Visitenkarten verwenden.",
        qrLoading: "QR-Code wird geladen",
        downloadQrCode: "QR-Code herunterladen",
        downloadFailed: "Download nicht moeglich",
        qrAriaLabel: "QR-Code für das Anfrageformular",
        embedTitle: "Anfrageformular",
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
        "Varnito hält eingehende Anfragen sichtbar, informiert Ihr Team und ergänzt Ihren bestehenden Anfrageprozess ohne schwere CRM-Umstellung.",
      kicker: "Varnito.de für Betriebe mit Website-Anfragen",
      heroTitle: "Lassen Sie Ihre nächste Anfrage nicht zum verlorenen Auftrag werden.",
      heroLead:
        "Sie haben dafür gearbeitet, dass die Anfrage kommt. Varnito sorgt dafür, dass Ihr Team sie sieht, sie nachvollziehbar bleibt und sie nicht im Arbeitsalltag untergeht.",
      primaryCta: "Varnito 30 Tage kostenlos testen",
      secondaryCta: "Ansehen, wie es funktioniert",
      supporting: "Website behalten. Arbeitsweise behalten. Keine komplizierte CRM-Umstellung.",
      previewDashboardTitle: "Neue Anfrage",
      previewDashboardText: "Eine zentrale Ansicht für offene Leads, Status und letzte 30 Tage.",
      previewLeadsTitle: "Bearbeitung im Team",
      previewLeadsText: "Status und Ergebnis bleiben für alle Beteiligten nachvollziehbar.",
      previewBillingTitle: "30 Tage Testphase",
      previewBillingText: "Transparent, ohne versteckte Gebühren oder unnötige Produktversprechen.",
      problemEyebrow: "Eine Frage",
      problemTitle: "Was ist eine verpasste Kundenanfrage für Ihren Betrieb wert?",
      problemItems: [
        "Vielleicht geht es um einen kleinen Auftrag. Vielleicht um mehrere Tausend Euro. Das Problem bleibt gleich: Wird eine ernsthafte Anfrage vergessen oder zu spät bearbeitet, ist die Chance möglicherweise weg.",
        "Den schwierigen Teil haben Sie bereits geschafft: Der Kunde hat Sie kontaktiert.",
      ],
      solutionEyebrow: "Sie brauchen kein weiteres kompliziertes System.",
      solutionTitle: "Website behalten. Bestehende Systeme behalten. Neue Anfragen besser sichtbar machen.",
      solutionSteps: [
        { title: "Website behalten", text: "Varnito ergänzt den Anfrageprozess, den Sie bereits nutzen." },
        { title: "Bestehende Systeme behalten", text: "CRM, Kalender und Arbeitsabläufe müssen nicht ersetzt werden." },
        { title: "Die fehlende Absicherung ergänzen", text: "Neue Anfragen bleiben sichtbar und Ihr Team erkennt, was noch bearbeitet werden muss." },
      ],
      benefitsEyebrow: "Vorteile",
      benefitsTitle: "Bewusst einfach.",
      benefits: [
        "Neue Fragen bleiben sichtbar",
        "Mehr Klarheit im Alltag",
        "Schnellerer Überblick für Ihr Team",
        "Keine schwere CRM-Einführung",
        "Kundenchancen nicht aus dem Blick verlieren",
      ],
      functionsEyebrow: "So funktioniert es",
      functionsTitle: "Einfacher Ablauf. Klare Verantwortung.",
      functions: [
        { title: "Eine Anfrage kommt rein", text: "Neue Kundenanfragen landen an einer Stelle und werden nicht im Posteingang untergehen." },
        { title: "Ihr Team wird informiert", text: "Die nächste Zuständigkeit wird sichtbar, damit nicht nur eine Person im Kopf weiß, was zu tun ist." },
        { title: "Alle sehen, was als Nächstes zu tun ist", text: "Im Team bleibt nachvollziehbar, was offen ist, was bearbeitet wurde und was noch folgt." },
      ],
      viewsEyebrow: "Im Alltag spürbar",
      viewsTitle: "Anfragen kommen nicht nur dann, wenn Sie gerade am Schreibtisch sitzen.",
      views: [
        { title: "Sie sind beim Kunden", text: "Die Anfrage muss trotzdem gesehen werden." },
        { title: "Sie sind unterwegs", text: "Ein offener Auftrag muss nicht in einem vollen Posteingang verschwinden." },
        { title: "Im Büro ist viel los", text: "Die nächste Bearbeitung bleibt für alle sichtbar." },
        { title: "Nach Feierabend", text: "Eine eingegangene Anfrage braucht trotzdem eine klare nächste Handlung." },
      ],
      pricingEyebrow: "Preis",
      pricingTitle: "Varnito Pro Monatsabo.",
      pricingLabel: "Varnito Pro",
      pricingValue: "299 €",
      pricingTaxNote: "zzgl. gesetzlicher USt.",
      pricingCopy: "Wenn schon eine einzige nicht verlorene Kundenchance mehr wert ist als das Monatsabo, kann sich Varnito rechnen. Entscheidend sind Ihre eigenen Zahlen.",
      pricingMeta: [
        "Keine versteckten Gebühren",
        "Transparentes Monatsabo",
        "Varnito ergänzt Ihren bestehenden Prozess",
      ],
      faqEyebrow: "FAQ",
      faqTitle: "Häufige Fragen.",
      faq: [
        { question: "Was ist Varnito?", answer: "Varnito ist eine schlanke Lösung für Betriebe mit Website-Anfragen. Sie hält neue Anfragen sichtbar, informiert das Team und macht den nächsten Schritt nachvollziehbar." },
        { question: "Ist Varnito ein CRM?", answer: "Nein. Varnito ergänzt Ihren bestehenden Prozess und ersetzt kein klassisches CRM-System." },
        { question: "Wie funktioniert die 30-Tage-Testphase?", answer: "Sie starten die Testphase und prüfen Varnito mit echten Anfragen. Danach entscheiden Sie selbst, ob Sie es weiter nutzen möchten." },
        { question: "Sind die Preise netto oder brutto?", answer: "Alle Preise verstehen sich zzgl. der gesetzlichen Umsatzsteuer. Die Umsatzsteuer wird im Checkout sowie auf der Rechnung separat ausgewiesen." },
        { question: "Muss ich meine Website ersetzen?", answer: "Nein. Varnito arbeitet neben Ihrer bestehenden Website und unterstützt den vorhandenen Anfrageprozess." },
        { question: "Können Mitarbeiter mitarbeiten?", answer: "Ja. Mitarbeiter können eingeladen werden und im Team mitarbeiten." },
        { question: "Kann ich jederzeit kündigen?", answer: "Ja. Sie kündigen im Billing-Bereich oder im Kundenportal. Die Nutzung bleibt bis zum Ende der laufenden Periode verfügbar." },
        { question: "Was passiert nach einer Kündigung?", answer: "Ihr Zugriff endet nach der gebuchten Periode. Ihre Daten bleiben nicht durch Marketing gelöscht, sondern folgen den geltenden Aufbewahrungs- und Löschregeln." },
        { question: "Wie werden meine Daten geschützt?", answer: "Varnito nutzt Mandantentrennung, Supabase, Stripe und technisch notwendige Authentifizierung. Es werden keine unnötigen Tracking-Dienste eingesetzt." },
      ],
      ctaEyebrow: "Im eigenen Betrieb testen",
      ctaTitle: "Wie viele Anfragen möchten Sie dem Zufall überlassen?",
      ctaText: "Testen Sie Varnito 30 Tage im echten Arbeitsalltag und entscheiden Sie anschließend anhand Ihrer eigenen Erfahrung.",
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
      inquiryShare: {
        title: "Share inquiry form",
        linkLabel: "Inquiry link",
        linkDescription: "Share this link by email, WhatsApp, or on your website.",
        copyLink: "Copy link",
        copied: "Copied",
        copyFailed: "Copy failed",
        embedLabel: "Embed code",
        embedDescription: "Add this code to your website.",
        copyEmbedCode: "Copy embed code",
        qrLabel: "QR code",
        qrDescription: "Print this QR code or use it on flyers and business cards.",
        qrLoading: "QR code is loading",
        downloadQrCode: "Download QR code",
        downloadFailed: "Download failed",
        qrAriaLabel: "QR code for the inquiry form",
        embedTitle: "Inquiry form",
      },
      contact: {
        eyebrow: "Contact",
        title: "Contact us",
        lead: "For questions about Varnito, please use the central contact email. Product, privacy, and contract requests are handled through this channel.",
        emailLabel: "Email",
      },
    },
    landing: {
      metadataTitle: "Don’t let your next customer become your next missed lead.",
      siteDescription:
        "Varnito keeps new inquiries visible, alerts your team quickly, and works alongside your current website and workflow without a heavy CRM migration.",
      kicker: "Varnito for home service businesses",
      heroTitle: "Don’t let your next customer become your next missed lead.",
      heroLead:
        "You worked to get the inquiry. Varnito makes sure it reaches your team, stays visible, and doesn’t disappear into a busy inbox.",
      primaryCta: "Try Varnito free for 30 days",
      secondaryCta: "See how it works",
      supporting: "Keep your website. Keep your workflow. No heavy CRM migration.",
      previewDashboardTitle: "New lead",
      previewDashboardText: "One clear view for open leads, status updates, and your last 30 days.",
      previewLeadsTitle: "Team follow-up",
      previewLeadsText: "Everyone sees what is done, what is pending, and who owns each lead.",
      previewBillingTitle: "30-day trial",
      previewBillingText: "Straightforward billing with no hidden fees and no inflated feature promises.",
      problemEyebrow: "One question",
      problemTitle: "What is one missed lead worth to your business?",
      problemItems: [
        "Maybe it is a small repair. Maybe it is a $5,000 job. The problem is the same: once a serious inquiry is forgotten or answered too late, you may never get the opportunity back.",
        "You already did the hard part — getting the customer to contact you.",
      ],
      solutionEyebrow: "You do not need another complicated system.",
      solutionTitle: "Keep your website. Keep your existing tools. Add the missing safety net.",
      solutionSteps: [
        { title: "Keep your website", text: "Varnito works with the inquiry flow you already have." },
        { title: "Keep your existing tools", text: "Varnito does not ask you to replace your CRM, calendar, or daily workflow." },
        { title: "Add the missing safety net", text: "New inquiries stay visible so your team knows what still needs attention." },
      ],
      benefitsEyebrow: "Simple on purpose",
      benefitsTitle: "A clearer way to make sure inquiries get handled.",
      benefits: [
        "Keep new leads visible",
        "Give your team a shared view",
        "Respond sooner with less backtracking",
        "No heavyweight rollout or migration",
        "Know what is still open at a glance",
      ],
      functionsEyebrow: "How it works",
      functionsTitle: "One clear system for incoming requests.",
      functions: [
        { title: "A lead comes in", text: "Website inquiries are captured in one place instead of being buried in a busy inbox." },
        { title: "Your team gets alerted", text: "The next step is visible so follow-up starts without delay." },
        { title: "Everyone can see what happens next", text: "The team can see what is open, handled, and still needs attention." },
      ],
      viewsEyebrow: "Real-life moments",
      viewsTitle: "Leads do not wait until you are sitting at a desk.",
      views: [
        { title: "You’re on a job.", text: "The inquiry still needs to be seen." },
        { title: "You’re driving.", text: "Someone still needs a quick and clear response." },
        { title: "The office is busy.", text: "Open inquiries need to stay visible." },
        { title: "It’s after business hours.", text: "A serious inquiry still deserves attention." },
      ],
      pricingEyebrow: "Pricing",
      pricingTitle: "Varnito Pro monthly subscription.",
      pricingLabel: "Varnito Pro",
      pricingValue: "$399",
      pricingTaxNote: "Applicable taxes calculated at checkout.",
      pricingCopy: "If one saved opportunity is worth more than the monthly subscription, Varnito can pay for itself. Your numbers decide.",
      pricingMeta: [
        "No hidden fees",
        "Transparent monthly billing",
        "Works alongside your current workflow",
      ],
      faqEyebrow: "FAQ",
      faqTitle: "Common questions.",
      faq: [
        { question: "What is Varnito?", answer: "Varnito is a lightweight lead workflow tool for service businesses that want incoming inquiries to stay visible and easy to act on." },
        { question: "Is Varnito a CRM?", answer: "No. Varnito stays focused on new inquiry follow-up and does not replace your existing CRM or workflow." },
        { question: "How does the 30-day trial work?", answer: "Create your account, test Varnito with real inquiries, and decide whether you want to keep it after the trial period." },
        { question: "Do prices include taxes?", answer: "No. Applicable taxes are calculated during checkout based on the customer's location." },
        { question: "Do I need to replace my website?", answer: "No. Varnito works alongside your current website and lead flow." },
        { question: "Can team members collaborate?", answer: "Yes. You can invite staff and keep the inquiry workflow visible across the team." },
        { question: "Can I cancel anytime?", answer: "Yes. You can cancel from billing or in the customer portal." },
        { question: "What happens after cancellation?", answer: "Access remains available through the paid period, then ends based on your subscription state." },
        { question: "How is data protected?", answer: "Varnito uses tenant isolation, Supabase, Stripe, and required authentication flows." },
      ],
      ctaEyebrow: "Try it in your real business",
      ctaTitle: "How many leads do you want to leave to chance?",
      ctaText: "Try Varnito with your real workflow for 30 days and make the decision based on your own results.",
      ctaBackToTop: "Back to top",
    },
  },
};

export const getMarketCopy = (market: MarketCode) => COPY[market];
