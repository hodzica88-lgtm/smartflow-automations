import { loadServerEnv } from "@/shared/config/env";

export type SiteHelpMarket = "de" | "us";

export type SiteHelpAction = {
  type: "route" | "answer";
  href?: string;
  label?: string;
};

export type SiteHelpResult = {
  answer: string;
  action: SiteHelpAction;
  method: "deterministic" | "ai";
  confidence: number;
};

const SUPPORT_EMAIL = "mailto:support@varnito.com";
const REPORT_PROBLEM_SUBJECTS = {
  de: "Varnito – Problem melden",
  us: "Varnito – Report a problem",
} as const;

const buildProblemReportMailto = (market: SiteHelpMarket) =>
  `mailto:support@varnito.com?subject=${encodeURIComponent(REPORT_PROBLEM_SUBJECTS[market])}`;

const ALLOWED_PUBLIC_PATHS = new Set([
  "/",
  "/demo",
  "/registrierung",
  "/login",
  "/kontakt",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerruf",
  "/start",
  "/install",
  "/pricing",
  "/about",
  "/contact",
]);

const sanitizePhone = (value: string) =>
  value.replace(/(?:\+|00)?\d[\d\s().-]{6,}\d/g, " ");

export const sanitizeSiteHelpInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withoutUrl = trimmed.replace(/https?:\/\/[^\s]+/gi, " ");
  const withoutEmails = withoutUrl.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ");
  const withoutPhone = sanitizePhone(withoutEmails);
  const withoutEmailWord = withoutPhone.replace(/\b(?:email|e-mail|mail)\b/gi, " ");

  return withoutEmailWord.replace(/\s+/g, " ").trim();
};

const isAllowedPublicRoute = (href?: string) => {
  if (!href) {
    return false;
  }

  const normalized = href.startsWith("/") ? href : `/${href}`;
  return ALLOWED_PUBLIC_PATHS.has(normalized);
};

const buildRegistrationAnswer = (market: SiteHelpMarket) =>
  market === "us"
    ? "You can start with the registration page to create your account and begin the free trial."
    : "Sie können mit der Registrierung starten und dort den Testzugang für Varnito anlegen.";

const buildDemoAnswer = (market: SiteHelpMarket) =>
  market === "us"
    ? "Open the demo page to see the product in action before creating an account."
    : "Auf der Demo-Seite können Sie sich das Produkt direkt ansehen, bevor Sie sich registrieren.";

const buildPricingAnswer = (market: SiteHelpMarket) =>
  market === "us"
    ? "The pricing details are available on the public landing page and the registration flow."
    : "Die Preise und der Testzugang sind auf der Startseite und im Registrierungsbereich sichtbar.";

const buildLegalAnswer = (market: SiteHelpMarket, page: "privacy" | "terms" | "imprint" | "withdrawal") => {
  if (market === "us") {
    if (page === "privacy") return "For privacy details, open the Privacy Policy page.";
    if (page === "terms") return "For the terms, open the Terms page.";
    if (page === "imprint") return "For company details, open the Imprint page.";
    return "For withdrawal information, open the Withdrawal page.";
  }

  if (page === "privacy") return "Für Datenschutzinformationen öffnen Sie die Datenschutzseite.";
  if (page === "terms") return "Für die AGB öffnen Sie die AGB-Seite.";
  if (page === "imprint") return "Für Impressumsinformationen öffnen Sie die Impressumsseite.";
  return "Für den Widerruf öffnen Sie die Widerrufsseite.";
};

const buildSupportAnswer = (market: SiteHelpMarket) =>
  market === "us"
    ? "You can contact the support team directly by email."
    : "Sie können das Support-Team direkt per E-Mail kontaktieren.";

const buildReportProblemAnswer = (market: SiteHelpMarket) =>
  market === "us"
    ? "You can send a problem report to the support team by email."
    : "Sie können ein Problem direkt per E-Mail an das Support-Team melden.";

const buildContactAnswer = (market: SiteHelpMarket) =>
  market === "us"
    ? "Use the contact page if you need support or have a direct question for the team."
    : "Auf der Kontaktseite erreichen Sie das Team direkt bei Fragen oder Support.";

const buildGenericAnswer = (market: SiteHelpMarket) =>
  market === "us"
    ? "I can help you navigate to the main pages like registration, demo, pricing, privacy, terms, and contact."
    : "Ich kann Sie zu den wichtigsten Bereichen führen, etwa Registrierung, Demo, Preise, Datenschutz, AGB und Kontakt.";

const ROUTING_RULES: Array<{
  matcher: (value: string) => boolean;
  href: string | ((market: SiteHelpMarket) => string);
  answer: (market: SiteHelpMarket) => string;
  label?: (market: SiteHelpMarket) => string;
}> = [
  {
    matcher: (value) => /\b(registr|signup|sign up|trial|testzugang|kostenlos|free trial|account)\b/i.test(value),
    href: "/registrierung",
    answer: buildRegistrationAnswer,
  },
  {
    matcher: (value) => /\b(demo|show.*demo|live demo|vorschau|preview)\b/i.test(value),
    href: "/demo",
    answer: buildDemoAnswer,
  },
  {
    matcher: (value) => /\b(preis|pricing|cost|kosten|rate|tarif|angebot)\b/i.test(value),
    href: "/",
    answer: buildPricingAnswer,
  },
  {
    matcher: (value) => /\b(?:where|find|show|look).*\b(?:legal|privacy|terms?|imprint|withdrawal|datenschutz|agb|widerruf|impressum)\b|\b(?:legal|privacy)\s+(?:pages?|information|details)\b|\b(?:legal pages?|legal information)\b/i.test(value),
    href: "/datenschutz",
    answer: (market) => buildLegalAnswer(market, "privacy"),
  },
  {
    matcher: (value) => /\b(datenschutz|privacy|gdpr|data protection)\b/i.test(value),
    href: "/datenschutz",
    answer: (market) => buildLegalAnswer(market, "privacy"),
  },
  {
    matcher: (value) => /\b(agb|terms?|bedingungen|terms and conditions)\b/i.test(value),
    href: "/agb",
    answer: (market) => buildLegalAnswer(market, "terms"),
  },
  {
    matcher: (value) => /\b(impressum|imprint|legal info|company details|about)\b/i.test(value),
    href: "/impressum",
    answer: (market) => buildLegalAnswer(market, "imprint"),
  },
  {
    matcher: (value) => /\b(widerruf|withdrawal|cancel|return)\b/i.test(value),
    href: "/widerruf",
    answer: (market) => buildLegalAnswer(market, "withdrawal"),
  },
  {
    matcher: (value) => /\b(?:support|kontakt.*support|support.*kontakt|help desk|help center|assistance)\b/i.test(value),
    href: SUPPORT_EMAIL,
    answer: buildSupportAnswer,
    label: (market) => (market === "us" ? "Contact support" : "Support kontaktieren"),
  },
  {
    matcher: (value) => /\b(?:problem|issue|bug|fehler|problem melden|report a problem|issue report|problem report)\b/i.test(value),
    href: (market) => buildProblemReportMailto(market),
    answer: buildReportProblemAnswer,
    label: (market) => (market === "us" ? "Report a problem" : "Problem melden"),
  },
  {
    matcher: (value) => /\b(kontakt|contact|reach us|fragen)\b/i.test(value),
    href: "/kontakt",
    answer: buildContactAnswer,
  },
  {
    matcher: (value) => /\b(login|anmelden|sign in|log in)\b/i.test(value),
    href: "/login",
    answer: (market) =>
      market === "us"
        ? "Use the sign-in page to access your account or reset your password."
        : "Mit der Anmeldeseite können Sie sich in Ihr Konto einloggen oder Ihr Passwort zurücksetzen.",
  },
];

export const findSiteHelpAnswer = ({
  market,
  message,
  path,
}: {
  market: SiteHelpMarket | "unknown";
  message: string;
  path?: string;
}): SiteHelpResult => {
  const safeMarket = market === "us" ? "us" : "de";
  const sanitized = sanitizeSiteHelpInput(message);
  const normalized = sanitized || (path ? path : "");

  const directRule = ROUTING_RULES.find(({ matcher }) => matcher(normalized));
  if (directRule) {
    const href = typeof directRule.href === "function" ? directRule.href(safeMarket) : directRule.href;

    return {
      answer: directRule.answer(safeMarket),
      action: {
        type: "route",
        href,
        label: directRule.label ? directRule.label(safeMarket) : safeMarket === "us" ? "Open page" : "Seite öffnen",
      },
      method: "deterministic",
      confidence: 0.96,
    };
  }

  const genericAnswer = buildGenericAnswer(safeMarket);

  return {
    answer: genericAnswer,
    action: {
      type: "answer",
      label: safeMarket === "us" ? "Open home" : "Startseite öffnen",
      href: "/",
    },
    method: "deterministic",
    confidence: 0.73,
  };
};

const getOpenAiSiteHelpAnswer = async (input: {
  market: SiteHelpMarket;
  message: string;
}): Promise<SiteHelpResult | null> => {
  const openAiApiKey = loadServerEnv().openAiApiKey;
  const openAiModel = process.env.OPENAI_MODEL;
  if (!openAiApiKey || !openAiModel) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: openAiModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are the Varnito public website helper. Answer user questions about navigating the public website. You may only suggest routes from this allowlist: /, /demo, /registrierung, /kontakt, /impressum, /datenschutz, /agb, /widerruf, /login. If the route is not obvious, answer without a route and keep it short. Output JSON with keys: answer, href, confidence.",
          },
          {
            role: "user",
            content: JSON.stringify({
              market: input.market,
              message: sanitizeSiteHelpInput(input.message),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content) as { answer?: unknown; href?: unknown; confidence?: unknown };
    const answer = typeof parsed.answer === "string" && parsed.answer.trim().length > 0
      ? parsed.answer.trim()
      : null;
    const safeHref = typeof parsed.href === "string" ? parsed.href.trim() : "";
    const href = isAllowedPublicRoute(safeHref) || safeHref === "/login" ? safeHref : undefined;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.8;

    if (!answer) {
      return null;
    }

    return {
      answer,
      action: {
        type: href ? "route" : "answer",
        href,
        label: input.market === "us" ? "Open page" : "Seite öffnen",
      },
      method: "ai",
      confidence: Math.max(0.2, Math.min(0.99, confidence)),
    };
  } catch {
    return null;
  }
};

export const answerSiteHelpRequest = async ({
  market,
  message,
  path,
}: {
  market: SiteHelpMarket | "unknown";
  message: string;
  path?: string;
}): Promise<SiteHelpResult> => {
  const deterministic = findSiteHelpAnswer({ market, message, path });
  const aiResult = await getOpenAiSiteHelpAnswer({
    market: market === "us" ? "us" : "de",
    message,
  });

  if (!aiResult) {
    return deterministic;
  }

  return aiResult.confidence >= deterministic.confidence ? aiResult : deterministic;
};
