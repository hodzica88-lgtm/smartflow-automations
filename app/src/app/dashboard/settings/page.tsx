import { redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const timeZones = [
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Zurich",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

const getStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

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

const getCompany = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, contact_person, email, phone, website_url, industry, timezone, business_hours",
    )
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export async function updateCompanyAction(formData: FormData) {
  "use server";

  const name = getStringValue(formData, "name");
  const contactPerson = getStringValue(formData, "contact_person");
  const email = getStringValue(formData, "email");
  const phone = getStringValue(formData, "phone");
  const websiteUrl = getStringValue(formData, "website_url");
  const industry = getStringValue(formData, "industry");
  const timezone = getStringValue(formData, "timezone");
  const businessHours = getStringValue(formData, "business_hours");

  if (!name || !contactPerson || !email || !timezone) {
    redirect("/dashboard/settings?error=Bitte+füllen+Sie+alle+erforderlichen+Felder+aus");
  }

  if (!isValidEmail(email)) {
    redirect("/dashboard/settings?error=Bitte+geben+Sie+eine+gültige+E-Mail-Adresse+ein");
  }

  if (!timeZones.includes(timezone as (typeof timeZones)[number])) {
    redirect("/dashboard/settings?error=Bitte+wählen+Sie+eine+gültige+Zeitzone");
  }

  const companyId = await getCompanyId();
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      contact_person: contactPerson,
      email,
      phone: phone || null,
      website_url: websiteUrl || null,
      industry: industry || null,
      timezone,
      business_hours: businessHours || null,
    })
    .eq("id", companyId);

  if (error) {
    redirect("/dashboard/settings?error=Die+Einstellungen+konnte+nicht+gespeichert+werden");
  }

  redirect("/dashboard/settings?success=1");
}

type SettingsPageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const success = resolvedSearchParams?.success === "1";
  const error = resolvedSearchParams?.error ?? null;
  const companyId = await getCompanyId();
  const company = await getCompany(companyId);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <section style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Einstellungen
        </p>
        <h1 style={{ margin: 0 }}>Firmeninformationen</h1>
        <p style={{ marginTop: 8, color: "#555" }}>
          Aktualisieren Sie die Grunddaten Ihres Unternehmens für SmartFlow.
        </p>
      </section>

      {success ? (
        <div style={{ padding: 16, background: "#e6ffed", border: "1px solid #b7f0c6", marginBottom: 16 }}>
          Einstellungen wurden gespeichert.
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 16, background: "#ffe6e6", border: "1px solid #f0b7b7", marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      <form action={updateCompanyAction} style={{ display: "grid", gap: 18 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Firmenname
          <input
            name="name"
            type="text"
            defaultValue={company?.name ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Ansprechpartner
          <input
            name="contact_person"
            type="text"
            defaultValue={company?.contact_person ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          E-Mail
          <input
            name="email"
            type="email"
            defaultValue={company?.email ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Telefon
          <input
            name="phone"
            type="tel"
            defaultValue={company?.phone ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Website
          <input
            name="website_url"
            type="url"
            defaultValue={company?.website_url ?? ""}
            placeholder="https://example.com"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Branche
          <input
            name="industry"
            type="text"
            defaultValue={company?.industry ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Zeitzone
          <select
            name="timezone"
            defaultValue={company?.timezone ?? timeZones[0]}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            required
          >
            {timeZones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Geschäftszeiten
          <textarea
            name="business_hours"
            defaultValue={company?.business_hours ?? ""}
            rows={4}
            placeholder="Mo-Fr, 9:00-17:00"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: "12px 18px",
            borderRadius: 8,
            background: "#3182ce",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          Speichern
        </button>
      </form>
    </main>
  );
}
