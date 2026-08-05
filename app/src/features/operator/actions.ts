"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordCompanyAuditLog } from "@/features/audit-log/service";
import { requireOperatorUser } from "@/features/operator/access";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const assertOperator = async () => {
  return requireOperatorUser();
};

export async function deactivateCompanyAction(formData: FormData) {
  const operator = await assertOperator();
  const companyId = getString(formData, "company_id");

  if (!companyId) {
    redirect("/operator?error=Ungueltige+Firma");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("companies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", companyId);

  if (error) {
    redirect("/operator?error=Firma+konnte+nicht+deaktiviert+werden");
  }

  await recordCompanyAuditLog({
    companyId,
    actorUserId: operator.id,
    actorLabel: operator.email ?? operator.id,
    action: "company_deactivated",
  });

  revalidatePath("/operator");
  redirect("/operator?success=Firma+deaktiviert");
}

export async function activateCompanyAction(formData: FormData) {
  const operator = await assertOperator();
  const companyId = getString(formData, "company_id");

  if (!companyId) {
    redirect("/operator?error=Ungueltige+Firma");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("companies")
    .update({ deleted_at: null })
    .eq("id", companyId);

  if (error) {
    redirect("/operator?error=Firma+konnte+nicht+aktiviert+werden");
  }

  await recordCompanyAuditLog({
    companyId,
    actorUserId: operator.id,
    actorLabel: operator.email ?? operator.id,
    action: "company_activated",
  });

  revalidatePath("/operator");
  redirect("/operator?success=Firma+aktiviert");
}