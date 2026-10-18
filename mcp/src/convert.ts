import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { families, tokensCss, REDUCED_MOTION_CSS } from "./content/index.js";
import { reviewInvinsense } from "./invinsense-reviewer.js";
import type { Finding } from "./reviewer.js";
import { structuralGaps, type Gap } from "./gaps.js";
import { collectComponents } from "./audit.js";
import { computeScore, componentStats, formatScore, type ScoreFinding } from "./score.js";
import { STYLE_EXT, gitState, rel, walkSources } from "./fsutil.js";

export type FixId =
  | "tokens"
  | "theme-attribute"
  | "accent-hex"
  | "color-map"
  | "transition-all"
  | "easing"
  | "font-size-floor"
  | "font-family"
  | "reduced-motion";

export const ALL_FIXES: FixId[] = ["tokens", "theme-attribute", "accent-hex", "color-map", "transition-all", "easing", "font-size-floor", "font-family", "reduced-motion"];

export interface ConvertOptions {
  path: string;
  family: string;
  mode: "audit" | "apply";
  dryRun: boolean;
  fixes: FixId[];
  colorMap: Record<string, string>;
  writeReport: boolean;
  force: boolean;
  maxFiles: number;
}

type Stack = "nextjs" | "react" | "static" | "unknown";

interface Change { file: string; fix: FixId; line: number; before: string; after: string }


const TOKENS_REL: Record<Stack, string> = {
  nextjs: "src/styles/invinsense-tokens.css",
  react: "src/styles/invinsense-tokens.css",
  static: "css/invinsense-tokens.css",
  unknown: "styles/invinsense-tokens.css",
};

const readJson = (p: string): any => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

export function detectStack(root: string): { stack: Stack; deps: string[] } {
  const pkg = readJson(join(root, "package.json"));
  const deps = pkg ? Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }) : [];
  if (deps.includes("next")) return { stack: "nextjs", deps };
  if (deps.includes("react") || deps.includes("vue") || deps.includes("svelte")) return { stack: "react", deps };
  if (existsSync(join(root, "index.html"))) return { stack: "static", deps };
  return { stack: "unknown", deps };
}

const lineRe = {
  transitionAll: /(transition(?:-property)?)(\s*:\s*)all\b([^;}\n]*)/gi,
  fontSize: /(font-size\s*:\s*)(\d*\.?\d+)(px|rem)/gi,
  twFont: /text-\[(\d*\.?\d+)px\]/g,
  fontFamily: /(font-family\s*:\s*)([^;}\n]+)/gi,
};

function isTokensFile(file: string) { return /invinsense-tokens\.css$/.test(file); }

export function transformLine(line: string, fixes: Set<FixId>, ctx: { accentHex: string | null; colorMap: Record<string, string> }): { out: string; applied: FixId[] } {
  if (/invinsense-allow/.test(line)) return { out: line, applied: [] };
  const applied: FixId[] = [];
  let out = line;
  const isTokenDef = /--accent[\w-]*\s*:/.test(out) || /--font-(sans|mono)\s*:/.test(out);

  if (fixes.has("accent-hex") && ctx.accentHex && !isTokenDef) {
    const re = new RegExp(ctx.accentHex.replace("#", "#") + "(?![0-9a-fA-F])", "gi");
    const n = out.replace(re, "var(--accent)");
    if (n !== out) { out = n; applied.push("accent-hex"); }
  }
  if (fixes.has("color-map") && !isTokenDef) {
    for (const [from, to] of Object.entries(ctx.colorMap)) {
      const esc = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(esc + (/[0-9a-f]$/i.test(from) && from.startsWith("#") ? "(?![0-9a-fA-F])" : ""), "gi");
      const n = out.replace(re, to);
      if (n !== out) { out = n; applied.push("color-map"); }
    }
  }
  if (fixes.has("transition-all")) {
    const n = out.replace(lineRe.transitionAll, (_m, prop: string, sep: string, rest: string) => {
      if (/property/i.test(prop)) return `${prop}${sep}opacity, transform`;
      const timing = rest.match(/(\d*\.?\d+m?s)/)?.[1] ?? "200ms";
      const ms = /ms$/.test(timing) ? timing : `${Math.round(parseFloat(timing) * 1000)}ms`;
      const dur = `${Math.min(250, Math.max(150, parseInt(ms, 10) || 200))}ms`;
      return `${prop}${sep}opacity ${dur} ease-out, transform ${dur} ease-out`;
    });
    if (n !== out) { out = n; applied.push("transition-all"); }
  }
  if (fixes.has("easing") && /transition|animation/i.test(out)) {
    const n = out.replace(/\bease-in-out\b|\bease-in\b/g, "ease-out").replace(/(?<![\w-])ease(?![\w-])/g, "ease-out");
    if (n !== out) { out = n; applied.push("easing"); }
  }
  if (fixes.has("font-size-floor")) {
    let n = out.replace(lineRe.fontSize, (m, pre: string, num: string, unit: string) => {
      const v = parseFloat(num);
      if (unit === "px" && v < 12) return `${pre}12px`;
      if (unit === "rem" && v < 0.75) return `${pre}0.75rem`;
      return m;
    });
    n = n.replace(lineRe.twFont, (m, num: string) => (parseFloat(num) < 12 ? "text-[12px]" : m));
    if (n !== out) { out = n; applied.push("font-size-floor"); }
  }
  if (fixes.has("font-family") && !isTokenDef) {
    const n = out.replace(lineRe.fontFamily, (m, pre: string, val: string) => {
      if (/geist|inherit|initial|unset|var\(|awesome|icon|material|symbol|emoji/i.test(val)) return m;
      return `${pre}${/mono|courier|consolas|menlo|monaco|source code|fira code|jetbrains/i.test(val) ? "var(--font-mono)" : "var(--font-sans)"}`;
    });
    if (n !== out) { out = n; applied.push("font-family"); }
  }
  return { out, applied };
}

function relImport(fromFile: string, toFile: string): string {
  let r = relative(dirname(fromFile), toFile).split(sep).join("/");
  if (!r.startsWith(".")) r = "./" + r;
  return r;
}

export interface ConvertReport {
  text: string;
  score: number;
  changes: number;
  filesChanged: number;
  remainingErrors: number;
  wrote: boolean;
}

export function convertProject(o: ConvertOptions): ConvertReport {
  const root = resolve(o.path);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`path is not a directory: ${root}`);
  const fam = families.find((f) => f.id === o.family);
  if (!fam) throw new Error(`Unknown family "${o.family}"`);
  const { stack, deps } = detectStack(root);
  const walked = walkSources(root, { maxFiles: o.maxFiles, maxBytes: 1_500_000 });
  const fixes = new Set<FixId>(o.fixes.length ? o.fixes : ALL_FIXES);
  const willWrite = o.mode === "apply" && !o.dryRun;

  if (willWrite) {
    const g = gitState(root);
    if (g.isRepo && g.dirty && !o.force) throw new Error("The git working tree has uncommitted changes. Commit or stash them first (so the conversion is one reviewable diff), or pass force=true.");
  }

  const tokensRel = TOKENS_REL[stack];
  const tokensAbs = join(root, tokensRel);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = join(root, ".invinsense-backup", stamp);
  const changes: Change[] = [];
  const fileTexts = new Map<string, string>(); // original text
  const newTexts = new Map<string, string>();
  const accentHex = fam.primary;

  for (const file of walked.files) {
    if (isTokensFile(file)) continue;
    const text = readFileSync(file, "utf8");
    fileTexts.set(file, text);
    if (o.mode !== "apply") continue;
    const lines = text.split("\n");
    let changed = false;
    const out = lines.map((ln, i) => {
      const r = transformLine(ln, fixes, { accentHex, colorMap: o.colorMap });
      if (r.applied.length) {
        changed = true;
        for (const f of new Set(r.applied)) changes.push({ file: rel(root, file), fix: f, line: i + 1, before: ln.trim().slice(0, 140), after: r.out.trim().slice(0, 140) });
      }
      return r.out;
    });
    let next = out.join("\n");
    // reduced-motion block at the end of stylesheets that animate
    if (fixes.has("reduced-motion") && STYLE_EXT.has(extname(file).toLowerCase()) && /@keyframes|[{;\s]animation\s*:|[{;\s]transition\s*:/.test(next) && !/prefers-reduced-motion/.test(next)) {
      next = next.replace(/\s*$/, "\n\n") + REDUCED_MOTION_CSS;
      changes.push({ file: rel(root, file), fix: "reduced-motion", line: next.split("\n").length, before: "(end of file)", after: "@media (prefers-reduced-motion: reduce) { ... }" });
      changed = true;
    }
    if (changed) newTexts.set(file, next);
  }

  // Structural fixes: tokens file, wiring, theme attribute
  const structural: string[] = [];
  const extraWrites = new Map<string, string>();
  if (o.mode === "apply" && fixes.has("tokens") && !existsSync(tokensAbs)) {
    const hasTokens = [...fileTexts.values()].some((t) => /--background\s*:/.test(t) && /--accent\s*:/.test(t));
    if (!hasTokens) {
      const css = `${tokensCss(o.family, { reducedMotion: false })}
:root { --sidebar-bg: var(--card); --bg-elev: var(--card); --primary-foreground: oklch(0.985 0 0); }
:focus-visible { outline: 3px solid var(--ring); outline-offset: 2px; }
`;
      extraWrites.set(tokensAbs, css);
      structural.push(`Created ${tokensRel} (family ${fam.name}, dark + light OKLCH tokens).`);

      const wire = (file: string, edit: (t: string) => string | null, label: string) => {
        const cur = newTexts.get(file) ?? fileTexts.get(file) ?? (existsSync(file) ? readFileSync(file, "utf8") : null);
        if (cur === null) return;
        const edited = edit(cur);
        if (edited && edited !== cur) {
          fileTexts.has(file) || fileTexts.set(file, cur);
          newTexts.set(file, edited);
          structural.push(label);
        }
      };

      if (stack === "static" || stack === "react") {
        for (const f of walked.files.filter((x) => /\.html?$/i.test(x))) {
          const href = relImport(f, tokensAbs).replace(/^\.\//, "");
          wire(f, (t) => (t.includes("invinsense-tokens.css") || !/<head[^>]*>/i.test(t) ? null : t.replace(/<\/head>/i, `  <link rel="stylesheet" href="${href}">\n</head>`)), `Linked tokens in ${rel(root, f)}.`);
        }
      }
      if (stack === "nextjs" || stack === "react") {
        const entries = ["src/app/layout.tsx", "app/layout.tsx", "src/app/layout.jsx", "app/layout.jsx", "src/main.tsx", "src/main.jsx", "src/index.tsx", "src/index.jsx", "pages/_app.tsx", "src/pages/_app.tsx"].map((e) => join(root, e));
        const entry = entries.find((e) => existsSync(e));
        if (entry) {
          const spec = relImport(entry, tokensAbs);
          wire(entry, (t) => (t.includes("invinsense-tokens.css") ? null : `import "${spec}";\n${t}`), `Imported tokens in ${rel(root, entry)} (first import, so product CSS can override).`);
        } else {
          structural.push(`Could not find an app entry to import tokens. Import ${tokensRel} once at the top of your entry file.`);
        }
      }
    }
  }
  if (o.mode === "apply" && fixes.has("theme-attribute")) {
    const targets = walked.files.filter((f) => /layout\.(tsx|jsx)$|index\.html?$/i.test(f) || (/\.html?$/i.test(f) && /<html\b/i.test(fileTexts.get(f) ?? "")));
    for (const f of targets) {
      const cur = newTexts.get(f) ?? fileTexts.get(f) ?? "";
      if (!/<html\b/i.test(cur) || /data-theme/.test(cur)) continue;
      const isTsx = /\.(tsx|jsx)$/.test(f);
      const nxt = cur.replace(/<html\b/i, isTsx ? '<html data-theme="dark" suppressHydrationWarning' : '<html data-theme="dark"');
      if (nxt !== cur) {
        if (!fileTexts.has(f)) fileTexts.set(f, cur);
        newTexts.set(f, nxt);
        structural.push(`Set data-theme="dark" on <html> in ${rel(root, f)}. Persist the user's choice and restore it before first paint (see get_best_practice invinsense-theme).`);
      }
    }
  }

  // Write
  let wrote = false;
  if (willWrite) {
    for (const [file, text] of newTexts) {
      const orig = fileTexts.get(file);
      if (orig === text) continue;
      const bak = join(backupRoot, relative(root, file));
      mkdirSync(dirname(bak), { recursive: true });
      if (existsSync(file)) copyFileSync(file, bak);
      writeFileSync(file, text, "utf8");
      wrote = true;
    }
    for (const [file, text] of extraWrites) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text, "utf8");
      wrote = true;
    }
  }

  // Re-audit (on what the files would look like after the change)
  const findings: { file: string; f: Finding }[] = [];
  for (const [file, orig] of fileTexts) {
    const text = newTexts.get(file) ?? orig;
    for (const f of reviewInvinsense(text)) findings.push({ file: rel(root, file), f });
  }

  // Gaps
  const all = [...fileTexts.entries()].map(([f, t]) => newTexts.get(f) ?? t).join("\n") + [...extraWrites.values()].join("\n");
  const gaps = structuralGaps(all, deps);
  const gapsOpen = gaps.filter((g) => !g.present);

  // Compliance score: before the change and (in apply mode) after it
  const comps = componentStats(collectComponents(root, o.maxFiles));
  const toScoreFindings = (texts: Map<string, string>): ScoreFinding[] => {
    const out: ScoreFinding[] = [];
    for (const [file, t] of texts) for (const f of reviewInvinsense(t)) out.push({ rule: f.rule, severity: f.severity, file: rel(root, file), line: f.line });
    return out;
  };
  const lineCount = (texts: Iterable<string>) => [...texts].reduce((n, t) => n + t.split("\n").length, 0);
  const afterTexts = new Map<string, string>([...fileTexts].map(([f, t]) => [f, newTexts.get(f) ?? t]));
  const beforeAll = [...fileTexts.values()].join("\n");
  const scoreBefore = computeScore({ findings: toScoreFindings(fileTexts), lines: lineCount(fileTexts.values()), filesScanned: fileTexts.size, gaps: structuralGaps(beforeAll, deps), components: comps });
  const scoreAfter = o.mode === "apply" ? computeScore({ findings: toScoreFindings(afterTexts), lines: lineCount(afterTexts.values()), filesScanned: afterTexts.size, gaps, components: comps }) : null;

  // Report
  const byFix = new Map<FixId, number>();
  for (const c of changes) byFix.set(c.fix, (byFix.get(c.fix) ?? 0) + 1);
  const filesChanged = new Set(changes.map((c) => c.file)).size + [...extraWrites.keys()].length;
  const byRule = new Map<string, { sev: string; msg: string; practiceId: string; where: string[] }>();
  for (const { file, f } of findings) {
    const r = byRule.get(f.rule) ?? { sev: f.severity, msg: f.message, practiceId: f.practiceId, where: [] };
    r.where.push(`${file}:${f.line}`);
    byRule.set(f.rule, r);
  }
  const rank: Record<string, number> = { error: 0, warning: 1, info: 2 };
  const remaining = [...byRule.entries()].sort((a, b) => rank[a[1].sev]! - rank[b[1].sev]! || b[1].where.length - a[1].where.length);
  const remainingErrors = [...byRule.values()].filter((r) => r.sev === "error").reduce((n, r) => n + r.where.length, 0);

  const L: string[] = [];
  const modeLabel = o.mode === "audit" ? "AUDIT (no files changed)" : o.dryRun ? "APPLY, DRY RUN (no files changed)" : "APPLIED";
  L.push(`# Invinsense conversion: ${modeLabel}`);
  L.push(`Project: ${root}`);
  L.push(`Stack: ${stack}${deps.length ? ` (${deps.filter((d) => /^(next|react|vue|svelte|vite|tailwindcss)$/.test(d)).join(", ")})` : ""}   Family: ${fam.name}   Files scanned: ${walked.files.length}${walked.truncated ? " (truncated at maxFiles)" : ""}${walked.skipped ? `, ${walked.skipped} oversized skipped` : ""}`);
  L.push("");
  if (scoreAfter) L.push(formatScore(scoreAfter, { title: o.dryRun ? "Projected compliance score after fixes" : "Compliance score after fixes", before: scoreBefore }), "");
  else L.push(formatScore(scoreBefore, { title: "Compliance score" }), "");
  if (o.mode === "apply") {
    L.push(`## Automatic fixes ${willWrite ? "applied" : "that would be applied"}: ${changes.length} change(s) in ${filesChanged} file(s)`);
    if (!changes.length && !structural.length) L.push("- Nothing mechanical to change.");
    for (const [fix, n] of byFix) L.push(`- ${fix}: ${n}`);
    for (const s of structural) L.push(`- ${s}`);
    const sample = changes.slice(0, 12);
    if (sample.length) {
      L.push("", "Examples:");
      for (const c of sample) L.push(`- ${c.file}:${c.line} [${c.fix}]\n    - ${c.before}\n    + ${c.after}`);
      if (changes.length > sample.length) L.push(`- ...and ${changes.length - sample.length} more`);
    }
    if (willWrite) L.push("", `Backups of every modified file: ${rel(root, backupRoot)}/ (also review with git diff).`);
    L.push("");
  }
  L.push(`## Remaining violations${o.mode === "apply" ? " after fixes" : ""}: ${findings.length} (${remainingErrors} error(s))`);
  if (!remaining.length) L.push("- None found by the built-in checks.");
  for (const [rule, r] of remaining) {
    const shown = r.where.slice(0, 5).join(", ");
    L.push(`- ${r.sev === "error" ? "🔴" : r.sev === "warning" ? "🟠" : "🔵"} [${rule}] x${r.where.length}: ${r.msg}\n    ${shown}${r.where.length > 5 ? `, +${r.where.length - 5} more` : ""}   → get_best_practice("${r.practiceId}")`);
  }
  L.push("", "## Structural gaps (need design work, not a codemod)");
  for (const g of gaps) L.push(`- [${g.present ? "x" : " "}] ${g.title}${g.present ? "" : `: ${g.how} → get_best_practice("${g.practiceId}")`}`);
  L.push("", "## Next steps");
  if (o.mode === "audit") L.push(`1. Run convert_to_invinsense with mode="apply" and dryRun=true to preview the ${ALL_FIXES.length} automatic fixes, then dryRun=false to apply.`);
  else if (!willWrite) L.push('1. Happy with the preview? Run again with dryRun=false (commit or stash first so the conversion is one reviewable diff).');
  else L.push("1. Review `git diff`, run the app, and screenshot dark + light.");
  L.push(`2. Fix the remaining violations above by hand, highest severity first.`);
  L.push(`3. Close the open structural gaps (${gapsOpen.length}). Call scaffold_invinsense_project into a scratch folder to copy the reference shell, tour and four-state components.`);
  L.push("4. Re-run this tool in audit mode until errors are zero, then walk invinsense_new_module_checklist and run `npm run slop` in the launcher repo.");

  const text = L.join("\n");
  if (o.writeReport && willWrite) {
    writeFileSync(join(root, "INVINSENSE_MIGRATION.md"), text + "\n", "utf8");
  }
  return { text, score: (scoreAfter ?? scoreBefore).total, changes: changes.length, filesChanged, remainingErrors, wrote };
}
