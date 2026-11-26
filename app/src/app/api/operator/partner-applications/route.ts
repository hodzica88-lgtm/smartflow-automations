import { NextResponse } from "next/server";

import { isPrimaryOwnerOperatorAccount } from "@/features/auth/primary-account";
import { listPartnerApplications, updatePartnerApplicationStatus } from "@/features/partners/application-server";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export const runtime = "nodejs";

const ensureOwnerAccess = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email || !isPrimaryOwnerOperatorAccount(user.email)) {
    return null;
  }

  return user;
};

export async function GET() {
  const user = await ensureOwnerAccess();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const applications = await listPartnerApplications({ limit: 100 });
  return NextResponse.json({ ok: true, applications });
}

export async function PATCH(request: Request) {
  const user = await ensureOwnerAccess();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const applicationId = typeof payload.applicationId === "string" ? payload.applicationId : "";
  const status = typeof payload.status === "string" ? payload.status : "";

  if (!applicationId || !status) {
    return NextResponse.json({ ok: false, error: "Missing applicationId or status." }, { status: 400 });
  }

  const result = await updatePartnerApplicationStatus({ applicationId, status });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
