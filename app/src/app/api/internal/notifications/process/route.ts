import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { loadServerEnv } from "@/shared/config/env";

const INTERNAL_API_SECRET_HEADER = "x-internal-api-secret";
const MAX_QUEUE_BATCH = 25;

type NotificationQueueItem = {
  id: string;
  company_id: string;
  lead_id: string;
  notification_type: string;
  status: string;
  scheduled_for: string;
};

type ProcessedNotificationSummary = {
  id: string;
  notification_type: string;
  status: "sent" | "failed";
  error_message?: string | null;
};

export const runtime = "nodejs";

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function POST(request: Request) {
  const serverEnv = loadServerEnv();
  const internalApiSecret = serverEnv.internalApiSecret;

  if (!internalApiSecret) {
    return jsonResponse(
      {
        ok: false,
        processed: 0,
        failed: 0,
        skippedFuture: 0,
        processedIds: [],
        results: [],
        message: "Internal API secret is not configured.",
      },
      500,
    );
  }

  const providedSecret = request.headers.get(INTERNAL_API_SECRET_HEADER);

  if (!providedSecret || providedSecret !== internalApiSecret) {
    return jsonResponse(
      {
        ok: false,
        processed: 0,
        failed: 0,
        skippedFuture: 0,
        processedIds: [],
        results: [],
        message: "Unauthorized.",
      },
      401,
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  const { data: queueItems, error: queueError } = await supabase
    .from("notification_queue")
    .select("id, company_id, lead_id, notification_type, status, scheduled_for")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_QUEUE_BATCH);

  if (queueError) {
    return jsonResponse(
      {
        ok: false,
        processed: 0,
        failed: 0,
        skippedFuture: 0,
        processedIds: [],
        results: [],
        message: `Failed to load notification queue: ${queueError.message}`,
      },
      500,
    );
  }

  const items = (queueItems ?? []) as NotificationQueueItem[];

  const { count: futureCount, error: futureCountError } = await supabase
    .from("notification_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gt("scheduled_for", now);

  const skippedFuture = futureCountError ? 0 : futureCount ?? 0;

  if (items.length === 0) {
    return jsonResponse(
      {
        ok: true,
        processed: 0,
        failed: 0,
        skippedFuture,
        processedIds: [],
        results: [],
        message: "No due notifications to process.",
      },
      200,
    );
  }

  const results: ProcessedNotificationSummary[] = [];
  const processedIds: string[] = [];
  let processedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    try {
      const { error: updateError } = await supabase
        .from("notification_queue")
        .update({
          status: "sent",
          sent_at: now,
          updated_at: now,
          error_message: null,
        })
        .eq("id", item.id);

      if (updateError) {
        throw updateError;
      }

      processedCount += 1;
      processedIds.push(item.id);
      results.push({
        id: item.id,
        notification_type: item.notification_type,
        status: "sent",
      });
    } catch (error) {
      failedCount += 1;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await supabase
        .from("notification_queue")
        .update({
          status: "failed",
          updated_at: now,
          error_message: errorMessage,
        })
        .eq("id", item.id);

      results.push({
        id: item.id,
        notification_type: item.notification_type,
        status: "failed",
        error_message: errorMessage,
      });
    }
  }

  return jsonResponse(
    {
      ok: processedCount > 0 || failedCount === 0,
      processed: processedCount,
      failed: failedCount,
      skippedFuture,
      processedIds,
      results,
      message:
        failedCount > 0
          ? "Notification processing completed with partial failures."
          : "Notification processing completed.",
    },
    200,
  );
}
