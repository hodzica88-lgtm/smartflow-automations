import { notFound, redirect } from "next/navigation";

import { isPrimaryOwnerOperatorAccount } from "@/features/auth/primary-account";
import { loadServerEnv } from "@/shared/config/env";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export const requireOperatorUser = async ({ nextPath = "/operator" }: { nextPath?: string } = {}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { operatorUserEmails, operatorUserIds } = loadServerEnv();
  const normalizedEmail = user.email?.trim().toLowerCase();
  const isOperatorByEmail = normalizedEmail
    ? isPrimaryOwnerOperatorAccount(normalizedEmail) ||
      operatorUserEmails.includes(normalizedEmail)
    : false;

  if (!operatorUserIds.includes(user.id) && !isOperatorByEmail) {
    notFound();
  }

  return user;
};
