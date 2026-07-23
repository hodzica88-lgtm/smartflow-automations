import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

type UserRole = "owner" | "admin" | "member";
type TeamStatus = "pending" | "active";

export type UserCompanyState = {
  companyId: string | null;
  role: UserRole | null;
  teamStatus: TeamStatus | null;
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

  const role = (profile?.role as UserRole | undefined) ?? null;
  const teamStatus = (profile?.team_status as TeamStatus | undefined) ?? null;

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
      const isOwner = role === "owner" && defaultCompany.owner_user_id === userId;
      const isActiveMember =
        options.allowMember === true &&
        teamStatus === "active" &&
        (role === "admin" || role === "member");

      if (isOwner || isActiveMember) {
        return {
          companyId: defaultCompany.id,
          role,
          teamStatus,
          isOwner,
        };
      }
    }
  }

  if (role === "owner") {
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

    if (company?.id) {
      return {
        companyId: company.id,
        role,
        teamStatus,
        isOwner: true,
      };
    }
  }

  return {
    companyId: null,
    role,
    teamStatus,
    isOwner: false,
  };
};
