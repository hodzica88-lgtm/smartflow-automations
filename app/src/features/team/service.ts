import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type TeamMember = {
  id: string;
  email: string;
  fullName: string | null;
  role: "owner" | "admin" | "member";
  status: "pending" | "active";
  createdAt: string;
};

const mapTeamMember = (row: {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  team_status: string;
  created_at: string;
}): TeamMember => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role as TeamMember["role"],
  status: row.team_status as TeamMember["status"],
  createdAt: row.created_at,
});

export const getCompanyTeamMembers = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  if (!company) {
    return [];
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, team_status, created_at")
    .or(`default_company_id.eq.${companyId},id.eq.${company.owner_user_id}`)
    .in("role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTeamMember);
};

export const getActiveCompanyTeamMembers = async (companyId: string) => {
  const members = await getCompanyTeamMembers(companyId);
  return members.filter((member) => member.status === "active");
};

export const getTeamMemberLabel = (
  member: Pick<TeamMember, "email" | "fullName"> | null | undefined,
) => member?.fullName?.trim() || member?.email || "Nicht zugewiesen";
