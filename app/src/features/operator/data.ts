import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type OperatorCompany = {
  id: string;
  name: string;
  email: string;
  market?: "de" | "us" | "unknown";
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
  trialEndsAt?: string | null;
  estimatedMrr?: number;
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
    analytics: {
      eventsLast7d: {
        de: number;
        us: number;
        total: number;
      };
      eventsLast30d: {
        de: number;
        us: number;
        total: number;
      };
      checkoutStartsLast30d: number;
      publicLeadsLast30d: number;
      exportsLast30d: number;
    };
    owner: {
      activeSubscriptions: number;
      trialingSubscriptions: number;
      paymentRiskSubscriptions: number;
      scheduledCancellationSubscriptions: number;
      estimatedMrrEur: number;
      estimatedMrrUsd: number;
      companiesWithNoLeads30d: number;
    };
  };
  companies: OperatorCompany[];
};

export type OperatorCompanyUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OperatorCompanyLead = {
  id: string;
  assignedUserId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

export type OperatorCompanyNotification = {
  id: string;
  leadId: string;
  notificationType: string;
  status: string;
  scheduledFor: string;
  sentAt: string | null;
  errorMessage: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  processingStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OperatorCompanyDetailData = {
  company: {
    id: string;
    ownerUserId: string;
    name: string;
    contactPerson: string;
    email: string;
    notificationEmail: string | null;
    websiteUrl: string | null;
    phone: string | null;
    industry: string | null;
    timezone: string;
    businessHours: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  metrics: {
    userCount: number;
    leadCount: number;
    leadsLast30d: number;
    lastLeadAt: string | null;
    failedNotifications7d: number;
    dueNotifications: number;
    staleProcessingNotifications: number;
    lastSuccessfulNotificationAt: string | null;
  };
  subscription: {
    plan: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  users: OperatorCompanyUser[];
  recentLeads: OperatorCompanyLead[];
  recentNotifications: OperatorCompanyNotification[];
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

type RawSubscriptionSummary = {
  company_id: string;
  status: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean | null;
};

type RawCompanyMarketEvent = {
  company_id: string | null;
  market: "de" | "us" | "unknown";
  occurred_at: string;
};

type RawCompanyDetail = {
  id: string;
  owner_user_id: string;
  name: string;
  contact_person: string;
  email: string;
  notification_email: string | null;
  website_url: string | null;
  phone: string | null;
  industry: string | null;
  timezone: string;
  business_hours: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RawUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

type RawLead = {
  id: string;
  assigned_user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
};

type RawNotification = {
  id: string;
  lead_id: string;
  notification_type: string;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  attempt_count: number | string | null;
  last_attempt_at: string | null;
  processing_started_at: string | null;
  created_at: string;
  updated_at: string;
};

type RawSubscription = {
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
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

const mapCompanyOverview = (company: RawCompanyOverview): OperatorCompany => ({
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
});

const ESTIMATED_MONTHLY_MRR_BY_MARKET = {
  de: 99,
  us: 119,
} as const;

const getMarketForCompany = (
  companyId: string,
  marketByCompanyId: Map<string, "de" | "us" | "unknown">,
) => marketByCompanyId.get(companyId) ?? "unknown";

export const getOperatorDashboardData = async (): Promise<OperatorDashboardData> => {
  const supabase = createSupabaseServiceRoleClient();
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
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
    analyticsEventsLast7dDe,
    analyticsEventsLast7dUs,
    analyticsEventsLast30dDe,
    analyticsEventsLast30dUs,
    analyticsCheckoutStartsLast30d,
    analyticsPublicLeadsLast30d,
    analyticsExportsLast30d,
    subscriptionsResult,
    marketEventsResult,
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
    readCount(
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("market", "de")
        .gte("occurred_at", last7Days),
    ),
    readCount(
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("market", "us")
        .gte("occurred_at", last7Days),
    ),
    readCount(
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("market", "de")
        .gte("occurred_at", last30Days),
    ),
    readCount(
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("market", "us")
        .gte("occurred_at", last30Days),
    ),
    readCount(
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "billing_checkout_started")
        .gte("occurred_at", last30Days),
    ),
    readCount(
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "lead_created_public")
        .gte("occurred_at", last30Days),
    ),
    readCount(
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "leads_export_requested")
        .gte("occurred_at", last30Days),
    ),
    supabase
      .from("subscriptions")
      .select("company_id, status, trial_ends_at, cancel_at_period_end"),
    supabase
      .from("analytics_events")
      .select("company_id, market, occurred_at")
      .not("company_id", "is", null)
      .order("occurred_at", { ascending: false })
      .limit(5000),
  ]);

  if (companyOverviewResult.error) {
    throw companyOverviewResult.error;
  }

  if (subscriptionsResult.error) {
    throw subscriptionsResult.error;
  }

  if (marketEventsResult.error) {
    throw marketEventsResult.error;
  }

  const subscriptions = (subscriptionsResult.data ?? []) as RawSubscriptionSummary[];
  const latestCompanyMarkets = new Map<string, "de" | "us" | "unknown">();

  for (const entry of (marketEventsResult.data ?? []) as RawCompanyMarketEvent[]) {
    if (!entry.company_id || latestCompanyMarkets.has(entry.company_id)) {
      continue;
    }

    latestCompanyMarkets.set(entry.company_id, entry.market);
  }

  const subscriptionsByCompanyId = new Map<string, RawSubscriptionSummary>(
    subscriptions.map((subscription) => [subscription.company_id, subscription]),
  );

  const companies = ((companyOverviewResult.data ?? []) as RawCompanyOverview[]).map((entry) => {
    const overview = mapCompanyOverview(entry);
    const market = getMarketForCompany(overview.id, latestCompanyMarkets);
    const subscription = subscriptionsByCompanyId.get(overview.id);

    const estimatedMrr =
      (overview.subscriptionStatus === "active" || overview.subscriptionStatus === "trialing") &&
      market !== "unknown"
        ? ESTIMATED_MONTHLY_MRR_BY_MARKET[market]
        : 0;

    return {
      ...overview,
      market,
      trialEndsAt: subscription?.trial_ends_at ?? null,
      estimatedMrr,
    };
  });

  const companiesNeedingAttention = companies.filter(
    (company) =>
      company.deletedAt === null &&
      (company.failedNotifications7d > 0 || company.staleProcessingNotifications > 0),
  ).length;

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active",
  ).length;
  const trialingSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "trialing",
  ).length;
  const paymentRiskSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === "past_due" || subscription.status === "unpaid",
  ).length;
  const scheduledCancellationSubscriptions = subscriptions.filter(
    (subscription) => subscription.cancel_at_period_end === true,
  ).length;

  const estimatedMrrEur = companies
    .filter((company) => company.market === "de")
    .reduce((sum, company) => sum + (company.estimatedMrr ?? 0), 0);
  const estimatedMrrUsd = companies
    .filter((company) => company.market === "us")
    .reduce((sum, company) => sum + (company.estimatedMrr ?? 0), 0);
  const companyOverviewById = new Map<string, RawCompanyOverview>(
    ((companyOverviewResult.data ?? []) as RawCompanyOverview[]).map((entry) => [entry.id, entry]),
  );
  const companiesWithNoLeads30d = companies.filter((company) => {
    if (company.deletedAt !== null) {
      return false;
    }

    const rawOverview = companyOverviewById.get(company.id);
    return toNumber(rawOverview?.lead_count ?? 0) > 0 && company.lastLeadAt === null;
  }).length;

  return {
    metrics: {
      activeCompanies,
      totalUsers,
      leadsLast30d,
      failedNotifications24h,
      dueNotifications,
      staleProcessingNotifications,
      companiesNeedingAttention,
      analytics: {
        eventsLast7d: {
          de: analyticsEventsLast7dDe,
          us: analyticsEventsLast7dUs,
          total: analyticsEventsLast7dDe + analyticsEventsLast7dUs,
        },
        eventsLast30d: {
          de: analyticsEventsLast30dDe,
          us: analyticsEventsLast30dUs,
          total: analyticsEventsLast30dDe + analyticsEventsLast30dUs,
        },
        checkoutStartsLast30d: analyticsCheckoutStartsLast30d,
        publicLeadsLast30d: analyticsPublicLeadsLast30d,
        exportsLast30d: analyticsExportsLast30d,
      },
      owner: {
        activeSubscriptions,
        trialingSubscriptions,
        paymentRiskSubscriptions,
        scheduledCancellationSubscriptions,
        estimatedMrrEur,
        estimatedMrrUsd,
        companiesWithNoLeads30d,
      },
    },
    companies,
  };
};

export const getOperatorCompanyDetailData = async (
  companyId: string,
): Promise<OperatorCompanyDetailData | null> => {
  const supabase = createSupabaseServiceRoleClient();
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [companyResult, overviewResult] = await Promise.all([
    supabase
      .from("companies")
      .select(
        "id, owner_user_id, name, contact_person, email, notification_email, website_url, phone, industry, timezone, business_hours, created_at, updated_at, deleted_at",
      )
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("operator_company_overview")
      .select("*")
      .eq("id", companyId)
      .maybeSingle(),
  ]);

  if (companyResult.error) {
    throw companyResult.error;
  }

  if (overviewResult.error) {
    throw overviewResult.error;
  }

  if (!companyResult.data || !overviewResult.data) {
    return null;
  }

  const company = companyResult.data as RawCompanyDetail;
  const overview = mapCompanyOverview(overviewResult.data as RawCompanyOverview);

  const [
    usersResult,
    leadsResult,
    notificationsResult,
    subscriptionResult,
    leadsLast30d,
    lastSuccessfulNotificationResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, full_name, role, created_at, updated_at")
      .or(`id.eq.${company.owner_user_id},default_company_id.eq.${company.id}`)
      .order("created_at", { ascending: true }),
    supabase
      .from("leads")
      .select(
        "id, assigned_user_id, first_name, last_name, email, phone, source, status, priority, created_at, updated_at",
      )
      .eq("company_id", company.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("notification_queue")
      .select(
        "id, lead_id, notification_type, status, scheduled_for, sent_at, error_message, attempt_count, last_attempt_at, processing_started_at, created_at, updated_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_start, current_period_end, cancel_at_period_end")
      .eq("company_id", company.id)
      .maybeSingle(),
    readCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .is("deleted_at", null)
        .gte("created_at", last30Days),
    ),
    supabase
      .from("notification_queue")
      .select("sent_at")
      .eq("company_id", company.id)
      .eq("status", "sent")
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (usersResult.error) {
    throw usersResult.error;
  }

  if (leadsResult.error) {
    throw leadsResult.error;
  }

  if (notificationsResult.error) {
    throw notificationsResult.error;
  }

  if (subscriptionResult.error) {
    throw subscriptionResult.error;
  }

  if (lastSuccessfulNotificationResult.error) {
    throw lastSuccessfulNotificationResult.error;
  }

  const users = ((usersResult.data ?? []) as RawUser[]).map(
    (user): OperatorCompanyUser => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isOwner: user.id === company.owner_user_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }),
  );

  const recentLeads = ((leadsResult.data ?? []) as RawLead[]).map(
    (lead): OperatorCompanyLead => ({
      id: lead.id,
      assignedUserId: lead.assigned_user_id,
      firstName: lead.first_name,
      lastName: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    }),
  );

  const recentNotifications = ((notificationsResult.data ?? []) as RawNotification[]).map(
    (notification): OperatorCompanyNotification => ({
      id: notification.id,
      leadId: notification.lead_id,
      notificationType: notification.notification_type,
      status: notification.status,
      scheduledFor: notification.scheduled_for,
      sentAt: notification.sent_at,
      errorMessage: notification.error_message,
      attemptCount: toNumber(notification.attempt_count),
      lastAttemptAt: notification.last_attempt_at,
      processingStartedAt: notification.processing_started_at,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
    }),
  );

  const subscription = subscriptionResult.data
    ? (() => {
        const value = subscriptionResult.data as RawSubscription;
        return {
          plan: value.plan,
          status: value.status,
          currentPeriodStart: value.current_period_start,
          currentPeriodEnd: value.current_period_end,
          cancelAtPeriodEnd: value.cancel_at_period_end,
        };
      })()
    : null;

  const lastSuccessfulNotification = lastSuccessfulNotificationResult.data as {
    sent_at: string | null;
  } | null;

  return {
    company: {
      id: company.id,
      ownerUserId: company.owner_user_id,
      name: company.name,
      contactPerson: company.contact_person,
      email: company.email,
      notificationEmail: company.notification_email,
      websiteUrl: company.website_url,
      phone: company.phone,
      industry: company.industry,
      timezone: company.timezone,
      businessHours: company.business_hours,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
      deletedAt: company.deleted_at,
    },
    metrics: {
      userCount: overview.userCount,
      leadCount: overview.leadCount,
      leadsLast30d,
      lastLeadAt: overview.lastLeadAt,
      failedNotifications7d: overview.failedNotifications7d,
      dueNotifications: overview.dueNotifications,
      staleProcessingNotifications: overview.staleProcessingNotifications,
      lastSuccessfulNotificationAt: lastSuccessfulNotification?.sent_at ?? null,
    },
    subscription,
    users,
    recentLeads,
    recentNotifications,
  };
};
