"use server";

import { redirect } from "next/navigation";

import { ensureUserProfile } from "@/features/auth/profile";
import { getUserCompanyState } from "@/features/onboarding/company";
import { publicEnv } from "@/shared/config/env";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

const getStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
};

const redirectWithError = (path: string, message: string): never => {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
};

export const loginAction = async (formData: FormData) => {
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");

  if (!email || !password) {
    redirectWithError("/login", "Bitte geben Sie E-Mail-Adresse und Passwort ein.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithError("/login", "Ungültige E-Mail-Adresse oder ungültiges Passwort.");
  }

  if (!data.user) {
    redirectWithError("/login", "Ungültige E-Mail-Adresse oder ungültiges Passwort.");
  }

  const user = data.user!;

  try {
    await ensureUserProfile(user);
  } catch {
    await supabase.auth.signOut();
    redirectWithError("/login", "Ihr Profil konnte nicht vorbereitet werden.");
  }

  const companyState = await getUserCompanyState(user.id);

  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
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

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${publicEnv.appUrl}/login`,
  });

  redirect("/forgot-password?sent=1");
};
