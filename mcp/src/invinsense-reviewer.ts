import type { Finding } from "./reviewer.js";

interface LineRule {
  rule: string;
  severity: Finding["severity"];
  message: string;
  practiceId: string;
  re: RegExp;
  skip?: (line: string) => boolean;
  check?: (m: RegExpMatchArray) => boolean; // return false to ignore a match
}

const isComment = (l: string) => /^\s*(\/\/|\/\*|\*|<!--)/.test(l);
const isAccentDef = (l: string) => /--accent[\w-]*\s*:/.test(l);

const rules: LineRule[] = [
  { rule: "hardcoded-hex", severity: "error", practiceId: "invinsense-tokens", re: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/,
    message: "Hardcoded hex. Consume colours from CSS variables (Principle 3, Law 6).", skip: (l) => isComment(l) || isAccentDef(l) || /href=["']#|url\(#|&#\d/.test(l) },
  { rule: "module-token-namespace", severity: "error", practiceId: "invinsense-tokens", re: /--(soar|aifw|uemp|gsos|otfw|grc|isoc|regiment|regimentai|assentra|sdl)-[\w-]+\s*:/i,
    message: "Parallel token namespace. Use the shared token set; only --accent differs per family." },
  { rule: "removed-accent-glow", severity: "error", practiceId: "invinsense-tokens", re: /--(accent-glow|ambient)\b/,
    message: "--accent-glow / --ambient must be deleted (new-module checklist step 2)." },
  { rule: "dark-prefix", severity: "error", practiceId: "invinsense-theme", re: /\bdark:[\w[\]/-]+/,
    message: "No dark: prefix on colours (Law 6). One token set, two values via html[data-theme]." },
  { rule: "media-dark-theme", severity: "warning", practiceId: "invinsense-theme", re: /prefers-color-scheme:\s*dark/,
    message: "Theme must switch on html[data-theme], not the media query." },
  { rule: "font-below-12", severity: "error", practiceId: "invinsense-typography", re: /font-size:\s*(\d*\.?\d+)(px|rem)\b|text-\[(\d*\.?\d+)px\]/,
    message: "Text below 12px (Law 9). 12px is the absolute floor, badges and chips included.",
    check: (m) => { const v = parseFloat(m[1] ?? m[3] ?? "99"); const unit = m[2] ?? "px"; return unit === "rem" ? v < 0.75 : v < 12; } },
  { rule: "unapproved-font", severity: "error", practiceId: "invinsense-typography", re: /font-family:\s*([^;}]+)/,
    message: "Only Geist / Geist Mono (with metric-matched fallbacks) are approved.",
    check: (m) => !/geist|inherit|var\(/i.test(m[1] ?? "") },
  { rule: "layout-animation", severity: "warning", practiceId: "invinsense-motion-a11y", re: /transition(-property)?:\s*[^;]*\b(all|width|height|top|left|right|bottom|margin|padding)\b/,
    message: "Animate transform and opacity only, never transition: all or layout properties (sole exception: sidebar rail width)." },
  { rule: "bad-easing", severity: "warning", practiceId: "invinsense-motion-a11y", re: /\bease-in\b|\bease-in-out\b|bounce|elastic|overshoot|cubic-bezier\(\s*[^)]*-\d/i,
    message: "ease-out only. No ease-in, bounce, elastic or overshoot." },
  { rule: "gradient-text", severity: "error", practiceId: "invinsense-anti-slop", re: /background-clip:\s*text|bg-clip-text|text-transparent/,
    message: "Gradient text kills scannability. Use a solid colour." },
  { rule: "gradient", severity: "warning", practiceId: "invinsense-components", re: /(linear|radial|conic)-gradient\(/,
    message: "Gradients are not allowed on primaries or chrome (flat --accent fill). Skeleton shimmer is the exception." },
  { rule: "glow", severity: "warning", practiceId: "invinsense-anti-slop", re: /box-shadow:[^;]*(glow|accent)|drop-shadow\([^)]*(accent|glow)|shadow-\[0_0_/i,
    message: "No glow on resting elements. Add a border and a press state instead." },
  { rule: "side-stripe", severity: "warning", practiceId: "invinsense-anti-slop", re: /border-left:\s*([2-9]|\d{2,})px|border-l-\[?([2-9]|\d{2,})|border-l-(2|4|8)\b/,
    message: "Coloured side-stripe. Close the box with a hairline or tint (only exceptions: nav active indicator, toast 3px edge)." },
  { rule: "extreme-radius", severity: "warning", practiceId: "invinsense-tokens", re: /border-radius:\s*(2[4-9]|[3-9]\d)px|rounded-(3xl|full)\b/,
    message: "Radius scale tops out at 14px (xl). Extreme radius on cards is banned." },
  { rule: "backdrop-filter", severity: "warning", practiceId: "invinsense-anti-slop", re: /backdrop-filter|backdrop-blur/,
    message: "Decorative glass is banned. Only use it to separate a floating surface from moving content." },
  { rule: "outline-none", severity: "error", practiceId: "invinsense-motion-a11y", re: /outline:\s*(none|0)\b|\boutline-none\b/,
    message: "outline: none without a replacement is a defect. Keep the 3px :focus-visible ring.", skip: (l) => /focus-visible:ring|ring-/.test(l) },
  { rule: "sidebar-width", severity: "warning", practiceId: "invinsense-navigation", re: /--sidebar-w:\s*(\d+)px/,
    message: "Sidebar width must be 262px (rail 76px).", check: (m) => m[1] !== "262" },
  { rule: "non-phosphor-icons", severity: "error", practiceId: "invinsense-icons", re: /from\s+["'](lucide-react|react-icons[^"']*|@heroicons[^"']*|@mui\/icons-material[^"']*|@fortawesome[^"']*|feather-icons|react-feather|@tabler\/icons[^"']*)["']/,
    message: "Phosphor Icons (Bold) only (Law 11)." },
  { rule: "chart-library", severity: "warning", practiceId: "invinsense-charts", re: /from\s+["'](recharts|chart\.js|react-chartjs-2|victory[^"']*|@nivo\/[^"']+|apexcharts|react-apexcharts|highcharts[^"']*)["']/,
    message: "Charts use reaviz (Law 18). recharts is legacy-only; echarts only for maps/sankey/word cloud/calendar; reagraph for graphs." },
  { rule: "nav-as-button", severity: "warning", practiceId: "invinsense-navigation", re: /<button[^>]*(onClick|onclick)=[^>]*(navigate|router\.push|location\.(href|hash)|setPage)/,
    message: "Navigation is links (Law 12): use <a href> with aria-current='page'." },
  { rule: "placeholder-as-label", severity: "info", practiceId: "invinsense-components", re: /<input\b(?![^>]*(aria-label|aria-labelledby|\bid=))[^>]*\bplaceholder=/,
    message: "Placeholder cannot be the label. Add a real <label> above the field." },
  { rule: "emoji-icon", severity: "warning", practiceId: "invinsense-icons", re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
    message: "Emoji are never icons (Law 11). Use Phosphor Bold." , skip: isComment },
  { rule: "em-dash", severity: "warning", practiceId: "invinsense-voice", re: /—/,
    message: "No em-dashes anywhere, including comments and commits. Use a period, comma or colon." },
  { rule: "buzzwords", severity: "warning", practiceId: "invinsense-voice", re: /\b(streamline[sd]?|empower(s|ed|ing)?|supercharge[sd]?|seamless(ly)?|world-class|enterprise-grade|cutting-edge|revolutionary|next-gen(eration)?|unlock the power)\b/i,
    message: "Marketing buzzword. Pick a plain verb and a noun." },
  { rule: "apology-or-vague-confirm", severity: "warning", practiceId: "invinsense-voice", re: /Sorry,?\s+something went wrong|Are you sure\?|Oops/i,
    message: "Name what failed and what to do; title dialogs after the object, not 'Are you sure?'." },
  { rule: "exclamation-copy", severity: "warning", practiceId: "invinsense-voice", re: /toast\.\w+\(\s*["'`][^"'`]*!|>[^<>{}]*[A-Za-z]!\s*</,
    message: "No exclamation marks in product copy." },
  { rule: "stack-trace-ui", severity: "warning", practiceId: "invinsense-four-states", re: /error\.stack|err\.stack|\.stack\b.*(render|innerHTML|textContent|\{)/,
    message: "Never show a stack trace. Show what failed in user terms plus a copyable correlation ID and retry." },
  { rule: "size-token-placeholder", severity: "info", practiceId: "invinsense-motion-a11y", re: /(min-)?(height|width):\s*(2\d|3[01])px[^;]*;?[^\n]*(button|btn)/i,
    message: "Interactive targets need 32px minimum on fine pointers and 44px on coarse pointers." },
];

export function reviewInvinsense(code: string): Finding[] {
  const lines = code.split("\n");
  const out: Finding[] = [];
  const seen = new Set<string>();
  lines.forEach((line, i) => {
    for (const r of rules) {
      if (/invinsense-allow/.test(line) || r.skip?.(line)) continue;
      const m = line.match(r.re);
      if (!m) continue;
      if (r.check && !r.check(m)) continue;
      const key = `${r.rule}:${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ rule: r.rule, severity: r.severity, line: i + 1, message: r.message, practiceId: r.practiceId });
    }
  });
  // File-level checks
  if (/<html\b/i.test(code) && !/data-theme/.test(code)) {
    out.push({ rule: "missing-data-theme", severity: "warning", line: 1, practiceId: "invinsense-theme", message: "Shell must set html[data-theme] and restore it before first paint." });
  }
  if (/@keyframes|[{;\s]animation\s*:|[{;\s]transition\s*:/.test(code) && !/prefers-reduced-motion/.test(code)) {
    out.push({ rule: "missing-reduced-motion", severity: "error", line: 1, practiceId: "invinsense-motion-a11y", message: "Animations present but no prefers-reduced-motion block. It is mandatory and stays last in the stylesheet." });
  }
  const order = { error: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity] || a.line - b.line);
}
