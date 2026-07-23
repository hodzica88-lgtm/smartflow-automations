import AcceptTeamInvitationClient from "./AcceptTeamInvitationClient";

type AcceptTeamInvitationPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AcceptTeamInvitationPage({
  searchParams,
}: AcceptTeamInvitationPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24, background: "#f7fafc" }}>
      <section style={{ display: "grid", width: "min(100%, 620px)", gap: 20, padding: 24, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
        <AcceptTeamInvitationClient error={resolvedSearchParams?.error ?? null} />
      </section>
    </main>
  );
}
