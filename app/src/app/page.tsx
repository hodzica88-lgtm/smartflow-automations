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
          <p className={styles.kicker}>{market === "us" ? "New release" : "Neue Oberfläche"}</p>
          <h1>{copy.heroTitle}</h1>
          <p className={styles.lead}>
            {copy.heroLead}
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/registrierung">
              {copy.primaryCta}
            </Link>
            <Link className={styles.secondaryButton} href="/demo/dashboard">
              {market === "us" ? "Explore the live demo" : "Live-Demo ansehen"}
            </Link>
            <a className={styles.secondaryButton} href="#so-funktioniert">
              {copy.secondaryCta}
            </a>
          </div>

          <p className={styles.supportingText}>
            {copy.supporting}
          </p>
        </div>

        <div className={styles.heroPanel} aria-label="Produktvorschau">
          <div className={styles.previewCard}>
            <span className={styles.previewLabel}>Dashboard</span>
            <strong>{copy.previewDashboardTitle}</strong>
            <p>{copy.previewDashboardText}</p>
          </div>
          <div className={styles.previewCard}>
            <span className={styles.previewLabel}>Leads</span>
            <strong>{copy.previewLeadsTitle}</strong>
            <p>{copy.previewLeadsText}</p>
          </div>
          <div className={styles.previewCard}>
            <span className={styles.previewLabel}>Billing</span>
            <strong>{copy.previewBillingTitle}</strong>
            <p>{copy.previewBillingText}</p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="views-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.viewsEyebrow}</p>
          <h2 id="views-title">{copy.viewsTitle}</h2>
        </div>

        <div className={styles.viewsGrid}>
          <article className={styles.viewCard}>
            <span className={styles.previewLabel}>Landing</span>
            <strong>{copy.views[0]?.title}</strong>
            <p>{copy.views[0]?.text}</p>
          </article>
          <article className={styles.viewCard}>
            <span className={styles.previewLabel}>Dashboard</span>
            <strong>{copy.views[1]?.title}</strong>
            <p>{copy.views[1]?.text}</p>
          </article>
          <article className={styles.viewCard}>
            <span className={styles.previewLabel}>Billing</span>
            <strong>{copy.views[2]?.title}</strong>
            <p>{copy.views[2]?.text}</p>
          </article>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="problem-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.problemEyebrow}</p>
          <h2 id="problem-title">{copy.problemTitle}</h2>
        </div>

        <div className={styles.gridThree}>
          <article className={styles.featureCard}>
            <h3>{copy.problemItems[0]}</h3>
          </article>
          <article className={styles.featureCard}>
            <h3>{copy.problemItems[1]}</h3>
          </article>
          <article className={styles.featureCard}>
            <h3>{copy.problemItems[2]}</h3>
          </article>
        </div>
      </section>

      <section id="so-funktioniert" className={styles.section} aria-labelledby="solution-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.solutionEyebrow}</p>
          <h2 id="solution-title">{copy.solutionTitle}</h2>
        </div>

        <div className={styles.timeline}>
          {copy.solutionSteps.map((step, index) => (
            <div key={step.title} className={styles.timelineStep}>
              <span>{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="benefits-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.benefitsEyebrow}</p>
          <h2 id="benefits-title">{copy.benefitsTitle}</h2>
        </div>

        <div className={styles.benefitsGrid}>
          {copy.benefits.map((feature) => (
            <div key={feature} className={styles.benefitChip}>
              {feature}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="functions-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.functionsEyebrow}</p>
          <h2 id="functions-title">{copy.functionsTitle}</h2>
        </div>

        <div className={styles.gridTwo}>
          {copy.functions.map((entry) => (
            <article key={entry.title} className={styles.featureCard}>
              <h3>{entry.title}</h3>
              <p>{entry.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pricing-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.pricingEyebrow}</p>
          <h2 id="pricing-title">{copy.pricingTitle}</h2>
        </div>

        <article className={styles.pricingCard}>
          <div>
            <p className={styles.pricingLabel}>{copy.pricingLabel}</p>
            <strong className={styles.price}>{copy.pricingValue}</strong>
            <p className={styles.pricingCopy}>{copy.pricingTaxNote}</p>
            <p className={styles.pricingCopy}>
              {copy.pricingCopy}
            </p>
          </div>
          <div className={styles.pricingMeta}>
            {copy.pricingMeta.map((entry) => (
              <span key={entry}>{entry}</span>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="faq-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.faqEyebrow}</p>
          <h2 id="faq-title">{copy.faqTitle}</h2>
        </div>

        <div className={styles.faqGrid}>
          {copy.faq.map((entry) => (
            <article key={entry.question} className={styles.faqCard}>
              <h3>{entry.question}</h3>
              <p>{entry.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="trust-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{market === "us" ? "Trust" : "Vertrauen"}</p>
          <h2 id="trust-title">{market === "us" ? "Built for reliable daily operations." : "Für verlässliche tägliche Abläufe gebaut."}</h2>
        </div>
        <div className={styles.gridThree}>
          <article className={styles.featureCard}>
            <h3>{market === "us" ? "Clear ownership" : "Klare Zuständigkeiten"}</h3>
            <p>{market === "us" ? "Every lead has a visible owner and status." : "Jede Anfrage hat eine sichtbare Zuständigkeit und einen klaren Status."}</p>
          </article>
          <article className={styles.featureCard}>
            <h3>{market === "us" ? "Secure billing flow" : "Sicherer Billing-Flow"}</h3>
            <p>{market === "us" ? "Trial, subscription, and tax handling are transparent." : "Testphase, Abonnement und Steuerlogik sind transparent nachvollziehbar."}</p>
          </article>
          <article className={styles.featureCard}>
            <h3>{market === "us" ? "Audit-ready operations" : "Audit-fähige Abläufe"}</h3>
            <p>{market === "us" ? "Operational actions are logged and reviewable." : "Operative Änderungen sind protokolliert und nachvollziehbar."}</p>
          </article>
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="cta-title">
        <div>
          <p className={styles.sectionEyebrow}>{copy.ctaEyebrow}</p>
          <h2 id="cta-title">{copy.ctaTitle}</h2>
          <p>
            {copy.ctaText}
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/registrierung">
            {copy.primaryCta}
          </Link>
          <a className={styles.secondaryButton} href="#top">
            {copy.ctaBackToTop}
          </a>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}