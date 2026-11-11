import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  existingCompanyId: null as string | null,
  inserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("@/features/auth/profile", () => ({ ensureUserProfile: vi.fn(async () => undefined) }));
vi.mock("@/features/audit-log/service", () => ({ recordCompanyAuditLog: vi.fn() }));
vi.mock("@/features/customer-value/service", () => ({
  parseAverageOrderValue: () => ({ ok: true, cents: 10000 }),
}));
vi.mock("@/features/analytics/growth", () => ({ normalizeGrowthSource: () => "direct" }));
vi.mock("@/features/inquiry-types/service", () => ({
  addMissingIndustryTemplateInquiryTypes: vi.fn(),
}));
vi.mock("@/features/auth/redirects", () => ({
  getDefaultPostLoginPath: () => "/dashboard",
  isOperatorUser: () => false,
}));
vi.mock("@/features/onboarding/company", () => ({
  getUserCompanyState: vi.fn(async () => ({
    companyId: state.existingCompanyId,
    isOwner: true,
    role: "owner",
  })),
}));
vi.mock("@/features/billing/service", () => ({ BILLING_ROUTE: "/dashboard/billing" }));
vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: vi.fn(async () => ({ market: "de" })),
}));

vi.mock("@/shared/lib/supabase/server", () => {
  const builder = (table: string) => ({
    insert(payload: Record<string, unknown>) {
      state.inserts.push({ table, payload });
      const result = { data: { id: "company_new" }, error: null };
      return {
        select: () => ({ single: async () => result }),
        then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
      };
    },
    update: () => ({ eq: async () => ({ error: null }) }),
    select: () => ({
      eq: () => ({
        eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
    }),
    delete: () => ({ eq: async () => ({ error: null }) }),
  });

  return {
    createSupabaseServerClient: vi.fn(async () => ({
      auth: {
        getUser: async () => ({ data: { user: { id: "user_a", email: "owner@example.com" } } }),
        signOut: vi.fn(),
      },
    })),
    createSupabaseServiceRoleClient: vi.fn(() => ({ from: (table: string) => builder(table) })),
  };
});

const { completeOnboardingAction } = await import("./actions");
const { INDUSTRY_OPTIONS } = await import("@/shared/config/inquiryTypes");

const createFormData = () => {
  const formData = new FormData();
  formData.set("companyName", "Muster GmbH");
  formData.set("contactPerson", "Max Muster");
  formData.set("email", "owner@example.com");
  formData.set("phone", "+491234567");
  formData.set("timezone", "Europe/Berlin");
  formData.set("industry", INDUSTRY_OPTIONS[0]);
  formData.set("averageOrderValue", "100");
  return formData;
};

describe("onboarding checkout-first trial", () => {
  beforeEach(() => {
    state.existingCompanyId = null;
    state.inserts = [];
  });

  it("creates the company without any trial and sends the owner to the billing checkout page", async () => {
    await expect(completeOnboardingAction(createFormData())).rejects.toThrow(
      "REDIRECT:/dashboard/billing?billing=no_subscription",
    );

    const subscription = state.inserts.find((entry) => entry.table === "subscriptions");
    expect(subscription?.payload).toEqual({ company_id: "company_new", status: "inactive" });
  });

  it("does not create a second company or subscription for an already registered owner", async () => {
    state.existingCompanyId = "company_existing";

    await expect(completeOnboardingAction(createFormData())).rejects.toThrow("REDIRECT:/dashboard");
    expect(state.inserts).toEqual([]);
  });
});
