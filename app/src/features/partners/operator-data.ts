import { loadServerEnv } from "@/shared/config/env";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

import type {
  PartnerBillingModel,
  PartnerStatus,
} from "@/features/partners/types";

export type PartnerOwnerOverview = {
  partnerId: string;
  partnerKey: string;
  name: string;
  status: PartnerStatus;
  billingModel: PartnerBillingModel;
  currency: string;
  pricePerCustomerMinor: number | null;
  activeCustomers: number;
  billableCustomers: number;
  newThisMonth: number;
  reactivatedThisMonth: number;
  deactivatedThisMonth: number;
  netChangeThisMonth: number;
  mrrMinor: number | null;
  arrMinor: number | null;
};

export type PartnerMeteringSummary = {
  activePartners: number;
  activeCustomers: number;
  newThisMonth: number;
  deactivatedThisMonth: number;
  netChangeThisMonth: number;
  billableCustomers: number;
  mrrByCurrency: Record<string, number>;
};

export type PartnerMeteringDashboardData = {
  enabled: boolean;
  partners: PartnerOwnerOverview[];
  summary: PartnerMeteringSummary;
  error?: boolean;
};

type PartnerRow = {
  id: string;
  partner_key: string;
  name: string;
  status: PartnerStatus;
  billing_model: PartnerBillingModel;
  price_per_customer_minor: number | null;
  currency: string;
};

type PartnerCustomerRow = {
  partner_id: string;
  id: string;
  is_active: boolean;
  is_billable: boolean;
};

type PartnerEventRow = {
  partner_id: string;
  event_type: string;
  received_at: string | null;
};

export const EMPTY_PARTNER_METERING_SUMMARY: PartnerMeteringSummary = {
  activePartners: 0,
  activeCustomers: 0,
  newThisMonth: 0,
  deactivatedThisMonth: 0,
  netChangeThisMonth: 0,
  billableCustomers: 0,
  mrrByCurrency: {},
};

const isWithinMonth = (value: string | null, start: Date, end: Date) => {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed >= start && parsed <= end;
};

const getCurrentMonthWindow = (date = new Date()) => ({
  start: new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0),
  end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
});

export const computePartnerOwnerOverview = ({
  partner,
  customers,
  events,
  currentMonthStart,
  currentMonthEnd,
}: {
  partner: PartnerRow;
  customers: PartnerCustomerRow[];
  events: PartnerEventRow[];
  currentMonthStart: Date;
  currentMonthEnd: Date;
}): PartnerOwnerOverview => {
  const activeCustomers = customers.filter((customer) => customer.is_active).length;
  const billableCustomers = customers.filter((customer) => customer.is_billable).length;

  const newThisMonth = events.filter(
    (event) => event.event_type === "activated" && isWithinMonth(event.received_at, currentMonthStart, currentMonthEnd),
  ).length;

  const reactivatedThisMonth = events.filter(
    (event) => event.event_type === "reactivated" && isWithinMonth(event.received_at, currentMonthStart, currentMonthEnd),
  ).length;

  const deactivatedThisMonth = events.filter(
    (event) => event.event_type === "deactivated" && isWithinMonth(event.received_at, currentMonthStart, currentMonthEnd),
  ).length;

  const netChangeThisMonth = newThisMonth + reactivatedThisMonth - deactivatedThisMonth;

  let mrrMinor: number | null = null;
  let arrMinor: number | null = null;

  if (partner.billing_model === "per_customer" && partner.price_per_customer_minor !== null) {
    mrrMinor = billableCustomers * partner.price_per_customer_minor;
    arrMinor = mrrMinor * 12;
  }

  return {
    partnerId: partner.id,
    partnerKey: partner.partner_key,
    name: partner.name,
    status: partner.status,
    billingModel: partner.billing_model,
    currency: partner.currency,
    pricePerCustomerMinor: partner.price_per_customer_minor,
    activeCustomers,
    billableCustomers,
    newThisMonth,
    reactivatedThisMonth,
    deactivatedThisMonth,
    netChangeThisMonth,
    mrrMinor,
    arrMinor,
  };
};

export const summarizePartnerOwnerOverview = (
  partners: PartnerOwnerOverview[],
): PartnerMeteringSummary => {
  const mrrByCurrency: Record<string, number> = {};

  for (const partner of partners) {
    if (partner.mrrMinor === null) {
      continue;
    }

    const current = mrrByCurrency[partner.currency] ?? 0;
    mrrByCurrency[partner.currency] = current + partner.mrrMinor;
  }

  return {
    activePartners: partners.filter((partner) => partner.status === "active").length,
    activeCustomers: partners.reduce((sum, partner) => sum + partner.activeCustomers, 0),
    newThisMonth: partners.reduce((sum, partner) => sum + partner.newThisMonth, 0),
    deactivatedThisMonth: partners.reduce((sum, partner) => sum + partner.deactivatedThisMonth, 0),
    netChangeThisMonth: partners.reduce((sum, partner) => sum + partner.netChangeThisMonth, 0),
    billableCustomers: partners.reduce((sum, partner) => sum + partner.billableCustomers, 0),
    mrrByCurrency,
  };
};

export const getOwnerPartnerMeteringOverview = async (): Promise<PartnerMeteringDashboardData> => {
  const { partnerMeteringEnabled } = loadServerEnv();

  if (!partnerMeteringEnabled) {
    return {
      enabled: false,
      partners: [],
      summary: EMPTY_PARTNER_METERING_SUMMARY,
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { start, end } = getCurrentMonthWindow();

  const [partnersResult, customersResult, eventsResult] = await Promise.all([
    supabase.from("partners").select("id, partner_key, name, status, billing_model, price_per_customer_minor, currency").order("name", { ascending: true }),
    supabase.from("partner_customers").select("partner_id, id, is_active, is_billable"),
    supabase.from("partner_events").select("partner_id, event_type, received_at").gte("received_at", start.toISOString()).lte("received_at", end.toISOString()),
  ]);

  if (partnersResult.error || customersResult.error || eventsResult.error) {
    console.error("Failed to load partner metering overview", {
      partnersError: partnersResult.error,
      customersError: customersResult.error,
      eventsError: eventsResult.error,
    });

    return {
      enabled: true,
      partners: [],
      summary: EMPTY_PARTNER_METERING_SUMMARY,
      error: true,
    };
  }

  const partnerRows = (partnersResult.data ?? []) as PartnerRow[];
  const customerRows = (customersResult.data ?? []) as PartnerCustomerRow[];
  const eventRows = (eventsResult.data ?? []) as PartnerEventRow[];

  const customersByPartner = new Map<string, PartnerCustomerRow[]>();
  const eventsByPartner = new Map<string, PartnerEventRow[]>();

  for (const customer of customerRows) {
    const list = customersByPartner.get(customer.partner_id) ?? [];
    list.push(customer);
    customersByPartner.set(customer.partner_id, list);
  }

  for (const event of eventRows) {
    const list = eventsByPartner.get(event.partner_id) ?? [];
    list.push(event);
    eventsByPartner.set(event.partner_id, list);
  }

  const partners = partnerRows.map((partner) =>
    computePartnerOwnerOverview({
      partner,
      customers: customersByPartner.get(partner.id) ?? [],
      events: eventsByPartner.get(partner.id) ?? [],
      currentMonthStart: start,
      currentMonthEnd: end,
    }),
  );

  return {
    enabled: true,
    partners,
    summary: summarizePartnerOwnerOverview(partners),
  };
};
