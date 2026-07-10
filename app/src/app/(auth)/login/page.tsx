import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "@/features/auth/actions";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import styles from "../auth.module.css";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="login-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>AnfragePilot</p>
          <h1 className={styles.title} id="login-title">
            Anmelden
          </h1>
          <p className={styles.copy}>
            Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an.
          </p>
        </header>

        {error ? (
          <p className={`${styles.message} ${styles.error}`}>{error}</p>
        ) : null}

        <form action={loginAction} className={styles.form}>
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

          <label className={styles.field}>
            <span className={styles.label}>Passwort</span>
            <input
              autoComplete="current-password"
              className={styles.input}
              name="password"
              required
              type="password"
            />
          </label>

          <button className={styles.button} type="submit">
            Anmelden
          </button>
        </form>

        <nav className={styles.links} aria-label="Anmeldehilfe">
          <Link className={styles.link} href="/forgot-password">
            Passwort vergessen?
          </Link>
        </nav>
      </section>
    </main>
  );
}
