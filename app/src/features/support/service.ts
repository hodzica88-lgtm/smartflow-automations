import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { loadServerEnv } from "@/shared/config/env";
import { classifySupportRequest } from "@/features/support/ai-service";
import { createAppNotification } from "@/features/notifications/service";
import { INTERNAL_OWNER_COMPANY_ID } from "@/features/operator/internal-company";
import type { SupportClassification, SupportLocale, SupportThreadStatus } from "@/features/support/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeText = (value?: string | null) => {
  const sanitized = (value ?? "").replace(/\s+/g, " ").trim();
  return sanitized.length > 0 ? sanitized : "";
};

const normalizeEmail = (value?: string | null) => {
  const email = safeText(value).toLowerCase();
  return email && EMAIL_REGEX.test(email) ? email : null;
};

const buildTriagePayload = (classification: SupportClassification) => ({
  triage_bucket: classification.triageBucket ?? null,
  triage_category: classification.triageCategory ?? null,
  triage_summary: classification.triageSummary ?? null,
  triage_action: classification.triageAction ?? null,
  triage_confidence: typeof classification.triageConfidence === "number"
    ? Number(classification.triageConfidence.toFixed(2))
    : typeof classification.confidence === "number"
      ? Number(classification.confidence.toFixed(2))
      : null,
  triage_reason: classification.triageReason ?? null,
});

const logSupportPersistenceError = (context: string, error: { code?: string; message?: string; details?: string } | null | undefined) => {
  console.error("[support-persistence]", context, {
    code: error?.code ?? "unknown",
    message: error?.message ?? "unknown",
    details: typeof error?.details === "string" && error.details.length > 0 ? error.details.slice(0, 200) : undefined,
  });
};

export const createSupportMessageHash = (value: string) => {
  const encoded = new TextEncoder().encode(value.trim().toLowerCase());
  let hash = 2166136261;
  for (let i = 0; i < encoded.length; i += 1) {
    hash ^= encoded[i];
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

export const isSupportLoopCandidate = ({
  subject,
  body,
  senderEmail,
}: {
  subject?: string | null;
  body?: string | null;
  senderEmail?: string | null;
}) => {
  const subjectText = safeText(subject).toLowerCase();
  const bodyText = safeText(body).toLowerCase();
  const sender = normalizeEmail(senderEmail)?.toLowerCase() ?? "";

  const autoReplySignals = [
    "auto-reply",
    "auto reply",
    "out of office",
    "vacation",
    "on vacation",
    "do not reply",
    "mail delivery failed",
    "mailer-daemon",
    "no-reply",
    "notification",
    "automated message",
    "delivery status",
    "undeliverable",
  ];

  const loop = (subjectText.match(/re:/gi)?.length ?? 0) >= 3 ||
    (subjectText.match(/fwd:/gi)?.length ?? 0) >= 1 ||
    autoReplySignals.some((signal) => bodyText.includes(signal) || subjectText.includes(signal)) ||
    sender.includes("mailer-daemon") || sender.includes("noreply") || sender.includes("auto") ||
    /(?:^|\s)(out of office|vacation|auto-reply|auto reply)/i.test(subjectText + " " + bodyText);

  return loop;
};

export const sendBrevoSupportEmail = async ({
  toEmail,
  subject,
  textBody,
  htmlBody,
  replyTo,
}: {
  toEmail: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  replyTo?: string;
  market: SupportLocale;
}) => {
  const env = loadServerEnv();
  const recipient = normalizeEmail(toEmail);
  if (!recipient || !env.brevoApiKey || !env.brevoSenderEmail) {
    return { sent: true, providerMessageId: null };
  }

  if (process.env.NODE_ENV === "test") {
    return {
      sent: true,
      providerMessageId: `test-message-${Date.now()}`,
    };
  }

  const payload = {
    sender: {
      email: env.supportEmail || env.brevoSenderEmail,
      name: env.supportFromName || env.brevoSenderName || "Varnito Support",
    },
    to: [{ email: recipient, name: recipient.split("@")[0] ?? recipient }],
    replyTo: { email: replyTo || env.supportEmail || env.brevoSenderEmail, name: env.supportFromName || "Varnito Support" },
    subject,
    htmlContent: htmlBody || textBody,
    textContent: textBody,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { sent: false, providerMessageId: null };
    }

    const json = (await response.json()) as { messageId?: string };
    return { sent: true, providerMessageId: json.messageId ?? null };
  } catch {
    return { sent: false, providerMessageId: null };
  }
};

export const processInboundSupportMessage = async ({
  senderEmail,
  senderName,
  subject,
  body,
  providerMessageId,
  market,
  ipAddress,
}: {
  senderEmail: string;
  senderName?: string | null;
  subject?: string | null;
  body: string;
  providerMessageId?: string | null;
  market: SupportLocale;
  ipAddress?: string | null;
}) => {
  const email = normalizeEmail(senderEmail);
  if (!email) {
    return { duplicate: false, threadId: null, created: false };
  }

  const normalizedBody = safeText(body);
  if (!normalizedBody) {
    return { duplicate: false, threadId: null, created: false };
  }

  const subjectText = safeText(subject);
  const duplicateKey = providerMessageId ? `provider:${providerMessageId}` : `hash:${createSupportMessageHash(`${email}|${subjectText}|${normalizedBody}`)}`;
  const supabase = createSupabaseServiceRoleClient();

  const messageCheck = await supabase
    .from("support_messages")
    .select("id, provider_message_id")
    .eq("provider_message_id", providerMessageId ?? duplicateKey)
    .limit(1);

  if (messageCheck.error) {
    logSupportPersistenceError("support_messages duplicate check failed", messageCheck.error);
    return { duplicate: false, threadId: null, created: false, persistError: "duplicate_check_failed" };
  }

  if (messageCheck.data && messageCheck.data.length > 0) {
    return { duplicate: true, threadId: null, created: false };
  }

  const loop = isSupportLoopCandidate({ subject: subjectText, body: normalizedBody, senderEmail: email });
  if (loop) {
    return { duplicate: false, threadId: null, created: false, loop: true };
  }

  const classification = await classifySupportRequest({
    subject: subjectText,
    body: normalizedBody,
    market,
  });

  const existingThread = await supabase
    .from("support_threads")
    .select("id, status")
    .eq("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingThread.error) {
    logSupportPersistenceError("support_threads lookup failed", existingThread.error);
    return { duplicate: false, threadId: null, created: false, persistError: "thread_lookup_failed", classification };
  }

  const threadId = existingThread.data && existingThread.data[0]?.id ? existingThread.data[0].id : null;
  const threadStatus: SupportThreadStatus = "open";
  const triagePayload = buildTriagePayload(classification);

  let finalThreadId = threadId;
  if (!finalThreadId) {
    const threadInsert = await supabase
      .from("support_threads")
      .insert({
        customer_email: email,
        customer_name: safeText(senderName) || email.split("@")[0],
        locale: market,
        subject: subjectText || "Support request",
        status: "open",
        priority: classification.priority,
        category: classification.category,
        ai_confidence: classification.confidence,
        ...triagePayload,
      })
      .select("id")
      .single();

    if (threadInsert.error || !threadInsert.data?.id) {
      logSupportPersistenceError("support_threads insert failed", threadInsert.error ?? null);
      return { duplicate: false, threadId: null, created: false, classification, persistError: "thread_insert_failed" };
    }

    finalThreadId = threadInsert.data.id;
  }

  const messageInsert = await supabase
    .from("support_messages")
    .insert({
      thread_id: finalThreadId,
      direction: "inbound",
      sender_type: "customer",
      sender_email: email,
      body_text: normalizedBody,
      body_html: undefined,
      provider_message_id: providerMessageId || duplicateKey,
    });

  if (messageInsert.error) {
    logSupportPersistenceError("support_messages insert failed", messageInsert.error);
    return { duplicate: false, threadId: finalThreadId, created: false, classification, persistError: "message_insert_failed" };
  }

  const threadUpdate = {
    status: "open",
    updated_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
    ai_confidence: classification.confidence,
    category: classification.category,
    priority: classification.priority,
    ...triagePayload,
  };

  const updateResult = await supabase
    .from("support_threads")
    .update(threadUpdate)
    .eq("id", finalThreadId);

  if (updateResult.error) {
    logSupportPersistenceError("support_threads triage update failed", updateResult.error);
    return { duplicate: false, threadId: finalThreadId, created: false, classification, persistError: "thread_status_update_failed" };
  }

  if (classification.triageBucket === "important") {
    const notificationTitle = classification.triageCategory === "potential_customer"
      ? "Neues wichtiges Lead-Interesse"
      : "Neue wichtige Support-Mail";
    const notificationMessage = classification.triageSummary || `Wichtige Support-Mail von ${email} — ${subjectText || "Support-Anfrage"}`;

    await createAppNotification({
      companyId: INTERNAL_OWNER_COMPANY_ID,
      type: "new_inquiry",
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        threadId: finalThreadId,
        senderEmail: email,
        triageBucket: classification.triageBucket,
        triageCategory: classification.triageCategory,
        subject: subjectText || "Support request",
      },
      dedupeKey: `support-important-${finalThreadId}-${providerMessageId ?? duplicateKey}`,
    });
  }

  return {
    duplicate: false,
    threadId: finalThreadId,
    created: true,
    classification,
    status: threadStatus,
    loop: false,
    ipAddress,
  };
};

export const listSupportThreads = async (filter: "all" | "important" | "review" | "sales" | "spam" = "all") => {
  const supabase = createSupabaseServiceRoleClient();
  let query = supabase.from("support_threads").select("*");

  if (filter !== "all") {
    query = query.eq("triage_bucket", filter);
  }

  const { data, error } = await query.order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) return [] as Array<Record<string, unknown>>;
  return data ?? [];
};

export const getSupportInboxCounts = async () => {
  const rows = await listSupportThreads();
  const result = {
    important: 0,
    review: 0,
    sales: 0,
    spam: 0,
  };

  for (const row of rows) {
    const bucket = String(row.triage_bucket ?? "review").trim().toLowerCase();
    if (bucket === "important") {
      result.important += 1;
    } else if (bucket === "review") {
      result.review += 1;
    } else if (bucket === "sales") {
      result.sales += 1;
    } else if (bucket === "spam") {
      result.spam += 1;
    }
  }

  return result;
};

export const getInboxPreview = async (limit = 5) => {
  const rows = await listSupportThreads();
  return rows.slice(0, limit) as Array<Record<string, unknown>>;
};

export const getSupportThreadDetail = async (threadId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const thread = await supabase.from("support_threads").select("*").eq("id", threadId).single();
  const messages = await supabase.from("support_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true });

  return {
    thread: thread.data,
    messages: messages.data ?? [],
  };
};

export const getSupportDashboardOverview = async () => {
  const supabase = createSupabaseServiceRoleClient();
  const { data: threads, error } = await supabase.from("support_threads").select("status");

  if (error || !threads) {
    return {
      open: 0,
      escalated: 0,
      ai_answered: 0,
      waiting_customer: 0,
      resolved: 0,
    };
  }

  return {
    open: threads.filter((thread) => thread.status === "open").length,
    escalated: threads.filter((thread) => thread.status === "escalated").length,
    ai_answered: threads.filter((thread) => thread.status === "ai_answered").length,
    waiting_customer: threads.filter((thread) => thread.status === "waiting_customer").length,
    resolved: threads.filter((thread) => thread.status === "resolved").length,
  };
};

export const updateSupportThreadStatus = async ({
  threadId,
  status,
  owner_email,
}: {
  threadId: string;
  status: SupportThreadStatus;
  owner_email?: string | null;
}) => {
  const supabase = createSupabaseServiceRoleClient();
  const result = await supabase
    .from("support_threads")
    .update({
      status,
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .select("id")
    .single();

  if (owner_email) {
    await supabase.from("support_messages").insert({
      thread_id: threadId,
      direction: "outbound",
      sender_type: "owner",
      sender_email: owner_email,
      body_text: `Owner status update: ${status}`,
      body_html: `<p>Owner status update: ${status}</p>`,
    });
  }

  return result.data ?? null;
};

export const sendOwnerSupportReply = async ({
  threadId,
  actorEmail,
  body,
  market,
}: {
  threadId: string;
  actorEmail: string;
  body: string;
  market: SupportLocale;
}) => {
  const supabase = createSupabaseServiceRoleClient();
  const threadResult = await supabase.from("support_threads").select("*").eq("id", threadId).single();
  if (threadResult.error || !threadResult.data) {
    return { sent: false, error: "thread_not_found" };
  }

  const customerEmail = threadResult.data.customer_email as string;
  const normalizedBody = safeText(body);
  if (!normalizedBody) {
    return { sent: false, error: "empty_message" };
  }

  const emailResult = await sendBrevoSupportEmail({
    toEmail: customerEmail,
    subject: `Re: ${threadResult.data.subject as string}`,
    textBody: normalizedBody,
    htmlBody: `<p>${normalizedBody}</p>`,
    replyTo: actorEmail,
    market,
  });

  if (!emailResult.sent) {
    return { sent: false, error: "mail_failed" };
  }

  const insertResult = await supabase.from("support_messages").insert({
    thread_id: threadId,
    direction: "outbound",
    sender_type: "owner",
    sender_email: actorEmail,
    body_text: normalizedBody,
    body_html: `<p>${normalizedBody}</p>`,
    provider_message_id: emailResult.providerMessageId,
  });

  if (insertResult.error) {
    return { sent: false, error: insertResult.error.message };
  }

  await supabase.from("support_threads").update({
    status: "waiting_customer",
    updated_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
  }).eq("id", threadId);

  return { sent: true, error: null };
};
