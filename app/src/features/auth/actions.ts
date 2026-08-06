"use server";

import { redirect } from "next/navigation";

import { trackAnalyticsEvent } from "@/features/analytics/events";
import { BILLING_ROUTE, getCompanyBillingSnapshot } from "@/features/billing/service";
import { ensureUserProfile } from "@/features/auth/profile";
import { getSafePostLoginPath } from "@/features/auth/redirects";
import { getUserCompanyState } from "@/features/onboarding/company";
import { getRequestMarket } from "@/shared/i18n/request";
import { enforceActionRateLimit } from "@/shared/lib/rate-limit/service";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

const getStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
};

const redirectWithError = (
  path: string,
  message: string,
  nextPath?: string | null,
): never => {
  const searchParams = new URLSearchParams({ error: message });

  if (nextPath) {
    searchParams.set("next", nextPath);
  }

  redirect(`${path}?${searchParams.toString()}`);
};

export const loginAction = async (formData: FormData) => {
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");
  const nextPath = getSafePostLoginPath(getStringValue(formData, "next"));

  if (!email || !password) {
    redirectWithError(
      "/login",
      "Bitte geben Sie E-Mail-Adresse und Passwort ein.",
      nextPath,
    );
  }

  const loginRateLimit = await enforceActionRateLimit({
    scope: "auth_login",
    maxSubmissions: 12,
    windowMinutes: 10,
  });

  if (!loginRateLimit.allowed) {
    redirectWithError(
      "/login",
      "Zu viele Login-Versuche. Bitte versuchen Sie es später erneut.",
      nextPath,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithError(
      "/login",
      "Ungültige E-Mail-Adresse oder ungültiges Passwort.",
      nextPath,
    );
  }

  if (!data.user) {
    redirectWithError(
      "/login",
      "Ungültige E-Mail-Adresse oder ungültiges Passwort.",
      nextPath,
    );
  }

  const user = data.user!;
  let market: "de" | "us" | "unknown" = "unknown";

  try {
    market = (await getRequestMarket()).market;
  } catch {
    // Keep market unknown when request context is unavailable.
  }

  try {
    await ensureUserProfile(user);
  } catch {
    await supabase.auth.signOut();
    redirectWithError(
      "/login",
      "Ihr Profil konnte nicht vorbereitet werden.",
      nextPath,
    );
  }

  if (nextPath?.startsWith("/operator")) {
    redirect(nextPath);
  }

  const companyState = await getUserCompanyState(user.id, { allowMember: true });

  if (!companyState.companyId) {
    if (
      (companyState.role === "member" || companyState.role === "admin") &&
      companyState.teamStatus === "pending"
    ) {
      redirect("/team/accept");
    }

    if (companyState.role === "member" || companyState.role === "admin") {
      await supabase.auth.signOut();
      redirectWithError(
        "/login",
        "Dieser Mitarbeiterzugang ist nicht mehr aktiv.",
      );
    }

    redirect("/onboarding");
  }

  const billing = await getCompanyBillingSnapshot(companyState.companyId);

  trackAnalyticsEvent({
    eventName: "auth_login_success",
    market,
    companyId: companyState.companyId,
    isAuthenticated: true,
    metadata: {
      isOwner: companyState.isOwner,
      hasBillingAccess: billing.hasAppAccess,
    },
  });

  if (!billing.hasAppAccess) {
    redirect(BILLING_ROUTE);
  }

  if (!companyState.isOwner) {
    redirect("/dashboard/leads");
  }

  redirect(nextPath ?? "/dashboard");
};

export const logoutAction = async () => {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirect("/login");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = getStringValue(formData, "email");

  if (!email) {
    redirectWithError("/forgot-password", "Bitte geben Sie Ihre E-Mail-Adresse ein.");
  }

  const forgotRateLimit = await enforceActionRateLimit({
    scope: "auth_forgot_password",
    maxSubmissions: 6,
    windowMinutes: 10,
  });

  if (!forgotRateLimit.allowed) {
    redirectWithError(
      "/forgot-password",
      "Zu viele Anfragen zum Zurücksetzen des Passworts. Bitte versuchen Sie es später erneut.",
    );
  }

  const { config } = await getRequestMarket();
  trackAnalyticsEvent({
    eventName: "auth_forgot_password_requested",
    market: config.code,
    isAuthenticated: false,
  });

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${config.siteUrl}/login`,
  });

  redirect("/forgot-password?sent=1");
};
