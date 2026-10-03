import { notFound, redirect } from "next/navigation";

import { isPrimaryOwnerOperatorAccount } from "@/features/auth/primary-account";
import { isOperatorUser } from "@/features/auth/redirects";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export const requireOperatorUser = async ({ nextPath = "/operator/owner" }: { nextPath?: string } = {}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isOperatorUser(user)) {
    notFound();
  }

  return user;
};

export const requirePrimaryOwnerCustomerPreview = async ({ nextPath = "/operator/customer-preview" }: { nextPath?: string } = {}) => {
  const user = await requireOperatorUser({ nextPath });

  if (!isPrimaryOwnerOperatorAccount(user.email)) {
    notFound();
  }

  return user;
};
