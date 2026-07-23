import Link from "next/link";
import { redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
import {
  getActiveCompanyTeamMembers,
  getTeamMemberLabel,
} from "@/features/team/service";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  new: "Neue Anfrage",
  contacted: "Kontaktiert",
  successful: "Erfolgreich",
  unsuccessful: "Nicht erfolgreich",
};

const SUCCESSFUL_OUTCOMES = [
  { value: "appointment_scheduled", label: "Termin vereinbart" },
  { value: "offer_created", label: "Angebot erstellt" },
  { value: "job_won", label: "Auftrag erhalten" },
];

const UNSUCCESSFUL_OUTCOMES = [
  { value: "price_comparison", label: "Preisvergleich" },
  { value: "no_interest", label: "Kein Interesse" },
  { value: "unreachable", label: "Nicht erreichbar" },
  { value: "outside_service_area", label: "Außerhalb Einsatzgebiet" },
  { value: "too_expensive", label: "Zu teuer" },
  { value: "other", label: "Sonstiges" },
];

const LEAD_STATUSES = ["new", "contacted", "successful", "unsuccessful"];

const primaryActionStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "2.75rem",
  padding: "12px 18px",
  borderRadius: 8,
  background: "#3182ce",
  color: "#fff",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
} as const;

const secondaryActionStyle = {
  ...primaryActionStyle,
  background: "#fff",
  color: "#1a202c",
  border: "1px solid #cbd5e0",
} as const;

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

const formatCreatedAt = (createdAt: string) => {
  try {
    return new Date(createdAt).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return createdAt;
  }
};

const getCompanyAccess = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyState = await getUserCompanyState(user.id, { allowMember: true });
  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  return {
    companyId: companyState.companyId,
    isOwner: companyState.isOwner,
    userId: user.id,
  };
};

const getLeads = async (companyId: string, assignedFilter: string) => {
  const supabase = createSupabaseServiceRoleClient();
  let query = supabase
    .from("leads")
    .select(
      "id, first_name, last_name, phone, email, inquiry_type, status, created_at, notes, successful_outcome, unsuccessful_outcome, assigned_user_id",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (assignedFilter === "unassigned") {
    query = query.is("assigned_user_id", null);
  } else if (assignedFilter) {
    query = query.eq("assigned_user_id", assignedFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as LeadListItem[];
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
  }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { companyId, isOwner } = await getCompanyAccess();
  const success = resolvedSearchParams?.success === "1";
  const error = resolvedSearchParams?.error ?? null;
  const teamMembers = await getActiveCompanyTeamMembers(companyId);
  const requestedAssignedFilter = resolvedSearchParams?.assigned ?? "";
  const assignedFilter =
    requestedAssignedFilter === "unassigned" ||
    teamMembers.some((member) => member.id === requestedAssignedFilter)
      ? requestedAssignedFilter
      : "";
  const leads = await getLeads(companyId, assignedFilter);
  const historyEntries = await getLeadHistory(companyId, leads.map((lead) => lead.id));
  const memberById = new Map(teamMembers.map((member) => [member.id, member]));
  const historyByLeadId = historyEntries.reduce<Record<string, LeadHistoryEntry[]>>((acc, entry) => {
    if (!acc[entry.lead_id]) {
      acc[entry.lead_id] = [];
    }
    acc[entry.lead_id].push(entry);
    return acc;
  }, {});

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 24 }}>
      <section style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Lead-Verwaltung
        </p>
        <h1 style={{ margin: 0 }}>Ihre Leads</h1>
        <p style={{ marginTop: 8, color: "#555" }}>
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
      </section>

      {success ? (
        <div style={{ padding: 16, background: "#e6ffed", border: "1px solid #b7f0c6", borderRadius: 8, marginBottom: 16, overflowWrap: "anywhere" }}>
          Lead wurde erfolgreich aktualisiert.
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 16, background: "#ffe6e6", border: "1px solid #f0b7b7", borderRadius: 8, marginBottom: 16, overflowWrap: "anywhere" }}>
          {error}
        </div>
      ) : null}

      <section style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
        <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", flex: "1 1 260px", gap: 4 }}>
            Nach Zuständigkeit filtern
            <select name="assigned" defaultValue={assignedFilter} style={{ minHeight: 42, padding: "0 10px", borderRadius: 8, border: "1px solid #cbd5e0" }}>
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
        <div style={{ display: "grid", gap: 16 }}>
          {leads.length === 0 ? (
            <div style={{ padding: 24, border: "1px solid #ddd", borderRadius: 8 }}>
              <h2>Keine Leads vorhanden</h2>
              <p>Für diese Auswahl sind aktuell keine Anfragen vorhanden.</p>
            </div>
          ) : (
            leads.map((lead) => {
              const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unbekannter Kontakt";
              const isNew = lead.status === "new";
              const assignedMember = lead.assigned_user_id
                ? memberById.get(lead.assigned_user_id)
                : null;

              return (
                <article
                  key={lead.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 18,
                    background: isNew ? "#f8fdf4" : "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, color: "#718096" }}>Lead</p>
                      <h2 style={{ margin: "4px 0 0", fontSize: 20 }}>
                        <Link href={`/dashboard/leads/${lead.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {leadName}
                        </Link>
                      </h2>
                      <p style={{ margin: "8px 0 0", color: "#4a5568", overflowWrap: "anywhere" }}>
                        {(lead.email ?? lead.phone) || "Keine Kontaktdaten"}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 9999,
                          background: isNew ? "#def1ff" : "#edf2f7",
                          color: "#1a202c",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      <p style={{ margin: "8px 0 0", color: "#718096", fontSize: 13 }}>
                        {formatCreatedAt(lead.created_at)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13, color: "#4a5568", fontWeight: 600 }}>Zuständig</span>
                      <span style={{ overflowWrap: "anywhere" }}>{getTeamMemberLabel(assignedMember)}</span>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13, color: "#4a5568", fontWeight: 600 }}>Anfrage-Typ</span>
                      <span style={{ overflowWrap: "anywhere" }}>{lead.inquiry_type ?? "Nicht angegeben"}</span>
                    </div>

                    {lead.notes ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 13, color: "#4a5568", fontWeight: 600 }}>Beschreibung</span>
                        <span style={{ overflowWrap: "anywhere" }}>{lead.notes}</span>
                      </div>
                    ) : null}

                    <form action={updateLeadAction} style={{ display: "grid", gap: 12 }}>
                      <input type="hidden" name="leadId" value={lead.id} />

                      <label style={{ display: "grid", gap: 4 }}>
                        Zuständig
                        <select name="assigned_user_id" defaultValue={lead.assigned_user_id ?? ""} style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}>
                          <option value="">Nicht zugewiesen</option>
                          {teamMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {getTeamMemberLabel(member)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 4 }}>
                        Status
                        <select name="status" defaultValue={lead.status} style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}>
                          {LEAD_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {STATUS_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div style={{ display: "grid", gap: 12 }}>
                        <label style={{ display: "grid", gap: 4 }}>
                          Erfolgreiches Ergebnis
                          <select name="successful_outcome" defaultValue={lead.successful_outcome ?? ""} style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}>
                            <option value="" disabled>Bitte wählen</option>
                            {SUCCESSFUL_OUTCOMES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span style={{ fontSize: 12, color: "#718096" }}>
                            Nur wählen, wenn Status auf „Erfolgreich“ gesetzt ist.
                          </span>
                        </label>

                        <label style={{ display: "grid", gap: 4 }}>
                          Nicht erfolgreich
                          <select name="unsuccessful_outcome" defaultValue={lead.unsuccessful_outcome ?? ""} style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}>
                            <option value="" disabled>Bitte wählen</option>
                            {UNSUCCESSFUL_OUTCOMES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span style={{ fontSize: 12, color: "#718096" }}>
                            Nur wählen, wenn Status auf „Nicht erfolgreich“ gesetzt ist.
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        style={{ ...primaryActionStyle, alignSelf: "flex-start" }}
                      >
                        Aktualisieren
                      </button>
                    </form>

                    {historyByLeadId[lead.id]?.length ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
                        <p style={{ margin: 0, fontSize: 13, color: "#4a5568", fontWeight: 700 }}>
                          Verlauf
                        </p>
                        <ul style={{ margin: 0, paddingLeft: 16, color: "#4a5568" }}>
                          {historyByLeadId[lead.id].map((entry) => {
                            const actor = entry.changed_by_user_id
                              ? getTeamMemberLabel(memberById.get(entry.changed_by_user_id))
                              : "Nicht erfasst";

                            return (
                              <li key={entry.id} style={{ marginBottom: 4, overflowWrap: "anywhere" }}>
                                {formatCreatedAt(entry.created_at)}: {getStatusLabel(entry.from_status)} → {getStatusLabel(entry.to_status)} · {actor}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
