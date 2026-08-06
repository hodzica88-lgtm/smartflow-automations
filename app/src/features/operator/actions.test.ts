import { describe, expect, it, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  operator: { id: "operator-1", email: "ops@example.com" } as { id: string; email: string | null },
  previewResult: {
    subtotalCents: 39900,
    taxCents: 3310,
    totalCents: 43210,
    checkoutUrl: "https://checkout.stripe.test/session_preview_1",
    expiresAt: "2026-08-06T19:00:00.000Z",
  },
  auditLogPayload: null as Record<string, unknown> | null,
  previewCallCount: 0,
  rateLimitAllowed: true,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/operator/access", () => ({
  requireOperatorUser: vi.fn(async () => state.operator),
}));

vi.mock("@/shared/lib/rate-limit/service", () => ({
  enforceActionRateLimit: vi.fn(async () => ({ allowed: state.rateLimitAllowed })),
}));

vi.mock("@/features/billing/tax-preview", () => ({
  createUsCheckoutTaxPreview: vi.fn(async () => {
    state.previewCallCount += 1;
    return state.previewResult;
  }),
}));

vi.mock("@/features/audit-log/service", () => ({
  recordCompanyAuditLog: vi.fn(async (payload: Record<string, unknown>) => {
    state.auditLogPayload = payload;
  }),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => ({
    from() {
      return {
        update() {
          return {
            async eq() {
              return { error: null };
            },
          };
        },
      };
    },
  })),
}));

const { createUsCheckoutTaxPreviewAction } = await import("./actions");

describe("createUsCheckoutTaxPreviewAction", () => {
  beforeEach(() => {
    state.auditLogPayload = null;
    state.previewCallCount = 0;
    state.rateLimitAllowed = true;
  });

  const buildFormData = () => {
    const formData = new FormData();
    formData.set("company_id", "company-1");
    formData.set("address_line1", "920 5th Ave");
    formData.set("city", "Seattle");
    formData.set("state", "WA");
    formData.set("postal_code", "98104");
    return formData;
  };

  it("creates an operator-only tax preview and audits it", async () => {
    await expect(createUsCheckoutTaxPreviewAction(buildFormData())).rejects.toThrow(
      "REDIRECT:/operator/companies/company-1?taxPreviewSubtotal=39900&taxPreviewTax=3310&taxPreviewTotal=43210&taxPreviewUrl=https%3A%2F%2Fcheckout.stripe.test%2Fsession_preview_1&taxPreviewExpiresAt=2026-08-06T19%3A00%3A00.000Z",
    );

    expect(state.previewCallCount).toBe(1);
    expect(state.auditLogPayload).toMatchObject({
      companyId: "company-1",
      action: "us_checkout_tax_preview_created",
    });
  });

  it("blocks preview when rate limited", async () => {
    state.rateLimitAllowed = false;

    await expect(createUsCheckoutTaxPreviewAction(buildFormData())).rejects.toThrow(
      "REDIRECT:/operator/companies/company-1?taxPreviewError=Too+many+preview+requests.+Please+try+again+later.",
    );

    expect(state.previewCallCount).toBe(0);
  });
});