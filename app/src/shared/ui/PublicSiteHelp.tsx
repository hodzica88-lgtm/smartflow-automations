"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import styles from "./PublicSiteHelp.module.css";

type MarketCode = "de" | "us";

const QUICK_ACTIONS = {
  de: [
    { label: "Anmelden", href: "/login" },
    { label: "Varnito testen", href: "/registrierung" },
    { label: "Demo ansehen", href: "/demo" },
    { label: "Problem melden", href: "mailto:support@varnito.com?subject=Varnito%20%E2%80%93%20Problem%20melden" },
    { label: "Support", href: "mailto:support@varnito.com" },
  ],
  us: [
    { label: "Sign in", href: "/login" },
    { label: "Try Varnito", href: "/registrierung" },
    { label: "View demo", href: "/demo" },
    { label: "Report a problem", href: "mailto:support@varnito.com?subject=Varnito%20%E2%80%93%20Report%20a%20problem" },
    { label: "Support", href: "mailto:support@varnito.com" },
  ],
} as const;

type SiteHelpResult = {
  answer: string;
  action: {
    type: "route" | "answer";
    href?: string;
    label?: string;
  };
  method?: "deterministic" | "ai";
  confidence?: number;
};

const getDefaultMessage = () => "";

const normalizeMarketFromPath = (path: string): MarketCode =>
  path.includes("varnito.com") || path.includes(".com") ? "us" : "de";

export default function PublicSiteHelp({
  path,
  market,
}: {
  path?: string;
  market?: MarketCode;
}) {
  const pathname = usePathname();
  const currentPath = path ?? pathname ?? "/";
  const isVisible = !currentPath.startsWith("/api") && !currentPath.startsWith("/operator") && !currentPath.startsWith("/dashboard") && !(currentPath.startsWith("/c/") && currentPath.includes("/inquiry"));
  const marketCode = market ?? normalizeMarketFromPath(currentPath);
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState(getDefaultMessage());
  const [result, setResult] = useState<SiteHelpResult | null>(null);
  const [pending, setPending] = useState(false);

  const assistantTitle = useMemo(
    () => (marketCode === "us" ? "Varnito Help" : "Varnito Hilfe"),
    [marketCode],
  );

  const quickActions = QUICK_ACTIONS[marketCode];
  const introText =
    marketCode === "us"
      ? "How can I help? Just ask where to find something or what you want to do."
      : "Wie kann ich helfen? Fragen Sie einfach, wo Sie etwas finden oder was Sie tun möchten.";

  const handleQuickAction = (href: string, isMailto = false) => {
    setOpen(false);
    setResult(null);
    setInput("");

    if (href) {
      window.location.href = href;
    }

    if (isMailto) {
      return;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setPending(true);
    setResult(null);

    try {
      const response = await fetch("/api/public/site-help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          path: currentPath,
          market: marketCode,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        result?: SiteHelpResult;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setResult({
          answer: payload.error ?? (marketCode === "us" ? "I could not answer that request." : "Ich konnte Ihre Anfrage nicht beantworten."),
          action: { type: "answer" },
        });
        return;
      }

      setResult(payload.result ?? null);
    } catch {
      setResult({
        answer: marketCode === "us" ? "I could not reach the help service right now." : "Der Hilfedienst ist derzeit nicht erreichbar.",
        action: { type: "answer" },
      });
    } finally {
      setPending(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.container}>
      {open ? (
        <div className={styles.panel} aria-live="polite">
          <div className={styles.header}>
            <div className={styles.title}>{assistantTitle}</div>
            <button
              type="button"
              className={styles.closeButton}
              aria-label={marketCode === "us" ? "Close help" : "Hilfe schließen"}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className={styles.messages}>
            <div className={`${styles.message} ${styles.assistant}`}>{introText}</div>

            <div className={styles.quickActions}>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={styles.quickAction}
                  onClick={() => handleQuickAction(action.href, action.href.startsWith("mailto:"))}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {result ? (
              <>
                <div className={`${styles.message} ${styles.user}`}>{input}</div>
                <div className={`${styles.message} ${styles.assistant}`}>{result.answer}</div>
                {result.action.type === "route" && result.action.href ? (
                  <Link className={styles.routeButton} href={result.action.href} onClick={() => setOpen(false)}>
                    {result.action.label ?? (marketCode === "us" ? "Open page" : "Seite öffnen")}
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <textarea
              className={styles.input}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-label={marketCode === "us" ? "Your help question" : "Ihre Hilfefrage"}
              placeholder={marketCode === "us" ? "How can I help?" : "Wie kann ich Ihnen helfen?"}
            />
            <button className={styles.submitButton} type="submit" disabled={pending}>
              {pending
                ? marketCode === "us" ? "Thinking..." : "Denke nach..."
                : marketCode === "us" ? "Ask" : "Fragen"}
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={marketCode === "us" ? "Open website help" : "Website-Hilfe öffnen"}
      >
        <span className={styles.launcherIcon}>✦</span>
        <span>{marketCode === "us" ? "Help" : "Hilfe"}</span>
      </button>
    </div>
  );
}
