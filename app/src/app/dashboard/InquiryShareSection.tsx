"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { QRCodeCanvas } from "qrcode.react";

import styles from "./dashboard.module.css";

type InquiryShareSectionProps = {
  companyId: string;
};

const subscribeToLocationOrigin = () => () => {};
const getServerOriginSnapshot = () => "";
const getBrowserOriginSnapshot = () => window.location.origin;
const QR_CODE_FILE_NAME = "anfragepilot-qr-code.png";

export default function InquiryShareSection({ companyId }: InquiryShareSectionProps) {
  const origin = useSyncExternalStore(
    subscribeToLocationOrigin,
    getBrowserOriginSnapshot,
    getServerOriginSnapshot,
  );
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [linkStatus, setLinkStatus] = useState<"idle" | "success" | "error">("idle");
  const [embedStatus, setEmbedStatus] = useState<"idle" | "success" | "error">("idle");
  const [qrStatus, setQrStatus] = useState<"idle" | "success" | "error">("idle");

  const inquiryPath = useMemo(() => `/c/${companyId}/inquiry`, [companyId]);
  const inquiryUrl = useMemo(() => `${origin}${inquiryPath}`, [origin, inquiryPath]);
  const embedCode = useMemo(
    () =>
      `<iframe src=\"${inquiryUrl}\" width=\"100%\" height=\"700\" frameborder=\"0\" loading=\"lazy\" title=\"Anfrageformular\"></iframe>`,
    [inquiryUrl],
  );

  const copyText = async (value: string, target: "link" | "embed") => {
    try {
      if (!value) {
        throw new Error("No value to copy");
      }

      await navigator.clipboard.writeText(value);
      if (target === "link") {
        setLinkStatus("success");
      } else {
        setEmbedStatus("success");
      }
    } catch {
      if (target === "link") {
        setLinkStatus("error");
      } else {
        setEmbedStatus("error");
      }
    }

    window.setTimeout(() => {
      if (target === "link") {
        setLinkStatus("idle");
      } else {
        setEmbedStatus("idle");
      }
    }, 1800);
  };

  const downloadQrCode = async () => {
    try {
      const canvas = qrCanvasRef.current;

      if (!canvas) {
        throw new Error("QR canvas is not available");
      }

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = QR_CODE_FILE_NAME;
      document.body.append(link);
      link.click();
      link.remove();
      setQrStatus("success");
    } catch {
      setQrStatus("error");
    }

    window.setTimeout(() => {
      setQrStatus("idle");
    }, 1800);
  };

  return (
    <section className={styles.empty} aria-label="Anfrageformular teilen">
      <h2>Anfrageformular teilen</h2>

      <article className={styles.shareBlock}>
        <h3>Anfrage-Link</h3>
        <p>Diesen Link können Sie per E-Mail, WhatsApp oder auf Ihrer Website teilen.</p>
        <p className={styles.shareValue}>{inquiryUrl || inquiryPath}</p>
        <div className={styles.copyRow}>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              void copyText(inquiryUrl, "link");
            }}
            disabled={!inquiryUrl}
          >
            Link kopieren
          </button>
          {linkStatus === "success" ? <span className={styles.copySuccess}>Kopiert</span> : null}
          {linkStatus === "error" ? (
            <span className={styles.copyError}>Kopieren nicht moeglich</span>
          ) : null}
        </div>
      </article>

      <article className={styles.shareBlock}>
        <h3>Embed-Code</h3>
        <p>Diesen Code können Sie in Ihre Website einfügen.</p>
        <pre className={styles.embedCode}>
          <code>{embedCode}</code>
        </pre>
        <div className={styles.copyRow}>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              void copyText(embedCode, "embed");
            }}
            disabled={!inquiryUrl}
          >
            Embed-Code kopieren
          </button>
          {embedStatus === "success" ? <span className={styles.copySuccess}>Kopiert</span> : null}
          {embedStatus === "error" ? (
            <span className={styles.copyError}>Kopieren nicht moeglich</span>
          ) : null}
        </div>
      </article>

      <article className={styles.shareBlock}>
        <h3>QR-Code</h3>
        <p>Diesen QR-Code können Sie ausdrucken oder auf Flyern und Visitenkarten verwenden.</p>
        <div className={styles.qrPreview}>
          {inquiryUrl ? (
            <QRCodeCanvas
              ref={qrCanvasRef}
              className={styles.qrImage}
              value={inquiryUrl}
              size={256}
              includeMargin
              aria-label="QR-Code für das Anfrageformular"
              title="QR-Code für das Anfrageformular"
            />
          ) : (
            <div className={styles.qrPlaceholder}>QR-Code wird geladen</div>
          )}
        </div>
        <div className={styles.copyRow}>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              void downloadQrCode();
            }}
            disabled={!inquiryUrl}
          >
            QR-Code herunterladen
          </button>
          {qrStatus === "success" ? <span className={styles.copySuccess}>Kopiert</span> : null}
          {qrStatus === "error" ? (
            <span className={styles.copyError}>Download nicht moeglich</span>
          ) : null}
        </div>
      </article>
    </section>
  );
}
