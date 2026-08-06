import * as XLSX from "xlsx";

import { trackAnalyticsEvent } from "@/features/analytics/events";
import { getUserCompanyState } from "@/features/onboarding/company";
import { resolveMarketFromHost } from "@/shared/i18n/market";
import { createErrorResponse } from "@/shared/lib/http/errors";
import { createEventId, logServerEvent } from "@/shared/lib/observability/logger";
import { buildRateLimitedResponse, enforceActionRateLimit } from "@/shared/lib/rate-limit/service";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";

type ExportFormat = "csv" | "xlsx";
type ExportRange = "today" | "week" | "month" | "custom";

type ExportLeadRow = {
  name: string;
  phone: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
};

const csvEscape = (value: string) => {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
};

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

const toCsv = (rows: ExportLeadRow[]) => {
  const header = ["Name", "Telefon", "E-Mail", "Nachricht", "Status", "Erstellt am"];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.name),
        csvEscape(row.phone),
        csvEscape(row.email),
        csvEscape(row.message),
        csvEscape(row.status),
        csvEscape(row.createdAt),
      ].join(","),
    );
  }

  return lines.join("\n");
};

const getRangeStart = (range: ExportRange, from: string | null) => {
  const now = new Date();

  if (range === "custom" && from) {
    const parsed = new Date(`${from}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }

  if (range === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    return start.toISOString();
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString();
  }

  return null;
};

const getRangeEnd = (range: ExportRange, to: string | null) => {
  if (range === "custom" && to) {
    const parsed = new Date(`${to}T23:59:59.999`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
};

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return createErrorResponse({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Nicht angemeldet.",
    });
  }

  const companyState = await getUserCompanyState(user.id, { allowMember: true });
  if (!companyState.companyId) {
    return createErrorResponse({
      status: 403,
      code: "FORBIDDEN",
      message: "Kein Firmenzugriff.",
    });
  }

  const rateLimit = await enforceActionRateLimit({
    scope: "leads_export",
    companyId: companyState.companyId,
    maxSubmissions: 10,
    windowMinutes: 10,
  });

  if (!rateLimit.allowed) {
    return buildRateLimitedResponse(
      "Zu viele Exportanfragen. Bitte versuchen Sie es später erneut.",
      rateLimit.retryAfterSeconds,
    );
  }

  const url = new URL(request.url);
  const formatRaw = url.searchParams.get("format");
  const rangeRaw = url.searchParams.get("range");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const format: ExportFormat = formatRaw === "xlsx" ? "xlsx" : "csv";
  const range: ExportRange =
    rangeRaw === "today" ||
    rangeRaw === "week" ||
    rangeRaw === "month" ||
    rangeRaw === "custom"
      ? rangeRaw
      : "month";

  const rangeStart = getRangeStart(range, from);
  const rangeEnd = getRangeEnd(range, to);

  const supabase = createSupabaseServiceRoleClient();
  let query = supabase
    .from("leads")
    .select("first_name, last_name, phone, email, notes, status, created_at")
    .eq("company_id", companyState.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (rangeStart) {
    query = query.gte("created_at", rangeStart);
  }

  if (rangeEnd) {
    query = query.lte("created_at", rangeEnd);
  }

  const { data, error } = await query;
  if (error) {
    const eventId = createEventId("leads_export");
    logServerEvent("error", {
      eventId,
      message: "Lead export query failed.",
      context: {
        companyId: companyState.companyId,
      },
      error,
    });

    return createErrorResponse({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Export fehlgeschlagen.",
    });
  }

  const rows: ExportLeadRow[] = (data ?? []).map((lead) => ({
    name: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unbekannt",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    message: lead.notes ?? "",
    status: lead.status ?? "",
    createdAt: formatDateTime(lead.created_at),
  }));

  const market = resolveMarketFromHost(new URL(request.url).host);
  trackAnalyticsEvent({
    eventName: "leads_export_requested",
    market,
    companyId: companyState.companyId,
    isAuthenticated: true,
    metadata: {
      format,
      range,
      rowCount: rows.length,
    },
  });

  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
      Name: row.name,
      Telefon: row.phone,
      "E-Mail": row.email,
      Nachricht: row.message,
      Status: row.status,
      "Erstellt am": row.createdAt,
    })));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "content-disposition": `attachment; filename=leads-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      status: 200,
    });
  }

  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "content-disposition": `attachment; filename=leads-export-${new Date().toISOString().slice(0, 10)}.csv`,
      "content-type": "text/csv; charset=utf-8",
    },
    status: 200,
  });
}