"use server";

import { redirect } from "next/navigation";

import { ensureUserProfile } from "@/features/auth/profile";
import { recordCompanyAuditLog } from "@/features/audit-log/service";
import { BILLING_TRIAL_DAYS } from "@/features/billing/service";
import { parseAverageOrderValue } from "@/features/customer-value/service";
import { addMissingIndustryTemplateInquiryTypes } from "@/features/inquiry-types/service";
import { getUserCompanyState } from "@/features/onboarding/company";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import { INDUSTRY_OPTIONS, isSupportedIndustry } from "@/shared/config/inquiryTypes";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";

const timeZones = [
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Zurich",
] as const;
const industryOptions = INDUSTRY_OPTIONS;
const getStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
};

const redirectWithError = (message: string): never => {
  redirect(`/onboarding?error=${encodeURIComponent(message)}`);
};

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const isValidWebsite = (website: string) => {
  if (!website) {
    return true;
  }

  try {
    const url = new URL(website);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const completeOnboardingAction = async (formData: FormData) => {
  let market: "de" | "us" = "de";

  try {
    market = (await getRequestMarket()).market;
  } catch {
    // Fallback to German defaults outside request scope.
  }

  const onboardingCopy = getMarketCopy(market).shared.auth;
  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + BILLING_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const companyName = getStringValue(formData, "companyName");
  const contactPerson = getStringValue(formData, "contactPerson");
  const email = getStringValue(formData, "email");
  const phone = getStringValue(formData, "phone");
  const website = getStringValue(formData, "website");
  const industry = getStringValue(formData, "industry");
  const timezone = getStringValue(formData, "timezone");
  const businessHours = getStringValue(formData, "businessHours");
  const averageOrderValue = parseAverageOrderValue(
    getStringValue(formData, "averageOrderValue"),
  );

  if (!companyName || !contactPerson || !email || !phone || !timezone || !industry) {
    redirectWithError(onboardingCopy.errors.missingRequired);
  }

  if (!averageOrderValue.ok) {
    return redirectWithError(onboardingCopy.errors.invalidAverageOrderValue);
  }

  if (averageOrderValue.cents === null) {
    return redirectWithError(onboardingCopy.errors.missingAverageOrderValue);
  }

  const averageOrderValueCents = averageOrderValue.cents;

  if (!isValidEmail(email)) {
    redirectWithError(onboardingCopy.errors.invalidEmail);
  }

  if (!timeZones.includes(timezone as (typeof timeZones)[number])) {
    redirectWithError(onboardingCopy.errors.invalidTimezone);
  }

  if (!industryOptions.includes(industry as (typeof industryOptions)[number]) || !isSupportedIndustry(industry)) {
    redirectWithError(onboardingCopy.errors.invalidIndustry);
  }

  if (!isValidWebsite(website)) {
    redirectWithError(onboardingCopy.errors.invalidWebsite);
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await ensureUserProfile(user);
  } catch {
    redirectWithError(onboardingCopy.errors.profilePreparationFailed);
  }

  const existingCompany = await getUserCompanyState(user.id, { allowMember: true });

  if (existingCompany.companyId) {
    redirect(existingCompany.isOwner ? "/dashboard" : "/dashboard/leads");
  }

  if (existingCompany.role === "member" || existingCompany.role === "admin") {
    if (existingCompany.teamStatus === "pending") {
      redirect("/team/accept");
    }

    await authClient.auth.signOut();
      redirect(`/login?error=${encodeURIComponent(onboardingCopy.errors.inactiveMember)}`);
  }

  let createdCompanyId: string | null = null;

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        business_hours: businessHours || null,
        contact_person: contactPerson,
        email,
        industry,
        name: companyName,
        owner_user_id: user.id,
        phone,
        timezone,
        website_url: website || null,
      })
      .select("id")
      .single();

    if (companyError) {
      throw companyError;
    }

    const companyId = company.id;
    createdCompanyId = companyId;
    const { error: settingsError } = await supabase.from("settings").insert({
      company_id: companyId,
      average_order_value_cents: averageOrderValueCents,
    });

    if (settingsError) {
      throw settingsError;
    }

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        company_id: companyId,
        current_period_end: trialEnd.toISOString(),
        current_period_start: trialStart.toISOString(),
        status: "trialing",
        trial_ends_at: trialEnd.toISOString(),
        trial_started_at: trialStart.toISOString(),
      });

    if (subscriptionError) {
      throw subscriptionError;
    }

    await addMissingIndustryTemplateInquiryTypes({
      supabase,
      companyId,
      industry,
    });

    const { error: profileError } = await supabase
      .from("users")
      .update({
        default_company_id: companyId,
        full_name: contactPerson,
      })
      .eq("id", user.id);

    if (profileError) {
      throw profileError;
    }

    await recordCompanyAuditLog({
      companyId,
      actorUserId: user.id,
      actorLabel: user.email ?? user.id,
      action: "company_created",
      details: {
        companyName,
        industry,
      },
    });
  } catch {
    if (createdCompanyId) {
      const supabase = createSupabaseServiceRoleClient();
      await supabase.from("companies").delete().eq("id", createdCompanyId);
    }

    redirectWithError(onboardingCopy.errors.onboardingFailed);
  }

  redirect("/dashboard");
};
