import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  exchange: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("@/features/auth/profile", () => ({ ensureUserProfile: vi.fn(async () => undefined) }));
vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: vi.fn(async () => ({
    market: "de",
    config: { siteUrl: "https://varnito.de" },
    host: "varnito.de",
  })),
}));
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: state.exchange,
      verifyOtp: state.verify,
      signOut: vi.fn(),
    },
  })),
}));

const { GET } = await import("./route");
const { ensureUserProfile } = await import("@/features/auth/profile");

const call = (query: string) =>
  GET({ nextUrl: new URL(`https://varnito.de/auth/callback${query}`) } as never);

describe("auth callback", () => {
  beforeEach(() => {
    state.exchange.mockReset();
    state.verify.mockReset();
    vi.mocked(ensureUserProfile).mockClear();
  });

  it("confirms via code and always redirects to onboarding", async () => {
    state.exchange.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const response = await call("?code=abc&source=ads&next=https://evil.example");

    expect(response.headers.get("location")).toBe("https://varnito.de/onboarding?source=ads");
    expect(ensureUserProfile).toHaveBeenCalledOnce();
  });

  it("confirms via token hash for signup only", async () => {
    state.verify.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const ok = await call("?token_hash=h&type=signup");
    expect(ok.headers.get("location")).toBe("https://varnito.de/onboarding");

    const bad = await call("?token_hash=h&type=recovery");
    expect(bad.headers.get("location")).toContain("/login?error=");
    expect(state.verify).toHaveBeenCalledOnce();
  });

  it("redirects to login for invalid or missing links", async () => {
    state.exchange.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });

    expect((await call("?code=bad")).headers.get("location")).toContain("/login?error=");
    expect((await call("")).headers.get("location")).toContain("/login?error=");
    expect(ensureUserProfile).not.toHaveBeenCalled();
  });
});
