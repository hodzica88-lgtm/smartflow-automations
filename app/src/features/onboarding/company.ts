import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type UserCompanyState = {
  companyId: string | null;
  role: "owner" | "admin" | "member" | null;
  isOwner: boolean;
};

type GetUserCompanyStateOptions = {
  allowMember?: boolean;
};

export const getUserCompanyState = async (
  userId: string,
  options: GetUserCompanyStateOptions = {},
): Promise<UserCompanyState> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("default_company_id, role, team_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profile?.default_company_id) {
    const { data: defaultCompany, error: defaultCompanyError } = await supabase
      .from("companies")
      .select("id, owner_user_id")
      .eq("id", profile.default_company_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (defaultCompanyError) {
      throw defaultCompanyError;
    }

    if (defaultCompany?.id) {
      const role = profile.role as "owner" | "admin" | "member";
      const isOwner = role === "owner" && defaultCompany.owner_user_id === userId;
      const isActiveMember =
        options.allowMember === true &&
        profile.team_status === "active" &&
        (role === "admin" || role === "member");

      if (isOwner || isActiveMember) {
        return {
          companyId: defaultCompany.id,
          role,
          isOwner,
        };
      }
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
    role: company?.id ? "owner" : null,
    isOwner: Boolean(company?.id),
  };
};
