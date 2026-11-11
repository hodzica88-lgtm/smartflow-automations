import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rateLimitAllowed: true,
  signUpResult: { data: { session: null, user: { id: "u1" } }, error: null } as {
    data: { session: unknown; user: unknown };
    error: { code?: string; status?: number } | null;
  },
  signUp: vi.fn(),
  fromCalls: [] as string[],
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
vi.mock("@/features/auth/profile", () => ({ ensureUserProfile: vi.fn(async () => undefined) }));
vi.mock("@/features/onboarding/company", () => ({ getUserCompanyState: vi.fn() }));
vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: vi.fn(async () => ({
    market: "de",
    config: { siteUrl: "https://varnito.de" },
    host: "varnito.de",
  })),
}));
vi.mock("@/shared/lib/rate-limit/service", () => ({
  enforceActionRateLimit: vi.fn(async () => ({ allowed: state.rateLimitAllowed })),
}));
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signUp: state.signUp,
      signOut: vi.fn(),
    },
    from: (table: string) => {
      state.fromCalls.push(table);
      throw new Error("registration must not touch tables");
    },
  })),
}));

const { registerAction } = await import("./actions");
const { ensureUserProfile } = await import("@/features/auth/profile");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const valid = { email: "Neu@Example.com ", password: "geheim12345", consent: "on" };

const run = async (data: FormData) => {
  try {
    await registerAction(data);
  } catch (error) {
    return (error as Error).message;
  }
  return "";
};

describe("registerAction", () => {
  beforeEach(() => {
    state.rateLimitAllowed = true;
    state.fromCalls = [];
    state.signUpResult = { data: { session: null, user: { id: "u1" } }, error: null };
    state.signUp.mockReset();
    state.signUp.mockImplementation(async () => state.signUpResult);
    vi.mocked(ensureUserProfile).mockClear();
  });

  it("rejects invalid email, weak password and missing consent without calling Supabase", async () => {
    expect(await run(form({ ...valid, email: "kaputt" }))).toContain("REDIRECT:/registrierung?error=");
    expect(await run(form({ ...valid, password: "kurz1" }))).toContain("REDIRECT:/registrierung?error=");
    expect(await run(form({ ...valid, password: "nurbuchstaben" }))).toContain("REDIRECT:/registrierung?error=");
    expect(await run(form({ email: valid.email, password: valid.password }))).toContain(
      "REDIRECT:/registrierung?error=",
    );
    expect(state.signUp).not.toHaveBeenCalled();
  });

  it("stops when rate limited", async () => {
    state.rateLimitAllowed = false;

    expect(await run(form(valid))).toContain("REDIRECT:/registrierung?error=");
    expect(state.signUp).not.toHaveBeenCalled();
  });

  it("signs up with a normalized email and confirmation callback, then shows the sent notice", async () => {
    expect(await run(form({ ...valid, source: "google_ads" }))).toBe("REDIRECT:/registrierung?sent=1");

    const args = state.signUp.mock.calls[0][0];
    expect(args.email).toBe("neu@example.com");
    expect(args.options.emailRedirectTo).toBe(
      "https://varnito.de/auth/callback?source=google_ads",
    );
    expect(args.options.data).toBeUndefined();
    expect(ensureUserProfile).not.toHaveBeenCalled();
  });

  it("treats an existing account like a new one (no enumeration)", async () => {
    state.signUpResult = { data: { session: null, user: null }, error: { code: "user_already_exists" } };

    expect(await run(form(valid))).toBe("REDIRECT:/registrierung?sent=1");
  });

  it("maps provider rate limits and failures to error redirects", async () => {
    state.signUpResult = { data: { session: null, user: null }, error: { status: 429 } };
    expect(await run(form(valid))).toContain("REDIRECT:/registrierung?error=");

    state.signUpResult = { data: { session: null, user: null }, error: { code: "unexpected" } };
    expect(await run(form(valid))).toContain("REDIRECT:/registrierung?error=");

    state.signUpResult = { data: { session: null, user: null }, error: { code: "email_address_invalid" } };
    expect(await run(form(valid))).toContain("REDIRECT:/registrierung?error=");
  });

  it("goes to onboarding when a session exists and never touches company or subscription tables", async () => {
    state.signUpResult = { data: { session: {}, user: { id: "u1" } }, error: null };

    expect(await run(form(valid))).toBe("REDIRECT:/onboarding");
    expect(ensureUserProfile).toHaveBeenCalledOnce();
    expect(state.fromCalls).toEqual([]);
  });
});
