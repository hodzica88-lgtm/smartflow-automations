import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "@/features/auth/actions";
import { getSafePostLoginPath } from "@/features/auth/redirects";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

import styles from "../auth.module.css";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  const { market } = await getRequestMarket();
  const copy = getMarketCopy(market).shared.auth;
  const nextPath = getSafePostLoginPath(next);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath ?? "/dashboard");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="login-title">
        <header className={styles.header}>
          <VarnitoLogo subtitle={market === "us" ? "Secure Sign In" : "Sicherer Zugang"} />
          <h1 className={styles.title} id="login-title">
            {copy.loginTitle}
          </h1>
          <p className={styles.copy}>
            {copy.loginLead}
          </p>
        </header>

        {error ? (
          <p className={`${styles.message} ${styles.error}`}>{error}</p>
        ) : null}

        <form action={loginAction} className={styles.form}>
          {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}

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

          <label className={styles.field}>
            <span className={styles.label}>{market === "us" ? "Password" : "Passwort"}</span>
            <input
              autoComplete="current-password"
              className={styles.input}
              name="password"
              required
              type="password"
            />
          </label>

          <button className={styles.button} type="submit">
            {copy.loginSubmit}
          </button>
        </form>

        <nav className={styles.links} aria-label={market === "us" ? "Sign-in help" : "Anmeldehilfe"}>
          <Link className={styles.link} href="/forgot-password">
            {copy.loginForgotPassword}
          </Link>
        </nav>
      </section>
    </main>
  );
}
