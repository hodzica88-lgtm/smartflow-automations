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
  const triageBucket = String(thread.triage_bucket ?? "review");
  const triageCategory = String(thread.triage_category ?? thread.category ?? "unclear");
  const triageSummary = String(thread.triage_summary ?? "No triage summary available.");
  const triageAction = String(thread.triage_action ?? "review");
  const triageConfidence = typeof thread.triage_confidence === "number" ? Number(thread.triage_confidence).toFixed(2) : (typeof thread.ai_confidence === "number" ? Number(thread.ai_confidence).toFixed(2) : "—");

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
        <div className={styles.meta}><span>Bucket</span><strong>{triageBucket}</strong></div>
        <div className={styles.meta}><span>Classification</span><strong>{triageCategory}</strong></div>
        <div className={styles.meta}><span>Action</span><strong>{triageAction}</strong></div>
        <div className={styles.meta}><span>Confidence</span><strong>{triageConfidence}</strong></div>
        <div className={styles.meta}><span>Summary</span><strong>{triageSummary}</strong></div>
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
        <p className={styles.note}>Reply actions are manual and are never sent automatically by the AI.</p>
        <form action={sendSupportReplyAction}>
          <input type="hidden" name="thread_id" value={String(thread.id)} />
          <textarea name="body" className={styles.textarea} rows={6} placeholder="Write a manual reply to the customer..." required />
          <button className={styles.primaryButton} type="submit">Send reply</button>
        </form>
      </section>
    </main>
  );
}
