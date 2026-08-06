import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type CompanyAuditLogEntry = {
  id: string;
  companyId: string;
  actorUserId: string | null;
  actorLabel: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type AuditLogRecordInput = {
  companyId: string;
  actorUserId?: string | null;
  actorLabel: string;
  action: string;
  details?: Record<string, unknown>;
};

const actionLabels: Record<string, string> = {
  company_created: "Firma erstellt",
  company_updated: "Firmenstammdaten geändert",
  company_deactivated: "Firma deaktiviert",
  company_activated: "Firma aktiviert",
  inquiry_type_added: "Anfrageart hinzugefügt",
  inquiry_type_renamed: "Anfrageart umbenannt",
  inquiry_type_toggled: "Anfrageart aktiv geschaltet",
  inquiry_type_reordered: "Anfrageart sortiert",
  inquiry_type_template_applied: "Branchenvorlage ergänzt",
  branding_updated: "Branding gespeichert",
  email_template_updated: "E-Mail-Template gespeichert",
  team_invited: "Mitarbeiter eingeladen",
  team_invitation_resent: "Einladung erneut gesendet",
  team_member_removed: "Mitarbeiterzugang entfernt",
  invite_accepted: "Einladung angenommen",
  billing_checkout_started: "Billing Checkout gestartet",
  billing_portal_opened: "Billing Portal geöffnet",
  us_checkout_tax_preview_created: "US-Steuervorschau erstellt",
};

export const getAuditLogActionLabel = (action: string) => actionLabels[action] ?? action;

export const recordCompanyAuditLog = async ({
  companyId,
  actorUserId = null,
  actorLabel,
  action,
  details = {},
}: AuditLogRecordInput) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("company_audit_log").insert({
    company_id: companyId,
    actor_user_id: actorUserId,
    actor_label: actorLabel,
    action,
    details,
  });

  if (error) {
    return;
  }
};

export const getCompanyAuditLog = async (companyId: string, limit = 20) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("company_audit_log")
    .select("id, company_id, actor_user_id, actor_label, action, details, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{
    id: string;
    company_id: string;
    actor_user_id: string | null;
    actor_label: string;
    action: string;
    details: Record<string, unknown>;
    created_at: string;
  }>).map((entry) => ({
    id: entry.id,
    companyId: entry.company_id,
    actorUserId: entry.actor_user_id,
    actorLabel: entry.actor_label,
    action: entry.action,
    details: entry.details,
    createdAt: entry.created_at,
  }));
};