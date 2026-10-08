import { unstable_cache } from "next/cache";

import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type CompanyIntakeContext = {
  id: string;
  deletedAt: string | null;
  timezone: string;
  businessHours: string | null;
};

const loadCompanyIntakeContext = async (
  companyId: string,
): Promise<CompanyIntakeContext | null> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, deleted_at, timezone, business_hours")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    deletedAt: data.deleted_at ?? null,
    timezone: data.timezone,
    businessHours: data.business_hours ?? null,
  };
};

export const getCompanyIntakeContext = unstable_cache(
  loadCompanyIntakeContext,
  ["company-intake-context"],
  { revalidate: 5 },
);
