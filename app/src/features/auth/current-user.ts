import { cache } from "react";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentUserId = cache(async () => {
  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;

    if (!error && typeof subject === "string" && subject) {
      return subject;
    }
  } catch {
    // Fall back to the authoritative user lookup for legacy JWT setups.
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
});
