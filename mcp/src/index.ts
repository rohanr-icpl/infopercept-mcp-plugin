#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { practices, categories, getById, search, toMarkdown, families, tokensCss, statusTones, newModuleChecklist, INVINSENSE_SOURCE, type Category } from "./content/index.js";
import { reviewInvinsense } from "./invinsense-reviewer.js";
import { scaffoldProject } from "./project.js";
import { convertProject, ALL_FIXES, type FixId } from "./convert.js";
import { addPage } from "./page.js";
import { auditComponents, auditData } from "./audit.js";
import { scoreProject, formatScore, scoreData } from "./score.js";
import { hotspotsRun, routesRun, tokensRun, reportRun } from "./insight.js";
import { isCli, runCli } from "./cli.js";
import { reviewCode } from "./reviewer.js";
import { componentTemplate, testTemplate, featureStructure } from "./scaffold.js";

const server = new McpServer({ name: "react-nextjs-best-practices", version: "1.0.0" });

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const CategoryEnum = z.enum(categories as [Category, ...Category[]]);
const ReadOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

// ───────────────────────── Tools ─────────────────────────

server.registerTool(
  "list_best_practices",
  {
    title: "List best practices",
    description: "List available React / Next.js best-practice topics, optionally filtered by category.",
    inputSchema: { category: CategoryEnum.optional().describe("invinsense | react | nextjs | typescript | performance | accessibility | security | testing") },
    annotations: ReadOnly,
  },
  async ({ category }) => {
    const items = category ? practices.filter((p) => p.category === category) : practices;
    return text(items.map((p) => `- \`${p.id}\` [${p.category}] ${p.title} — ${p.summary}`).join("\n"));
  },
);

server.registerTool(
  "get_best_practice",
  {
    title: "Get a best practice",
    description: "Get the full guidance (do / don't / code examples) for a topic id from list_best_practices.",
    inputSchema: { id: z.string().describe("Practice id, e.g. 'next-server-vs-client'") },
    annotations: ReadOnly,
  },
  async ({ id }) => {
    const p = getById(id);
    if (!p) return { ...text(`Unknown id "${id}". Use list_best_practices to see valid ids.`), isError: true };
    return text(toMarkdown(p));
  },
);

server.registerTool(
  "search_best_practices",
  {
    title: "Search best practices",
    description: "Keyword search across all guidance (e.g. 'server actions validation', 'image lcp', 'useEffect fetch').",
    inputSchema: {
      query: z.string().min(2),
      category: CategoryEnum.optional(),
      limit: z.number().int().min(1).max(10).default(3),
    },
    annotations: ReadOnly,
  },
  async ({ query, category, limit }) => {
    const hits = search(query, category).slice(0, limit);
    if (!hits.length) return text(`No matches for "${query}". Try list_best_practices.`);
    return text(hits.map(toMarkdown).join("\n\n---\n\n"));
  },
);

server.registerTool(
  "review_code",
  {
    title: "Review React / Next.js code",
    description:
      "Static heuristic review of a React or Next.js snippet against the best practices (keys, effects, a11y, RSC boundaries, security, Server Actions…). Returns findings with line numbers and the practice id to read for details.",
    inputSchema: {
      code: z.string().min(1).max(100_000).describe("Source of a .tsx/.jsx/.ts file"),
      framework: z.enum(["react", "nextjs"]).default("nextjs"),
    },
    annotations: ReadOnly,
  },
  async ({ code, framework }) => {
    const findings = reviewCode(code, framework);
    if (!findings.length) return text("✅ No issues detected by the built-in heuristics. (This is a static check — still run ESLint, tsc and tests.)");
    const icon = { error: "🔴", warning: "🟠", info: "🔵" } as const;
    const out = findings.map((f) => `${icon[f.severity]} L${f.line} [${f.rule}] ${f.message}\n   → get_best_practice("${f.practiceId}")`);
    const counts = ["error", "warning", "info"].map((s) => `${findings.filter((f) => f.severity === s).length} ${s}`).join(", ");
    return text(`Found ${findings.length} issue(s): ${counts}\n\n${out.join("\n")}`);
  },
);

server.registerTool(
  "scaffold_component",
  {
    title: "Scaffold a component",
    description: "Generate an accessible, typed component (and a Testing Library test). Returns file contents; it does not write to disk.",
    inputSchema: {
      name: z.string().regex(/^[A-Z][A-Za-z0-9]*$/, "PascalCase required"),
      kind: z.enum(["server", "client"]).default("server").describe("server = RSC (no 'use client'); client = interactive"),
      withProps: z.boolean().default(true),
      includeTest: z.boolean().default(true),
    },
    annotations: ReadOnly,
  },
  async ({ name, kind, withProps, includeTest }) => {
    let out = `### ${name}.tsx\n\`\`\`tsx\n${componentTemplate(name, kind, withProps)}\`\`\``;
    if (includeTest) out += `\n\n### ${name}.test.tsx\n\`\`\`tsx\n${testTemplate(name, withProps)}\`\`\``;
    return text(out);
  },
);

server.registerTool(
  "suggest_project_structure",
  {
    title: "Suggest feature structure",
    description: "Recommended folder layout for a new feature in a React or Next.js (App Router) codebase.",
    inputSchema: {
      feature: z.string().regex(/^[a-z][a-z0-9-]*$/, "lowercase kebab-case").describe("e.g. 'orders'"),
      framework: z.enum(["react", "nextjs"]).default("nextjs"),
    },
    annotations: ReadOnly,
  },
  async ({ feature, framework }) => text("```\n" + featureStructure(feature, framework) + "\n```"),
);

server.registerTool(
  "pre_merge_checklist",
  {
    title: "Pre-merge checklist",
    description: "A concise PR checklist for React / Next.js changes, ready to paste into a pull request.",
    inputSchema: { includeNext: z.boolean().default(true) },
    annotations: ReadOnly,
  },
  async ({ includeNext }) => {
    const base = [
      "Types: `tsc --noEmit` passes, no new `any`",
      "Lint: ESLint (react-hooks, jsx-a11y) clean; no disabled rules without justification",
      "Tests: behaviour covered with Testing Library; critical flow covered by Playwright",
      "A11y: keyboard reachable, labelled controls, alt text, focus visible, contrast ≥ 4.5:1",
      "State: no derived state in `useState`; no effects used for data transformation",
      "Lists use stable keys; no components defined inside components",
      "Loading, empty and error states handled",
      "No secrets or PII in code, logs or client bundle",
    ];
    const next = [
      "`\"use client\"` only where needed and pushed to leaf components",
      "Data fetched on the server, in parallel; slow parts streamed with Suspense",
      "Server Actions / Route Handlers validate input (Zod) and authorise the user",
      "Caching / revalidation explicit (`revalidatePath` / `revalidateTag` after mutations)",
      "`next/image`, `next/font`, `next/link` used; only the LCP image has `priority`",
      "Metadata (title, description, OG, canonical) set; `next build` shows expected static/dynamic routes",
      "Bundle impact checked (analyzer) for new dependencies",
    ];
    return text([...base, ...(includeNext ? next : [])].map((c) => `- [ ] ${c}`).join("\n"));
  },
);

// ───────────────────── Invinsense Module UI Guide v2.0 ─────────────────────

const familyIds = families.map((f) => f.id) as [string, ...string[]];
const icon = { error: "🔴", warning: "🟠", info: "🔵" } as const;

server.registerTool(
  "review_invinsense_ui",
  {
    title: "Review against Invinsense Module UI Guide",
    description:
      "Check CSS / HTML / JS / TSX from an Invinsense module against the Module UI Guide v2.0: hardcoded hex, token namespaces, dark: prefix, sub-12px text, fonts, motion, gradients/glow/side-stripes, icons, chart library, nav-as-button, copy (em-dashes, buzzwords, exclamation marks) and more. Mirrors the intent of `npm run slop`; it does not replace it.",
    inputSchema: { code: z.string().min(1).max(200_000).describe("Contents of a .css, .html, .js, .jsx, .ts or .tsx file") },
    annotations: ReadOnly,
  },
  async ({ code }) => {
    const findings = reviewInvinsense(code);
    if (!findings.length) return text("✅ No Invinsense guide violations detected by the built-in checks. Still run `npm run slop`, measure contrast in both themes and screenshot dark + light.");
    const counts = ["error", "warning", "info"].map((s) => `${findings.filter((f) => f.severity === s).length} ${s}`).join(", ");
    const out = findings.map((f) => `${icon[f.severity]} L${f.line} [${f.rule}] ${f.message}\n   → get_best_practice("${f.practiceId}")`);
    return text(`Found ${findings.length} issue(s): ${counts}\n\n${out.join("\n")}`);
  },
);

server.registerTool(
  "get_invinsense_tokens",
  {
    title: "Get Invinsense design tokens",
    description: "Ready-to-paste CSS token block (dark + light, OKLCH) for a product family, plus the family accent pairs and the status tones.",
    inputSchema: { family: z.enum(familyIds).describe("isoc-core | isoc-extension | uemp | grc | cps-pulse | regimentai | assentra") },
    annotations: ReadOnly,
  },
  async ({ family }) => {
    const f = families.find((x) => x.id === family)!;
    const tones = statusTones.map(([t, dot, meaning, pulse]) => `- \`${t}\` (${dot}, ${pulse}): ${meaning}`).join("\n");
    return text(
      `Family **${f.name}**: primary ${f.primary}, secondary ${f.secondary}. Used on: ${f.products}.\n\n\`\`\`css\n${tokensCss(family)}\`\`\`\n\n**Status tones** (dot + word, never colour alone)\n${tones}\n\n_Source: ${INVINSENSE_SOURCE}. Measure --accent-text contrast per theme; --accent-fill/soft/line are derived from --accent._`,
    );
  },
);

server.registerTool(
  "invinsense_new_module_checklist",
  {
    title: "Invinsense new-module checklist",
    description: "The 14-step checklist for adding a new product module to the Invinsense suite, ready to paste into a PR.",
    inputSchema: {},
    annotations: ReadOnly,
  },
  async () => text(newModuleChecklist.map((c) => `- [ ] ${c}`).join("\n")),
);

// ───────────────── Command: create a new project with the guide ─────────────────

server.registerTool(
  "scaffold_invinsense_project",
  {
    title: "Create a new Invinsense project",
    description:
      "Creates a new project on disk that follows the Invinsense Module UI Guide v2.0 and React / Next.js best practices. type='nextjs' (default) builds a Next.js App Router app (Geist, Phosphor Bold, tokens for dark + light, shell, tour with nextstepjs, four states, login). type='static-module' builds the guide's section 20 module (index.html + css/js folders) ready to drop into the launcher's public/ folder. Writes files only when dryRun=false.",
    inputSchema: {
      name: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/).describe("Folder and package id, lowercase kebab-case, e.g. 'case-manager'. Must match the catalog.js id for launcher modules."),
      productName: z.string().min(1).max(60).describe("Display name shown in the lockup and page titles, e.g. 'Case'"),
      family: z.enum(familyIds).describe("Product family accent: isoc-core | isoc-extension | uemp | grc | cps-pulse | regimentai | assentra"),
      targetDir: z.string().min(1).describe("ABSOLUTE path of the parent folder. The project is created at <targetDir>/<name>."),
      type: z.enum(["nextjs", "static-module"]).default("nextjs"),
      multiTenant: z.boolean().default(false).describe("Show the tenant switcher in the topbar"),
      dryRun: z.boolean().default(false).describe("List the files that would be created without writing anything"),
      overwrite: z.boolean().default(false).describe("Allow writing into an existing non-empty folder"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (a) => {
    try {
      const r = scaffoldProject({ name: a.name, productName: a.productName, family: a.family, type: a.type, targetDir: a.targetDir, multiTenant: a.multiTenant, dryRun: a.dryRun, overwrite: a.overwrite });
      const next =
        a.type === "nextjs"
          ? `cd ${r.projectDir}\nnpm install\nnpm run dev`
          : `cd ${r.projectDir}\nnpm start   # or open index.html\n# then copy the folder to invinsense-launcher/public/${a.name}/ and register it in INTERNAL_MODULE_URLS`;
      return text(
        `${r.written ? "✅ Created" : "🔎 Dry run, would create"} ${a.type} project **${a.productName}** (${a.family}) at ${r.projectDir}\n\n` +
          `Files (${r.files.length}):\n${r.files.map((f) => `- ${f}`).join("\n")}\n\n` +
          (r.written ? `Next:\n\`\`\`\n${next}\n\`\`\`\n\n` : "") +
          `Still to do by hand: add logo assets from the shared package (never recreate them), the Lottie login illustration, real tour copy, and real data. ` +
          `Then run review_invinsense_ui on the files you change and walk invinsense_new_module_checklist.`,
      );
    } catch (e) {
      return { ...text(`Could not scaffold: ${(e as Error).message}`), isError: true };
    }
  },
);

// ───────────────── Command: convert an existing product to the guide ─────────────────

server.registerTool(
  "convert_to_invinsense",
  {
    title: "Convert an existing product to the Invinsense guide",
    description:
      "Audits an existing project folder against the Invinsense Module UI Guide v2.0 and (mode='apply') applies the safe, mechanical fixes: adds the token stylesheet and wires it in, sets data-theme, maps the family accent hex and your colorMap entries to tokens, replaces transition: all and ease-in with ease-out on opacity/transform, raises font sizes to the 12px floor, switches fonts to the Geist variables, and appends the reduced-motion block. It never touches node_modules/build output, backs up every modified file, and refuses to write on a dirty git tree unless force=true. Everything that needs judgment (shell, icons, charts, copy, states, tour) is returned as a prioritised list for you to fix next. Defaults to mode='audit'; apply defaults to dryRun=true.",
    inputSchema: {
      path: z.string().min(1).describe("ABSOLUTE path of the existing project folder"),
      family: z.enum(familyIds).describe("Product family whose accent and tokens to adopt"),
      mode: z.enum(["audit", "apply"]).default("audit"),
      dryRun: z.boolean().default(true).describe("In apply mode, preview changes without writing. Set false to write."),
      fixes: z.array(z.enum(ALL_FIXES as [FixId, ...FixId[]])).default([]).describe("Limit to these automatic fixes. Empty means all: " + ALL_FIXES.join(", ")),
      colorMap: z.record(z.string(), z.string()).default({}).describe("Map your existing colours to tokens, e.g. {\"#1a73e8\": \"var(--accent)\", \"#ffffff\": \"var(--card)\"}"),
      writeReport: z.boolean().default(true).describe("When writing, also save INVINSENSE_MIGRATION.md in the project"),
      force: z.boolean().default(false).describe("Allow writing when the git working tree has uncommitted changes"),
      maxFiles: z.number().int().min(1).max(5000).default(1500),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (a) => {
    try {
      const r = convertProject({ path: a.path, family: a.family, mode: a.mode, dryRun: a.dryRun, fixes: a.fixes as FixId[], colorMap: a.colorMap, writeReport: a.writeReport, force: a.force, maxFiles: a.maxFiles });
      return text(r.text);
    } catch (e) {
      return { ...text(`Could not convert: ${(e as Error).message}`), isError: true };
    }
  },
);


server.registerTool(
  "add_invinsense_page",
  {
    title: "Add a new page / route to an Invinsense Next.js project",
    description:
      "Creates a new App Router page inside src/app/(app) of an Invinsense Next.js project, wired the way the guide expects: page.tsx plus loading.tsx and error.tsx (four states), mock data you replace, invin-uix components when the project has them, and a sidebar link added to src/lib/nav.ts. Kinds: list (searchable table), dashboard (KPI cards and charts), detail (dynamic [id] record page), form (validated form with submitting, success and error states), blank. Defaults to dryRun=true: shows the files and nav change first. Never overwrites existing files unless overwrite=true.",
    inputSchema: {
      projectDir: z.string().min(1).describe("ABSOLUTE path of the project root (the folder with package.json)"),
      route: z.string().min(1).describe("Route path without leading slash, kebab-case, e.g. reports or settings/users. Use [id] for a dynamic segment."),
      kind: z.enum(["list", "dashboard", "detail", "form", "blank"]).default("list"),
      title: z.string().max(60).optional().describe("Page title. Defaults to the last route segment in Title Case."),
      navGroup: z.string().optional().describe("Sidebar group label to add the link to. Defaults to the first group; created if it does not exist."),
      navLabel: z.string().max(30).optional().describe("Sidebar label. Defaults to the title."),
      icon: z.string().optional().describe("Nav icon id registered in nav.ts (new projects: squares-four, table, gear, list-checks, shield-check, database, bell, user, chart-line, file-text)"),
      addToNav: z.boolean().default(true),
      dryRun: z.boolean().default(true).describe("Preview only. Set false to write the files."),
      overwrite: z.boolean().default(false),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (a) => {
    try {
      return text(addPage({ projectDir: a.projectDir, route: a.route, kind: a.kind, title: a.title, navGroup: a.navGroup, navLabel: a.navLabel, icon: a.icon, addToNav: a.addToNav, dryRun: a.dryRun, overwrite: a.overwrite }).text);
    } catch (e) {
      return { ...text(`Could not add the page: ${(e as Error).message}`), isError: true };
    }
  },
);

const fmtArg = z.enum(["markdown", "json"]).default("markdown").describe('"json" returns machine-readable JSON only (no prose). Default markdown.');
const jsonText = (d: unknown) => text(JSON.stringify(d, null, 2));

server.registerTool(
  "score_invinsense_compliance",
  {
    title: "Score a project against the Invinsense Module UI Guide (0 to 100)",
    description:
      "Read-only. Scans a project and returns one compliance score out of 100 with a letter grade (A 90+, B 80+, C 70+, D 60+, F below). Violations 50 points (guide rule findings per 1,000 lines, errors weigh more than warnings), structure 30 points (10 new-module checklist items: tokens, theme, fonts, icons, shell, nav links, four states, tour, reduced motion, charts), components 20 points (no third-party UI libraries, invin-uix adoption). Returns a per-category breakdown and the five changes that would gain the most points. Internal tracking score, not part of the guide itself.",
    inputSchema: {
      path: z.string().min(1).describe("ABSOLUTE path of the project root"),
      maxFiles: z.number().int().min(1).max(5000).default(1500),
      format: fmtArg,
    },
    annotations: ReadOnly,
  },
  async (a) => {
    try {
      if (a.format === "json") return jsonText(scoreData(a.path, a.maxFiles));
      return text(scoreProject(a.path, a.maxFiles).text);
    } catch (e) {
      return { ...text(`Could not score: ${(e as Error).message}`), isError: true };
    }
  },
);

server.registerTool(
  "audit_ui_components",
  {
    title: "Audit which UI components come from invin-uix and which are third-party",
    description:
      "Scans a project's source and reports where its UI components come from: how many JSX usages are from invin-uix, from local components, and from third-party UI libraries (MUI, Chakra, Ant, Radix, Recharts, lucide, etc.), with package versions, the files affected, and the invin-uix replacement for each. Also lists other third-party packages, local components that duplicate an invin-uix component, and invin-uix components that are available but unused. Read-only.",
    inputSchema: {
      path: z.string().min(1).describe("ABSOLUTE path of the project root"),
      detail: z.enum(["summary", "full"]).default("summary").describe("full adds affected files per package and the unused invin-uix components"),
      maxFiles: z.number().int().min(1).max(5000).default(2000),
      format: fmtArg,
    },
    annotations: ReadOnly,
  },
  async (a) => {
    try {
      if (a.format === "json") return jsonText(auditData(a.path, a.maxFiles));
      const report = auditComponents({ path: a.path, detail: a.detail, maxFiles: a.maxFiles });
      const { score } = scoreProject(a.path, a.maxFiles);
      return text(`${report}\n\n${formatScore(score)}`);
    } catch (e) {
      return { ...text(`Could not audit: ${(e as Error).message}`), isError: true };
    }
  },
);

const safe = (label: string, fn: () => string) => {
  try {
    return text(fn());
  } catch (e) {
    return { ...text(`Could not ${label}: ${(e as Error).message}`), isError: true };
  }
};
const pathArg = z.string().min(1).describe("ABSOLUTE path of the project root");
const safeFmt = (label: string, format: string, fn: () => { data: unknown; text: string }) => {
  try {
    const r = fn();
    return format === "json" ? jsonText(r.data) : text(r.text);
  } catch (e) {
    return { ...text(format === "json" ? JSON.stringify({ error: (e as Error).message }) : `Could not ${label}: ${(e as Error).message}`), isError: true };
  }
};

server.registerTool(
  "invinsense_hotspots",
  {
    title: "Rank files by Invinsense guide violations",
    description: "Read-only. Ranks the files with the most guide violations (errors weigh 3, warnings 1), shows each file's share of the total, counts findings by rule with a fix hint, and counts invinsense-allow suppressions. Use it to decide which file to fix first.",
    inputSchema: { path: pathArg, top: z.number().int().min(1).max(50).default(10), maxFiles: z.number().int().min(1).max(5000).default(1500), format: fmtArg },
    annotations: ReadOnly,
  },
  async (a) => safeFmt("rank hotspots", a.format, () => hotspotsRun(a.path, a.top, a.maxFiles)),
);

server.registerTool(
  "invinsense_routes",
  {
    title: "List Next.js routes with state coverage",
    description: "Read-only. Lists every App Router page with whether it has loading and error handling (inherited from parent folders counts), an empty state, invin-uix usage, a navigation link and whether it is a client component. Flags gaps and a missing not-found page. App Router only.",
    inputSchema: { path: pathArg, maxFiles: z.number().int().min(1).max(5000).default(1500), format: fmtArg },
    annotations: ReadOnly,
  },
  async (a) => safeFmt("list routes", a.format, () => routesRun(a.path, a.maxFiles)),
);

server.registerTool(
  "invinsense_tokens",
  {
    title: "Show design token usage",
    description: "Read-only. Shows the most used CSS tokens, files with hardcoded hex colours, tokens that are used but never defined (including checks against invin-uix tokens when installed), and tokens defined but never used.",
    inputSchema: { path: pathArg, maxFiles: z.number().int().min(1).max(5000).default(1500), format: fmtArg },
    annotations: ReadOnly,
  },
  async (a) => safeFmt("check tokens", a.format, () => tokensRun(a.path, a.maxFiles)),
);

server.registerTool(
  "invinsense_report",
  {
    title: "Full Invinsense project report with score trend",
    description: "Builds one markdown report: score and breakdown, trend over previous runs, hotspots, routes, tokens and the component audit. With save=true it writes invinsense-report.md and appends the score to .invinsense/history.json in the project (the only writes; default is read-only).",
    inputSchema: { path: pathArg, save: z.boolean().default(false).describe("Write invinsense-report.md and record this score in .invinsense/history.json"), maxFiles: z.number().int().min(1).max(5000).default(1500), format: fmtArg },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (a) => safeFmt("build report", a.format, () => reportRun(a.path, a.save, a.maxFiles)),
);

// ───────────────────────── Resources ─────────────────────────

server.registerResource(
  "best-practice",
  new ResourceTemplate("bestpractice://{id}", {
    list: async () => ({
      resources: practices.map((p) => ({ uri: `bestpractice://${p.id}`, name: p.title, description: p.summary, mimeType: "text/markdown" })),
    }),
  }),
  { title: "Best practice guide", description: "Markdown guidance for a single topic", mimeType: "text/markdown" },
  async (uri, { id }) => {
    const p = getById(String(id));
    if (!p) throw new Error(`Unknown best practice: ${id}`);
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: toMarkdown(p) }] };
  },
);

server.registerResource(
  "handbook",
  "bestpractice://all",
  { title: "Full handbook", description: "Every React + Next.js guideline in one document", mimeType: "text/markdown" },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# React & Next.js Frontend Handbook\n\n${practices.map(toMarkdown).join("\n\n")}` }],
  }),
);

server.registerResource(
  "invinsense-guide",
  "bestpractice://invinsense/guide",
  { title: "Invinsense Module UI Guide v2.0", description: `Full guide as markdown. Source: ${INVINSENSE_SOURCE}`, mimeType: "text/markdown" },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "text/markdown",
      text: `# Invinsense Module UI Guide v2.0\n\nSource: ${INVINSENSE_SOURCE}\n\n${practices.filter((p) => p.category === "invinsense").map(toMarkdown).join("\n\n")}\n\n## New-module checklist\n${newModuleChecklist.map((c) => `- [ ] ${c}`).join("\n")}`,
    }],
  }),
);

// ───────────────────────── Prompts ─────────────────────────

server.registerPrompt(
  "review-component",
  {
    title: "Review a component",
    description: "Review code against React / Next.js best practices",
    argsSchema: { code: z.string(), framework: z.enum(["react", "nextjs"]).default("nextjs") },
  },
  ({ code, framework }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Review the following ${framework} code. First call the \`review_code\` tool, then use \`get_best_practice\` for any flagged ids. Give prioritised, concrete fixes with corrected code.\n\n\`\`\`tsx\n${code}\n\`\`\``,
        },
      },
    ],
  }),
);

server.registerPrompt(
  "plan-feature",
  {
    title: "Plan a Next.js feature",
    description: "Plan a feature following App Router best practices",
    argsSchema: { feature: z.string().describe("What to build") },
  },
  ({ feature }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Plan this feature for a Next.js App Router project: ${feature}\n\nUse \`suggest_project_structure\`, \`search_best_practices\` (rendering, data fetching, server actions, security) and \`pre_merge_checklist\`. Decide the Server/Client boundary, data flow, caching/revalidation, validation and error/loading states before writing code.`,
        },
      },
    ],
  }),
);

server.registerPrompt(
  "build-invinsense-module",
  {
    title: "Build an Invinsense module screen",
    description: "Build or review a screen following the Invinsense Module UI Guide v2.0",
    argsSchema: { task: z.string().describe("What to build or review"), family: z.enum(familyIds).default("isoc-core") },
  },
  ({ task, family }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Task: ${task}\nFamily: ${family}\n\nFollow the Invinsense Module UI Guide v2.0. Call \`get_invinsense_tokens\` for the token block, read \`bestpractice://invinsense/guide\`, reuse the shared shell/components, ship loading, empty, error and partial states, support dark + light via html[data-theme], and add a specific guided-tour step. Before finishing, run \`review_invinsense_ui\` on every changed file and fix all errors, then walk \`invinsense_new_module_checklist\`.`,
      },
    }],
  }),
);

server.registerPrompt(
  "convert-to-invinsense",
  {
    title: "Convert my product to the Invinsense guide",
    description: "Audit an existing project, apply safe fixes, then finish the manual work",
    argsSchema: {
      path: z.string().describe("Absolute path of the project"),
      family: z.enum(familyIds).default("isoc-core"),
    },
  },
  ({ path, family }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Convert the product at ${path} to the Invinsense Module UI Guide v2.0 (family: ${family}).\n\n1. Call \`convert_to_invinsense\` with mode="audit" and read the report.\n2. Ask me for any brand colours worth mapping (colorMap), then call it with mode="apply", dryRun=true and show me the summary.\n3. After I approve, call it with dryRun=false (commit or stash first).\n4. Fix every remaining error by hand using \`get_best_practice\` for each flagged id: shell, nav links, Phosphor icons, reaviz charts, four states, tour, copy.\n5. Re-run the audit until errors are zero, run \`review_invinsense_ui\` on the files you changed, then walk \`invinsense_new_module_checklist\`.`,
      },
    }],
  }),
);

server.registerPrompt(
  "new-invinsense-project",
  {
    title: "Create a new Invinsense project",
    description: "Scaffold a new project that follows the guide, then build the first screens",
    argsSchema: {
      name: z.string().describe("kebab-case id, e.g. case-manager"),
      productName: z.string().describe("Display name, e.g. Case"),
      family: z.enum(familyIds).default("isoc-core"),
      targetDir: z.string().describe("Absolute path of the parent folder"),
      type: z.enum(["nextjs", "static-module"]).default("nextjs"),
    },
  },
  ({ name, productName, family, targetDir, type }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Create a new ${type} project "${productName}" (id ${name}, family ${family}) in ${targetDir}.\n\n1. Call \`scaffold_invinsense_project\` with dryRun=true, show me the file list, then run it for real.\n2. Install dependencies and start it, and confirm the shell renders in dark and light.\n3. Ask me what the first real screens are, then build them on the shared components with all four states and a specific tour.\n4. Run \`review_invinsense_ui\` on every file you changed and fix all errors, then walk \`invinsense_new_module_checklist\`.`,
      },
    }],
  }),
);

// Command-style prompts: these show up in the prompt menu of clients without plugin slash commands
// (Claude desktop app, Cursor, Kiro...), so the commands work there too.
const pathP = z.string().describe("ABSOLUTE path of the project root");
const JSONABLE = new Set(["invinsense-score", "invinsense-hotspots", "invinsense-routes", "invinsense-tokens", "invinsense-report", "invinsense-audit-components"]);
const cmd = (name: string, title: string, description: string, argsSchema: Record<string, z.ZodTypeAny>, build: (a: any) => string) =>
  server.registerPrompt(
    name,
    { title, description, argsSchema: JSONABLE.has(name) ? { ...argsSchema, json: z.enum(["yes", "no"]).default("no").describe("yes returns machine-readable JSON only") } : argsSchema },
    (a: any) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: build(a) + (a.json === "yes" ? "\n\nOUTPUT MODE: JSON. Call the tool with format=\"json\" and reply with ONLY the raw JSON it returns, inside one ```json code block. No summary, no commentary, no extra text." : ""),
          },
        },
      ],
    }),
  );

cmd("invinsense-score", "Score a project (0 to 100)", "Compliance score with grade and the biggest wins", { path: pathP },
  ({ path }) => `Call \`score_invinsense_compliance\` on ${path}. Show the total with grade, the three category scores and the biggest wins, then name the single next action that gains the most points. Read-only: change nothing.`);
cmd("invinsense-hotspots", "Hotspots: worst files first", "Rank files by guide violations", { path: pathP, top: z.string().optional().describe("How many files, default 10") },
  ({ path, top }) => `Call \`invinsense_hotspots\` on ${path}${top ? ` with top=${top}` : ""}. Show the worst-files and findings-by-rule tables, then name the one file to fix first and the command that fixes it. Read-only.`);
cmd("invinsense-routes", "Routes: state coverage", "List routes with loading, error, empty-state and nav coverage", { path: pathP },
  ({ path }) => `Call \`invinsense_routes\` on ${path}. Show the route table and the to-fix list. For each gap name the file to add. Read-only until I say go.`);
cmd("invinsense-tokens", "Tokens: usage and health", "Token usage, hardcoded colours, undefined and unused tokens", { path: pathP },
  ({ path }) => `Call \`invinsense_tokens\` on ${path}. Show the result. If there are hardcoded colours offer \`convert_to_invinsense\`; if tokens are used but undefined, say where and propose the definition. Never invent token namespaces. Read-only.`);
cmd("invinsense-report", "Full report with trend", "Score, trend, hotspots, routes, tokens and component audit", { path: pathP, save: z.enum(["yes", "no"]).default("no").describe("yes writes invinsense-report.md and records the score in .invinsense/history.json") },
  ({ path, save }) => `Call \`invinsense_report\` on ${path} with save=${save === "yes"}. Lead with the score and trend, then summarise the three biggest problems in plain words.${save === "yes" ? " Tell me which two files were written." : ""}`);
cmd("invinsense-audit-components", "Audit invin-uix vs third-party", "Which components come from invin-uix, local code or third-party libraries", { path: pathP },
  ({ path }) => `Call \`audit_ui_components\` on ${path} (detail=full). Summarise the invin-uix share, the third-party UI libraries with the invin-uix replacement for each, and local duplicates. Read-only.`);
cmd("invinsense-new-page", "Add a page / route", "Add a list, dashboard, detail, form or blank page to an Invinsense Next.js project", {
    projectDir: pathP, route: z.string().describe("Route, e.g. reports or settings/users"), kind: z.enum(["list", "dashboard", "detail", "form", "blank"]).default("list"), title: z.string().optional() },
  ({ projectDir, route, kind, title }) => `Call \`add_invinsense_page\` for ${projectDir}, route "${route}", kind ${kind}${title ? `, title "${title}"` : ""}, with dryRun=true first and show the file list and nav change. Then run it for real, and run \`review_invinsense_ui\` on the new files.`);
cmd("invinsense-review", "Review UI code against the guide", "Review a folder or file against the Module UI Guide v2.0 and React/Next.js rules", { path: z.string().describe("ABSOLUTE path of a file or folder") },
  ({ path }) => `Review ${path}. For each source file run \`review_invinsense_ui\` (and \`review_code\` for TSX/JSX), group findings by severity, fix every error, and for a folder also call \`score_invinsense_compliance\` and report the score.`);

// ───────────────────────── Start ─────────────────────────

if (isCli(process.argv)) process.exit(runCli(process.argv));

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("react-nextjs-best-practices MCP server running on stdio");
