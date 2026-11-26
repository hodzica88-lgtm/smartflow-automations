"use client";

import Link from "next/link";
import { useState } from "react";

export default function PartnerApplicationForm({ market }: { market: "de" | "us" }) {
  const isUs = market === "us";
  const labels = isUs
    ? {
        name: "Full name",
        company: "Agency / company",
        email: "Business email",
        website: "Website (optional)",
        country: "Country",
        message: "Brief description of your company and the collaboration you have in mind",
        submit: "Submit application",
        privacy: "I agree that my information will be used only to process this partner application and I have read the privacy notice.",
        legal: "Privacy notice",
        success: "Thanks. Your application has been received and will be reviewed by the owner team.",
        failed: "Please check your data and try again.",
      }
    : {
        name: "Name",
        company: "Unternehmen / Agentur",
        email: "Geschäftliche E-Mail-Adresse",
        website: "Website (optional)",
        country: "Land",
        message: "Kurze Beschreibung des Unternehmens und der gewünschten Zusammenarbeit",
        submit: "Bewerbung senden",
        privacy: "Ich habe die Datenschutzhinweise gelesen und bin damit einverstanden, dass meine Angaben nur zur Bearbeitung dieser Partner-Bewerbung verwendet werden.",
        legal: "Datenschutzhinweis",
        success: "Vielen Dank. Ihre Bewerbung wurde eingereicht und wird vom Eigentümerteam geprüft.",
        failed: "Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.",
      };

  const initialState = {
    name: "",
    company: "",
    email: "",
    website: "",
    country: "",
    message: "",
    privacyAccepted: false,
  };

  const [formValue, setFormValue] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const updateField = (key: keyof typeof initialState, value: string | boolean) => {
    setFormValue((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const payload = {
      name: formValue.name,
      company: formValue.company,
      email: formValue.email,
      website: formValue.website,
      country: formValue.country,
      message: formValue.message,
      privacyAccepted: formValue.privacyAccepted,
      market,
      honeypot: "",
    };

    const response = await fetch("/api/public/partner-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

    if (!response.ok || !result.ok) {
      setStatus("error");
      setMessage(result.error || labels.failed);
      return;
    }

    setStatus("success");
    setMessage(labels.success);
    setFormValue(initialState);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18, maxWidth: 760 }} noValidate>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
          {labels.name}
          <input
            value={formValue.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.03)", color: "var(--text)" }}
          />
        </label>

        <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
          {labels.company}
          <input
            value={formValue.company}
            onChange={(event) => updateField("company", event.target.value)}
            required
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.03)", color: "var(--text)" }}
          />
        </label>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
          {labels.email}
          <input
            type="email"
            value={formValue.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.03)", color: "var(--text)" }}
          />
        </label>

        <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
          {labels.website}
          <input
            type="url"
            value={formValue.website}
            onChange={(event) => updateField("website", event.target.value)}
            placeholder={isUs ? "https://" : "https://"}
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.03)", color: "var(--text)" }}
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
        {labels.country}
        <input
          value={formValue.country}
          onChange={(event) => updateField("country", event.target.value)}
          required
          style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.03)", color: "var(--text)" }}
        />
      </label>

      <label style={{ display: "grid", gap: 8, fontWeight: 600 }}>
        {labels.message}
        <textarea
          value={formValue.message}
          onChange={(event) => updateField("message", event.target.value)}
          required
          minLength={20}
          rows={6}
          style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.03)", color: "var(--text)", resize: "vertical" }}
        />
      </label>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14, lineHeight: 1.6, color: "var(--muted)" }}>
        <input
          type="checkbox"
          checked={formValue.privacyAccepted}
          onChange={(event) => updateField("privacyAccepted", event.target.checked)}
          required
        />
        <span>
          {labels.privacy}{" "}
          <Link href="/datenschutz" style={{ color: "var(--gold)", fontWeight: 700 }}>
            {labels.legal}
          </Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={status === "submitting"}
        style={{
          border: "none",
          borderRadius: 999,
          padding: "0.9rem 1.5rem",
          background: "linear-gradient(135deg, #d8ba72, #b68a2d)",
          color: "#171511",
          fontWeight: 800,
          cursor: "pointer",
          justifySelf: "start",
        }}
      >
        {status === "submitting" ? (isUs ? "Submitting…" : "Wird gesendet…") : labels.submit}
      </button>

      {message ? (
        <p style={{ margin: 0, fontWeight: 600, color: status === "success" ? "#9ccc65" : "#ffb4a2" }}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
