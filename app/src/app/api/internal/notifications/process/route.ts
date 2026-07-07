import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { loadServerEnv } from "@/shared/config/env";

const INTERNAL_API_SECRET_HEADER = "x-internal-api-secret";
const MAX_QUEUE_BATCH = 20;

export const runtime = "nodejs";

export async function POST(request: Request) {
  const serverEnv = loadServerEnv();
  const internalApiSecret = serverEnv.internalApiSecret;

  if (!internalApiSecret) {
    return new Response("Internal API secret is not configured.", {
      status: 500,
    });
  }

  const providedSecret = request.headers.get(INTERNAL_API_SECRET_HEADER);

  if (!providedSecret || providedSecret !== internalApiSecret) {
    return new Response("Unauthorized.", {
      status: 401,
    });
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
    return new Response("Failed to load notification queue.", {
      status: 500,
    });
  }

  const items = queueItems ?? [];

  if (items.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, items: [] }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }

  // TODO: use company_id and lead_id here for the future Make.com / Brevo handoff.

  const ids = items.map((item) => item.id).filter(Boolean);

  const { error: updateError } = await supabase
    .from("notification_queue")
    .update({
      status: "sent",
      sent_at: now,
      error_message: null,
    })
    .in("id", ids);

  if (updateError) {
    return new Response("Failed to update notification queue items.", {
      status: 500,
    });
  }

  return new Response(
    JSON.stringify({ processed: ids.length, processedIds: ids }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}
