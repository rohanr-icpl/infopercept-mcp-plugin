import { existsSync, readFileSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import { basename, join } from "node:path";
import { rel, walkSources } from "./fsutil.js";

export interface AuditOptions {
  path: string;
  maxFiles: number;
  detail: "summary" | "full";
}

type Origin = "invin-uix" | "local" | "framework" | "icons" | "fonts" | "tour" | "node" | "third-party";

interface ImportRec {
  spec: string;
  pkg: string;
  origin: Origin;
  names: string[];
  file: string;
}

const BUILTINS = new Set(builtinModules.map((m) => m.replace(/^node:/, "")));
const SCRIPT_EXT = /\.(tsx?|jsx?|mjs|cjs)$/;

const UI_LIBS: { re: RegExp; kind: string; hint: string }[] = [
  { re: /^(@mui\/|@emotion\/|@chakra-ui\/|antd$|@ant-design\/|@mantine\/|@nextui-org\/|@heroui\/|react-bootstrap|bootstrap$|reactstrap|primereact|semantic-ui|@blueprintjs\/|rsuite|@fluentui\/|@headlessui\/|@radix-ui\/|@tremor\/|daisyui|flowbite)/, kind: "UI kit", hint: "Replace with invin-uix components (Button, Badge, Card, Avatar, Alert, Switch, Separator, Skeleton, DataTable, KpiCard…)." },
  { re: /^(recharts|chart\.js|react-chartjs-2|apexcharts|react-apexcharts|victory|@nivo\/|echarts|echarts-for-react|highcharts|@visx\/|react-vis|reaviz)/, kind: "Charts", hint: "Use invin-uix/ui/chart (AreaChart, BarChart, DonutChart, GaugeChart). The guide mandates reaviz-based charts via the library." },
  { re: /^(@tanstack\/react-table|react-table|ag-grid|@ag-grid|@mui\/x-data-grid|react-data-grid|material-react-table)/, kind: "Data table", hint: "Use invin-uix/ui/data-table." },
  { re: /^(react-icons|lucide-react|@heroicons\/|@fortawesome\/|@tabler\/|@mui\/icons|feather-icons|react-feather|@iconify)/, kind: "Icons", hint: "Law 11: Phosphor Bold only. Use @phosphor-icons/react." },
  { re: /^(react-joyride|react-shepherd|shepherd\.js|driver\.js|intro\.js|react-intro\.js|reactour|@reactour\/)/, kind: "Tour", hint: "Guide section 16: use nextstepjs 2.2.0." },
  { re: /^(react-toastify|react-hot-toast|sonner|notistack|react-simple-toasts)/, kind: "Toasts", hint: "Use the invin-uix toast/alert pattern (guide section 13)." },
  { re: /^(react-datepicker|react-day-picker|@mui\/x-date-pickers|react-calendar|flatpickr)/, kind: "Date picker", hint: "Use invin-uix/ui/calendar if available." },
  { re: /^(react-select|react-dropdown|downshift|cmdk)/, kind: "Select / combobox", hint: "Use the invin-uix select/combobox primitives if available." },
  { re: /^(react-modal|sweetalert|@sweetalert2\/|react-responsive-modal)/, kind: "Modal", hint: "Use invin-uix dialog/modal primitives if available." },
  { re: /^(styled-components|@stitches\/|@vanilla-extract\/|linaria|twin\.macro)/, kind: "CSS-in-JS", hint: "Use module tokens (CSS variables) and the shell classes; no CSS-in-JS runtime." },
];

const pkgName = (spec: string) => (spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : (spec.split("/")[0] as string));

function classify(spec: string): Origin {
  if (spec.startsWith(".") || spec.startsWith("@/") || spec.startsWith("~/") || spec.startsWith("#") || spec.startsWith("src/")) return "local";
  const pkg = pkgName(spec);
  if (spec.startsWith("node:") || BUILTINS.has(pkg)) return "node";
  if (pkg === "invin-uix") return "invin-uix";
  if (pkg === "react" || pkg === "react-dom" || pkg === "next" || pkg === "server-only" || pkg === "client-only") return "framework";
  if (pkg.startsWith("@phosphor-icons/")) return "icons";
  if (pkg === "geist") return "fonts";
  if (pkg === "nextstepjs") return "tour";
  return "third-party";
}

function namesFromClause(clause: string): string[] {
  const names: string[] = [];
  const trimmed = clause.trim();
  const brace = trimmed.match(/\{([\s\S]*)\}/);
  const head = trimmed.replace(/\{[\s\S]*\}/, "").replace(/,/g, " ").trim();
  if (head && !head.startsWith("*")) names.push(head.split(/\s+/)[0] as string);
  if (head.startsWith("*")) {
    const ns = head.match(/as\s+(\w+)/);
    if (ns?.[1]) names.push(ns[1]);
  }
  if (brace?.[1]) {
    for (const part of brace[1].split(",")) {
      const p = part.trim();
      if (!p || p.startsWith("type ")) continue;
      const alias = p.split(/\s+as\s+/);
      names.push((alias[1] ?? alias[0] ?? "").trim());
    }
  }
  return names.filter((n) => /^[A-Za-z_$][\w$]*$/.test(n));
}

function parseImports(src: string, file: string): ImportRec[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const out: ImportRec[] = [];
  const add = (spec: string, names: string[]) => out.push({ spec, pkg: classify(spec) === "local" ? spec : pkgName(spec), origin: classify(spec), names, file });
  for (const m of code.matchAll(/\bimport\s+(type\s+)?([\w*$\s{},]+?)\s+from\s*["']([^"']+)["']/g)) {
    if (m[1]) continue; // type-only imports ship no runtime component
    add(m[3] as string, namesFromClause(m[2] as string));
  }
  for (const m of code.matchAll(/\bimport\s*["']([^"']+)["']/g)) add(m[1] as string, []);
  for (const m of code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)) add(m[1] as string, []);
  for (const m of code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) add(m[1] as string, []);
  return out;
}

function jsxUses(src: string, name: string): number {
  if (!/^[A-Z]/.test(name)) return 0;
  const esc = name.replace(/\$/g, "\\$");
  return (src.match(new RegExp(`<${esc}(?=[\\s/>.<])`, "g")) ?? []).length;
}

function availableUix(root: string): string[] | null {
  const pj = join(root, "node_modules", "invin-uix", "package.json");
  if (!existsSync(pj)) return null;
  try {
    const exp = (JSON.parse(readFileSync(pj, "utf8")) as { exports?: Record<string, unknown> }).exports ?? {};
    return Object.keys(exp).filter((k) => k.startsWith("./ui/")).map((k) => k.slice(5)).filter((k) => k !== "lib/utils");
  } catch {
    return null;
  }
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const pct = (n: number, d: number) => (d === 0 ? "0%" : `${Math.round((n / d) * 100)}%`);

export function collectComponents(root: string, maxFiles: number) {
  const walked = walkSources(root, { maxFiles, maxBytes: Infinity });
  const pkgPath = join(root, "package.json");
  const pkg = existsSync(pkgPath)
    ? (JSON.parse(readFileSync(pkgPath, "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> })
    : {};
  const declared: Record<string, string> = { ...pkg.devDependencies, ...pkg.dependencies };

  const files = walked.files.filter((f) => SCRIPT_EXT.test(f));

  type Agg = { imports: number; files: Set<string>; uses: number; names: Set<string> };
  const mk = (): Agg => ({ imports: 0, files: new Set(), uses: 0, names: new Set() });
  const uix = new Map<string, Agg>(); // by subpath
  const third = new Map<string, Agg & { uiLike: boolean }>(); // by package
  const local = mk();
  const frameworkUses = { n: 0 };
  const iconsUses = mk();
  const filesWithUix = new Set<string>();
  const localComponentFiles: string[] = [];

  for (const f of files) {
    let src: string;
    try {
      src = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    const r = rel(root, f);
    if (/(^|\/)components?\//i.test(r) && /\.(tsx|jsx)$/.test(f)) localComponentFiles.push(f);
    for (const imp of parseImports(src, r)) {
      const uses = imp.names.reduce((n, nm) => n + jsxUses(src, nm), 0);
      if (imp.origin === "invin-uix") {
        const a = uix.get(imp.spec) ?? mk();
        a.imports++;
        a.files.add(r);
        a.uses += uses;
        imp.names.forEach((n) => a.names.add(n));
        uix.set(imp.spec, a);
        filesWithUix.add(r);
      } else if (imp.origin === "third-party") {
        const a = third.get(imp.pkg) ?? { ...mk(), uiLike: UI_LIBS.some((l) => l.re.test(imp.pkg)) };
        a.imports++;
        a.files.add(r);
        a.uses += uses;
        if (uses > 0) a.uiLike = true;
        imp.names.forEach((n) => a.names.add(n));
        third.set(imp.pkg, a);
      } else if (imp.origin === "local") {
        // Only count component-like local imports (a capitalised name used as JSX).
        if (uses > 0) {
          local.imports++;
          local.files.add(r);
          local.uses += uses;
          imp.names.filter((n) => jsxUses(src, n) > 0).forEach((n) => local.names.add(n));
        }
      } else if (imp.origin === "icons") {
        iconsUses.imports++;
        iconsUses.files.add(r);
        iconsUses.uses += uses;
      } else if (imp.origin === "framework") {
        frameworkUses.n += uses;
      }
    }
  }

  return { declared, files, walked, uix, third, local, iconsUses, filesWithUix, localComponentFiles };
}

export function auditComponents(o: AuditOptions): string {
  const root = o.path;
  if (!existsSync(root)) throw new Error(`Path does not exist: ${root}`);

  const { declared, files, walked, uix, third, local, iconsUses, filesWithUix, localComponentFiles } = collectComponents(root, o.maxFiles);

  const uixUses = [...uix.values()].reduce((n, a) => n + a.uses, 0);
  const uixImports = [...uix.values()].reduce((n, a) => n + a.imports, 0);
  const thirdUi = [...third.entries()].filter(([, a]) => a.uiLike);
  const thirdOther = [...third.entries()].filter(([, a]) => !a.uiLike);
  const thirdUiUses = thirdUi.reduce((n, [, a]) => n + a.uses, 0);
  const total = uixUses + local.uses + thirdUiUses;
  const avail = availableUix(root);
  const usedSubpaths = new Set([...uix.keys()].map((k) => k.replace(/^invin-uix\/ui\//, "")));

  const L: string[] = [];
  L.push(`# UI component audit: ${basename(root)}`, "");
  L.push(`Scanned ${files.length} source files${walked.truncated ? " (truncated, raise maxFiles for a full scan)" : ""}.`, "");

  if (!declared["invin-uix"]) {
    L.push("⚠️ `invin-uix` is NOT in package.json. Install it (`npm i invin-uix`) and add Tailwind v4 (`npm i -D tailwindcss @tailwindcss/postcss`). The scaffolds from `new-project` already include this setup.", "");
  }

  L.push("## Summary", "");
  L.push("| Source | Component usages (JSX) | Share |", "|---|---:|---:|");
  L.push(`| invin-uix | ${uixUses} | ${pct(uixUses, total)} |`);
  L.push(`| Local components (this project) | ${local.uses} | ${pct(local.uses, total)} |`);
  L.push(`| Third-party UI libraries | ${thirdUiUses} | ${pct(thirdUiUses, total)} |`);
  L.push(`| Total | ${total} | 100% |`, "");
  L.push(`- invin-uix: ${uix.size} entry points, ${uixImports} imports in ${filesWithUix.size} files`);
  L.push(`- Third-party UI packages: ${thirdUi.length}${thirdUi.length ? ` (${thirdUi.map(([n]) => n).join(", ")})` : ""}`);
  L.push(`- Other third-party packages (non-UI): ${thirdOther.length}`);
  L.push(`- Icons: ${iconsUses.uses} Phosphor icon usages in ${iconsUses.files.size} files`, "");

  L.push("## invin-uix components in use", "");
  if (!uix.size) L.push("None found.", "");
  else {
    L.push("| Entry point | Components | Usages | Files |", "|---|---|---:|---:|");
    for (const [spec, a] of [...uix.entries()].sort((x, y) => y[1].uses - x[1].uses)) L.push(`| \`${spec}\` | ${[...a.names].join(", ") || "-"} | ${a.uses} | ${a.files.size} |`);
    L.push("");
  }

  L.push("## Third-party UI libraries", "");
  if (!thirdUi.length) L.push("None. ✅", "");
  else {
    L.push("| Package | Version | Usages | Files | Kind | Replace with |", "|---|---|---:|---:|---|---|");
    for (const [name, a] of thirdUi.sort((x, y) => y[1].uses - x[1].uses)) {
      const lib = UI_LIBS.find((l) => l.re.test(name));
      L.push(`| \`${name}\` | ${declared[name] ?? "not in package.json"} | ${a.uses} | ${a.files.size} | ${lib?.kind ?? "UI component"} | ${lib?.hint ?? "Check whether invin-uix has an equivalent."} |`);
    }
    L.push("");
    if (o.detail === "full") {
      for (const [name, a] of thirdUi) L.push(`- \`${name}\` used in: ${[...a.files].slice(0, 12).join(", ")}${a.files.size > 12 ? ` (+${a.files.size - 12} more)` : ""}`);
      L.push("");
    }
  }

  L.push(`## Other third-party packages (${thirdOther.length}, non-UI)`, "");
  if (!thirdOther.length) L.push("None.", "");
  else L.push(thirdOther.sort((x, y) => y[1].files.size - x[1].files.size).map(([n, a]) => `\`${n}\` (${a.files.size})`).join(", "), "");

  // Local components that look like re-implementations of an invin-uix component
  if (avail) {
    const dupes: string[] = [];
    for (const f of localComponentFiles) {
      const stem = kebab(basename(f).replace(/\.(tsx|jsx)$/, ""));
      const match = avail.find((a) => a === stem || a.endsWith(`/${stem}`));
      if (match) dupes.push(`\`${rel(root, f)}\` ↔ \`invin-uix/ui/${match}\``);
    }
    L.push("## Possible duplicates of invin-uix components", "");
    L.push(dupes.length ? dupes.map((d) => `- ${d}`).join("\n") : "None found. ✅", "");
    const unused = avail.filter((a) => !usedSubpaths.has(a));
    if (o.detail === "full") L.push(`## invin-uix components available but unused (${unused.length}/${avail.length})`, "", unused.map((u) => `\`${u}\``).join(", ") || "None.", "");
    else L.push(`invin-uix offers ${avail.length} components; ${usedSubpaths.size} are used here. Run with detail="full" to list the unused ones.`, "");
  } else if (declared["invin-uix"]) {
    L.push("_invin-uix is declared but not installed in node_modules, so duplicate detection and the unused-component list were skipped. Run `npm install`._", "");
  }

  L.push("## Next steps", "");
  const steps: string[] = [];
  if (!declared["invin-uix"]) steps.push("Install invin-uix and Tailwind v4, then import `./uix.css` before `globals.css`.");
  if (thirdUi.length) steps.push(`Replace the ${thirdUi.length} third-party UI package(s) above, biggest usage first.`);
  if (thirdUi.some(([n]) => UI_LIBS.find((l) => l.re.test(n))?.kind === "Icons")) steps.push("Swap non-Phosphor icon packages for @phosphor-icons/react (Law 11).");
  if (total > 0 && uixUses / total < 0.5) steps.push("Less than half of your component usages come from invin-uix. Prioritise charts, tables, KPI cards and badges.");
  steps.push("Run `review_invinsense_ui` on changed files, then `npm run build`.");
  steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
  return L.join("\n");
}

/** Structured version of auditComponents, for --json output. */
export function auditData(root: string, maxFiles = 10_000_000) {
  if (!existsSync(root)) throw new Error(`Path does not exist: ${root}`);
  const { declared, files, walked, uix, third, local, iconsUses, filesWithUix, localComponentFiles } = collectComponents(root, maxFiles);
  const sum = (it: Iterable<{ uses: number }>) => [...it].reduce((n, a) => n + a.uses, 0);
  const uixUses = sum(uix.values());
  const thirdUi = [...third.entries()].filter(([, a]) => a.uiLike);
  const thirdUiUses = sum(thirdUi.map(([, a]) => a));
  const total = uixUses + local.uses + thirdUiUses;
  const share = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const avail = availableUix(root);
  const used = new Set([...uix.keys()].map((k) => k.replace(/^invin-uix\/ui\//, "")));
  const dupes: { file: string; invinUix: string }[] = [];
  if (avail) {
    for (const f of localComponentFiles) {
      const stem = kebab(basename(f).replace(/\.(tsx|jsx)$/, ""));
      const match = avail.find((a) => a === stem || a.endsWith(`/${stem}`));
      if (match) dupes.push({ file: rel(root, f), invinUix: `invin-uix/ui/${match}` });
    }
  }
  return {
    project: basename(root),
    filesScanned: files.length,
    truncated: Boolean(walked.truncated),
    invinUixDeclared: Boolean(declared["invin-uix"]),
    usages: { invinUix: uixUses, local: local.uses, thirdPartyUi: thirdUiUses, total },
    sharePercent: { invinUix: share(uixUses), local: share(local.uses), thirdPartyUi: share(thirdUiUses) },
    icons: { phosphorUsages: iconsUses.uses, files: iconsUses.files.size },
    invinUixEntryPoints: [...uix.entries()].sort((x, y) => y[1].uses - x[1].uses).map(([entry, a]) => ({ entry, components: [...a.names], usages: a.uses, files: a.files.size })),
    filesUsingInvinUix: filesWithUix.size,
    thirdPartyUi: thirdUi.sort((x, y) => y[1].uses - x[1].uses).map(([name, a]) => {
      const lib = UI_LIBS.find((l) => l.re.test(name));
      return { package: name, version: declared[name] ?? null, usages: a.uses, files: a.files.size, kind: lib?.kind ?? "UI component", replaceWith: lib?.hint ?? "Check whether invin-uix has an equivalent." };
    }),
    otherThirdParty: [...third.entries()].filter(([, a]) => !a.uiLike).map(([name, a]) => ({ package: name, files: a.files.size })),
    possibleDuplicates: dupes,
    invinUixAvailable: avail ? avail.length : null,
    invinUixUnused: avail ? avail.filter((a) => !used.has(a)) : null,
  };
}
