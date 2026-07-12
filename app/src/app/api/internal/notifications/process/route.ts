import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { loadServerEnv } from "@/shared/config/env";
import { sendLeadPushNotificationsForCompany } from "@/features/push/server";

const INTERNAL_API_SECRET_HEADER = "x-internal-api-secret";
const MAX_QUEUE_BATCH = 25;
const BREVO_SMTP_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const BLOCKED_OWNER_NOTIFICATION_RECIPIENT = "test@smartflow.local";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TOTAL_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES_BY_ATTEMPT: Record<number, number> = {
  1: 1,
  2: 3,
  3: 10,
  4: 15,
};
const TEMPORARY_HTTP_STATUSES = new Set([408, 425, 429]);

type NotificationQueueItem = {
  id: string;
  company_id: string;
  lead_id: string;
  notification_type: string;
  status: string;
  scheduled_for: string;
  attempt_count: number;
  last_attempt_at: string | null;
  processing_started_at: string | null;
};

type CompanyData = {
  id: string;
  name: string;
  owner_user_id: string;
  email: string;
  notification_email: string | null;
  contact_person: string | null;
};

type UserData = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type LeadData = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  inquiry_type: string | null;
  notes: string | null;
  created_at: string;
};

type BrevoEmailAddress = {
  email: string;
  name?: string;
};

type BrevoEmailPayload = {
  sender: BrevoEmailAddress;
  to: BrevoEmailAddress[];
  subject: string;
  htmlContent: string;
  replyTo?: BrevoEmailAddress;
};

type ProcessedNotificationSummary = {
  id: string;
  notification_type: string;
  status: "sent" | "failed";
  error_message?: string | null;
};

type BrevoErrorDetails = {
  message: string | null;
  code: string | null;
};

export const runtime = "nodejs";

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const normalizeEmail = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isValidEmail = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return value.length <= 320 && EMAIL_REGEX.test(value);
};

const isBlockedOwnerRecipientEmail = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    return false;
  }

  const [, domain] = normalized.split("@");
  if (!domain) {
    return false;
  }

  return normalized === BLOCKED_OWNER_NOTIFICATION_RECIPIENT || domain.endsWith(".local");
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getLeadFullName = (lead: LeadData) => {
  const first = lead.first_name?.trim() ?? "";
  const last = lead.last_name?.trim() ?? "";
  const fullName = `${first} ${last}`.trim();

  return fullName.length > 0 ? fullName : null;
};

const renderLeadValue = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? escapeHtml(normalized) : "Nicht angegeben";
};

const getMissingBrevoEnv = (serverEnv: ReturnType<typeof loadServerEnv>) => {
  const missing: string[] = [];

  if (!serverEnv.brevoApiKey) {
    missing.push("BREVO_API_KEY");
  }
  if (!serverEnv.brevoSenderEmail) {
    missing.push("BREVO_SENDER_EMAIL");
  }
  if (!serverEnv.brevoSenderName) {
    missing.push("BREVO_SENDER_NAME");
  }

  return missing;
};

const buildCustomerConfirmationHtml = (companyName: string, lead: LeadData) => {
  const leadName = getLeadFullName(lead);

  return `
<div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:640px;margin:0 auto;">
  <h2 style="margin-bottom:16px;color:#1a1a1a;">Ihre Anfrage ist eingegangen</h2>
  <p>Hallo ${leadName ? escapeHtml(leadName) : ""},</p>
  <p>vielen Dank für Ihre Anfrage bei ${escapeHtml(companyName)}. Wir haben Ihre Nachricht erhalten und melden uns in der Regel zeitnah bei Ihnen.</p>
  <p>Falls Sie weitere Informationen ergänzen möchten, können Sie einfach auf diese E-Mail antworten.</p>
  <p style="margin-top:24px;">Freundliche Grüße<br/>${escapeHtml(companyName)}</p>
</div>
`.trim();
};

const buildOwnerNewLeadHtml = (companyName: string, lead: LeadData, dashboardUrl: string) => {
  const leadName = getLeadFullName(lead) ?? "Nicht angegeben";

  return `
<div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:680px;margin:0 auto;">
  <h2 style="margin-bottom:16px;color:#1a1a1a;">Neue Anfrage über AnfragePilot</h2>
  <p>Für ${escapeHtml(companyName)} wurde eine neue Anfrage erfasst.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:180px;">Name</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(leadName)}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Telefon</td>
      <td style="padding:8px;border:1px solid #ddd;">${renderLeadValue(lead.phone)}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">E-Mail</td>
      <td style="padding:8px;border:1px solid #ddd;">${renderLeadValue(lead.email)}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Anfrageart</td>
      <td style="padding:8px;border:1px solid #ddd;">${renderLeadValue(lead.inquiry_type)}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Nachricht</td>
      <td style="padding:8px;border:1px solid #ddd;">${renderLeadValue(lead.notes)}</td>
    </tr>
  </table>
  <p><a href="${escapeHtml(dashboardUrl)}" style="color:#0a66c2;">Lead im Dashboard öffnen</a></p>
</div>
`.trim();
};

const extractBrevoErrorDetails = async (response: Response): Promise<BrevoErrorDetails> => {
  try {
    const raw = await response.text();
    if (!raw) {
      return { message: null, code: null };
    }

    try {
      const parsed = JSON.parse(raw) as { message?: unknown; code?: unknown };
      const message =
        typeof parsed.message === "string" && parsed.message.trim().length > 0
          ? parsed.message.trim()
          : null;
      const code =
        typeof parsed.code === "string" && parsed.code.trim().length > 0
          ? parsed.code.trim()
          : null;

      return { message, code };
    } catch {
      const fallback = raw.slice(0, 240).trim();
      return { message: fallback.length > 0 ? fallback : null, code: null };
    }
  } catch {
    return { message: null, code: null };
  }
};

const formatBrevoErrorMessage = (status: number, details: BrevoErrorDetails) => {
  if (details.message && details.code) {
    return `Brevo API error (${status}): ${details.message} (${details.code}).`;
  }

  if (details.message) {
    return `Brevo API error (${status}): ${details.message}.`;
  }

  if (details.code) {
    return `Brevo API error (${status}): ${details.code}.`;
  }

  return `Brevo API error (${status}).`;
};

const getRetryDelayMinutes = (attemptCount: number) =>
  RETRY_DELAY_MINUTES_BY_ATTEMPT[attemptCount] ?? null;

const getRetryScheduledFor = (attemptCount: number) => {
  const delayMinutes = getRetryDelayMinutes(attemptCount);
  if (!delayMinutes) {
    return null;
  }

  return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
};

const isTemporaryBrevoHttpFailure = (status: number) =>
  TEMPORARY_HTTP_STATUSES.has(status) || status >= 500;

export async function POST(request: Request) {
  const serverEnv = loadServerEnv();
  const internalApiSecret = serverEnv.internalApiSecret;

  if (!internalApiSecret) {
    return jsonResponse(
      {
        ok: false,
        processed: 0,
        failed: 0,
        skippedFuture: 0,
        processedIds: [],
        results: [],
        message: "Internal API secret is not configured.",
      },
      500,
    );
  }

  const providedSecret = request.headers.get(INTERNAL_API_SECRET_HEADER);

  if (!providedSecret || providedSecret !== internalApiSecret) {
    return jsonResponse(
      {
        ok: false,
        processed: 0,
        failed: 0,
        skippedFuture: 0,
        processedIds: [],
        results: [],
        message: "Unauthorized.",
      },
      401,
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  const { data: queueItems, error: queueError } = await supabase.rpc(
    "claim_notification_queue_items",
    { p_batch_size: MAX_QUEUE_BATCH },
  );

  if (queueError) {
    return jsonResponse(
      {
        ok: false,
        processed: 0,
        failed: 0,
        skippedFuture: 0,
        processedIds: [],
        results: [],
        message: `Failed to load notification queue: ${queueError.message}`,
      },
      500,
    );
  }

  const items = (queueItems ?? []) as NotificationQueueItem[];

  const { count: futureCount, error: futureCountError } = await supabase
    .from("notification_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gt("scheduled_for", now);

  const skippedFuture = futureCountError ? 0 : futureCount ?? 0;

  if (items.length === 0) {
    return jsonResponse(
      {
        ok: true,
        processed: 0,
        failed: 0,
        skippedFuture,
        processedIds: [],
        results: [],
        message: "No due notifications to process.",
      },
      200,
    );
  }

  const missingBrevoEnv = getMissingBrevoEnv(serverEnv);
  const results: ProcessedNotificationSummary[] = [];
  const processedIds: string[] = [];
  let processedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    try {
      let errorMessage: string | null = null;
      const attemptCount = item.attempt_count;
      const canRetry = attemptCount < MAX_TOTAL_ATTEMPTS;

      if (missingBrevoEnv.length > 0) {
        throw new Error(
          `Missing Brevo configuration: ${missingBrevoEnv.join(", ")}. Notifications cannot be sent.`,
        );
      }

      if (!isValidEmail(serverEnv.brevoSenderEmail)) {
        throw new Error("BREVO_SENDER_EMAIL is missing or invalid.");
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, name, owner_user_id, email, notification_email, contact_person")
        .eq("id", item.company_id)
        .single();

      if (companyError || !company) {
        throw new Error(
          `Failed to fetch company data: ${companyError?.message || "Company not found"}`,
        );
      }

      const { data: owner, error: ownerError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("id", (company as CompanyData).owner_user_id)
        .single();

      if (ownerError || !owner) {
        throw new Error(
          `Failed to fetch owner email: ${ownerError?.message || "Owner not found"}`,
        );
      }

      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select(
          "id, first_name, last_name, email, phone, inquiry_type, notes, created_at",
        )
        .eq("id", item.lead_id)
        .eq("company_id", item.company_id)
        .single();

      if (leadError || !lead) {
        throw new Error(
          `Failed to fetch lead data: ${leadError?.message || "Lead not found"}`,
        );
      }

      const companyData = company as CompanyData;
      const ownerData = owner as UserData;
      const leadData = lead as LeadData;
      const dashboardUrl = `${serverEnv.appUrl}/dashboard/leads/${item.lead_id}`;

      const sender = {
        email: serverEnv.brevoSenderEmail as string,
        name: serverEnv.brevoSenderName as string,
      };

      const companyEmail = normalizeEmail(companyData.email);
      const companyNotificationEmail = normalizeEmail(companyData.notification_email);
      const ownerEmail = normalizeEmail(ownerData.email);
      const leadEmail = normalizeEmail(leadData.email);

      let brevoPayload: BrevoEmailPayload;

      if (item.notification_type === "customer_confirmation") {
        if (!leadEmail || !isValidEmail(leadEmail)) {
          throw new Error(
            "Missing or invalid recipient email for customer_confirmation (lead.email).",
          );
        }

        const replyToCandidate =
          (companyEmail && isValidEmail(companyEmail) && companyEmail) ||
          (ownerEmail && isValidEmail(ownerEmail) && ownerEmail) ||
          null;

        brevoPayload = {
          sender,
          to: [
            {
              email: leadEmail,
              name: getLeadFullName(leadData) ?? undefined,
            },
          ],
          subject: "Ihre Anfrage ist eingegangen",
          htmlContent: buildCustomerConfirmationHtml(companyData.name, leadData),
          ...(replyToCandidate
            ? {
                replyTo: {
                  email: replyToCandidate,
                  name: companyData.contact_person ?? companyData.name,
                },
              }
            : {}),
        };
      } else if (item.notification_type === "owner_new_lead") {
        const ownerRecipientEmail =
          (companyNotificationEmail && isValidEmail(companyNotificationEmail) && !isBlockedOwnerRecipientEmail(companyNotificationEmail) && companyNotificationEmail) ||
          (companyEmail && isValidEmail(companyEmail) && !isBlockedOwnerRecipientEmail(companyEmail) && companyEmail) ||
          null;

        if (!ownerRecipientEmail) {
          throw new Error(
            "Missing or invalid recipient email for owner_new_lead. Please set a valid Benachrichtigungs-E-Mail or company email (non-.local).",
          );
        }

        brevoPayload = {
          sender,
          to: [
            {
              email: ownerRecipientEmail,
              name: companyData.contact_person ?? ownerData.full_name ?? undefined,
            },
          ],
          subject: "Neue Anfrage über AnfragePilot",
          htmlContent: buildOwnerNewLeadHtml(companyData.name, leadData, dashboardUrl),
          ...(leadEmail && isValidEmail(leadEmail)
            ? {
                replyTo: {
                  email: leadEmail,
                  name: getLeadFullName(leadData) ?? undefined,
                },
              }
            : {}),
        };
      } else {
        throw new Error(`Unsupported notification type: ${item.notification_type}`);
      }

      const brevoResponse = await fetch(BREVO_SMTP_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": serverEnv.brevoApiKey as string,
          idempotencyKey: item.id,
        },
        body: JSON.stringify(brevoPayload),
      });

      const updateNow = new Date().toISOString();

      if (brevoResponse.ok) {
        let providerMessageId: string | null = null;

        try {
          const parsed = (await brevoResponse.json()) as { messageId?: unknown };
          providerMessageId =
            typeof parsed.messageId === "string" && parsed.messageId.trim().length > 0
              ? parsed.messageId.trim()
              : null;
        } catch {
          providerMessageId = null;
        }

        const { error: updateError } = await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            sent_at: updateNow,
            updated_at: updateNow,
            processing_started_at: null,
            error_message: null,
            provider_message_id: providerMessageId,
          })
          .eq("id", item.id)
          .eq("status", "processing");

        if (updateError) {
          throw updateError;
        }

        processedCount += 1;
        processedIds.push(item.id);
        results.push({
          id: item.id,
          notification_type: item.notification_type,
          status: "sent",
        });

        if (item.notification_type === "owner_new_lead") {
          try {
            await sendLeadPushNotificationsForCompany({
              companyId: item.company_id,
              leadId: item.lead_id,
            });
          } catch (pushError) {
            console.warn("Push notification delivery could not be completed.", {
              companyId: item.company_id,
              leadId: item.lead_id,
              message: pushError instanceof Error ? pushError.message : "Unknown error",
            });
          }
        }
        continue;
      }

      const brevoErrorDetails = await extractBrevoErrorDetails(brevoResponse);
      const brevoCode = brevoErrorDetails.code?.toLowerCase() ?? null;

      if (brevoCode === "duplicate_parameter") {
        const { error: updateError } = await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            sent_at: updateNow,
            updated_at: updateNow,
            processing_started_at: null,
            error_message: null,
          })
          .eq("id", item.id)
          .eq("status", "processing");

        if (updateError) {
          throw updateError;
        }

        processedCount += 1;
        processedIds.push(item.id);
        results.push({
          id: item.id,
          notification_type: item.notification_type,
          status: "sent",
        });
        continue;
      }

      errorMessage = formatBrevoErrorMessage(brevoResponse.status, brevoErrorDetails);

      if (isTemporaryBrevoHttpFailure(brevoResponse.status) && canRetry) {
        const retryScheduledFor = getRetryScheduledFor(attemptCount);

        const { error: updateError } = await supabase
          .from("notification_queue")
          .update({
            status: "pending",
            scheduled_for: retryScheduledFor,
            updated_at: updateNow,
            processing_started_at: null,
            error_message: errorMessage,
          })
          .eq("id", item.id)
          .eq("status", "processing");

        if (updateError) {
          throw updateError;
        }

        failedCount += 1;
        results.push({
          id: item.id,
          notification_type: item.notification_type,
          status: "failed",
          error_message: errorMessage,
        });
        continue;
      }

      const { error: updateError } = await supabase
        .from("notification_queue")
        .update({
          status: "failed",
          updated_at: updateNow,
          processing_started_at: null,
          error_message: errorMessage,
        })
        .eq("id", item.id)
        .eq("status", "processing");

      if (updateError) {
        throw updateError;
      }

      failedCount += 1;
      results.push({
        id: item.id,
        notification_type: item.notification_type,
        status: "failed",
        error_message: errorMessage,
      });
    } catch (error) {
      const caughtMessage = error instanceof Error ? error.message : "Unknown error";
      const updateNow = new Date().toISOString();

      const attemptCount = item.attempt_count;
      const canRetry = attemptCount < MAX_TOTAL_ATTEMPTS;
      const isTemporaryNetworkError = error instanceof TypeError;

      if (isTemporaryNetworkError && canRetry) {
        const retryScheduledFor = getRetryScheduledFor(attemptCount);

        await supabase
          .from("notification_queue")
          .update({
            status: "pending",
            scheduled_for: retryScheduledFor,
            updated_at: updateNow,
            processing_started_at: null,
            error_message: `Temporary delivery error: ${caughtMessage}`,
          })
          .eq("id", item.id)
          .eq("status", "processing");

        failedCount += 1;
        results.push({
          id: item.id,
          notification_type: item.notification_type,
          status: "failed",
          error_message: `Temporary delivery error: ${caughtMessage}`,
        });
        continue;
      }

      await supabase
        .from("notification_queue")
        .update({
          status: "failed",
          updated_at: updateNow,
          processing_started_at: null,
          error_message: caughtMessage,
        })
        .eq("id", item.id)
        .eq("status", "processing");

      failedCount += 1;
      results.push({
        id: item.id,
        notification_type: item.notification_type,
        status: "failed",
        error_message: caughtMessage,
      });
    }
  }

  return jsonResponse(
    {
      ok: processedCount > 0 || failedCount === 0,
      processed: processedCount,
      failed: failedCount,
      skippedFuture,
      processedIds,
      results,
      message:
        failedCount > 0
          ? "Notification processing completed with partial failures."
          : "Notification processing completed.",
    },
    200,
  );
}
