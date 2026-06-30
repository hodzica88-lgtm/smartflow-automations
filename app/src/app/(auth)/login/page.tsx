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
          <p className={styles.eyebrow}>SmartFlow</p>
          <h1 className={styles.title} id="login-title">
            Log in
          </h1>
          <p className={styles.copy}>
            Access your dashboard with your SmartFlow email and password.
          </p>
        </header>

        {error ? (
          <p className={`${styles.message} ${styles.error}`}>{error}</p>
        ) : null}

        <form action={loginAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              autoComplete="email"
              className={styles.input}
              name="email"
              required
              type="email"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              autoComplete="current-password"
              className={styles.input}
              name="password"
              required
              type="password"
            />
          </label>

          <button className={styles.button} type="submit">
            Log in
          </button>
        </form>

        <nav className={styles.links} aria-label="Login help">
          <Link className={styles.link} href="/forgot-password">
            Forgot password?
          </Link>
        </nav>
      </section>
    </main>
  );
}
