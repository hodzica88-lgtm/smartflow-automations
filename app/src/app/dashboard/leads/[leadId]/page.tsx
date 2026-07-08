import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

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

type LeadDetail = {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  inquiry_type: string | null;
  notes: string | null;
  source: string | null;
  status: string;
  successful_outcome: string | null;
  unsuccessful_outcome: string | null;
  created_at: string;
  updated_at: string | null;
};

type LeadHistoryEntry = {
  id: string;
  lead_id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
};

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

const getCompanyId = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyState = await getUserCompanyState(user.id);

  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  return companyState.companyId;
};

const getLead = async (companyId: string, leadId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_id, first_name, last_name, address, phone, email, inquiry_type, notes, source, status, successful_outcome, unsuccessful_outcome, created_at, updated_at",
    )
    .eq("id", leadId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as LeadDetail | null;
};

const getLeadHistory = async (companyId: string, leadId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("lead_status_history")
    .select("id, lead_id, from_status, to_status, created_at")
    .eq("company_id", companyId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as LeadHistoryEntry[];
};

const getStatusLabel = (status: string | null | undefined) =>
  status ? STATUS_LABELS[status] ?? status : "Initialer Status";

const getOutcomeLabel = (value: string | null | undefined, kind: "successful" | "unsuccessful") => {
  const options = kind === "successful" ? SUCCESSFUL_OUTCOMES : UNSUCCESSFUL_OUTCOMES;
  return options.find((option) => option.value === value)?.label ?? value ?? "—";
};

const validateStatus = (status: string) => LEAD_STATUSES.includes(status);

export async function updateLeadDetailAction(formData: FormData) {
  "use server";

  const leadId = getString(formData, "leadId");
  const status = getString(formData, "status");
  const successfulOutcome = getString(formData, "successful_outcome");
  const unsuccessfulOutcome = getString(formData, "unsuccessful_outcome");

  if (!leadId || !validateStatus(status)) {
    redirect(`/dashboard/leads/${leadId || ""}?error=${encodeURIComponent("Ungültiger Lead-Status")}`);
  }

  const companyId = await getCompanyId();
  const supabase = createSupabaseServiceRoleClient();

  const updates: Record<string, string | null> = { status };

  if (status === "successful") {
    if (!successfulOutcome) {
      redirect(`/dashboard/leads/${leadId}?error=${encodeURIComponent("Bitte einen erfolgreichen Outcome wählen")}`);
    }
    updates.successful_outcome = successfulOutcome;
    updates.unsuccessful_outcome = null;
  } else if (status === "unsuccessful") {
    if (!unsuccessfulOutcome) {
      redirect(`/dashboard/leads/${leadId}?error=${encodeURIComponent("Bitte einen nicht erfolgreichen Outcome wählen")}`);
    }
    updates.successful_outcome = null;
    updates.unsuccessful_outcome = unsuccessfulOutcome;
  } else {
    updates.successful_outcome = null;
    updates.unsuccessful_outcome = null;
  }

  const { data: existingLead, error: existingLeadError } = await supabase
    .from("leads")
    .select("status, successful_outcome, unsuccessful_outcome")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingLeadError || !existingLead) {
    redirect(`/dashboard/leads/${leadId}?error=${encodeURIComponent("Lead nicht gefunden")}`);
  }

  const statusChanged = existingLead.status !== status;
  const outcomeChanged =
    existingLead.successful_outcome !== successfulOutcome ||
    existingLead.unsuccessful_outcome !== unsuccessfulOutcome;

  if (!statusChanged && !outcomeChanged) {
    redirect(`/dashboard/leads/${leadId}?success=1`);
  }

  const { error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) {
    redirect(`/dashboard/leads/${leadId}?error=${encodeURIComponent("Aktualisierung fehlgeschlagen")}`);
  }

  if (statusChanged) {
    const { error: historyError } = await supabase.from("lead_status_history").insert([
      {
        company_id: companyId,
        lead_id: leadId,
        from_status: existingLead.status,
        to_status: status,
      },
    ]);

    if (historyError) {
      redirect(`/dashboard/leads/${leadId}?error=${encodeURIComponent("Historie konnte nicht gespeichert werden")}`);
    }
  }

  redirect(`/dashboard/leads/${leadId}?success=1`);
}

type LeadDetailPageProps = {
  params: Promise<{ leadId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  const { leadId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const success = resolvedSearchParams?.success === "1";
  const error = resolvedSearchParams?.error ?? null;

  const companyId = await getCompanyId();
  const lead = await getLead(companyId, leadId);
  const history = await getLeadHistory(companyId, leadId);

  if (!lead) {
    notFound();
  }

  const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unbekannter Kontakt";

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/leads" style={{ color: "#3182ce", textDecoration: "none" }}>
          ← Zurück zur Übersicht
        </Link>
        <h1 style={{ margin: "8px 0 4px" }}>{leadName}</h1>
        <p style={{ margin: 0, color: "#555" }}>
          Detailansicht mit Statusverlauf und einfacher Workflow-Aktualisierung.
        </p>
      </div>

      {success ? (
        <div style={{ padding: 16, background: "#e6ffed", border: "1px solid #b7f0c6", marginBottom: 16 }}>
          Lead wurde erfolgreich aktualisiert.
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 16, background: "#ffe6e6", border: "1px solid #f0b7b7", marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 24 }}>
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: "#718096", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Lead-Daten
              </p>
              <h2 style={{ margin: "6px 0 0" }}>Kontaktdaten und Anfrage</h2>
            </div>
            <span style={{ padding: "6px 10px", borderRadius: 9999, background: "#edf2f7", fontWeight: 600 }}>
              {STATUS_LABELS[lead.status] ?? lead.status}
            </span>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div>
                <strong>Vorname</strong>
                <p style={{ margin: "4px 0 0" }}>{lead.first_name ?? "—"}</p>
              </div>
              <div>
                <strong>Nachname</strong>
                <p style={{ margin: "4px 0 0" }}>{lead.last_name ?? "—"}</p>
              </div>
              <div>
                <strong>Adresse</strong>
                <p style={{ margin: "4px 0 0" }}>{lead.address ?? "—"}</p>
              </div>
              <div>
                <strong>Telefon</strong>
                <p style={{ margin: "4px 0 0" }}>{lead.phone ?? "—"}</p>
              </div>
              <div>
                <strong>E-Mail</strong>
                <p style={{ margin: "4px 0 0" }}>{lead.email ?? "—"}</p>
              </div>
              <div>
                <strong>Anfrage-Typ</strong>
                <p style={{ margin: "4px 0 0" }}>{lead.inquiry_type ?? "—"}</p>
              </div>
              <div>
                <strong>Quelle</strong>
                <p style={{ margin: "4px 0 0" }}>{lead.source ?? "—"}</p>
              </div>
              <div>
                <strong>Status</strong>
                <p style={{ margin: "4px 0 0" }}>{STATUS_LABELS[lead.status] ?? lead.status}</p>
              </div>
              <div>
                <strong>Erfolgs-Outcome</strong>
                <p style={{ margin: "4px 0 0" }}>{getOutcomeLabel(lead.successful_outcome, "successful")}</p>
              </div>
              <div>
                <strong>Nicht-erfolgs-Outcome</strong>
                <p style={{ margin: "4px 0 0" }}>{getOutcomeLabel(lead.unsuccessful_outcome, "unsuccessful")}</p>
              </div>
              <div>
                <strong>Erstellt</strong>
                <p style={{ margin: "4px 0 0" }}>{formatTimestamp(lead.created_at)}</p>
              </div>
              <div>
                <strong>Aktualisiert</strong>
                <p style={{ margin: "4px 0 0" }}>{formatTimestamp(lead.updated_at)}</p>
              </div>
            </div>

            {lead.notes ? (
              <div>
                <strong>Beschreibung</strong>
                <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{lead.notes}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, background: "#fff" }}>
          <h2 style={{ marginTop: 0 }}>Status aktualisieren</h2>
          <form action={updateLeadDetailAction} style={{ display: "grid", gap: 12 }}>
            <input type="hidden" name="leadId" value={lead.id} />

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
              </label>
            </div>

            <button type="submit" style={{ alignSelf: "flex-start", padding: "12px 18px", borderRadius: 8, background: "#3182ce", color: "#fff", border: "none", cursor: "pointer" }}>
              Aktualisieren
            </button>
          </form>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, background: "#fff" }}>
          <h2 style={{ marginTop: 0 }}>Status-Verlauf</h2>
          {history.length === 0 ? (
            <p style={{ margin: 0, color: "#555" }}>Noch kein Verlauf vorhanden.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {history.map((entry) => (
                <li key={entry.id}>
                  <strong>{formatTimestamp(entry.created_at)}</strong>: {getStatusLabel(entry.from_status)} → {getStatusLabel(entry.to_status)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
