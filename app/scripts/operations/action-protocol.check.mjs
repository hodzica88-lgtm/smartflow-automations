// Actual installed Next.js, isolated local app: no Supabase or production access.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, symlink, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), "varnito-action-protocol-"));
let server;
let output = "";
try {
  const portProbe = createServer();
  await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  const url = `http://127.0.0.1:${port}`;
  await mkdir(path.join(directory, "app"));
  await symlink(path.resolve("node_modules"), path.join(directory, "node_modules"), "dir");
  await writeFile(path.join(directory, "package.json"), JSON.stringify({ private: true }));
  await writeFile(path.join(directory, "app", "layout.js"),
    "export default function Layout({children}) {return <html><body>{children}</body></html>}");
  await writeFile(path.join(directory, "app", "page.js"), `
    import { redirect } from 'next/navigation';
    async function save(form) {
      'use server';
      if (form.get('leadId') !== 'synthetic-lead' || form.get('status') !== 'new') {
        throw new Error('Unexpected action payload');
      }
      redirect('/?success=1');
    }
    export default function Page() {
      return <form action={save}><input type="hidden" name="leadId" value="synthetic-lead" />
        <input name="status" defaultValue="new" /><button>Save</button></form>;
    }
  `);
  server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev",
    "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: directory, env: { PATH: process.env.PATH, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { output = (output + chunk).slice(-12000); });
  const deadline = Date.now() + 90000;
  let html;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next.js exited: ${output}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (response.ok) { html = await response.text(); break; }
    } catch { /* Server may still be compiling its first route. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(html, `Next.js did not become ready: ${output}`);
  const fields = new FormData();
  for (const match of html.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]*)"/)?.[1];
    const value = match[0].match(/\bvalue="([^"]*)"/)?.[1] || "";
    if (name) fields.append(name, value);
  }
  assert.ok([...fields.keys()].some((key) => key.startsWith("$ACTION_ID_")));
  const headers = { Origin: url };
  const ignored = await fetch(url, { method: "POST", headers, body: new URLSearchParams(fields), redirect: "manual" });
  assert.equal(ignored.status, 200, "URL-encoded MPA action should reproduce the ignored POST");
  await ignored.text();
  const action = await fetch(url, { method: "POST", headers, body: fields, redirect: "manual" });
  assert.equal(action.status, 303, `Multipart action failed: ${output}`);
  assert.equal(action.headers.get("location"), "/?success=1");
  await action.text();
  console.log("Actual Next.js action protocol verified: URL-encoded POST = 200, multipart FormData = 303 success redirect.");
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000))]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
  await rm(directory, { recursive: true, force: true });
}
