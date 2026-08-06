"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

export default function DemoTeamPage() {
  const { state, inviteMember, removeMember, resendInvite } = useDemo();
  const copy = getDemoCopy(state.market);
  const searchParams = useSearchParams();
  const isHighlighted = searchParams.get("highlight") === "team";
  const [email, setEmail] = useState("");

  const onInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    inviteMember(email);
    setEmail("");
  };

  return (
    <main className={styles.shell}>
      <section className={`${styles.hero} ${isHighlighted ? styles.highlightedSection : ""}`}>
        <h1 style={{ margin: 0 }}>{copy.nav.team}</h1>
        <p className={styles.muted}>{copy.team.description}</p>
      </section>

      <section className={styles.card}>
        <h2 style={{ margin: 0 }}>{copy.team.inviteTitle}</h2>
        <form onSubmit={onInvite} className={styles.row}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={styles.input}
            placeholder="name@example.com"
          />
          <button type="submit" className={styles.button}>{copy.team.inviteButton}</button>
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
              <span className={styles.badge}>
                {(member.role === "owner" ? copy.team.roleOwner : copy.team.roleMember)} / {(member.status === "active" ? copy.team.statusActive : copy.team.statusPending)}
              </span>
            </div>

            {member.role !== "owner" ? (
              <div className={styles.row}>
                {member.status === "pending" ? (
                  <button type="button" className={styles.buttonSecondary} onClick={() => resendInvite(member.id)}>
                    {copy.team.resend}
                  </button>
                ) : null}
                <button type="button" className={styles.buttonSecondary} onClick={() => removeMember(member.id)}>
                  {copy.team.remove}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
