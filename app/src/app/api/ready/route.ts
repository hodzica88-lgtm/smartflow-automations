import { loadServerEnv } from "@/shared/config/env";
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
    return json({ status: "error" }, 503);
  }

  const provided = request.headers.get(INTERNAL_API_SECRET_HEADER);
  if (!provided || provided !== env.internalApiSecret) {
    return json({ status: "unauthorized" }, 401);
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase
      .from("companies")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      return json({ status: "degraded" }, 503);
    }

    return json({ status: "ok" }, 200);
  } catch {
    return json({ status: "degraded" }, 503);
  }
}
