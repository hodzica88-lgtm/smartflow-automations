"use client";

import { useMemo, useState } from "react";

import {
  PARTNER_APPLICATION_STATUSES,
  formatPartnerApplicationStatus,
  type PartnerApplicationRecord,
} from "@/features/partners/application";

export function PartnerApplicationReviewPanel({
  applications,
}: {
  applications: PartnerApplicationRecord[];
}) {
  const [localApplications, setLocalApplications] = useState(applications);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    const counts = Object.fromEntries(PARTNER_APPLICATION_STATUSES.map((status) => [status, 0])) as Record<string, number>;
    for (const application of localApplications) {
      counts[application.status] = (counts[application.status] ?? 0) + 1;
    }

    return counts;
  }, [localApplications]);

  const updateStatus = async (applicationId: string, nextStatus: string) => {
    setPendingId(applicationId);
    setMessage(null);

    try {
      const response = await fetch("/api/operator/partner-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status: nextStatus }),
      });

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to update status.");
      }

      setLocalApplications((current) => current.map((application) => (
        application.id === applicationId
          ? { ...application, status: nextStatus as PartnerApplicationRecord["status"] }
          : application
      )));
      setMessage("Status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update status.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, letterSpacing: 1.3, textTransform: "uppercase", fontSize: 12, color: "#d8ba72", fontWeight: 800 }}>Partner</p>
          <h2 style={{ margin: "0.35rem 0 0", fontSize: "1.8rem" }}>Partner applications</h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PARTNER_APPLICATION_STATUSES.map((status) => (
            <span key={status} style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "0.35rem 0.7rem", background: "rgba(255,255,255,0.02)", fontSize: 12 }}>
              {formatPartnerApplicationStatus(status, "de")}: {summary[status] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {message ? (
        <p style={{ margin: 0, color: message.includes("updated") || message === "Status updated." ? "#a5d68a" : "#ffb29b" }}>
          {message}
        </p>
      ) : null}

      {localApplications.length === 0 ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: 20, padding: "1.25rem", background: "rgba(255,255,255,0.02)" }}>
          No partner applications yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {localApplications.map((application) => (
            <article key={application.id} style={{ border: "1px solid var(--border)", borderRadius: 20, padding: 18, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "1.05rem" }}>{application.company_name}</strong>
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>{application.full_name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "0.35rem 0.7rem", fontSize: 12, background: "rgba(255,255,255,0.02)" }}>
                      {formatPartnerApplicationStatus(application.status, "de")}
                    </span>
                    <select
                      value={application.status}
                      onChange={(event) => updateStatus(application.id, event.target.value)}
                      disabled={pendingId === application.id}
                      style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.5rem 0.8rem", background: "rgba(255,255,255,0.03)", color: "var(--text)" }}
                    >
                      {PARTNER_APPLICATION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatPartnerApplicationStatus(status, "de")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, color: "var(--muted)", fontSize: 14 }}>
                  <div>{application.email}</div>
                  <div>{application.country}</div>
                  {application.website ? <a href={application.website} target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>{application.website}</a> : null}
                </div>

                <p style={{ margin: 0, lineHeight: 1.7 }}>{application.description}</p>

                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {new Date(application.created_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
