import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUserCompanyAccess } from "@/features/billing/service";
import {
  getCustomerValueSettings,
  parseAverageOrderValue,
  saveAverageOrderValue,
} from "@/features/customer-value/service";

export const dynamic = "force-dynamic";

const getStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const getCompanyId = async () => {
  const access = await requireUserCompanyAccess({
    nextPath: "/dashboard/analytics/value",
  });

  return access.companyId;
};

const redirectWithError = (message: string): never => {
  redirect(`/dashboard/analytics/value?error=${encodeURIComponent(message)}`);
};

export async function updateCustomerValueAction(formData: FormData) {
  "use server";

  const averageOrderValue = parseAverageOrderValue(
    getStringValue(formData, "average_order_value"),
  );

  if (!averageOrderValue.ok) {
    return redirectWithError(averageOrderValue.error);
  }

  if (averageOrderValue.cents === null) {
    return redirectWithError("Der durchschnittliche Auftragswert ist erforderlich.");
  }

  const companyId = await getCompanyId();

  try {
    await saveAverageOrderValue({
      companyId,
      averageOrderValueCents: averageOrderValue.cents,
    });
  } catch {
    return redirectWithError("Der Durchschnittswert konnte nicht gespeichert werden.");
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
        <Link href="/dashboard/analytics" style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "none" }}>
          ← Zurück zu den Auswertungen
        </Link>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>
          Nutzen-Schätzung
        </p>
        <h1 style={{ margin: 0 }}>Durchschnittlichen Auftragswert ändern</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Eine grobe Schätzung reicht. Varnito verwendet diesen einen Wert automatisch, um den ungefähren Wert gewonnener Aufträge zu zeigen.
        </p>
      </header>

      {success ? (
        <section
          style={{
            width: "min(100%, 760px)",
            margin: "0 auto",
            padding: 16,
            border: "1px solid color-mix(in srgb, var(--success) 45%, var(--border))",
            borderRadius: 10,
            background: "rgba(46,204,113,0.12)",
          }}
        >
          Durchschnittswert wurde gespeichert.
        </section>
      ) : null}

      {error ? (
        <section
          role="alert"
          style={{
            width: "min(100%, 760px)",
            margin: "0 auto",
            padding: 16,
            border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))",
            borderRadius: 10,
            background: "rgba(231,76,60,0.12)",
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
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--card)",
        }}
      >
        <form action={updateCustomerValueAction} style={{ display: "grid", gap: 18 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Ungefährer durchschnittlicher Auftragswert in Euro
            <input
              name="average_order_value"
              type="number"
              min="0.01"
              max="10000000"
              step="0.01"
              inputMode="decimal"
              defaultValue={formatInputValue(settings.averageOrderValueCents)}
              placeholder="zum Beispiel 500"
              required
              style={{ padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
            />
            <small style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              Der Wert kann jederzeit angepasst werden. Weitere Beträge pro Lead sind nicht nötig.
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
              background: "var(--gold)",
              color: "var(--card)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Durchschnittswert speichern
          </button>
        </form>
      </section>
    </main>
  );
}
