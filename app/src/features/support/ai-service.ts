import { loadServerEnv } from "@/shared/config/env";
import { getSupportKnowledgeAnswer } from "@/features/support/knowledge";
import type { SupportClassification, SupportThreadCategory } from "@/features/support/types";

const AUTO_REPLIABLE_CATEGORIES: SupportThreadCategory[] = ["general_usage"];
const SUPPORT_CATEGORY_VALUES: SupportThreadCategory[] = [
  "general_usage",
  "payment",
  "refund",
  "legal",
  "privacy",
  "account_deletion",
  "security",
  "unknown",
];
const SUPPORT_PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;

const normalizeSupportCategory = (value: unknown, fallback: SupportThreadCategory): SupportThreadCategory => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, SupportThreadCategory> = {
    datenschutz: "privacy",
    privacy: "privacy",
    gdpr: "privacy",
    dsgvo: "privacy",
    "data_privacy": "privacy",
    refund: "refund",
    erstattung: "refund",
    chargeback: "refund",
    payment: "payment",
    "payment_issue": "payment",
    invoice: "payment",
    bill: "payment",
    legal: "legal",
    recht: "legal",
    contract: "legal",
    general_usage: "general_usage",
    "general_use": "general_usage",
    usage: "general_usage",
    account_deletion: "account_deletion",
    "delete_account": "account_deletion",
    security: "security",
    unknown: "unknown",
  };

  const mapped = aliases[normalized];
  if (mapped) {
    return mapped;
  }

  if (SUPPORT_CATEGORY_VALUES.includes(normalized as SupportThreadCategory)) {
    return normalized as SupportThreadCategory;
  }

  return fallback;
};

const normalizeSupportPriority = (value: unknown, fallback: SupportClassification["priority"]): SupportClassification["priority"] => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, SupportClassification["priority"]> = {
    low: "low",
    niedrig: "low",
    medium: "medium",
    mittel: "medium",
    high: "high",
    hoch: "high",
    urgent: "urgent",
    dringend: "urgent",
  };

  const mapped = aliases[normalized];
  if (mapped) {
    return mapped;
  }

  if (SUPPORT_PRIORITY_VALUES.includes(normalized as typeof SUPPORT_PRIORITY_VALUES[number])) {
    return normalized as SupportClassification["priority"];
  }

  return fallback;
};

const normalizeDetectedLanguage = (value: unknown, fallback: "de" | "en") => {
  if (value === "de" || value === "en") {
    return value;
  }

  return fallback;
};

const normalizeConfidence = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Number(fallback.toFixed(2));
  }

  return Number(Math.min(0.99, Math.max(0.2, value)).toFixed(2));
};

const pickLanguage = (text: string): "de" | "en" => {
  const normalized = text.toLowerCase();
  const germanSignals = /(wie|wo|warum|danke|bitte|einstellungen|dashboard|anfrage|status|team|mitarbeiter|firma|passwort|login|demo|trial|brand|branding|firma)/i;
  const englishSignals = /(how|where|why|thanks|please|settings|dashboard|lead|status|team|member|company|password|login|demo|trial|brand|branding|request)/i;

  if (germanSignals.test(normalized) && !englishSignals.test(normalized)) {
    return "de";
  }

  if (englishSignals.test(normalized) && !germanSignals.test(normalized)) {
    return "en";
  }

  return normalized.includes("ä") || normalized.includes("ö") || normalized.includes("ü") || normalized.includes("ß") ? "de" : "en";
};

const getCategory = (text: string): SupportThreadCategory => {
  const normalized = text.toLowerCase();

  if (/(refund|erstattung|rueckerstattung|chargeback|money back)/i.test(normalized)) return "refund";
  if (/(payment failed|payment issue|invoice|charged twice|zahlung|rechn|bill|card failed|betrag|invoice)/i.test(normalized)) return "payment";
  if (/(legal|recht|contract|vertrag|terms|agb|service agreement|rechtlich)/i.test(normalized)) return "legal";
  if (/(gdpr|privacy|datenschutz|personal data|delete my data|data request|personenbezogene|dsgvo)/i.test(normalized)) return "privacy";
  if (/(delete my account|account deletion|konto löschen|delete account|remove account|delete user)/i.test(normalized)) return "account_deletion";
  if (/(security|breach|unauthorized|suspicious login|hacked|sicherheit|missbrauch|unbefugter zugang)/i.test(normalized)) return "security";
  if (/(how do i|where do i|where can i|how can i|wie|wo finde ich|wo ist|wie funktioniert|dashboard|settings|password|team|branding|anfragen|leads|status|demo|trial)/i.test(normalized)) return "general_usage";

  return "unknown";
};

const getPriority = (category: SupportThreadCategory): SupportClassification["priority"] => {
  if (category === "security") return "urgent";
  if (category === "payment" || category === "refund") return "high";
  if (category === "legal" || category === "privacy") return "high";
  if (category === "account_deletion") return "high";
  return category === "general_usage" ? "low" : "medium";
};

const buildEscalationReason = (category: SupportThreadCategory, text: string) => {
  if (category === "general_usage") return undefined;
  const lower = text.toLowerCase();

  if (category === "refund") return "Refund or reimbursement requests require manual review.";
  if (category === "payment") return "Payment or billing issues require manual review.";
  if (category === "legal") return "Legal or contractual questions require manual review.";
  if (category === "privacy") return "Privacy or GDPR inquiries require manual review.";
  if (category === "account_deletion") return "Account deletion requests require manual review.";
  if (category === "security") return "Security or unauthorized access issues require manual review.";
  if (/(complaint|beschwerde|angry|frustrated|unsatisfied)/i.test(lower)) return "Customer complaint may require human escalation.";
  return "This request falls outside the safe auto-reply policy.";
};

export const classifySupportRequest = async ({
  subject,
  body,
  market,
}: {
  subject: string;
  body: string;
  market?: "de" | "us" | "unknown";
}): Promise<SupportClassification> => {
  const text = `${subject}\n${body}`.trim();
  const language = pickLanguage(text);
  const category = getCategory(text);
  const priority = getPriority(category);
  const lower = text.toLowerCase();

  const confidenceBase =
    category === "general_usage" ? 0.91 :
    category === "unknown" ? 0.46 : 0.97;

  const lowConfidence = /(not sure|unsure|weiss nicht|unbekannt|random|something is wrong|ich weiß nicht|ich weiss nicht)/i.test(lower);
  const complaintSignal = /(complaint|beschwerde|angry|frustrated|chargeback|not satisfied|unglücklich)/i.test(lower);
  const confidence = Number(Math.min(0.99, Math.max(0.2, confidenceBase - (lowConfidence ? 0.25 : 0) - (complaintSignal ? 0.15 : 0))).toFixed(2));

  const canAutoReply =
    AUTO_REPLIABLE_CATEGORIES.includes(category) &&
    confidence >= 0.75 &&
    !complaintSignal &&
    !/(refund|payment|legal|privacy|delete.*account|security|breach|chargeback|invoice|dispute|complaint|beschwerde)/i.test(lower);

  const escalationReason = canAutoReply ? undefined : buildEscalationReason(category, text);

  const suggestedReply = canAutoReply
    ? getSupportKnowledgeAnswer(language === "de" ? "de" : "en", text)
    : undefined;

  const openAiKey = loadServerEnv().openAiApiKey;
  if (openAiKey && process.env.OPENAI_MODEL) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are a safe support triage assistant for Varnito. Only classify general product usage questions as auto-reply eligible. Never approve payment, refund, privacy, legal, security, account deletion, or other sensitive cases. Output strict JSON with keys: detectedLanguage, category, priority, canAutoReply, confidence, escalationReason, suggestedReply.",
            },
            {
              role: "user",
              content: `Market: ${market ?? "de"}\nSubject: ${subject}\nBody: ${body}`,
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = payload.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as Partial<SupportClassification> & { detectedLanguage?: string };
          const detectedLanguage = normalizeDetectedLanguage(parsed.detectedLanguage, language);
          const safeCategory = normalizeSupportCategory(parsed.category, category);
          const safePriority = normalizeSupportPriority(parsed.priority, priority);
          const safeConfidence = normalizeConfidence(parsed.confidence, confidence);
          const aiCanAutoReply = typeof parsed.canAutoReply === "boolean" ? parsed.canAutoReply : undefined;
          const finalCanAutoReply = safeCategory === "general_usage"
            && safeConfidence >= 0.75
            && !complaintSignal
            && !/(refund|payment|legal|privacy|delete.*account|security|breach|chargeback|invoice|dispute|complaint|beschwerde)/i.test(lower)
            && (aiCanAutoReply === undefined || aiCanAutoReply === true);

          const finalEscalationReason = finalCanAutoReply ? undefined : (
            typeof parsed.escalationReason === "string" && parsed.escalationReason.trim().length > 0
              ? parsed.escalationReason
              : buildEscalationReason(safeCategory, text)
          );

          const finalSuggestedReply = finalCanAutoReply
            ? (typeof parsed.suggestedReply === "string" && parsed.suggestedReply.trim().length > 0 ? parsed.suggestedReply : suggestedReply)
            : undefined;

          return {
            detectedLanguage,
            category: safeCategory,
            priority: safePriority,
            canAutoReply: finalCanAutoReply,
            confidence: safeConfidence,
            escalationReason: finalEscalationReason,
            suggestedReply: finalSuggestedReply,
          };
        }
      }
    } catch {
      // Safe fallback to deterministic classification below.
    }
  }

  return {
    detectedLanguage: language,
    category,
    priority,
    canAutoReply,
    confidence,
    escalationReason,
    suggestedReply,
  };
};
