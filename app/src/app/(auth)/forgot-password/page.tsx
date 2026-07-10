import Link from "next/link";

import { forgotPasswordAction } from "@/features/auth/actions";

import styles from "../auth.module.css";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    sent?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error, sent } = await searchParams;

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="forgot-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>AnfragePilot</p>
          <h1 className={styles.title} id="forgot-title">
            Passwort zurücksetzen
          </h1>
          <p className={styles.copy}>
            Geben Sie Ihre E-Mail-Adresse ein. Falls ein Konto existiert,
            senden wir Ihnen Anweisungen zum Zurücksetzen des Passworts.
          </p>
        </header>

        {error ? (
          <p className={`${styles.message} ${styles.error}`}>{error}</p>
        ) : null}

        {sent ? (
          <p className={`${styles.message} ${styles.success}`}>
            Prüfen Sie Ihr E-Mail-Postfach auf Anweisungen zum Zurücksetzen des Passworts.
          </p>
        ) : null}

        <form action={forgotPasswordAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>E-Mail</span>
            <input
              autoComplete="email"
              className={styles.input}
              name="email"
              required
              type="email"
            />
          </label>

          <button className={styles.button} type="submit">
            E-Mail zum Zurücksetzen senden
          </button>
        </form>

        <nav className={styles.links} aria-label="Hilfe zum Zurücksetzen des Passworts">
          <Link className={styles.link} href="/login">
            Zurück zur Anmeldung
          </Link>
        </nav>
      </section>
    </main>
  );
}
