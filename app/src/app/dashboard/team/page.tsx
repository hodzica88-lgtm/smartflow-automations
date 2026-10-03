import Link from "next/link";
import { redirect } from "next/navigation";

import styles from "@/app/dashboard/dashboard.module.css";
import { requireUserCompanyAccess } from "@/features/billing/service";
import AuditLogSection from "@/features/audit-log/AuditLogSection";
import { getCompanyAuditLog } from "@/features/audit-log/service";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  resendTeamInvitationAction,
} from "@/features/team/actions";
import {
  getCompanyTeamMembers,
  getTeamMemberLabel,
} from "@/features/team/service";
import { TEAM_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";

type TeamPageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const { market } = await getRequestMarket();
  const copy = TEAM_COPY[market];
  const access = await requireUserCompanyAccess({
    nextPath: "/dashboard/team",
  });

  if (!access.isOwner) {
    redirect("/dashboard/leads");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [members, auditLog] = await Promise.all([
    getCompanyTeamMembers(access.companyId),
    getCompanyAuditLog(access.companyId),
  ]);

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>{copy.sectionLabel}</p>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.description}</p>
        </div>
        <div className={styles.topbarMeta}>
          <Link className={styles.buttonSecondary} href="/dashboard/leads">
            {copy.backToLeads}
          </Link>
        </div>
      </header>

      {resolvedSearchParams?.success ? (
        <section
          style={{
            padding: "0.8rem 1rem",
            borderRadius: 12,
            border: "1px solid rgba(34, 197, 94, 0.28)",
            background: "rgba(34, 197, 94, 0.08)",
            color: "#166534",
            fontWeight: 700,
          }}
        >
          {resolvedSearchParams.success}
        </section>
      ) : null}

      {resolvedSearchParams?.error ? (
        <section
          role="alert"
          style={{
            padding: "0.8rem 1rem",
            borderRadius: 12,
            border: "1px solid rgba(239, 68, 68, 0.28)",
            background: "rgba(239, 68, 68, 0.08)",
            color: "#991b1b",
            fontWeight: 700,
          }}
        >
          {resolvedSearchParams.error}
        </section>
      ) : null}

      <section className={styles.primaryPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{copy.sectionLabel}</p>
            <h2>{copy.inviteTitle}</h2>
          </div>
        </div>
        <p className={styles.subtitle} style={{ margin: 0 }}>{copy.inviteDescription}</p>
        <form action={inviteTeamMemberAction} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, flex: "1 1 280px" }}>
            {copy.emailLabel}
            <input
              autoComplete="email"
              name="email"
              type="email"
              required
              placeholder={copy.emailPlaceholder}
              style={{ minHeight: 44, padding: "0 12px", border: "1px solid rgba(148, 163, 184, 0.24)", borderRadius: 12, background: "#fff" }}
            />
          </label>
          <button type="submit" className={styles.button}>
            {copy.sendInvite}
          </button>
        </form>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{copy.accessTitle}</p>
            <h2>{copy.accessTitle}</h2>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {members.map((member) => {
            const isOwner = member.role === "owner";
            const isPending = member.status === "pending";

            return (
              <article
                key={member.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  padding: 18,
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: 12,
                  background: "#f8fafc",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{getTeamMemberLabel(member)}</strong>
                  <span style={{ color: "#475569", overflowWrap: "anywhere" }}>{member.email}</span>
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    {isOwner ? copy.ownerLabel : isPending ? copy.pendingLabel : copy.activeLabel}
                  </span>
                </div>

                {!isOwner ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {isPending ? (
                      <form action={resendTeamInvitationAction}>
                        <input type="hidden" name="member_id" value={member.id} />
                        <button type="submit" className={styles.buttonSecondary}>
                          {copy.resend}
                        </button>
                      </form>
                    ) : null}
                    <form action={removeTeamMemberAction}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <button type="submit" style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 40,
                        borderRadius: 999,
                        padding: "0 1rem",
                        border: "1px solid rgba(239, 68, 68, 0.24)",
                        background: "#fff",
                        color: "#b91c1c",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}>
                        {copy.removeAccess}
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.emptyStateCard}>
        <AuditLogSection
          title="Audit Log"
          description={copy.auditDescription}
          entries={auditLog}
          emptyTitle={copy.auditEmptyTitle}
          emptyMessage={copy.auditEmptyMessage}
        />
      </section>
    </main>
  );
}
