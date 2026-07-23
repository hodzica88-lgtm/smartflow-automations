import Link from "next/link";
import { redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  resendTeamInvitationAction,
} from "@/features/team/actions";
import {
  getCompanyTeamMembers,
  getTeamMemberLabel,
} from "@/features/team/service";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

const actionStyle = {
  display: "inline-flex",
  minHeight: 42,
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  borderRadius: 8,
  padding: "0 16px",
  background: "#3182ce",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
} as const;

const secondaryActionStyle = {
  ...actionStyle,
  border: "1px solid #cbd5e0",
  background: "#fff",
  color: "#1a202c",
} as const;

const dangerActionStyle = {
  ...secondaryActionStyle,
  color: "#9b2c2c",
} as const;

type TeamPageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/team");
  }

  const companyState = await getUserCompanyState(user.id);

  if (!companyState.companyId || !companyState.isOwner) {
    redirect("/dashboard/leads");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const members = await getCompanyTeamMembers(companyState.companyId);

  return (
    <main style={{ display: "grid", gap: 24, maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <Link href="/dashboard/leads" style={{ color: "#3182ce", fontWeight: 700, textDecoration: "none" }}>
          ← Zurück zu den Leads
        </Link>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>
          Mitarbeiter
        </p>
        <h1 style={{ margin: 0 }}>Zugänge verwalten</h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          Mitarbeiter erhalten ausschließlich einen einfachen Zugang zur Lead-Bearbeitung.
        </p>
      </header>

      {resolvedSearchParams?.success ? (
        <section style={{ padding: 16, border: "1px solid #b7f0c6", borderRadius: 10, background: "#e6ffed" }}>
          {resolvedSearchParams.success}
        </section>
      ) : null}

      {resolvedSearchParams?.error ? (
        <section role="alert" style={{ padding: 16, border: "1px solid #f0b7b7", borderRadius: 10, background: "#ffe6e6" }}>
          {resolvedSearchParams.error}
        </section>
      ) : null}

      <section style={{ display: "grid", gap: 16, padding: 20, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
        <div>
          <h2 style={{ margin: 0 }}>Mitarbeiter einladen</h2>
          <p style={{ margin: "6px 0 0", color: "#555" }}>
            E-Mail-Adresse genügt. Der Mitarbeiter legt Name und Passwort selbst fest.
          </p>
        </div>
        <form action={inviteTeamMemberAction} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", flex: "1 1 280px", gap: 6 }}>
            E-Mail-Adresse
            <input
              autoComplete="email"
              name="email"
              type="email"
              required
              placeholder="mitarbeiter@unternehmen.de"
              style={{ minHeight: 44, padding: "0 12px", border: "1px solid #cbd5e0", borderRadius: 8 }}
            />
          </label>
          <button type="submit" style={actionStyle}>
            Einladung senden
          </button>
        </form>
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <h2 style={{ margin: 0 }}>Zugänge</h2>
        {members.map((member) => {
          const isOwner = member.role === "owner";
          const isPending = member.status === "pending";

          return (
            <article
              key={member.id}
              style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 18, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <strong>{getTeamMemberLabel(member)}</strong>
                <span style={{ color: "#555", overflowWrap: "anywhere" }}>{member.email}</span>
                <span style={{ fontSize: 13, color: "#718096" }}>
                  {isOwner ? "Inhaber" : isPending ? "Einladung offen" : "Aktiv"}
                </span>
              </div>

              {!isOwner ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {isPending ? (
                    <form action={resendTeamInvitationAction}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <button type="submit" style={secondaryActionStyle}>
                        Erneut senden
                      </button>
                    </form>
                  ) : null}
                  <form action={removeTeamMemberAction}>
                    <input type="hidden" name="member_id" value={member.id} />
                    <button type="submit" style={dangerActionStyle}>
                      Zugang entfernen
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
