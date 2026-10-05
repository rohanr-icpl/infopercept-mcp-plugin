import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

export type PageKind = "list" | "dashboard" | "detail" | "form" | "blank";

export interface AddPageOptions {
  projectDir: string;
  route: string;
  title?: string;
  kind: PageKind;
  navGroup?: string;
  navLabel?: string;
  icon?: string;
  addToNav: boolean;
  dryRun: boolean;
  overwrite: boolean;
}

export interface AddPageResult {
  text: string;
  written: boolean;
}

const SEGMENT = /^(\[[a-z][a-zA-Z0-9]*\]|[a-z0-9]+(-[a-z0-9]+)*)$/;
const RESERVED = new Set(["login", "api", "_next", "assets"]);
const KIND_ICONS: Record<PageKind, string[]> = {
  list: ["table", "list-checks"],
  dashboard: ["squares-four", "chart-line"],
  detail: ["file-text", "table"],
  form: ["gear", "list-checks", "table"],
  blank: ["squares-four", "table"],
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const words = (slug: string) => slug.split("-").map(cap).join(" ");
const pascal = (segs: string[]) => segs.filter((s) => !s.startsWith("[")).map((s) => s.split("-").map(cap).join("")).join("") || "Page";

/** Index of the bracket that closes the one at `open`, skipping strings. */
function matchBracket(src: string, open: number): number {
  const pairs: Record<string, string> = { "[": "]", "{": "}", "(": ")" };
  const stack: string[] = [];
  let quote = "";
  for (let i = open; i < src.length; i++) {
    const c = src[i] as string;
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (pairs[c]) stack.push(pairs[c] as string);
    else if (c === "]" || c === "}" || c === ")") {
      stack.pop();
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

function navIcons(navSrc: string): string[] | null {
  const quoted = (t: string) => [...t.matchAll(/"([^"]+)"/g)].map((x) => x[1] as string);
  const m = navSrc.match(/icon\?:\s*([^;]+);/);
  if (!m?.[1]) return null;
  let names = quoted(m[1]);
  if (!names.length) {
    // icon is typed by a named alias, e.g. `icon?: NavIcon;`
    const alias = m[1].trim().match(/^(\w+)/)?.[1];
    const def = alias ? navSrc.match(new RegExp(`type\\s+${alias}\\s*=\\s*([^;]+);`)) : null;
    names = def?.[1] ? quoted(def[1]) : [];
  }
  return names.length ? names : null;
}

function insertNavItem(src: string, group: string | undefined, item: string, groupLabel: string): { out: string; note: string } | null {
  const decl = src.search(/export const NAV\b[^=]*=\s*\[/);
  if (decl < 0) return null;
  const arrOpen = src.indexOf("[", src.indexOf("=", decl));
  const arrClose = matchBracket(src, arrOpen);
  if (arrClose < 0) return null;

  let itemsOpen = -1;
  if (group) {
    const g = src.indexOf(`label: "${group}"`, arrOpen);
    if (g > 0 && g < arrClose) itemsOpen = src.indexOf("items: [", g);
  } else {
    itemsOpen = src.indexOf("items: [", arrOpen);
  }

  if (itemsOpen > 0 && itemsOpen < arrClose) {
    const open = src.indexOf("[", itemsOpen);
    const close = matchBracket(src, open);
    if (close < 0) return null;
    let j = close - 1;
    while (j > open && /\s/.test(src[j] as string)) j--;
    const needsComma = j > open && src[j] !== ",";
    const before = src.slice(0, j + 1) + (needsComma ? "," : "");
    const after = src.slice(j + 1);
    return { out: `${before}\n      ${item},${after.startsWith("\n") ? "" : "\n    "}${after}`, note: group ? `added to the "${group}" nav group` : "added to the first nav group" };
  }

  // Group not found: append a new group.
  let j = arrClose - 1;
  while (j > arrOpen && /\s/.test(src[j] as string)) j--;
  const needsComma = j > arrOpen && src[j] !== ",";
  const block = `  {\n    label: "${groupLabel}",\n    items: [\n      ${item},\n    ],\n  },`;
  return { out: `${src.slice(0, j + 1)}${needsComma ? "," : ""}\n${block}\n${src.slice(arrClose)}`, note: `created nav group "${groupLabel}"` };
}

// ───────────────────────── Page templates ─────────────────────────

function listFiles(P: string, title: string, hasUix: boolean): Record<string, string> {
  const view = hasUix
    ? `"use client";

import { Badge } from "invin-uix/ui/badge";
import { DataTable, type ColumnDef } from "invin-uix/ui/data-table";
import { Status } from "@/components/ui/Status";
import { statusLabel, type Row } from "./data";

const severityVariant = { critical: "destructive", high: "destructive", medium: "warning", low: "secondary" } as const;

const columns: ColumnDef<Row>[] = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  {
    id: "severity",
    header: "Severity",
    accessor: "severity",
    sortable: true,
    cell: ({ row }) => <Badge variant={severityVariant[row.severity]}>{row.severity}</Badge>,
  },
  {
    id: "tone",
    header: "Status",
    accessor: "tone",
    sortable: true,
    cell: ({ row }) => <Status tone={row.tone} label={statusLabel[row.tone]} />,
  },
  { id: "updated", header: "Updated", accessor: "updated", sortable: true, align: "right" },
];

export function ${P}View({ rows }: { rows: Row[] }) {
  return (
    <section className="card" aria-labelledby="h-${P.toLowerCase()}">
      <h2 id="h-${P.toLowerCase()}">All ${title.toLowerCase()}</h2>
      <DataTable<Row> columns={columns} data={rows} rowKey="id" searchable searchPlaceholder="Search ${title.toLowerCase()}" paginated pageSize={10} stickyHeader />
    </section>
  );
}
`
    : `import { Status } from "@/components/ui/Status";
import { statusLabel, type Row } from "./data";

export function ${P}View({ rows }: { rows: Row[] }) {
  return (
    <section className="card" aria-labelledby="h-${P.toLowerCase()}">
      <h2 id="h-${P.toLowerCase()}">All ${title.toLowerCase()}</h2>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Severity</th>
              <th scope="col">Status</th>
              <th scope="col" className="r">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td><span className="badge">{r.severity}</span></td>
                <td><Status tone={r.tone} label={statusLabel[r.tone]} /></td>
                <td className="r">{r.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
`;
  return {
    "page.tsx": `import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ${P}View } from "./${P}View";
import { get${P}Rows } from "./data";

export const metadata: Metadata = { title: "${title}" };

export default async function ${P}Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;

  // Preview the four states with ?state=error | empty (loading.tsx covers loading).
  if (state === "error") {
    return <div className="page"><h1 className="page-title">${title}</h1><ErrorState what="${title} did not load" correlationId="req-preview" /></div>;
  }

  const rows = state === "empty" ? [] : await get${P}Rows();

  if (rows.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">${title}</h1>
        <EmptyState title="No ${title.toLowerCase()} yet" why="Records appear here after the first one is created." />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">${title}</h1>
      <${P}View rows={rows} />
    </div>
  );
}
`,
    [`${P}View.tsx`]: view,
    "data.ts": `import type { Tone } from "@/components/ui/Status";

export type Row = { id: string; name: string; severity: "critical" | "high" | "medium" | "low"; tone: Tone; updated: string };

export const statusLabel: Record<Tone, string> = { ok: "Healthy", degraded: "Degraded", error: "Failing", offline: "Offline", idle: "Idle", pending: "Pending" };

/* Replace with your data-access layer. Runs on the server. */
export async function get${P}Rows(): Promise<Row[]> {
  await new Promise((r) => setTimeout(r, 400));
  return [
    { id: "r1", name: "Perimeter firewall", severity: "low", tone: "ok", updated: "2 minutes ago" },
    { id: "r2", name: "Domain controller", severity: "high", tone: "degraded", updated: "9 minutes ago" },
    { id: "r3", name: "VPN gateway", severity: "critical", tone: "error", updated: "3 hours ago" },
    { id: "r4", name: "Web proxy", severity: "medium", tone: "idle", updated: "1 day ago" },
  ];
}
`,
    "loading.tsx": loadingFile(title),
    "error.tsx": errorFile(P, title),
  };
}

function dashboardFiles(P: string, title: string, hasUix: boolean): Record<string, string> {
  const view = hasUix
    ? `"use client";

import { KpiCard } from "invin-uix/ui/kpi-card";
import { AreaChart, BarChart } from "invin-uix/ui/chart";
import { kpis, trend, breakdown } from "./data";

/* Charts read var(--primary) and the severity tokens. Never pass hex. */
export function ${P}View() {
  return (
    <>
      <div className="kpi-grid" id="kpi-grid">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
      <div className="chart-grid">
        <section className="card" aria-labelledby="h-trend">
          <h2 id="h-trend">Trend, last 7 days</h2>
          <AreaChart data={trend} xKey="day" areas={[{ key: "value", name: "Value", color: "var(--primary)" }]} height={240} />
        </section>
        <section className="card" aria-labelledby="h-breakdown">
          <h2 id="h-breakdown">Breakdown</h2>
          <BarChart data={breakdown} xKey="label" bars={[{ key: "count", name: "Count", color: "var(--primary)" }]} horizontal height={240} />
        </section>
      </div>
    </>
  );
}
`
    : `import { kpis, breakdown } from "./data";

export function ${P}View() {
  return (
    <>
      <div className="kpi-grid" id="kpi-grid">
        {kpis.map((k) => (
          <div className="card kpi" key={k.label}>
            <div className="label"><span className="legend" />{k.label}</div>
            <div className="value">{k.value}</div>
            <div className="sub-line">{k.description}</div>
          </div>
        ))}
      </div>
      <section className="card" aria-labelledby="h-breakdown">
        <h2 id="h-breakdown">Breakdown</h2>
        <table className="data">
          <thead><tr><th scope="col">Label</th><th scope="col" className="r">Count</th></tr></thead>
          <tbody>
            {breakdown.map((b) => (
              <tr key={b.label}><td>{b.label}</td><td className="r">{b.count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
`;
  return {
    "page.tsx": `import type { Metadata } from "next";
import { ${P}View } from "./${P}View";

export const metadata: Metadata = { title: "${title}" };

export default async function ${P}Page() {
  // Fetch on the server, in parallel, close to where the data is used, then pass it to the view.
  return (
    <div className="page">
      <h1 className="page-title">${title}</h1>
      <${P}View />
    </div>
  );
}
`,
    [`${P}View.tsx`]: view,
    "data.ts": `/* Mock data. Replace with a server fetch in page.tsx and pass it to the view. */
export const kpis = [
  { label: "Total", value: "1,284", description: "All records", trend: { value: "+4.2% this week", direction: "up" as const } },
  { label: "Needs action", value: "17", description: "Open items", trend: { value: "+2 today", direction: "down" as const } },
  { label: "Resolved", value: "96%", description: "Last 30 days", trend: { value: "No change", direction: "neutral" as const } },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const values = [182, 176, 190, 171, 165, 158, 160];
export const trend = days.map((day, i) => ({ day, value: values[i] ?? 0 }));

export const breakdown = [
  { label: "Category A", count: 31 },
  { label: "Category B", count: 24 },
  { label: "Category C", count: 19 },
  { label: "Category D", count: 9 },
];
`,
    "loading.tsx": loadingFile(title),
    "error.tsx": errorFile(P, title),
  };
}

function detailFiles(P: string, title: string, param: string): Record<string, string> {
  return {
    "page.tsx": `import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Status } from "@/components/ui/Status";
import { get${P}Record } from "./data";

export async function generateMetadata({ params }: { params: Promise<{ ${param}: string }> }): Promise<Metadata> {
  const { ${param} } = await params;
  return { title: \`${title} \${${param}}\` };
}

export default async function ${P}DetailPage({ params }: { params: Promise<{ ${param}: string }> }) {
  const { ${param} } = await params;
  const record = await get${P}Record(${param});
  if (!record) notFound();

  return (
    <div className="page">
      <h1 className="page-title">{record.name}</h1>
      <section className="card" aria-labelledby="h-summary">
        <h2 id="h-summary">Summary</h2>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              <tr><th scope="row">ID</th><td className="mono">{record.id}</td></tr>
              <tr><th scope="row">Status</th><td><Status tone={record.tone} label={record.toneLabel} /></td></tr>
              <tr><th scope="row">Owner</th><td>{record.owner}</td></tr>
              <tr><th scope="row">Last updated</th><td>{record.updated}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
`,
    "data.ts": `import type { Tone } from "@/components/ui/Status";

export type Record${P} = { id: string; name: string; tone: Tone; toneLabel: string; owner: string; updated: string };

/* Replace with your data-access layer. Return null when the record does not exist. */
export async function get${P}Record(id: string): Promise<Record${P} | null> {
  await new Promise((r) => setTimeout(r, 300));
  if (!/^[A-Za-z0-9-]{1,40}$/.test(id)) return null;
  return { id, name: \`${title} \${id}\`, tone: "ok", toneLabel: "Healthy", owner: "Platform team", updated: "2 minutes ago" };
}
`,
    "loading.tsx": `import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="page" aria-busy="true">
      <h1 className="page-title">${title}</h1>
      <div className="card">
        <Skeleton rows={4} height={32} />
      </div>
    </div>
  );
}
`,
    "error.tsx": errorFile(P, title),
  };
}

function formFiles(P: string, title: string): Record<string, string> {
  return {
    "page.tsx": `import type { Metadata } from "next";
import { ${P}Form } from "./${P}Form";

export const metadata: Metadata = { title: "${title}" };

export default function ${P}Page() {
  return (
    <div className="page">
      <h1 className="page-title">${title}</h1>
      <section className="card" aria-labelledby="h-form" style={{ maxWidth: 560 }}>
        <h2 id="h-form">Details</h2>
        <${P}Form />
      </section>
    </div>
  );
}
`,
    [`${P}Form.tsx`]: `"use client";

import { useState } from "react";
import { Status } from "@/components/ui/Status";
import { save${P} } from "./actions";

type Phase = "idle" | "submitting" | "success" | "error";

/* Four states: idle, submitting (button busy), success (confirmed in words), error (retry, nothing lost). */
export function ${P}Form() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errors, setErrors] = useState<{ name?: string }>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      setErrors({ name: "Enter a name." });
      return;
    }
    setErrors({});
    setPhase("submitting");
    try {
      await save${P}({ name, description: String(data.get("description") ?? "").trim() });
      setPhase("success");
    } catch {
      setPhase("error");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input className="input" id="name" name="name" type="text" autoComplete="off" aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "name-error" : "name-hint"} />
        {errors.name ? <p className="hint" id="name-error" role="alert">{errors.name}</p> : <p className="hint" id="name-hint">Shown to everyone in your tenant.</p>}
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <input className="input" id="description" name="description" type="text" autoComplete="off" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn primary" type="submit" aria-busy={phase === "submitting"}>
          {phase === "submitting" ? <span className="spinner" aria-hidden="true" /> : null}
          {phase === "submitting" ? "Saving" : "Save"}
        </button>
        {phase === "success" ? <Status tone="ok" label="Saved" /> : null}
        {phase === "error" ? <Status tone="error" label="Could not save. Your input is kept, try again." /> : null}
      </div>
    </form>
  );
}
`,
    "actions.ts": `"use server";

/* Replace with your data-access layer. Validate again on the server; never trust the client. */
export async function save${P}(input: { name: string; description: string }): Promise<void> {
  if (!input.name || input.name.length > 120) throw new Error("Invalid name");
  await new Promise((r) => setTimeout(r, 500));
}
`,
    "error.tsx": errorFile(P, title),
  };
}

function blankFiles(P: string, title: string): Record<string, string> {
  return {
    "page.tsx": `import type { Metadata } from "next";

export const metadata: Metadata = { title: "${title}" };

export default function ${P}Page() {
  return (
    <div className="page">
      <h1 className="page-title">${title}</h1>
      <section className="card">
        <h2>Overview</h2>
        <p className="muted prose">Build this page from the shell classes (page, card, kpi-grid, table.data) and invin-uix components.</p>
      </section>
    </div>
  );
}
`,
    "error.tsx": errorFile(P, title),
  };
}

function loadingFile(title: string): string {
  return `import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="page" aria-busy="true">
      <h1 className="page-title">${title}</h1>
      <div className="card">
        <Skeleton rows={4} height={40} />
      </div>
    </div>
  );
}
`;
}

function errorFile(P: string, title: string): string {
  return `"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function ${P}Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <h1 className="page-title">${title}</h1>
      <ErrorState what="${title} did not load" correlationId={error.digest ?? "unavailable"} onRetry={reset} />
    </div>
  );
}
`;
}

// ───────────────────────── Entry point ─────────────────────────

export function addPage(o: AddPageOptions): AddPageResult {
  if (!isAbsolute(o.projectDir)) throw new Error("projectDir must be an absolute path");
  if (!existsSync(join(o.projectDir, "package.json"))) throw new Error(`No package.json in ${o.projectDir}. Pass the project root.`);
  const pkg = JSON.parse(readFileSync(join(o.projectDir, "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps["next"]) throw new Error("This is not a Next.js project (no `next` dependency). Use the static-module template pages instead.");
  const hasUix = Boolean(deps["invin-uix"]);

  const srcApp = join(o.projectDir, "src", "app");
  const plainApp = join(o.projectDir, "app");
  const appRoot = existsSync(join(srcApp, "(app)")) ? srcApp : existsSync(join(plainApp, "(app)")) ? plainApp : null;
  if (!appRoot) throw new Error("Could not find the `(app)` route group (src/app/(app)). Is this an Invinsense Next.js project?");

  const segs = o.route.trim().replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (!segs.length || segs.length > 4) throw new Error("route needs 1 to 4 segments, e.g. `reports` or `settings/users`");
  for (const s of segs) if (!SEGMENT.test(s)) throw new Error(`Invalid route segment "${s}". Use lowercase kebab-case, or [param] for a dynamic segment.`);
  if (RESERVED.has(segs[0] as string)) throw new Error(`"${segs[0]}" is reserved.`);

  if (o.kind === "detail" && !(segs[segs.length - 1] as string).startsWith("[")) segs.push("[id]");
  const last = segs[segs.length - 1] as string;
  const param = last.startsWith("[") ? last.slice(1, -1) : "id";
  const isDynamic = segs.some((s) => s.startsWith("["));
  const P = pascal(segs);
  const staticSegs = segs.filter((s) => !s.startsWith("["));
  const title = o.title?.trim() || words(staticSegs[staticSegs.length - 1] ?? "page");

  const files =
    o.kind === "list" ? listFiles(P, title, hasUix)
    : o.kind === "dashboard" ? dashboardFiles(P, title, hasUix)
    : o.kind === "detail" ? detailFiles(P, title, param)
    : o.kind === "form" ? formFiles(P, title)
    : blankFiles(P, title);

  const dir = join(appRoot, "(app)", ...segs);
  const planned = Object.entries(files).map(([name, content]) => ({ path: join(dir, name), name, content }));
  const clashes = planned.filter((f) => existsSync(f.path));
  if (clashes.length && !o.overwrite) throw new Error(`These files already exist (pass overwrite=true to replace):\n${clashes.map((c) => "  " + c.path).join("\n")}`);

  // Navigation
  const navPath = join(dirname(appRoot), "lib", "nav.ts");
  const navId = staticSegs.join("-");
  const lines: string[] = [];
  let navSrc: string | null = null;
  let navOut: string | null = null;
  if (o.addToNav && !isDynamic) {
    if (!existsSync(navPath)) lines.push("Nav: src/lib/nav.ts not found, so the sidebar link was not added.");
    else {
      navSrc = readFileSync(navPath, "utf8");
      if (new RegExp(`id:\\s*"${navId}"`).test(navSrc)) lines.push(`Nav: an item with id "${navId}" already exists, left unchanged.`);
      else {
        const icons = navIcons(navSrc);
        let icon: string | undefined;
        if (o.icon && (!icons || icons.includes(o.icon))) icon = o.icon;
        else {
          icon = KIND_ICONS[o.kind].find((i) => !icons || icons.includes(i));
          if (o.icon) lines.push(`Nav: icon "${o.icon}" is not registered in this project (allowed: ${icons?.join(", ")}). Used ${icon ?? "no icon"} instead; register new icons in nav.ts and Sidebar.tsx.`);
        }
        const label = (o.navLabel ?? title).replace(/"/g, "'");
        const item = `{ id: "${navId}", label: "${label}", href: "/${segs.join("/")}"${icon ? `, icon: "${icon}"` : ""} }`;
        const r = insertNavItem(navSrc, o.navGroup, item, o.navGroup ?? "Overview");
        if (!r) lines.push("Nav: could not find the NAV array in src/lib/nav.ts, so the link was not added. Add it by hand.");
        else {
          navOut = r.out;
          lines.push(`Nav: ${r.note} → ${item}`);
        }
      }
    }
  } else if (o.addToNav && isDynamic) {
    lines.push("Nav: dynamic routes are not added to the sidebar. Link to it from a list page instead.");
  }

  const header = [
    `${o.dryRun ? "DRY RUN. Nothing written." : "Created"} ${o.kind} page "${title}" at /${segs.join("/")} (${hasUix ? "uses invin-uix" : "invin-uix not installed: plain shell components"})`,
    ...planned.map((f) => `  ${o.dryRun ? "would write" : "wrote"}  ${f.path.slice(o.projectDir.length + 1)}`),
    ...lines,
  ];

  if (o.dryRun) {
    header.push("", "Run again with dryRun=false to write these files.");
    return { text: header.join("\n"), written: false };
  }

  for (const f of planned) {
    mkdirSync(dirname(f.path), { recursive: true });
    writeFileSync(f.path, f.content);
  }
  if (navOut && navSrc !== null && navOut !== navSrc) writeFileSync(navPath, navOut);

  header.push(
    "",
    "Next steps:",
    `  1. Replace the mock data in ${segs.join("/")}/${o.kind === "form" ? "actions.ts" : "data.ts"} with your data-access layer.`,
    "  2. Run `npm run dev` and open the page. Preview states with ?state=error and ?state=empty where supported.",
    "  3. Run review_invinsense_ui on the new files before you commit.",
    "  4. If the page teaches a task, add a step to the guided tour (src/components/tour/tours.ts).",
  );
  return { text: header.join("\n"), written: true };
}
