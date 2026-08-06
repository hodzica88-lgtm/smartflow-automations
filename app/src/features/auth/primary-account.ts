import type { User } from "@supabase/supabase-js";

import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const PRIMARY_OWNER_OPERATOR_EMAIL = "hodzica88@gmail.com";

const normalizeEmail = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

export const isPrimaryOwnerOperatorAccount = (email: string | null | undefined) =>
  normalizeEmail(email) === PRIMARY_OWNER_OPERATOR_EMAIL;

export const grantPrimaryOwnerOperatorAccess = async (user: User) => {
  if (!isPrimaryOwnerOperatorAccount(user.email)) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role, team_status, default_company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: normalizeEmail(user.email),
      full_name:
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : null,
      role: "owner",
      team_status: "active",
    });

    if (insertError) {
      throw insertError;
    }
  } else {
    const updates: Record<string, string> = {};

    if (profile.role !== "owner") {
      updates.role = "owner";
    }

    if (profile.team_status !== "active") {
      updates.team_status = "active";
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }
    }
  }

  const defaultCompanyId = profile?.default_company_id ?? null;
  if (defaultCompanyId) {
    return;
  }

  const { data: ownedCompany, error: ownedCompanyError } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedCompanyError) {
    throw ownedCompanyError;
  }

  if (!ownedCompany?.id) {
    return;
  }

  const { error: linkError } = await supabase
    .from("users")
    .update({ default_company_id: ownedCompany.id })
    .eq("id", user.id)
    .is("default_company_id", null);

  if (linkError) {
    throw linkError;
  }
};
