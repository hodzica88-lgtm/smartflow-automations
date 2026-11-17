"use client";

import Link from "next/link";

import {
  LEAD_STATUSES,
  STATUS_LABELS,
  SUCCESSFUL_OUTCOMES,
  UNSUCCESSFUL_OUTCOMES,
  primaryActionStyle,
  type LeadAssignee,
  type LeadCard,
} from "./lead-presentation";

type LeadCardsProps = {
  leads: LeadCard[];
  teamMembers: LeadAssignee[];
  updateLeadAction: (formData: FormData) => Promise<void>;
};

export default function LeadCards({ leads, teamMembers, updateLeadAction }: LeadCardsProps) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {leads.length === 0 ? (
        <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 8 }}>
          <h2>Keine Leads vorhanden</h2>
          <p>Für diese Auswahl sind aktuell keine Anfragen vorhanden.</p>
        </div>
      ) : (
        leads.map((lead) => {
          const isNew = lead.status === "new";

          return (
            <article
              key={lead.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 18,
                background: isNew ? "rgba(46,204,113,0.08)" : "var(--card)",
                boxShadow: "0 1px 2px rgba(0,0,0,.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>Lead</p>
                  <h2 style={{ margin: "4px 0 0", fontSize: 20 }}>
                    <Link href={`/dashboard/leads/${lead.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                      {lead.leadName}
                    </Link>
                  </h2>
                  <p style={{ margin: "8px 0 0", color: "var(--muted)", overflowWrap: "anywhere" }}>
                    {lead.contactLabel}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: 9999,
                      background: isNew ? "rgba(212,175,55,0.14)" : "rgba(167,170,176,0.22)",
                      color: "var(--text)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                  <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13 }}>
                    {lead.createdAtLabel}
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Zuständig</span>
                  <span style={{ overflowWrap: "anywhere" }}>{lead.assignedLabel}</span>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Anfrage-Typ</span>
                  <span style={{ overflowWrap: "anywhere" }}>{lead.inquiryType}</span>
                </div>

                {lead.notes ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Beschreibung</span>
                    <span style={{ overflowWrap: "anywhere" }}>{lead.notes}</span>
                  </div>
                ) : null}

                <form action={updateLeadAction} style={{ display: "grid", gap: 12 }}>
                  <input type="hidden" name="leadId" value={lead.id} />

                  <label style={{ display: "grid", gap: 4 }}>
                    Zuständig
                    <select name="assigned_user_id" defaultValue={lead.assignedUserId ?? ""} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
                      <option value="">Nicht zugewiesen</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 4 }}>
                    Status
                    <select name="status" defaultValue={lead.status} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
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
                      <select name="successful_outcome" defaultValue={lead.successfulOutcome ?? ""} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
                        <option value="" disabled>Bitte wählen</option>
                        {SUCCESSFUL_OUTCOMES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        Nur wählen, wenn Status auf „Erfolgreich“ gesetzt ist.
                      </span>
                    </label>

                    <label style={{ display: "grid", gap: 4 }}>
                      Nicht erfolgreich
                      <select name="unsuccessful_outcome" defaultValue={lead.unsuccessfulOutcome ?? ""} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
                        <option value="" disabled>Bitte wählen</option>
                        {UNSUCCESSFUL_OUTCOMES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
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

                {lead.history.length ? (
                  <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>
                      Verlauf
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16, color: "var(--muted)" }}>
                      {lead.history.map((entry) => {
                        return (
                          <li key={entry.id} style={{ marginBottom: 4, overflowWrap: "anywhere" }}>
                            {entry.label}
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
  );
}
