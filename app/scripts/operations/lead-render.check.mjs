// Production Next.js with synthetic displayed fields: no database or remote calls.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import ts from "typescript";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), "varnito-lead-render-"));
const next = require.resolve("next/dist/bin/next");
const env = { PATH: process.env.PATH, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
let server;
let browser;
let output = "";

function start(arguments_) {
  const child = spawn(process.execPath, [next, ...arguments_], { cwd: directory, env,
    timeout: 120000, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => { output = (output + chunk).slice(-16000); });
  }
  return child;
}

try {
  await mkdir(path.join(directory, "app", "[variant]"), { recursive: true });
  await symlink(path.resolve("node_modules"), path.join(directory, "node_modules"), "dir");
  await writeFile(path.join(directory, "package.json"), JSON.stringify({ private: true }));
  await writeFile(path.join(directory, "next.config.mjs"), "export default {experimental:{cpus:2}};");
  await writeFile(path.join(directory, "app", "layout.js"),
    "export default function Layout({children}) {return <html><body>{children}</body></html>}");
  const cards = await readFile("src/app/dashboard/leads/LeadCards.tsx", "utf8");
  const presentation = await readFile("src/app/dashboard/leads/lead-presentation.ts", "utf8");
  const transpile = (source) => ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve,
  } }).outputText;
  await writeFile(path.join(directory, "app", "ClientCards.js"), transpile(cards));
  await writeFile(path.join(directory, "app", "ServerCards.js"), transpile(cards.replace(/^"use client";\s*/, "")));
  await writeFile(path.join(directory, "app", "lead-presentation.js"), transpile(presentation));
  const teamMembers = Array.from({ length: 10 }, (_, index) => ({ id: `member-${index}`, label: `Team ${index}` }));
  const leads = Array.from({ length: 50 }, (_, index) => ({
    id: `synthetic-${index}`, leadName: `Testfirma Lead ${index}`, contactLabel: `lead-${index}@example.test`,
    inquiryType: "Kontaktanfrage", notes: "Synthetische Anfrage <script>escaped</script>",
    status: "new", createdAtLabel: "09.10.26, 00:00", assignedUserId: null,
    assignedLabel: "Nicht zugewiesen", successfulOutcome: null, unsuccessfulOutcome: null,
    history: [{ id: `history-${index}`, label: "09.10.26, 00:00: Initialer Status → Neue Anfrage · Team 0" }],
  }));
  await writeFile(path.join(directory, "app", "[variant]", "page.js"), `
    import {redirect} from 'next/navigation';
    import ClientCards from '../ClientCards';
    import ServerCards from '../ServerCards';
    export const dynamic = 'force-dynamic';
    const leads = ${JSON.stringify(leads)};
    const teamMembers = ${JSON.stringify(teamMembers)};
    async function updateLeadAction(form) {
      'use server';
      if(form.get('leadId') !== 'synthetic-0' || form.get('status') !== 'contacted'
        || form.get('assigned_user_id') !== 'member-4') throw new Error('Unexpected action fields');
      redirect('/optimized?success=1');
    }
    export default async function Page({params}) {
      const {variant} = await params;
      const Cards = variant === 'optimized' ? ClientCards : ServerCards;
      return <Cards leads={leads} teamMembers={teamMembers} updateLeadAction={updateLeadAction}/>;
    }
  `);
  const build = start(["build", "--webpack"]);
  const buildExit = await new Promise((resolve) => build.once("exit", resolve));
  assert.equal(buildExit, 0, `Isolated production build failed: ${output}`);
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const url = `http://127.0.0.1:${port}`;
  server = start(["start", "--hostname", "127.0.0.1", "--port", String(port)]);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next.js exited: ${output}`);
    try {
      const response = await fetch(`${url}/optimized`, { signal: AbortSignal.timeout(10000) });
      if (response.ok) { await response.text(); ready = true; break; }
    } catch { /* Wait for the local listener. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, `Next.js did not become ready: ${output}`);
  const results = { original: [], optimized: [] };
  const bodies = {};
  for (let sample = 0; sample < 12; sample++) {
    for (const variant of sample % 2 ? ["optimized", "original"] : ["original", "optimized"]) {
      const before = performance.now();
      const response = await fetch(`${url}/${variant}`);
      assert.equal(response.status, 200);
      bodies[variant] = await response.text();
      results[variant].push(performance.now() - before);
    }
  }
  const articles = (body) => [...body.matchAll(/<article\b[\s\S]*?<\/article>/g)].map((match) => match[0]);
  assert.equal(articles(bodies.optimized).length, 50);
  assert.deepEqual(articles(bodies.optimized), articles(bodies.original), "Initial card HTML/form fields changed");
  assert.ok(bodies.optimized.includes("&lt;script&gt;escaped&lt;/script&gt;"));
  assert.ok(bodies.optimized.length < bodies.original.length * 0.7, "Client boundary should reduce repeated RSC markup");
  const form = bodies.optimized.match(/<form\b[\s\S]*?<\/form>/)?.[0];
  assert.ok(form);
  const fields = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]*)"/)?.[1];
    const value = match[0].match(/\bvalue="([^"]*)"/)?.[1] || "";
    if (name) fields.append(name, value);
  }
  assert.ok([...fields.keys()].some((name) => name.startsWith("$ACTION_ID_")));
  fields.set("status", "contacted");
  fields.set("assigned_user_id", "member-4");
  fields.set("successful_outcome", "");
  fields.set("unsuccessful_outcome", "");
  const saved = await fetch(`${url}/optimized`, { method: "POST", headers: { Origin: url }, body: fields, redirect: "manual" });
  assert.equal(saved.status, 303, `SSR multipart action failed: ${output}`);
  assert.equal(saved.headers.get("location"), "/optimized?success=1");
  await saved.text();
  if (process.env.LEAD_RENDER_BROWSER === "1") {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const pageErrors = [];
    const hydrationErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (/hydration|hydrating|server rendered HTML/i.test(message.text()) && message.type() === "error") {
        hydrationErrors.push(message.text());
      }
    });
    await page.goto(`${url}/optimized`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("article").count(), 50);
    const first = page.locator("article").first();
    await first.locator('select[name="status"]').selectOption("contacted");
    await first.locator('select[name="assigned_user_id"]').selectOption("member-4");
    await Promise.all([
      page.waitForURL("**/optimized?success=1", { timeout: 15000 }),
      first.getByRole("button", { name: "Aktualisieren" }).click(),
    ]);
    assert.deepEqual(pageErrors, [], "Hydrated cards raised a browser error");
    assert.deepEqual(hydrationErrors, [], "Card hydration mismatched the server HTML");
    await browser.close();
    browser = undefined;
    console.log("Chromium hydration and Server Action transport fixture passed.");
  }
  const mean = (values) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  console.log(JSON.stringify({ isolatedSyntheticProductionRender: true,
    originalCharacters: bodies.original.length, optimizedCharacters: bodies.optimized.length,
    originalAverageMs: mean(results.original), optimizedAverageMs: mean(results.optimized),
    identicalInitialCards: 50, nativeMultipartAction: 303 }));
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 5000))]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
  await rm(directory, { recursive: true, force: true });
}
