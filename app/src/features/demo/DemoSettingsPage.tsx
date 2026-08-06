"use client";

import { FormEvent, useState } from "react";

import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

export default function DemoSettingsPage() {
  const { state, addInquiryType, toggleInquiryType, updateSettings } = useDemo();
  const [inquiryType, setInquiryType] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateSettings({
      contactPerson: String(formData.get("contact_person") ?? ""),
      companyEmail: String(formData.get("company_email") ?? ""),
      notificationEmail: String(formData.get("notification_email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      websiteUrl: String(formData.get("website_url") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      businessHours: String(formData.get("business_hours") ?? ""),
    });
  };

  const onAddInquiryType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addInquiryType(inquiryType);
    setInquiryType("");
  };

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1 style={{ margin: 0 }}>Einstellungen</h1>
        <p className={styles.muted}>Firmendaten, Benachrichtigungen und Anfragearten werden live simuliert.</p>
      </section>

      <form className={styles.card} onSubmit={onSubmit}>
        <h2 style={{ margin: 0 }}>Firma</h2>
        <div className={`${styles.grid} ${styles.two}`}>
          <label>
            <span>Ansprechpartner</span>
            <input className={styles.input} name="contact_person" defaultValue={state.settings.contactPerson} />
          </label>
          <label>
            <span>E-Mail</span>
            <input className={styles.input} name="company_email" defaultValue={state.settings.companyEmail} />
          </label>
          <label>
            <span>Benachrichtigungs-E-Mail</span>
            <input className={styles.input} name="notification_email" defaultValue={state.settings.notificationEmail} />
          </label>
          <label>
            <span>Telefon</span>
            <input className={styles.input} name="phone" defaultValue={state.settings.phone} />
          </label>
          <label>
            <span>Website</span>
            <input className={styles.input} name="website_url" defaultValue={state.settings.websiteUrl} />
          </label>
          <label>
            <span>Zeitzone</span>
            <input className={styles.input} name="timezone" defaultValue={state.settings.timezone} />
          </label>
        </div>

        <label>
          <span>Business Hours</span>
          <textarea className={styles.textarea} name="business_hours" defaultValue={state.settings.businessHours} />
        </label>

        <button type="submit" className={styles.button}>Aenderungen simulieren</button>
      </form>

      <section className={styles.card}>
        <h2 style={{ margin: 0 }}>Anfragearten</h2>
        <form className={styles.row} onSubmit={onAddInquiryType}>
          <input
            className={styles.input}
            value={inquiryType}
            onChange={(event) => setInquiryType(event.target.value)}
            placeholder="Neue Anfrageart"
          />
          <button type="submit" className={styles.buttonSecondary}>Hinzufuegen</button>
        </form>

        <div className={styles.grid}>
          {state.settings.inquiryTypes.map((entry) => (
            <article key={entry.id} className={styles.row} style={{ justifyContent: "space-between" }}>
              <strong>{entry.name}</strong>
              <button type="button" className={styles.buttonSecondary} onClick={() => toggleInquiryType(entry.id)}>
                {entry.active ? "Aktiv" : "Inaktiv"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
