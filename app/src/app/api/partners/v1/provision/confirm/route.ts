import { NextResponse } from "next/server";

import * as partnerProvisioning from "@/features/partners/provisioning";
import { loadServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status });

const getHeader = (request: Request, name: string) => request.headers.get(name)?.trim() ?? "";

const parseBody = async (request: Request) => {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  const env = loadServerEnv();

  if (!env.partnerMeteringEnabled || !env.partnerProvisioningEnabled) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const provider = getHeader(request, "x-varnito-provider");
  const requestId = getHeader(request, "x-varnito-request-id");
  const timestamp = getHeader(request, "x-varnito-timestamp");
  const nonce = getHeader(request, "x-varnito-nonce");
  const signature = getHeader(request, "x-varnito-signature");

  if (!provider || !requestId || !timestamp || !nonce || !signature) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const rawBody = await request.clone().text();
  const verifySignature =
    "verifyProviderProvisioningSignature" in partnerProvisioning
      ? partnerProvisioning.verifyProviderProvisioningSignature
      : undefined;
  const verification =
    typeof verifySignature === "function"
      ? verifySignature({
          provider,
          requestId,
          timestamp,
          nonce,
          signature,
          rawBody,
        })
      : true;

  if (!verification) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const payload = await parseBody(request);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const providerInstallId = String((payload as Record<string, unknown>).provider_install_id ?? "");
  const bodyRequestId = String((payload as Record<string, unknown>).request_id ?? requestId);
  const authorization = request.headers.get("authorization") ?? "";
  const credential = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";

  if (!providerInstallId || !bodyRequestId || !credential) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    const result = await partnerProvisioning.confirmPartnerProvisioningCredential({
      provider,
      providerInstallId,
      requestId: bodyRequestId,
      credential,
    });

    return jsonResponse({ ...result, ok: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    if (message === "provisioning_disabled") {
      return jsonResponse({ error: "not_found" }, 404);
    }

    return jsonResponse({ error: message }, 400);
  }
}
