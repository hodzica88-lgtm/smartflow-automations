"use client";

import { useMemo, useState } from "react";

type Props = {
  companyName: string;
  defaultPrimaryColor: string;
  templateType: string;
  initialSubject: string;
  initialBody: string;
};

const replaceVariables = (value: string, companyName: string) =>
  value
    .replaceAll("{{company_name}}", companyName)
    .replaceAll("{{signature}}", companyName)
    .replaceAll("{{lead_name}}", "Max Mustermann")
    .replaceAll("{{lead_phone}}", "+49 171 123456")
    .replaceAll("{{lead_email}}", "kunde@example.com")
    .replaceAll("{{lead_inquiry_type}}", "Allgemeine Anfrage")
    .replaceAll("{{lead_message}}", "Bitte um Rueckruf")
    .replaceAll("{{dashboard_url}}", "https://app.varnito.de/dashboard/leads");

export default function EmailTemplateEditor(props: Props) {
  const [subject, setSubject] = useState(props.initialSubject);
  const [body, setBody] = useState(props.initialBody);

  const preview = useMemo(
    () => ({
      subject: replaceVariables(subject, props.companyName),
      body: replaceVariables(body, props.companyName),
    }),
    [body, subject, props.companyName],
  );

  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "var(--card)", display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0 }}>{props.templateType}</h3>
      <label style={{ display: "grid", gap: 6 }}>
        Betreff
        <input
          name="template_subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
          required
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        Inhalt
        <textarea
          name="template_body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={9}
          style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
          required
        />
      </label>

      <div style={{ border: "1px solid #dbeafe", borderRadius: 10, background: "#f8fbff", padding: 12, display: "grid", gap: 8 }}>
        <p style={{ margin: 0, color: props.defaultPrimaryColor, fontWeight: 700 }}>Live-Vorschau</p>
        <strong>{preview.subject}</strong>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{preview.body}</pre>
      </div>
    </section>
  );
}
