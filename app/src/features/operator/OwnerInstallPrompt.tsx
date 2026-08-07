"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type OwnerInstallPromptProps = {
  installLabel: string;
  installedLabel: string;
  manualLabel: string;
  manualCopy: string;
};

const isStandaloneMode = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches);

export default function OwnerInstallPrompt({
  installLabel,
  installedLabel,
  manualLabel,
  manualCopy,
}: OwnerInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneMode);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
      {installed ? (
        <span style={{ color: "var(--success)", fontWeight: 700 }}>{installedLabel}</span>
      ) : deferredPrompt ? (
        <button className="premium-button" onClick={() => void onInstall()} type="button">
          {installLabel}
        </button>
      ) : (
        <div style={{ display: "grid", gap: 4 }}>
          <strong>{manualLabel}</strong>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{manualCopy}</p>
        </div>
      )}
    </div>
  );
}