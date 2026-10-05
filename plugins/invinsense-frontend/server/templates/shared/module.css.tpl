/* ==========================================================================
   __PRODUCT_NAME__ · Invinsense Module UI Guide v2.0
   Tokens first (section 05), then shell and shared components.
   Consume tokens only. No hex outside the --accent* definitions.
   ========================================================================== */

__TOKENS_CSS__

:root {
  --sidebar-bg: var(--card);
  --bg-elev: var(--card);
  --primary-foreground: oklch(0.985 0 0);
  --ok: oklch(0.78 0.16 160);
  --info: oklch(0.75 0.12 235);
  --idle: oklch(0.65 0.02 255);
  --accent-isoc-core: #2769FC;
  --accent-isoc-extension: #8A3FFC;
  --accent-uemp: #DD3731;
  --accent-grc: #D02670;
  --accent-cps-pulse: #FF832B;
  --accent-regimentai: #0CB04A;
  --accent-assentra: #9752D9;
}
html[data-theme="light"] {
  --primary-foreground: oklch(0.985 0 0);
  --ok: oklch(0.52 0.14 160);
  --info: oklch(0.5 0.14 245);
  --idle: oklch(0.5 0.02 255);
}

/* Element resets live in @layer base so utility classes (Tailwind, invin-uix) always win over them. */
@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  h1, h2, h3, p { margin: 0; }
  h1, h2, h3 { text-wrap: balance; }
  p { text-wrap: pretty; }
  a { color: inherit; text-decoration: none; }
  button, input, select { font: inherit; color: inherit; }
}
html { color-scheme: dark; }
html[data-theme="light"] { color-scheme: light; }
body { margin: 0; background: var(--background); color: var(--foreground); font-family: var(--font-sans); font-size: 14px; line-height: 20px; -webkit-font-smoothing: antialiased; }
:focus-visible { outline: 3px solid var(--ring); outline-offset: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.mono { font-family: var(--font-mono); font-size: 13px; line-height: 20px; }
.num { font-variant-numeric: tabular-nums; }
.muted { color: var(--muted-foreground); }

/* ---- Shell (section 02, 10) ---- */
.sidebar { position: fixed; top: 0; bottom: 0; left: 0; width: var(--sidebar-w); background: var(--sidebar-bg); border-right: 1px solid var(--border); z-index: 40; display: flex; flex-direction: column; transition: width 200ms ease-out; /* invinsense-allow: rail width is the sanctioned exception */ }
body.sidebar-collapsed .sidebar { width: var(--sidebar-w-collapsed); }
.brand { height: var(--topbar-h); display: flex; align-items: center; gap: 10px; padding: 0 16px; border-bottom: 1px solid var(--border); flex: none; }
.brand img { width: 30px; height: 30px; flex: none; }
.lockup { display: flex; flex-direction: column; min-width: 0; }
.lockup small { font-size: 12px; line-height: 16px; font-weight: 600; color: var(--muted-foreground); }
.lockup strong { font-size: 16px; line-height: 20px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
body.sidebar-collapsed .lockup, body.sidebar-collapsed .nav-label, body.sidebar-collapsed .nav-item .label, body.sidebar-collapsed .nav-item .chev, body.sidebar-collapsed .sub { display: none; }
.nav { flex: 1; overflow-y: auto; padding: 8px; }
.nav-label { font-size: 12px; line-height: 16px; font-weight: 500; color: var(--muted-foreground); padding: 15px 10px 6px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 11px; border-radius: var(--radius-lg); font-size: 13px; line-height: 18px; font-weight: 500; color: var(--muted-foreground); }
.nav-item .label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-item:hover { background: var(--muted); color: var(--foreground); }
.nav-item[aria-current="page"] { background: var(--accent-soft); color: var(--accent-text); font-weight: 600; }
.nav-item .chev { transition: transform 150ms ease-out; }
.nav-item[aria-expanded="true"] .chev { transform: rotate(90deg); }
.sub { margin: 2px 0 2px 16px; padding-left: 7px; border-left: 1px solid var(--border); }
.sub .nav-item { padding: 6px 10px; }
.sidebar-foot { padding: 8px; border-top: 1px solid var(--border); flex: none; }
.sidebar-foot button.nav-item { width: 100%; border: 0; background: transparent; cursor: pointer; text-align: left; }
.sidebar-toggle { position: fixed; top: calc(var(--topbar-h) - 14px); left: calc(var(--sidebar-w) - 14px); width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border); background: var(--bg-elev); color: var(--muted-foreground); display: grid; place-items: center; cursor: pointer; z-index: 45; padding: 0; }
body.sidebar-collapsed .sidebar-toggle { left: calc(var(--sidebar-w-collapsed) - 14px); }
.sidebar-toggle:hover { color: var(--accent-text); border-color: var(--accent-line); }

.topbar { position: fixed; top: 0; right: 0; left: var(--sidebar-w); height: var(--topbar-h); display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 0 16px; background: var(--background); border-bottom: 1px solid var(--border); z-index: var(--z-appheader); }
body.sidebar-collapsed .topbar { left: var(--sidebar-w-collapsed); }
.topbar .spacer { flex: 1; }
.icon-btn { position: relative; width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: var(--radius-md); background: transparent; cursor: pointer; color: var(--muted-foreground); }
.icon-btn:hover { background: var(--muted); color: var(--foreground); }
.icon-btn .count { position: absolute; top: 2px; right: 2px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: var(--radius-sm); background: var(--accent-fill); color: var(--primary-foreground); font-size: 12px; line-height: 16px; font-weight: 600; text-align: center; }
.avatar { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--accent-line); background: var(--accent-soft); color: var(--accent-text); display: grid; place-items: center; font-size: 12px; line-height: 16px; font-weight: 600; cursor: pointer; padding: 0; }
.menu-btn { display: none; }
.content { margin-left: var(--sidebar-w); padding: calc(var(--topbar-h) + 26px) 30px 26px; min-height: 100vh; }
body.sidebar-collapsed .content { margin-left: var(--sidebar-w-collapsed); }
.page { display: grid; gap: 24px; }
.page-title { font-size: 16px; line-height: 24px; font-weight: 500; }
.section-title { font-size: 18px; line-height: 26px; font-weight: 600; }
.prose { max-width: 70ch; }

/* ---- Components (section 12) ---- */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: var(--radius-md); border: 1px solid var(--input); background: transparent; font-size: 14px; line-height: 20px; font-weight: 500; cursor: pointer; transition: transform 150ms ease-out, opacity 150ms ease-out; }
.btn:hover { background: var(--muted); }
.btn:active { transform: scale(0.98); }
.btn.sm { height: 32px; padding: 0 10px; }
.btn.lg { height: 40px; padding: 0 16px; }
.btn.primary { background: var(--accent-fill); border-color: var(--accent-fill); color: var(--primary-foreground); }
.btn.primary:hover { opacity: 0.9; }
.btn.ghost { border-color: transparent; }
.btn.danger { color: var(--destructive); }
.btn[disabled], .btn[aria-busy="true"] { opacity: 0.6; pointer-events: none; }
.spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--border); border-top-color: currentColor; animation: spin 700ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; }
.card h2 { font-size: 18px; line-height: 26px; font-weight: 600; margin-bottom: 8px; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.kpi .label { display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--muted-foreground); }
.kpi .legend { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.kpi .value { margin-top: 8px; font-size: 20px; line-height: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
.kpi .sub-line { margin-top: 4px; font-size: 12px; line-height: 16px; color: var(--muted-foreground); }

.table-wrap { overflow-x: auto; }
table.data { width: 100%; border-collapse: collapse; }
table.data th { position: sticky; top: 0; text-align: left; padding: 8px 12px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--muted-foreground); background: var(--card); border-bottom: 1px solid var(--border); }
table.data td { padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 14px; line-height: 20px; }
table.data tbody tr:hover { background: var(--muted); }
table.data .r { text-align: right; font-variant-numeric: tabular-nums; }

.badge { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 12px; line-height: 16px; font-weight: 500; color: var(--muted-foreground); }
.badge.ac { color: var(--accent-text); background: var(--accent-soft); border-color: var(--accent-line); }
.badge.ok { color: var(--ok); } .badge.warn { color: var(--warn); background: var(--warn-wash); } .badge.crit { color: var(--destructive); } .badge.info { color: var(--info); }

.status { display: inline-flex; align-items: center; gap: 8px; }
.status .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--idle); }
.status.ok .dot { background: var(--ok); } .status.degraded .dot, .status.pending .dot { background: var(--warn); }
.status.error .dot, .status.offline .dot { background: var(--destructive); animation: pulse 1.6s ease-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

.field { display: grid; gap: 8px; }
.field label { font-size: 13px; line-height: 18px; font-weight: 500; }
.field .hint { font-size: 12px; line-height: 16px; color: var(--muted-foreground); }
.input { width: 100%; height: 36px; padding: 0 12px; border-radius: var(--radius-md); border: 1px solid var(--input); background: transparent; }
.input.lg { height: 40px; }

/* ---- Four states (section 15) ---- */
.skeleton { background: var(--muted); border-radius: var(--radius-sm); animation: shimmer 1.4s ease-out infinite; }
@keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
.state { display: grid; justify-items: start; gap: 8px; padding: 32px; border: 1px dashed var(--border); border-radius: var(--radius-lg); }
.state h2 { font-size: 20px; line-height: 28px; font-weight: 600; }
.state p { color: var(--muted-foreground); max-width: 60ch; }
.cid { display: inline-flex; align-items: center; gap: 8px; }

/* ---- Toasts (section 13) ---- */
.toasts { position: fixed; right: 16px; bottom: 16px; display: grid; gap: 8px; z-index: var(--z-toast); }
.toast { position: relative; width: 360px; max-width: calc(100vw - 32px); padding: 12px 40px 12px 14px; background: var(--popover); border: 1px solid var(--border); border-left: 3px solid var(--sev, var(--ok)); /* invinsense-allow: sanctioned 3px severity edge */ border-radius: var(--radius-lg); animation: pop 220ms ease-out; }
.toast.warning { --sev: var(--warn); } .toast.error { --sev: var(--destructive); } .toast.info { --sev: var(--info); }
.toast .close { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; display: grid; place-items: center; border: 0; background: transparent; color: var(--muted-foreground); cursor: pointer; }
@media (max-width: 640px) { .toasts { top: 16px; bottom: auto; left: 16px; right: 16px; } .toast { width: auto; } }

/* ---- Apps navigator (section 11) ---- */
.pop-anchor { position: relative; }
.popover { position: absolute; top: calc(100% + 8px); right: 0; width: 350px; max-width: calc(100vw - 32px); max-height: 620px; overflow-y: auto; background: var(--popover); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 12px; z-index: var(--z-dropdown); animation: pop 220ms ease-out; }
@keyframes pop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: none; } }
.family { padding-top: 8px; margin-bottom: 12px; border-top: 2px solid var(--fam, var(--border)); }
.family h3 { font-size: 12px; line-height: 16px; font-weight: 600; color: var(--muted-foreground); margin-bottom: 8px; }
.fam-isoc-core { --fam: var(--accent-isoc-core); } .fam-isoc-extension { --fam: var(--accent-isoc-extension); } .fam-uemp { --fam: var(--accent-uemp); }
.fam-grc { --fam: var(--accent-grc); } .fam-cps-pulse { --fam: var(--accent-cps-pulse); } .fam-regimentai { --fam: var(--accent-regimentai); } .fam-assentra { --fam: var(--accent-assentra); }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tile { display: grid; justify-items: center; gap: 6px; padding: 8px; border-radius: var(--radius-md); font-size: 12px; line-height: 16px; font-weight: 500; text-align: center; }
.tile:hover { background: var(--muted); }
.tile.current { background: var(--accent-soft); color: var(--accent-text); }

/* ---- Guided tour (section 16) ---- */
.tour-spot { position: fixed; z-index: var(--z-overlay); border-radius: var(--radius-md); box-shadow: 0 0 0 9999px oklch(0 0 0 / 55%); pointer-events: none; }
.tour-card { position: fixed; z-index: var(--z-modal); width: 380px; max-width: calc(100vw - 32px); background: var(--popover); border: 1px solid var(--accent-line); border-radius: var(--radius-xl); box-shadow: 0 12px 32px oklch(0 0 0 / 35%); overflow: hidden; animation: pop 220ms ease-out; }
.tour-rail { height: 3px; background: var(--muted); }
.tour-rail i { display: block; height: 100%; background: var(--accent-fill); transform-origin: left; transform: scaleX(var(--p, 0)); transition: transform 220ms ease-out; }
.tour-body { padding: 16px; display: grid; gap: 8px; }
.tour-head { display: flex; align-items: center; gap: 8px; }
.tour-head h2 { flex: 1; font-size: 16px; line-height: 24px; font-weight: 600; }
.tour-body p { color: var(--muted-foreground); }
.tour-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
.tour-count { font-family: var(--font-mono); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; color: var(--muted-foreground); }
.tour-actions { display: flex; gap: 8px; }

/* ---- Login (section 17) ---- */
.auth { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
.auth-art { background: var(--accent-soft); }
.auth-panel { display: grid; place-items: center; padding: 32px; align-content: center; gap: 16px; }
.auth-lockup { display: flex; align-items: center; gap: 10px; }
.auth-lockup img { width: 30px; height: 30px; }
.auth-lockup small { display: block; font-size: 12px; line-height: 16px; font-weight: 600; color: var(--muted-foreground); }
.auth-lockup strong { font-size: 24px; line-height: 32px; font-weight: 700; }
.auth-card { width: 100%; max-width: 400px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: grid; gap: 16px; }
.auth-foot { width: 100%; max-width: 400px; display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: var(--muted-foreground); }
.auth-card a { color: var(--accent-text); text-align: center; }
@media (max-width: 1024px) { .auth { grid-template-columns: 1fr; } .auth-art { display: none; } }

/* ---- Below 768px the rail becomes a sheet (section 10) ---- */
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); transition: transform 200ms ease-out; }
  body.sidebar-open .sidebar { transform: none; }
  .sidebar-toggle { display: none; }
  .topbar, body.sidebar-collapsed .topbar { left: 0; }
  .content, body.sidebar-collapsed .content { margin-left: 0; padding: calc(var(--topbar-h) + 20px) 16px 20px; }
  .menu-btn { display: grid; }
}

/* Dashboard grids (charts and cards) */
.chart-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 1100px) { .chart-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

__REDUCED_MOTION_CSS__
