import Link from "next/link";
import { redirect } from "next/navigation";

import { resetPasswordAction } from "@/features/auth/actions";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

import styles from "../auth.module.css";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { error } = await searchParams;
  const { market } = await getRequestMarket();
  const copy = getMarketCopy(market).shared.auth;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/forgot-password?error=${encodeURIComponent(copy.errors.resetLinkInvalid)}`);
  }

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="reset-title">
        <header className={styles.header}>
          <VarnitoLogo subtitle={market === "us" ? "Password Recovery" : "Passworthilfe"} />
          <h1 className={styles.title} id="reset-title">
            {copy.resetTitle}
          </h1>
          <p className={styles.copy}>{copy.resetLead}</p>
        </header>

        {error ? <p className={`${styles.message} ${styles.error}`}>{error}</p> : null}

        <form action={resetPasswordAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>{copy.resetPasswordLabel}</span>
            <input
              autoComplete="new-password"
              className={styles.input}
              maxLength={72}
              minLength={10}
              name="password"
              required
              type="password"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.resetConfirmLabel}</span>
            <input
              autoComplete="new-password"
              className={styles.input}
              maxLength={72}
              minLength={10}
              name="confirmPassword"
              required
              type="password"
            />
          </label>

          <button className={styles.button} type="submit">
            {copy.resetSubmit}
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
