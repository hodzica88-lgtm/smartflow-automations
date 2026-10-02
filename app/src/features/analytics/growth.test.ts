import { describe, expect, it, vi } from "vitest";

import {
  appendGrowthSourceToHref,
  buildGrowthSummary,
  classifyRequestTraffic,
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
    expect(summary.visitors).toBe(0);
    expect(summary.unknownVisitors).toBe(1);
    expect(summary.totalVisits).toBe(1);
    expect(summary.demoOpened).toBe(1);
    expect(summary.trialsStarted).toBe(1);
    expect(summary.payingCustomers).toBe(1);
    expect(summary.sources.producthunt.unknownVisitors).toBe(1);
    expect(summary.sources.producthunt.trials).toBe(1);
    expect(summary.sources.producthunt.paid).toBe(1);
  });
});

describe("classifyRequestTraffic", () => {
  it("classifies common browsers and bots without storing raw user agents", () => {
    expect(classifyRequestTraffic({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36" })).toMatchObject({ trafficType: "human" });
    expect(classifyRequestTraffic({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15" })).toMatchObject({ trafficType: "human" });
    expect(classifyRequestTraffic({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" })).toMatchObject({ trafficType: "bot", botFamily: "googlebot" });
    expect(classifyRequestTraffic({ userAgent: "GPTBot/1.1 (+https://openai.com/gptbot)" })).toMatchObject({ trafficType: "bot", botFamily: "openai" });
    expect(classifyRequestTraffic({ userAgent: "ChatGPT-User" })).toMatchObject({ trafficType: "bot", botFamily: "openai" });
    expect(classifyRequestTraffic({ userAgent: "ClaudeBot/1.0" })).toMatchObject({ trafficType: "bot", botFamily: "anthropic" });
    expect(classifyRequestTraffic({ userAgent: "PerplexityBot/1.0" })).toMatchObject({ trafficType: "bot", botFamily: "perplexity" });
    expect(classifyRequestTraffic({ userAgent: "curl/8.0.1" })).toMatchObject({ trafficType: "bot", botFamily: "generic_bot" });
    expect(classifyRequestTraffic({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/124.0 Safari/537.36" })).toMatchObject({ trafficType: "bot", botFamily: "generic_bot" });
    expect(classifyRequestTraffic({ userAgent: "" })).toMatchObject({ trafficType: "unknown" });
    expect(classifyRequestTraffic({ userAgent: undefined })).toMatchObject({ trafficType: "unknown" });
  });

  it("never stores the raw User-Agent or IP in analytics metadata", () => {
    const result = classifyRequestTraffic({
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +https://www.google.com/bot.html)",
      ipAddress: "203.0.113.10",
    });

    expect(result.rawUserAgent).toBeUndefined();
    expect(result.rawIpAddress).toBeUndefined();
    expect(result.botFamily).toBe("googlebot");
  });
});

describe("buildGrowthSummary", () => {
  it("aggregates the V1 growth funnel and source breakdown while preserving legacy unknown traffic", () => {
    const summary = buildGrowthSummary([
      { event_name: "visitor", market: "de", metadata: { source: "producthunt", traffic_type: "human" } },
      { event_name: "visitor", market: "de", metadata: { source: "producthunt", traffic_type: "human" } },
      { event_name: "visitor", market: "us", metadata: { source: "g2", traffic_type: "bot", bot_family: "seo_crawler" } },
      { event_name: "visitor", market: "unknown", metadata: { source: "direct" } },
      { event_name: "demo_opened", metadata: { source: "producthunt", traffic_type: "human" } },
      { event_name: "trial_started", metadata: { source: "producthunt", traffic_type: "human" } },
      { event_name: "paid_customer", metadata: { source: "producthunt", traffic_type: "human" } },
      { event_name: "trial_started", metadata: { source: "g2", traffic_type: "human" } },
      { event_name: "paid_customer", metadata: { source: "g2", traffic_type: "human" } },
      { event_name: "trial_cancelled", metadata: { source: "g2", traffic_type: "human" } },
      { event_name: "subscription_cancelled", metadata: { source: "producthunt", traffic_type: "human" } },
    ] as Array<{ event_name: string; market?: "de" | "us" | "unknown"; metadata?: Record<string, unknown> }>);

    expect(summary.visitors).toBe(2);
    expect(summary.botVisitors).toBe(1);
    expect(summary.unknownVisitors).toBe(1);
    expect(summary.totalVisits).toBe(4);
    expect(summary.markets.de).toBe(2);
    expect(summary.markets.us).toBe(1);
    expect(summary.markets.unknown).toBe(1);
    expect(summary.demoOpened).toBe(1);
    expect(summary.trialsStarted).toBe(2);
    expect(summary.payingCustomers).toBe(2);
    expect(summary.trialCancellations).toBe(1);
    expect(summary.subscriptionCancellations).toBe(1);
    expect(summary.sources.producthunt.visitors).toBe(2);
    expect(summary.sources.producthunt.trials).toBe(1);
    expect(summary.sources.producthunt.paid).toBe(1);
    expect(summary.sources.g2.visitors).toBe(0);
    expect(summary.sources.g2.trials).toBe(1);
    expect(summary.sources.g2.paid).toBe(1);
    expect(summary.sources.g2.botVisitors).toBe(1);
  });

  it("uses market counts from event.market rather than the source mix", () => {
    const summary = buildGrowthSummary([
      { event_name: "visitor", market: "de", metadata: { source: "google", traffic_type: "human" } },
      { event_name: "visitor", market: "us", metadata: { source: "google", traffic_type: "human" } },
      { event_name: "visitor", market: "de", metadata: { source: "direct", traffic_type: "human" } },
      { event_name: "visitor", market: "unknown", metadata: { source: "producthunt", traffic_type: "human" } },
    ] as Array<{ event_name: string; market?: "de" | "us" | "unknown"; metadata?: Record<string, unknown> }>);

    expect(summary.markets.de).toBe(2);
    expect(summary.markets.us).toBe(1);
    expect(summary.markets.unknown).toBe(1);
    expect(summary.markets.de + summary.markets.us + summary.markets.unknown).toBe(summary.totalVisits);
    expect(summary.sources.google.visitors).toBe(2);
  });
});
