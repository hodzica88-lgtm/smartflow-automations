import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getInquiryTypeTemplateForIndustry,
  normalizeInquiryTypeName,
} from "@/shared/config/inquiryTypes";

export const MAX_INQUIRY_TYPE_NAME_LENGTH = 80;

export type CompanyInquiryType = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

type ServiceContext = {
  supabase: SupabaseClient;
  companyId: string;
};

export const validateInquiryTypeName = (value: string) => {
  const normalized = normalizeInquiryTypeName(value);

  if (!normalized) {
    return { ok: false as const, value: normalized, error: "Name darf nicht leer sein." };
  }

  if (normalized.length > MAX_INQUIRY_TYPE_NAME_LENGTH) {
    return {
      ok: false as const,
      value: normalized,
      error: `Name darf maximal ${MAX_INQUIRY_TYPE_NAME_LENGTH} Zeichen lang sein.`,
    };
  }

  return { ok: true as const, value: normalized };
};

export const getCompanyInquiryTypes = async ({ supabase, companyId }: ServiceContext) => {
  const { data, error } = await supabase
    .from("company_inquiry_types")
    .select("id, name, active, sort_order, created_at")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CompanyInquiryType[];
};

export const getActiveCompanyInquiryTypes = async ({ supabase, companyId }: ServiceContext) => {
  const { data, error } = await supabase
    .from("company_inquiry_types")
    .select("id, name, active, sort_order, created_at")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CompanyInquiryType[];
};

export const hasDuplicateInquiryTypeName = (
  inquiryTypes: CompanyInquiryType[],
  name: string,
  excludeId?: string,
) => {
  const target = normalizeInquiryTypeName(name).toLocaleLowerCase("de-DE");

  return inquiryTypes.some((inquiryType) => {
    if (excludeId && inquiryType.id === excludeId) {
      return false;
    }

    return normalizeInquiryTypeName(inquiryType.name).toLocaleLowerCase("de-DE") === target;
  });
};

export const addMissingIndustryTemplateInquiryTypes = async ({
  supabase,
  companyId,
  industry,
}: ServiceContext & { industry: string }) => {
  const template = getInquiryTypeTemplateForIndustry(industry);
  if (template.length === 0) {
    return 0;
  }

  const existing = await getCompanyInquiryTypes({ supabase, companyId });
  const existingNames = new Set(
    existing.map((entry) => normalizeInquiryTypeName(entry.name).toLocaleLowerCase("de-DE")),
  );

  const missing = template.filter(
    (templateName) => !existingNames.has(normalizeInquiryTypeName(templateName).toLocaleLowerCase("de-DE")),
  );

  if (missing.length === 0) {
    return 0;
  }

  const maxSortOrder = existing.reduce((max, entry) => Math.max(max, entry.sort_order), -1);

  const { error } = await supabase.from("company_inquiry_types").insert(
    missing.map((name, index) => ({
      company_id: companyId,
      name,
      active: true,
      sort_order: maxSortOrder + index + 1,
    })),
  );

  if (error) {
    throw error;
  }

  return missing.length;
};

export const ensureCompanyInquiryTypesInitialized = async ({
  supabase,
  companyId,
  industry,
}: ServiceContext & { industry: string }) => {
  const { count, error } = await supabase
    .from("company_inquiry_types")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }

  if ((count ?? 0) > 0) {
    return 0;
  }

  return addMissingIndustryTemplateInquiryTypes({ supabase, companyId, industry });
};

export const reorderInquiryTypes = async ({
  supabase,
  companyId,
  orderedIds,
}: ServiceContext & { orderedIds: string[] }) => {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("company_inquiry_types")
        .update({ sort_order: index })
        .eq("company_id", companyId)
        .eq("id", id),
    ),
  );
};
