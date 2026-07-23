"use client";

import { useEffect, useMemo, useState } from "react";

import { acceptTeamInvitationAction } from "@/features/team/actions";
import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";

type AcceptTeamInvitationClientProps = {
  error: string | null;
};

type SessionState = "loading" | "ready" | "missing";

export default function AcceptTeamInvitationClient({
  error,
}: AcceptTeamInvitationClientProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sessionState, setSessionState] = useState<SessionState>("loading");

  useEffect(() => {
    let mounted = true;

    const markReady = () => {
      if (!mounted) {
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      setSessionState("ready");
    };

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        markReady();
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        markReady();
      }
    });

    const timeout = window.setTimeout(() => {
      if (mounted) {
        setSessionState((current) => (current === "loading" ? "missing" : current));
      }
    }, 3500);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (sessionState === "loading") {
    return <p style={{ margin: 0 }}>Einladung wird geprüft …</p>;
  }

  if (sessionState === "missing") {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Einladung nicht mehr gültig</h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          Bitten Sie den Inhaber, die Einladung in Varnito erneut zu senden.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>
          Varnito Mitarbeiterzugang
        </p>
        <h1 style={{ margin: 0 }}>Zugang einrichten</h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          Legen Sie einmalig Ihren Namen und Ihr Passwort fest. Danach können Sie neue Anfragen bearbeiten.
        </p>
      </header>

      {error ? (
        <div role="alert" style={{ padding: 14, border: "1px solid #f0b7b7", borderRadius: 8, background: "#ffe6e6" }}>
          {error}
        </div>
      ) : null}

      <form action={acceptTeamInvitationAction} style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Vollständiger Name
          <input
            autoComplete="name"
            name="full_name"
            type="text"
            required
            style={{ minHeight: 44, padding: "0 12px", border: "1px solid #cbd5e0", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Passwort
          <input
            autoComplete="new-password"
            name="password"
            type="password"
            minLength={8}
            required
            style={{ minHeight: 44, padding: "0 12px", border: "1px solid #cbd5e0", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Passwort wiederholen
          <input
            autoComplete="new-password"
            name="password_confirmation"
            type="password"
            minLength={8}
            required
            style={{ minHeight: 44, padding: "0 12px", border: "1px solid #cbd5e0", borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          style={{ display: "inline-flex", width: "fit-content", minHeight: 44, alignItems: "center", justifyContent: "center", border: 0, borderRadius: 8, padding: "0 18px", background: "#3182ce", color: "#fff", cursor: "pointer", fontWeight: 700 }}
        >
          Zugang aktivieren
        </button>
      </form>
    </div>
  );
}
