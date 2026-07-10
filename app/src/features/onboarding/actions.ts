"use server";

import { redirect } from "next/navigation";

import { ensureUserProfile } from "@/features/auth/profile";
import { getUserCompanyState } from "@/features/onboarding/company";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";

const timeZones = [
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Zurich",
] as const;

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
  const companyName = getStringValue(formData, "companyName");
  const contactPerson = getStringValue(formData, "contactPerson");
  const email = getStringValue(formData, "email");
  const phone = getStringValue(formData, "phone");
  const website = getStringValue(formData, "website");
  const timezone = getStringValue(formData, "timezone");
  const businessHours = getStringValue(formData, "businessHours");

  if (!companyName || !contactPerson || !email || !phone || !timezone) {
    redirectWithError("Bitte füllen Sie alle Pflichtfelder aus.");
  }

  if (!isValidEmail(email)) {
    redirectWithError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
  }

  if (!timeZones.includes(timezone as (typeof timeZones)[number])) {
    redirectWithError("Bitte wählen Sie eine gültige Zeitzone.");
  }

  if (!isValidWebsite(website)) {
    redirectWithError("Die Website muss mit http:// oder https:// beginnen.");
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
    redirectWithError("Ihr Profil konnte nicht vorbereitet werden.");
  }

  const existingCompany = await getUserCompanyState(user.id);

  if (existingCompany.companyId) {
    redirect("/dashboard");
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
    });

    if (settingsError) {
      throw settingsError;
    }

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        company_id: companyId,
        status: "trialing",
      });

    if (subscriptionError) {
      throw subscriptionError;
    }

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
  } catch {
    if (createdCompanyId) {
      const supabase = createSupabaseServiceRoleClient();
      await supabase.from("companies").delete().eq("id", createdCompanyId);
    }

    redirectWithError("Die Einrichtung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.");
  }

  redirect("/dashboard");
};
