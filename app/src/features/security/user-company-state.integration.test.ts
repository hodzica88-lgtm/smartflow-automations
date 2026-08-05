import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  companyLookupById: null as { id: string; owner_user_id: string } | null,
  fallbackOwnerCompany: null as { id: string } | null,
  profile: {
    default_company_id: "company_b",
    role: "owner",
    team_status: "active",
  } as {
    default_company_id: string | null;
    role: string | null;
    team_status: string | null;
  },
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      if (table === "users") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: state.profile, error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "companies") {
        return {
          select() {
            return {
              eq(column: string) {
                if (column === "id") {
                  return {
                    is() {
                      return {
                        async maybeSingle() {
                          return { data: state.companyLookupById, error: null };
                        },
                      };
                    },
                  };
                }

                return {
                  is() {
                    return {
                      limit() {
                        return {
                          async maybeSingle() {
                            return { data: state.fallbackOwnerCompany, error: null };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

const { getUserCompanyState } = await import("@/features/onboarding/company");

describe("tenant isolation: user-company mapping", () => {
  beforeEach(() => {
    state.profile = {
      default_company_id: "company_b",
      role: "owner",
      team_status: "active",
    };
    state.companyLookupById = { id: "company_b", owner_user_id: "owner_b" };
    state.fallbackOwnerCompany = null;
  });

  it("blocks manipulated default_company_id that does not belong to the user", async () => {
    const result = await getUserCompanyState("owner_a");

    expect(result.companyId).toBeNull();
    expect(result.isOwner).toBe(false);
  });
});