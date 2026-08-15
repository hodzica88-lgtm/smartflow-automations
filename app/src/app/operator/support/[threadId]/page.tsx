import { notFound } from "next/navigation";

import { sendSupportReplyAction, updateSupportStatusAction } from "@/features/support/actions";
import { getSupportThreadDetail } from "@/features/support/service";
import { requireOperatorUser } from "@/features/operator/access";
import { getRequestMarket } from "@/shared/i18n/request";

import styles from "../support.module.css";

const statusOptions = [
  "open",
  "ai_answered",
  "escalated",
  "waiting_customer",
  "resolved",
] as const;

const formatDate = (value: string | null, market: "de" | "us") => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(market === "us" ? "en-US" : "de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

export default async function SupportThreadDetailPage({ params }: { params: Promise<{ threadId: string }> }) {
  await requireOperatorUser({ nextPath: "/operator/support" });
  const { market } = await getRequestMarket();
  const { threadId } = await params;
  const result = await getSupportThreadDetail(threadId);

  if (!result.thread) {
    notFound();
  }

  const thread = result.thread as Record<string, unknown>;

  return (
    <main className={styles.shell}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Support thread</p>
          <h1 className={styles.title}>{String(thread.subject ?? "Support request")}</h1>
          <p className={styles.copy}>{String(thread.customer_email ?? "")}</p>
        </div>
        <form action={updateSupportStatusAction}>
          <input type="hidden" name="thread_id" value={String(thread.id)} />
          <select name="status" defaultValue={String(thread.status ?? "open")} className={styles.select}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button className={styles.primaryButton} type="submit">Update status</button>
        </form>
      </section>

      <section className={styles.summary}
        aria-label="Support thread summary">
        <div className={styles.meta}><span>Language</span><strong>{String(thread.locale ?? "de").toUpperCase()}</strong></div>
        <div className={styles.meta}><span>Category</span><strong>{String(thread.category ?? "unknown")}</strong></div>
        <div className={styles.meta}><span>Priority</span><strong>{String(thread.priority ?? "medium")}</strong></div>
        <div className={styles.meta}><span>AI confidence</span><strong>{thread.ai_confidence ? Number(thread.ai_confidence).toFixed(2) : "—"}</strong></div>
      </section>

      <section className={styles.panel}>
        <h2>Conversation</h2>
        <div className={styles.timeline}>
          {(result.messages ?? []).map((message) => (
            <article key={String(message.id)} className={styles.messageCard}>
              <div className={styles.messageHeader}>
                <strong>{String(message.sender_type)}</strong>
                <span>{formatDate(String(message.created_at), market)}</span>
              </div>
              <p>{String(message.body_text)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Manual reply</h2>
        <form action={sendSupportReplyAction}>
          <input type="hidden" name="thread_id" value={String(thread.id)} />
          <textarea name="body" className={styles.textarea} rows={6} placeholder="Write a manual reply to the customer..." required />
          <button className={styles.primaryButton} type="submit">Send reply</button>
        </form>
      </section>
    </main>
  );
}
