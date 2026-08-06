"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

export default function DemoSettingsPage() {
  const { state, addInquiryType, toggleInquiryType, updateSettings } = useDemo();
  const copy = getDemoCopy(state.market);
  const searchParams = useSearchParams();
  const isHighlighted = searchParams.get("highlight") === "settings";
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
      <section className={`${styles.hero} ${isHighlighted ? styles.highlightedSection : ""}`}>
        <h1 style={{ margin: 0 }}>{copy.settings.title}</h1>
        <p className={styles.muted}>{copy.settings.description}</p>
      </section>

      <form className={styles.card} onSubmit={onSubmit}>
        <h2 style={{ margin: 0 }}>{copy.settings.company}</h2>
        <div className={`${styles.grid} ${styles.two}`}>
          <label>
            <span>{copy.settings.contactPerson}</span>
            <input className={styles.input} name="contact_person" defaultValue={state.settings.contactPerson} />
          </label>
          <label>
            <span>{copy.settings.companyEmail}</span>
            <input className={styles.input} name="company_email" defaultValue={state.settings.companyEmail} />
          </label>
          <label>
            <span>{copy.settings.notificationEmail}</span>
            <input className={styles.input} name="notification_email" defaultValue={state.settings.notificationEmail} />
          </label>
          <label>
            <span>{copy.settings.phone}</span>
            <input className={styles.input} name="phone" defaultValue={state.settings.phone} />
          </label>
          <label>
            <span>{copy.settings.website}</span>
            <input className={styles.input} name="website_url" defaultValue={state.settings.websiteUrl} />
          </label>
          <label>
            <span>{copy.settings.timezone}</span>
            <input className={styles.input} name="timezone" defaultValue={state.settings.timezone} />
          </label>
        </div>

        <label>
          <span>{copy.settings.businessHours}</span>
          <textarea className={styles.textarea} name="business_hours" defaultValue={state.settings.businessHours} />
        </label>

        <button type="submit" className={styles.button}>{copy.settings.saveSimulation}</button>
      </form>

      <section className={styles.card}>
        <h2 style={{ margin: 0 }}>{copy.settings.inquiryTypes}</h2>
        <form className={styles.row} onSubmit={onAddInquiryType}>
          <input
            className={styles.input}
            value={inquiryType}
            onChange={(event) => setInquiryType(event.target.value)}
            placeholder={copy.settings.newInquiryType}
          />
          <button type="submit" className={styles.buttonSecondary}>{copy.settings.add}</button>
        </form>

        <div className={styles.grid}>
          {state.settings.inquiryTypes.map((entry) => (
            <article key={entry.id} className={styles.row} style={{ justifyContent: "space-between" }}>
              <strong>{entry.name}</strong>
              <button type="button" className={styles.buttonSecondary} onClick={() => toggleInquiryType(entry.id)}>
                {entry.active ? copy.settings.active : copy.settings.inactive}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
