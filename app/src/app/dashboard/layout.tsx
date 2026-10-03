import { requireUserCompanyAccess } from "@/features/billing/service";
import CustomerDashboardHeader from "@/features/dashboard/CustomerDashboardHeader";
import { getCompanyUnreadNotificationCount } from "@/features/notifications/service";
import { getRequestMarket } from "@/shared/i18n/request";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { market } = await getRequestMarket();
  const access = await requireUserCompanyAccess({
    allowMember: true,
    enforceBilling: false,
    nextPath: "/dashboard",
  });
  const unreadCount = await getCompanyUnreadNotificationCount(access.companyId);

  return (
    <>
      <CustomerDashboardHeader market={market} unreadCount={unreadCount} />
      {children}
    </>
  );
}