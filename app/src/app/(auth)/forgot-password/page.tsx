import Link from "next/link";

import { forgotPasswordAction } from "@/features/auth/actions";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";

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
  const { market } = await getRequestMarket();
  const copy = getMarketCopy(market).shared.auth;

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="forgot-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Varnito</p>
          <h1 className={styles.title} id="forgot-title">
            {copy.forgotTitle}
          </h1>
          <p className={styles.copy}>
            {copy.forgotLead}
          </p>
        </header>

        {error ? (
          <p className={`${styles.message} ${styles.error}`}>{error}</p>
        ) : null}

        {sent ? (
          <p className={`${styles.message} ${styles.success}`}>
            {copy.forgotSent}
          </p>
        ) : null}

        <form action={forgotPasswordAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>{market === "us" ? "Email" : "E-Mail"}</span>
            <input
              autoComplete="email"
              className={styles.input}
              name="email"
              required
              type="email"
            />
          </label>

          <button className={styles.button} type="submit">
            {copy.forgotSubmit}
          </button>
        </form>

        <nav className={styles.links} aria-label={market === "us" ? "Password reset help" : "Hilfe zum Zurücksetzen des Passworts"}>
          <Link className={styles.link} href="/login">
            {copy.forgotBackToLogin}
          </Link>
        </nav>
      </section>
    </main>
  );
}
