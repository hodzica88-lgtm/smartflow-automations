"use client";

import Link from "next/link";

import { useDemo } from "@/features/demo/useDemo";
import type { DemoLeadStatus } from "@/features/demo/types";
import styles from "@/features/demo/demo.module.css";

const statuses: DemoLeadStatus[] = ["new", "contacted", "successful", "unsuccessful"];

export default function DemoLeadsPage() {
  const { state, setLeadAssignee, setLeadStatus } = useDemo();
  const activeTeam = state.team.filter((member) => member.status === "active");

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1 style={{ margin: 0 }}>Leads</h1>
        <p className={styles.muted}>
          {state.market === "us"
            ? "Update status, ownership, and pipeline flow instantly."
            : "Aktualisieren Sie Status, Zustaendigkeit und Pipeline direkt."}
        </p>
      </section>

      <section className={styles.grid}>
        {state.leads.map((lead) => (
          <article key={lead.id} className={styles.card}>
            <div className={styles.row} style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{lead.firstName} {lead.lastName}</strong>
                <p className={styles.muted}>{lead.inquiryType}</p>
              </div>
              <Link href={`/demo/leads/${lead.id}`} className={styles.buttonSecondary}>Details</Link>
            </div>

            <div className={`${styles.grid} ${styles.two}`}>
              <label>
                <span>Status</span>
                <select
                  className={styles.select}
                  value={lead.status}
                  onChange={(event) => setLeadStatus(lead.id, event.target.value as DemoLeadStatus)}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Zustaendig</span>
                <select
                  className={styles.select}
                  value={lead.assignedUserId ?? ""}
                  onChange={(event) => setLeadAssignee(lead.id, event.target.value || null)}
                >
                  <option value="">Nicht zugewiesen</option>
                  {activeTeam.map((member) => (
                    <option key={member.id} value={member.id}>{member.fullName}</option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
