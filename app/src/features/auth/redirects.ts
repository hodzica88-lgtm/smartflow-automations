import { isPrimaryOwnerOperatorAccount } from "@/features/auth/primary-account";
import { loadServerEnv } from "@/shared/config/env";

const ALLOWED_POST_LOGIN_PREFIXES = ["/dashboard", "/operator"] as const;

export const isOperatorUser = (user?: { id?: string | null; email?: string | null } | null) => {
  if (!user) {
    return false;
  }

  const { operatorUserEmails, operatorUserIds } = loadServerEnv();
  const normalizedEmail = user.email?.trim().toLowerCase();

  return (
    operatorUserIds.includes(user.id ?? "") ||
    Boolean(normalizedEmail && (
      isPrimaryOwnerOperatorAccount(normalizedEmail) ||
      operatorUserEmails.includes(normalizedEmail)
    ))
  );
};

export const getDefaultPostLoginPath = (user?: { id?: string | null; email?: string | null } | null) =>
  isOperatorUser(user) ? "/operator/owner" : "/dashboard";

export const getSafePostLoginPath = (value: string | null | undefined) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  const allowed = ALLOWED_POST_LOGIN_PREFIXES.some(
    (prefix) => value === prefix || value.startsWith(`${prefix}/`),
  );

  return allowed ? value : null;
};
