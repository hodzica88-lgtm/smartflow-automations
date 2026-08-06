"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import { useDemo } from "@/features/demo/useDemo";
import type { DemoLeadStatus } from "@/features/demo/types";
import styles from "@/features/demo/demo.module.css";

const statuses: DemoLeadStatus[] = ["new", "contacted", "successful", "unsuccessful"];

export default function DemoLeadsPage() {
  const { state, setLeadAssignee, setLeadStatus } = useDemo();
  const copy = getDemoCopy(state.market);
  const searchParams = useSearchParams();
  const isHighlighted = searchParams.get("highlight") === "leads";
  const activeTeam = state.team.filter((member) => member.status === "active");

  return (
    <main className={styles.shell}>
      <section className={`${styles.hero} ${isHighlighted ? styles.highlightedSection : ""}`}>
        <h1 style={{ margin: 0 }}>Leads</h1>
        <p className={styles.muted}>{copy.leads.description}</p>
      </section>

      <section className={styles.grid}>
        {state.leads.map((lead) => (
          <article key={lead.id} className={styles.card}>
            <div className={styles.row} style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{lead.firstName} {lead.lastName}</strong>
                <p className={styles.muted}>{lead.inquiryType}</p>
              </div>
              <Link href={`/demo/leads/${lead.id}`} className={styles.buttonSecondary}>{copy.leads.details}</Link>
            </div>

            <div className={`${styles.grid} ${styles.two}`}>
              <label>
                <span>{copy.leads.status}</span>
                <select
                  className={styles.select}
                  value={lead.status}
                  onChange={(event) => setLeadStatus(lead.id, event.target.value as DemoLeadStatus)}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>{copy.leadStatusLabels[status]}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>{copy.leads.assignee}</span>
                <select
                  className={styles.select}
                  value={lead.assignedUserId ?? ""}
                  onChange={(event) => setLeadAssignee(lead.id, event.target.value || null)}
                >
                  <option value="">{copy.leads.unassigned}</option>
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
