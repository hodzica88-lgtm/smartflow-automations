import { notFound, redirect } from "next/navigation";

import { loadServerEnv } from "@/shared/config/env";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export const requireOperatorUser = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/operator");
  }

  const { operatorUserIds } = loadServerEnv();

  if (!operatorUserIds.includes(user.id)) {
    notFound();
  }

  return user;
};
