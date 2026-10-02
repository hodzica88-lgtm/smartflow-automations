import { trackAnalyticsEvent, type AnalyticsEventName } from "@/features/analytics/events";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const GROWTH_SOURCES = [
  "producthunt",
  "g2",
  "saasworthy",
  "sourceforge",
  "google",
  "capterra",
  "getapp",
  "softwareadvice",
  "bing",
  "duckduckgo",
  "yahoo",
  "linkedin",
  "reddit",
  "x",
  "facebook",
  "instagram",
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

export type GrowthTrafficType = "human" | "bot" | "unknown";
export type GrowthBotFamily =
  | "googlebot"
  | "bingbot"
  | "openai"
  | "anthropic"
  | "perplexity"
  | "seo_crawler"
  | "social_preview"
  | "generic_bot";

export type GrowthSummarySource = {
  visitors: number;
  botVisitors: number;
  unknownVisitors: number;
  demos: number;
  trials: number;
  paid: number;
  trialCancellations: number;
  subscriptionCancellations: number;
};

export type GrowthSummary = {
  visitors: number;
  botVisitors: number;
  unknownVisitors: number;
  totalVisits: number;
  markets: {
    de: number;
    us: number;
    unknown: number;
  };
  otherBreakdown: Record<string, number>;
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

export type RequestTrafficClassification = {
  trafficType: GrowthTrafficType;
  botFamily: GrowthBotFamily | null;
  rawUserAgent?: undefined;
  rawIpAddress?: undefined;
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
  [/^(?:producthunt|(?:www\.)?producthunt\.com)$/i, "producthunt"],
  [/^(?:g2|(?:www\.)?g2\.com)$/i, "g2"],
  [/^(?:saasworthy|(?:www\.)?saasworthy(?:\.[a-z]{2,10})?)$/i, "saasworthy"],
  [/^(?:sourceforge|(?:www\.)?sourceforge(?:\.net|\.[a-z]{2,10})?)$/i, "sourceforge"],
  [/^(?:google|google_ads|google_adwords|(?:www\.)?google(?:\.[a-z]{2,10})?)$/i, "google"],
  [/^(?:capterra|(?:www\.)?capterra(?:\.[a-z]{2,10})?)$/i, "capterra"],
  [/^(?:getapp|(?:www\.)?getapp(?:\.[a-z]{2,10})?)$/i, "getapp"],
  [/^(?:softwareadvice|(?:www\.)?softwareadvice(?:\.[a-z]{2,10})?)$/i, "softwareadvice"],
  [/^(?:bing|(?:www\.)?bing(?:\.[a-z]{2,10})?)$/i, "bing"],
  [/^(?:duckduckgo|(?:www\.)?duckduckgo(?:\.[a-z]{2,10})?)$/i, "duckduckgo"],
  [/^(?:yahoo|(?:search\.)?yahoo(?:\.[a-z]{2,10})?)$/i, "yahoo"],
  [/^(?:linkedin|lnkd\.in|(?:www\.)?linkedin\.com)$/i, "linkedin"],
  [/^(?:reddit|(?:www\.)?(?:old\.|new\.)?reddit\.com)$/i, "reddit"],
  [/^(?:x|twitter|(?:www\.)?(?:x|twitter)\.com|t\.co)$/i, "x"],
  [/^(?:facebook|(?:[a-z0-9-]+\.)?facebook\.com)$/i, "facebook"],
  [/^(?:instagram|(?:[a-z0-9-]+\.)?instagram\.com)$/i, "instagram"],
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

const normalizeMarket = (value?: string | null): "de" | "us" | "unknown" => {
  if (value === "de" || value === "us") {
    return value;
  }

  return "unknown";
};

const readTrafficTypeFromMetadata = (metadata?: Record<string, unknown> | null): GrowthTrafficType => {
  const value = typeof metadata?.traffic_type === "string" ? metadata.traffic_type.toLowerCase() : "";

  if (value === "human" || value === "browser") {
    return "human";
  }

  if (value === "bot" || value === "crawler") {
    return "bot";
  }

  if (value === "unknown" || value === "unclassified") {
    return "unknown";
  }

  return "unknown";
};

const normalizeOtherBreakdownKey = (value?: string | null): string | null => {
  const host = normalizeReferrerHost(value ?? "");

  if (!host || host === "direct" || host === "localhost" || host === "other") {
    return null;
  }

  const selfReferrerHosts = new Set([
    "varnito.com",
    "www.varnito.com",
    "varnito.de",
    "www.varnito.de",
  ]);

  if (selfReferrerHosts.has(host)) {
    return null;
  }

  if (normalizeGrowthSource(host) !== "other") {
    return null;
  }

  return host;
};

const BOT_PATTERNS: Array<[RegExp, GrowthBotFamily]> = [
  [/googlebot/i, "googlebot"],
  [/bingbot/i, "bingbot"],
  [/gptbot/i, "openai"],
  [/chatgpt-user/i, "openai"],
  [/claudebot/i, "anthropic"],
  [/claude-web/i, "anthropic"],
  [/perplexitybot/i, "perplexity"],
  [/bytespider/i, "generic_bot"],
  [/ahrefsbot/i, "seo_crawler"],
  [/semrushbot/i, "seo_crawler"],
  [/mj12bot/i, "seo_crawler"],
  [/dotbot/i, "seo_crawler"],
  [/petalbot/i, "seo_crawler"],
  [/facebookexternalhit/i, "social_preview"],
  [/twitterbot/i, "social_preview"],
  [/linkedinbot/i, "social_preview"],
  [/slackbot/i, "social_preview"],
  [/discordbot/i, "social_preview"],
  [/whatsapp/i, "social_preview"],
  [/duckduckbot/i, "seo_crawler"],
  [/yandexbot/i, "seo_crawler"],
  [/baiduspider/i, "seo_crawler"],
  [/oai-searchbot/i, "openai"],
  [/curl\//i, "generic_bot"],
  [/wget\//i, "generic_bot"],
  [/headlesschrome/i, "generic_bot"],
  [/headlessbrowser/i, "generic_bot"],
  [/bot\b|crawler\b|spider\b|preview\b/i, "generic_bot"],
];

export const classifyRequestTraffic = ({
  userAgent,
  ipAddress,
}: {
  userAgent?: string | null;
  ipAddress?: string | null;
} = {}): RequestTrafficClassification => {
  const normalizedUserAgent = (userAgent ?? "").trim();

  if (!normalizedUserAgent) {
    return {
      trafficType: "unknown",
      botFamily: null,
      rawUserAgent: undefined,
      rawIpAddress: undefined,
    };
  }

  const loweredUserAgent = normalizedUserAgent.toLowerCase();

  for (const [pattern, botFamily] of BOT_PATTERNS) {
    if (pattern.test(loweredUserAgent)) {
      return {
        trafficType: "bot",
        botFamily,
        rawUserAgent: undefined,
        rawIpAddress: undefined,
      };
    }
  }

  if (/mozilla\//i.test(loweredUserAgent) || /applewebkit\//i.test(loweredUserAgent) || /chrome\//i.test(loweredUserAgent) || /safari\//i.test(loweredUserAgent) || /firefox\//i.test(loweredUserAgent)) {
    return {
      trafficType: "human",
      botFamily: null,
      rawUserAgent: undefined,
      rawIpAddress: undefined,
    };
  }

  if (typeof ipAddress === "string" && ipAddress.trim().length > 0 && /\d+\.\d+\.\d+\.\d+/.test(ipAddress)) {
    return {
      trafficType: "unknown",
      botFamily: null,
      rawUserAgent: undefined,
      rawIpAddress: undefined,
    };
  }

  return {
    trafficType: "unknown",
    botFamily: null,
    rawUserAgent: undefined,
    rawIpAddress: undefined,
  };
};

export const normalizeGrowthSource = (value?: string | null): GrowthSource => {
  const source = String(value ?? "").trim().toLowerCase();

  if (!source || source === "direct" || source === "(direct)" || source === "none") {
    return "direct";
  }

  const normalized = normalizeReferrerHost(source);
  if (normalized === "varnito.com" || normalized === "www.varnito.com" || normalized === "varnito.de" || normalized === "www.varnito.de") {
    return "direct";
  }

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
  producthunt: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  g2: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  saasworthy: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  sourceforge: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  google: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  capterra: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  getapp: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  softwareadvice: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  bing: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  duckduckgo: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  yahoo: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  linkedin: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  reddit: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  x: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  facebook: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  instagram: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  direct: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
  other: { visitors: 0, botVisitors: 0, unknownVisitors: 0, demos: 0, trials: 0, paid: 0, trialCancellations: 0, subscriptionCancellations: 0 },
});

const resolveEventGrowthSource = (source?: string | null, sourceDetail?: string | null): GrowthSource => {
  const normalizedSource = normalizeGrowthSource(source ?? null);

  if (normalizedSource !== "other") {
    return normalizedSource;
  }

  const normalizedDetail = sourceDetail ? normalizeGrowthSource(sourceDetail) : "other";
  return normalizedDetail === "other" ? "other" : normalizedDetail;
};

export const buildGrowthSummary = (
  events: GrowthEventRow[],
  range?: { startAt?: string; endAt?: string },
): GrowthSummary => {
  const summary: GrowthSummary = {
    visitors: 0,
    botVisitors: 0,
    unknownVisitors: 0,
    totalVisits: 0,
    markets: {
      de: 0,
      us: 0,
      unknown: 0,
    },
    otherBreakdown: {},
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
    const sourceDetail = typeof event.metadata?.source_detail === "string"
      ? event.metadata.source_detail
      : typeof event.metadata?.referrer_host === "string"
        ? event.metadata.referrer_host
        : undefined;
    const source = resolveEventGrowthSource(
      typeof event.metadata?.source === "string" ? event.metadata.source : undefined,
      sourceDetail,
    );
    const sourceSummary = summary.sources[source];

    if (eventName === "visitor" || eventName === "landing_view") {
      const trafficType = readTrafficTypeFromMetadata(event.metadata);
      const market = normalizeMarket(event.market ?? "unknown");
      summary.markets[market] += 1;
      summary.totalVisits += 1;

      if (trafficType === "human") {
        summary.visitors += 1;
        sourceSummary.visitors += 1;
      } else if (trafficType === "bot") {
        summary.botVisitors += 1;
        sourceSummary.botVisitors += 1;
      } else {
        summary.unknownVisitors += 1;
        sourceSummary.unknownVisitors += 1;
      }

      if (source === "other") {
        const otherKey = normalizeOtherBreakdownKey(
          typeof event.metadata?.source_detail === "string"
            ? event.metadata.source_detail
            : typeof event.metadata?.referrer_host === "string"
              ? event.metadata.referrer_host
              : typeof event.metadata?.source === "string"
                ? event.metadata.source
                : undefined,
        );

        if (otherKey) {
          summary.otherBreakdown[otherKey] = (summary.otherBreakdown[otherKey] ?? 0) + 1;
        }
      }

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
    const sourceDetailValue = typeof metadata?.source_detail === "string"
      ? metadata.source_detail
      : typeof metadata?.referrer_host === "string"
        ? metadata.referrer_host
        : null;

    if (!sourceValue) {
      continue;
    }

    if (row.event_name === "acquisition_attributed") {
      return resolveEventGrowthSource(sourceValue, sourceDetailValue);
    }

    if (!firstTouchSource) {
      firstTouchSource = resolveEventGrowthSource(sourceValue, sourceDetailValue);
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
  userAgent?: string | null;
  ipAddress?: string | null;
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
  userAgent,
  ipAddress,
  metadata,
}: TrackGrowthEventInput) => {
  const resolvedSource = await resolveGrowthSourceFromRequest({
    searchParams,
    referrer,
    source,
  });

  const trafficClassification = classifyRequestTraffic({
    userAgent,
    ipAddress,
  });

  const sourceDetail = resolvedSource === "other"
    ? normalizeOtherBreakdownKey(referrer ?? (typeof metadata?.source_detail === "string" ? metadata.source_detail : null))
    : null;

  const payload: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (value !== undefined) {
      payload[key] = value as string | number | boolean | null;
    }
  }

  payload.source = resolvedSource;

  if (sourceDetail) {
    payload.source_detail = sourceDetail;
  }

  payload.traffic_type = trafficClassification.trafficType;

  if (trafficClassification.botFamily) {
    payload.bot_family = trafficClassification.botFamily;
  }

  trackAnalyticsEvent({
    eventName: eventName as AnalyticsEventName,
    market: market ?? "unknown",
    companyId: companyId ?? null,
    isAuthenticated: isAuthenticated ?? false,
    metadata: payload,
  });
};
