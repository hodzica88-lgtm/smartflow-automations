import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

type LastLead = {
  company_name: string | null;
  created_at: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string;
};

export type DashboardMetrics = {
  leadsContacted: number;
  leadsReceived: number;
  lastLead: LastLead | null;
  openLeads: number;
  reminders: number;
};

const getCount = async (
  query: PromiseLike<{
    count: number | null;
    error: Error | null;
  }>,
) => {
  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
};

export const getDashboardMetrics = async (
  companyId: string,
): Promise<DashboardMetrics> => {
  const supabase = createSupabaseServiceRoleClient();

  const [
    leadsReceived,
    leadsContacted,
    reminders,
    openLeads,
    lastLeadResult,
  ] = await Promise.all([
    getCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
    ),
    getCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "contacted"),
    ),
    getCount(
      supabase
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("status", ["pending", "snoozed"]),
    ),
    getCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("status", ["new", "contacted", "qualified", "proposal"]),
    ),
    supabase
      .from("leads")
      .select("company_name, created_at, email, first_name, last_name, phone, status")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (lastLeadResult.error) {
    throw lastLeadResult.error;
  }

  return {
    leadsContacted,
    leadsReceived,
    lastLead: lastLeadResult.data,
    openLeads,
    reminders,
  };
};
