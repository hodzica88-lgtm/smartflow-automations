import { loadServerEnv } from "@/shared/config/env";
import { createErrorResponse } from "@/shared/lib/http/errors";
import { createEventId, logServerEvent } from "@/shared/lib/observability/logger";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const runtime = "nodejs";

const INTERNAL_API_SECRET_HEADER = "x-internal-api-secret";

const json = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

export async function GET(request: Request) {
  const env = loadServerEnv();

  if (!env.internalApiSecret) {
    return createErrorResponse({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Readiness secret is not configured.",
    });
  }

  const provided = request.headers.get(INTERNAL_API_SECRET_HEADER);
  if (!provided || provided !== env.internalApiSecret) {
    return createErrorResponse({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
    });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase
      .from("companies")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      logServerEvent("warn", {
        eventId: createEventId("ready"),
        message: "Readiness check degraded due to database error.",
        error,
      });
      return json({ status: "degraded" }, 503);
    }

    return json({ status: "ok" }, 200);
  } catch (error) {
    logServerEvent("error", {
      eventId: createEventId("ready"),
      message: "Readiness check failed.",
      error,
    });

    return json({ status: "degraded" }, 503);
  }
}
