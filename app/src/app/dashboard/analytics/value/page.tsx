import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCustomerValueSettings,
  parseAverageOrderValue,
  parseMonthlyVarnitoCost,
  saveCustomerValueSettings,
} from "@/features/customer-value/service";
import { getUserCompanyState } from "@/features/onboarding/company";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export const dynamic = "force-dynamic";

const getStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const getCompanyId = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/analytics/value");
  }

  const companyState = await getUserCompanyState(user.id);

  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  return companyState.companyId;
};

const redirectWithError = (message: string): never => {
  redirect(`/dashboard/analytics/value?error=${encodeURIComponent(message)}`);
};

export async function updateCustomerValueAction(formData: FormData) {
  "use server";

  const averageOrderValue = parseAverageOrderValue(
    getStringValue(formData, "average_order_value"),
  );

  if (!averageOrderValue.ok || averageOrderValue.cents === null) {
    redirectWithError(
      averageOrderValue.ok
        ? "Der durchschnittliche Auftragswert ist erforderlich."
        : averageOrderValue.error,
    );
  }

  const monthlyVarnitoCost = parseMonthlyVarnitoCost(
    getStringValue(formData, "monthly_varnito_cost"),
  );

  if (!monthlyVarnitoCost.ok) {
    redirectWithError(monthlyVarnitoCost.error);
  }

  const companyId = await getCompanyId();

  try {
    await saveCustomerValueSettings({
      companyId,
      averageOrderValueCents: averageOrderValue.cents,
      monthlyVarnitoCostCents: monthlyVarnitoCost.cents,
    });
  } catch {
    redirectWithError("Die Werte konnten nicht gespeichert werden.");
  }

  redirect("/dashboard/analytics/value?success=1");
}

type CustomerValuePageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

const formatInputValue = (cents: number | null) =>
  cents === null ? "" : (cents / 100).toFixed(2);

export default async function CustomerValuePage({ searchParams }: CustomerValuePageProps) {
  const companyId = await getCompanyId();
  const settings = await getCustomerValueSettings(companyId);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const success = resolvedSearchParams?.success === "1";
  const error = resolvedSearchParams?.error ?? null;

  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        alignContent: "start",
        gap: 24,
        padding: "32px 16px",
      }}
    >
      <header style={{ display: "grid", width: "min(100%, 760px)", gap: 12, margin: "0 auto" }}>
        <Link href="/dashboard/analytics" style={{ color: "#3182ce", fontWeight: 700, textDecoration: "none" }}>
          ← Zurück zu den Auswertungen
        </Link>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>
          Nutzen-Nachweis
        </p>
        <h1 style={{ margin: 0 }}>Geschäftswerte hinterlegen</h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          Varnito berechnet Geldwerte ausschließlich aus Anfragen, die als „Auftrag erhalten“
          abgeschlossen wurden. Termine und Angebote werden nicht als Umsatz gezählt.
        </p>
      </header>

      {success ? (
        <section
          style={{
            width: "min(100%, 760px)",
            margin: "0 auto",
            padding: 16,
            border: "1px solid #b7f0c6",
            borderRadius: 10,
            background: "#e6ffed",
          }}
        >
          Werte wurden gespeichert. Die Auswertung verwendet sie ab sofort.
        </section>
      ) : null}

      {error ? (
        <section
          role="alert"
          style={{
            width: "min(100%, 760px)",
            margin: "0 auto",
            padding: 16,
            border: "1px solid #f0b7b7",
            borderRadius: 10,
            background: "#ffe6e6",
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </section>
      ) : null}

      <section
        style={{
          display: "grid",
          width: "min(100%, 760px)",
          gap: 18,
          margin: "0 auto",
          padding: 20,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Berechnungswerte</h2>
          <p style={{ margin: "6px 0 0", color: "#555", lineHeight: 1.6 }}>
            Verwenden Sie realistische Durchschnittswerte aus Ihren Aufträgen und Rechnungen.
          </p>
        </div>

        <form action={updateCustomerValueAction} style={{ display: "grid", gap: 18 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Durchschnittlicher Auftragswert in Euro
            <input
              name="average_order_value"
              type="number"
              min="0.01"
              max="10000000"
              step="0.01"
              inputMode="decimal"
              defaultValue={formatInputValue(settings.averageOrderValueCents)}
              placeholder="zum Beispiel 750,00"
              required
              style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            />
            <small style={{ color: "#555", lineHeight: 1.5 }}>
              Dieser Wert wird nur mit dem Ergebnis „Auftrag erhalten“ multipliziert.
            </small>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Tatsächliche monatliche Varnito-Kosten in Euro (optional)
            <input
              name="monthly_varnito_cost"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              inputMode="decimal"
              defaultValue={formatInputValue(settings.monthlyVarnitoCostCents)}
              placeholder="Betrag laut Rechnung"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #cbd5e0" }}
            />
            <small style={{ color: "#555", lineHeight: 1.5 }}>
              Nur mit diesem echten Kostenwert kann Varnito ROI, Netto-Nutzen und Nutzenfaktor
              berechnen. Das Feld kann bis zur ersten Rechnung leer bleiben.
            </small>
          </label>

          <button
            type="submit"
            style={{
              display: "inline-flex",
              width: "fit-content",
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              border: 0,
              borderRadius: 8,
              padding: "0 16px",
              background: "#3182ce",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Werte speichern
          </button>
        </form>
      </section>

      <section
        style={{
          display: "grid",
          width: "min(100%, 760px)",
          gap: 8,
          margin: "0 auto",
          padding: 20,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <h2 style={{ margin: 0 }}>Was Varnito daraus berechnet</h2>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          Bestätigter Auftragswert = Anzahl „Auftrag erhalten“ × durchschnittlicher
          Auftragswert. Netto-Nutzen = bestätigter Auftragswert − monatliche Varnito-Kosten.
          ROI = Netto-Nutzen ÷ monatliche Varnito-Kosten × 100.
        </p>
      </section>
    </main>
  );
}
