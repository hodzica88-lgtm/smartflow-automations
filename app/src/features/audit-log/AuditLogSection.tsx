import { getAuditLogActionLabel, type CompanyAuditLogEntry } from "./service";

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

type AuditLogSectionProps = {
  title: string;
  description: string;
  entries: CompanyAuditLogEntry[];
  emptyTitle: string;
  emptyMessage: string;
};

export default function AuditLogSection({
  title,
  description,
  entries,
  emptyTitle,
  emptyMessage,
}: AuditLogSectionProps) {
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p style={{ margin: "6px 0 0", color: "#555" }}>{description}</p>
        </div>
        <span>{entries.length} angezeigt</span>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>{emptyTitle}</h3>
          <p style={{ marginBottom: 0, color: "#555" }}>{emptyMessage}</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e2e8f0" }}>Zeit</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e2e8f0" }}>Benutzer</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e2e8f0" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7", whiteSpace: "nowrap" }}>
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}>{entry.actorLabel}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}>
                    {getAuditLogActionLabel(entry.action)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}