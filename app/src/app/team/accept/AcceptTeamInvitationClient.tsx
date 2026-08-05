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
  const [sessionState, setSessionState] =
    useState<SessionState>("loading");

  useEffect(() => {
    let mounted = true;

    const markReady = () => {
      if (!mounted) return;

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname,
      );

      setSessionState("ready");
    };

    const init = async () => {
      try {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(window.location.href);

        if (!error && data.session) {
          markReady();
          return;
        }
      } catch {}

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        markReady();
        return;
      }

      if (mounted) {
        setSessionState("missing");
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        markReady();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (sessionState === "loading") {
    return <p>Einladung wird geprüft …</p>;
  }

  if (sessionState === "missing") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <h1>Einladung nicht mehr gültig</h1>
        <p>
          Bitte den Eigentümer bitten, eine neue Einladung zu senden.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <h1>Zugang einrichten</h1>
        <p>
          Bitte legen Sie Ihren Namen und Ihr Passwort fest.
        </p>
      </header>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #f5b5b5",
            background: "#fff2f2",
          }}
        >
          {error}
        </div>
      )}

      <form action={acceptTeamInvitationAction}>
        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <input
            name="full_name"
            placeholder="Vollständiger Name"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Passwort"
            minLength={8}
            required
          />

          <input
            name="password_confirmation"
            type="password"
            placeholder="Passwort wiederholen"
            minLength={8}
            required
          />

          <button type="submit">
            Zugang aktivieren
          </button>
        </div>
      </form>
    </div>
  );
}