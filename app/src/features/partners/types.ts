export type PartnerStatus = "pending" | "active" | "paused" | "terminated";

export type PartnerBillingModel =
  | "per_customer"
  | "flat"
  | "tiered"
  | "custom";

export type PartnerEventType =
  | "activated"
  | "deactivated"
  | "reactivated"
  | "billable_started"
  | "billable_stopped";

export const PARTNER_STATUSES: PartnerStatus[] = [
  "pending",
  "active",
  "paused",
  "terminated",
];

export const PARTNER_BILLING_MODELS: PartnerBillingModel[] = [
  "per_customer",
  "flat",
  "tiered",
  "custom",
];

export const PARTNER_EVENT_TYPES: PartnerEventType[] = [
  "activated",
  "deactivated",
  "reactivated",
  "billable_started",
  "billable_stopped",
];
