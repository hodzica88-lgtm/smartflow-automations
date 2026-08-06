"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import { useDemo } from "@/features/demo/useDemo";
import type { DemoLeadStatus } from "@/features/demo/types";
import styles from "@/features/demo/demo.module.css";

const statuses: DemoLeadStatus[] = ["new", "contacted", "successful", "unsuccessful"];

export default function DemoLeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const searchParams = useSearchParams();
  const leadId = typeof params.leadId === "string" ? params.leadId : "";
  const { state, setLeadAssignee, setLeadNotes, setLeadStatus } = useDemo();
  const copy = getDemoCopy(state.market);
  const isHighlighted = searchParams.get("highlight") === "leads";

  const lead = state.leads.find((entry) => entry.id === leadId);
  const activeTeam = state.team.filter((member) => member.status === "active");

  if (!lead) {
    return (
      <main className={styles.shell}>
        <section className={styles.card}>
          <h1 style={{ margin: 0 }}>{copy.leadDetail.notFound}</h1>
          <Link className={styles.buttonSecondary} href="/demo/leads">{copy.leadDetail.backToLeads}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <section className={`${styles.hero} ${isHighlighted ? styles.highlightedSection : ""}`}>
        <Link className={styles.buttonSecondary} href="/demo/leads">{copy.leadDetail.backToLeads}</Link>
        <h1 style={{ margin: 0 }}>{lead.firstName} {lead.lastName}</h1>
        <p className={styles.muted}>{lead.address}</p>
      </section>

      <section className={`${styles.grid} ${styles.two}`}>
        <article className={styles.card}>
          <h2 style={{ margin: 0 }}>{copy.leadDetail.contactData}</h2>
          <p className={styles.muted}>{copy.leadDetail.phone}: {lead.phone}</p>
          <p className={styles.muted}>{copy.leadDetail.email}: {lead.email}</p>
          <p className={styles.muted}>{copy.leadDetail.inquiry}: {lead.inquiryType}</p>
        </article>

        <article className={styles.card}>
          <h2 style={{ margin: 0 }}>{copy.leadDetail.editLead}</h2>
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

          <label>
            <span>{copy.leadDetail.notes}</span>
            <textarea
              className={styles.textarea}
              value={lead.notes}
              onChange={(event) => setLeadNotes(lead.id, event.target.value)}
            />
          </label>
        </article>
      </section>
    </main>
  );
}
