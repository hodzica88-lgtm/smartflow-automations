export const INTERNAL_OWNER_COMPANY_ID = "25acf959-a96f-49b6-ad82-47d6c8852dca";
export const OWNER_REAL_BUSINESS_BASELINE = "2026-09-30T00:26:30.000Z";

export const isInternalOwnerCompany = (companyId?: string | null): boolean => {
  if (typeof companyId !== "string") {
    return false;
  }

  return companyId.trim().toLowerCase() === INTERNAL_OWNER_COMPANY_ID.toLowerCase();
};

export const filterExternalBusinessCompany = (companyId?: string | null): boolean => {
  if (!companyId || !companyId.trim()) {
    return false;
  }

  return !isInternalOwnerCompany(companyId);
};

export const isVisibleOwnerBusinessNotification = <T extends { company_id?: string | null; created_at?: string | null }>(
  row?: T | null,
  baseline = OWNER_REAL_BUSINESS_BASELINE,
): boolean => {
  if (!row) {
    return false;
  }

  const companyId = row.company_id ?? null;
  if (companyId && companyId.trim()) {
    return filterExternalBusinessCompany(companyId);
  }

  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Number.NEGATIVE_INFINITY;
  const cutoff = new Date(baseline).getTime();

  return Number.isFinite(createdAt) && createdAt >= cutoff;
};

export const filterExternalBusinessNotification = <T extends { company_id?: string | null; created_at?: string | null }>(
  row?: T | null,
): boolean => isVisibleOwnerBusinessNotification(row);
