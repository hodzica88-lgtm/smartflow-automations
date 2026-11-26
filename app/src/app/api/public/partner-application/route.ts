import { NextResponse } from "next/server";

import { submitPartnerApplication } from "@/features/partners/application-server";
import { validatePartnerApplicationInput } from "@/features/partners/application";

export const runtime = "nodejs";

const readBody = async (request: Request) => {
  try {
    const raw = await request.clone().text();
    if (!raw.trim()) {
      return {} as Record<string, unknown>;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return {} as Record<string, unknown>;
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  const body = await readBody(request);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const market: "de" | "us" = typeof body.market === "string" && (body.market === "de" || body.market === "us")
    ? body.market
    : "de";

  const payload = {
    name: typeof body.name === "string" ? body.name : "",
    company: typeof body.company === "string" ? body.company : "",
    email: typeof body.email === "string" ? body.email : "",
    website: typeof body.website === "string" ? body.website : "",
    country: typeof body.country === "string" ? body.country : "",
    message: typeof body.message === "string" ? body.message : "",
    privacyAccepted: Boolean(body.privacyAccepted),
    source: typeof body.source === "string" ? body.source : "public_form",
    market,
    honeypot: typeof body.honeypot === "string" ? body.honeypot : "",
  };

  const validation = validatePartnerApplicationInput(payload);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const result = await submitPartnerApplication(payload);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, applicationId: result.applicationId });
}
