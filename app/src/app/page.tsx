import styles from "./page.module.css";

const foundations = [
  {
    title: "Core",
    description: "Next.js App Router with strict TypeScript and ESLint.",
  },
  {
    title: "Data",
    description: "Environment boundaries prepared for Supabase.",
  },
  {
    title: "Revenue",
    description: "Configuration placeholders ready for Stripe.",
  },
  {
    title: "Automation",
    description: "Brevo and Make.com integration seams are reserved.",
  },
];

export default function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.hero} aria-labelledby="home-title">
        <p className={styles.eyebrow}>SmartFlow Foundation</p>
        <h1 id="home-title">A clean base for scalable workflow automation.</h1>
        <p className={styles.summary}>
          The new application shell is modular, mobile-first, and ready for
          provider integrations without adding implementation dependencies too
          early.
        </p>
      </section>

      <section className={styles.grid} aria-label="Prepared foundations">
        {foundations.map((item) => (
          <article className={styles.item} key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
