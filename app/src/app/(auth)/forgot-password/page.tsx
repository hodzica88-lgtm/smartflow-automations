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
          <p className={styles.eyebrow}>SmartFlow</p>
          <h1 className={styles.title} id="forgot-title">
            Reset password
          </h1>
          <p className={styles.copy}>
            Enter your email and we will send password reset instructions if the
            account exists.
          </p>
        </header>

        {error ? (
          <p className={`${styles.message} ${styles.error}`}>{error}</p>
        ) : null}

        {sent ? (
          <p className={`${styles.message} ${styles.success}`}>
            Check your email for password reset instructions.
          </p>
        ) : null}

        <form action={forgotPasswordAction} className={styles.form}>
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

          <button className={styles.button} type="submit">
            Send reset email
          </button>
        </form>

        <nav className={styles.links} aria-label="Password reset help">
          <Link className={styles.link} href="/login">
            Back to login
          </Link>
        </nav>
      </section>
    </main>
  );
}
