import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/features/onboarding/company", () => ({
  getUserCompanyState: vi.fn(),
}));

const { getBillingLockReason, hasBillingAccess } = await import("./service");

describe("billing access", () => {
  it("allows active subscriptions", () => {
    expect(
      hasBillingAccess({
        currentPeriodEnd: null,
        status: "active",
        trialEndsAt: null,
      }),
    ).toBe(true);
  });

  it("allows trialing companies until trial end", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    expect(
      hasBillingAccess({
        currentPeriodEnd: null,
        status: "trialing",
        trialEndsAt: future,
      }),
    ).toBe(true);
  });

  it("blocks expired trials", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    expect(
      hasBillingAccess({
        currentPeriodEnd: null,
        status: "trialing",
        trialEndsAt: past,
      }),
    ).toBe(false);

    expect(
      getBillingLockReason({
        currentPeriodEnd: null,
        status: "trialing",
        trialEndsAt: past,
      }),
    ).toBe("trial_expired");
  });

  it("blocks payment failures", () => {
    expect(
      getBillingLockReason({
        currentPeriodEnd: null,
        status: "past_due",
        trialEndsAt: null,
      }),
    ).toBe("payment_required");

    expect(
      getBillingLockReason({
        currentPeriodEnd: null,
        status: "unpaid",
        trialEndsAt: null,
      }),
    ).toBe("payment_required");
  });
});