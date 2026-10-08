import { cache } from "react";

import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type TeamMember = {
  id: string;
  email: string;
  fullName: string | null;
  role: "owner" | "admin" | "member";
  status: "pending" | "active";
  createdAt: string;
};

type TeamMemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  team_status: string;
  created_at: string;
};

const TEAM_MEMBER_SELECT = "id, email, full_name, role, team_status, created_at";

const mapTeamMember = (row: TeamMemberRow): TeamMember => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role as TeamMember["role"],
  status: row.team_status as TeamMember["status"],
  createdAt: row.created_at,
});

const loadCompanyTeamMembers = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();

  const [companyResult, membersResult] = await Promise.all([
    supabase
      .from("companies")
      .select("owner_user_id")
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("users")
      .select(TEAM_MEMBER_SELECT)
      .eq("default_company_id", companyId)
      .in("role", ["owner", "admin", "member"])
      .order("created_at", { ascending: true }),
  ]);

  const { data: company, error: companyError } = companyResult;

  if (companyError) {
    throw companyError;
  }

  if (!company) {
    return [];
  }

  const { data: companyMembers, error: membersError } = membersResult;

  if (membersError) {
    throw membersError;
  }

  const rows = [...((companyMembers ?? []) as TeamMemberRow[])];

  if (!rows.some((member) => member.id === company.owner_user_id)) {
    const { data: owner, error: ownerError } = await supabase
      .from("users")
      .select(TEAM_MEMBER_SELECT)
      .eq("id", company.owner_user_id)
      .in("role", ["owner", "admin", "member"])
      .maybeSingle();

    if (ownerError) {
      throw ownerError;
    }

    if (owner) {
      rows.push(owner as TeamMemberRow);
      rows.sort((left, right) => left.created_at.localeCompare(right.created_at));
    }
  }

  return rows.map(mapTeamMember);
};

const teamMembersInFlight = new Map<string, Promise<TeamMember[]>>();

const loadCoalescedCompanyTeamMembers = (companyId: string) => {
  const existing = teamMembersInFlight.get(companyId);

  if (existing) {
    return existing;
  }

  const pending = loadCompanyTeamMembers(companyId).finally(() => {
    if (teamMembersInFlight.get(companyId) === pending) {
      teamMembersInFlight.delete(companyId);
    }
  });

  teamMembersInFlight.set(companyId, pending);
  return pending;
};

export const getCompanyTeamMembers = cache(loadCoalescedCompanyTeamMembers);

export const getActiveCompanyTeamMembers = cache(async (companyId: string) => {
  const members = await getCompanyTeamMembers(companyId);
  return members.filter((member) => member.status === "active");
});

export const getTeamMemberLabel = (
  member: Pick<TeamMember, "email" | "fullName"> | null | undefined,
) => member?.fullName?.trim() || member?.email || "Nicht zugewiesen";
