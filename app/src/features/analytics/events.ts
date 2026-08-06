import { loadServerEnv } from "@/shared/config/env";
import type { MarketCode } from "@/shared/i18n/market";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type AnalyticsEventName =
  | "landing_view"
  | "demo_entry"
  | "auth_login_success"
  | "auth_forgot_password_requested"
  | "billing_checkout_started"
  | "billing_portal_opened"
  | "lead_created_public"
  | "lead_created_manual"
  | "leads_export_requested"
  | "team_invite_sent"
  | "team_invite_resent"
  | "team_member_removed"
  | "team_invite_accepted";

type Primitive = string | number | boolean | null;

type AnalyticsMetadata = Record<string, Primitive>;

type TrackAnalyticsEventInput = {
  eventName: AnalyticsEventName;
  market?: MarketCode | "unknown";
  companyId?: string | null;
  isAuthenticated?: boolean;
  metadata?: AnalyticsMetadata;
};

const SENSITIVE_METADATA_KEYS = [
  "email",
  "phone",
  "name",
  "full_name",
  "password",
  "token",
  "secret",
  "address",
] as const;

const isAnalyticsEnabled = () => {
  try {
    return loadServerEnv().analyticsEventsEnabled;
  } catch {
    return false;
  }
};

const sanitizeMetadata = (value: AnalyticsMetadata | undefined): AnalyticsMetadata => {
  if (!value) {
    return {};
  }

  const entries = Object.entries(value)
    .filter(([key]) => !SENSITIVE_METADATA_KEYS.some((needle) => key.toLowerCase().includes(needle)))
    .slice(0, 24);

  return Object.fromEntries(entries);
};

const persistAnalyticsEvent = async (input: TrackAnalyticsEventInput) => {
  const supabase = createSupabaseServiceRoleClient();

  await supabase.from("analytics_events").insert({
    event_name: input.eventName,
    market: input.market ?? "unknown",
    company_id: input.companyId ?? null,
    is_authenticated: input.isAuthenticated ?? false,
    metadata: sanitizeMetadata(input.metadata),
  });
};

export const trackAnalyticsEvent = (input: TrackAnalyticsEventInput) => {
  if (!isAnalyticsEnabled()) {
    return;
  }

  // Fire-and-forget so product flows never fail because telemetry write fails.
  void persistAnalyticsEvent(input).catch(() => {
    // Intentionally no throw and no log noise for telemetry failures.
  });
};
