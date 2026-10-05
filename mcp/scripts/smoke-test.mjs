import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: [process.env.SERVER_ENTRY || "build/index.js"] }));

const tools = (await client.listTools()).tools.map((t) => t.name);
for (const t of ["list_best_practices", "get_best_practice", "search_best_practices", "review_code", "scaffold_component", "suggest_project_structure", "pre_merge_checklist", "review_invinsense_ui", "get_invinsense_tokens", "invinsense_new_module_checklist", "scaffold_invinsense_project", "convert_to_invinsense", "add_invinsense_page", "audit_ui_components"])
  assert.ok(tools.includes(t), `missing tool ${t}`);

const bad = `"use client";
export default async function Page() {
  useEffect(() => { fetch('/api/x') }, []);
  return <div onClick={go}>{items.map((x, i) => <li key={i}>{x}</li>)}<img src="a.png" /></div>;
}`;
const review = await client.callTool({ name: "review_code", arguments: { code: bad } });
const out = review.content[0].text;
for (const r of ["async-client-component", "no-index-key", "div-onclick", "img-alt", "fetch-in-effect", "raw-img-next"]) assert.ok(out.includes(r), `expected rule ${r}\n${out}`);

const clean = await client.callTool({ name: "review_code", arguments: { code: `export function A(){return <button type="button">x</button>}` } });
assert.ok(clean.content[0].text.startsWith("✅"));

const search = await client.callTool({ name: "search_best_practices", arguments: { query: "server actions validation" } });
assert.ok(search.content[0].text.includes("Server Actions"));

const res = await client.listResources();
assert.ok(res.resources.length > 10);
const read = await client.readResource({ uri: "bestpractice://react-effects" });
assert.ok(read.contents[0].text.includes("effect"));

const prompts = await client.listPrompts();
assert.equal(prompts.prompts.length, 5);

const badUi = `.badge { font-size: 10px; color: #ff0000; font-family: Arial; transition: all 200ms ease-in; }
.card { border-left: 4px solid var(--accent); background: linear-gradient(red, blue); }
:focus { outline: none; }
import { Bell } from "lucide-react";
const msg = "Streamline your workflow — seamless!";`;
const ui = (await client.callTool({ name: "review_invinsense_ui", arguments: { code: badUi } })).content[0].text;
for (const r of ["hardcoded-hex", "font-below-12", "unapproved-font", "layout-animation", "bad-easing", "side-stripe", "gradient", "outline-none", "non-phosphor-icons", "em-dash", "buzzwords", "missing-reduced-motion"]) assert.ok(ui.includes(r), `expected ${r}\n${ui}`);
const goodUi = (await client.callTool({ name: "review_invinsense_ui", arguments: { code: ".btn { color: var(--primary); font-size: 14px; font-family: var(--font-sans); transition: transform 150ms ease-out; }\n@media (prefers-reduced-motion: reduce) { .btn { transition: none; } }" } })).content[0].text;
assert.ok(goodUi.startsWith("✅"), goodUi);
const tok = (await client.callTool({ name: "get_invinsense_tokens", arguments: { family: "uemp" } })).content[0].text;
assert.ok(tok.includes("#DD3731") && tok.includes("html[data-theme=\"light\"]"));
const guide = await client.readResource({ uri: "bestpractice://invinsense/guide" });
assert.ok(guide.contents[0].text.includes("Module UI Guide"));


// ---------- scaffold_invinsense_project ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "invinsense-"));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

const dry = (await client.callTool({ name: "scaffold_invinsense_project", arguments: { name: "case-app", productName: "Case", family: "isoc-core", targetDir: tmp, type: "nextjs", dryRun: true } })).content[0].text;
assert.ok(dry.includes("Dry run") && !fs.existsSync(path.join(tmp, "case-app")), "dry run must not write");

for (const type of ["nextjs", "static-module"]) {
  const name = type === "nextjs" ? "case-next" : "case-static";
  const out = await client.callTool({ name: "scaffold_invinsense_project", arguments: { name, productName: "Case", family: "uemp", targetDir: tmp, type, multiTenant: true, dryRun: false } });
  assert.ok(!out.isError, out.content[0].text);
  const dir = path.join(tmp, name);
  const files = walk(dir);
  assert.ok(files.length > 10, `${type}: too few files`);
  for (const f of files) {
    const body = fs.readFileSync(f, "utf8");
    assert.ok(!/__[A-Z_]+__/.test(body), `${type}: unreplaced placeholder in ${f}`);
    if (/\.(css|html|js|ts|tsx)$/.test(f) && !/icons\.js$/.test(f)) {
      const r = (await client.callTool({ name: "review_invinsense_ui", arguments: { code: body } })).content[0].text;
      assert.ok(!r.includes("🔴"), `${type}: generated file fails its own guide: ${f}\n${r}`);
    }
  }
  assert.ok(fs.existsSync(path.join(dir, ".gitignore")) && fs.existsSync(path.join(dir, ".invinsense.json")));
}
assert.ok(fs.existsSync(path.join(tmp, "case-static", "css", "case-static.css")));
assert.ok(fs.readFileSync(path.join(tmp, "case-static", "js", "icons.js"), "utf8").includes("squares-four"));
assert.ok(fs.readFileSync(path.join(tmp, "case-next", "src", "app", "globals.css"), "utf8").includes("#DD3731"), "family accent applied");
const nextDir = path.join(tmp, "case-next");
const pkg = JSON.parse(fs.readFileSync(path.join(nextDir, "package.json"), "utf8"));
assert.ok(pkg.dependencies["invin-uix"] && pkg.devDependencies["@tailwindcss/postcss"], "nextjs scaffold includes invin-uix + tailwind");
for (const f of ["postcss.config.mjs", "src/app/uix.css", "src/components/dashboard/Overview.tsx", "public/assets/mark.svg"]) assert.ok(fs.existsSync(path.join(nextDir, f)), `nextjs scaffold missing ${f}`);
assert.ok(/@layer base/.test(fs.readFileSync(path.join(nextDir, "src/app/globals.css"), "utf8")), "resets in @layer base");

// add_invinsense_page + audit_ui_components
{
  const proj = path.join(tmp, "case-next");
  const dry = (await client.callTool({ name: "add_invinsense_page", arguments: { projectDir: proj, route: "reports", kind: "list" } })).content[0].text;
  assert.ok(dry.includes("DRY RUN") && !fs.existsSync(path.join(proj, "src/app/(app)/reports")), "page dry run writes nothing");
  for (const [route, kind, extra] of [["reports", "list", {}], ["analytics", "dashboard", { icon: "chart-line" }], ["settings/users", "form", { navGroup: "Admin", icon: "gear" }], ["cases", "detail", {}], ["notes", "blank", {}]]) {
    const r = await client.callTool({ name: "add_invinsense_page", arguments: { projectDir: proj, route, kind, dryRun: false, ...extra } });
    assert.ok(!r.isError, r.content[0].text);
  }
  const nav = fs.readFileSync(path.join(proj, "src/lib/nav.ts"), "utf8");
  for (const id of ["reports", "analytics", "settings-users", "notes"]) assert.ok(nav.includes(`id: "${id}"`), `nav has ${id}`);
  assert.ok(!nav.includes("cases"), "dynamic route not added to nav");
  assert.ok(fs.existsSync(path.join(proj, "src/app/(app)/cases/[id]/page.tsx")), "detail adds [id]");
  for (const f of walk(path.join(proj, "src/app/(app)")).filter((x) => /\.(ts|tsx)$/.test(x) && /(reports|analytics|settings|cases|notes)/.test(x))) {
    const r = (await client.callTool({ name: "review_invinsense_ui", arguments: { code: fs.readFileSync(f, "utf8") } })).content[0].text;
    assert.ok(!r.includes("🔴"), `generated page fails its own guide: ${f}\n${r}`);
  }
  const clash = await client.callTool({ name: "add_invinsense_page", arguments: { projectDir: proj, route: "reports", kind: "list", dryRun: false } });
  assert.ok(clash.isError, "refuses to overwrite");
  for (const bad of ["../x", "login", "a/b/c/d/e", "UPPER"]) {
    const r = await client.callTool({ name: "add_invinsense_page", arguments: { projectDir: proj, route: bad, kind: "blank" } });
    assert.ok(r.isError, `rejects route ${bad}`);
  }
  const audit = (await client.callTool({ name: "audit_ui_components", arguments: { path: proj } })).content[0].text;
  assert.ok(audit.includes("invin-uix/ui/kpi-card") && audit.includes("Third-party UI libraries") && audit.includes("None. ✅"), "audit reports invin-uix usage and no third-party UI");
}
const again = await client.callTool({ name: "scaffold_invinsense_project", arguments: { name: "case-next", productName: "Case", family: "uemp", targetDir: tmp } });
assert.ok(again.isError, "must refuse to overwrite a non-empty folder");
const badName = await client.callTool({ name: "scaffold_invinsense_project", arguments: { name: "../evil", productName: "x", family: "uemp", targetDir: tmp } }).catch((e) => ({ isError: true, e }));
assert.ok(badName.isError, "path traversal in name must be rejected");

// ---------- convert_to_invinsense ----------
const legacy = path.join(tmp, "legacy");
fs.mkdirSync(path.join(legacy, "css"), { recursive: true });
fs.mkdirSync(path.join(legacy, "node_modules", "x"), { recursive: true });
fs.writeFileSync(path.join(legacy, "node_modules", "x", "a.css"), "a{color:#fff}");
fs.writeFileSync(path.join(legacy, "index.html"), '<!doctype html>\n<html lang="en">\n<head><title>Old</title><link rel="stylesheet" href="css/app.css"></head>\n<body><div onClick="go()">Go</div></body></html>\n');
fs.writeFileSync(path.join(legacy, "css", "app.css"), ".btn{background:#2769fc;color:#1a73e8;font-family:Arial,sans-serif;font-size:10px;transition:all .3s ease-in}\n.code{font-family:Consolas,monospace}\n.card{border-left:4px solid red}\n");
const sh = (cmd) => import("node:child_process").then((m) => m.execSync(cmd, { cwd: legacy, stdio: "pipe" }));
await sh("git init -q && git add -A && git -c user.email=a@b.c -c user.name=t commit -qm init");

const audit = (await client.callTool({ name: "convert_to_invinsense", arguments: { path: legacy, family: "isoc-core", mode: "audit" } })).content[0].text;
assert.ok(audit.includes("AUDIT") && audit.includes("hardcoded-hex") && audit.includes("Structural gaps"), audit);
assert.ok(!audit.includes("node_modules"), "must skip node_modules");

const before = fs.readFileSync(path.join(legacy, "css", "app.css"), "utf8");
const preview = (await client.callTool({ name: "convert_to_invinsense", arguments: { path: legacy, family: "isoc-core", mode: "apply", colorMap: { "#1a73e8": "var(--primary)" } } })).content[0].text;
assert.ok(preview.includes("DRY RUN") && fs.readFileSync(path.join(legacy, "css", "app.css"), "utf8") === before, "dry run must not modify files");

fs.writeFileSync(path.join(legacy, "dirty.txt"), "x");
const refused = await client.callTool({ name: "convert_to_invinsense", arguments: { path: legacy, family: "isoc-core", mode: "apply", dryRun: false } });
assert.ok(refused.isError && refused.content[0].text.includes("uncommitted"), "must refuse a dirty git tree");
fs.rmSync(path.join(legacy, "dirty.txt"));

const applied = await client.callTool({ name: "convert_to_invinsense", arguments: { path: legacy, family: "isoc-core", mode: "apply", dryRun: false, colorMap: { "#1a73e8": "var(--primary)" } } });
assert.ok(!applied.isError, applied.content[0].text);
const css = fs.readFileSync(path.join(legacy, "css", "app.css"), "utf8");
assert.ok(css.includes("background:var(--accent)") && css.includes("color:var(--primary)"), css);
assert.ok(css.includes("font-family:var(--font-sans)") && css.includes("font-family:var(--font-mono)"), css);
assert.ok(css.includes("font-size:12px") && !css.includes("ease-in") && !css.includes("transition:all"), css);
assert.ok(css.includes("prefers-reduced-motion"), css);
assert.ok(css.includes("border-left:4px"), "side-stripe must be left for manual fix");
const html = fs.readFileSync(path.join(legacy, "index.html"), "utf8");
assert.ok(html.includes('data-theme="dark"') && html.includes("invinsense-tokens.css"), html);
assert.ok(fs.existsSync(path.join(legacy, "css", "invinsense-tokens.css")));
assert.ok(fs.existsSync(path.join(legacy, "INVINSENSE_MIGRATION.md")));
assert.ok(fs.readdirSync(path.join(legacy, ".invinsense-backup")).length === 1, "backup created");
const reaudit = (await client.callTool({ name: "convert_to_invinsense", arguments: { path: legacy, family: "isoc-core", mode: "audit" } })).content[0].text;
assert.ok(!reaudit.includes("[hardcoded-hex]") && !reaudit.includes("[font-below-12]") && reaudit.includes("[side-stripe]"), reaudit);
fs.rmSync(tmp, { recursive: true, force: true });

const scaffold = await client.callTool({ name: "scaffold_component", arguments: { name: "UserCard", kind: "client" } });
assert.ok(scaffold.content[0].text.includes('"use client"'));

console.log("✅ smoke test passed:", tools.length, "tools,", res.resources.length, "resources,", prompts.prompts.length, "prompts");
await client.close();
