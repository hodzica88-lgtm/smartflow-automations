import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { loadServerEnv } from "@/shared/config/env";

const INTERNAL_API_SECRET_HEADER = "x-internal-api-secret";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export const runtime = "nodejs";

type LoadTestRequest = {
  companyId?: unknown;
  runId?: unknown;
  sequence?: unknown;
  includeQueue?: unknown;
};

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function POST(request: Request) {
  const serverEnv = loadServerEnv();

  if (process.env.LOAD_TEST_ENABLED !== "true") {
    return jsonResponse({ ok: false, message: "Load testing is disabled." }, 404);
  }

  const providedSecret = request.headers.get(INTERNAL_API_SECRET_HEADER);
  if (!serverEnv.internalApiSecret || providedSecret !== serverEnv.internalApiSecret) {
    return jsonResponse({ ok: false, message: "Unauthorized." }, 401);
  }

  let body: LoadTestRequest;
  try {
    body = (await request.json()) as LoadTestRequest;
  } catch {
    return jsonResponse({ ok: false, message: "Invalid JSON body." }, 400);
  }

  const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
  const runId = typeof body.runId === "string" ? body.runId.trim() : "";
  const sequence = typeof body.sequence === "number" ? body.sequence : Number.NaN;
  const includeQueue = body.includeQueue === true;

  if (!UUID_REGEX.test(companyId)) {
    return jsonResponse({ ok: false, message: "Invalid companyId." }, 400);
  }

  if (!RUN_ID_REGEX.test(runId)) {
    return jsonResponse({ ok: false, message: "Invalid runId." }, 400);
  }

  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 10_000_000) {
    return jsonResponse({ ok: false, message: "Invalid sequence." }, 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, deleted_at")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    return jsonResponse({ ok: false, message: "Company lookup failed." }, 500);
  }

  if (!company || company.deleted_at) {
    return jsonResponse({ ok: false, message: "Company not found." }, 404);
  }

  const marker = `${runId}-${sequence}`;
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      company_id: companyId,
      first_name: "Load",
      last_name: `Test ${sequence}`,
      address: "Load test",
      phone: "+10000000000",
      email: `loadtest+${marker}@example.invalid`,
      inquiry_type: "Load Test",
      source: `load_test:${runId}`,
      status: "new",
      notes: `Automated load test run ${runId}, sequence ${sequence}`,
    })
    .select("id")
    .single();

  if (leadError || !lead?.id) {
    return jsonResponse(
      {
        ok: false,
        message: "Lead insert failed.",
        error: leadError?.message ?? null,
      },
      500,
    );
  }

  if (includeQueue) {
    const { error: queueError } = await supabase.from("notification_queue").insert([
      {
        company_id: companyId,
        lead_id: lead.id,
        notification_type: "owner_new_lead",
        status: "cancelled",
        scheduled_for: new Date().toISOString(),
        error_message: `Load test ${runId}: intentionally cancelled; no delivery attempted.`,
      },
      {
        company_id: companyId,
        lead_id: lead.id,
        notification_type: "customer_confirmation",
        status: "cancelled",
        scheduled_for: new Date().toISOString(),
        error_message: `Load test ${runId}: intentionally cancelled; no delivery attempted.`,
      },
    ]);

    if (queueError) {
      await supabase.from("leads").delete().eq("id", lead.id).eq("company_id", companyId);
      return jsonResponse(
        {
          ok: false,
          message: "Queue insert failed; lead was rolled back.",
          error: queueError.message,
        },
        500,
      );
    }
  }

  return jsonResponse(
    {
      ok: true,
      leadId: lead.id,
      runId,
      sequence,
      queueRowsCreated: includeQueue ? 2 : 0,
    },
    201,
  );
}
