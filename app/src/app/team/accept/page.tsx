import AcceptTeamInvitationClient from "./AcceptTeamInvitationClient";
import LegalFooter from "@/shared/ui/LegalFooter";

type AcceptTeamInvitationPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AcceptTeamInvitationPage({
  searchParams,
}: AcceptTeamInvitationPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24, background: "rgba(255,255,255,0.02)" }}>
      <section style={{ display: "grid", width: "min(100%, 620px)", gap: 20, padding: 24, border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)" }}>
        <AcceptTeamInvitationClient error={resolvedSearchParams?.error ?? null} />
      </section>
      <LegalFooter />
    </main>
  );
}
