import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  reset: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  rateLimitAllowed: true,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/features/analytics/events", () => ({ trackAnalyticsEvent: vi.fn() }));
vi.mock("@/features/billing/service", () => ({
  BILLING_ROUTE: "/dashboard/billing",
  getCompanyBillingSnapshot: vi.fn(),
}));
vi.mock("@/features/auth/profile", () => ({ ensureUserProfile: vi.fn() }));
vi.mock("@/features/onboarding/company", () => ({ getUserCompanyState: vi.fn() }));
vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: vi.fn(async () => ({
    market: "de",
    config: { siteUrl: "https://varnito.de", code: "de" },
    host: "varnito.de",
  })),
}));
vi.mock("@/shared/lib/rate-limit/service", () => ({
  enforceActionRateLimit: vi.fn(async () => ({ allowed: state.rateLimitAllowed })),
}));
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      resetPasswordForEmail: state.reset,
      getUser: state.getUser,
      updateUser: state.updateUser,
      signOut: state.signOut,
    },
  })),
}));

const { forgotPasswordAction, resetPasswordAction } = await import("./actions");

const run = async () => {
  const data = new FormData();
  data.set("email", "kunde@firma.de");
  try {
    await forgotPasswordAction(data);
  } catch (error) {
    return (error as Error).message;
  }
  return "";
};

describe("forgotPasswordAction", () => {
  beforeEach(() => {
    state.reset.mockReset();
    vi.restoreAllMocks();
  });

  it("stays neutral and logs a redacted error when sending fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    state.reset.mockResolvedValue({
      error: { code: "unexpected_failure", status: 500, name: "AuthApiError", message: "Error sending recovery email to kunde@firma.de" },
    });

    expect(await run()).toBe("REDIRECT:/forgot-password?sent=1");
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = String(spy.mock.calls[0][0]);
    expect(logged).toContain("unexpected_failure");
    expect(logged).not.toContain("kunde@firma.de");
  });

  it("does not log on success", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    state.reset.mockResolvedValue({ error: null });

    expect(await run()).toBe("REDIRECT:/forgot-password?sent=1");
    expect(spy).not.toHaveBeenCalled();
    expect(state.reset).toHaveBeenCalledWith("kunde@firma.de", {
      redirectTo: "https://varnito.de/auth/recovery",
    });
  });
});

describe("resetPasswordAction", () => {
  const runReset = async (password: string, confirm = password) => {
    const data = new FormData();
    data.set("password", password);
    data.set("confirmPassword", confirm);
    try {
      await resetPasswordAction(data);
    } catch (error) {
      return decodeURIComponent((error as Error).message.replace(/\+/g, " "));
    }
    return "";
  };

  beforeEach(() => {
    state.getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
    state.updateUser.mockReset().mockResolvedValue({ error: null });
    state.signOut.mockReset().mockResolvedValue({ error: null });
    state.rateLimitAllowed = true;
  });

  it("saves a valid new password, signs out everywhere and sends the user to login", async () => {
    expect(await runReset("neuesPasswort123")).toBe("REDIRECT:/login?reset=1");
    expect(state.updateUser).toHaveBeenCalledWith({ password: "neuesPasswort123" });
    expect(state.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("requires a valid recovery session", async () => {
    state.getUser.mockResolvedValue({ data: { user: null } });

    expect(await runReset("neuesPasswort123")).toContain("REDIRECT:/forgot-password?error=");
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it("rejects weak and mismatching passwords", async () => {
    expect(await runReset("kurz1")).toContain("REDIRECT:/reset-password?error=");
    expect(await runReset("neuesPasswort123", "andereEingabe123")).toContain("nicht überein");
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it("maps same-password and other Supabase failures to clear messages", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    state.updateUser.mockResolvedValue({ error: { code: "same_password", status: 422, message: "x" } });
    expect(await runReset("neuesPasswort123")).toContain("unterscheiden");

    state.updateUser.mockResolvedValue({ error: { code: "session_expired", status: 401, message: "x" } });
    expect(await runReset("neuesPasswort123")).toContain("nicht geändert");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(state.signOut).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    state.rateLimitAllowed = false;

    expect(await runReset("neuesPasswort123")).toContain("Zu viele");
    expect(state.updateUser).not.toHaveBeenCalled();
  });
});
