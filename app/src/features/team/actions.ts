"use server";

import { redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
import { publicEnv } from "@/shared/config/env";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";

const getStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const redirectTeamError = (message: string): never => {
  redirect(`/dashboard/team?error=${encodeURIComponent(message)}`);
};

const redirectTeamSuccess = (message: string): never => {
  redirect(`/dashboard/team?success=${encodeURIComponent(message)}`);
};

const getOwnerAccess = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/team");
  }

  const companyState = await getUserCompanyState(user.id);

  if (!companyState.companyId || !companyState.isOwner) {
    redirect("/dashboard/leads");
  }

  return {
    companyId: companyState.companyId,
    ownerUserId: user.id,
  };
};

const createPendingMember = async (companyId: string, emailInput: string) => {
  const email = emailInput.trim().toLowerCase();
  const supabase = createSupabaseServiceRoleClient();

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (existingProfile) {
    throw new Error("Diese E-Mail-Adresse besitzt bereits einen Varnito-Zugang.");
  }

  const { data: invited, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        varnito_company_id: companyId,
        varnito_role: "member",
      },
      redirectTo: `${publicEnv.appUrl}/team/accept`,
    });

  if (inviteError || !invited.user) {
    throw new Error("Die Einladung konnte nicht versendet werden.");
  }

  const invitedUserId = invited.user.id;

  try {
    const { error: authMetadataError } = await supabase.auth.admin.updateUserById(
      invitedUserId,
      {
        app_metadata: {
          varnito_company_id: companyId,
          varnito_role: "member",
        },
      },
    );

    if (authMetadataError) {
      throw authMetadataError;
    }

    const { error: profileError } = await supabase.from("users").insert({
      id: invitedUserId,
      email,
      full_name: null,
      role: "member",
      default_company_id: companyId,
      team_status: "pending",
    });

    if (profileError) {
      throw profileError;
    }
  } catch (error) {
    await supabase.auth.admin.deleteUser(invitedUserId);
    throw error;
  }
};

export async function inviteTeamMemberAction(formData: FormData) {
  const email = getStringValue(formData, "email").toLowerCase();

  if (!isValidEmail(email)) {
    redirectTeamError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
  }

  const { companyId } = await getOwnerAccess();

  try {
    await createPendingMember(companyId, email);
  } catch (error) {
    redirectTeamError(
      error instanceof Error
        ? error.message
        : "Die Einladung konnte nicht versendet werden.",
    );
  }

  redirectTeamSuccess("Einladung wurde versendet.");
}

export async function resendTeamInvitationAction(formData: FormData) {
  const memberId = getStringValue(formData, "member_id");
  const { companyId } = await getOwnerAccess();
  const supabase = createSupabaseServiceRoleClient();

  const { data: member, error } = await supabase
    .from("users")
    .select("id, email, role, team_status")
    .eq("id", memberId)
    .eq("default_company_id", companyId)
    .eq("role", "member")
    .eq("team_status", "pending")
    .maybeSingle();

  if (error || !member) {
    redirectTeamError("Offene Einladung wurde nicht gefunden.");
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(member.id);

  if (deleteError) {
    redirectTeamError("Die alte Einladung konnte nicht ersetzt werden.");
  }

  try {
    await createPendingMember(companyId, member.email);
  } catch {
    redirectTeamError("Die neue Einladung konnte nicht versendet werden.");
  }

  redirectTeamSuccess("Einladung wurde erneut versendet.");
}

export async function removeTeamMemberAction(formData: FormData) {
  const memberId = getStringValue(formData, "member_id");
  const { companyId, ownerUserId } = await getOwnerAccess();

  if (!memberId || memberId === ownerUserId) {
    redirectTeamError("Dieser Zugang kann nicht entfernt werden.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: member, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", memberId)
    .eq("default_company_id", companyId)
    .neq("role", "owner")
    .maybeSingle();

  if (error || !member) {
    redirectTeamError("Mitarbeiterzugang wurde nicht gefunden.");
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(member.id);

  if (deleteError) {
    redirectTeamError("Mitarbeiterzugang konnte nicht entfernt werden.");
  }

  redirectTeamSuccess("Mitarbeiterzugang wurde entfernt.");
}

export async function acceptTeamInvitationAction(formData: FormData) {
  const fullName = getStringValue(formData, "full_name");
  const password = getStringValue(formData, "password");
  const passwordConfirmation = getStringValue(formData, "password_confirmation");

  if (!fullName) {
    redirect("/team/accept?error=Bitte+geben+Sie+Ihren+Namen+ein.");
  }

  if (password.length < 8) {
    redirect("/team/accept?error=Das+Passwort+muss+mindestens+8+Zeichen+haben.");
  }

  if (password !== passwordConfirmation) {
    redirect("/team/accept?error=Die+Passwörter+stimmen+nicht+überein.");
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/team/accept?error=Der+Einladungslink+ist+ungültig+oder+abgelaufen.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role, team_status, default_company_id")
    .eq("id", user.id)
    .eq("role", "member")
    .maybeSingle();

  if (profileError || !profile?.default_company_id) {
    redirect("/team/accept?error=Die+Einladung+konnte+nicht+zugeordnet+werden.");
  }

  if (profile.team_status === "active") {
    redirect("/dashboard/leads");
  }

  const { error: passwordError } = await authClient.auth.updateUser({
    password,
    data: { full_name: fullName },
  });

  if (passwordError) {
    redirect("/team/accept?error=Das+Passwort+konnte+nicht+gespeichert+werden.");
  }

  const { error: activationError } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      team_status: "active",
    })
    .eq("id", user.id)
    .eq("role", "member")
    .eq("team_status", "pending");

  if (activationError) {
    redirect("/team/accept?error=Der+Mitarbeiterzugang+konnte+nicht+aktiviert+werden.");
  }

  redirect("/dashboard/leads");
}
