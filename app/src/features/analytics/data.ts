import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

const SUCCESSFUL_OUTCOME_LABELS: Record<string, string> = {
  appointment_scheduled: "Termin vereinbart",
  offer_created: "Angebot erstellt",
  job_won: "Auftrag erhalten",
  not_specified: "Ergebnis nicht angegeben",
};

const UNSUCCESSFUL_OUTCOME_LABELS: Record<string, string> = {
  price_comparison: "Preisvergleich",
  no_interest: "Kein Interesse",
  unreachable: "Nicht erreichbar",
  outside_service_area: "Außerhalb Einsatzgebiet",
  too_expensive: "Zu teuer",
  other: "Sonstiges",
  not_specified: "Grund nicht angegeben",
};

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceRoleClient>;

type AnalyticsLeadRow = {
  id: string;
  status: string;
  successful_outcome: string | null;
  unsuccessful_outcome: string | null;
  created_at: string;
};

type LeadHistoryRow = {
  id: string;
  lead_id: string;
  to_status: string;
  created_at: string;
};

export type AnalyticsPeriodMetrics = {
  total: number;
  successful: number;
  unsuccessful: number;
  open: number;
  completed: number;
  successRate: number | null;
  completionRate: number | null;
};

export type AnalyticsResponseMetrics = {
  measurableLeads: number;
  totalLeads: number;
  averageMinutes: number | null;
  medianMinutes: number | null;
  withinOneHour: number;
  withinOneDay: number;
};

export type AnalyticsTrendBucket = {
  label: string;
  startAt: string;
  endAt: string;
  total: number;
  successful: number;
  unsuccessful: number;
  open: number;
};

export type AnalyticsOutcome = {
  key: string;
  label: string;
  count: number;
};

export type CustomerAnalyticsData = {
  companyName: string;
  timezone: string;
  periodStart: string;
  periodEnd: string;
  previousPeriodStart: string;
  current: AnalyticsPeriodMetrics;
  previous: AnalyticsPeriodMetrics;
  response: AnalyticsResponseMetrics;
  previousResponse: AnalyticsResponseMetrics;
  trend: AnalyticsTrendBucket[];
  successfulOutcomes: AnalyticsOutcome[];
  unsuccessfulOutcomes: AnalyticsOutcome[];
};

const fetchLeadRows = async (
  supabase: SupabaseServiceClient,
  companyId: string,
  fromIso: string,
  toIso: string,
) => {
  const rows: AnalyticsLeadRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, status, successful_outcome, unsuccessful_outcome, created_at")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as AnalyticsLeadRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
};

const fetchHistoryRows = async (
  supabase: SupabaseServiceClient,
  companyId: string,
  fromIso: string,
  toIso: string,
) => {
  const rows: LeadHistoryRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("lead_status_history")
      .select("id, lead_id, to_status, created_at")
      .eq("company_id", companyId)
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as LeadHistoryRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
};

const readPeriodMetrics = (leads: AnalyticsLeadRow[]): AnalyticsPeriodMetrics => {
  const successful = leads.filter((lead) => lead.status === "successful").length;
  const unsuccessful = leads.filter((lead) => lead.status === "unsuccessful").length;
  const open = leads.filter(
    (lead) => lead.status === "new" || lead.status === "contacted",
  ).length;
  const completed = successful + unsuccessful;

  return {
    total: leads.length,
    successful,
    unsuccessful,
    open,
    completed,
    successRate: completed > 0 ? successful / completed : null,
    completionRate: leads.length > 0 ? completed / leads.length : null,
  };
};

const readResponseMetrics = (
  leads: AnalyticsLeadRow[],
  histories: LeadHistoryRow[],
): AnalyticsResponseMetrics => {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const firstResponseAt = new Map<string, number>();

  for (const history of histories) {
    if (history.to_status === "new" || firstResponseAt.has(history.lead_id)) {
      continue;
    }

    const lead = leadById.get(history.lead_id);
    if (!lead) {
      continue;
    }

    const leadCreatedAt = new Date(lead.created_at).getTime();
    const responseAt = new Date(history.created_at).getTime();

    if (!Number.isFinite(leadCreatedAt) || !Number.isFinite(responseAt) || responseAt < leadCreatedAt) {
      continue;
    }

    firstResponseAt.set(history.lead_id, responseAt);
  }

  const durations = leads
    .map((lead) => {
      const responseAt = firstResponseAt.get(lead.id);
      if (responseAt === undefined) {
        return null;
      }

      const leadCreatedAt = new Date(lead.created_at).getTime();
      return Math.max(0, Math.round((responseAt - leadCreatedAt) / 60000));
    })
    .filter((duration): duration is number => duration !== null)
    .sort((left, right) => left - right);

  if (durations.length === 0) {
    return {
      measurableLeads: 0,
      totalLeads: leads.length,
      averageMinutes: null,
      medianMinutes: null,
      withinOneHour: 0,
      withinOneDay: 0,
    };
  }

  const averageMinutes = Math.round(
    durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
  );
  const middle = Math.floor(durations.length / 2);
  const medianMinutes =
    durations.length % 2 === 0
      ? Math.round((durations[middle - 1] + durations[middle]) / 2)
      : durations[middle];

  return {
    measurableLeads: durations.length,
    totalLeads: leads.length,
    averageMinutes,
    medianMinutes,
    withinOneHour: durations.filter((duration) => duration <= 60).length,
    withinOneDay: durations.filter((duration) => duration <= 24 * 60).length,
  };
};

const formatBucketDate = (value: Date, timezone: string) => {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
    }).format(value);
  } catch {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Europe/Berlin",
    }).format(value);
  }
};

const buildTrend = (
  leads: AnalyticsLeadRow[],
  periodStart: Date,
  periodEnd: Date,
  timezone: string,
): AnalyticsTrendBucket[] =>
  Array.from({ length: 6 }, (_, index) => {
    const bucketStart = new Date(periodStart.getTime() + index * 5 * DAY_MS);
    const bucketEnd =
      index === 5
        ? periodEnd
        : new Date(Math.min(periodEnd.getTime(), bucketStart.getTime() + 5 * DAY_MS));
    const bucketLeads = leads.filter((lead) => {
      const createdAt = new Date(lead.created_at).getTime();
      return createdAt >= bucketStart.getTime() && createdAt < bucketEnd.getTime();
    });
    const metrics = readPeriodMetrics(bucketLeads);
    const inclusiveEnd = new Date(Math.max(bucketStart.getTime(), bucketEnd.getTime() - 1));

    return {
      label: `${formatBucketDate(bucketStart, timezone)}–${formatBucketDate(inclusiveEnd, timezone)}`,
      startAt: bucketStart.toISOString(),
      endAt: bucketEnd.toISOString(),
      total: metrics.total,
      successful: metrics.successful,
      unsuccessful: metrics.unsuccessful,
      open: metrics.open,
    };
  });

const readOutcomeBreakdown = (
  leads: AnalyticsLeadRow[],
  status: "successful" | "unsuccessful",
): AnalyticsOutcome[] => {
  const labels =
    status === "successful" ? SUCCESSFUL_OUTCOME_LABELS : UNSUCCESSFUL_OUTCOME_LABELS;
  const counts = new Map<string, number>();

  for (const lead of leads) {
    if (lead.status !== status) {
      continue;
    }

    const rawOutcome =
      status === "successful" ? lead.successful_outcome : lead.unsuccessful_outcome;
    const outcome = rawOutcome ?? "not_specified";
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: labels[key] ?? key,
      count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "de"));
};

export const getCustomerAnalyticsData = async (
  companyId: string,
): Promise<CustomerAnalyticsData> => {
  const supabase = createSupabaseServiceRoleClient();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * DAY_MS);
  const previousPeriodStart = new Date(periodEnd.getTime() - 60 * DAY_MS);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("name, timezone")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  if (!company) {
    throw new Error("Unternehmen nicht gefunden.");
  }

  const [leads, histories] = await Promise.all([
    fetchLeadRows(
      supabase,
      companyId,
      previousPeriodStart.toISOString(),
      periodEnd.toISOString(),
    ),
    fetchHistoryRows(
      supabase,
      companyId,
      previousPeriodStart.toISOString(),
      periodEnd.toISOString(),
    ),
  ]);

  const currentLeads = leads.filter(
    (lead) => new Date(lead.created_at).getTime() >= periodStart.getTime(),
  );
  const previousLeads = leads.filter(
    (lead) => new Date(lead.created_at).getTime() < periodStart.getTime(),
  );
  const currentLeadIds = new Set(currentLeads.map((lead) => lead.id));
  const previousLeadIds = new Set(previousLeads.map((lead) => lead.id));
  const currentHistories = histories.filter((history) => currentLeadIds.has(history.lead_id));
  const previousHistories = histories.filter((history) => previousLeadIds.has(history.lead_id));
  const timezone = company.timezone || "Europe/Berlin";

  return {
    companyName: company.name,
    timezone,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    previousPeriodStart: previousPeriodStart.toISOString(),
    current: readPeriodMetrics(currentLeads),
    previous: readPeriodMetrics(previousLeads),
    response: readResponseMetrics(currentLeads, currentHistories),
    previousResponse: readResponseMetrics(previousLeads, previousHistories),
    trend: buildTrend(currentLeads, periodStart, periodEnd, timezone),
    successfulOutcomes: readOutcomeBreakdown(currentLeads, "successful"),
    unsuccessfulOutcomes: readOutcomeBreakdown(currentLeads, "unsuccessful"),
  };
};
