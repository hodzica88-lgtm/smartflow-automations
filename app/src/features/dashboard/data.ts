import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type DashboardMetrics = {
  newLeads: number;
  contactedLeads: number;
  successfulLeads: number;
  unsuccessfulLeads: number;
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
    newLeads,
    contactedLeads,
    successfulLeads,
    unsuccessfulLeads,
  ] = await Promise.all([
    getCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "new"),
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
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "successful"),
    ),
    getCount(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "unsuccessful"),
    ),
  ]);

  return {
    newLeads,
    contactedLeads,
    successfulLeads,
    unsuccessfulLeads,
  };
};
