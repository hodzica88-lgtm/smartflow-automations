export const runtime = "nodejs";

import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase
      .from("companies")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      return new Response(JSON.stringify({ status: "degraded" }), {
        status: 503,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      });
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ status: "degraded" }), {
      status: 503,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }
}
