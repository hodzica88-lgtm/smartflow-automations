import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type UserCompanyState = {
  companyId: string | null;
};

export const getUserCompanyState = async (
  userId: string,
): Promise<UserCompanyState> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("default_company_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profile?.default_company_id) {
    return {
      companyId: profile.default_company_id,
    };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  return {
    companyId: company?.id ?? null,
  };
};
