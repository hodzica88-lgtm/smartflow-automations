import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type OperatorCompany = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  deletedAt: string | null;
  userCount: number;
  leadCount: number;
  lastLeadAt: string | null;
  failedNotifications7d: number;
  dueNotifications: number;
  staleProcessingNotifications: number;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
};

export type OperatorDashboardData = {
  metrics: {
    activeCompanies: number;
    totalUsers: number;
    leadsLast30d: number;
    failedNotifications24h: number;
    dueNotifications: number;
    staleProcessingNotifications: number;
    companiesNeedingAttention: number;
  };
  companies: OperatorCompany[];
};

type CountResult = {
  count: number | null;
  error: Error | null;
};

type RawCompanyOverview = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  deleted_at: string | null;
  user_count: number | string | null;
  lead_count: number | string | null;
  last_lead_at: string | null;
  failed_notifications_7d: number | string | null;
  due_notifications: number | string | null;
  stale_processing_notifications: number | string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

const readCount = async (query: PromiseLike<CountResult>) => {
  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
};

const toNumber = (value: number | string | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getOperatorDashboardData = async (): Promise<OperatorDashboardData> => {
  const supabase = createSupabaseServiceRoleClient();
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const staleBefore = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const [
    companyOverviewResult,
    activeCompanies,
    totalUsers,
    leadsLast30d,
    failedNotifications24h,
    dueNotifications,
    staleProcessingNotifications,
  ] = await Promise.all([
    supabase
      .from("operator_company_overview")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    readCount(
      supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
    ),
    readCount(supabase.from("users").select("id", { count: "exact", head: true })),
    readCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("created_at", last30Days),
    ),
    readCount(
      supabase
        .from("notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("updated_at", last24Hours),
    ),
    readCount(
      supabase
        .from("notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("scheduled_for", nowIso),
    ),
    readCount(
      supabase
        .from("notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .lte("processing_started_at", staleBefore),
    ),
  ]);

  if (companyOverviewResult.error) {
    throw companyOverviewResult.error;
  }

  const companies = ((companyOverviewResult.data ?? []) as RawCompanyOverview[]).map(
    (company): OperatorCompany => ({
      id: company.id,
      name: company.name,
      email: company.email,
      createdAt: company.created_at,
      deletedAt: company.deleted_at,
      userCount: toNumber(company.user_count),
      leadCount: toNumber(company.lead_count),
      lastLeadAt: company.last_lead_at,
      failedNotifications7d: toNumber(company.failed_notifications_7d),
      dueNotifications: toNumber(company.due_notifications),
      staleProcessingNotifications: toNumber(company.stale_processing_notifications),
      subscriptionPlan: company.subscription_plan,
      subscriptionStatus: company.subscription_status,
      currentPeriodEnd: company.current_period_end,
    }),
  );

  const companiesNeedingAttention = companies.filter(
    (company) =>
      company.deletedAt === null &&
      (company.failedNotifications7d > 0 || company.staleProcessingNotifications > 0),
  ).length;

  return {
    metrics: {
      activeCompanies,
      totalUsers,
      leadsLast30d,
      failedNotifications24h,
      dueNotifications,
      staleProcessingNotifications,
      companiesNeedingAttention,
    },
    companies,
  };
};
