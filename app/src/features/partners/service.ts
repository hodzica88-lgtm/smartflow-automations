import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

import type { PartnerEventType } from "@/features/partners/types";

export type PartnerEventApplicationInput = {
  partnerId: string;
  eventId: string;
  externalCustomerId: string;
  eventType: PartnerEventType;
  occurredAt: string;
};

export type PartnerEventApplicationResult = {
  ok: boolean;
  duplicate: boolean;
};

export class PartnerEventConflictError extends Error {
  override name = "PartnerEventConflictError";

  constructor(message = "Idempotency conflict.") {
    super(message);
  }
}

export const applyPartnerEvent = async (
  input: PartnerEventApplicationInput,
): Promise<PartnerEventApplicationResult> => {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase.rpc("record_partner_event", {
    p_partner_id: input.partnerId,
    p_event_id: input.eventId,
    p_external_customer_id: input.externalCustomerId,
    p_event_type: input.eventType,
    p_occurred_at: input.occurredAt,
  });

  if (error) {
    const normalizedMessage = String(error.message ?? "").toLowerCase();

    if (
      normalizedMessage.includes("idempotency conflict") ||
      normalizedMessage.includes("duplicate") ||
      error.code === "23505"
    ) {
      throw new PartnerEventConflictError("Idempotency conflict.");
    }

    throw new Error("Failed to record partner event.");
  }

  const payload = data as Record<string, unknown> | null | undefined;

  if (!payload) {
    return { ok: true, duplicate: false };
  }

  return {
    ok: payload.ok !== false,
    duplicate: Boolean(payload.duplicate),
  };
};
