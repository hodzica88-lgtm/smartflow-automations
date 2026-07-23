import type { User } from "@supabase/supabase-js";

import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const ensureUserProfile = async (user: User) => {
  const email = user.email?.trim();

  if (!email) {
    throw new Error("Cannot create a user profile without an email address.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: existingProfile, error: readError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existingProfile) {
    return;
  }

  if (user.app_metadata.varnito_role === "member") {
    throw new Error("Invited employee profile is missing.");
  }

  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  const { error: insertError } = await supabase.from("users").insert({
    email,
    full_name: fullName,
    id: user.id,
    role: "owner",
    team_status: "active",
  });

  if (insertError) {
    throw insertError;
  }
};
