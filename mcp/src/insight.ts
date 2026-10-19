import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { auditComponents, auditData } from "./audit.js";
import { rel, walkSources, STYLE_EXT, IGNORE_DIRS } from "./fsutil.js";
import { reviewInvinsense } from "./invinsense-reviewer.js";
import { scoreProject, WEIGHTS } from "./score.js";

/* Read-only visibility helpers: hotspots, routes, tokens and a combined report. */

const FIX_HINT: Record<string, string> = {
  "hardcoded-hex": "Replace with a CSS variable. `convert` fixes most of these.",
  "font-below-12": "Raise to 12px or more.",
  "unapproved-font": "Use Geist / Geist Mono via var(--font-sans) / var(--font-mono).",
  "non-phosphor-icons": "Swap to @phosphor-icons/react, weight=\"bold\".",
  "chart-library": "Use invin-uix/ui/chart (run audit-components).",
  "em-dash": "Use a period, comma or colon.",
  "layout-animation": "Animate transform and opacity only.",
  "missing-reduced-motion": "Add the prefers-reduced-motion block last in the stylesheet.",
  "dark-prefix": "Remove dark: classes. Use tokens under html[data-theme].",
  "outline-none": "Keep the 3px :focus-visible ring.",
  "nav-as-button": "Use next/link with aria-current.",
};

const read = (f: string) => {
  try {
    return readFileSync(f, "utf8");
  } catch {
    return "";
  }
};
const exists = (p: string) => existsSync(p);
const requireRoot = (path: string) => {
  const root = resolve(path);
  if (!exists(root)) throw new Error(`Path does not exist: ${root}`);
  return root;
};
const md = (rows: string[][]) => rows.map((r) => `| ${r.join(" | ")} |`).join("\n");

// ───────────── hotspots ─────────────

export function hotspots(path: string, top = 10, maxFiles = 1500): string {
  return hotspotsRun(path, top, maxFiles).text;
}

export function hotspotsRun(path: string, top = 10, maxFiles = 1500): { data: Record<string, unknown>; text: string } {
  const root = requireRoot(path);
  const walked = walkSources(root, { maxFiles, maxBytes: 1_500_000 });
  type Row = { file: string; lines: number; e: number; w: number; i: number };
  const rows: Row[] = [];
  const rules = new Map<string, { sev: string; n: number; files: Set<string> }>();
  let suppressed = 0;
  let totalLines = 0;
  for (const f of walked.files) {
    const t = read(f);
    const lines = t.split("\n").length;
    totalLines += lines;
    suppressed += (t.match(/invinsense-allow/g) ?? []).length;
    const fs = reviewInvinsense(t);
    if (!fs.length) continue;
    const name = rel(root, f);
    const row: Row = { file: name, lines, e: 0, w: 0, i: 0 };
    for (const x of fs) {
      if (x.severity === "error") row.e++;
      else if (x.severity === "warning") row.w++;
      else row.i++;
      const r = rules.get(x.rule) ?? { sev: x.severity, n: 0, files: new Set<string>() };
      r.n++;
      r.files.add(name);
      rules.set(x.rule, r);
    }
    rows.push(row);
  }
  const weight = (r: Row) => r.e * WEIGHTS.errorCost + r.w * WEIGHTS.warningCost;
  rows.sort((a, b) => weight(b) - weight(a) || b.e - a.e);
  const total = rows.reduce((n, r) => n + weight(r), 0);

  const share = (n: number) => Math.round((n / Math.max(1, total)) * 100);
  const data = {
    project: root.split("/").pop(),
    filesScanned: walked.files.length,
    lines: totalLines,
    filesWithFindings: rows.length,
    suppressions: suppressed,
    worstFiles: rows.slice(0, top).map((r) => ({ file: r.file, errors: r.e, warnings: r.w, weighted: weight(r), sharePercent: share(weight(r)) })),
    top3SharePercent: share(rows.slice(0, 3).reduce((n, r) => n + weight(r), 0)),
    byRule: [...rules.entries()]
      .sort((a, b) => b[1].n * (b[1].sev === "error" ? 3 : 1) - a[1].n * (a[1].sev === "error" ? 3 : 1))
      .slice(0, 15)
      .map(([rule, r]) => ({ rule, severity: r.sev, count: r.n, files: r.files.size, fix: FIX_HINT[rule] ?? null })),
  };
  const L: string[] = [`# Hotspots: ${root.split("/").pop()}`, `Scanned ${walked.files.length} files, ${totalLines.toLocaleString("en-US")} lines. ${rows.length} file(s) have findings. ${suppressed} line(s) carry \`invinsense-allow\`.`, ""];
  if (!rows.length) {
    L.push("✅ No findings in any file.");
    return { data, text: L.join("\n") };
  }
  L.push(`## Worst files (top ${Math.min(top, rows.length)} of ${rows.length})`, "", "| File | Errors | Warnings | Weighted | Share of total |", "|---|---:|---:|---:|---:|");
  for (const r of rows.slice(0, top)) L.push(`| \`${r.file}\` | ${r.e} | ${r.w} | ${weight(r)} | ${Math.round((weight(r) / Math.max(1, total)) * 100)}% |`);
  const topShare = rows.slice(0, 3).reduce((n, r) => n + weight(r), 0);
  L.push("", `The 3 worst files hold ${Math.round((topShare / Math.max(1, total)) * 100)}% of all weighted findings. Fix them first.`);
  L.push("", "## Findings by rule", "", "| Rule | Severity | Count | Files | How to fix |", "|---|---|---:|---:|---|");
  [...rules.entries()]
    .sort((a, b) => b[1].n * (b[1].sev === "error" ? 3 : 1) - a[1].n * (a[1].sev === "error" ? 3 : 1))
    .slice(0, 15)
    .forEach(([rule, r]) => L.push(`| \`${rule}\` | ${r.sev} | ${r.n} | ${r.files.size} | ${FIX_HINT[rule] ?? "Run `review` on the file for the rule text."} |`));
  L.push("", "Next: run `review` on the worst file, or `convert` for mechanical fixes.");
  return { data, text: L.join("\n") };
}

// ───────────── routes ─────────────

export function routes(path: string, maxFiles = 1500): string {
  return routesRun(path, maxFiles).text;
}

export function routesRun(path: string, maxFiles = 1500): { data: Record<string, unknown>; text: string } {
  const root = requireRoot(path);
  const appDir = [join(root, "src", "app"), join(root, "app")].find(exists);
  if (!appDir) {
    const msg = "No Next.js App Router folder found (looked for src/app and app). This command supports the App Router only.";
    return { data: { project: root.split("/").pop(), supported: false, message: msg, routes: [], issues: [] }, text: `# Routes: ${root.split("/").pop()}\n\n${msg}` };
  }

  const walked = walkSources(root, { maxFiles, maxBytes: 1_500_000 });
  const all = walked.files.map(read).join("\n");
  const imported = (file: string, src: string) => {
    let extra = "";
    for (const m of src.matchAll(/from\s+["'](@\/[^"']+|\.{1,2}\/[^"']+)["']/g)) {
      const spec = m[1]!;
      const base = spec.startsWith("@/") ? join(root, exists(join(root, "src")) ? "src" : "", spec.slice(2)) : resolve(file, "..", spec);
      for (const c of [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"]) if (exists(base + c)) { extra += "\n" + read(base + c); break; }
    }
    return extra;
  };
  type Page = { route: string; dir: string; file: string };
  const pages: Page[] = [];
  const apis: string[] = [];
  const visit = (dir: string, segs: string[]) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (IGNORE_DIRS.has(e.name) || e.name.startsWith("@") || e.name.startsWith("_")) continue;
        const group = /^\(.*\)$/.test(e.name);
        visit(join(dir, e.name), group ? segs : [...segs, e.name]);
      } else if (/^page\.(tsx|ts|jsx|js)$/.test(e.name)) pages.push({ route: "/" + segs.join("/"), dir, file: join(dir, e.name) });
      else if (/^route\.(ts|js)$/.test(e.name)) apis.push("/" + segs.join("/"));
    }
  };
  visit(appDir, []);
  pages.sort((a, b) => a.route.localeCompare(b.route));

  // A loading/error file covers its route and every route below it.
  const covered = (dir: string, base: RegExp) => {
    let d = dir;
    for (;;) {
      if (readdirSync(d).some((n) => base.test(n))) return true;
      if (d === appDir) return false;
      const up = resolve(d, "..");
      if (up === d) return false;
      d = up;
    }
  };
  const mark = (b: boolean) => (b ? "yes" : "**no**");
  const L: string[] = [`# Routes: ${root.split("/").pop()}`, `${pages.length} page(s), ${apis.length} API route(s).`, ""];
  const rdata: Record<string, unknown>[] = [];
  if (!pages.length) return { data: { project: root.split("/").pop(), supported: true, pages: 0, apiRoutes: apis, routes: [], issues: ["No page files found."] }, text: L.concat("No page files found.").join("\n") };

  const rows: string[][] = [["Route", "Loading", "Error", "Empty state", "invin-uix", "In nav", "Client"]];
  let noLoading = 0, noError = 0, noEmpty = 0, noNav = 0, dynamic = 0;
  for (const p of pages) {
    const own = read(p.file);
    const src = own + imported(p.file, own);
    if (/\bredirect\(/.test(own) && own.length < 600) {
      rows.push([`\`${p.route}\``, "n/a", "n/a", "n/a", "0", "n/a", "redirect"]);
      rdata.push({ route: p.route, file: rel(root, p.file), redirect: true, loading: null, error: null, emptyState: null, invinUixImports: 0, inNav: null, client: false });
      continue;
    }
    const loading = covered(p.dir, /^loading\.(tsx|ts|jsx|js)$/);
    const error = covered(p.dir, /^error\.(tsx|ts|jsx|js)$/);
    const isAuth = /^\/(login|signin|sign-in|register|signup|forgot|reset)/.test(p.route);
    const isFetching = !isAuth && /\bawait\s|\bfetch\(|useSWR|useQuery/.test(own);
    const showsList = !isAuth && !/\[.+\]/.test(p.route) && /DataTable|<table/.test(src);
    // Empty state may live in a child component the page imports; check imports used by this page too.
    const hasEmpty = /EmptyState|emptyState|No [a-z ]+ yet|rows\.length === 0|\.length === 0/i.test(src);
    const uix = (src.match(/from\s+["']invin-uix\//g) ?? []).length;
    const esc = p.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inNav = p.route === "/" || new RegExp("href\\s*[:=]\\s*\\{?\\s*[\"'`]" + esc + "[\"'`?#/]").test(all);
    const isDyn = /\[.+\]/.test(p.route);
    if (isDyn) dynamic++;
    if (!loading && isFetching) noLoading++;
    if (!error && isFetching) noError++;
    if (showsList && !hasEmpty) noEmpty++;
    if (!inNav && !isDyn && p.route !== "/login") noNav++;
    rdata.push({ route: p.route, file: rel(root, p.file), redirect: false, loading: loading || isFetching ? loading : null, error: error || isFetching ? error : null, emptyState: showsList ? hasEmpty : null, invinUixImports: uix, inNav: isDyn || p.route === "/login" ? null : inNav, client: /^\s*["']use client["']/.test(own) });
    rows.push([`\`${p.route}\``, loading || isFetching ? mark(loading) : "n/a", error || isFetching ? mark(error) : "n/a", showsList ? mark(hasEmpty) : "n/a", String(uix), isDyn || p.route === "/login" ? "n/a" : mark(inNav), /^\s*["']use client["']/.test(own) ? "yes" : "no"]);
  }
  L.push(md(rows.slice(0, 1)), "|---|:-:|:-:|:-:|---:|:-:|:-:|", md(rows.slice(1)));
  const issues: string[] = [];
  if (noLoading) issues.push(`${noLoading} route(s) have no loading.tsx, so users get no skeleton.`);
  if (noError) issues.push(`${noError} route(s) have no error.tsx, so failures show the framework default.`);
  if (noEmpty) issues.push(`${noEmpty} data page(s) show no empty state when the list is empty.`);
  if (noNav) issues.push(`${noNav} route(s) are not linked from the navigation.`);
  const rootNf = [join(appDir, "not-found.tsx"), join(appDir, "not-found.jsx")].some(exists);
  if (!rootNf) issues.push("No app/not-found.tsx. Add one that names the missing page and links home.");
  L.push("");
  if (issues.length) L.push("## To fix", ...issues.map((i) => `- ${i}`), "", "Use `new-page` for new routes. It creates the page, loading and error files together.");
  else L.push("✅ Every route has loading, error and empty handling and is reachable from the navigation.");
  if (apis.length) L.push("", `API routes: ${apis.map((a) => `\`${a}\``).join(", ")}`);
  const data = { project: root.split("/").pop(), supported: true, pages: pages.length, apiRoutes: apis, routes: rdata, summary: { noLoading, noError, noEmptyState: noEmpty, notInNav: noNav, dynamic, hasNotFound: rootNf }, issues };
  return { data, text: L.join("\n") };
}

// ───────────── tokens ─────────────

export function tokens(path: string, maxFiles = 1500): string {
  return tokensRun(path, maxFiles).text;
}

export function tokensRun(path: string, maxFiles = 1500): { data: Record<string, unknown>; text: string } {
  const root = requireRoot(path);
  const walked = walkSources(root, { maxFiles, maxBytes: 1_500_000 });
  const defined = new Map<string, string>(); // token -> file
  const used = new Map<string, { n: number; files: Set<string> }>();
  const withFallback = new Set<string>(); // var(--x, fallback) is safe even when --x is set elsewhere (inline style, JS)
  const hex = new Map<string, number>();
  let hexTotal = 0;
  let importsUixTokens = false;
  for (const f of walked.files) {
    const t = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
    if (/invin-uix\/tokens\.css/.test(t)) importsUixTokens = true;
    const name = rel(root, f);
    const isStyle = STYLE_EXT.has(f.slice(f.lastIndexOf(".")).toLowerCase());
    if (isStyle) for (const m of t.matchAll(/(--[\w-]+)\s*:/g)) if (!defined.has(m[1]!)) defined.set(m[1]!, name);
    for (const m of t.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
      if (m[2] === ",") withFallback.add(m[1]!);
      const u = used.get(m[1]!) ?? { n: 0, files: new Set<string>() };
      u.n++;
      u.files.add(name);
      used.set(m[1]!, u);
    }
    for (const x of reviewInvinsense(t)) if (x.rule === "hardcoded-hex") {
      hexTotal++;
      hex.set(name, (hex.get(name) ?? 0) + 1);
    }
  }
  // Tokens provided by invin-uix and Tailwind are valid even though this project does not define them.
  const uixTokens = new Set<string>();
  const uixCss = [join(root, "node_modules", "invin-uix", "dist", "tokens.css"), join(root, "node_modules", "invin-uix", "tokens.css")].find(exists);
  if (uixCss) for (const m of read(uixCss).matchAll(/(--[\w-]+)\s*:/g)) uixTokens.add(m[1]!);
  const isProvided = (t: string) => uixTokens.has(t) || /^--(tw-|font-geist|radix|next)/.test(t);
  const unverifiable = importsUixTokens && !uixCss; // invin-uix not installed: tokens it provides cannot be checked
  const undef = unverifiable ? [] : [...used.entries()].filter(([t]) => !defined.has(t) && !isProvided(t) && !withFallback.has(t));
  const unused = [...defined.keys()].filter((t) => !used.has(t) && !/^--(accent-|z-|radius-|sidebar-|topbar-|text-|font-)/.test(t) && !/^--[\w-]+-\d+$/.test(t));

  const L: string[] = [`# Tokens: ${root.split("/").pop()}`, `${defined.size} token(s) defined in CSS, ${used.size} distinct token(s) used, ${hexTotal} hardcoded hex value(s) outside the accent definitions.`, ""];
  L.push("## Most used", "", "| Token | Uses | Files |", "|---|---:|---:|");
  [...used.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12).forEach(([t, u]) => L.push(`| \`${t}\` | ${u.n} | ${u.files.size} |`));
  L.push("", "## Hardcoded colours");
  if (!hexTotal) L.push("", "✅ None.");
  else {
    L.push("", "| File | Hex values |", "|---|---:|");
    [...hex.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([f, n]) => L.push(`| \`${f}\` | ${n} |`));
    L.push("", "Replace with CSS variables. `convert` rewrites most of these.");
  }
  L.push("", "## Used but not defined");
  if (!undef.length) L.push("", unverifiable ? "Not checked: invin-uix is not installed, so tokens it provides cannot be verified. Run npm install and re-run." : "✅ None. Every var(--x) resolves.");
  else {
    L.push("", "These resolve to nothing and silently fall back to the browser default:", "", "| Token | Uses | First seen in |", "|---|---:|---|");
    undef.sort((a, b) => b[1].n - a[1].n).slice(0, 15).forEach(([t, u]) => L.push(`| \`${t}\` | ${u.n} | \`${[...u.files][0]}\` |`));
  }
  L.push("", "## Defined but never used");
  if (!unused.length) L.push("", "✅ None.");
  else L.push("", unused.slice(0, 20).map((t) => `\`${t}\``).join(", ") + (unused.length > 20 ? ` and ${unused.length - 20} more` : ""), "", "Safe to keep if invin-uix or later pages will use them.");
  const data = {
    project: root.split("/").pop(),
    defined: defined.size,
    used: used.size,
    hardcodedHexTotal: hexTotal,
    mostUsed: [...used.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([token, u]) => ({ token, uses: u.n, files: u.files.size })),
    hardcodedByFile: [...hex.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([file, count]) => ({ file, count })),
    usedButUndefined: undef.slice(0, 15).map(([token, u]) => ({ token, uses: u.n, firstSeen: [...u.files][0] })),
    undefinedChecked: !unverifiable,
    definedButUnused: unused,
  };
  return { data, text: L.join("\n") };
}

// ───────────── report ─────────────

interface HistoryEntry { at: string; total: number; grade: string; errors: number; warnings: number; files: number }

export function report(path: string, save: boolean, maxFiles = 1500): string {
  return reportRun(path, save, maxFiles).text;
}

export function reportRun(path: string, save: boolean, maxFiles = 1500): { data: Record<string, unknown>; text: string } {
  const root = requireRoot(path);
  const { score, input } = scoreProject(root, maxFiles);
  const errors = input.findings.filter((f) => f.severity === "error").length;
  const warnings = input.findings.filter((f) => f.severity === "warning").length;

  const histFile = join(root, ".invinsense", "history.json");
  let history: HistoryEntry[] = [];
  try {
    history = JSON.parse(read(histFile) || "[]");
  } catch {
    history = [];
  }
  const saveNote = { saved: false };
  const entry: HistoryEntry = { at: new Date().toISOString(), total: score.total, grade: score.grade, errors, warnings, files: input.filesScanned };
  const prev = history[history.length - 1];

  const L: string[] = [`# Invinsense report: ${root.split("/").pop()}`, `Generated ${entry.at.slice(0, 16).replace("T", " ")} UTC. ${input.filesScanned} files, ${input.lines.toLocaleString("en-US")} lines.`, ""];
  L.push(`## Score: ${score.total}/100, grade ${score.grade}${prev ? ` (${score.total - prev.total >= 0 ? "+" : ""}${score.total - prev.total} since ${prev.at.slice(0, 10)})` : ""}`, `_${score.verdict}_`, "");
  L.push("| Category | Score | Detail |", "|---|---:|---|", ...score.categories.map((c) => `| ${c.name} | ${c.score}/${c.max} | ${c.detail} |`));
  if (score.wins.length) L.push("", "Biggest wins:", ...score.wins.map((w, i) => `${i + 1}. ${w}`));

  const trend = [...history.slice(-7), entry];
  if (trend.length > 1) {
    L.push("", "## Trend", "", "| Date | Score | Grade | Errors | Warnings |", "|---|---:|:-:|---:|---:|");
    trend.forEach((h, i) => L.push(`| ${h.at.slice(0, 10)}${i === trend.length - 1 ? " (now)" : ""} | ${h.total} | ${h.grade} | ${h.errors} | ${h.warnings} |`));
  } else L.push("", "_No history yet. Save this report to start a trend line._");

  const shift = (t: string) => t.replace(/^(#+)\s/gm, "$1# ");
  L.push("", "---", "", shift(hotspots(root, 8, maxFiles)), "", "---", "", shift(routes(root, maxFiles)), "", "---", "", shift(tokens(root, maxFiles)));
  L.push("", "---", "", shift(auditComponents({ path: root, maxFiles, detail: "summary" })));

  if (save) {
    mkdirSync(join(root, ".invinsense"), { recursive: true });
    history.push(entry);
    writeFileSync(histFile, JSON.stringify(history.slice(-100), null, 2) + "\n");
    writeFileSync(join(root, "invinsense-report.md"), L.join("\n") + "\n");
    saveNote.saved = true;
    L.push("", `Saved \`invinsense-report.md\` and appended to \`.invinsense/history.json\` (commit the history file to share the trend, or add \`.invinsense/\` and \`invinsense-report.md\` to .gitignore).`);
  } else L.push("", "_Not saved. Re-run with save to write `invinsense-report.md` and record this score in the trend._");
  const data = {
    project: root.split("/").pop(),
    generatedAt: entry.at,
    score: { total: score.total, grade: score.grade, verdict: score.verdict, categories: score.categories, wins: score.wins, deltaSincePrevious: prev ? score.total - prev.total : null },
    filesScanned: input.filesScanned,
    lines: input.lines,
    errors,
    warnings,
    trend,
    hotspots: hotspotsRun(root, 8, maxFiles).data,
    routes: routesRun(root, maxFiles).data,
    tokens: tokensRun(root, maxFiles).data,
    components: auditData(root, maxFiles),
    saved: saveNote.saved,
  };
  return { data, text: L.join("\n") };
}
