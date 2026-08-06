"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordCompanyAuditLog } from "@/features/audit-log/service";
import { requireOperatorUser } from "@/features/operator/access";
import { createUsCheckoutTaxPreview } from "@/features/billing/tax-preview";
import { enforceActionRateLimit } from "@/shared/lib/rate-limit/service";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const assertOperator = async () => {
  return requireOperatorUser();
};

const getOperatorPreviewReturnUrl = (companyId: string) => `/operator/companies/${companyId}`;

const getTaxPreviewRedirectUrl = (companyId: string, params: Record<string, string>) => {
  const searchParams = new URLSearchParams(params);
  return `${getOperatorPreviewReturnUrl(companyId)}?${searchParams.toString()}`;
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

export async function createUsCheckoutTaxPreviewAction(formData: FormData) {
  const operator = await assertOperator();
  const companyId = getString(formData, "company_id");
  const addressLine1 = getString(formData, "address_line1");
  const city = getString(formData, "city");
  const state = getString(formData, "state");
  const postalCode = getString(formData, "postal_code");

  if (!companyId || !addressLine1 || !city || !state || !postalCode) {
    redirect(getTaxPreviewRedirectUrl(companyId || "", {
      taxPreviewError: "Please complete all US address fields.",
    }));
  }

  const rateLimit = await enforceActionRateLimit({
    scope: "operator_us_checkout_tax_preview",
    companyId,
    maxSubmissions: 6,
    windowMinutes: 15,
  });

  if (!rateLimit.allowed) {
    redirect(getTaxPreviewRedirectUrl(companyId, {
      taxPreviewError: "Too many preview requests. Please try again later.",
    }));
  }

  let preview = null as Awaited<ReturnType<typeof createUsCheckoutTaxPreview>> | null;

  try {
    preview = await createUsCheckoutTaxPreview({
      addressLine1,
      city,
      state,
      postalCode,
      returnUrl: getOperatorPreviewReturnUrl(companyId),
    });

    await recordCompanyAuditLog({
      companyId,
      actorUserId: operator.id,
      actorLabel: operator.email ?? operator.id,
      action: "us_checkout_tax_preview_created",
      details: {
        subtotalCents: preview.subtotalCents,
        taxCents: preview.taxCents,
        totalCents: preview.totalCents,
        checkoutUrl: preview.checkoutUrl,
        expiresAt: preview.expiresAt,
        address: {
          city,
          state,
          postalCode,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tax preview failed.";

    redirect(getTaxPreviewRedirectUrl(companyId, {
      taxPreviewError: message,
    }));
  }

  if (!preview) {
    return;
  }

  revalidatePath(`/operator/companies/${companyId}`);
  redirect(
    getTaxPreviewRedirectUrl(companyId, {
      taxPreviewSubtotal: String(preview.subtotalCents),
      taxPreviewTax: String(preview.taxCents),
      taxPreviewTotal: String(preview.totalCents),
      taxPreviewUrl: preview.checkoutUrl,
      taxPreviewExpiresAt: preview.expiresAt ?? "",
    }),
  );
}