import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  exchange: vi.fn(),
  verify: vi.fn(),
}));

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
    },
  })),
}));

const { GET } = await import("./route");

const call = (query: string) =>
  GET({ nextUrl: new URL(`https://varnito.de/auth/recovery${query}`) } as never);

describe("auth recovery callback", () => {
  beforeEach(() => {
    state.exchange.mockReset();
    state.verify.mockReset();
  });

  it("opens the reset page after a valid code and ignores foreign redirect targets", async () => {
    state.exchange.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });

    const response = await call("?code=abc&next=https://evil.example&redirect_to=//evil.example");

    expect(response.headers.get("location")).toBe("https://varnito.de/reset-password");
  });

  it("accepts a recovery token hash only for the recovery type", async () => {
    state.verify.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });

    const ok = await call("?token_hash=h&type=recovery");
    expect(ok.headers.get("location")).toBe("https://varnito.de/reset-password");

    const bad = await call("?token_hash=h&type=signup");
    expect(bad.headers.get("location")).toContain("/forgot-password?error=");
    expect(state.verify).toHaveBeenCalledOnce();
  });

  it("shows an understandable error for invalid, expired or missing links", async () => {
    state.exchange.mockResolvedValue({ data: { session: null }, error: { message: "expired" } });

    const expired = await call("?code=old");
    expect(expired.headers.get("location")).toContain("/forgot-password?error=");
    expect(decodeURIComponent(expired.headers.get("location") ?? "")).toContain("abgelaufen");

    state.exchange.mockRejectedValue(new Error("network"));
    const thrown = await call("?code=x");
    expect(thrown.headers.get("location")).toContain("/forgot-password?error=");

    const missing = await call("");
    expect(missing.headers.get("location")).toContain("/forgot-password?error=");
  });
});
