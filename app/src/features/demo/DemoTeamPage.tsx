"use client";

import { FormEvent, useState } from "react";

import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

export default function DemoTeamPage() {
  const { state, inviteMember, removeMember, resendInvite } = useDemo();
  const [email, setEmail] = useState("");

  const onInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    inviteMember(email);
    setEmail("");
  };

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1 style={{ margin: 0 }}>Team</h1>
        <p className={styles.muted}>
          {state.market === "us" ? "Simulate team onboarding and access updates." : "Simulieren Sie Team-Onboarding und Zugriffsverwaltung."}
        </p>
      </section>

      <section className={styles.card}>
        <h2 style={{ margin: 0 }}>Mitarbeiter einladen</h2>
        <form onSubmit={onInvite} className={styles.row}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={styles.input}
            placeholder="name@example.com"
          />
          <button type="submit" className={styles.button}>Einladen</button>
        </form>
      </section>

      <section className={styles.grid}>
        {state.team.map((member) => (
          <article key={member.id} className={styles.card}>
            <div className={styles.row} style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{member.fullName}</strong>
                <p className={styles.muted}>{member.email}</p>
              </div>
              <span className={styles.badge}>{member.role} / {member.status}</span>
            </div>

            {member.role !== "owner" ? (
              <div className={styles.row}>
                {member.status === "pending" ? (
                  <button type="button" className={styles.buttonSecondary} onClick={() => resendInvite(member.id)}>
                    Einladung erneut senden
                  </button>
                ) : null}
                <button type="button" className={styles.buttonSecondary} onClick={() => removeMember(member.id)}>
                  Entfernen
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
