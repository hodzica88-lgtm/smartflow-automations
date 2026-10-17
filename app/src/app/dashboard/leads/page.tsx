import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUserCompanyAccess } from "@/features/billing/service";
import {
  getActiveCompanyTeamMembers,
  getTeamMemberLabel,
} from "@/features/team/service";
import {
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";

import LeadCards from "./LeadCards";
import {
  LEAD_STATUSES,
  STATUS_LABELS,
  primaryActionStyle,
  secondaryActionStyle,
  type LeadCard,
} from "./lead-presentation";

const LEADS_PAGE_SIZE = 50;

type LeadListItem = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  inquiry_type: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  successful_outcome: string | null;
  unsuccessful_outcome: string | null;
  assigned_user_id: string | null;
};

type LeadHistoryEntry = {
  id: string;
  lead_id: string;
  from_status: string | null;
  to_status: string;
  changed_by_user_id: string | null;
  created_at: string;
};

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const createdAtFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

const formatCreatedAt = (createdAt: string) => {
  try {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? "Invalid Date" : createdAtFormatter.format(date);
  } catch {
    return createdAt;
  }
};

const getCompanyAccess = async () => {
  const access = await requireUserCompanyAccess({
    allowMember: true,
    nextPath: "/dashboard/leads",
  });

  return {
    companyId: access.companyId,
    isOwner: access.isOwner,
    userId: access.userId,
  };
};

const getLeads = async (
  companyId: string,
  assignedFilter: string,
  page: number,
) => {
  const supabase = createSupabaseServiceRoleClient();
  const from = (page - 1) * LEADS_PAGE_SIZE;
  const to = from + LEADS_PAGE_SIZE;
  let query = supabase
    .from("leads")
    .select(
      "id, first_name, last_name, phone, email, inquiry_type, status, created_at, notes, successful_outcome, unsuccessful_outcome, assigned_user_id",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (assignedFilter === "unassigned") {
    query = query.is("assigned_user_id", null);
  } else if (assignedFilter) {
    query = query.eq("assigned_user_id", assignedFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as LeadListItem[];

  return {
    leads: rows.slice(0, LEADS_PAGE_SIZE),
    hasNext: rows.length > LEADS_PAGE_SIZE,
  };
};

const getStatusLabel = (status: string | null | undefined) =>
  status ? STATUS_LABELS[status] ?? status : "Initialer Status";

const getLeadHistory = async (companyId: string, leadIds: string[]) => {
  if (leadIds.length === 0) {
    return [] as LeadHistoryEntry[];
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("lead_status_history")
    .select("id, lead_id, from_status, to_status, changed_by_user_id, created_at")
    .eq("company_id", companyId)
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as LeadHistoryEntry[];
};

const validateStatus = (status: string) => LEAD_STATUSES.includes(status);

export async function updateLeadAction(formData: FormData) {
  "use server";

  const leadId = getString(formData, "leadId");
  const status = getString(formData, "status");
  const assignedUserIdInput = getString(formData, "assigned_user_id");
  const successfulOutcome = getString(formData, "successful_outcome");
  const unsuccessfulOutcome = getString(formData, "unsuccessful_outcome");

  if (!leadId || !validateStatus(status)) {
    redirect("/dashboard/leads?error=Ungültiger+Lead+Status");
  }

  const { companyId, userId } = await getCompanyAccess();
  const supabase = createSupabaseServiceRoleClient();
  const teamMembers = await getActiveCompanyTeamMembers(companyId);
  const assignedUserId = assignedUserIdInput || null;

  if (assignedUserId && !teamMembers.some((member) => member.id === assignedUserId)) {
    redirect("/dashboard/leads?error=Ungültige+Zuständigkeit");
  }

  const updates: Record<string, string | null> = {
    assigned_user_id: assignedUserId,
    status,
  };

  if (status === "successful") {
    if (!successfulOutcome) {
      redirect("/dashboard/leads?error=Bitte+erfolgreichen+Outcome+wählen");
    }
    updates.successful_outcome = successfulOutcome;
    updates.unsuccessful_outcome = null;
  } else if (status === "unsuccessful") {
    if (!unsuccessfulOutcome) {
      redirect("/dashboard/leads?error=Bitte+nicht-erfolgreichen+Outcome+wählen");
    }
    updates.successful_outcome = null;
    updates.unsuccessful_outcome = unsuccessfulOutcome;
  } else {
    updates.successful_outcome = null;
    updates.unsuccessful_outcome = null;
  }

  const { data: existingLead, error: existingLeadError } = await supabase
    .from("leads")
    .select("status, successful_outcome, unsuccessful_outcome, assigned_user_id")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingLeadError || !existingLead) {
    redirect("/dashboard/leads?error=Lead+nicht+gefunden");
  }

  const statusChanged = existingLead.status !== status;
  const outcomeChanged =
    existingLead.successful_outcome !== updates.successful_outcome ||
    existingLead.unsuccessful_outcome !== updates.unsuccessful_outcome;
  const assignmentChanged = existingLead.assigned_user_id !== assignedUserId;

  if (!statusChanged && !outcomeChanged && !assignmentChanged) {
    redirect("/dashboard/leads?success=1");
  }

  const { error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    redirect("/dashboard/leads?error=Aktualisierung+fehlgeschlagen");
  }

  if (statusChanged) {
    const { error: historyError } = await supabase.from("lead_status_history").insert([
      {
        company_id: companyId,
        lead_id: leadId,
        from_status: existingLead.status,
        to_status: status,
        changed_by_user_id: userId,
      },
    ]);

    if (historyError) {
      redirect("/dashboard/leads?error=Historie+konnte+nicht+gespeichert+werden");
    }
  }

  redirect("/dashboard/leads?success=1");
}

type LeadsPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    assigned?: string;
    page?: string;
  }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const [resolvedSearchParams, { companyId, isOwner }] = await Promise.all([
    searchParams ?? Promise.resolve(undefined),
    getCompanyAccess(),
  ]);
  const success = resolvedSearchParams?.success === "1";
  const error = resolvedSearchParams?.error ?? null;
  const requestedAssignedFilter = resolvedSearchParams?.assigned ?? "";
  const requestedPage = Number.parseInt(resolvedSearchParams?.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const teamMembersPromise = getActiveCompanyTeamMembers(companyId);
  const canLoadLeadsBeforeFilterValidation =
    requestedAssignedFilter === "" || requestedAssignedFilter === "unassigned";
  const earlyLeadsPromise = canLoadLeadsBeforeFilterValidation
    ? getLeads(companyId, requestedAssignedFilter, page)
    : null;
  const teamMembers = await teamMembersPromise;
  const assignedFilter =
    requestedAssignedFilter === "unassigned" ||
    teamMembers.some((member) => member.id === requestedAssignedFilter)
      ? requestedAssignedFilter
      : "";
  const { leads, hasNext } =
    earlyLeadsPromise && assignedFilter === requestedAssignedFilter
      ? await earlyLeadsPromise
      : await getLeads(companyId, assignedFilter, page);
  const historyEntries = await getLeadHistory(companyId, leads.map((lead) => lead.id));
  const memberById = new Map(teamMembers.map((member) => [member.id, member]));
  const historyByLeadId = historyEntries.reduce<Record<string, LeadHistoryEntry[]>>((acc, entry) => {
    if (!acc[entry.lead_id]) {
      acc[entry.lead_id] = [];
    }
    acc[entry.lead_id].push(entry);
    return acc;
  }, {});
  // Only the fields already displayed in the cards cross the client boundary.
  // Dates are formatted on the server to keep its timezone during hydration.
  const assigneeOptions = teamMembers.map((member) => ({
    id: member.id,
    label: getTeamMemberLabel(member),
  }));
  const leadCards: LeadCard[] = leads.map((lead) => ({
    id: lead.id,
    leadName: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unbekannter Kontakt",
    contactLabel: (lead.email ?? lead.phone) || "Keine Kontaktdaten",
    inquiryType: lead.inquiry_type ?? "Nicht angegeben",
    notes: lead.notes,
    status: lead.status,
    createdAtLabel: formatCreatedAt(lead.created_at),
    assignedUserId: lead.assigned_user_id,
    assignedLabel: getTeamMemberLabel(lead.assigned_user_id ? memberById.get(lead.assigned_user_id) : null),
    successfulOutcome: lead.successful_outcome,
    unsuccessfulOutcome: lead.unsuccessful_outcome,
    history: (historyByLeadId[lead.id] ?? []).map((entry) => ({
      id: entry.id,
      label: `${formatCreatedAt(entry.created_at)}: ${getStatusLabel(entry.from_status)} → ${getStatusLabel(entry.to_status)} · ${entry.changed_by_user_id ? getTeamMemberLabel(memberById.get(entry.changed_by_user_id)) : "Nicht erfasst"}`,
    })),
  }));
  const getPageHref = (pageNumber: number) => {
    const params = new URLSearchParams();

    if (assignedFilter) {
      params.set("assigned", assignedFilter);
    }

    if (pageNumber > 1) {
      params.set("page", String(pageNumber));
    }

    const query = params.toString();
    return query ? `/dashboard/leads?${query}` : "/dashboard/leads";
  };

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 24 }}>
      <section style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Lead-Verwaltung
        </p>
        <h1 style={{ margin: 0 }}>Ihre Leads</h1>
        <p style={{ marginTop: 8, color: "var(--muted)" }}>
          Übersicht über aktuelle Anfragen, Zuständigkeit und Lead-Status.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link href="/dashboard/leads/new" style={primaryActionStyle}>
            Telefonanfrage erfassen
          </Link>
          {isOwner ? (
            <Link href="/dashboard/team" style={secondaryActionStyle}>
              Mitarbeiter verwalten
            </Link>
          ) : null}
        </div>

        <form
          action="/api/leads/export"
          method="get"
          style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}
        >
          <label style={{ display: "grid", gap: 4 }}>
            Zeitraum
            <select name="range" defaultValue="month" style={{ minHeight: 40, borderRadius: 8, border: "1px solid var(--border)", padding: "0 8px" }}>
              <option value="today">Heute</option>
              <option value="week">Diese Woche</option>
              <option value="month">Dieser Monat</option>
              <option value="custom">Eigener Zeitraum</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            Von
            <input name="from" type="date" style={{ minHeight: 40, borderRadius: 8, border: "1px solid var(--border)", padding: "0 8px" }} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            Bis
            <input name="to" type="date" style={{ minHeight: 40, borderRadius: 8, border: "1px solid var(--border)", padding: "0 8px" }} />
          </label>

          <button name="format" value="csv" type="submit" style={secondaryActionStyle}>
            CSV Export
          </button>
          <button name="format" value="xlsx" type="submit" style={secondaryActionStyle}>
            Excel Export
          </button>
        </form>
      </section>

      {success ? (
        <div style={{ padding: 16, background: "rgba(46,204,113,0.12)", border: "1px solid color-mix(in srgb, var(--success) 45%, var(--border))", borderRadius: 8, marginBottom: 16, overflowWrap: "anywhere" }}>
          Lead wurde erfolgreich aktualisiert.
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 16, background: "rgba(231,76,60,0.12)", border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))", borderRadius: 8, marginBottom: 16, overflowWrap: "anywhere" }}>
          {error}
        </div>
      ) : null}

      <section style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)" }}>
        <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", flex: "1 1 260px", gap: 4 }}>
            Nach Zuständigkeit filtern
            <select name="assigned" defaultValue={assignedFilter} style={{ minHeight: 42, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <option value="">Alle Leads</option>
              <option value="unassigned">Nicht zugewiesen</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {getTeamMemberLabel(member)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" style={secondaryActionStyle}>
            Anzeigen
          </button>
        </form>
      </section>

      <section>
        <LeadCards
          leads={leadCards}
          teamMembers={assigneeOptions}
          updateLeadAction={updateLeadAction}
        />

        {page > 1 || hasNext ? (
          <nav
            aria-label="Lead-Seiten"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 20,
            }}
          >
            {page > 1 ? (
              <Link href={getPageHref(page - 1)} style={secondaryActionStyle}>
                Zurück
              </Link>
            ) : (
              <span />
            )}

            <span style={{ color: "var(--muted)", fontSize: 14 }}>Seite {page}</span>

            {hasNext ? (
              <Link href={getPageHref(page + 1)} style={secondaryActionStyle}>
                Weiter
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
