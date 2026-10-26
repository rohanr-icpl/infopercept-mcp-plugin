import { resolve } from "node:path";
import { auditData } from "./audit.js";
import { coverageRun, hotspotsRun, reportRun, routesRun, tokensRun } from "./insight.js";
import { scoreData } from "./score.js";
import { scoreProject } from "./score.js";

/* Command-line mode: `node index.mjs <command> [path] [--json] [--min-score N]`. Same engine as the MCP tools. */

const COMMANDS = ["score", "hotspots", "routes", "tokens", "report", "audit", "coverage"] as const;
const HELP = `Invinsense CLI

Usage: node index.mjs <command> [path] [options]

Commands: ${COMMANDS.join(", ")}
Options:
  --json            Print JSON only (no prose)
  --min-score N     score/report: exit with code 1 when the score is below N (for CI)
  --top N           hotspots: number of files (default 10)
  --list            coverage: print every file that was read
  --save            report: write invinsense-report.md and record the score in .invinsense/history.json
  --max-files N     scan limit (default: no limit)
Path defaults to the current directory.`;

export function isCli(argv: string[]): boolean {
  const a = argv[2];
  return Boolean(a) && ((COMMANDS as readonly string[]).includes(a!) || a === "--help" || a === "-h" || a === "help");
}

export function runCli(argv: string[]): number {
  const args = argv.slice(2);
  const cmd = args[0]!;
  if (["help", "--help", "-h"].includes(cmd)) {
    console.log(HELP);
    return 0;
  }
  const flag = (n: string) => args.includes(n);
  const val = (n: string) => {
    const i = args.indexOf(n);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const valueFlags = new Set(["--min-score", "--top", "--max-files"]);
  const positional = args.slice(1).filter((x, i, arr) => !x.startsWith("--") && !valueFlags.has(arr[i - 1] ?? ""));
  const path = resolve(positional[0] ?? process.cwd());
  const json = flag("--json");
  const maxFiles = Number(val("--max-files") ?? 10_000_000);
  const min = val("--min-score") !== undefined ? Number(val("--min-score")) : undefined;
  const out = (data: unknown, text: string) => console.log(json ? JSON.stringify(data, null, 2) : text);
  try {
    let total: number | undefined;
    switch (cmd) {
      case "score": {
        const r = scoreProject(path, maxFiles);
        total = r.score.total;
        out(scoreData(path, maxFiles), r.text);
        break;
      }
      case "hotspots": {
        const r = hotspotsRun(path, Number(val("--top") ?? 10), maxFiles);
        out(r.data, r.text);
        break;
      }
      case "routes": {
        const r = routesRun(path, maxFiles);
        out(r.data, r.text);
        break;
      }
      case "tokens": {
        const r = tokensRun(path, maxFiles);
        out(r.data, r.text);
        break;
      }
      case "report": {
        const r = reportRun(path, flag("--save"), maxFiles);
        total = (r.data.score as { total: number }).total;
        out(r.data, r.text);
        break;
      }
      case "coverage": {
        const r = coverageRun(path, flag("--list"), maxFiles);
        out(r.data, r.text);
        break;
      }
      case "audit": {
        const d = auditData(path, maxFiles);
        out(d, "```json\n" + JSON.stringify(d, null, 2) + "\n```");
        break;
      }
    }
    if (min !== undefined && total !== undefined && total < min) {
      console.error(`Score ${total} is below the required ${min}.`);
      return 1;
    }
    return 0;
  } catch (e) {
    if (json) console.log(JSON.stringify({ error: (e as Error).message }));
    else console.error(`Error: ${(e as Error).message}`);
    return 2;
  }
}
