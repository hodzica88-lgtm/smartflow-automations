import { requireUserCompanyAccess } from "@/features/billing/service";
import CustomerDashboardHeader from "@/features/dashboard/CustomerDashboardHeader";
import { getCompanyUnreadNotificationCount } from "@/features/notifications/service";
import { getRequestMarket } from "@/shared/i18n/request";

import styles from "@/app/dashboard/dashboardLayout.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ market }, access] = await Promise.all([
    getRequestMarket(),
    requireUserCompanyAccess({
      allowMember: true,
      enforceBilling: false,
      nextPath: "/dashboard",
    }),
  ]);
  const unreadCount = await getCompanyUnreadNotificationCount(access.companyId);

  return (
    <div className={styles.appShell}>
      <CustomerDashboardHeader market={market} unreadCount={unreadCount} isOwner={access.isOwner} />
      <div className={styles.workspace}>{children}</div>
    </div>
  );
}