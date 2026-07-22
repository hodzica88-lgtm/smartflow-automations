const ALLOWED_POST_LOGIN_PREFIXES = ["/dashboard", "/operator"] as const;

export const getSafePostLoginPath = (value: string | null | undefined) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  const allowed = ALLOWED_POST_LOGIN_PREFIXES.some(
    (prefix) => value === prefix || value.startsWith(`${prefix}/`),
  );

  return allowed ? value : null;
};
