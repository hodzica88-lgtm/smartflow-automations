import { recordLegalAcceptance } from "@/features/legal/service";
import { LEGAL_DOC_VERSION } from "@/shared/config/site";

export const BILLING_LEGAL_DOCUMENTS = ["agb", "datenschutz"] as const;

export const acceptBillingLegalTerms = async (input: {
  companyId: string;
  userId: string;
  sourcePath: string;
}) => {
  await recordLegalAcceptance({
    acceptedDocuments: [...BILLING_LEGAL_DOCUMENTS],
    acceptedVersion: LEGAL_DOC_VERSION,
    companyId: input.companyId,
    consentScope: "billing_checkout",
    sourcePath: input.sourcePath,
    userId: input.userId,
  });
};