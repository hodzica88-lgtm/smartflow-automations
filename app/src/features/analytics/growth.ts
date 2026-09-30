import { trackAnalyticsEvent, type AnalyticsEventName } from "@/features/analytics/events";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const GROWTH_SOURCES = [
  "producthunt",
  "g2",
  "saasworthy",
  "sourceforge",
  "google",
  "direct",
  "other",
] as const;

export type GrowthSource = (typeof GROWTH_SOURCES)[number];

export type GrowthEventName =
  | "visitor"
  | "demo_opened"
  | "trial_started"
  | "trial_cancelled"
  | "paid_customer"
  | "subscription_cancelled";

export type GrowthSummarySource = {
  visitors: number;
  demos: number;
  trials: number;
  paid: number;
  trialCancellations: number;
  subscriptionCancellations: number;
};

export type GrowthSummary = {
  visitors: number;
  demoOpened: number;
  trialsStarted: number;
  payingCustomers: number;
  trialCancellations: number;
  subscriptionCancellations: number;
  sources: Record<GrowthSource, GrowthSummarySource>;
};

type GrowthEventRow = {
  event_name?: string | null;
  metadata?: Record<string, unknown> | null;
  occurred_at?: string | null;
  company_id?: string | null;
  market?: "de" | "us" | "unknown" | null;
};

export const GROWTH_ANALYTICS_V1_START_AT = "2026-09-30T00:26:30.000Z";

const parseIsoDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getMonthKeyInBerlin = (date = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}` : "2026-09";
};

export const getGrowthMonthRange = (monthKey: string): {
  monthKey: string;
  start: string;
  end: string;
  previousMonthKey: string | null;
} => {
  const match = /^([0-9]{4})-([0-9]{2})$/.exec(monthKey);

  if (!match) {
    const fallbackMonth = getMonthKeyInBerlin(new Date(GROWTH_ANALYTICS_V1_START_AT));
    return getGrowthMonthRange(fallbackMonth);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));

  const previousMonth = new Date(Date.UTC(year, monthIndex - 2, 1, 0, 0, 0));
  const previousKey = `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}`;

  return {
    monthKey,
    start: start.toISOString(),
    end: end.toISOString(),
    previousMonthKey: previousMonth.getTime() >= new Date(GROWTH_ANALYTICS_V1_START_AT).getTime() ? previousKey : null,
  };
};

export const getGrowthMonthOptions = () => {
  const baselineMonth = getMonthKeyInBerlin(new Date(GROWTH_ANALYTICS_V1_START_AT));
  const currentMonth = getMonthKeyInBerlin();
  const months: string[] = [];
  const [currentYear, currentMonthIndex] = currentMonth.split("-").map(Number);
  const [baselineYear, baselineMonthIndex] = baselineMonth.split("-").map(Number);

  let year = baselineYear;
  let monthIndex = baselineMonthIndex;

  while (year < currentYear || (year === currentYear && monthIndex <= currentMonthIndex)) {
    months.push(`${year}-${String(monthIndex).padStart(2, "0")}`);
    monthIndex += 1;

    if (monthIndex > 12) {
      monthIndex = 1;
      year += 1;
    }
  }

  if (months.length === 0) {
    months.push(baselineMonth);
  }

  return months;
};

export const isGrowthEventWithinRange = (
  event: GrowthEventRow,
  range?: { startAt?: string; endAt?: string },
) => {
  const occurredAt = parseIsoDate(event.occurred_at ?? null);
  const startAt = range?.startAt ? parseIsoDate(range.startAt) : null;
  const endAt = range?.endAt ? parseIsoDate(range.endAt) : null;

  if (startAt && occurredAt && occurredAt.getTime() < startAt.getTime()) {
    return false;
  }

  if (endAt && occurredAt && occurredAt.getTime() >= endAt.getTime()) {
    return false;
  }

  return true;
};

type ResolveGrowthSourceInput = {
  searchParams?: Record<string, string | string[] | undefined>;
  referrer?: string | null;
  source?: string | null;
};

const SOURCE_RULES: Array<[RegExp, GrowthSource]> = [
  [/producthunt/i, "producthunt"],
  [/g2/i, "g2"],
  [/saasworthy/i, "saasworthy"],
  [/sourceforge/i, "sourceforge"],
  [/google|search/i, "google"],
];

const normalizeReferrerHost = (value: string) => {
  const cleaned = value.trim();

  if (!cleaned) {
    return "";
  }

  try {
    const url = new URL(cleaned);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return cleaned
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[0]
      .toLowerCase();
  }
};

export const normalizeGrowthSource = (value?: string | null): GrowthSource => {
  const source = String(value ?? "").trim().toLowerCase();

  if (!source || source === "direct" || source === "(direct)" || source === "none") {
    return "direct";
  }

  const normalized = normalizeReferrerHost(source);

  for (const [matcher, grownSource] of SOURCE_RULES) {
    if (matcher.test(normalized) || matcher.test(source)) {
      return grownSource;
    }
  }

  return "other";
};

const firstNonEmptySource = (
  ...values: Array<string | string[] | undefined | null>
): string | null => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === "string" && entry.trim().length > 0);
      if (first) {
        return first.trim();
      }
      continue;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

export const resolveGrowthSourceFromRequest = async ({
  searchParams,
  referrer,
  source,
}: ResolveGrowthSourceInput = {}): Promise<GrowthSource> => {
  const directSource = firstNonEmptySource(
    source,
    searchParams?.utm_source,
    searchParams?.utm_source ?? searchParams?.source,
    searchParams?.ref,
    searchParams?.referrer,
  );

  if (directSource) {
    return normalizeGrowthSource(directSource);
  }

  if (referrer) {
    const hostname = normalizeReferrerHost(referrer);
    if (hostname) {
      return normalizeGrowthSource(hostname);
    }
  }

  return "direct";
};

export const appendGrowthSourceToHref = (href: string, source?: string | null): string => {
  const normalizedSource = normalizeGrowthSource(source ?? null);
  const url = new URL(href, "https://varnito.local");
  const params = new URLSearchParams(url.search);

  params.set("source", normalizedSource);
  params.set("utm_source", normalizedSource);

  url.search = params.toString();

  return `${url.pathname}${url.search}`;
};

const createSourceSummary = (): Record<GrowthSource, GrowthSummarySource> => ({
  producthunt: { visitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  g2: { visitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  saasworthy: { visitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  sourceforge: { visitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  google: { visitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  direct: { visitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  other: { visitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
});

export const buildGrowthSummary = (
  events: GrowthEventRow[],
  range?: { startAt?: string; endAt?: string },
): GrowthSummary => {
  const summary: GrowthSummary = {
    visitors: 0,
    demoOpened: 0,
    trialsStarted: 0,
    payingCustomers: 0,
    trialCancellations: 0,
    subscriptionCancellations: 0,
    sources: createSourceSummary(),
  };

  for (const event of events) {
    if (!isGrowthEventWithinRange(event, {
      startAt: range?.startAt ?? GROWTH_ANALYTICS_V1_START_AT,
      endAt: range?.endAt,
    })) {
      continue;
    }

    const eventName = String(event.event_name ?? "").trim();
    const source = normalizeGrowthSource(
      typeof event.metadata?.source === "string" ? event.metadata.source : undefined,
    );
    const sourceSummary = summary.sources[source];

    if (eventName === "visitor" || eventName === "landing_view") {
      summary.visitors += 1;
      sourceSummary.visitors += 1;
      continue;
    }

    if (eventName === "demo_opened" || eventName === "demo_entry") {
      summary.demoOpened += 1;
      sourceSummary.demos += 1;
      continue;
    }

    if (eventName === "trial_started") {
      summary.trialsStarted += 1;
      sourceSummary.trials += 1;
      continue;
    }

    if (eventName === "trial_cancelled") {
      summary.trialCancellations += 1;
      sourceSummary.trialCancellations += 1;
      continue;
    }

    if (eventName === "paid_customer") {
      summary.payingCustomers += 1;
      sourceSummary.paid += 1;
      continue;
    }

    if (eventName === "subscription_cancelled") {
      summary.subscriptionCancellations += 1;
      sourceSummary.subscriptionCancellations += 1;
    }
  }

  return summary;
};

export const resolveCompanyGrowthSource = async (
  companyId?: string | null,
): Promise<GrowthSource> => {
  if (!companyId) {
    return "direct";
  }

  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_name, metadata")
    .eq("company_id", companyId)
    .order("occurred_at", { ascending: true })
    .limit(80);

  if (error || !data) {
    return "direct";
  }

  let firstTouchSource: GrowthSource | null = null;

  for (const row of data) {
    const metadata = row.metadata as Record<string, unknown> | null | undefined;
    const sourceValue = typeof metadata?.source === "string" ? metadata.source : null;

    if (!sourceValue) {
      continue;
    }

    if (row.event_name === "acquisition_attributed") {
      return normalizeGrowthSource(sourceValue);
    }

    if (!firstTouchSource) {
      firstTouchSource = normalizeGrowthSource(sourceValue);
    }
  }

  return firstTouchSource ?? "direct";
};

type TrackGrowthEventInput = {
  eventName: GrowthEventName;
  market?: "de" | "us" | "unknown";
  companyId?: string | null;
  isAuthenticated?: boolean;
  source?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
  referrer?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export const trackGrowthEvent = async ({
  eventName,
  market,
  companyId,
  isAuthenticated,
  source,
  searchParams,
  referrer,
  metadata,
}: TrackGrowthEventInput) => {
  const resolvedSource = await resolveGrowthSourceFromRequest({
    searchParams,
    referrer,
    source,
  });

  const payload = {
    ...(metadata ?? {}),
    source: resolvedSource,
  };

  trackAnalyticsEvent({
    eventName: eventName as AnalyticsEventName,
    market: market ?? "unknown",
    companyId: companyId ?? null,
    isAuthenticated: isAuthenticated ?? false,
    metadata: payload,
  });
};
