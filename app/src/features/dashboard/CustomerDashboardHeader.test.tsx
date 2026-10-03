import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import DashboardLayout from "@/app/dashboard/layout";
import CustomerDashboardPreviewPage from "@/app/operator/customer-preview/page";
import CustomerDashboardHeader from "./CustomerDashboardHeader";

const requireUserCompanyAccess = vi.hoisted(() =>
  vi.fn(async () => ({
    companyId: "company-123",
    userId: "user-123",
    isOwner: false,
    billing: {
      hasAppAccess: true,
      lockReason: null,
    },
  })),
);

const getCompanyUnreadNotificationCount = vi.hoisted(() => vi.fn(async () => 2));

const getRequestMarket = vi.hoisted(() =>
  vi.fn(async () => ({
    market: "de",
    config: { locale: "de-DE" },
  })),
);

const requirePrimaryOwnerCustomerPreview = vi.hoisted(() =>
  vi.fn(async () => ({
    id: "owner-1",
    email: "hodzica88@gmail.com",
  })),
);

vi.mock("@/features/billing/service", () => ({
  requireUserCompanyAccess,
}));

vi.mock("@/features/notifications/service", () => ({
  getCompanyUnreadNotificationCount,
}));

vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket,
}));

vi.mock("@/features/operator/access", () => ({
  requirePrimaryOwnerCustomerPreview,
}));

vi.mock("@/features/operator/internal-company", () => ({
  INTERNAL_OWNER_COMPANY_ID: "owner-company-id",
}));

vi.mock("@/app/dashboard/CustomerDashboardView", () => ({
  default: () => "dashboard-view",
}));

describe("customer dashboard header", () => {
  it("renders the shared header in the normal dashboard layout", async () => {
    const html = renderToStaticMarkup(await DashboardLayout({ children: <div>content</div> }));

    expect(html).toContain("Dashboard");
    expect(html).toContain("Leads");
    expect(html).toContain("Einstellungen");
    expect(html).toContain("Hilfe");
    expect(html).toContain("/dashboard/notifications");
    expect(requireUserCompanyAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        allowMember: true,
        enforceBilling: false,
        nextPath: "/dashboard",
      }),
    );
  });

  it("renders the preview header with the owner return link in both languages", () => {
    const german = renderToStaticMarkup(
      <CustomerDashboardHeader market="de" unreadCount={3} previewMode backToOwner="/operator/owner" />,
    );
    const english = renderToStaticMarkup(
      <CustomerDashboardHeader market="us" unreadCount={3} previewMode backToOwner="/operator/owner" />,
    );

    expect(german).toContain("Zurück zum Owner-Dashboard");
    expect(german).toContain("/operator/owner");
    expect(english).toContain("Back to Owner Dashboard");
    expect(english).toContain("/operator/owner");
  });

  it("renders the preview route with the same shared customer header and owner return action", async () => {
    const html = renderToStaticMarkup(await CustomerDashboardPreviewPage());

    expect(html).toContain("Dashboard");
    expect(html).toContain("Leads");
    expect(html).toContain("Zurück zum Owner-Dashboard");
    expect(html).toContain("/operator/owner");
  });
});
