import { redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { INDUSTRY_OPTIONS } from "@/shared/config/inquiryTypes";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import LegalFooter from "@/shared/ui/LegalFooter";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import styles from "./onboarding.module.css";

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const { market } = await getRequestMarket();
  const copy = getMarketCopy(market).shared.auth;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyState = await getUserCompanyState(user.id, { allowMember: true });

  if (companyState.companyId) {
    redirect(companyState.isOwner ? "/dashboard" : "/dashboard/leads");
  }

  if (companyState.role === "member" || companyState.role === "admin") {
    redirect(
      companyState.teamStatus === "pending"
        ? "/team/accept"
        : `/login?error=${encodeURIComponent(copy.errors.inactiveMember)}`,
    );
  }

  const { error } = await searchParams;

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="onboarding-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>{copy.onboardingEyebrow}</p>
          <h1 className={styles.title} id="onboarding-title">
            {copy.onboardingTitle}
          </h1>
          <p className={styles.copy}>
            {copy.onboardingLead}
          </p>
        </header>

        {error ? <p className={styles.message}>{error}</p> : null}

        <form action={completeOnboardingAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>{copy.onboardingFields.companyName}</span>
            <input
              className={styles.input}
              name="companyName"
              required
              type="text"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.onboardingFields.contactPerson}</span>
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
            <span className={styles.label}>{copy.onboardingFields.email}</span>
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
            <span className={styles.label}>{copy.onboardingFields.phone}</span>
            <input
              autoComplete="tel"
              className={styles.input}
              name="phone"
              required
              type="tel"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.onboardingFields.website}</span>
            <input
              autoComplete="url"
              className={styles.input}
              name="website"
              placeholder="https://example.com"
              type="url"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.onboardingFields.timezone}</span>
            <select
              className={styles.select}
              defaultValue={copy.onboardingTimeZones[0]?.value ?? "Europe/Berlin"}
              name="timezone"
              required
            >
              {copy.onboardingTimeZones.map((timezone) => (
                <option key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.onboardingFields.industry}</span>
            <select
              className={styles.select}
              defaultValue=""
              name="industry"
              required
            >
              <option value="" disabled>
                {copy.onboardingFields.industryPlaceholder}
              </option>
              {INDUSTRY_OPTIONS.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.onboardingFields.averageOrderValue}</span>
            <input
              className={styles.input}
              inputMode="decimal"
              max="10000000"
              min="0.01"
              name="averageOrderValue"
              placeholder={market === "us" ? "e.g. 500" : "zum Beispiel 500"}
              required
              step="0.01"
              type="number"
            />
            <small>
              {copy.onboardingFields.averageOrderValueHint}
            </small>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.onboardingFields.businessHours}</span>
            <textarea
              className={styles.textarea}
              name="businessHours"
              placeholder={market === "us" ? "Monday-Friday, 9:00-17:00" : "Montag-Freitag, 9:00-17:00"}
            />
          </label>

          <button className={styles.button} type="submit">
            {copy.onboardingSubmit}
          </button>
        </form>
      </section>

      <LegalFooter />
    </main>
  );
}
