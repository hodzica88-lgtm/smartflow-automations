import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mockGetDashboardMetrics = vi.hoisted(() =>
  vi.fn(async () => ({
    newLeads: 2,
    contactedLeads: 4,
    successfulLeads: 3,
    unsuccessfulLeads: 1,
  })),
);

const mockGetRequestMarket = vi.hoisted(() =>
  vi.fn(async () => ({
    market: "de",
    config: { locale: "de-DE" },
  })),
);

const mockLogoutAction = vi.hoisted(() => vi.fn(async () => undefined));

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(async () => ({
      data: {
        user: {
          id: "user-1",
          email: "jane@example.com",
          user_metadata: {
            first_name: "Jane",
            last_name: "Doe",
          },
        },
      },
      error: null,
    })),
  },
  from: vi.fn((table: string) => {
    if (table === "companies") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: { name: "Acme GmbH" }, error: null })),
      };
    }

    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(async () => ({ data: [], error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      head: vi.fn(async () => ({ count: 0, error: null })),
    };
  }),
};

vi.mock("@/features/dashboard/data", () => ({
  getDashboardMetrics: mockGetDashboardMetrics,
}));

vi.mock("@/shared/i18n/dashboard", () => ({
  DASHBOARD_COPY: {
    de: {
      navSettings: "Einstellungen",
      navHelp: "Hilfe",
      navNotifications: "Benachrichtigungen",
      navBell: "Glocke",
      back: "Zurück",
      logout: "Abmelden",
      overviewTitle: "Ihre Übersicht",
      overviewCopy: "",
      noLeadsTitle: "Keine Leads vorhanden",
      noLeadsCopy: "",
      manageLeads: "Leads verwalten",
      companySettings: "Firmeneinstellungen",
      newLeads: "Neue Anfragen",
      contacted: "Kontaktiert",
      successful: "Erfolgreich",
      unsuccessful: "Nicht erfolgreich",
      checkEmailDelivery: "E-Mail-Versand prüfen",
      checkEmailDeliveryCopy: "",
      failedNotificationsLastDays: (count: number) => `${count} fehlgeschlagene Benachrichtigungen`,
      openSettings: "Einstellungen öffnen",
      last30DaysTitle: "Letzte 30 Tage",
      last30DaysCopy: "",
      openAnalytics: "Auswertungen öffnen",
      totalInquiries: "Anfragen insgesamt",
      stillOpen: "Noch offen",
      noClosedLeads: "Noch keine abgeschlossenen Anfragen",
      successRate: (rate: number) => `Erfolgsquote: ${rate}%`,
      leadOverviewTitle: "Lead-Übersicht",
      leadOverviewCopy: "",
      toLeads: "Zu Leads",
      openInquiriesTitle: "Offene Anfragen",
      openInquiriesCopy: "",
      showAllInquiries: "Alle Anfragen anzeigen",
      noOpenInquiries: "Aktuell sind keine offenen Anfragen vorhanden.",
      unknownContact: "Unbekannter Kontakt",
      notProvided: "Nicht angegeben",
    },
    us: {
      navSettings: "Settings",
      navHelp: "Help",
      navNotifications: "Notifications",
      navBell: "Bell",
      back: "Back",
      logout: "Log out",
      overviewTitle: "Your overview",
      overviewCopy: "",
      noLeadsTitle: "No leads yet",
      noLeadsCopy: "",
      manageLeads: "Manage leads",
      companySettings: "Company settings",
      newLeads: "New leads",
      contacted: "Contacted",
      successful: "Successful",
      unsuccessful: "Unsuccessful",
      checkEmailDelivery: "Check email delivery",
      checkEmailDeliveryCopy: "",
      failedNotificationsLastDays: (count: number) => `${count} failed notifications`,
      openSettings: "Open settings",
      last30DaysTitle: "Last 30 days",
      last30DaysCopy: "",
      openAnalytics: "Open analytics",
      totalInquiries: "Total inquiries",
      stillOpen: "Still open",
      noClosedLeads: "No closed leads yet",
      successRate: (rate: number) => `Success rate: ${rate}%`,
      leadOverviewTitle: "Lead overview",
      leadOverviewCopy: "",
      toLeads: "Go to leads",
      openInquiriesTitle: "Open inquiries",
      openInquiriesCopy: "",
      showAllInquiries: "View all inquiries",
      noOpenInquiries: "There are currently no open inquiries.",
      unknownContact: "Unknown contact",
      notProvided: "Not provided",
    },
  },
}));

vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: mockGetRequestMarket,
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => mockSupabaseClient,
  createSupabaseServerClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock("@/features/auth/actions", () => ({
  logoutAction: mockLogoutAction,
}));

vi.mock("@/features/billing/service", () => ({
  BILLING_ROUTE: "/dashboard/billing",
}));

vi.mock("@/app/dashboard/InquiryShareSection", () => ({
  default: () => "share-section",
}));

describe("CustomerDashboardView", () => {
  it("uses the real authenticated identity instead of the Varnito fallback profile block", async () => {
    const CustomerDashboardView = (await import("./CustomerDashboardView")).default;
    const html = renderToStaticMarkup(
      await CustomerDashboardView({ companyId: "company-123", showBillingAction: false }),
    );

    expect(html).not.toContain("Varnito Workspace");
    expect(html).not.toContain(">V<");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("Acme GmbH");
  });

  it("shows the team invite quick action for owners and hides it for normal members", async () => {
    const CustomerDashboardView = (await import("./CustomerDashboardView")).default;
    const ownerHtml = renderToStaticMarkup(
      await CustomerDashboardView({ companyId: "company-123", showBillingAction: false, isOwner: true }),
    );
    const memberHtml = renderToStaticMarkup(
      await CustomerDashboardView({ companyId: "company-123", showBillingAction: false, isOwner: false }),
    );

    expect(ownerHtml).toContain("/dashboard/team");
    expect(ownerHtml).toContain("Teammitglied einladen");
    expect(memberHtml).not.toContain("/dashboard/team");
    expect(memberHtml).not.toContain("Teammitglied einladen");
  });
});
