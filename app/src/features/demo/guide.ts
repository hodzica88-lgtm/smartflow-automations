import type { DemoMarket } from "@/features/demo/types";
import { getDemoCopy } from "@/features/demo/copy";

type GuideIntent = {
  id: string;
  patterns: RegExp[];
  answer: { de: string; us: string };
  route?: string;
  highlight?: string;
};

export type GuideResponse = {
  answer: string;
  route?: string;
  highlight?: string;
  constrained: boolean;
};

const intents: GuideIntent[] = [
  {
    id: "leads",
    patterns: [/lead/i, /anfrage/i, /inquir/i, /pipeline/i],
    answer: {
      de: "Im Bereich Leads sehen Sie alle Anfragen in einer Liste und passen Status oder Zuständigkeit direkt an. In den Lead-Details bearbeiten Sie Notizen und Kontaktinformationen im selben Ablauf.",
      us: "In Leads, you review every inquiry in one list and update status or ownership immediately. In lead details, you can edit notes and contact context in the same workflow.",
    },
    route: "/demo/leads",
    highlight: "leads",
  },
  {
    id: "team",
    patterns: [/team/i, /mitarbeiter/i, /invite/i],
    answer: {
      de: "Im Team-Bereich laden Sie Mitarbeitende per E-Mail ein und sehen aktive oder ausstehende Zugänge. Alle Aktionen sind in der Demo nur simuliert und erzeugen keine echten Einladungen.",
      us: "In Team, you can invite members by email and manage active or pending access. In this demo, all actions are simulated and do not send real invitations.",
    },
    route: "/demo/team",
    highlight: "team",
  },
  {
    id: "dashboard",
    patterns: [/dashboard/i, /kennzahlen/i, /kpi/i],
    answer: {
      de: "Das Dashboard zeigt Ihnen die wichtigsten Lead-Kennzahlen und offene Anfragen auf einen Blick. Von dort springen Sie direkt in Leads oder Einstellungen.",
      us: "The dashboard gives you key lead KPIs and open inquiry visibility at a glance. From there, you can jump directly into leads or settings.",
    },
    route: "/demo/dashboard",
    highlight: "dashboard",
  },
  {
    id: "billing",
    patterns: [/billing/i, /trial/i, /testphase/i, /kuendig/i, /cancel/i, /stripe/i],
    answer: {
      de: "Im Billing sehen Sie Testphase, Status und nächste Abrechnung in einer Übersicht. Checkout und Portal-Aktionen sind in der Demo nur lokale Simulationen ohne Stripe-Aufrufe.",
      us: "Billing shows trial state, subscription status, and next invoice in one view. Checkout and portal actions are local simulations in the demo with no Stripe calls.",
    },
    route: "/demo/billing",
    highlight: "billing",
  },
  {
    id: "settings",
    patterns: [/einstell/i, /setting/i, /inquiry type/i, /anfrageart/i],
    answer: {
      de: "In den Einstellungen bearbeiten Sie Firmendaten, Kontaktwege und Anfragearten. Änderungen bleiben im Browser und werden nach Reload zurückgesetzt.",
      us: "In settings, you update company profile, contact channels, and inquiry types. Changes stay in browser state and reset on reload.",
    },
    route: "/demo/settings",
    highlight: "settings",
  },
  {
    id: "inquiries",
    patterns: [/antwort/i, /beantwort/i, /respond/i, /notification/i],
    answer: {
      de: "Anfragen werden in Varnito strukturiert als Leads erfasst und nach Status sowie Zuständigkeit bearbeitet. So sieht Ihr Team sofort, was offen ist und was bereits erledigt wurde.",
      us: "Inquiries are structured as leads and handled through status and ownership updates. Your team can instantly see what is open and what is completed.",
    },
    route: "/demo/leads",
    highlight: "leads",
  },
];

const normalize = (value: string) => value.trim().toLowerCase();

export const resolveGuideResponse = (market: DemoMarket, question: string): GuideResponse => {
  const input = normalize(question);
  const copy = getDemoCopy(market);

  if (!input) {
    return {
      answer: copy.guide.welcome,
      constrained: true,
    };
  }

  for (const intent of intents) {
    if (intent.patterns.some((pattern) => pattern.test(input))) {
      return {
        answer: market === "us" ? intent.answer.us : intent.answer.de,
        route: intent.route,
        highlight: intent.highlight,
        constrained: true,
      };
    }
  }

  return {
    answer: copy.guide.safety,
    constrained: true,
  };
};
