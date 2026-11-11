"use server";

import { redirect } from "next/navigation";

import { trackAnalyticsEvent } from "@/features/analytics/events";
import { BILLING_ROUTE, getCompanyBillingSnapshot } from "@/features/billing/service";
import { ensureUserProfile } from "@/features/auth/profile";
import { getSafePostLoginPath, isOperatorUser } from "@/features/auth/redirects";
import {
  isValidRegistrationEmail,
  isValidRegistrationPassword,
  normalizeRegistrationEmail,
  resolveAuthRedirectBase,
  sanitizeRegistrationSource,
} from "@/features/auth/registration";
import { getUserCompanyState } from "@/features/onboarding/company";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getMarketConfig } from "@/shared/i18n/market";
import { getRequestMarket } from "@/shared/i18n/request";
import { enforceActionRateLimit } from "@/shared/lib/rate-limit/service";
import { createEventId, logServerEvent } from "@/shared/lib/observability/logger";
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

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+/g;

const logAuthMailFailure = (eventPrefix: string, message: string, error: unknown, market: string) => {
  const authError = error as { code?: string; status?: number; name?: string; message?: string };

  logServerEvent("error", {
    eventId: createEventId(eventPrefix),
    message,
    context: {
      market,
      authCode: authError.code ?? null,
      authStatus: authError.status ?? null,
      authErrorName: authError.name ?? null,
      authErrorMessage: (authError.message ?? "").replace(EMAIL_PATTERN, "[email]").slice(0, 200),
    },
  });
};

export const loginAction = async (formData: FormData) => {
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");
  const nextPath = getSafePostLoginPath(getStringValue(formData, "next"));
  let requestMarket: "de" | "us" = "de";

  try {
    requestMarket = (await getRequestMarket()).market;
  } catch {
    // Fallback to German defaults outside request scope.
  }

  const authCopy = getMarketCopy(requestMarket).shared.auth;

  if (!email || !password) {
    redirectWithError(
      "/login",
      authCopy.errors.loginMissingCredentials,
      nextPath,
    );
  }

  const source = getStringValue(formData, "source") || getStringValue(formData, "utm_source");

  const loginRateLimit = await enforceActionRateLimit({
    scope: "auth_login",
    maxSubmissions: 12,
    windowMinutes: 10,
  });

  if (!loginRateLimit.allowed) {
    redirectWithError(
      "/login",
      authCopy.errors.loginRateLimited,
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
      authCopy.errors.loginInvalidCredentials,
      nextPath,
    );
  }

  if (!data.user) {
    redirectWithError(
      "/login",
      authCopy.errors.loginInvalidCredentials,
      nextPath,
    );
  }

  const user = data.user!;
  let trackedMarket: "de" | "us" | "unknown" = "unknown";

  try {
    trackedMarket = (await getRequestMarket()).market;
  } catch {
    // Keep market unknown when request context is unavailable.
  }

  try {
    await ensureUserProfile(user);
  } catch {
    await supabase.auth.signOut();
    redirectWithError(
      "/login",
      authCopy.errors.loginProfilePreparationFailed,
      nextPath,
    );
  }

  if (isOperatorUser(user)) {
    redirect(nextPath?.startsWith("/operator") ? nextPath : "/operator/owner");
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
        authCopy.errors.inactiveMember,
      );
    }

    redirect(source ? `/onboarding?source=${encodeURIComponent(source)}` : "/onboarding");
  }

  const billing = await getCompanyBillingSnapshot(companyState.companyId);

  trackAnalyticsEvent({
    eventName: "auth_login_success",
    market: trackedMarket,
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

const REGISTRATION_PATH = "/registrierung";

const redirectRegistrationError = (message: string, source: string): never => {
  const searchParams = new URLSearchParams({ error: message });

  if (source) {
    searchParams.set("source", source);
  }

  redirect(`${REGISTRATION_PATH}?${searchParams.toString()}`);
};

export const registerAction = async (formData: FormData) => {
  const email = normalizeRegistrationEmail(getStringValue(formData, "email"));
  const rawPassword = formData.get("password");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const consent = getStringValue(formData, "consent") === "on";
  const source = sanitizeRegistrationSource(
    getStringValue(formData, "source") || getStringValue(formData, "utm_source"),
  );
  let requestMarket: "de" | "us" = "de";
  let siteUrl = getMarketConfig("de").siteUrl;
  let host: string | null = null;

  try {
    const request = await getRequestMarket();
    requestMarket = request.market;
    siteUrl = request.config.siteUrl;
    host = request.host;
  } catch {
    // Fallback to German defaults outside request scope.
  }

  const authCopy = getMarketCopy(requestMarket).shared.auth;

  if (!email || !password) {
    redirectRegistrationError(authCopy.errors.missingRequired, source);
  }

  if (!isValidRegistrationEmail(email)) {
    redirectRegistrationError(authCopy.errors.invalidEmail, source);
  }

  if (!isValidRegistrationPassword(password)) {
    redirectRegistrationError(authCopy.errors.registerWeakPassword, source);
  }

  if (!consent) {
    redirectRegistrationError(authCopy.errors.registerConsentRequired, source);
  }

  const registerRateLimit = await enforceActionRateLimit({
    scope: "auth_register",
    maxSubmissions: 5,
    windowMinutes: 60,
  });

  if (!registerRateLimit.allowed) {
    redirectRegistrationError(authCopy.errors.registerRateLimited, source);
  }

  const callbackUrl = new URL("/auth/callback", resolveAuthRedirectBase(host, siteUrl));

  if (source) {
    callbackUrl.searchParams.set("source", source);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    const code = (error as { code?: string }).code ?? "";

    if (code !== "user_already_exists" && code !== "email_exists") {
      logAuthMailFailure("auth_register_failed", "Registration sign-up failed", error, requestMarket);
    }

    // Existing accounts must not be distinguishable from new ones.
    if (code === "user_already_exists" || code === "email_exists") {
      redirect(`${REGISTRATION_PATH}?sent=1`);
    }

    if (code === "weak_password") {
      redirectRegistrationError(authCopy.errors.registerWeakPassword, source);
    }

    if (code === "email_address_invalid" || code === "validation_failed") {
      redirectRegistrationError(authCopy.errors.invalidEmail, source);
    }

    if (
      error.status === 429 ||
      code === "over_email_send_rate_limit" ||
      code === "over_request_rate_limit"
    ) {
      redirectRegistrationError(authCopy.errors.registerRateLimited, source);
    }

    redirectRegistrationError(authCopy.errors.registerFailed, source);
  }

  // A session is only returned when the project does not require email confirmation.
  if (data?.session && data.user) {
    try {
      await ensureUserProfile(data.user);
    } catch {
      await supabase.auth.signOut();
      redirectRegistrationError(authCopy.errors.profilePreparationFailed, source);
    }

    redirect(source ? `/onboarding?source=${encodeURIComponent(source)}` : "/onboarding");
  }

  redirect(`${REGISTRATION_PATH}?sent=1`);
};

export const logoutAction = async () => {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirect("/login");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = getStringValue(formData, "email");
  let requestMarket: "de" | "us" = "de";

  try {
    requestMarket = (await getRequestMarket()).market;
  } catch {
    // Fallback to German defaults outside request scope.
  }

  const authCopy = getMarketCopy(requestMarket).shared.auth;

  if (!email) {
    redirectWithError("/forgot-password", authCopy.errors.forgotMissingEmail);
  }

  const forgotRateLimit = await enforceActionRateLimit({
    scope: "auth_forgot_password",
    maxSubmissions: 6,
    windowMinutes: 10,
  });

  if (!forgotRateLimit.allowed) {
    redirectWithError(
      "/forgot-password",
      authCopy.errors.forgotRateLimited,
    );
  }

  const { config, host: requestHost } = await getRequestMarket();
  trackAnalyticsEvent({
    eventName: "auth_forgot_password_requested",
    market: config.code,
    isAuthenticated: false,
  });

  const supabase = await createSupabaseServerClient();
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("/auth/recovery", resolveAuthRedirectBase(requestHost, config.siteUrl)).toString(),
  });

  // The response stays neutral so account existence is never revealed.
  if (resetError) {
    logAuthMailFailure("auth_forgot_password_send_failed", "Password reset email request failed", resetError, config.code);
  }

  redirect("/forgot-password?sent=1");
};

export const resetPasswordAction = async (formData: FormData) => {
  const rawPassword = formData.get("password");
  const rawConfirm = formData.get("confirmPassword");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmPassword = typeof rawConfirm === "string" ? rawConfirm : "";
  let requestMarket: "de" | "us" = "de";

  try {
    requestMarket = (await getRequestMarket()).market;
  } catch {
    // Fallback to German defaults outside request scope.
  }

  const authCopy = getMarketCopy(requestMarket).shared.auth;
  const failBack = (message: string): never =>
    redirectWithError("/reset-password", message);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectWithError("/forgot-password", authCopy.errors.resetLinkInvalid);
  }

  if (!isValidRegistrationPassword(password)) {
    failBack(authCopy.errors.registerWeakPassword);
  }

  if (password !== confirmPassword) {
    failBack(authCopy.errors.resetMismatch);
  }

  const resetRateLimit = await enforceActionRateLimit({
    scope: "auth_reset_password",
    maxSubmissions: 10,
    windowMinutes: 60,
  });

  if (!resetRateLimit.allowed) {
    failBack(authCopy.errors.resetRateLimited);
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const code = (error as { code?: string }).code ?? "";

    if (code === "same_password") {
      failBack(authCopy.errors.resetSamePassword);
    }

    if (code === "weak_password") {
      failBack(authCopy.errors.registerWeakPassword);
    }

    logAuthMailFailure("auth_reset_password_failed", "Password update failed", error, requestMarket);
    failBack(authCopy.errors.resetFailed);
  }

  // End every session so the new password is required everywhere.
  await supabase.auth.signOut({ scope: "global" });

  redirect("/login?reset=1");
};
