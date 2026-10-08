import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { runFixture } from "./capacity-fixture.mjs";

const environment = { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-test-key", SUPABASE_SERVICE_ROLE_KEY: "private-test-key" };

function harness() {
  const run_id = randomUUID();
  const companies = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(), marker: `Capacity-${run_id}-C${index + 1}`,
    users: Array.from({ length: 10 }, (_, member) => ({ id: randomUUID(),
      email: `fixture-${index}-${member}@example.com`, role: member ? "member" : "owner" })),
    leads: Array.from({ length: 500 }, () => randomUUID()),
  }));
  const ledger = { version: 1, run_id, companies };
  const tables = Object.fromEntries(["users", "companies", "leads", "settings", "subscriptions", "lead_status_history"].map((table) => [table, []]));
  const auth = new Map();
  const actions = [];
  let mutations = 0;
  let failNextLeadInsert = false;
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
  const request = async (raw, options = {}) => {
    const url = new URL(raw);
    const method = options.method || "GET";
    if (url.hostname.startsWith("172.")) {
      assert.equal(options.headers.Host, "varnito.com");
      if (method === "GET") return new Response(`<form method="post"><input name="$ACTION_ID_abc" value=""/><input name="leadId" value="${companies[0].leads[0]}"/>${companies[0].marker}</form>`);
      // Use native HTTP serialization/parsing, rather than treating URLSearchParams
      // as an accepted action payload. The previous mock masked a real Next.js error.
      assert.ok(options.body instanceof FormData);
      assert.equal(options.headers["Content-Type"], undefined);
      const wire = new Request(raw, options);
      assert.match(wire.headers.get("content-type"), /^multipart\/form-data; boundary=/);
      const body = await wire.formData();
      assert.equal(body.get("leadId"), companies[0].leads[0]);
      assert.equal(body.get("status"), "new");
      assert.equal(body.get("assigned_user_id"), "");
      assert.ok(body.has("$ACTION_ID_abc"));
      actions.push(url.hostname);
      return new Response(null, { status: 303, headers: { location: "/dashboard/leads?success=1" } });
    }
    const body = options.body === undefined ? null : JSON.parse(options.body);
    if (url.pathname === "/auth/v1/token") return json({ user: { id: companies[0].users[0].id }, access_token: "synthetic-token" });
    assert.equal(options.headers.Authorization, "Bearer private-test-key");
    if (url.pathname.startsWith("/auth/v1/admin/users")) {
      const id = url.pathname.split("/")[5];
      if (method === "GET") return auth.has(id) ? json(auth.get(id)) : json({}, 404);
      mutations++;
      if (method === "POST") {
        assert.equal(body.email_confirm, true);
        assert.equal(body.password, "synthetic-password");
        const account = { id: body.id, email: body.email, app_metadata: body.app_metadata };
        auth.set(body.id, account);
        return json(account);
      }
      if (!auth.has(id)) return json({}, 404);
      auth.delete(id);
      tables.users = tables.users.filter((user) => user.id !== id);
      return json({});
    }
    const table = url.pathname.split("/")[3];
    const matches = (row) => [...url.searchParams.entries()].every(([field, value]) =>
      !value.startsWith("eq.") || String(row[field]) === value.slice(3));
    if (method === "GET") {
      let found = tables[table].filter(matches);
      if (url.searchParams.has("order")) found = found.sort((a, b) => a.id.localeCompare(b.id));
      const offset = Number(url.searchParams.get("offset") || 0);
      const limit = Number(url.searchParams.get("limit") || 1000);
      return json(found.slice(offset, offset + limit));
    }
    mutations++;
    if (method === "POST") {
      if (table === "leads" && failNextLeadInsert) { failNextLeadInsert = false; return json({}, 500); }
      const records = Array.isArray(body) ? body : [body];
      tables[table].push(...records.map((row) => ({ default_company_id: null, ...row })));
      return json(records);
    }
    if (method === "PATCH") {
      tables[table].filter(matches).forEach((row) => Object.assign(row, body));
      return json([]);
    }
    const deleted = new Set(tables[table].filter(matches).map((row) => row.id));
    tables[table] = tables[table].filter((row) => !deleted.has(row.id));
    if (table === "companies") {
      for (const related of ["leads", "settings", "subscriptions", "lead_status_history"]) {
        tables[related] = tables[related].filter((row) => !deleted.has(row.company_id));
      }
      tables.users.forEach((user) => { if (deleted.has(user.default_company_id)) user.default_company_id = null; });
    }
    return json([]);
  };
  const invoke = (action) => runFixture({ action, ledger, password: "synthetic-password",
    replicas: Array.from({ length: 4 }, (_, index) => ({ name: `replica-${index}`, url: `http://172.18.0.${index + 2}:3000/dashboard/leads` })) }, request, environment);
  return { ledger, tables, auth, actions, invoke, mutations: () => mutations,
    failLeadInsert: () => { failNextLeadInsert = true; } };
}

test("populated fixture, direct cross-replica actions, and exact cleanup", async () => {
  const h = harness();
  const fixture = await h.invoke("seed");
  assert.equal(fixture.accounts.length, 50);
  assert.equal(new Set(fixture.accounts.map((account) => account.user_id)).size, 50);
  assert.equal(new Set(fixture.accounts.slice(0, 5).map((account) => account.marker)).size, 5);
  assert.equal(h.tables.leads.length, 2500);
  assert.equal(h.tables.lead_status_history.length, 4375);
  assert.deepEqual(h.actions, ["172.18.0.2", "172.18.0.3", "172.18.0.4", "172.18.0.5"]);
  assert.ok(h.tables.settings.every((settings) => !settings.brevo_enabled && !settings.make_enabled && !settings.stripe_enabled));
  // A real unrelated company/account/lead must survive cleanup.
  h.tables.companies.push({ id: "unrelated-company", name: "Customer", owner_user_id: "unrelated-user" });
  h.tables.leads.push({ id: "unrelated-lead", company_id: "unrelated-company", source: "website" });
  h.auth.set("unrelated-user", { email: "customer@example.org" });
  assert.equal((await h.invoke("cleanup")).cleaned, true);
  assert.deepEqual(h.tables.companies.map((row) => row.id), ["unrelated-company"]);
  assert.deepEqual(h.tables.leads.map((row) => row.id), ["unrelated-lead"]);
  assert.deepEqual([...h.auth.keys()], ["unrelated-user"]);
  assert.equal((await h.invoke("cleanup")).cleaned, true);
});

test("partial provisioning failure can be cleaned from preallocated IDs", async () => {
  const h = harness();
  h.failLeadInsert();
  await assert.rejects(h.invoke("seed"), /HTTP 500/);
  assert.equal(h.auth.size, 10);
  await h.invoke("cleanup");
  assert.equal(h.auth.size, 0);
  assert.equal(h.tables.companies.length, 0);
});

test("ID collision refuses provisioning without mutations", async () => {
  const h = harness();
  h.auth.set(h.ledger.companies[0].users[0].id, { email: "customer@example.org" });
  await assert.rejects(h.invoke("seed"), /collision/);
  assert.equal(h.mutations(), 0);
  await assert.rejects(h.invoke("cleanup"), /auth identity/);
  assert.equal(h.mutations(), 0);
});

for (const [name, change, reason] of [
  ["changed auth identity", (h) => { h.auth.get(h.ledger.companies[0].users[0].id).app_metadata = {}; }, /auth identity/],
  ["renamed company", (h) => { h.tables.companies[0].name = "Customer"; }, /company does not match/],
  ["foreign member", (h) => { h.tables.users.push({ id: "foreign-user", default_company_id: h.ledger.companies[0].id }); }, /unknown company member/],
  ["foreign lead beyond first page", (h) => { h.tables.leads.push({ id: "zz-foreign-lead", company_id: h.ledger.companies[0].id, source: "website" }); }, /unknown company lead/],
  ["user moved to foreign company", (h) => { h.tables.users[0].default_company_id = "foreign-company"; }, /profile changed/],
]) {
  test(`cleanup refuses ${name} before deleting any resource`, async () => {
    const h = harness();
    await h.invoke("seed");
    change(h);
    const before = h.mutations();
    await assert.rejects(h.invoke("cleanup"), reason);
    assert.equal(h.mutations(), before);
  });
}
