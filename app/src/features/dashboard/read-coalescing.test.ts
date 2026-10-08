import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = { data: unknown; count?: number; error: Error | null };
type PendingQuery = {
  table: string;
  filters: Record<string, unknown>;
  resolve: (result: QueryResult) => void;
  settled: boolean;
};

const state = vi.hoisted(() => ({ queries: [] as PendingQuery[] }));

vi.mock("next/cache", () => ({ unstable_cache: (load: unknown) => load }));
vi.mock("@/shared/lib/stripe/server", () => ({ createStripeServerClient: vi.fn() }));
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceRoleClient: () => ({
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let pending: Promise<QueryResult> | undefined;
      const execute = () => {
        pending ??= new Promise<QueryResult>((resolve) => {
          state.queries.push({ table, filters: { ...filters }, resolve, settled: false });
        });
        return pending;
      };
      const query = {
        select: () => query,
        eq(column: string, value: unknown) { filters[column] = value; return query; },
        is: () => query,
        in: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: execute,
        then: (...args: Parameters<Promise<QueryResult>["then"]>) => execute().then(...args),
      };
      return query;
    },
  }),
}));

const { getCompanyBillingSnapshot } = await import("@/features/billing/service");
const { getCompanyTeamMembers } = await import("@/features/team/service");
const { getCompanyUnreadNotificationCount } = await import("@/features/notifications/service");
const { getUserCompanyState } = await import("@/features/onboarding/company");

const defaultResult = (query: PendingQuery): QueryResult => {
  if (query.table === "companies") {
    return { data: { id: query.filters.id, owner_user_id: "owner" }, error: null };
  }
  if (query.table === "users" && !query.filters.id) {
    return { data: [{ id: "owner", email: "owner@example.test", role: "owner", team_status: "active", created_at: "2026-01-01" }], error: null };
  }
  return { data: null, count: 7, error: null };
};

const settleQueries = (result = defaultResult) => {
  for (const query of state.queries.filter((entry) => !entry.settled)) {
    query.settled = true;
    query.resolve(result(query));
  }
};

const loaders = [
  { name: "billing", load: (key: string) => getCompanyBillingSnapshot(key), queriesPerRead: 1, filter: "company_id" },
  { name: "team", load: (key: string) => getCompanyTeamMembers(key), queriesPerRead: 2, filter: "id" },
  { name: "notifications", load: (key: string) => getCompanyUnreadNotificationCount(key), queriesPerRead: 1, filter: "company_id" },
  { name: "user/company access", load: (key: string) => getUserCompanyState(key), queriesPerRead: 1, filter: "id" },
] as const;

describe("concurrent dashboard reads", () => {
  beforeEach(() => { state.queries = []; });

  for (const loader of loaders) {
    it(`${loader.name}: shares overlapping reads and reloads after completion`, async () => {
      const waiters = Array.from({ length: 100 }, () => loader.load("tenant_a"));
      await vi.waitFor(() => expect(state.queries).toHaveLength(loader.queriesPerRead));
      settleQueries();
      const results = await Promise.all(waiters);
      for (const result of results) { expect(result).toEqual(results[0]); }

      const fresh = loader.load("tenant_a");
      await vi.waitFor(() => expect(state.queries).toHaveLength(loader.queriesPerRead * 2));
      settleQueries();
      await fresh;
    });

    it(`${loader.name}: keeps different tenant/user keys separate`, async () => {
      const first = loader.load("tenant_a");
      const second = loader.load("tenant_b");
      await vi.waitFor(() => expect(state.queries).toHaveLength(loader.queriesPerRead * 2));
      const keys = state.queries.map((query) => query.filters[loader.filter]).filter(Boolean);
      expect(keys).toContain("tenant_a");
      expect(keys).toContain("tenant_b");
      settleQueries();
      await Promise.all([first, second]);
    });

    it(`${loader.name}: propagates failure to every waiter and permits a fresh retry`, async () => {
      const failure = new Error("Supabase unavailable");
      const results = Promise.allSettled(Array.from({ length: 10 }, () => loader.load("tenant_a")));
      await vi.waitFor(() => expect(state.queries).toHaveLength(loader.queriesPerRead));
      settleQueries(() => ({ data: null, error: failure }));
      for (const result of await results) {
        expect(result).toEqual({ status: "rejected", reason: failure });
      }
      const retry = loader.load("tenant_a");
      await vi.waitFor(() => expect(state.queries).toHaveLength(loader.queriesPerRead * 2));
      settleQueries();
      await retry;
    });
  }

  it("does not share member-allowed and owner-only authorization results", async () => {
    const ownerOnly = getUserCompanyState("member_a");
    const memberAllowed = getUserCompanyState("member_a", { allowMember: true });
    expect(state.queries).toHaveLength(2);
    settleQueries(() => ({ data: { default_company_id: "tenant_a", role: "member", team_status: "active" }, error: null }));
    await vi.waitFor(() => expect(state.queries).toHaveLength(4));
    settleQueries(() => ({ data: { id: "tenant_a", owner_user_id: "owner_a" }, error: null }));
    expect((await ownerOnly).companyId).toBeNull();
    expect((await memberAllowed).companyId).toBe("tenant_a");
  });

  it("preserves explicit billing evaluation times instead of coalescing them", async () => {
    const beforeExpiry = getCompanyBillingSnapshot("tenant_a", new Date("2026-10-08T10:00:00Z"));
    const afterExpiry = getCompanyBillingSnapshot("tenant_a", new Date("2026-10-08T12:00:00Z"));
    expect(state.queries).toHaveLength(2);
    settleQueries(() => ({ data: { company_id: "tenant_a", status: "trialing", trial_ends_at: "2026-10-08T11:00:00Z" }, error: null }));
    expect((await beforeExpiry).hasAppAccess).toBe(true);
    expect((await afterExpiry).hasAppAccess).toBe(false);
  });

  it("reads revoked membership again after the earlier access read completes", async () => {
    const readMembership = async (teamStatus: "active" | "pending") => {
      const result = getUserCompanyState("member_a", { allowMember: true });
      settleQueries(() => ({ data: { default_company_id: "tenant_a", role: "member", team_status: teamStatus }, error: null }));
      await vi.waitFor(() => expect(state.queries.some((query) => !query.settled && query.table === "companies")).toBe(true));
      settleQueries(() => ({ data: { id: "tenant_a", owner_user_id: "owner_a" }, error: null }));
      return result;
    };

    expect((await readMembership("active")).companyId).toBe("tenant_a");
    expect((await readMembership("pending")).companyId).toBeNull();
    expect(state.queries).toHaveLength(4);
  });
});
