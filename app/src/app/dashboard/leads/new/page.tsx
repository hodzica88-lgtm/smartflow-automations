import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUserCompanyAccess } from "@/features/billing/service";
import { trackAnalyticsEvent } from "@/features/analytics/events";
import { getActiveCompanyInquiryTypes } from "@/features/inquiry-types/service";
import { getRequestMarket } from "@/shared/i18n/request";
import {
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";

const FALLBACK_INQUIRY_TYPE = "Allgemeine Anfrage";

const primaryActionStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "2.75rem",
  width: "fit-content",
  padding: "12px 18px",
  borderRadius: 8,
  background: "var(--gold)",
  color: "var(--card)",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
} as const;

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const getCompanyAccess = async () => {
  const access = await requireUserCompanyAccess({
    allowMember: true,
    nextPath: "/dashboard/leads/new",
  });

  return {
    companyId: access.companyId,
    userId: access.userId,
  };
};

export async function createPhoneLeadAction(formData: FormData) {
  "use server";

  const name = getString(formData, "name");
  const phone = getString(formData, "phone");
  const email = getString(formData, "email");
  const inquiryType = getString(formData, "inquiry_type");
  const notes = getString(formData, "notes");

  if (!name || !phone || !inquiryType) {
    redirect(
      "/dashboard/leads/new?error=Bitte+füllen+Sie+Name%2C+Telefon+und+Anfrage-Typ+aus",
    );
  }

  if (email && !isValidEmail(email)) {
    redirect("/dashboard/leads/new?error=Bitte+geben+Sie+eine+gültige+E-Mail-Adresse+ein");
  }

  const { companyId, userId } = await getCompanyAccess();
  const supabase = createSupabaseServiceRoleClient();

  const activeInquiryTypes = await getActiveCompanyInquiryTypes({
    supabase,
    companyId,
  });

  const isValidInquiryType =
    activeInquiryTypes.length === 0
      ? inquiryType === FALLBACK_INQUIRY_TYPE
      : activeInquiryTypes.some((entry) => entry.name === inquiryType);

  if (!isValidInquiryType) {
    redirect("/dashboard/leads/new?error=Bitte+wählen+Sie+einen+gültigen+Anfrage-Typ");
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      company_id: companyId,
      assigned_user_id: userId,
      first_name: name,
      last_name: null,
      phone,
      email: email || null,
      inquiry_type: inquiryType,
      source: "manual_phone",
      status: "new",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !lead?.id) {
    redirect(
      "/dashboard/leads/new?error=Die+Telefonanfrage+konnte+nicht+gespeichert+werden",
    );
  }

  let market: "de" | "us" | "unknown" = "unknown";

  try {
    market = (await getRequestMarket()).market;
  } catch {
    // Keep market unknown when request context is unavailable.
  }

  trackAnalyticsEvent({
    eventName: "lead_created_manual",
    market,
    companyId,
    isAuthenticated: true,
    metadata: {
      hasEmail: Boolean(email),
      inquiryType,
    },
  });

  redirect(`/dashboard/leads/${lead.id}`);
}

type NewLeadPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function NewLeadPage({ searchParams }: NewLeadPageProps) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error ?? null;
  const { companyId } = await getCompanyAccess();
  const supabase = createSupabaseServiceRoleClient();
  const activeInquiryTypes = await getActiveCompanyInquiryTypes({
    supabase,
    companyId,
  });
  const inquiryTypeOptions =
    activeInquiryTypes.length > 0
      ? activeInquiryTypes.map((entry) => entry.name)
      : [FALLBACK_INQUIRY_TYPE];

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto", display: "grid", gap: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/leads" style={{ color: "var(--gold)", textDecoration: "none" }}>
          ← Zurück zur Übersicht
        </Link>
        <h1 style={{ margin: "8px 0 4px" }}>Telefonanfrage erfassen</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Erfassen Sie eine neue Anfrage aus einem Telefonat schnell und ohne zusätzliche Schritte.
        </p>
      </div>

      {error ? (
        <div style={{ padding: 16, background: "rgba(231,76,60,0.12)", border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))", borderRadius: 8, marginBottom: 16, overflowWrap: "anywhere" }}>
          {error}
        </div>
      ) : null}

      <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, background: "var(--card)" }}>
        <form action={createPhoneLeadAction} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Name
            <input
              name="name"
              type="text"
              required
              style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Telefon
            <input
              name="phone"
              type="tel"
              required
              style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            E-Mail (optional)
            <input
              name="email"
              type="email"
              style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Anfrage-Typ
            <select
              name="inquiry_type"
              defaultValue=""
              required
              style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
            >
              <option value="" disabled>
                Bitte wählen
              </option>
              {inquiryTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Nachricht / Notiz
            <textarea
              name="notes"
              rows={5}
              style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
            />
          </label>

          <button type="submit" style={primaryActionStyle}>
            Lead anlegen
          </button>
        </form>
      </section>
    </main>
  );
}
