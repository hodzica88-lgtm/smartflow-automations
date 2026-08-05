import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const EMAIL_TEMPLATE_TYPES = [
  "owner_new_lead",
  "customer_confirmation",
] as const;

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export type CompanyBranding = {
  logoUrl: string | null;
  companyName: string;
  primaryColor: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  signature: string;
};

export type CompanyEmailTemplate = {
  type: EmailTemplateType;
  subject: string;
  body: string;
};

const DEFAULT_BRANDING_COLOR = "#1d4ed8";

const DEFAULT_TEMPLATES: Record<EmailTemplateType, CompanyEmailTemplate> = {
  customer_confirmation: {
    type: "customer_confirmation",
    subject: "Ihre Anfrage ist eingegangen",
    body: [
      "Hallo {{lead_name}},",
      "",
      "vielen Dank fuer Ihre Anfrage bei {{company_name}}. Wir melden uns zeitnah bei Ihnen.",
      "",
      "Freundliche Gruesse",
      "{{signature}}",
    ].join("\n"),
  },
  owner_new_lead: {
    type: "owner_new_lead",
    subject: "Neue Anfrage fuer {{company_name}}",
    body: [
      "Neue Anfrage eingegangen.",
      "",
      "Name: {{lead_name}}",
      "Telefon: {{lead_phone}}",
      "E-Mail: {{lead_email}}",
      "Anfrageart: {{lead_inquiry_type}}",
      "Nachricht: {{lead_message}}",
      "",
      "Dashboard: {{dashboard_url}}",
      "",
      "{{signature}}",
    ].join("\n"),
  },
};

const normalizeHexColor = (value: string | null | undefined) => {
  const v = (value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    return v;
  }

  return DEFAULT_BRANDING_COLOR;
};

const replaceTemplateVariables = (
  content: string,
  values: Record<string, string | null | undefined>,
) => {
  let output = content;

  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, (value ?? "").trim());
  }

  return output;
};

export const getCompanyBranding = async (
  companyId: string,
  fallbackCompanyName: string,
): Promise<CompanyBranding> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("company_branding")
    .select("logo_url, company_name, primary_color, phone, website, email, signature")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    logoUrl: (data?.logo_url as string | null | undefined) ?? null,
    companyName: (data?.company_name as string | null | undefined)?.trim() || fallbackCompanyName,
    primaryColor: normalizeHexColor(data?.primary_color as string | null | undefined),
    phone: (data?.phone as string | null | undefined) ?? null,
    website: (data?.website as string | null | undefined) ?? null,
    email: (data?.email as string | null | undefined) ?? null,
    signature:
      (data?.signature as string | null | undefined)?.trim() || fallbackCompanyName,
  };
};

export const upsertCompanyBranding = async (
  companyId: string,
  branding: CompanyBranding,
) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("company_branding").upsert({
    company_id: companyId,
    company_name: branding.companyName,
    email: branding.email,
    logo_url: branding.logoUrl,
    phone: branding.phone,
    primary_color: normalizeHexColor(branding.primaryColor),
    signature: branding.signature,
    website: branding.website,
  });

  if (error) {
    throw error;
  }
};

export const getCompanyEmailTemplates = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("company_email_templates")
    .select("template_type, subject, body")
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }

  const result: Record<EmailTemplateType, CompanyEmailTemplate> = {
    customer_confirmation: { ...DEFAULT_TEMPLATES.customer_confirmation },
    owner_new_lead: { ...DEFAULT_TEMPLATES.owner_new_lead },
  };

  for (const row of data ?? []) {
    const type = row.template_type as EmailTemplateType;
    if (!(EMAIL_TEMPLATE_TYPES as readonly string[]).includes(type)) {
      continue;
    }

    result[type] = {
      type,
      subject: row.subject,
      body: row.body,
    };
  }

  return result;
};

export const upsertCompanyEmailTemplate = async (
  companyId: string,
  template: CompanyEmailTemplate,
) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("company_email_templates").upsert({
    company_id: companyId,
    template_type: template.type,
    subject: template.subject,
    body: template.body,
  });

  if (error) {
    throw error;
  }
};

export const renderTemplateText = (
  template: CompanyEmailTemplate,
  values: Record<string, string | null | undefined>,
) => {
  return {
    subject: replaceTemplateVariables(template.subject, values),
    body: replaceTemplateVariables(template.body, values),
  };
};
