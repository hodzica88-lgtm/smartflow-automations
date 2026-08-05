import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type LegalAcceptanceInput = {
  companyId: string;
  userId: string;
  consentScope: string;
  acceptedDocuments: string[];
  acceptedVersion: string;
  sourcePath: string;
};

export const recordLegalAcceptance = async (input: LegalAcceptanceInput) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("legal_acceptances").insert({
    accepted_documents: input.acceptedDocuments,
    accepted_version: input.acceptedVersion,
    company_id: input.companyId,
    consent_scope: input.consentScope,
    source_path: input.sourcePath,
    user_id: input.userId,
  });

  if (error) {
    throw error;
  }
};
