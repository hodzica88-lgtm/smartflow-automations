"use client";

import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

export default function DemoBillingPage() {
  const { state, toggleBilling } = useDemo();
  const locale = state.market === "us" ? "en-US" : "de-DE";

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1 style={{ margin: 0 }}>Billing</h1>
        <p className={styles.muted}>
          {state.market === "us"
            ? "Checkout and portal actions are simulated locally only."
            : "Checkout- und Portal-Aktionen werden nur lokal simuliert."}
        </p>
      </section>

      <section className={styles.card}>
        <h2 style={{ margin: 0 }}>Abo-Status</h2>
        <p className={styles.muted}>Produkt: {state.billing.planLabel}</p>
        <p className={styles.muted}>Status: {state.billing.hasSubscription ? "active" : "trial"}</p>
        <p className={styles.muted}>
          Naechste Abrechnung: {new Date(state.billing.nextInvoiceAt).toLocaleString(locale, { dateStyle: "medium" })}
        </p>
        <div className={styles.row}>
          <button type="button" className={styles.button} onClick={toggleBilling}>
            {state.billing.hasSubscription ? "Abo pausieren (Demo)" : "Abo starten (Demo)"}
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={toggleBilling}>
            Stripe-Portal simulieren
          </button>
        </div>
      </section>
    </main>
  );
}
