import { loadServerEnv } from "@/shared/config/env";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const INTERNAL_API_SECRET_HEADER = "x-internal-api-secret";

export const runtime = "nodejs";

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET(request: Request) {
  const serverEnv = loadServerEnv();
  const internalApiSecret = serverEnv.internalApiSecret;

  if (!internalApiSecret) {
    return jsonResponse(
      {
        ok: false,
        app: "ok",
        database: "error",
        counts: {
          pendingNotifications: 0,
          failedNotificationsLast24h: 0,
          staleProcessingNotifications: 0,
        },
      },
      503,
    );
  }

  const providedSecret = request.headers.get(INTERNAL_API_SECRET_HEADER);

  if (!providedSecret || providedSecret !== internalApiSecret) {
    return jsonResponse(
      {
        ok: false,
        app: "ok",
        database: "error",
        counts: {
          pendingNotifications: 0,
          failedNotificationsLast24h: 0,
          staleProcessingNotifications: 0,
        },
      },
      401,
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  try {
    const [pendingResult, failedResult, staleResult] = await Promise.all([
      supabase
        .from("notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("updated_at", since),
      supabase
        .from("notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .lt("processing_started_at", staleBefore),
    ]);

    if (pendingResult.error || failedResult.error || staleResult.error) {
      return jsonResponse(
        {
          ok: false,
          app: "ok",
          database: "error",
          counts: {
            pendingNotifications: 0,
            failedNotificationsLast24h: 0,
            staleProcessingNotifications: 0,
          },
        },
        503,
      );
    }

    const pendingNotifications = pendingResult.count ?? 0;
    const failedNotificationsLast24h = failedResult.count ?? 0;
    const staleProcessingNotifications = staleResult.count ?? 0;

    const hasStaleProcessing = staleProcessingNotifications > 0;

    return jsonResponse(
      {
        ok: !hasStaleProcessing,
        app: "ok",
        database: "ok",
        counts: {
          pendingNotifications,
          failedNotificationsLast24h,
          staleProcessingNotifications,
        },
      },
      hasStaleProcessing ? 503 : 200,
    );
  } catch {
    return jsonResponse(
      {
        ok: false,
        app: "ok",
        database: "error",
        counts: {
          pendingNotifications: 0,
          failedNotificationsLast24h: 0,
          staleProcessingNotifications: 0,
        },
      },
      503,
    );
  }
}
