import InquiryAssistantClient from "./InquiryAssistantClient";
import { getActiveCompanyInquiryTypes } from "@/features/inquiry-types/service";
import { getRequestMarket } from "@/shared/i18n/request";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import LegalFooter from "@/shared/ui/LegalFooter";

const FALLBACK_INQUIRY_TYPE = "Allgemeine Anfrage";

type PageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { companyId } = await params;
  const { market } = await getRequestMarket();
  const supabase = createSupabaseServiceRoleClient();
  const activeInquiryTypes = await getActiveCompanyInquiryTypes({
    supabase,
    companyId,
  });
  const inquiryTypeOptions =
    activeInquiryTypes.length > 0
      ? activeInquiryTypes.map((entry) => entry.name)
      : [FALLBACK_INQUIRY_TYPE];

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 24 }}>
      <InquiryAssistantClient
        companyId={companyId}
        market={market === "us" ? "us" : "de"}
        inquiryTypeOptions={inquiryTypeOptions}
        fallbackInquiryType={FALLBACK_INQUIRY_TYPE}
      />
      <LegalFooter />
    </main>
  );
}
