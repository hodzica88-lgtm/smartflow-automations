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
    const { data: defaultCompany, error: defaultCompanyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", profile.default_company_id)
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (defaultCompanyError) {
      throw defaultCompanyError;
    }

    if (defaultCompany?.id) {
      return {
        companyId: defaultCompany.id,
      };
    }
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  return {
    companyId: company?.id ?? null,
  };
};
