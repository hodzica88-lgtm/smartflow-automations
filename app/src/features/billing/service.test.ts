import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/features/onboarding/company", () => ({
  getUserCompanyState: vi.fn(),
}));

vi.mock("@/shared/lib/stripe/server", () => ({
  createStripeServerClient: vi.fn(),
}));

const {
  getBillingLockReason,
  getPlannedCancellationDate,
  hasBillingAccess,
  isCancellationPlanned,
} = await import("./service");

describe("billing access", () => {
  it("allows active subscriptions", () => {
    expect(
      hasBillingAccess({
        cancelAt: null,
        cancelAtPeriodEnd: false,
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
        cancelAt: null,
        cancelAtPeriodEnd: false,
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
        cancelAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        status: "trialing",
        trialEndsAt: past,
      }),
    ).toBe(false);

    expect(
      getBillingLockReason({
        cancelAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        status: "trialing",
        trialEndsAt: past,
      }),
    ).toBe("trial_expired");
  });

  it("blocks payment failures", () => {
    expect(
      getBillingLockReason({
        cancelAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        status: "past_due",
        trialEndsAt: null,
      }),
    ).toBe("payment_required");

    expect(
      getBillingLockReason({
        cancelAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        status: "unpaid",
        trialEndsAt: null,
      }),
    ).toBe("payment_required");
  });

  it("treats future cancel_at as planned cancellation", () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    expect(
      isCancellationPlanned({
        cancelAt: future,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toBe(true);

    expect(
      getPlannedCancellationDate({
        cancelAt: future,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toBe(future);

    expect(
      hasBillingAccess({
        cancelAt: future,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        status: "canceled",
        trialEndsAt: null,
      }),
    ).toBe(true);
  });

  it("uses current period end for cancel_at_period_end planning", () => {
    const futurePeriodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(
      isCancellationPlanned({
        cancelAt: null,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: futurePeriodEnd,
      }),
    ).toBe(true);

    expect(
      getPlannedCancellationDate({
        cancelAt: null,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: futurePeriodEnd,
      }),
    ).toBe(futurePeriodEnd);
  });
});