import { redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import styles from "./onboarding.module.css";

const timeZones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
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
          <p className={styles.eyebrow}>SmartFlow setup</p>
          <h1 className={styles.title} id="onboarding-title">
            Add your company
          </h1>
          <p className={styles.copy}>
            Tell us the basics so SmartFlow can prepare your workspace.
          </p>
        </header>

        {error ? <p className={styles.message}>{error}</p> : null}

        <form action={completeOnboardingAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Company Name</span>
            <input
              className={styles.input}
              name="companyName"
              required
              type="text"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Contact Person</span>
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
            <span className={styles.label}>Email</span>
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
            <span className={styles.label}>Phone</span>
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
            <span className={styles.label}>Time Zone</span>
            <select
              className={styles.select}
              defaultValue="America/New_York"
              name="timezone"
              required
            >
              {timeZones.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Business Hours</span>
            <textarea
              className={styles.textarea}
              name="businessHours"
              placeholder="Monday-Friday, 9:00 AM-5:00 PM"
            />
          </label>

          <button className={styles.button} type="submit">
            Complete setup
          </button>
        </form>
      </section>
    </main>
  );
}
