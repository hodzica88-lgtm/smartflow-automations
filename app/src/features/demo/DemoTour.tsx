"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { DemoMarket } from "@/features/demo/types";
import styles from "@/features/demo/demo.module.css";

type TourStep = {
  route: string;
  title: string;
  text: string;
};

const createSteps = (market: DemoMarket): TourStep[] => {
  if (market === "us") {
    return [
      { route: "/demo/dashboard", title: "Dashboard", text: "See live KPIs and open workload. This is your daily control center." },
      { route: "/demo/leads", title: "Leads", text: "Review every inquiry in one list. Update status and owner instantly." },
      { route: "/demo/leads/lead-us-1", title: "Lead details", text: "Open one lead to inspect context. Keep notes and ownership in sync." },
      { route: "/demo/team", title: "Team", text: "Invite teammates in seconds. Manage active and pending access." },
      { route: "/demo/billing", title: "Billing", text: "Track plan and renewal at a glance. Simulate actions without Stripe." },
      { route: "/demo/settings", title: "Settings", text: "Adapt company profile and inquiry types. Changes stay local in this demo." },
    ];
  }

  return [
    { route: "/demo/dashboard", title: "Dashboard", text: "Hier sehen Sie Kennzahlen und offene Aufgaben. Das ist Ihre taegliche Uebersicht." },
    { route: "/demo/leads", title: "Leads", text: "Alle Anfragen stehen in einer Liste. Status und Zustaendigkeit sind direkt anpassbar." },
    { route: "/demo/leads/lead-de-1", title: "Lead-Details", text: "In der Detailansicht pruefen Sie alle Kontaktdaten. Notizen und Status bleiben in einem Flow." },
    { route: "/demo/team", title: "Team", text: "Laden Sie Mitarbeitende mit einer E-Mail ein. Offene und aktive Zugaenge verwalten Sie hier." },
    { route: "/demo/billing", title: "Billing", text: "Abo-Status und naechste Verlaengerung sind sofort sichtbar. Aktionen werden nur simuliert." },
    { route: "/demo/settings", title: "Einstellungen", text: "Pflegen Sie Firmendaten und Anfragearten. Alles bleibt nur im Browser gespeichert." },
  ];
};

export default function DemoTour({ market }: { market: DemoMarket }) {
  const router = useRouter();
  const pathname = usePathname();
  const steps = useMemo(() => createSteps(market), [market]);
  const [open, setOpen] = useState(true);
  const [completed, setCompleted] = useState(false);
  const stepIndex = Math.max(
    0,
    steps.findIndex((step) => pathname.startsWith(step.route)),
  );

  const currentStep = steps[stepIndex];

  const onNext = () => {
    if (stepIndex >= steps.length - 1) {
      setOpen(false);
      setCompleted(true);
      return;
    }

    const next = steps[stepIndex + 1];
    router.push(next.route);
  };

  if (open && currentStep) {
    return (
      <div className={styles.tourOverlay} role="dialog" aria-modal="true" aria-label="Produkt-Tour">
        <div className={styles.tourCard}>
          <p className={styles.badge} style={{ margin: 0 }}>Schritt {stepIndex + 1} von {steps.length}</p>
          <h2 style={{ margin: 0 }}>{currentStep.title}</h2>
          <p className={styles.muted}>{currentStep.text}</p>
          <div className={styles.tourActions}>
            <button className={styles.buttonSecondary} type="button" onClick={() => setOpen(false)}>
              Ueberspringen
            </button>
            <button className={styles.button} type="button" onClick={onNext}>
              {stepIndex >= steps.length - 1 ? "Tour abschliessen" : "Weiter"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!completed) {
    return null;
  }

  return (
    <aside className={styles.ctaWrap} aria-label="Demo Abschluss">
      <strong>30 Tage kostenlos testen</strong>
      <Link href="/registrierung" className={styles.button}>
        Jetzt kostenlos starten
      </Link>
    </aside>
  );
}
