import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  companyEqValues: [] as string[],
  updateCalled: false,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("@/shared/lib/stripe/server", () => ({
  createStripeServerClient: vi.fn(),
}));

vi.mock("@/features/billing/service", () => ({
  requireUserCompanyAccess: vi.fn(async () => ({
    companyId: "company_a",
    userId: "user_a",
  })),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: { id: "user_a" },
        },
      })),
    },
  })),
  createSupabaseServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      const query = {
        select() {
          return query;
        },
        insert() {
          return {
            select() {
              return query;
            },
            async single() {
              return { data: null, error: null };
            },
          };
        },
        update() {
          if (table === "leads") {
            state.updateCalled = true;
          }
          return query;
        },
        eq(column: string, value: string) {
          if (column === "company_id") {
            state.companyEqValues.push(value);
          }
          return query;
        },
        is() {
          return query;
        },
        limit() {
          return query;
        },
        async maybeSingle() {
          return { data: null, error: null };
        },
        async single() {
          return { data: null, error: null };
        },
      };

      return query;
    },
  })),
}));

vi.mock("@/features/onboarding/company", () => ({
  getUserCompanyState: vi.fn(async () => ({
    companyId: "company_a",
    isOwner: true,
    role: "owner",
    teamStatus: "active",
  })),
}));

vi.mock("@/features/team/service", () => ({
  getActiveCompanyTeamMembers: vi.fn(async () => []),
  getTeamMemberLabel: vi.fn(() => "User"),
}));

const { updateLeadDetailAction } = await import("@/app/dashboard/leads/[leadId]/page");

describe("tenant isolation: lead write flow", () => {
  beforeEach(() => {
    state.companyEqValues = [];
    state.updateCalled = false;
  });

  it("prevents company A from reading lead state of company B", async () => {
    const formData = new FormData();
    formData.set("leadId", "lead_b_1");
    formData.set("status", "new");
    formData.set("assigned_user_id", "");

    await expect(updateLeadDetailAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard/leads/lead_b_1?error=Lead%20nicht%20gefunden",
    );

    expect(state.companyEqValues).toContain("company_a");
  });

  it("prevents company A from updating lead data of company B", async () => {
    const formData = new FormData();
    formData.set("leadId", "lead_b_2");
    formData.set("status", "contacted");
    formData.set("assigned_user_id", "");

    await expect(updateLeadDetailAction(formData)).rejects.toThrow();
    expect(state.updateCalled).toBe(false);
  });
});