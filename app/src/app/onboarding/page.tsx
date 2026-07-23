import { redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { INDUSTRY_OPTIONS } from "@/shared/config/inquiryTypes";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import styles from "./onboarding.module.css";

const timeZones = [
  { value: "Europe/Berlin", label: "Europe/Berlin — Deutschland" },
  { value: "Europe/Vienna", label: "Europe/Vienna — Österreich" },
  { value: "Europe/Zurich", label: "Europe/Zurich — Schweiz" },
];

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyState = await getUserCompanyState(user.id);

  if (companyState.companyId) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="onboarding-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>AnfragePilot Einrichtung</p>
          <h1 className={styles.title} id="onboarding-title">
            Unternehmen anlegen
          </h1>
          <p className={styles.copy}>
            Geben Sie die wichtigsten Daten ein, damit AnfragePilot Ihren Arbeitsbereich vorbereiten kann.
          </p>
        </header>

        {error ? <p className={styles.message}>{error}</p> : null}

        <form action={completeOnboardingAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Firmenname</span>
            <input
              className={styles.input}
              name="companyName"
              required
              type="text"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Ansprechpartner</span>
            <input
              autoComplete="name"
              className={styles.input}
              name="contactPerson"
              required
              type="text"
              defaultValue={user.user_metadata.full_name ?? ""}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>E-Mail</span>
            <input
              autoComplete="email"
              className={styles.input}
              name="email"
              required
              type="email"
              defaultValue={user.email ?? ""}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Telefon</span>
            <input
              autoComplete="tel"
              className={styles.input}
              name="phone"
              required
              type="tel"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Website</span>
            <input
              autoComplete="url"
              className={styles.input}
              name="website"
              placeholder="https://example.com"
              type="url"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Zeitzone</span>
            <select
              className={styles.select}
              defaultValue="Europe/Berlin"
              name="timezone"
              required
            >
              {timeZones.map((timezone) => (
                <option key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Branche</span>
            <select
              className={styles.select}
              defaultValue=""
              name="industry"
              required
            >
              <option value="" disabled>
                Bitte wählen
              </option>
              {INDUSTRY_OPTIONS.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Ungefährer durchschnittlicher Auftragswert in Euro</span>
            <input
              className={styles.input}
              inputMode="decimal"
              max="10000000"
              min="0.01"
              name="averageOrderValue"
              placeholder="zum Beispiel 500"
              required
              step="0.01"
              type="number"
            />
            <small>
              Eine grobe Schätzung reicht. Varnito nutzt sie später automatisch, um den ungefähren Wert gewonnener Aufträge zu zeigen.
            </small>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Geschäftszeiten</span>
            <textarea
              className={styles.textarea}
              name="businessHours"
              placeholder="Montag-Freitag, 9:00-17:00"
            />
          </label>

          <button className={styles.button} type="submit">
            Einrichtung abschließen
          </button>
        </form>
      </section>
    </main>
  );
}
