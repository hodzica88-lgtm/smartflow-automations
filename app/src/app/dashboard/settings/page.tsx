import { redirect } from "next/navigation";

import {
  addMissingIndustryTemplateInquiryTypes,
  ensureCompanyInquiryTypesInitialized,
  getCompanyInquiryTypes,
  hasDuplicateInquiryTypeName,
  reorderInquiryTypes,
  validateInquiryTypeName,
} from "@/features/inquiry-types/service";
import { getUserCompanyState } from "@/features/onboarding/company";
import {
  INDUSTRY_OPTIONS,
  isSupportedIndustry,
} from "@/shared/config/inquiryTypes";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";

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

const primaryActionStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "2.75rem",
  width: "fit-content",
  padding: "12px 18px",
  borderRadius: 8,
  background: "#3182ce",
  color: "#fff",
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
      "id, name, contact_person, email, notification_email, phone, website_url, industry, timezone, business_hours",
    )
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const redirectSettingsError = (message: string): never => {
  redirect(`/dashboard/settings?error=${encodeURIComponent(message)}`);
};

const redirectSettingsSuccess = (message: string): never => {
  redirect(`/dashboard/settings?success=${encodeURIComponent(message)}`);
};

export async function updateCompanyAction(formData: FormData) {
  "use server";

  const name = getStringValue(formData, "name");
  const contactPerson = getStringValue(formData, "contact_person");
  const email = getStringValue(formData, "email");
  const notificationEmail = getStringValue(formData, "notification_email");
  const phone = getStringValue(formData, "phone");
  const websiteUrl = getStringValue(formData, "website_url");
  const industry = getStringValue(formData, "industry");
  const timezone = getStringValue(formData, "timezone");
  const businessHours = getStringValue(formData, "business_hours");

  if (!name || !contactPerson || !email || !timezone || !industry) {
    redirectSettingsError("Bitte füllen Sie alle erforderlichen Felder aus");
  }

  if (!isValidEmail(email)) {
    redirectSettingsError("Bitte geben Sie eine gültige E-Mail-Adresse ein");
  }

  if (notificationEmail && !isValidEmail(notificationEmail)) {
    redirectSettingsError("Bitte geben Sie eine gültige Benachrichtigungs-E-Mail-Adresse ein");
  }

  if (!timeZones.includes(timezone as (typeof timeZones)[number])) {
    redirectSettingsError("Bitte wählen Sie eine gültige Zeitzone");
  }

  if (!isSupportedIndustry(industry)) {
    redirectSettingsError("Bitte wählen Sie eine gültige Branche");
  }

  const companyId = await getCompanyId();
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      contact_person: contactPerson,
      email,
      notification_email: notificationEmail || null,
      phone: phone || null,
      website_url: websiteUrl || null,
      industry,
      timezone,
      business_hours: businessHours || null,
    })
    .eq("id", companyId);

  if (error) {
    redirectSettingsError("Die Einstellungen konnten nicht gespeichert werden");
  }

  await ensureCompanyInquiryTypesInitialized({
    supabase,
    companyId,
    industry,
  });

  redirectSettingsSuccess("Einstellungen wurden gespeichert.");
}

export async function addInquiryTypeAction(formData: FormData) {
  "use server";

  const nameInput = getStringValue(formData, "new_inquiry_type");
  const validated = validateInquiryTypeName(nameInput);

  if (!validated.ok) {
    redirectSettingsError(validated.error);
  }

  const companyId = await getCompanyId();
  const supabase = createSupabaseServiceRoleClient();

  const inquiryTypes = await getCompanyInquiryTypes({ supabase, companyId });

  if (hasDuplicateInquiryTypeName(inquiryTypes, validated.value)) {
    redirectSettingsError("Diese Anfrageart existiert bereits.");
  }

  const nextSortOrder = inquiryTypes.reduce((max, entry) => Math.max(max, entry.sort_order), -1) + 1;

  const { error } = await supabase.from("company_inquiry_types").insert({
    company_id: companyId,
    name: validated.value,
    active: true,
    sort_order: nextSortOrder,
  });

  if (error) {
    redirectSettingsError("Anfrageart konnte nicht hinzugefügt werden.");
  }

  redirectSettingsSuccess("Anfrageart hinzugefügt.");
}

export async function renameInquiryTypeAction(formData: FormData) {
  "use server";

  const inquiryTypeId = getStringValue(formData, "inquiry_type_id");
  const nameInput = getStringValue(formData, "name");
  const validated = validateInquiryTypeName(nameInput);

  if (!inquiryTypeId) {
    redirectSettingsError("Ungültige Anfrageart.");
  }

  if (!validated.ok) {
    redirectSettingsError(validated.error);
  }

  const companyId = await getCompanyId();
  const supabase = createSupabaseServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("company_inquiry_types")
    .select("id")
    .eq("id", inquiryTypeId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingError || !existing) {
    redirectSettingsError("Anfrageart wurde nicht gefunden.");
  }

  const inquiryTypes = await getCompanyInquiryTypes({ supabase, companyId });

  if (hasDuplicateInquiryTypeName(inquiryTypes, validated.value, inquiryTypeId)) {
    redirectSettingsError("Diese Anfrageart existiert bereits.");
  }

  const { error } = await supabase
    .from("company_inquiry_types")
    .update({ name: validated.value })
    .eq("id", inquiryTypeId)
    .eq("company_id", companyId);

  if (error) {
    redirectSettingsError("Anfrageart konnte nicht umbenannt werden.");
  }

  redirectSettingsSuccess("Anfrageart umbenannt.");
}

export async function toggleInquiryTypeAction(formData: FormData) {
  "use server";

  const inquiryTypeId = getStringValue(formData, "inquiry_type_id");
  const activeValue = getStringValue(formData, "active");

  if (!inquiryTypeId || (activeValue !== "1" && activeValue !== "0")) {
    redirectSettingsError("Ungültige Anfrageart-Aktion.");
  }

  const companyId = await getCompanyId();
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("company_inquiry_types")
    .update({ active: activeValue === "1" })
    .eq("id", inquiryTypeId)
    .eq("company_id", companyId);

  if (error) {
    redirectSettingsError("Status der Anfrageart konnte nicht geändert werden.");
  }

  redirectSettingsSuccess("Status der Anfrageart aktualisiert.");
}

export async function moveInquiryTypeAction(formData: FormData) {
  "use server";

  const inquiryTypeId = getStringValue(formData, "inquiry_type_id");
  const direction = getStringValue(formData, "direction");

  if (!inquiryTypeId || (direction !== "up" && direction !== "down")) {
    redirectSettingsError("Ungültige Anfrageart-Aktion.");
  }

  const companyId = await getCompanyId();
  const supabase = createSupabaseServiceRoleClient();
  const inquiryTypes = await getCompanyInquiryTypes({ supabase, companyId });

  const currentIndex = inquiryTypes.findIndex((entry) => entry.id === inquiryTypeId);
  if (currentIndex < 0) {
    redirectSettingsError("Anfrageart wurde nicht gefunden.");
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= inquiryTypes.length) {
    redirect("/dashboard/settings");
  }

  const reordered = [...inquiryTypes];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, moved);

  await reorderInquiryTypes({
    supabase,
    companyId,
    orderedIds: reordered.map((entry) => entry.id),
  });

  redirect("/dashboard/settings");
}

export async function applyIndustryTemplateAction() {
  "use server";

  const companyId = await getCompanyId();
  const supabase = createSupabaseServiceRoleClient();
  const company = await getCompany(companyId);

  const industry = company?.industry ?? "";

  if (!isSupportedIndustry(industry)) {
    redirectSettingsError("Bitte wählen und speichern Sie zuerst eine gültige Branche.");
  }

  const added = await addMissingIndustryTemplateInquiryTypes({
    supabase,
    companyId,
    industry,
  });

  if (added === 0) {
    redirectSettingsSuccess("Keine fehlenden Anfragearten in der Branchenvorlage gefunden.");
  }

  redirectSettingsSuccess(`${added} Anfragearten aus der Branchenvorlage ergänzt.`);
}

type SettingsPageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const success = resolvedSearchParams?.success ?? null;
  const error = resolvedSearchParams?.error ?? null;
  const companyId = await getCompanyId();
  const company = await getCompany(companyId);

  if (!company) {
    redirect("/onboarding");
  }

  const supabase = createSupabaseServiceRoleClient();
  const industry = company.industry ?? "";

  if (isSupportedIndustry(industry)) {
    await ensureCompanyInquiryTypesInitialized({
      supabase,
      companyId,
      industry,
    });
  }

  const inquiryTypes = await getCompanyInquiryTypes({ supabase, companyId });

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 20 }}>
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
        <div style={{ padding: 16, background: "#e6ffed", border: "1px solid #b7f0c6", borderRadius: 8, marginBottom: 16, overflowWrap: "anywhere" }}>
          {success}
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 16, background: "#ffe6e6", border: "1px solid #f0b7b7", borderRadius: 8, marginBottom: 16, overflowWrap: "anywhere" }}>
          {error}
        </div>
      ) : null}

      <form action={updateCompanyAction} style={{ display: "grid", gap: 18 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Firmenname
          <input
            name="name"
            type="text"
            defaultValue={company.name ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Ansprechpartner
          <input
            name="contact_person"
            type="text"
            defaultValue={company.contact_person ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          E-Mail
          <input
            name="email"
            type="email"
            defaultValue={company.email ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Benachrichtigungs-E-Mail
          <input
            name="notification_email"
            type="email"
            defaultValue={company.notification_email ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
          />
          <small style={{ color: "#555" }}>
            An diese Adresse senden wir neue Kundenanfragen.
          </small>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Telefon
          <input
            name="phone"
            type="tel"
            defaultValue={company.phone ?? ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Website
          <input
            name="website_url"
            type="url"
            defaultValue={company.website_url ?? ""}
            placeholder="https://example.com"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Branche
          <select
            name="industry"
            defaultValue={isSupportedIndustry(industry) ? industry : ""}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            required
          >
            <option value="" disabled>
              Bitte wählen
            </option>
            {INDUSTRY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Zeitzone
          <select
            name="timezone"
            defaultValue={company.timezone ?? timeZones[0]}
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
            defaultValue={company.business_hours ?? ""}
            rows={4}
            placeholder="Mo-Fr, 9:00-17:00"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
          />
        </label>

        <button type="submit" style={primaryActionStyle}>
          Speichern
        </button>
      </form>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, background: "#fff", display: "grid", gap: 16 }}>
        <h2 style={{ margin: 0 }}>Anfragearten</h2>
        <p style={{ margin: 0, color: "#555" }}>
          Diese Auswahl sehen Kunden im Anfrageformular.
        </p>

        <form action={addInquiryTypeAction} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <input
            name="new_inquiry_type"
            type="text"
            maxLength={80}
            placeholder="Neue Anfrageart"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0", minWidth: 260, flex: "1 1 260px" }}
          />
          <button type="submit" style={primaryActionStyle}>
            Anfrageart hinzufügen
          </button>
        </form>

        <form action={applyIndustryTemplateAction}>
          <button type="submit" style={secondaryActionStyle}>
            Branchenvorlage ergänzen
          </button>
        </form>

        <div style={{ display: "grid", gap: 10 }}>
          {inquiryTypes.length === 0 ? (
            <p style={{ margin: 0, color: "#555" }}>Noch keine Anfragearten vorhanden.</p>
          ) : (
            inquiryTypes.map((entry, index) => (
              <article
                key={entry.id}
                style={{
                  display: "grid",
                  gap: 10,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: 12,
                  background: entry.active ? "#fff" : "#f7fafc",
                }}
              >
                <form action={renameInquiryTypeAction} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <input type="hidden" name="inquiry_type_id" value={entry.id} />
                  <input
                    name="name"
                    type="text"
                    defaultValue={entry.name}
                    maxLength={80}
                    style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0", minWidth: 220, flex: "1 1 220px" }}
                  />
                  <button type="submit" style={secondaryActionStyle}>
                    Umbenennen
                  </button>
                </form>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <form action={toggleInquiryTypeAction}>
                    <input type="hidden" name="inquiry_type_id" value={entry.id} />
                    <input type="hidden" name="active" value={entry.active ? "0" : "1"} />
                    <button type="submit" style={secondaryActionStyle}>
                      {entry.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </form>

                  <form action={moveInquiryTypeAction}>
                    <input type="hidden" name="inquiry_type_id" value={entry.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" style={secondaryActionStyle} disabled={index === 0}>
                      Nach oben
                    </button>
                  </form>

                  <form action={moveInquiryTypeAction}>
                    <input type="hidden" name="inquiry_type_id" value={entry.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      style={secondaryActionStyle}
                      disabled={index === inquiryTypes.length - 1}
                    >
                      Nach unten
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
