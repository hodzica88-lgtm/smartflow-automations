"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { QRCodeCanvas } from "qrcode.react";

import { getMarketCopy } from "@/shared/i18n/copy";
import styles from "./dashboard.module.css";

type InquiryShareSectionProps = {
  companyId: string;
};

const subscribeToLocationOrigin = () => () => {};
const getServerOriginSnapshot = () => "";
const getBrowserOriginSnapshot = () => window.location.origin;
const QR_CODE_FILE_NAME = "company-inquiry-qr-code.png";

export default function InquiryShareSection({ companyId }: InquiryShareSectionProps) {
  const market = typeof window !== "undefined" && window.location.hostname.endsWith("varnito.com") ? "us" : "de";
  const copy = getMarketCopy(market).shared.inquiryShare;
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
      `<iframe src="${inquiryUrl}" width="100%" height="700" frameborder="0" loading="lazy" title="${copy.embedTitle}"></iframe>`,
    [copy.embedTitle, inquiryUrl],
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
    <section className={styles.empty} aria-label={copy.title}>
      <h2>{copy.title}</h2>

      <article className={styles.shareBlock}>
        <h3>{copy.linkLabel}</h3>
        <p>{copy.linkDescription}</p>
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
            {copy.copyLink}
          </button>
          {linkStatus === "success" ? <span className={styles.copySuccess}>{copy.copied}</span> : null}
          {linkStatus === "error" ? (
            <span className={styles.copyError}>{copy.copyFailed}</span>
          ) : null}
        </div>
      </article>

      <article className={styles.shareBlock}>
        <h3>{copy.embedLabel}</h3>
        <p>{copy.embedDescription}</p>
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
            {copy.copyEmbedCode}
          </button>
          {embedStatus === "success" ? <span className={styles.copySuccess}>{copy.copied}</span> : null}
          {embedStatus === "error" ? (
            <span className={styles.copyError}>{copy.copyFailed}</span>
          ) : null}
        </div>
      </article>

      <article className={styles.shareBlock}>
        <h3>{copy.qrLabel}</h3>
        <p>{copy.qrDescription}</p>
        <div className={styles.qrPreview}>
          {inquiryUrl ? (
            <QRCodeCanvas
              ref={qrCanvasRef}
              className={styles.qrImage}
              value={inquiryUrl}
              size={256}
              includeMargin
              aria-label={copy.qrAriaLabel}
              title={copy.qrAriaLabel}
            />
          ) : (
            <div className={styles.qrPlaceholder}>{copy.qrLoading}</div>
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
            {copy.downloadQrCode}
          </button>
          {qrStatus === "success" ? <span className={styles.copySuccess}>{copy.copied}</span> : null}
          {qrStatus === "error" ? (
            <span className={styles.copyError}>{copy.downloadFailed}</span>
          ) : null}
        </div>
      </article>
    </section>
  );
}
