import { headers } from "next/headers";

import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { buildRateLimitedResponse } from "@/shared/lib/rate-limit/response";

type EnforceActionRateLimitInput = {
  scope: string;
  companyId?: string | null;
  maxSubmissions: number;
  windowMinutes: number;
};

type ActionRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const normalizeIpCandidate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const first = value.split(",")[0]?.trim();
  if (!first) {
    return null;
  }

  if (first.length > 64 || !/^[0-9a-fA-F:.]+$/.test(first)) {
    return null;
  }

  return first;
};

const getClientIdentity = async () => {
  let requestHeaders: Awaited<ReturnType<typeof headers>>;

  try {
    requestHeaders = await headers();
  } catch {
    if (process.env.NODE_ENV !== "production") {
      return "127.0.0.1";
    }

    return null;
  }

  const candidates = [
    requestHeaders.get("cf-connecting-ip"),
    requestHeaders.get("x-real-ip"),
    requestHeaders.get("x-forwarded-for"),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeIpCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return null;
};

export const enforceActionRateLimit = async (
  input: EnforceActionRateLimitInput,
): Promise<ActionRateLimitResult> => {
  const identity = await getClientIdentity();

  if (!identity) {
    return {
      allowed: false,
      retryAfterSeconds: 60,
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  if (typeof (supabase as { rpc?: unknown }).rpc !== "function") {
    if (process.env.NODE_ENV === "test") {
      return {
        allowed: true,
        retryAfterSeconds: 0,
      };
    }

    return {
      allowed: false,
      retryAfterSeconds: 60,
    };
  }

  const { data, error } = await supabase.rpc("check_and_record_action_rate_limit", {
    p_scope: input.scope,
    p_company_id: input.companyId ?? null,
    p_actor_value: identity,
    p_max_submissions: input.maxSubmissions,
    p_window_minutes: input.windowMinutes,
  });

  if (error) {
    return {
      allowed: false,
      retryAfterSeconds: 60,
    };
  }

  const first = Array.isArray(data) ? data[0] : null;
  const allowed = Boolean((first as { allowed?: unknown } | null)?.allowed);
  const retryAfterSeconds = Number(
    (first as { retry_after_seconds?: unknown } | null)?.retry_after_seconds ?? 60,
  );

  return {
    allowed,
    retryAfterSeconds:
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.floor(retryAfterSeconds)
        : 60,
  };
};

export { buildRateLimitedResponse };
