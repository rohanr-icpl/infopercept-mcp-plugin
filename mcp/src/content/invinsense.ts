import type { Practice } from "./types.js";

/**
 * Invinsense Module UI Guide v2.0 (aligned to Invinsense Interface Standard v1).
 * Source: https://launcher-invinsense.netlify.app/module-ui-guide
 * Code wins over the guide if they disagree (reference: datalake-ui).
 */
export const INVINSENSE_SOURCE = "https://launcher-invinsense.netlify.app/module-ui-guide";

export interface Family {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  products: string;
}

export const families: Family[] = [
  { id: "isoc-core", name: "ISOC Core", primary: "#2769FC", secondary: "#0044DC", products: "SDL, SOAR, Case, TIP, UEC" },
  { id: "isoc-extension", name: "ISOC Extension", primary: "#8A3FFC", secondary: "#A56EFF", products: "Decoys, NAC, NDR, LLM Gateway" },
  { id: "uemp", name: "UEMP", primary: "#DD3731", secondary: "#B81922", products: "UEMP Core, ASM, BAS, Red SIEM, Phishing" },
  { id: "grc", name: "GRC", primary: "#D02670", secondary: "#FF44A5", products: "Management, Engineering" },
  { id: "cps-pulse", name: "CPS Pulse", primary: "#FF832B", secondary: "#CC5500", products: "OT Firewall, SRA, IDS, Diode, NMS, ITSM" },
  { id: "regimentai", name: "RegimentAI", primary: "#0CB04A", secondary: "#0D903E", products: "RegimentAI, AI-Firewall" },
  { id: "assentra", name: "Assentra", primary: "#9752D9", secondary: "#7F58D9", products: "Assentra" },
];

export const REDUCED_MOTION_CSS = `/* Reduced motion block stays LAST in the stylesheet (section 18). */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;

export function tokensCss(familyId: string, opts: { reducedMotion?: boolean } = {}): string | undefined {
  const reducedMotion = opts.reducedMotion ?? true;
  const f = families.find((x) => x.id === familyId);
  if (!f) return undefined;
  return `/* Invinsense tokens (Guide v2.0 section 05). Family: ${f.name}. Colours in OKLCH, never hex in components. */
:root {
  --accent: ${f.primary};                                   /* family primary (section 04) */
  --accent-fill: ${f.primary};                              /* filled controls; flat, no gradient */
  --accent-soft: color-mix(in oklch, var(--accent) 13%, transparent);  /* 12-15% wash */
  --accent-line: color-mix(in oklch, var(--accent) 35%, transparent);  /* hairline */
  --accent-text: var(--accent);                             /* MEASURE for AA per theme; override in light if needed */

  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --popover: oklch(0.205 0 0);
  --primary: var(--accent);
  --primary-accent: var(--primary);
  --secondary: oklch(0.269 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --destructive: oklch(0.637 0.237 25.33);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);

  --warn: oklch(0.83 0.15 82);
  --warn-wash: oklch(0.83 0.15 82 / 13%);

  --radius-sm: 6px;  --radius-md: 8px;  --radius-lg: 10px;  --radius-xl: 14px;
  --sidebar-w: 262px;  --sidebar-w-collapsed: 76px;  --topbar-h: 58px;

  --z-base: 0; --z-raised: 10; --z-sticky: 20; --z-appheader: 50;
  --z-dropdown: 100; --z-overlay: 200; --z-modal: 300; --z-toast: 400; --z-tooltip: 500;

  --font-sans: var(--font-geist-sans, "Geist"), system-ui, sans-serif;  /* next/font registers Geist under a hashed name; the variable bridges it */
  --font-mono: var(--font-geist-mono, "Geist Mono"), ui-monospace, monospace;
}

html[data-theme="light"] {
  --background: oklch(0.97 0.004 255);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --popover: oklch(1 0 0);
  --secondary: oklch(0.952 0.005 255);
  --muted: oklch(0.952 0.005 255);
  --muted-foreground: oklch(0.5 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.905 0.007 255);
  --input: oklch(0.905 0.007 255);
  --ring: oklch(0.708 0 0);

  --warn: oklch(0.52 0.13 62);
  --warn-wash: oklch(0.52 0.13 62 / 10%);
}

${reducedMotion ? REDUCED_MOTION_CSS : ""}`;
}

export const statusTones = [
  ["ok", "emerald", "Events flowing, no error", "no pulse"],
  ["degraded", "amber", "Collector error, data still lands", "no pulse"],
  ["error", "red", "Failing, nothing arrives", "pulse"],
  ["offline", "red", "Silent past threshold", "pulse"],
  ["idle", "slate", "Alive, nothing to send", "no pulse"],
  ["pending", "amber", "Undetermined or paused", "no pulse"],
  ["none", "none", "Not enrolled", "n/a"],
] as const;

export const newModuleChecklist: string[] = [
  "Copy the shell from an existing module (UEMP, SOAR, AI-Firewall, GSOS, OT Firewall); keep index.html, app.js, tour engine, CSS structure and tour anchor ids",
  "Adopt the token set verbatim (section 05); set --accent to the family pair (section 04); delete --accent-glow and --ambient",
  "Use product lockup C from the shared package in sidebar header and login; glyph only when collapsed; never recolour",
  "Ship a 44x44 product icon (family tones, 36x36 live area) and register it in catalog.js",
  "Model nav in data.js: grouped, icon + label, real hrefs, one nesting level max",
  "Build screens in pages.js with shared components: Geist / Geist Mono, 8-step type scale, named radii, 4px spacing",
  "Ship all four states (loading, empty, error, partial) for every fetching view",
  "Consume tokens only (no hex); charts read accent + severity tokens so branding cascades",
  "Write a specific tour: one step per key control, 'click to X', real data, chapters of 5-7 steps, resolve permission-gated steps",
  "Support both themes via html[data-theme]; no theme conditionals on colour; screenshot both before the PR",
  "Measure contrast for every new foreground on a tint, both themes; record the numbers",
  "Drop the folder into public/<id>/, add the INTERNAL_MODULE_URLS entry in ModuleWidgets.jsx, ship a README",
  "Run `npm run slop` and reach zero violations (warnings are advisory)",
  "Read the copy aloud: sentence case, no buzzwords, no em-dashes, no exclamation marks, no label + sublabel + hint redundancy",
];

const P = (p: Omit<Practice, "category">): Practice => ({ category: "invinsense", ...p });

export const invinsensePractices: Practice[] = [
  P({
    id: "invinsense-principles",
    title: "Core principles and the shell",
    summary: "One shell, accent not layout, tokens over hexes, same components, guided by default, dark + light.",
    do: [
      "One shell: fixed left sidebar (262px, rail 76px), fixed topbar (58px), scrolling main content with 26px/30px page padding",
      "Differentiate products by the family accent colour only; structure stays constant",
      "Consume colours from CSS variables; never hardcode hex",
      "Reuse shared component classes and markup verbatim",
      "Every module ships a doc-specific guided tour that auto-starts once and can be replayed",
      "Support dark and light via the html[data-theme] attribute",
      "Topbar controls left to right: (empty; page title lives in content), tenant switcher (multi-tenant only), notifications, guided tour (lifebuoy), theme toggle, apps menu (seven-dot), user chip (initials, always last, 36px)",
      "Layers: sidebar z-40, topbar z-50, hairline border under the topbar",
    ],
    dont: ["Invent a new header, sidebar width or nav pattern", "Move topbar controls or show a breadcrumb on a top-level route", "Put the page title in the topbar"],
    tags: ["shell", "sidebar", "topbar", "layout", "principles", "laws"],
  }),
  P({
    id: "invinsense-branding",
    title: "Logo and branding (Laws 2 and 3)",
    summary: "One asset, one source. Every screen is branded, including error and auth screens.",
    do: [
      "Glyph (green V): favicon, rail, avatar; 32px default, 20px minimum",
      "Wordmark: logo-invinsense-white.svg (dark theme) / logo-invinsense.svg (light theme), swapped with .logo-dark / .logo-light",
      "Product lockup: V glyph 30px + 'Invinsense' 12px/600 + product name 16px/600 in sidebar header and login",
      "Corporate mark (infopercept.png, navy, 195x30) on the login footer only",
      "Ship the wordmark from the shared package as SVG",
      "Carry the lockup on login, SSO, errors, 403, 404, session expiry and maintenance screens",
      "Page title format: {Page} · {Product} · Invinsense",
    ],
    dont: ["Recolour the green, stretch, rotate, or recreate the logo in CSS", "Ship a screen without the lockup"],
    tags: ["logo", "brand", "lockup", "wordmark", "glyph", "favicon", "title"],
  }),
  P({
    id: "invinsense-accent",
    title: "Family accent colours and identity vs status (Law 4)",
    summary: "Products differ only by a two-tone family accent. Identity never uses status affordances.",
    do: [
      "Use the family pairs (see get_invinsense_tokens): ISOC Core #2769FC/#0044DC, ISOC Extension #8A3FFC/#A56EFF, UEMP #DD3731/#B81922, GRC #D02670/#FF44A5, CPS Pulse #FF832B/#CC5500, RegimentAI #0CB04A/#0D903E, Assentra #9752D9/#7F58D9",
      "Express identity with a 2px rule, heading colour or tile wash",
      "Use tokens: --accent, --accent-fill (filled controls), --accent-soft (12-15% wash), --accent-line (35% hairline), --accent-text (AA-measured foreground)",
      "When the accent collides with status (UEMP red vs error red) use a desaturated theme variant for accent UI and keep vivid red for status only",
    ],
    dont: ["Give identity colour a dot, pill or badge (those are status vocabulary)", "Derive secondary tones; the pairs are authored", "Add per-module token namespaces like --soar-* or --aifw-*"],
    tags: ["accent", "colour", "color", "family", "identity", "status", "uemp", "isoc", "grc", "cps"],
  }),
  P({
    id: "invinsense-tokens",
    title: "Design tokens, layers and radius",
    summary: "All colours authored in OKLCH. One token set, two values (Law 6). No parallel namespaces.",
    do: [
      "Use the core tokens: --background, --foreground, --card, --popover, --primary, --secondary/--muted, --muted-foreground, --destructive, --border, --input, --ring",
      "Define theme variants in :root (dark) and html[data-theme='light']",
      "Use the z-index ladder: base 0, raised 10, sticky 20, appheader 50, dropdown 100, overlay 200, modal 300, toast 400, tooltip 500",
      "Use radius steps: sm 6px, md 8px (buttons, inputs, nav items), lg 10px (cards, popovers), xl 14px (modals, drawers)",
      "Run get_invinsense_tokens to get a ready-to-paste CSS block per family",
    ],
    dont: ["Hardcode hex in components or charts", "Redefine core tokens per module", "Use the dark: prefix for colours", "Exceed the 14px radius step on small cards"],
    tags: ["tokens", "oklch", "css variables", "radius", "z-index", "theme"],
  }),
  P({
    id: "invinsense-typography",
    title: "Typography",
    summary: "Geist for UI, Geist Mono for data, 8-step scale, 12px absolute floor (Law 9).",
    do: [
      "Self-host Geist and Geist Mono as WOFF2, font-display: optional, with a metric-matched fallback; base 16px",
      "Scale (size/line/weight): Display 30/36/700 (launcher hero only), Title 20/28/600, Section 18/26/600, Page title 16/24/500, Body 14/20/400, Label 13/18/500, Caption 12/16/500, Data 13/20/400 Geist Mono (IDs, timestamps, payloads)",
      "One h1 per route (the page title); headings descend without skipping levels; sentence case",
      "text-balance on headings, text-pretty on prose, tabular-nums on number columns and ticking values",
      "De-emphasise with --muted-foreground, not by shrinking",
      "Cap prose and form columns at 65-75 characters",
    ],
    dont: ["Use text below 12px anywhere (badges and chips included)", "Use any unapproved font", "Use italic serif display type", "Track tighter than -0.03em or set body text in all caps"],
    tags: ["font", "geist", "type scale", "heading", "text", "12px"],
  }),
  P({
    id: "invinsense-spacing",
    title: "Spacing, layout edges and gap vs border (Law 10)",
    summary: "4px grid. Group by proximity. One edge per column.",
    do: [
      "Dense steps 4, 8, 12, 16; layout steps 24, 32, 48, 64",
      "8px inside a label/field pair, 24px between pairs",
      "Everything stacked vertically shares left and right edges; cap text measure inside the box, never shorten the bordered box",
      "Scroll wide content in an overflow-x:auto container; the page never scrolls sideways",
      "Use gap when two things are related and only need air (4px between list rows)",
      "Use a border or card only for a real container the user can act on, or when two regions scroll independently",
      "Use 12-16px padding inside bordered containers",
    ],
    dont: ["Use one gap everywhere", "Nest cards (one level max)", "Let lines exceed 80ch", "Clip popovers with overflow-hidden on an ancestor"],
    tags: ["spacing", "grid", "gap", "layout", "padding", "cards", "overflow"],
  }),
  P({
    id: "invinsense-theme",
    title: "Dark and light theme (Law 6)",
    summary: "Attribute on <html>, persisted per module, restored before first paint.",
    do: [
      "Toggle with html[data-theme='dark'|'light']; topbar sun/moon control",
      "Restore the saved theme with an inline script before first paint to avoid a flash",
      "Swap the logo with .logo-dark / .logo-light (the only legitimate theme-conditional asset)",
      "Screenshot both themes and check contrast before merge",
    ],
    dont: ["Use @media (prefers-color-scheme) as the mechanism", "Use dark: prefixes on colours", "Add theme conditionals on colour in JS"],
    good: ":root { --warn: oklch(0.83 0.15 82); --warn-wash: oklch(0.83 0.15 82 / 13%); }\nhtml[data-theme='light'] { --warn: oklch(0.52 0.13 62); --warn-wash: oklch(0.52 0.13 62 / 10%); }",
    tags: ["theme", "dark", "light", "data-theme", "contrast"],
  }),
  P({
    id: "invinsense-icons",
    title: "Icons (Law 11)",
    summary: "Phosphor Icons, Bold weight only, currentColor, 256x256 viewBox.",
    do: [
      "UI icons: Phosphor Bold, filled paths, fill='currentColor', aria-hidden unless the only affordance",
      "Sizes: 16px inline with text, 20px header/toolbar, 24px empty states and section headers, 40px product icons only",
      "Keep 8px gap to text (never under 6px); icon-only controls carry aria-label",
      "Product icons: 44x44 artboard, 36x36 live area, 4px clear space, two family tones, no gradients, drawn as a set",
      "Add an icon when it repeats across rows, is the only affordance, and one obvious glyph exists",
    ],
    dont: ["Use emoji as icons", "Mix icon libraries or weights", "Add an icon that took over a second to choose or that repeats the label"],
    good: "const ICONS = { rocket: 'M152,224...', gear: 'M128,80...' };\nfunction icon(name, size = 16, cls = '') {\n  return '<svg width=\"' + size + '\" height=\"' + size + '\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\" class=\"' + cls + '\"><path d=\"' + (ICONS[name] || ICONS.box) + '\"/></svg>';\n}",
    tags: ["icons", "phosphor", "svg", "product icon", "emoji"],
  }),
  P({
    id: "invinsense-navigation",
    title: "Navigation and sidebar (Law 12)",
    summary: "Navigation is links. Active state derives from the route.",
    do: [
      "Sidebar 262px expanded / 76px rail on body.sidebar-collapsed; --sidebar-bg, 1px border-right, z-40; transition width only, 200ms ease-out",
      "Brand row 58px (matches topbar) with the product lockup, 16px inset",
      "Nav item: 8px/11px padding, md radius, 16px icon, 10px gap, 13px/500 single-line truncated label",
      "Group labels: sentence case 12px/500 --muted-foreground, 15px above and 6px below",
      "One sub-nav level: 16px indent, 1px keyline; opens when the parent is active; chevron rotates 90deg in 150ms ease-out",
      "Every target is <a href> with a real URL and aria-current='page' when active",
      "Footer holds utilities only (Guided tour; Settings in GSOS)",
      "Collapse toggle: 28px circle, 14px caret, fixed top 72px, left calc(var(--sidebar-w) - 14px), z-45, persisted per module",
      "Below 768px the rail becomes a sheet over a backdrop",
    ],
    dont: ["Use <button onclick> for navigation", "Reorder groups between releases", "Derive active state from click state", "Put actions in the sidebar"],
    tags: ["nav", "sidebar", "links", "aria-current", "collapse", "rail"],
  }),
  P({
    id: "invinsense-apps-navigator",
    title: "Apps navigator (waffle menu, Law 13)",
    summary: "One navigator package fed by the entitlements API; identical product list everywhere.",
    do: [
      "Trigger: seven-dot mark in topbar slot 6, 36px button, 18px glyph",
      "Popover 340-360px, 3-up tiles, 40px product icons, scrolls internally past 620px, z-dropdown",
      "Group families in fixed order: ISOC Core, ISOC Extension, UEMP, GRC, CPS Pulse, RegimentAI, Assentra, each with a 2px family rule",
      "Tile: 40x40 icon, 12px/500 label with line-clamp-2 and full name in title, 8px radius, the whole tile is a link",
      "Current product shows an accent pill and is not a link to itself",
      "Unlicensed products render at 45% opacity with a 'Not licensed' chip, never hidden",
    ],
    dont: ["Fork the product list per module", "Hide unlicensed products"],
    tags: ["waffle", "apps menu", "navigator", "entitlements", "licensed"],
  }),
  P({
    id: "invinsense-components",
    title: "Shared component kit",
    summary: "Same class names, markup and behaviour in every module; only the accent varies.",
    do: [
      "Sizes: sm 32px, default 36px, lg 40px; md radius; 14px/500 text; 16px icon with 8px gap; 3px focus ring",
      "Buttons: .btn, .btn.primary, .btn.outline, .btn.ghost, .btn.danger, .btn.sm; primary is a flat --accent fill; exactly one primary per screen",
      "Destructive trigger is a ghost button; red is reserved for the confirm inside an AlertDialog",
      "Async buttons show a spinner and disable in flight, then give explicit confirmation",
      "Forms: label above, hint below, validate on blur, width hints content length, fewer than 5 options means a radio group",
      "Badges: .badge.[dim|ac|crit|warn|info|ok]; neutral by default; severity variants for OCSF severity only; only .ac follows the accent",
      "KPI: .kpi with accent legend dot on the label, big tabular value, one sub-line; .rowcard: icon chip, name, meta, status dot + word",
      "Tables: table.data, dim headers, hairline rows, hover highlight, right-aligned tabular numbers per column, sticky header, persist density/columns/sort, virtualise past ~100 rows",
      "Controls: .search .select .menu .toggle .tabs; dropdown menus are for actions, tabs are peer views not routes",
      "Dialog: task + form, closes on button, backdrop or Escape; AlertDialog: a decision, traps focus, no outside-click close; title names the object; 14px radius, no glow",
    ],
    dont: [
      "Use gradients or glow on primaries",
      "Use a placeholder as a label, block paste, toast a field error, or silently reset a form on success",
      "Title an AlertDialog 'Are you sure?'",
      "Put complex settings in a dialog (use a page if it needs a scrollbar or three columns)",
    ],
    tags: ["buttons", "forms", "inputs", "badge", "kpi", "table", "dialog", "tabs", "select", "components"],
  }),
  P({
    id: "invinsense-status-toasts",
    title: "Status vocabulary, badges and toasts (Laws 7 and 16)",
    summary: "Status is never colour alone: dot beside a word. Red is only for actionable things.",
    do: [
      "Health tones (compile error if one is missing): ok (emerald), degraded (amber), error (red, pulses), offline (red, pulses), idle (slate, neutral, never pulses), pending (amber), none (not enrolled)",
      "Rule status, one word each with one canonical resolver: Active, Paused, Failed (the only state needing human action), Draft (fallback), in-flight Deploying/Pausing/Cancelling/Deleting in accent, Deleted (muted)",
      "Toasts: past tense, no exclamation marks, name the object; warnings explain themselves and state duration; errors say what to do and carry an action when possible",
      "Duration by severity: info/success 4s, warning 7s, error and loading persist until dismissed",
      "Toast layout: 3px severity edge (the only sanctioned side stripe), bottom-right on desktop and top-center under 640px, three visible and the fourth queues, 20px close always visible, long errors scroll internally past 40vh",
      "Use a toast for a finished action or background job; under the field for validation; AlertDialog for decisions; a status pill on the object for standing conditions",
      "Eyebrow: 12px/600 uppercase tracked muted, only for a group of more than one control or a value label",
    ],
    dont: ["Convey status with colour alone", "Pulse static data or idle state", "Use an eyebrow instead of a real heading for a page or panel title"],
    tags: ["status", "toast", "badge", "health", "severity", "pulse", "eyebrow"],
  }),
  P({
    id: "invinsense-charts",
    title: "Charts and data visualisation (Law 18)",
    summary: "One charting library suite-wide: reaviz.",
    do: [
      "Use reaviz for all charts; echarts only for geo maps, word clouds, sankey and calendar heatmaps; reagraph for node-link graphs; recharts only where it already works (no new work)",
      "One accent for one series; single-series charts use one colour, not a rainbow",
      "Take severity colours from the status section; read values from tokens (var(--primary)), so branding cascades",
      "Ship loading, empty, error and partial states",
    ],
    dont: ["Use a library default palette", "Encode category by hue alone (add pattern, label or shape)", "Hardcode hex in chart config", "Re-animate series on every re-render", "Draw gridlines heavier than the data"],
    tags: ["charts", "reaviz", "echarts", "recharts", "reagraph", "visualization", "dataviz"],
  }),
  P({
    id: "invinsense-four-states",
    title: "Four states and honest async (Law 19)",
    summary: "Every fetching view ships loading, empty, error and partial.",
    do: [
      "Loading: skeleton shaped like the content, matching final height",
      "Empty: say what is missing, why, and one clear next action; a filtered-empty view offers Clear",
      "Error: what failed in user terms plus retry; correlation ID in mono and copyable; never a stack trace",
      "Partial: mark unavailable sources with the degraded tone and render what arrived",
      "Submit shows a spinner and disables in flight, then gives explicit confirmation; silence is not confirmation",
      "Use a skeleton for a known shape waiting ~300ms to a few seconds; a labelled spinner for unknown shape; tell the user when a background job lands",
    ],
    dont: ["Flash a skeleton for waits under 300ms", "Show a stack trace", "Leave a fetching view without an empty or error state"],
    tags: ["loading", "empty", "error", "partial", "skeleton", "async", "states"],
  }),
  P({
    id: "invinsense-tour",
    title: "Guided tour pattern (Law 14)",
    summary: "One engine suite-wide: nextstepjs 2.2.0. Specific, anchored, replayable.",
    do: [
      "Engine nextstepjs 2.2.0 with router adapter (js/tour.js in static modules); TourCard portals to document.body at position:fixed; TourNavigator chapter menu; buildTourPlan drops unreachable steps and renumbers",
      "Card: 380px wide, max-width calc(100vw - 32px), --popover surface, border-primary/30 hairline, 14px radius, pointer arrow, 3px progress rail on top (transform: scaleX)",
      "Header: 16px Phosphor glyph, 16px/600 sentence-case title, close X; body 14px/400 text-pretty, max 3 lines",
      "Counter in mono 12px zero-padded (04/07), tabular; actions: Skip (step 1 only), then Back and a filled sm Next",
      "Chapters of 5-7 steps that teach a task, not a layout; one step per key control with a stable id selector",
      "Auto-launch once per user per product, resumable; afterwards via Help, profile or sidebar",
      "Keyboard: Escape exits, arrow keys step, focus is trapped then restored; reduced motion uses a cross-fade",
    ],
    dont: ["Use mascots", "Write generic copy like 'This is the dashboard'", "Gate UI behind the tour", "Hide Skip (always one click)"],
    good: "export const tours: Tour[] = [{\n  tour: 'getting-started',\n  steps: [{\n    icon: null,\n    title: \"Find yesterday's failed logins\",\n    content: 'Explorer queries Lakehouse in IQL. Type a filter, press Enter.',\n    selector: '#nav-explorer',\n    side: 'right', showControls: true, showSkip: true,\n  }],\n}];",
    tags: ["tour", "nextstepjs", "onboarding", "guided", "chapters"],
  }),
  P({
    id: "invinsense-login",
    title: "Login and auth screens (Law 15)",
    summary: "Every unauthenticated screen carries the lockup and product name.",
    do: [
      "50/50 split; below 1024px drop the illustration and go full-width form",
      "Left: animated isometric illustration in the family two tones on --accent-soft; Lottie 2-4s loop; one scene per product, never reused; vector, transparent ground, one file for both themes",
      "Lottie: lottie-web 5.13.0 SVG renderer, assets/login-illustration.json under 200 KB, shapes only, flat fills, eased position/opacity, no bounce; container max 600px centred",
      "Reduced motion: anim.goToAndStop(0); pause when the tab is hidden and resume on focus; if the JSON fails show the 48px lockup",
      "Right: lockup (V 30px, 'Invinsense' 12px/600, product name 24px/700) 16px above a card: --card on --background, 1px hairline, 12px radius, 16px padding, 400px max, vertically centred",
      "Fields: Tenant (multi-tenant only), Username, Password with reveal; 13px/500 label above; 40-44px tall",
      "Full-width flat-accent 'Sign in' at 40px with spinner + disabled in flight and explicit success confirmation",
      "'Forgot password?' centred in --accent-text under the button, hairline, one-line admin note in --muted-foreground; version in mono bottom-left",
    ],
    dont: ["Reuse another product's scene", "Use mascots or characters", "Ship auth/error screens without the lockup"],
    tags: ["login", "auth", "sso", "mfa", "lottie", "403", "404", "lockup"],
  }),
  P({
    id: "invinsense-motion-a11y",
    title: "Motion, contrast, focus and targets",
    summary: "150-250ms, ease-out, transform and opacity only, reduced motion mandatory, WCAG 2.1 AA in both themes.",
    do: [
      "Duration 150-250ms; interaction feedback at most 200ms; enter 220ms, exit 160ms; ease-out always",
      "Animate transform and opacity only (sole exception: sidebar rail width); enter with scale(0.95) + opacity, popovers from the trigger, modals from centre; active:scale(.98) on pressables",
      "Every animation has a reduced-motion alternative; the prefers-reduced-motion block stays last in the stylesheet",
      "Legitimate motion: sidebar collapse, popover/drawer entrance, skeleton shimmer (1-2s), live row insertion, pulsing error/offline dot",
      "Contrast 4.5:1 body text, 3:1 large text and non-text indicators; measure both themes separately, every foreground on tinted surface",
      "Visible 3px :focus-visible ring on everything interactive",
      "Targets: 44px on coarse pointers, 32px minimum on fine pointers, 8px between neighbours",
      "Tab order matches visual order; Escape closes overlays and returns focus; icon-only controls carry aria-label; every input has a real label",
      "Active nav uses fill + weight + colour; errors use icon + text",
    ],
    dont: [
      "Use ease-in on entrances, bounce, elastic or overshoot",
      "Animate width, height, top, left, margin or use transition: all",
      "Add orchestrated page-load sequences, ambient looping animation in chrome, glow as an affordance, large blur animations, marquees or blinking cursors",
      "Set outline: none without a replacement",
    ],
    tags: ["motion", "animation", "reduced motion", "contrast", "focus", "a11y", "wcag", "targets"],
  }),
  P({
    id: "invinsense-voice",
    title: "Voice and copy",
    summary: "Sentence case, active voice, present tense, specific and plain.",
    do: [
      "Buttons name the outcome ('Deploy data source'); the toast confirms in past tense ('Data source deployed')",
      "Errors state what failed and what to do: 'Collector cannot reach 10.4.2.9:514. Check the firewall rule, then retry.'",
      "Relative time in feeds, absolute time in records",
      "Tour steps name the control and the outcome",
      "Use platform terms: Lakehouse, Correlation Engine, Log Collector, Log Streamer (never vendor names)",
    ],
    dont: [
      "Use em-dashes anywhere, including code comments and commit messages",
      "Apologise ('Sorry, something went wrong' tells the analyst nothing)",
      "Expose implementation detail",
      "Use marketing verbs: streamline, empower, supercharge, seamless, world-class, enterprise-grade",
      "Write cute empty states, aphoristic cadence ('Not a feature. A platform.'), exclamation marks or fake numbers",
    ],
    tags: ["copy", "voice", "ux writing", "microcopy", "tone", "errors", "buzzwords"],
  }),
  P({
    id: "invinsense-module-structure",
    title: "Module file structure and launcher wiring",
    summary: "Static modules drop into the launcher's public/ folder and register a URL.",
    do: [
      "Layout: index.html (shell), css/<name>.css (tokens, both themes), js/charts.js (inline SVG charts + Phosphor paths), js/data.js (NAV + mock data), js/pages.js (PAGES registry, all four states), js/tour.js (TOUR_STEPS + spotlight engine), js/app.js (hash router, sidebar/topbar, theme, navigator), assets/ (lockups + mark.svg)",
      "Copy the folder to public/<id>/ in invinsense-launcher",
      "Register the module id (matching the catalog.js entry, which carries family, product icon and licence flag) in INTERNAL_MODULE_URLS in ModuleWidgets.jsx",
      "Example: uemp '/uemp/index.html#/dashboard', soar '/soar/index.html#/dashboard', aifw '/aifw/index.html#/getting-started', grcmgmt '/gsos/index.html#/dashboard', otfw '/otfw/index.html#/dashboard'",
    ],
    dont: ["Register a module id that is missing from catalog.js"],
    tags: ["structure", "launcher", "wiring", "catalog", "modules", "files"],
  }),
  P({
    id: "invinsense-anti-slop",
    title: "Anti-slop guardrails (npm run slop)",
    summary: "Automated scan of all modules for banned patterns. Violations fail; warnings are advisory. Baseline in .slop-baseline.json.",
    do: [
      "Run `npm run slop` before every PR and reach zero violations",
      "Close a card with a hairline, tint, or nothing (exceptions: short centred active indicator on a nav row; 3px severity edge on a toast)",
      "Vary shapes or use rows instead of a grid of identical cards",
      "Put an icon beside a heading, not stacked in a tile above it",
      "Number sections (01/02/03) only when order matters",
      "Ship no illustration rather than a sketchy fallback",
    ],
    dont: [
      "Coloured side-stripes (border-left over 1px as accent) or ::before side tabs",
      "Radius of 24px or more on small cards; nested cards; decorative glass (backdrop-filter as a look); grid-line textures on non-canvas surfaces",
      "Hand-drawn SVG or mascots; placeholder or empty-src images; hero-metric slabs",
      "Undersized text (<12px), italic serif display, crushed tracking + all-caps body, unapproved fonts",
      "Purple gradient washes, gradient text, per-element neon glow, cream/beige surfaces, grey text on colour, hardcoded hex",
      "opacity:0 at rest, bounce/elastic easing, layout-property animation, image hover transforms",
      "Marketing buzzwords, em-dashes, exclamation marks",
    ],
    tags: ["slop", "lint", "banned", "conformance", "guardrails", "violations"],
  }),
];
