import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("@/shared/config/env", () => ({
  publicEnv: {
    appUrl: "http://localhost:3000",
  },
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: { id: "member_user_1" },
        },
      })),
    },
  })),
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/features/onboarding/company", () => ({
  getUserCompanyState: vi.fn(async () => ({
    companyId: "company_a",
    isOwner: false,
    role: "member",
    teamStatus: "active",
  })),
}));

const { inviteTeamMemberAction } = await import("@/features/team/actions");

describe("tenant isolation: owner-only server actions", () => {
  it("blocks member from owner team action", async () => {
    const formData = new FormData();
    formData.set("email", "member@example.com");

    await expect(inviteTeamMemberAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard/leads",
    );
  });
});