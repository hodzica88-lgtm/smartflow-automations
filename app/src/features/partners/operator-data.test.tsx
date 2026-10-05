import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PartnerMeteringPanel } from "@/features/partners/PartnerMeteringPanel";
import {
  EMPTY_PARTNER_METERING_SUMMARY,
  computePartnerOwnerOverview,
  getOwnerPartnerMeteringOverview,
  summarizePartnerOwnerOverview,
} from "@/features/partners/operator-data";
import type { PartnerBillingModel, PartnerStatus } from "@/features/partners/types";
import { loadServerEnv } from "@/shared/config/env";

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: vi.fn(),
  publicEnv: { supabaseUrl: "https://example.supabase.co" },
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

const mockedLoadServerEnv = vi.mocked(loadServerEnv);

type TestPartnerRow = {
  id: string;
  partner_key: string;
  name: string;
  status: PartnerStatus;
  billing_model: PartnerBillingModel;
  price_per_customer_minor: number | null;
  currency: string;
};

const makePartnerRow = (overrides: Partial<TestPartnerRow> = {}): TestPartnerRow => ({
  id: "partner-1",
  partner_key: "demo-partner",
  name: "Demo Partner",
  status: "active",
  billing_model: "per_customer",
  price_per_customer_minor: 1200,
  currency: "EUR",
  ...overrides,
});

const makeCustomerRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  partner_id: "partner-1",
  id: "customer-1",
  is_active: true,
  is_billable: true,
  external_customer_id: "ext-1",
  ...overrides,
});

const makeEventRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  partner_id: "partner-1",
  external_customer_id: "ext-1",
  event_type: "activated",
  received_at: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("partner metering owner dashboard data", () => {
  it("returns disabled state without querying when the feature flag is off", async () => {
    mockedLoadServerEnv.mockReturnValue({
      partnerMeteringEnabled: false,
    } as never);

    const createClient = (await import("@/shared/lib/supabase/server")).createSupabaseServiceRoleClient as ReturnType<typeof vi.fn>;
    const result = await getOwnerPartnerMeteringOverview();

    expect(result.enabled).toBe(false);
    expect(result.partners).toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("computes per_customer metrics and MRR/ARR correctly", () => {
    const partner = makePartnerRow({
      id: "partner-1",
      partner_key: "demo-partner",
      name: "Demo Partner",
      status: "active",
      billing_model: "per_customer",
      price_per_customer_minor: 1200,
      currency: "EUR",
    });

    const activeCustomers = [
      makeCustomerRow({ id: "c1", is_active: true, is_billable: true }),
      makeCustomerRow({ id: "c2", is_active: true, is_billable: false }),
      makeCustomerRow({ id: "c3", is_active: false, is_billable: true }),
    ];

    const events = [
      makeEventRow({ event_type: "activated", received_at: "2026-10-05T10:00:00.000Z" }),
      makeEventRow({ event_type: "reactivated", received_at: "2026-10-12T09:00:00.000Z" }),
      makeEventRow({ event_type: "deactivated", received_at: "2026-10-18T08:00:00.000Z" }),
      makeEventRow({ event_type: "deactivated", received_at: "2026-09-15T12:00:00.000Z" }),
    ];

    const overview = computePartnerOwnerOverview({
      partner,
      customers: activeCustomers,
      events,
      currentMonthStart: new Date("2026-10-01T00:00:00.000Z"),
      currentMonthEnd: new Date("2026-10-31T23:59:59.999Z"),
    });

    expect(overview.activeCustomers).toBe(2);
    expect(overview.billableCustomers).toBe(2);
    expect(overview.newThisMonth).toBe(1);
    expect(overview.reactivatedThisMonth).toBe(1);
    expect(overview.deactivatedThisMonth).toBe(1);
    expect(overview.netChangeThisMonth).toBe(1);
    expect(overview.mrrMinor).toBe(2400);
    expect(overview.arrMinor).toBe(28800);
  });

  it("keeps EUR and USD MRR separate in the summary", () => {
    const summary = summarizePartnerOwnerOverview([
      {
        partnerId: "p1",
        partnerKey: "eur-partner",
        name: "EUR Partner",
        status: "active",
        billingModel: "per_customer",
        currency: "EUR",
        pricePerCustomerMinor: 1000,
        activeCustomers: 2,
        billableCustomers: 2,
        newThisMonth: 1,
        reactivatedThisMonth: 0,
        deactivatedThisMonth: 0,
        netChangeThisMonth: 1,
        mrrMinor: 2000,
        arrMinor: 24000,
      },
      {
        partnerId: "p2",
        partnerKey: "usd-partner",
        name: "USD Partner",
        status: "active",
        billingModel: "per_customer",
        currency: "USD",
        pricePerCustomerMinor: 400,
        activeCustomers: 1,
        billableCustomers: 1,
        newThisMonth: 0,
        reactivatedThisMonth: 1,
        deactivatedThisMonth: 0,
        netChangeThisMonth: 1,
        mrrMinor: 400,
        arrMinor: 4800,
      },
      {
        partnerId: "p3",
        partnerKey: "flat-partner",
        name: "Flat Partner",
        status: "active",
        billingModel: "flat",
        currency: "EUR",
        pricePerCustomerMinor: null,
        activeCustomers: 3,
        billableCustomers: 2,
        newThisMonth: 0,
        reactivatedThisMonth: 0,
        deactivatedThisMonth: 0,
        netChangeThisMonth: 0,
        mrrMinor: null,
        arrMinor: null,
      },
    ]);

    expect(summary.mrrByCurrency).toEqual({ EUR: 2000, USD: 400 });
    expect(summary.activePartners).toBe(3);
    expect(summary.billableCustomers).toBe(5);
  });

  it("renders empty state and disabled state correctly", () => {
    const emptyHtml = renderToStaticMarkup(
      <PartnerMeteringPanel market="de" data={{ enabled: true, partners: [], summary: { activePartners: 0, activeCustomers: 0, newThisMonth: 0, deactivatedThisMonth: 0, netChangeThisMonth: 0, billableCustomers: 0, mrrByCurrency: {} } }} />,
    );

    expect(emptyHtml).toContain("Noch keine Partner eingerichtet.");

    const disabledHtml = renderToStaticMarkup(
      <PartnerMeteringPanel market="us" data={{ enabled: false, partners: [], summary: { activePartners: 0, activeCustomers: 0, newThisMonth: 0, deactivatedThisMonth: 0, netChangeThisMonth: 0, billableCustomers: 0, mrrByCurrency: {} } }} />,
    );

    expect(disabledHtml).not.toContain("Partner");
    expect(disabledHtml).not.toContain("Partners");
  });

  it("renders dynamically and does not rely on hardcoded partner names", () => {
    const html = renderToStaticMarkup(
      <PartnerMeteringPanel
        market="us"
        data={{
          enabled: true,
          partners: [
            {
              partnerId: "p1",
              partnerKey: "alpha-partner",
              name: "Alpha Partner",
              status: "active",
              billingModel: "per_customer",
              currency: "EUR",
              pricePerCustomerMinor: 700,
              activeCustomers: 4,
              billableCustomers: 3,
              newThisMonth: 2,
              reactivatedThisMonth: 1,
              deactivatedThisMonth: 0,
              netChangeThisMonth: 3,
              mrrMinor: 2100,
              arrMinor: 25200,
            },
            {
              partnerId: "p2",
              partnerKey: "beta-partner",
              name: "Beta Partner",
              status: "paused",
              billingModel: "custom",
              currency: "USD",
              pricePerCustomerMinor: null,
              activeCustomers: 2,
              billableCustomers: 0,
              newThisMonth: 0,
              reactivatedThisMonth: 0,
              deactivatedThisMonth: 1,
              netChangeThisMonth: -1,
              mrrMinor: null,
              arrMinor: null,
            },
          ],
          summary: {
            activePartners: 2,
            activeCustomers: 6,
            newThisMonth: 2,
            deactivatedThisMonth: 1,
            netChangeThisMonth: 2,
            billableCustomers: 3,
            mrrByCurrency: { EUR: 2100 },
          },
        }} />,
    );

    expect(html).toContain("Alpha Partner");
    expect(html).toContain("Beta Partner");
    expect(html).not.toContain("Synthflow");
    expect(html).not.toContain("Onlim");
  });

  it("keeps tiered billing as unavailable revenue while preserving active and billable counts", () => {
    const overview = computePartnerOwnerOverview({
      partner: makePartnerRow({
        id: "partner-tiered",
        status: "active",
        billing_model: "tiered",
        price_per_customer_minor: 2400,
        currency: "EUR",
      }),
      customers: [
        makeCustomerRow({ id: "c1", is_active: true, is_billable: true }),
        makeCustomerRow({ id: "c2", is_active: true, is_billable: false }),
        makeCustomerRow({ id: "c3", is_active: false, is_billable: false }),
      ],
      events: [
        makeEventRow({ event_type: "activated", received_at: "2026-10-03T09:00:00.000Z" }),
      ],
      currentMonthStart: new Date("2026-10-01T00:00:00.000Z"),
      currentMonthEnd: new Date("2026-10-31T23:59:59.999Z"),
    });

    expect(overview.activeCustomers).toBe(2);
    expect(overview.billableCustomers).toBe(1);
    expect(overview.mrrMinor).toBeNull();
    expect(overview.arrMinor).toBeNull();

    const html = renderToStaticMarkup(
      <PartnerMeteringPanel
        market="de"
        data={{
          enabled: true,
          partners: [{
            partnerId: overview.partnerId,
            partnerKey: overview.partnerKey,
            name: overview.name,
            status: overview.status,
            billingModel: overview.billingModel,
            currency: overview.currency,
            pricePerCustomerMinor: overview.pricePerCustomerMinor,
            activeCustomers: overview.activeCustomers,
            billableCustomers: overview.billableCustomers,
            newThisMonth: overview.newThisMonth,
            reactivatedThisMonth: overview.reactivatedThisMonth,
            deactivatedThisMonth: overview.deactivatedThisMonth,
            netChangeThisMonth: overview.netChangeThisMonth,
            mrrMinor: overview.mrrMinor,
            arrMinor: overview.arrMinor,
          }],
          summary: {
            activePartners: 1,
            activeCustomers: 2,
            newThisMonth: 1,
            deactivatedThisMonth: 0,
            netChangeThisMonth: 1,
            billableCustomers: 1,
            mrrByCurrency: {},
          },
        }}
      />,
    );

    expect(html).toContain("—");
    expect(html).not.toContain("2400");
  });

  it("keeps paused and terminated partners visible with their original status data", () => {
    const pausedOverview = computePartnerOwnerOverview({
      partner: makePartnerRow({
        id: "partner-paused",
        partner_key: "paused-partner",
        name: "Paused Partner",
        status: "paused",
        billing_model: "per_customer",
        price_per_customer_minor: 500,
        currency: "EUR",
      }),
      customers: [
        makeCustomerRow({ id: "c1", is_active: true, is_billable: true }),
      ],
      events: [
        makeEventRow({ event_type: "deactivated", received_at: "2026-10-10T08:00:00.000Z" }),
      ],
      currentMonthStart: new Date("2026-10-01T00:00:00.000Z"),
      currentMonthEnd: new Date("2026-10-31T23:59:59.999Z"),
    });

    const terminatedOverview = computePartnerOwnerOverview({
      partner: makePartnerRow({
        id: "partner-terminated",
        partner_key: "terminated-partner",
        name: "Terminated Partner",
        status: "terminated",
        billing_model: "per_customer",
        price_per_customer_minor: 700,
        currency: "USD",
      }),
      customers: [
        makeCustomerRow({ id: "c2", is_active: false, is_billable: false }),
      ],
      events: [
        makeEventRow({ event_type: "deactivated", received_at: "2026-10-11T13:30:00.000Z" }),
      ],
      currentMonthStart: new Date("2026-10-01T00:00:00.000Z"),
      currentMonthEnd: new Date("2026-10-31T23:59:59.999Z"),
    });

    expect(pausedOverview.status).toBe("paused");
    expect(terminatedOverview.status).toBe("terminated");
    expect(pausedOverview.name).toBe("Paused Partner");
    expect(terminatedOverview.name).toBe("Terminated Partner");

    const html = renderToStaticMarkup(
      <PartnerMeteringPanel
        market="us"
        data={{
          enabled: true,
          partners: [pausedOverview, terminatedOverview],
          summary: {
            activePartners: 0,
            activeCustomers: 1,
            newThisMonth: 0,
            deactivatedThisMonth: 2,
            netChangeThisMonth: -2,
            billableCustomers: 1,
            mrrByCurrency: { EUR: 500 },
          },
        }}
      />,
    );

    expect(html).toContain("Paused Partner");
    expect(html).toContain("Terminated Partner");
    expect(html).toContain("Paused");
    expect(html).toContain("Terminated");
  });

  it("returns a safe empty error state without exposing raw partner query errors", async () => {
    mockedLoadServerEnv.mockReturnValue({
      partnerMeteringEnabled: true,
    } as never);

    const createSupabaseServiceRoleClient = (await import("@/shared/lib/supabase/server")).createSupabaseServiceRoleClient as ReturnType<typeof vi.fn>;
    const error = { message: "partner table missing" };
    const makeQueryResult = () => ({
      error,
      data: null,
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    });

    createSupabaseServiceRoleClient.mockReturnValue({
      from: vi.fn(() => makeQueryResult()),
    } as never);

    const result = await getOwnerPartnerMeteringOverview();

    expect(result).toEqual({
      enabled: true,
      partners: [],
      summary: EMPTY_PARTNER_METERING_SUMMARY,
      error: true,
    });
    expect(result).not.toHaveProperty("databaseError");
    expect(result).not.toHaveProperty("details");

    const html = renderToStaticMarkup(
      <PartnerMeteringPanel market="us" data={result} />,
    );

    expect(html).toContain("Partner data is unavailable.");
    expect(html).not.toContain("partner table missing");
  });

  it("leaves custom and flat billing as unavailable revenue", () => {
    const overview = computePartnerOwnerOverview({
      partner: makePartnerRow({ id: "partner-2", billing_model: "custom", price_per_customer_minor: null, currency: "USD" }),
      customers: [makeCustomerRow({ id: "c1", is_active: true, is_billable: true })],
      events: [],
      currentMonthStart: new Date("2026-10-01T00:00:00.000Z"),
      currentMonthEnd: new Date("2026-10-31T23:59:59.999Z"),
    });

    expect(overview.mrrMinor).toBeNull();
    expect(overview.arrMinor).toBeNull();
  });
});
