export type SupportLocale = "de" | "us" | "unknown";
export type SupportThreadStatus = "open" | "ai_answered" | "escalated" | "waiting_customer" | "resolved";
export type SupportThreadPriority = "low" | "medium" | "high" | "urgent";
export type SupportThreadCategory =
  | "general_usage"
  | "payment"
  | "refund"
  | "legal"
  | "privacy"
  | "account_deletion"
  | "security"
  | "unknown";

export type SupportClassification = {
  detectedLanguage: "de" | "en";
  category: SupportThreadCategory;
  priority: SupportThreadPriority;
  canAutoReply: boolean;
  confidence: number;
  escalationReason?: string;
  suggestedReply?: string;
};

export type SupportThreadRecord = {
  id: string;
  customer_email: string;
  customer_name?: string | null;
  company_id?: string | null;
  locale: SupportLocale;
  subject: string;
  status: SupportThreadStatus;
  priority: SupportThreadPriority;
  category: SupportThreadCategory;
  ai_confidence?: number | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

export type SupportMessageRecord = {
  id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "ai" | "owner" | "system";
  sender_email?: string | null;
  body_text: string;
  body_html?: string | null;
  provider_message_id?: string | null;
  created_at: string;
};
