"use client";

import { useSearchParams } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

export default function DemoBillingPage() {
  const { state, toggleBilling } = useDemo();
  const copy = getDemoCopy(state.market);
  const searchParams = useSearchParams();
  const locale = state.market === "us" ? "en-US" : "de-DE";
  const isHighlighted = searchParams.get("highlight") === "billing";

  return (
    <main className={styles.shell}>
      <section className={`${styles.hero} ${isHighlighted ? styles.highlightedSection : ""}`}>
        <h1 style={{ margin: 0 }}>{copy.nav.billing}</h1>
        <p className={styles.muted}>{copy.billing.description}</p>
      </section>

      <section className={styles.card}>
        <h2 style={{ margin: 0 }}>{copy.billing.subscriptionStatus}</h2>
        <p className={styles.muted}>{copy.billing.product}: {state.billing.planLabel}</p>
        <p className={styles.muted}>{copy.billing.status}: {state.billing.hasSubscription ? copy.billing.active : copy.billing.trial}</p>
        <p className={styles.muted}>
          {copy.billing.nextInvoice}: {new Date(state.billing.nextInvoiceAt).toLocaleDateString(locale, { dateStyle: "medium" })}
        </p>
        <div className={styles.row}>
          <button type="button" className={styles.button} onClick={toggleBilling}>
            {state.billing.hasSubscription ? copy.billing.pauseDemo : copy.billing.startDemo}
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={toggleBilling}>
            {copy.billing.portalDemo}
          </button>
        </div>
      </section>
    </main>
  );
}
