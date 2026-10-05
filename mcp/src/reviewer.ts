export type Severity = "error" | "warning" | "info";
export interface Finding {
  rule: string;
  severity: Severity;
  line: number;
  message: string;
  practiceId: string;
}

interface Rule {
  rule: string;
  severity: Severity;
  message: string;
  practiceId: string;
  nextOnly?: boolean;
  test: (code: string, lines: string[]) => number[]; // returns 1-based line numbers
}

const lineMatches = (re: RegExp) => (_: string, lines: string[]) =>
  lines.flatMap((l, i) => (re.test(l) ? [i + 1] : []));

const hasClientDirective = (code: string) => /^\s*["']use client["']/m.test(code);

const rules: Rule[] = [
  {
    rule: "no-index-key",
    severity: "warning",
    message: "Array index used as `key`. Use a stable unique id.",
    practiceId: "react-lists-keys",
    test: lineMatches(/key=\{\s*(i|idx|index)\s*\}/),
  },
  {
    rule: "no-any",
    severity: "warning",
    message: "`any` defeats type safety. Use `unknown`, generics or a precise type.",
    practiceId: "ts-react",
    test: lineMatches(/(:\s*any\b|<any>|as any\b)/),
  },
  {
    rule: "fetch-in-effect",
    severity: "warning",
    message: "Data fetching inside useEffect. Prefer Server Components, TanStack Query/SWR, and handle aborts/races.",
    practiceId: "react-effects",
    test: (code, lines) => {
      const out: number[] = [];
      const re = /useEffect\(\s*\(\)\s*=>\s*\{/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code))) {
        const chunk = code.slice(m.index, m.index + 600);
        if (/\bfetch\(|axios\./.test(chunk)) out.push(code.slice(0, m.index).split("\n").length);
      }
      return out;
    },
  },
  {
    rule: "effect-missing-deps",
    severity: "info",
    message: "useEffect without a dependency array runs after every render. Add deps (or [] deliberately).",
    practiceId: "react-effects",
    test: (code) => {
      const out: number[] = [];
      const re = /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\}\s*\)\s*;?/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code))) out.push(code.slice(0, m.index).split("\n").length);
      return out;
    },
  },
  {
    rule: "exhaustive-deps-disabled",
    severity: "warning",
    message: "react-hooks/exhaustive-deps is disabled. Fix the dependencies instead.",
    practiceId: "react-effects",
    test: lineMatches(/eslint-disable.*react-hooks\/exhaustive-deps/),
  },
  {
    rule: "div-onclick",
    severity: "error",
    message: "Clickable <div>/<span> is not keyboard accessible. Use <button> (or <a>).",
    practiceId: "a11y-basics",
    test: lineMatches(/<(div|span)\b[^>]*\bonClick=/),
  },
  {
    rule: "img-alt",
    severity: "error",
    message: "Image is missing `alt`. Use descriptive text, or alt=\"\" for decorative images.",
    practiceId: "a11y-basics",
    test: lineMatches(/<(img|Image)\b(?![^>]*\balt=)[^>]*\/?>/),
  },
  {
    rule: "dangerously-set-html",
    severity: "error",
    message: "dangerouslySetInnerHTML is an XSS risk. Sanitise (DOMPurify) or render as React nodes.",
    practiceId: "next-security",
    test: lineMatches(/dangerouslySetInnerHTML/),
  },
  {
    rule: "public-secret-env",
    severity: "error",
    message: "NEXT_PUBLIC_ variables are exposed to the browser. Never put secrets/keys/tokens there.",
    practiceId: "next-security",
    nextOnly: true,
    test: lineMatches(/NEXT_PUBLIC_\w*(SECRET|PRIVATE|PASSWORD|TOKEN|SERVICE_ROLE)\w*/i),
  },
  {
    rule: "token-in-localstorage",
    severity: "warning",
    message: "Auth tokens in localStorage are readable by any XSS. Use httpOnly, Secure, SameSite cookies.",
    practiceId: "next-security",
    test: lineMatches(/localStorage\.(set|get)Item\(\s*["'`][^"'`]*(token|jwt|session)[^"'`]*["'`]/i),
  },
  {
    rule: "raw-img-next",
    severity: "warning",
    message: "Use next/image instead of <img> for automatic optimisation and CLS prevention.",
    practiceId: "next-assets",
    nextOnly: true,
    test: lineMatches(/<img\b/),
  },
  {
    rule: "raw-anchor-next",
    severity: "warning",
    message: "Use next/link for internal navigation instead of <a href=\"/...\">.",
    practiceId: "next-assets",
    nextOnly: true,
    test: lineMatches(/<a\b[^>]*href=["']\/(?!\/)/),
  },
  {
    rule: "async-client-component",
    severity: "error",
    message: "Client Components cannot be async. Fetch in a Server Component or use a data hook.",
    practiceId: "next-server-vs-client",
    nextOnly: true,
    test: (code, lines) =>
      hasClientDirective(code) ? lines.flatMap((l, i) => (/export\s+default\s+async\s+function|async\s+function\s+[A-Z]\w*\s*\(/.test(l) ? [i + 1] : [])) : [],
  },
  {
    rule: "unneeded-use-client",
    severity: "info",
    message: "\"use client\" but no hooks, handlers or browser APIs found. Could this be a Server Component?",
    practiceId: "next-server-vs-client",
    nextOnly: true,
    test: (code) =>
      hasClientDirective(code) &&
      !/\buse(State|Effect|Reducer|Ref|Context|Memo|Callback|Transition|Optimistic|ActionState|Router|Params|SearchParams|Pathname|FormStatus|LayoutEffect|SyncExternalStore)\b|\bon[A-Z]\w+=|window\.|document\.|localStorage|navigator\./.test(code)
        ? [1]
        : [],
  },
  {
    rule: "server-action-no-validation",
    severity: "warning",
    message: "Server Action without visible input validation/auth check. Treat it as a public endpoint (Zod + session check).",
    practiceId: "next-server-actions",
    nextOnly: true,
    test: (code) =>
      /["']use server["']/.test(code) && !/(\.parse\(|\.safeParse\(|z\.object|valibot|auth\(|getSession|getServerSession|currentUser)/.test(code) ? [1] : [],
  },
  {
    rule: "self-api-call",
    severity: "warning",
    message: "Server code calling your own /api route. Call the data layer/service directly instead.",
    practiceId: "next-data-fetching",
    nextOnly: true,
    test: (code, lines) => (hasClientDirective(code) ? [] : lines.flatMap((l, i) => (/fetch\(\s*[`"']\/?(https?:\/\/localhost[^`"']*)?\/api\//.test(l) ? [i + 1] : []))),
  },
  {
    rule: "sequential-awaits",
    severity: "info",
    message: "Consecutive independent awaits may create a waterfall. Consider Promise.all.",
    practiceId: "next-data-fetching",
    test: (_, lines) => {
      const out: number[] = [];
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\s*const\s+\w+\s*=\s*await\s+\w+\(/.test(lines[i]!) && /^\s*const\s+\w+\s*=\s*await\s+\w+\(/.test(lines[i + 1]!)) out.push(i + 1);
      }
      return out;
    },
  },
  {
    rule: "component-in-component",
    severity: "warning",
    message: "Component defined inside another component remounts every render. Move it to module scope.",
    practiceId: "react-composition",
    test: (_, lines) => {
      const out: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (/^\s{2,}(function|const)\s+[A-Z]\w*\s*(=\s*(\([^)]*\)|\w+)\s*=>|\()/.test(lines[i]!) && !/^\s{2,}const\s+[A-Z_]+\s*=/.test(lines[i]!)) out.push(i + 1);
      }
      return out;
    },
  },
  {
    rule: "state-from-props",
    severity: "info",
    message: "State initialised from props can go stale. Derive during render or reset with a `key`.",
    practiceId: "react-state",
    test: lineMatches(/useState\(\s*props\.\w+\s*\)/),
  },
  {
    rule: "console-log",
    severity: "info",
    message: "Remove console.log before shipping (use a logger).",
    practiceId: "next-tooling-quality",
    test: lineMatches(/console\.log\(/),
  },
];

export function reviewCode(code: string, framework: "react" | "nextjs" = "nextjs"): Finding[] {
  const lines = code.split("\n");
  const findings: Finding[] = [];
  for (const r of rules) {
    if (r.nextOnly && framework !== "nextjs") continue;
    for (const line of new Set(r.test(code, lines))) {
      findings.push({ rule: r.rule, severity: r.severity, line, message: r.message, practiceId: r.practiceId });
    }
  }
  const order = { error: 0, warning: 1, info: 2 } as const;
  return findings.sort((a, b) => order[a.severity] - order[b.severity] || a.line - b.line);
}
