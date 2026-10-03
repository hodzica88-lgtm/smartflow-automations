import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  operatorUserEmails: [] as string[],
  operatorUserIds: [] as string[],
  user: { id: "user-1", email: "someone@example.com" } as
    | { id: string; email: string | null }
    | null,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: vi.fn(() => ({
    operatorUserEmails: state.operatorUserEmails,
    operatorUserIds: state.operatorUserIds,
  })),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: state.user,
        },
      })),
    },
  })),
}));

const { getDefaultPostLoginPath, isOperatorUser } = await import("@/features/auth/redirects");
const { requireOperatorUser, requirePrimaryOwnerCustomerPreview } = await import("@/features/operator/access");

describe("requireOperatorUser", () => {
  it("redirects guests to login", async () => {
    state.user = null;
    state.operatorUserEmails = [];
    state.operatorUserIds = [];

    await expect(requireOperatorUser()).rejects.toThrow("REDIRECT:/login?next=%2Foperator%2Fowner");
  });

  it("allows configured operator id", async () => {
    state.user = { id: "operator-id", email: "id@example.com" };
    state.operatorUserIds = ["operator-id"];
    state.operatorUserEmails = [];

    await expect(requireOperatorUser()).resolves.toEqual(state.user);
  });

  it("allows configured operator email", async () => {
    state.user = { id: "user-2", email: "ops@example.com" };
    state.operatorUserIds = [];
    state.operatorUserEmails = ["ops@example.com"];

    await expect(requireOperatorUser()).resolves.toEqual(state.user);
  });

  it("always allows primary owner/operator email", async () => {
    state.user = { id: "user-3", email: "hodzica88@gmail.com" };
    state.operatorUserIds = [];
    state.operatorUserEmails = [];

    await expect(requireOperatorUser()).resolves.toEqual(state.user);
  });

  it("blocks non-operator users", async () => {
    state.user = { id: "user-4", email: "blocked@example.com" };
    state.operatorUserIds = [];
    state.operatorUserEmails = [];

    await expect(requireOperatorUser()).rejects.toThrow("NOT_FOUND");
  });

  it("routes authenticated operators to the owner dashboard by default", () => {
    state.user = { id: "operator-id", email: "ops@example.com" };
    state.operatorUserIds = ["operator-id"];
    state.operatorUserEmails = [];

    expect(isOperatorUser(state.user)).toBe(true);
    expect(getDefaultPostLoginPath(state.user)).toBe("/operator/owner");
  });
});

describe("requirePrimaryOwnerCustomerPreview", () => {
  it("allows the primary owner account to access the customer dashboard preview", async () => {
    state.user = { id: "user-3", email: "hodzica88@gmail.com" };
    state.operatorUserIds = [];
    state.operatorUserEmails = [];

    await expect(requirePrimaryOwnerCustomerPreview()).resolves.toEqual(state.user);
  });

  it("blocks non-primary owner operator users from the customer preview", async () => {
    state.user = { id: "operator-id", email: "ops@example.com" };
    state.operatorUserIds = ["operator-id"];
    state.operatorUserEmails = [];

    await expect(requirePrimaryOwnerCustomerPreview()).rejects.toThrow("NOT_FOUND");
  });
});
