import { INTERNAL_OWNER_COMPANY_ID } from "@/features/operator/internal-company";
import { composeTransactionalEmail } from "@/features/email/service";
import { createAppNotification } from "@/features/notifications/service";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { enforceActionRateLimit } from "@/shared/lib/rate-limit/service";
import { loadServerEnv } from "@/shared/config/env";
import type { MarketCode } from "@/shared/i18n/market";

import {
  PARTNER_APPLICATION_STATUSES,
  type PartnerApplicationInput,
  type PartnerApplicationRecord,
  type PartnerApplicationStatus,
  validatePartnerApplicationInput,
} from "./application";

const sendPartnerApplicationEmails = async ({
  applicationId,
  market,
  fullName,
  companyName,
  email,
  country,
  description,
}: {
  applicationId: string;
  market: MarketCode;
  fullName: string;
  companyName: string;
  email: string;
  country: string;
  description: string;
}) => {
  const serverEnv = loadServerEnv();
  const senderEmail = serverEnv.brevoSenderEmail?.trim();
  const senderName = serverEnv.brevoSenderName?.trim() || "Varnito";
  const apiKey = serverEnv.brevoApiKey?.trim();
  const internalOwnerRecipient = serverEnv.supportOwnerAlertEmail?.trim() || serverEnv.supportEmail?.trim() || senderEmail;

  if (!apiKey || !senderEmail) {
    return;
  }

  const applicantEmail = composeTransactionalEmail(
    "partner_application_received",
    {
      partner_name: fullName,
      company_name: companyName,
      partner_email: email,
      partner_country: country,
      partner_message: description,
    },
    { companyName },
    { market },
  );

  const ownerEmail = composeTransactionalEmail(
    "partner_application_internal_notice",
    {
      partner_name: fullName,
      company_name: companyName,
      partner_email: email,
      partner_country: country,
      partner_message: description,
      dashboard_url: `${market === "us" ? "https://varnito.com" : "https://varnito.de"}/operator/owner`,
    },
    { companyName },
    { market },
  );

  const requests = [
    {
      to: [{ email, name: fullName }],
      subject: applicantEmail.subject,
      htmlContent: applicantEmail.htmlContent,
    },
    {
      to: [{ email: internalOwnerRecipient, name: senderName }],
      subject: ownerEmail.subject,
      htmlContent: ownerEmail.htmlContent,
    },
  ];

  for (const request of requests) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: senderEmail,
            name: senderName,
          },
          to: request.to,
          subject: request.subject,
          htmlContent: request.htmlContent,
        }),
      });

      if (!response.ok) {
        const errorDetails = await response.text().catch(() => "");
        console.warn("Partner application email delivery failed", {
          applicationId,
          status: response.status,
          error: errorDetails,
        });
      }
    } catch (error) {
      console.warn("Partner application email delivery threw an error", {
        applicationId,
        error,
      });
    }
  }
};

export const submitPartnerApplication = async (input: PartnerApplicationInput) => {
  const validation = validatePartnerApplicationInput(input);

  if (!validation.ok) {
    return { ok: false as const, status: 400, error: validation.error };
  }

  const rateLimit = await enforceActionRateLimit({
    scope: "partner_application_public",
    maxSubmissions: 5,
    windowMinutes: 60,
  });

  if (!rateLimit.allowed) {
    return {
      ok: false as const,
      status: 429,
      error: validation.normalized.market === "us"
        ? "Too many partner applications were submitted recently. Please try again later."
        : "Zu viele Partner-Bewerbungen in kurzer Zeit. Bitte versuchen Sie es später erneut.",
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("partner_applications")
    .insert({
      full_name: validation.normalized.fullName,
      company_name: validation.normalized.companyName,
      email: validation.normalized.email,
      website: validation.normalized.website,
      country: validation.normalized.country,
      description: validation.normalized.description,
      privacy_accepted: validation.normalized.privacyAccepted,
      source: validation.normalized.source,
      status: "new",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("Failed to create partner application", error);
    return {
      ok: false as const,
      status: 500,
      error: validation.normalized.market === "us"
        ? "We could not submit your application right now. Please try again in a moment."
        : "Ihre Bewerbung konnte derzeit nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    };
  }

  try {
    await createAppNotification({
      companyId: INTERNAL_OWNER_COMPANY_ID,
      type: "new_inquiry",
      title: validation.normalized.market === "us" ? "New partner application" : "Neue Partner-Bewerbung",
      message: `${validation.normalized.companyName} submitted a partner application.`,
      dedupeKey: `partner_application:${data.id}`,
      metadata: {
        applicationId: data.id,
        partnerName: validation.normalized.fullName,
        companyName: validation.normalized.companyName,
        email: validation.normalized.email,
        country: validation.normalized.country,
        source: validation.normalized.source,
      },
    });
  } catch (notificationError) {
    console.warn("Partner application notification failed", notificationError);
  }

  await sendPartnerApplicationEmails({
    applicationId: data.id,
    market: validation.normalized.market,
    fullName: validation.normalized.fullName,
    companyName: validation.normalized.companyName,
    email: validation.normalized.email,
    country: validation.normalized.country,
    description: validation.normalized.description,
  });

  return {
    ok: true as const,
    applicationId: data.id,
  };
};

export const listPartnerApplications = async ({ status, limit = 100 }: { status?: PartnerApplicationStatus; limit?: number } = {}) => {
  const supabase = createSupabaseServiceRoleClient();

  let query = supabase
    .from("partner_applications")
    .select("id, full_name, company_name, email, website, country, description, source, status, privacy_accepted, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    full_name: String(row.full_name ?? ""),
    company_name: String(row.company_name ?? ""),
    email: String(row.email ?? ""),
    website: typeof row.website === "string" && row.website.trim().length > 0 ? row.website : null,
    country: String(row.country ?? ""),
    description: String(row.description ?? ""),
    source: String(row.source ?? "public_form"),
    status: (row.status as PartnerApplicationStatus) ?? "new",
    privacy_accepted: Boolean(row.privacy_accepted),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  })) as PartnerApplicationRecord[];
};

export const getPartnerApplicationById = async (applicationId: string) => {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("partner_applications")
    .select("id, full_name, company_name, email, website, country, description, source, status, privacy_accepted, created_at, updated_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: String(data.id ?? ""),
    full_name: String(data.full_name ?? ""),
    company_name: String(data.company_name ?? ""),
    email: String(data.email ?? ""),
    website: typeof data.website === "string" && data.website.trim().length > 0 ? data.website : null,
    country: String(data.country ?? ""),
    description: String(data.description ?? ""),
    source: String(data.source ?? "public_form"),
    status: (data.status as PartnerApplicationStatus) ?? "new",
    privacy_accepted: Boolean(data.privacy_accepted),
    created_at: String(data.created_at ?? new Date().toISOString()),
    updated_at: String(data.updated_at ?? new Date().toISOString()),
  } as PartnerApplicationRecord;
};

export const updatePartnerApplicationStatus = async ({
  applicationId,
  status,
}: {
  applicationId: string;
  status: string;
}) => {
  if (!applicationId || !PARTNER_APPLICATION_STATUSES.includes(status as PartnerApplicationStatus)) {
    return { ok: false as const, error: "Invalid status." };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("partner_applications")
    .update({
      status: status as PartnerApplicationStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    return { ok: false as const, error: "Could not update application state." };
  }

  return { ok: true as const };
};
