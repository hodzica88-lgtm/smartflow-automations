import Link from "next/link";

import { openBillingPortalAction, startBillingCheckoutAction } from "@/features/billing/actions";
import {
  BILLING_LOOKUP_KEY,
  BILLING_ROUTE,
  getBillingStatusLabel,
  requireUserCompanyAccess,
} from "@/features/billing/service";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

type BillingPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    billing?: string;
    canceled?: string;
  }>;
};

const panelStyle = {
  display: "grid",
  gap: 16,
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
} as const;

const primaryButtonStyle = {
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

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: "#fff",
  color: "#1a202c",
  border: "1px solid #cbd5e0",
} as const;

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

const getCompanyName = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return "Varnito";
  }

  return data.name;
};

const getStatusText = (billingReason: string | null | undefined) => {
  switch (billingReason) {
    case "trial_expired":
      return "Die Testphase ist abgelaufen. Bitte starten Sie jetzt Ihr Abonnement.";
    case "payment_required":
      return "Ihr Zugriff ist pausiert, bis Stripe wieder eine erfolgreiche Zahlung bestätigt.";
    case "checkout_incomplete":
      return "Der letzte Checkout wurde nicht abgeschlossen. Bitte starten Sie ihn erneut.";
    case "subscription_paused":
      return "Das Abonnement ist pausiert. Bitte prüfen Sie Ihr Stripe-Kundenportal.";
    case "subscription_canceled":
      return "Das Abonnement ist beendet. Bitte starten Sie ein neues Abonnement, um Varnito weiter zu nutzen.";
    case "no_subscription":
      return "Für diese Firma ist noch kein aktives Abonnement hinterlegt.";
    default:
      return "Verwalten Sie hier Testphase und Abonnement Ihrer Firma.";
  }
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const access = await requireUserCompanyAccess({
    allowMember: true,
    nextPath: BILLING_ROUTE,
    enforceBilling: false,
  });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const companyName = await getCompanyName(access.companyId);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 20 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <Link href={access.billing.hasAppAccess ? "/dashboard" : "/dashboard/billing"} style={{ color: "#3182ce", fontWeight: 700, textDecoration: "none" }}>
          ← Zurück
        </Link>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>
          Billing
        </p>
        <h1 style={{ margin: 0 }}>{companyName}</h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          {getStatusText(resolvedSearchParams?.billing ?? access.billing.lockReason)}
        </p>
      </header>

      {resolvedSearchParams?.success ? (
        <section style={{ padding: 16, border: "1px solid #b7f0c6", borderRadius: 10, background: "#e6ffed" }}>
          Stripe Checkout wurde erfolgreich abgeschlossen.
        </section>
      ) : null}

      {resolvedSearchParams?.canceled === "1" ? (
        <section style={{ padding: 16, border: "1px solid #f0e0b7", borderRadius: 10, background: "#fff8e6" }}>
          Der Checkout wurde abgebrochen.
        </section>
      ) : null}

      {resolvedSearchParams?.error ? (
        <section style={{ padding: 16, border: "1px solid #f0b7b7", borderRadius: 10, background: "#ffe6e6" }}>
          {resolvedSearchParams.error}
        </section>
      ) : null}

      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>Status</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <div><strong>Produkt:</strong> Varnito Pro</div>
          <div><strong>Lookup Key:</strong> {BILLING_LOOKUP_KEY}</div>
          <div><strong>Status:</strong> {getBillingStatusLabel(access.billing.status)}</div>
          <div><strong>Zugriff:</strong> {access.billing.hasAppAccess ? "Freigeschaltet" : "Gesperrt"}</div>
          <div><strong>Testphase bis:</strong> {formatDateTime(access.billing.trialEndsAt)}</div>
          <div><strong>Aktueller Zeitraum bis:</strong> {formatDateTime(access.billing.currentPeriodEnd)}</div>
          <div><strong>Kündigung zum Periodenende:</strong> {access.billing.cancelAtPeriodEnd ? "Ja" : "Nein"}</div>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>Abonnement</h2>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          299 EUR monatlich. Neue Firmen erhalten einmalig 30 Tage Testphase.
        </p>

        {access.isOwner ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <form action={startBillingCheckoutAction}>
              <button type="submit" style={primaryButtonStyle}>Abo starten</button>
            </form>

            <form action={openBillingPortalAction}>
              <button
                type="submit"
                style={secondaryButtonStyle}
                disabled={!access.billing.stripeCustomerId}
              >
                Abonnement verwalten
              </button>
            </form>
          </div>
        ) : (
          <p style={{ margin: 0, color: "#555" }}>
            Nur der Eigentümer kann Billing verwalten.
          </p>
        )}
      </section>
    </main>
  );
}