// Executed on stdin inside the existing app. Service-role credentials stay there.
export async function runFixture(input, request = fetch, environment = process.env) {
  const { action, ledger, password } = input;
  const base = environment.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = environment.SUPABASE_SERVICE_ROLE_KEY;
  const anon = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key || !anon) throw new Error("Required server credentials missing");
  if (ledger.version !== 1 || ledger.companies.length !== 5) throw new Error("Invalid ledger");
  const api = async (path, method = "GET", body, allow404 = false) => {
    const response = await request(`${base}${path}`, {
      method, headers: { apikey: key, Authorization: `Bearer ${key}`,
        "Content-Type": "application/json", Prefer: "return=representation" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`Server API ${method} ${path.split("?")[0]}: HTTP ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };
  const rows = (table, filter, select = "*") =>
    api(`/rest/v1/${table}?${filter}&select=${select}`);
  const insert = (table, body) => api(`/rest/v1/${table}`, "POST", body);
  const users = ledger.companies.flatMap((company) => company.users);
  const userIds = new Set(users.map((user) => user.id));
  const companyIds = new Set(ledger.companies.map((company) => company.id));

  if (action === "seed") {
    // Refuse collisions before creating anything; no upsert can overwrite an account.
    for (const company of ledger.companies) {
      if ((await rows("companies", `id=eq.${company.id}`, "id")).length) throw new Error("Company ID collision");
      for (const user of company.users) {
        if (await api(`/auth/v1/admin/users/${user.id}`, "GET", undefined, true)) throw new Error("Auth ID collision");
      }
    }
    const now = Date.now();
    const start = new Date(now).toISOString();
    const end = new Date(now + 86400000).toISOString();
    for (const company of ledger.companies) {
      for (const user of company.users) {
        const created = await api("/auth/v1/admin/users", "POST", {
          id: user.id, email: user.email, password, email_confirm: true,
          app_metadata: { capacity_run_id: ledger.run_id },
        });
        if (created.id !== user.id) throw new Error("Auth did not preserve the planned ID");
        await insert("users", { ...user, full_name: company.marker,
          team_status: "active" });
      }
      await insert("companies", { id: company.id, name: company.marker,
        owner_user_id: company.users[0].id, contact_person: "Synthetic capacity test",
        email: company.users[0].email, timezone: "America/New_York" });
      await insert("settings", { company_id: company.id, brevo_enabled: false,
        make_enabled: false, stripe_enabled: false, lead_auto_assign_enabled: false });
      await insert("subscriptions", { company_id: company.id, status: "trialing",
        trial_started_at: start, trial_ends_at: end, trial_used_at: start,
        current_period_start: start, current_period_end: end });
      for (const user of company.users) {
        await api(`/rest/v1/users?id=eq.${user.id}`, "PATCH", { default_company_id: company.id });
      }
      const statuses = ["new", "contacted", "successful", "unsuccessful"];
      const leads = company.leads.map((id, index) => ({
        id, company_id: company.id, first_name: company.marker, last_name: `Lead ${index + 1}`,
        email: `lead-${index}-${company.id}@example.com`, source: "capacity_fixture",
        status: statuses[index % 4], priority: index % 3 === 0 ? "high" : "normal",
        notes: "Synthetic inquiry with a populated history for dashboard capacity validation.",
        inquiry_type: "Kapazitätstest", assigned_user_id: index % 5 === 0 ? null : company.users[index % 10].id,
        successful_outcome: index % 4 === 2 ? "job_won" : null,
        unsuccessful_outcome: index % 4 === 3 ? "other" : null,
        created_at: new Date(now - index * 60000).toISOString(),
      }));
      const history = leads.flatMap((lead) => [
        { company_id: company.id, lead_id: lead.id, changed_by_user_id: company.users[0].id,
          from_status: null, to_status: "new", created_at: lead.created_at },
        ...(lead.status === "new" ? [] : [{ company_id: company.id, lead_id: lead.id,
          changed_by_user_id: company.users[0].id, from_status: "new", to_status: lead.status,
          created_at: new Date(Date.parse(lead.created_at) + 1000).toISOString() }]),
      ]);
      for (let offset = 0; offset < leads.length; offset += 100) await insert("leads", leads.slice(offset, offset + 100));
      for (let offset = 0; offset < history.length; offset += 100) await insert("lead_status_history", history.slice(offset, offset + 100));
    }
    // Submit a primary-generated, unchanged Server Action directly to every replica.
    // It exercises the shared build/action key without notifications or data changes.
    const probeCompany = ledger.companies[0];
    const login = await request(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email: probeCompany.users[0].email, password }),
      signal: AbortSignal.timeout(30000),
    });
    if (!login.ok) throw new Error(`Replica action login: HTTP ${login.status}`);
    const session = await login.json();
    if (session.user?.id !== probeCompany.users[0].id) throw new Error("Replica action session mismatch");
    const ref = new URL(base).hostname.split(".")[0];
    const encoded = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
    const cookies = [];
    for (let offset = 0; offset < encoded.length; offset += 3180) {
      cookies.push(`sb-${ref}-auth-token${encoded.length > 3180 ? `.${offset / 3180}` : ""}=${encoded.slice(offset, offset + 3180)}`);
    }
    const headers = { Cookie: cookies.join("; "), Host: "varnito.com",
      Origin: "https://varnito.com", "X-Forwarded-Host": "varnito.com", "X-Forwarded-Proto": "https" };
    if (input.replicas?.length !== 4) throw new Error("Replica addresses missing");
    const page = await request(input.replicas[0].url, {
      headers, redirect: "manual", signal: AbortSignal.timeout(30000),
    });
    const html = await page.text();
    if (page.status !== 200 || !html.includes(probeCompany.marker)) throw new Error("Replica action primary GET failed");
    const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
      .map((match) => match[0]).find((markup) => markup.includes(probeCompany.leads[0]));
    if (!form) throw new Error("Replica action form missing");
    const decode = (value) => value.replace(/&(?:quot|amp|lt|gt|apos|#\d+|#x[0-9a-f]+);/gi, (entity) => {
      const names = { "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&apos;": "'" };
      if (names[entity]) return names[entity];
      return String.fromCodePoint(parseInt(entity.slice(entity[2].toLowerCase() === "x" ? 3 : 2, -1),
        entity[2].toLowerCase() === "x" ? 16 : 10));
    });
    const fields = new FormData();
    for (const match of form.matchAll(/<input\b[^>]*>/g)) {
      const name = match[0].match(/\bname="([^"]*)"/)?.[1];
      const value = match[0].match(/\bvalue="([^"]*)"/)?.[1] || "";
      if (name) fields.append(decode(name), decode(value));
    }
    if (fields.get("leadId") !== probeCompany.leads[0] ||
        ![...fields.keys()].some((name) => name.startsWith("$ACTION_"))) throw new Error("Replica action metadata missing");
    fields.set("status", "new");
    fields.set("assigned_user_id", "");
    fields.set("successful_outcome", "");
    fields.set("unsuccessful_outcome", "");
    for (const replica of input.replicas) {
      const result = await request(replica.url, {
        // Native fetch generates multipart/form-data and its matching boundary.
        // URL-encoded MPA actions are ignored by Next.js 16 and return the page.
        method: "POST", headers,
        body: fields, redirect: "manual", signal: AbortSignal.timeout(30000),
      });
      if (result.status !== 303 || !result.headers.get("location")?.endsWith("/dashboard/leads?success=1")) {
        throw new Error(`Replica action on ${replica.name}: HTTP ${result.status}`);
      }
    }
    const unchanged = await rows("leads", `id=eq.${probeCompany.leads[0]}`, "status,assigned_user_id,successful_outcome,unsuccessful_outcome");
    if (unchanged.length !== 1 || unchanged[0].status !== "new" || unchanged[0].assigned_user_id !== null ||
        unchanged[0].successful_outcome !== null || unchanged[0].unsuccessful_outcome !== null) {
      throw new Error("Replica action unexpectedly changed the probe lead");
    }
    // Interleave companies, so round-robin traffic covers owners and members evenly.
    return { run_id: ledger.run_id, supabase_url: base, anon_key: anon,
      base_url: "https://varnito.com", replica_actions_checked: 4,
      markers: ledger.companies.map((company) => company.marker),
      accounts: Array.from({ length: 10 }, (_, member) => ledger.companies.map((company) => ({
        email: company.users[member].email, password, marker: company.marker,
        user_id: company.users[member].id, pages: 10,
      }))).flat() };
  }

  if (action !== "cleanup") throw new Error("Unknown operation");
  // Inspect every identity before deleting anything. Unknown data stops cleanup.
  for (const user of users) {
    const auth = await api(`/auth/v1/admin/users/${user.id}`, "GET", undefined, true);
    if (auth && (auth.email !== user.email || auth.app_metadata?.capacity_run_id !== ledger.run_id)) {
      throw new Error("Cleanup refused: auth identity does not match ledger");
    }
    const profiles = await rows("users", `id=eq.${user.id}`, "email,default_company_id");
    if (profiles.some((profile) => profile.email !== user.email ||
      (profile.default_company_id && !companyIds.has(profile.default_company_id)))) {
      throw new Error("Cleanup refused: profile changed outside fixture");
    }
    const owned = await rows("companies", `owner_user_id=eq.${user.id}`, "id");
    if (owned.some((company) => !companyIds.has(company.id))) throw new Error("Cleanup refused: foreign owned company");
  }
  for (const company of ledger.companies) {
    const found = await rows("companies", `id=eq.${company.id}`, "id,name,owner_user_id");
    if (found.some((row) => row.name !== company.marker || row.owner_user_id !== company.users[0].id)) {
      throw new Error("Cleanup refused: company does not match ledger");
    }
    const members = await rows("users", `default_company_id=eq.${company.id}`, "id");
    if (members.some((member) => !userIds.has(member.id))) throw new Error("Cleanup refused: unknown company member");
    // Fetch all pages explicitly; PostgREST's default row limit must not hide foreign data.
    const allowedLeads = new Set(company.leads);
    for (let offset = 0; ; offset += 100) {
      const leads = await rows("leads", `company_id=eq.${company.id}&order=id&offset=${offset}&limit=100`, "id,source");
      if (leads.some((lead) => !allowedLeads.has(lead.id) || lead.source !== "capacity_fixture")) {
        throw new Error("Cleanup refused: unknown company lead");
      }
      if (leads.length < 100) break;
    }
  }
  for (const company of ledger.companies) {
    await api(`/rest/v1/companies?id=eq.${company.id}&name=eq.${encodeURIComponent(company.marker)}&owner_user_id=eq.${company.users[0].id}`, "DELETE");
  }
  for (const user of users) await api(`/auth/v1/admin/users/${user.id}`, "DELETE", undefined, true);
  // Do not report success while any planned resources still exist.
  for (const company of ledger.companies) {
    if ((await rows("companies", `id=eq.${company.id}`, "id")).length) throw new Error("Company cleanup incomplete");
  }
  for (const user of users) {
    if (await api(`/auth/v1/admin/users/${user.id}`, "GET", undefined, true)) throw new Error("Auth cleanup incomplete");
    if ((await rows("users", `id=eq.${user.id}`, "id")).length) throw new Error("Profile cleanup incomplete");
  }
  return { cleaned: true, companies: ledger.companies.length, accounts: users.length };
}

if (globalThis.capacityInput) {
  runFixture(globalThis.capacityInput).then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(`Capacity fixture error: ${error instanceof Error &&
        /^(Required|Invalid|Company|Auth|Server API|Cleanup|Profile|Unknown|Replica)/.test(error.message)
        ? error.message : "request failed; ledger retained"}`);
      process.exitCode = 1;
    });
}
