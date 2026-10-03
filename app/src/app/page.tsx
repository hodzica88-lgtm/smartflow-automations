import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import LegalFooter from "@/shared/ui/LegalFooter";
import { SITE_NAME } from "@/shared/config/site";
import {
  appendGrowthSourceToHref,
  resolveGrowthSourceFromRequest,
  trackGrowthEvent,
} from "@/features/analytics/growth";
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

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market, config } = await getRequestMarket();
  const copy = getMarketCopy(config.code).landing;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const headerStore = await headers();
  const referrer = headerStore.get("referer");
  const userAgent = headerStore.get("user-agent");
  const source = await resolveGrowthSourceFromRequest({ searchParams: resolvedSearchParams, referrer });
  const registrationHref = appendGrowthSourceToHref("/registrierung", source);
  const demoHref = appendGrowthSourceToHref("/demo", source);
  const loginHref = appendGrowthSourceToHref("/login", source);
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

  await trackGrowthEvent({
    eventName: "visitor",
    market,
    isAuthenticated: false,
    source,
    searchParams: resolvedSearchParams,
    referrer,
    userAgent,
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
          <Link className={styles.secondaryButton} href={demoHref}>
            {market === "us" ? "View demo" : "Demo ansehen"}
          </Link>
          <Link className={styles.secondaryButton} href={loginHref}>
            {market === "us" ? "Sign in" : "Anmelden"}
          </Link>
          <Link className={styles.primaryButton} href={registrationHref}>
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
            <Link className={styles.primaryButton} href={registrationHref}>
              {copy.primaryCta}
            </Link>
            <Link className={styles.secondaryButton} href={demoHref}>
              {copy.secondaryCta}
            </Link>
          </div>

          <p className={styles.trustLine}>{copy.supporting}</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="missed-lead-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{copy.problemEyebrow}</p>
          <h2 id="missed-lead-title">{copy.problemTitle}</h2>
        </div>

        <div className={styles.proseBlock}>
          <p>
            {market === "us"
              ? "Maybe it is a small repair. Maybe it is a $5,000 job. The problem is the same: once a serious inquiry is forgotten or answered too late, you may never get the opportunity back."
              : "Vielleicht geht es um einen kleinen Auftrag. Vielleicht um mehrere Tausend Euro. Das Problem bleibt gleich: Wird eine ernsthafte Anfrage vergessen oder zu spät bearbeitet, ist die Chance möglicherweise weg."}
          </p>
          <p className={styles.emphasis}>
            {market === "us"
              ? "You already did the hard part — getting the customer to contact you."
              : "Den schwierigen Teil haben Sie bereits geschafft: Der Kunde hat Sie kontaktiert."}
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="demo-title">
        <div className={styles.sectionHeading}>
          <h2 id="demo-title">{market === "us" ? "See it in action" : "Varnito live ansehen"}</h2>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryButton} href={demoHref}>
            {market === "us" ? "View demo" : "Demo ansehen"}
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="keep-tools-title">
        <div className={styles.sectionHeading}>
          <h2 id="keep-tools-title">{market === "us" ? "You do not need another complicated system." : "Sie brauchen kein weiteres kompliziertes System."}</h2>
        </div>

        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <h3>{market === "us" ? "Keep your website" : "Website behalten"}</h3>
            <p>{market === "us" ? "Varnito works with the inquiry flow you already have." : "Varnito ergänzt den Anfrageprozess, den Sie bereits nutzen."}</p>
          </article>
          <article className={styles.featureCard}>
            <h3>{market === "us" ? "Keep your existing tools" : "Bestehende Systeme behalten"}</h3>
            <p>{market === "us" ? "Varnito does not ask you to replace your CRM, calendar, or daily workflow." : "CRM, Kalender und Arbeitsabläufe müssen nicht ersetzt werden."}</p>
          </article>
          <article className={styles.featureCard}>
            <h3>{market === "us" ? "Add the missing safety net" : "Die fehlende Absicherung ergänzen"}</h3>
            <p>{market === "us" ? "New inquiries stay visible so your team knows what still needs attention." : "Neue Anfragen bleiben sichtbar und Ihr Team erkennt, was noch bearbeitet werden muss."}</p>
          </article>
        </div>

        <p className={styles.sectionLead}>
          {market === "us"
            ? "Varnito focuses on one job: helping your team keep new opportunities from slipping through the cracks."
            : "Varnito konzentriert sich bewusst auf eine Aufgabe: Neue Kundenchancen sollen im Alltag nicht untergehen."}
        </p>
      </section>

      <section className={styles.section} aria-labelledby="real-life-title">
        <div className={styles.sectionHeading}>
          <h2 id="real-life-title">{market === "us" ? "Leads do not wait until you are sitting at a desk." : "Anfragen kommen nicht nur dann, wenn Sie gerade am Schreibtisch sitzen."}</h2>
        </div>

        <div className={styles.realityGrid}>
          <div className={styles.realityCard}>{market === "us" ? "You’re on a job." : "Sie sind beim Kunden."}</div>
          <div className={styles.realityCard}>{market === "us" ? "You’re driving." : "Sie sind unterwegs."}</div>
          <div className={styles.realityCard}>{market === "us" ? "The office is busy." : "Im Büro ist viel los."}</div>
          <div className={styles.realityCard}>{market === "us" ? "It’s after business hours." : "Die Anfrage kommt nach Feierabend."}</div>
        </div>

        <p className={styles.sectionLead}>
          {market === "us" ? "The inquiry still needs to be seen." : "Die Anfrage muss trotzdem gesehen werden."}
        </p>
      </section>

      <section className={styles.section} aria-labelledby="simple-title">
        <div className={styles.sectionHeading}>
          <h2 id="simple-title">{market === "us" ? "Simple on purpose." : "Bewusst einfach."}</h2>
        </div>

        <div className={styles.stepsGrid}>
          <article className={styles.stepCard}>
            <span className={styles.stepNumber}>01</span>
            <h3>{market === "us" ? "A lead comes in" : "Eine Anfrage kommt rein"}</h3>
          </article>
          <article className={styles.stepCard}>
            <span className={styles.stepNumber}>02</span>
            <h3>{market === "us" ? "Your team gets alerted" : "Ihr Team wird informiert"}</h3>
          </article>
          <article className={styles.stepCard}>
            <span className={styles.stepNumber}>03</span>
            <h3>{market === "us" ? "Everyone can see what happens next" : "Alle sehen, was als Nächstes zu tun ist"}</h3>
          </article>
        </div>

        <p className={styles.supportingText}>
          {market === "us"
            ? "No giant CRM rollout. No new sales process to learn. Just a clearer way to make sure inquiries get handled."
            : "Keine riesige CRM-Einführung. Kein neuer Vertriebsprozess, den das Team erst lernen muss. Einfach mehr Klarheit bei neuen Anfragen."}
        </p>
      </section>

      <section className={`${styles.section} ${styles.trialSection}`} aria-labelledby="trial-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>{market === "us" ? "Try it in your real business" : "Im eigenen Betrieb testen"}</p>
          <h2 id="trial-title">{market === "us" ? "30 days to see whether Varnito earns a place in your workflow." : "30 Tage Zeit, um zu sehen, ob Varnito Ihnen im Alltag wirklich hilft."}</h2>
        </div>

        <p className={styles.supportingText}>
          {market === "us"
            ? "Use it with real inquiries. See how your team works with it. Then decide whether you want to keep it."
            : "Nutzen Sie Varnito mit echten Anfragen. Sehen Sie, wie Ihr Team damit arbeitet. Danach entscheiden Sie, ob Sie es weiter nutzen möchten."}
        </p>

        <p className={styles.trialSupport}>
          {market === "us" ? "You do not have to believe a sales pitch. Test it yourself." : "Sie müssen keinem Werbeversprechen glauben. Testen Sie es selbst."}
        </p>

        <div className={styles.actions}>
          <Link className={styles.primaryButton} href={registrationHref}>
            {market === "us" ? "Start my 30-day free trial" : "30 Tage kostenlos testen"}
          </Link>
        </div>
      </section>

      <section className={`${styles.section} ${styles.pricingSection}`} aria-labelledby="pricing-title">
        <div className={styles.sectionHeading}>
          <h2 id="pricing-title">{copy.pricingTitle}</h2>
        </div>

        <p className={styles.pricingFrame}>
          {market === "us"
            ? "If one saved opportunity is worth more than the monthly subscription, Varnito can pay for itself. Your numbers decide."
            : "Wenn schon eine einzige nicht verlorene Kundenchance mehr wert ist als das Monatsabo, kann sich Varnito rechnen. Entscheidend sind Ihre eigenen Zahlen."}
        </p>

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
        <div className={styles.ctaContent}>
          <p className={styles.sectionEyebrow}>{market === "us" ? "Try it in your real business" : "Im eigenen Betrieb testen"}</p>
          <h2>{market === "us" ? "How many leads do you want to leave to chance?" : "Wie viele Anfragen möchten Sie dem Zufall überlassen?"}</h2>
          <p className={styles.supportingText}>
            {market === "us"
              ? "Try Varnito with your real workflow for 30 days and make the decision based on your own results."
              : "Testen Sie Varnito 30 Tage im echten Arbeitsalltag und entscheiden Sie anschließend anhand Ihrer eigenen Erfahrung."}
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href={registrationHref}>
              {market === "us" ? "Try Varnito free for 30 days" : "Varnito 30 Tage kostenlos testen"}
            </Link>
          </div>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}