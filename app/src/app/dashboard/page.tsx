import { requireUserCompanyAccess } from "@/features/billing/service";
import CustomerDashboardView from "./CustomerDashboardView";

export default async function DashboardPage() {
  const access = await requireUserCompanyAccess({
    nextPath: "/dashboard",
  });

  return <CustomerDashboardView companyId={access.companyId} />;
}
