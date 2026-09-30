import { describe, expect, it, vi } from "vitest";

import {
  appendGrowthSourceToHref,
  buildGrowthSummary,
  normalizeGrowthSource,
  resolveCompanyGrowthSource,
  resolveGrowthSourceFromRequest,
} from "./growth";

const mockCompanyRows = vi.hoisted(() => ({
  rows: [] as Array<{ event_name?: string | null; metadata?: Record<string, unknown> | null }>,
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: mockCompanyRows.rows, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

describe("normalizeGrowthSource", () => {
  it("normalizes the supported acquisition sources", () => {
    expect(normalizeGrowthSource("ProductHunt")).toBe("producthunt");
    expect(normalizeGrowthSource("g2")).toBe("g2");
    expect(normalizeGrowthSource("saasworthy")).toBe("saasworthy");
    expect(normalizeGrowthSource("sourceforge.net")).toBe("sourceforge");
    expect(normalizeGrowthSource("Google")).toBe("google");
    expect(normalizeGrowthSource("direct")).toBe("direct");
    expect(normalizeGrowthSource("linkedin")).toBe("other");
  });
});

describe("resolveGrowthSourceFromRequest", () => {
  it("prefers utm_source, then external referrer, then direct", async () => {
    await expect(
      resolveGrowthSourceFromRequest({
        searchParams: { utm_source: "producthunt" },
        referrer: "https://www.google.com/search?q=varnito",
      }),
    ).resolves.toBe("producthunt");

    await expect(
      resolveGrowthSourceFromRequest({
        searchParams: {},
        referrer: "https://www.g2.com/categories/lead-ops",
      }),
    ).resolves.toBe("g2");

    await expect(
      resolveGrowthSourceFromRequest({
        searchParams: {},
        referrer: undefined,
      }),
    ).resolves.toBe("direct");
  });
});

describe("appendGrowthSourceToHref", () => {
  it("preserves the normalized first-touch source in CTA links", () => {
    expect(appendGrowthSourceToHref("/registrierung", "producthunt")).toBe("/registrierung?source=producthunt&utm_source=producthunt");
    expect(appendGrowthSourceToHref("/demo?foo=bar", "g2")).toBe("/demo?foo=bar&source=g2&utm_source=g2");
  });
});

describe("resolveCompanyGrowthSource", () => {
  it("prefers acquisition_attributed over later direct visits", async () => {
    mockCompanyRows.rows = [
      { event_name: "visitor", metadata: { source: "direct" } },
      { event_name: "acquisition_attributed", metadata: { source: "producthunt" } },
      { event_name: "visitor", metadata: { source: "direct" } },
    ];

    await expect(resolveCompanyGrowthSource("company_123")).resolves.toBe("producthunt");
  });

  it("keeps Product Hunt attribution through onboarding and Stripe lifecycle events", async () => {
    mockCompanyRows.rows = [
      { event_name: "visitor", metadata: { source: "producthunt" } },
      { event_name: "demo_opened", metadata: { source: "producthunt" } },
      { event_name: "acquisition_attributed", metadata: { source: "producthunt" } },
      { event_name: "trial_started", metadata: { source: "producthunt" } },
      { event_name: "paid_customer", metadata: { source: "producthunt" } },
    ];

    await expect(resolveGrowthSourceFromRequest({ searchParams: { utm_source: "producthunt" } })).resolves.toBe("producthunt");
    expect(appendGrowthSourceToHref("/registrierung", "producthunt")).toBe("/registrierung?source=producthunt&utm_source=producthunt");
    await expect(resolveCompanyGrowthSource("company_123")).resolves.toBe("producthunt");

    const summary = buildGrowthSummary(mockCompanyRows.rows);
    expect(summary.visitors).toBe(1);
    expect(summary.demoOpened).toBe(1);
    expect(summary.trialsStarted).toBe(1);
    expect(summary.payingCustomers).toBe(1);
    expect(summary.sources.producthunt.visitors).toBe(1);
    expect(summary.sources.producthunt.trials).toBe(1);
    expect(summary.sources.producthunt.paid).toBe(1);
  });
});

describe("buildGrowthSummary", () => {
  it("aggregates the V1 growth funnel and source breakdown", () => {
    const summary = buildGrowthSummary([
      { event_name: "visitor", metadata: { source: "producthunt" } },
      { event_name: "visitor", metadata: { source: "producthunt" } },
      { event_name: "visitor", metadata: { source: "g2" } },
      { event_name: "demo_opened", metadata: { source: "producthunt" } },
      { event_name: "trial_started", metadata: { source: "producthunt" } },
      { event_name: "paid_customer", metadata: { source: "producthunt" } },
      { event_name: "trial_started", metadata: { source: "g2" } },
      { event_name: "paid_customer", metadata: { source: "g2" } },
      { event_name: "trial_cancelled", metadata: { source: "g2" } },
      { event_name: "subscription_cancelled", metadata: { source: "producthunt" } },
    ] as Array<{ event_name: string; metadata?: Record<string, unknown> }>);

    expect(summary.visitors).toBe(3);
    expect(summary.demoOpened).toBe(1);
    expect(summary.trialsStarted).toBe(2);
    expect(summary.payingCustomers).toBe(2);
    expect(summary.trialCancellations).toBe(1);
    expect(summary.subscriptionCancellations).toBe(1);
    expect(summary.sources.producthunt.visitors).toBe(2);
    expect(summary.sources.producthunt.trials).toBe(1);
    expect(summary.sources.producthunt.paid).toBe(1);
    expect(summary.sources.g2.visitors).toBe(1);
    expect(summary.sources.g2.trials).toBe(1);
    expect(summary.sources.g2.paid).toBe(1);
  });
});
