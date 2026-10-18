import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { collectComponents } from "./audit.js";
import { structuralGaps, type Gap } from "./gaps.js";
import { rel, walkSources } from "./fsutil.js";
import { reviewInvinsense } from "./invinsense-reviewer.js";

/* Invinsense compliance score (internal; not part of the Module UI Guide).
   Violations 50 + Structure 30 + Components 20 = 100.

   Violations (50): weighted findings per 1,000 lines (error x3, warning x1, info x0).
     points = 50 * max(0, 1 - density / 30). Zero findings = 50. 30 weighted per 1,000 lines = 0.
     Line count is floored at 500 so a tiny project is not punished for one slip.
   Structure (30): 10 checklist items, 3 points each (tokens, theme, fonts, icons, shell, nav links,
     four states, tour, reduced motion, charts).
   Components (20): 10 points for avoiding third-party UI libraries (scaled by their share of component
     usages) + 10 points for invin-uix adoption (full marks at 25% of component usages or more). */

export const WEIGHTS = { violations: 50, structure: 30, components: 20, errorCost: 3, warningCost: 1, zeroAtDensity: 30, adoptionTarget: 0.25, minLines: 500 };

export interface ScoreFinding {
  rule: string;
  severity: "error" | "warning" | "info";
  file: string;
  line: number;
}

export interface ComponentStats {
  uixUses: number;
  localUses: number;
  thirdUiUses: number;
  thirdUiPackages: number;
  invinUixDeclared: boolean;
}

export interface ScoreInput {
  findings: ScoreFinding[];
  lines: number;
  filesScanned: number;
  gaps: Gap[];
  components: ComponentStats;
}

export interface Category {
  name: string;
  score: number;
  max: number;
  detail: string;
}

export interface Score {
  total: number;
  grade: string;
  verdict: string;
  categories: Category[];
  wins: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function gradeFor(total: number): { grade: string; verdict: string } {
  if (total >= 90) return { grade: "A", verdict: "Compliant. Ready for review." };
  if (total >= 80) return { grade: "B", verdict: "Close. Fix the listed items." };
  if (total >= 70) return { grade: "C", verdict: "Partly compliant. Real gaps remain." };
  if (total >= 60) return { grade: "D", verdict: "Weak. Significant rework needed." };
  return { grade: "F", verdict: "Not compliant. Start with the biggest wins below." };
}

const violationPoints = (weighted: number, lines: number) => {
  const kloc = Math.max(lines, WEIGHTS.minLines) / 1000;
  return WEIGHTS.violations * Math.max(0, 1 - weighted / kloc / WEIGHTS.zeroAtDensity);
};

export function computeScore(i: ScoreInput): Score {
  const errors = i.findings.filter((f) => f.severity === "error");
  const warnings = i.findings.filter((f) => f.severity === "warning");
  const weighted = errors.length * WEIGHTS.errorCost + warnings.length * WEIGHTS.warningCost;
  const vPts = violationPoints(weighted, i.lines);
  const vFiles = new Set(i.findings.filter((f) => f.severity !== "info").map((f) => f.file)).size;
  const density = weighted / (Math.max(i.lines, WEIGHTS.minLines) / 1000);

  const open = i.gaps.filter((g) => !g.present);
  const per = WEIGHTS.structure / Math.max(1, i.gaps.length);
  const sPts = per * (i.gaps.length - open.length);

  const c = i.components;
  const total = c.uixUses + c.localUses + c.thirdUiUses;
  const thirdShare = total === 0 ? 0 : c.thirdUiUses / total;
  const uixShare = total === 0 ? 0 : c.uixUses / total;
  const noThird = (WEIGHTS.components / 2) * (1 - thirdShare);
  const adopt = (WEIGHTS.components / 2) * Math.min(1, uixShare / WEIGHTS.adoptionTarget);
  const cPts = noThird + adopt;

  const categories: Category[] = [
    {
      name: "Guide violations",
      score: round1(vPts),
      max: WEIGHTS.violations,
      detail: i.findings.length === 0 ? "No violations found" : `${errors.length} error(s), ${warnings.length} warning(s) in ${vFiles} file(s), ${density.toFixed(1)} weighted per 1,000 lines`,
    },
    {
      name: "Structural gaps",
      score: round1(sPts),
      max: WEIGHTS.structure,
      detail: open.length === 0 ? `All ${i.gaps.length} checklist items in place` : `${i.gaps.length - open.length} of ${i.gaps.length} in place. Missing: ${open.map((g) => g.id).join(", ")}`,
    },
    {
      name: "Component adoption",
      score: round1(cPts),
      max: WEIGHTS.components,
      detail: `${Math.round(uixShare * 100)}% invin-uix, ${Math.round(thirdShare * 100)}% third-party UI libraries (${c.thirdUiPackages} package(s))${c.invinUixDeclared ? "" : ", invin-uix not installed"}`,
    },
  ];

  const totalScore = Math.round(vPts + sPts + cPts);

  // Biggest wins, in points
  const wins: { pts: number; text: string }[] = [];
  const byRule = new Map<string, { sev: string; n: number }>();
  for (const f of i.findings) {
    if (f.severity === "info") continue;
    const r = byRule.get(f.rule) ?? { sev: f.severity, n: 0 };
    r.n++;
    byRule.set(f.rule, r);
  }
  for (const [rule, r] of byRule) {
    const w = r.n * (r.sev === "error" ? WEIGHTS.errorCost : WEIGHTS.warningCost);
    const gain = violationPoints(weighted - w, i.lines) - vPts;
    if (gain >= 0.5) wins.push({ pts: gain, text: `Fix \`${rule}\` (${r.n}x, ${r.sev}): +${Math.round(gain)} pts` });
  }
  for (const g of open) wins.push({ pts: per, text: `Add: ${g.title}: +${Math.round(per)} pts` });
  if (uixShare < WEIGHTS.adoptionTarget && total > 0) {
    const gain = (WEIGHTS.components / 2) * (Math.min(1, WEIGHTS.adoptionTarget / WEIGHTS.adoptionTarget) - Math.min(1, uixShare / WEIGHTS.adoptionTarget));
    if (gain >= 1) wins.push({ pts: gain, text: `Use invin-uix for charts, tables, KPI cards and badges (reach ${Math.round(WEIGHTS.adoptionTarget * 100)}% of component usages): up to +${Math.round(gain)} pts` });
  }
  if (c.thirdUiUses > 0) {
    const gain = (WEIGHTS.components / 2) * thirdShare;
    if (gain >= 1) wins.push({ pts: gain, text: `Replace third-party UI libraries (run audit-components): up to +${Math.round(gain)} pts` });
  }
  wins.sort((a, b) => b.pts - a.pts);

  return { total: totalScore, ...gradeFor(totalScore), categories, wins: wins.slice(0, 5).map((w) => w.text) };
}

export function formatScore(s: Score, opts: { title?: string; before?: Score } = {}): string {
  const L: string[] = [];
  const delta = opts.before ? ` (was ${opts.before.total}/100, ${opts.before.grade})` : "";
  L.push(`## ${opts.title ?? "Invinsense compliance score"}: ${s.total}/100, grade ${s.grade}${delta}`);
  L.push(`_${s.verdict}_`, "");
  L.push("| Category | Score | Detail |", "|---|---:|---|");
  for (const c of s.categories) L.push(`| ${c.name} | ${c.score}/${c.max} | ${c.detail} |`);
  if (s.wins.length) {
    L.push("", "Biggest wins:");
    s.wins.forEach((w, i) => L.push(`${i + 1}. ${w}`));
  }
  L.push("", "_Internal score for tracking progress, not part of the Module UI Guide. Violations 50, structure 30, components 20._");
  return L.join("\n");
}

export function componentStats(c: ReturnType<typeof collectComponents>): ComponentStats {
  const sum = (it: Iterable<{ uses: number }>) => [...it].reduce((n, a) => n + a.uses, 0);
  const thirdUi = [...c.third.values()].filter((a) => a.uiLike);
  return {
    uixUses: sum(c.uix.values()),
    localUses: c.local.uses,
    thirdUiUses: sum(thirdUi),
    thirdUiPackages: thirdUi.length,
    invinUixDeclared: Boolean(c.declared["invin-uix"]),
  };
}

/** Score a project straight from disk. */
export function scoreProject(path: string, maxFiles = 1500): { score: Score; input: ScoreInput; text: string } {
  const root = resolve(path);
  if (!existsSync(root)) throw new Error(`Path does not exist: ${root}`);
  const walked = walkSources(root, { maxFiles, maxBytes: 1_500_000 });
  const findings: ScoreFinding[] = [];
  let lines = 0;
  const texts: string[] = [];
  for (const f of walked.files) {
    let t: string;
    try {
      t = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    lines += t.split("\n").length;
    texts.push(t);
    for (const x of reviewInvinsense(t)) findings.push({ rule: x.rule, severity: x.severity, file: rel(root, f), line: x.line });
  }
  let deps: string[] = [];
  try {
    const pj = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies?: object; devDependencies?: object };
    deps = Object.keys({ ...pj.dependencies, ...pj.devDependencies });
  } catch {
    /* no package.json */
  }
  const gaps = structuralGaps(texts.join("\n"), deps);
  const components = componentStats(collectComponents(root, maxFiles));
  const input: ScoreInput = { findings, lines, filesScanned: walked.files.length, gaps, components };
  const score = computeScore(input);
  const text = [`# Invinsense compliance score: ${root.split("/").pop()}`, `Scanned ${walked.files.length} source files, ${lines.toLocaleString("en-US")} lines${walked.truncated ? " (truncated, raise maxFiles)" : ""}.`, "", formatScore(score)].join("\n");
  return { score, input, text };
}
