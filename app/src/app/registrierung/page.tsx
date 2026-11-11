import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import styles from "@/app/(auth)/auth.module.css";
import { registerAction } from "@/features/auth/actions";
import { appendGrowthSourceToHref, resolveGrowthSourceFromRequest } from "@/features/analytics/growth";
import { sanitizeRegistrationSource } from "@/features/auth/registration";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import LegalFooter from "@/shared/ui/LegalFooter";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

export const generateMetadata = async (): Promise<Metadata> => {
  const { config } = await getRequestMarket();
  const copy = getMarketCopy(config.code).shared.auth;

  return {
    title: `${copy.registrationTitle} | Varnito`,
    alternates: { canonical: `${config.siteUrl}/registrierung` },
    robots: { index: true, follow: true },
  };
};

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await getRequestMarket();
  const shared = getMarketCopy(market).shared;
  const copy = shared.auth;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const source = await resolveGrowthSourceFromRequest({ searchParams: resolvedSearchParams });
  const formSource = sanitizeRegistrationSource(source);
  const loginHref = appendGrowthSourceToHref("/login?next=%2Fonboarding", source);
  const homeHref = appendGrowthSourceToHref("/", source);
  const errorParam = resolvedSearchParams?.error;
  const error = typeof errorParam === "string" ? errorParam : null;
  const sent = resolvedSearchParams?.sent === "1";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(formSource ? `/onboarding?source=${encodeURIComponent(formSource)}` : "/onboarding");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="registration-title">
        <header className={styles.header}>
          <VarnitoLogo subtitle={market === "us" ? "Trial Registration" : "Testzugang"} />
          <p className={styles.eyebrow}>{copy.registrationEyebrow}</p>
          <h1 className={styles.title} id="registration-title">
            {copy.registrationTitle}
          </h1>
          <p className={styles.copy}>{copy.registrationLead}</p>
          <p className={styles.copy}>
            <strong>{copy.registrationPrice}</strong> · {copy.registrationTaxNote}
          </p>
        </header>

        {error ? <p className={`${styles.message} ${styles.error}`}>{error}</p> : null}
        {sent ? <p className={`${styles.message} ${styles.success}`}>{copy.registrationSent}</p> : null}

        <form action={registerAction} className={styles.form}>
          {formSource ? <input name="source" type="hidden" value={formSource} /> : null}

          <label className={styles.field}>
            <span className={styles.label}>{copy.registrationEmail}</span>
            <input
              autoComplete="email"
              className={styles.input}
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.registrationPassword}</span>
            <input
              autoComplete="new-password"
              className={styles.input}
              maxLength={72}
              minLength={10}
              name="password"
              required
              type="password"
            />
            <span className={styles.copy}>{copy.registrationPasswordHint}</span>
          </label>

          <label className={styles.copy}>
            <input name="consent" required type="checkbox" />{" "}
            {copy.registrationConsentPrefix}{" "}
            <Link className={styles.link} href="/agb">
              {shared.legalLinks.terms}
            </Link>{" "}
            {copy.registrationConsentMiddle}{" "}
            <Link className={styles.link} href="/datenschutz">
              {shared.legalLinks.privacy}
            </Link>{" "}
            {copy.registrationConsentSuffix}
          </label>

          <button className={styles.button} type="submit">
            {copy.registrationSubmit}
          </button>
        </form>

        <nav className={styles.links} aria-label={copy.registrationHaveAccount}>
          <span className={styles.copy}>{copy.registrationHaveAccount}</span>
          <Link className={styles.link} href={loginHref}>
            {copy.registrationLoginCta}
          </Link>
          <Link className={styles.link} href={homeHref}>
            {copy.registrationHomeCta}
          </Link>
        </nav>
      </section>

      <LegalFooter />
    </main>
  );
}
