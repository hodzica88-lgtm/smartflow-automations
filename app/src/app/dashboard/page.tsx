import { redirect } from "next/navigation";

import { logoutAction } from "@/features/auth/actions";
import { getUserCompanyState } from "@/features/onboarding/company";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyState = await getUserCompanyState(user.id);

  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.header} aria-labelledby="dashboard-title">
        <p className={styles.eyebrow}>Dashboard</p>
        <h1 className={styles.title} id="dashboard-title">
          Welcome to SmartFlow
        </h1>
        <p className={styles.copy}>
          Authentication is active. Onboarding, company setup, and product
          workflows will be added in later sprints.
        </p>

        <form action={logoutAction} className={styles.toolbar}>
          <button className={styles.button} type="submit">
            Log out
          </button>
        </form>
      </section>
    </main>
  );
}
