import type { Metadata } from "next";
import Link from "next/link";

import LegalFooter from "@/shared/ui/LegalFooter";
import { SITE_NAME } from "@/shared/config/site";
import { trackAnalyticsEvent } from "@/features/analytics/events";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

import styles from "./page.module.css";

export const generateMetadata = async (): Promise<Metadata> => {
  const { config } = await getRequestMarket();
  const copy = getMarketCopy(config.code);

  return {
    title: copy.landing.metadataTitle,
    description: copy.landing.siteDescription,
    alternates: {
      canonical: config.siteUrl,
    },
    openGraph: {
      type: "website",
      title: SITE_NAME,
      description: copy.landing.siteDescription,
      url: config.siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: copy.landing.siteDescription,
    },
  };
};

export default async function Home() {
  const { market, config } = await getRequestMarket();
  const copy = getMarketCopy(config.code).landing;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: market === "us" ? "399" : "299",
      priceCurrency: market === "us" ? "USD" : "EUR",
    },
    description: copy.siteDescription,
    url: config.siteUrl,
  };

  trackAnalyticsEvent({
    eventName: "landing_view",
    market,
    isAuthenticated: false,
  });

  return (
    <main className={styles.page} id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className={styles.topBar}>
        <VarnitoLogo subtitle={market === "us" ? "Lead Operating System" : "Lead-Betriebssystem"} />
        <div className={styles.topActions}>
          <Link className={styles.secondaryButton} href="/demo">
            {market === "us" ? "View demo" : "Demo ansehen"}
          </Link>
          <Link className={styles.secondaryButton} href="/login">
            {market === "us" ? "Sign in" : "Anmelden"}
          </Link>
          <Link className={styles.primaryButton} href="/registrierung">
            {copy.primaryCta}
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroBrand}>
            <VarnitoLogo />
          </div>
          <h1>{copy.heroTitle}</h1>
          <p className={styles.lead}>
            {copy.heroLead}
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/registrierung">
              {copy.primaryCta}
            </Link>
            <Link className={styles.secondaryButton} href="/demo">
              {market === "us" ? "View demo" : "Demo ansehen"}
            </Link>
          </div>

          <p className={styles.supportingText}>
            {copy.supporting}
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="demo-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{market === "us" ? "DEMO" : "DEMO"}</p>
          <h2 id="demo-title">{market === "us" ? "See it in action" : "Varnito live ansehen"}</h2>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/demo">
            {market === "us" ? "View demo" : "Demo ansehen"}
          </Link>
        </div>
      </section>

      <section className={`${styles.section} ${styles.trialSection}`} aria-labelledby="trial-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{market === "us" ? "FREE TRIAL" : "KOSTENLOS TESTEN"}</p>
          <h2 id="trial-title">{market === "us" ? "Try Varnito free for 30 days" : "Varnito 30 Tage kostenlos testen"}</h2>
        </div>

        <p className={styles.supportingText}>
          {market === "us"
            ? "Start in minutes and decide after the trial."
            : "Schnell starten und nach der Testphase entscheiden."}
        </p>
      </section>

      <section className={`${styles.section} ${styles.pricingSection}`} aria-labelledby="pricing-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.pricingEyebrow}</p>
          <h2 id="pricing-title">{copy.pricingTitle}</h2>
        </div>

        <article className={styles.pricingCard}>
          <div className={styles.priceWrap}>
            <p className={styles.pricingLabel}>{copy.pricingLabel}</p>
            <div className={styles.priceStack}>
              <strong className={styles.price}>{copy.pricingValue}</strong>
              <span className={styles.pricePeriod}>{market === "us" ? "per month" : "pro Monat"}</span>
            </div>
            <div className={styles.pricingDetails}>
              <p>{market === "us" ? "Applicable taxes calculated at checkout." : "zzgl. gesetzlicher USt."}</p>
              <p>{market === "us" ? "No hidden fees." : "Keine versteckten Gebühren."}</p>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.ctaBand} aria-label={market === "us" ? "Start your 30-day free trial" : "30 Tage kostenlos testen"}>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/registrierung">
            {copy.primaryCta}
          </Link>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}