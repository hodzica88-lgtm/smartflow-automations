import CustomerDashboardView from "@/app/dashboard/CustomerDashboardView";
import styles from "@/app/dashboard/dashboardLayout.module.css";
import CustomerDashboardHeader from "@/features/dashboard/CustomerDashboardHeader";
import { getCompanyUnreadNotificationCount } from "@/features/notifications/service";
import { requirePrimaryOwnerCustomerPreview } from "@/features/operator/access";
import { INTERNAL_OWNER_COMPANY_ID } from "@/features/operator/internal-company";
import { getRequestMarket } from "@/shared/i18n/request";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPreviewPage() {
  await requirePrimaryOwnerCustomerPreview({ nextPath: "/operator/customer-preview" });
  const { market } = await getRequestMarket();
  const unreadCount = await getCompanyUnreadNotificationCount(INTERNAL_OWNER_COMPANY_ID);

  return (
    <div className={styles.appShell}>
      <CustomerDashboardHeader
        market={market}
        unreadCount={unreadCount}
        previewMode
        backToOwner="/operator/owner"
        isOwner
      />
      <div className={styles.workspace}>
        <CustomerDashboardView companyId={INTERNAL_OWNER_COMPANY_ID} showBillingAction={false} isOwner />
      </div>
    </div>
  );
}
