import { logoutAction } from "@/features/auth/actions";

export default function LeadWorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", maxWidth: 1200, margin: "0 auto", padding: "16px 24px 0" }}>
        <form action={logoutAction}>
          <button
            type="submit"
            style={{ minHeight: 40, padding: "0 14px", border: "1px solid #cbd5e0", borderRadius: 8, background: "#fff", color: "#1a202c", cursor: "pointer", fontWeight: 700 }}
          >
            Abmelden
          </button>
        </form>
      </div>
      {children}
    </>
  );
}
