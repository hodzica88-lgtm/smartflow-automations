"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useDemo } from "@/features/demo/useDemo";
import type { DemoLeadStatus } from "@/features/demo/types";
import styles from "@/features/demo/demo.module.css";

const statuses: DemoLeadStatus[] = ["new", "contacted", "successful", "unsuccessful"];

export default function DemoLeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = typeof params.leadId === "string" ? params.leadId : "";
  const { state, setLeadAssignee, setLeadNotes, setLeadStatus } = useDemo();

  const lead = state.leads.find((entry) => entry.id === leadId);
  const activeTeam = state.team.filter((member) => member.status === "active");

  if (!lead) {
    return (
      <main className={styles.shell}>
        <section className={styles.card}>
          <h1 style={{ margin: 0 }}>Lead nicht gefunden</h1>
          <Link className={styles.buttonSecondary} href="/demo/leads">Zurueck zu Leads</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <Link className={styles.buttonSecondary} href="/demo/leads">Zurueck zu Leads</Link>
        <h1 style={{ margin: 0 }}>{lead.firstName} {lead.lastName}</h1>
        <p className={styles.muted}>{lead.address}</p>
      </section>

      <section className={`${styles.grid} ${styles.two}`}>
        <article className={styles.card}>
          <h2 style={{ margin: 0 }}>Kontaktdaten</h2>
          <p className={styles.muted}>Telefon: {lead.phone}</p>
          <p className={styles.muted}>E-Mail: {lead.email}</p>
          <p className={styles.muted}>Anfrage: {lead.inquiryType}</p>
        </article>

        <article className={styles.card}>
          <h2 style={{ margin: 0 }}>Lead bearbeiten</h2>
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

          <label>
            <span>Notizen</span>
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
