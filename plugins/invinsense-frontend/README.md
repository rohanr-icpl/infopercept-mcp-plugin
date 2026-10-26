# invinsense-frontend

Build Invinsense modules that follow the **Invinsense Module UI Guide v2.0** and React/Next.js best practices. One plugin gives you commands to create a project, add pages, convert an existing product and audit components, plus a review tool and a skill that applies the guide automatically.

- **Version:** 1.3.0
- **Needs:** Node 18 or later. No `npm install` is required to run the plugin.
- **Works in:** Claude Code and the Claude desktop app (commands, skill and MCP tools). Every other MCP-capable agent can use the MCP tools. See [Use it in other agents](#4-use-it-in-other-agents).

---

## 1. What is inside

| Part | What it does |
|---|---|
| **10 slash commands** | `new-project`, `new-page`, `convert`, `audit-components`, `score`, `hotspots`, `routes`, `tokens`, `report`, `review` |
| **Skill `invinsense-ui`** | Claude applies the guide on its own whenever you build or edit Invinsense UI, no command needed |
| **MCP server `invinsense`** | 20 tools, 46 resources and 14 prompts that do the real work (see [Tool reference](#5-tool-reference)) |

The commands are thin: they tell Claude which MCP tool to call and in what order. The MCP server does the generating, converting and checking, so results are identical in every agent.

---

## 2. Install and update

## One-command install (Claude Code, Claude desktop app, Kiro, Cursor)

```bash
git clone https://github.com/rohanr-icpl/infopercept-mcp-plugin.git
cd infopercept-mcp-plugin
./install.sh                 # every agent found on this machine
./install.sh desktop         # Claude desktop app (GUI) only
./install.sh kiro cursor     # only these
./install.sh --project       # write into the current project instead of your home folder
./install.sh --update        # pull the latest version and reinstall
./install.sh --uninstall     # remove it
./install.sh --dry-run       # preview, writes nothing
```

Needs `git` and `node` 18 or newer. Claude Code gets the full plugin (slash commands plus tools). The Claude desktop app gets the tools through its MCP config (written with an absolute path to node, because GUI apps have a minimal PATH); fully quit and reopen the app. The same commands are available there as prompts (`invinsense-score`, `invinsense-report`, `invinsense-hotspots`, `invinsense-routes`, `invinsense-tokens`, `invinsense-new-page`, `invinsense-review`, `invinsense-audit-components`) in the + menu of a chat, so no extra Plugins-screen steps are needed. Kiro (IDE and CLI share one config file) and Cursor (editor and `cursor-agent` CLI share one config file) get the MCP server (all tools); with `--project` they also get a rule file so the agent follows the guide. Existing MCP config files are merged, never overwritten, and a `.bak` copy is kept. Restart the agent afterwards.

### Claude Code / Claude desktop app

```bash
# once per machine (the repo is private: teammates need access to it and to be signed in to GitHub)
claude plugin marketplace add rohanr-icpl/infopercept-marketplace
claude plugin install invinsense-frontend@infopercept-tools
```

Local folder instead of git: `claude plugin marketplace add /path/to/infopercept-marketplace`.

Then restart the session or run `/reload-plugins`.

**Check it loaded:** run `/plugin` (look for `invinsense-frontend` under Installed) and `/mcp` (the `invinsense` server should show as connected).

**Update to a new version:**

```bash
claude plugin marketplace update infopercept-tools
```

Then reinstall or run `/reload-plugins`, and restart the session.

---

## 3. Commands, with examples

All commands are namespaced: `/invinsense-frontend:<command>`. Run them from inside your project folder (except `new-project`, which creates one).

Product families: `isoc-core`, `isoc-extension`, `uemp`, `grc`, `cps-pulse`, `regimentai`, `assentra`. You can type the display name (for example "ISOC Core") and Claude maps it.

### `/invinsense-frontend:new-project <name> [family] [nextjs|static-module]`

Creates a new module that follows the guide: tokens in OKLCH with dark and light themes, the family accent, Geist fonts, Phosphor icons, the shell (sidebar, topbar, apps menu), login, the four states, a guided tour, and for Next.js the `invin-uix` component setup with a working dashboard.

It does a **dry run first**, shows the file list, and writes only after you confirm.

```
/invinsense-frontend:new-project case-manager "ISOC Core" nextjs
/invinsense-frontend:new-project vendor-risk grc
/invinsense-frontend:new-project ot-monitor cps-pulse static-module
```

What you get (Next.js):

```
case-manager/
  package.json  next.config.ts  postcss.config.mjs  tsconfig.json  .invinsense.json
  public/assets/mark.svg                      placeholder logo, replace with the official one
  src/app/layout.tsx  uix.css  globals.css    tokens + invin-uix wiring
  src/app/login/                              login page
  src/app/(app)/dashboard/                    KPI cards, 4 charts, data table (invin-uix)
  src/app/(app)/items/                        list page with loading, error, empty states
  src/components/shell|ui|tour|dashboard/     sidebar, topbar, status, skeleton, tour
  src/lib/nav.ts  families.ts  theme.ts       navigation and product config
```

Then:

```bash
cd case-manager && npm install && npm run dev
```

The project name must be lowercase kebab-case (for launcher modules it must match the id in the launcher catalog). It refuses to write into a non-empty folder unless you ask it to overwrite.

### `/invinsense-frontend:new-page <route> [list|dashboard|detail|form|blank] [title]`

Adds a page to an existing Invinsense **Next.js** project: `page.tsx`, `loading.tsx`, `error.tsx`, mock data to replace, and a sidebar link in `src/lib/nav.ts`. Uses `invin-uix` components when the project has them. Previews first.

| Kind | You get |
|---|---|
| `list` | Searchable, sortable, paginated table with empty and error states |
| `dashboard` | KPI cards plus area and bar charts |
| `detail` | Record page at `/<route>/[id]` with a not-found state |
| `form` | Validated form with saving, success and error states, plus a server action |
| `blank` | Page shell with a card |

```
/invinsense-frontend:new-page reports list
/invinsense-frontend:new-page analytics dashboard
/invinsense-frontend:new-page settings/users form "User settings"
/invinsense-frontend:new-page cases detail
```

- Routes are lowercase kebab-case, up to 4 segments (`settings/users`). Use `[id]` for a dynamic segment.
- Dynamic routes are not added to the sidebar. Link to them from a list page.
- It never overwrites existing files unless you explicitly ask.
- Preview the four states in the browser with `?state=error` and `?state=empty` on list pages.
- After generating, replace the mock data in `data.ts` (or `actions.ts` for forms) with your data access.

### `/invinsense-frontend:convert <path> [family] [apply]`

Brings an **existing** product (any stack) toward the guide. By default it only **audits**; add `apply` to write changes.

```
/invinsense-frontend:convert ./launcher-just-ui uemp
/invinsense-frontend:convert ./case-manager "ISOC Core" apply
```

Automatic, safe fixes: adds the token stylesheet and wires it in, sets `data-theme`, maps the family accent hex and your colours to tokens, replaces `transition: all` and `ease-in` with ease-out on opacity and transform, raises font sizes to the 12px floor, switches fonts to the Geist variables, and appends the reduced-motion block.

Safety:
- Dry run is the default, even in apply mode, until you confirm.
- Every modified file is backed up to `.invinsense-backup/<timestamp>/`.
- It refuses to write on a git tree with uncommitted changes (commit or stash first).
- It never touches `node_modules` or build output.

Everything that needs judgment (shell, icons, charts, copy, states, tour) comes back as a prioritised checklist with the remaining violations, also saved as `INVINSENSE_MIGRATION.md` when it writes.

### `/invinsense-frontend:audit-components [path] [full]`

Read-only report of where your UI components come from:

```
/invinsense-frontend:audit-components
/invinsense-frontend:audit-components ./case-manager full
```

You get: the share of component usages from `invin-uix` vs your own components vs third-party UI libraries, every third-party UI package with version, usage count, files and the `invin-uix` replacement (MUI, Chakra, Ant, Radix, Recharts, lucide and more), other non-UI packages, local components that duplicate an `invin-uix` component, and with `full` the `invin-uix` components that are available but unused. Ends with a prioritised plan.

Example summary:

| Source | Usages | Share |
|---|---:|---:|
| invin-uix | 6 | 18% |
| Local components | 27 | 82% |
| Third-party UI libraries | 0 | 0% |

### Visibility commands: `hotspots`, `routes`, `tokens`, `report`

All read-only (`report` writes only if you say `save`). Pass a path or run them in the project root.

| Command | What you see | Example |
|---|---|---|
| `/invinsense-frontend:hotspots [path] [top N]` | Files ranked by weighted violations, each file's share of the total, findings by rule with a fix hint, and how many lines carry `invinsense-allow` | `/invinsense-frontend:hotspots ./my-app 5` |
| `/invinsense-frontend:routes [path]` | Every App Router page with loading, error, empty state, invin-uix usage, navigation link and client/server. Parent `loading.tsx` / `error.tsx` count. Login and redirect-only pages are skipped | `/invinsense-frontend:routes` |
| `/invinsense-frontend:tokens [path]` | Most used tokens, files with hardcoded hex, `var(--x)` that resolve to nothing, tokens defined but unused. Tokens provided by invin-uix are recognised | `/invinsense-frontend:tokens` |
| `/invinsense-frontend:report [path] [save]` | Score, trend, hotspots, routes, tokens and the component audit in one document | `/invinsense-frontend:report save` |

`report save` writes `invinsense-report.md` and appends the score to `.invinsense/history.json`. Run it on each release and the **Trend** table shows the last 7 runs. Commit the history file to share the trend, or gitignore both.

#### Demo: the visibility commands on a project with problems

Output below is from a copy of a clean module with a broken `reports` page and bad CSS added.

`/invinsense-frontend:hotspots` shows which file to fix first:

```
| File                             | Errors | Warnings | Weighted | Share |
| src/app/globals.css              | 2      | 3        | 9        | 69%   |
| src/app/(app)/reports/page.tsx   | 1      | 1        | 4        | 31%   |

| Rule             | Severity | Count | How to fix                                         |
| hardcoded-hex    | error    | 2     | Replace with a CSS variable. `convert` fixes most. |
| font-below-12    | error    | 1     | Raise to 12px or more.                             |
| chart-library    | warning  | 1     | Use invin-uix/ui/chart                             |
```

`/invinsense-frontend:routes` shows what each page is missing:

```
| Route       | Loading | Error | Empty | invin-uix | In nav |
| /dashboard  | yes     | yes   | yes   | 4         | yes    |
| /items      | yes     | yes   | yes   | 0         | yes    |
| /reports    | no      | no    | no    | 0         | no     |

To fix
- 1 route(s) have no loading.tsx, so users get no skeleton.
- 1 route(s) have no error.tsx, so failures show the framework default.
- 1 data page(s) show no empty state when the list is empty.
- 1 route(s) are not linked from the navigation.
```

`/invinsense-frontend:tokens` shows token health:

```
2 hardcoded hex value(s) outside the accent definitions
| src/app/(app)/reports/page.tsx | 1 |
| src/app/globals.css            | 1 |
```

`/invinsense-frontend:report save`, run twice with a fix in between, gives the score and a trend:

```
Score: 85/100, grade B (+4 since last run)
| Guide violations   | 36.5/50 |
| Structural gaps    | 30/30   |
| Component adoption | 18.2/20 |
Biggest win: fix `hardcoded-hex` (2x): +8 pts

Trend
| Date              | Score | Grade | Errors | Warnings |
| 2026-10-18        | 81    | B     | 3      | 4        |
| 2026-10-18 (now)  | 85    | B     | 2      | 4        |
```

#### Typical workflow

```
/invinsense-frontend:new-project                  # scaffold, scores 100
/invinsense-frontend:new-page reports list        # add a route (page + loading + error)
/invinsense-frontend:report save                  # baseline, writes invinsense-report.md
# ...build features...
/invinsense-frontend:hotspots                     # what is worst?
/invinsense-frontend:review src/app/globals.css   # fix that file
/invinsense-frontend:routes                       # any page missing a state?
/invinsense-frontend:report save                  # trend goes up
```

For an existing product, run `convert` first (dry run, then apply), then `report save` to get a before and after.

In agents without slash commands (Kiro, Cursor and others), ask in plain words: "Run `invinsense_hotspots` on `/abs/path/app`". The tool names are `invinsense_hotspots`, `invinsense_routes`, `invinsense_tokens` and `invinsense_report`.

### `/invinsense-frontend:score [path]`

Gives the project one **compliance score out of 100** with a letter grade, a per-category breakdown and the five changes that would gain the most points. Read-only.

```
/invinsense-frontend:score
/invinsense-frontend:score ./my-app
```

Example:

| Category | Score | Detail |
|---|---:|---|
| Guide violations | 38.5/50 | 3 error(s), 11 warning(s) in 6 file(s), 6.9 weighted per 1,000 lines |
| Structural gaps | 24/30 | 8 of 10 in place. Missing: tour, states |
| Component adoption | 12.4/20 | 18% invin-uix, 0% third-party UI libraries (0 package(s)) |

How it is calculated (internal measure, not part of the Module UI Guide):

| Category | Points | How |
|---|---:|---|
| Guide violations | 50 | Findings per 1,000 lines, errors count 3 and warnings 1. No findings = 50; 30 weighted per 1,000 lines = 0. Tiny projects are measured as at least 500 lines. |
| Structural gaps | 30 | 10 checklist items at 3 points each: tokens, theme, fonts, icons, shell, nav links, four states, tour, reduced motion, charts. |
| Component adoption | 20 | 10 for avoiding third-party UI libraries (scaled by their share of component usages) and 10 for `invin-uix` usage (full marks at 25% of component usages). |

Grades: **A** 90+, **B** 80+, **C** 70+, **D** 60+, **F** below 60.

The score also appears automatically at the top of `convert` (in apply mode as "projected score after fixes, was N") and at the end of `audit-components`, and `review` reports it when you review a folder.

### `/invinsense-frontend:coverage [path] [--list] [--json]`

Shows exactly what the scanner read and what it skipped, so a missing file is never a mystery. `score` and `hotspots` also print a one-line coverage summary.

What is read: `.css .scss .sass .less .pcss .html .js .jsx .mjs .cjs .ts .tsx .mts .cts .vue .svelte .astro`, with no limit on file count, file size or lines. Symlinked folders are followed.

What is not read, and why:
- `node_modules`, `.git`, `.next`, `.turbo`, caches and editor folders, at any depth.
- Build output (`dist`, `build`, `out`, `coverage`, `vendor`) at the project or workspace-package root only. A folder called `build` or `out` inside `src/` **is** scanned.
- Test and spec files (`*.test.*`, `*.spec.*`), minified files and `.d.ts` files.
- JSON, Markdown, images and any other file type.

If a file you expect is missing, run `coverage --list` and look for it; the report names the rule that excluded it.

### JSON output: `--json`

Add `--json` to `score`, `hotspots`, `routes`, `tokens`, `report` or `audit-components` and the reply is raw JSON only, no prose. In the desktop app, Kiro and Cursor, set the `json` argument of the matching `invinsense-*` prompt to `yes`, or call the tool with `format: "json"`.

```
/invinsense-frontend:score ~/Code/my-module --json
```

```json
{
  "project": "my-module",
  "total": 98,
  "grade": "A",
  "categories": [{ "name": "Guide violations", "score": 50, "max": 50, "detail": "No violations found" }],
  "findings": { "errors": 0, "warnings": 2, "info": 0 }
}
```

**Without an AI agent (CI, scripts).** The same server also runs as a plain command. Nothing is sent anywhere; it only reads files.

```bash
node ~/.infopercept/infopercept-mcp-plugin/plugins/invinsense-frontend/server/index.mjs score . --json
node .../server/index.mjs score . --min-score 85        # exit code 1 if below 85
node .../server/index.mjs hotspots . --top 5 --json | jq '.worstFiles[0].file'
node .../server/index.mjs report . --save               # writes report, records trend
```

Commands: `score`, `hotspots`, `routes`, `tokens`, `report`, `audit`. Options: `--json`, `--min-score N`, `--top N`, `--save`, `--max-files N`. Exit codes: 0 ok, 1 score below `--min-score`, 2 error (with `--json` the error is `{"error": "..."}`).

Not covered yet: `review`, `convert` and `new-page` (they edit files, so they keep their markdown summaries).

### `/invinsense-frontend:review <file-or-folder>`

Reviews code against the guide (colours, fonts, motion, states, accessibility and about 30 more rules) and, for React or Next.js files, against the general best practices. Findings are grouped as 🔴 must fix, 🟡 should fix, 🔵 note, each with the law it breaks and a concrete fix. With no argument it reviews the files in your current git diff.

```
/invinsense-frontend:review src/app/(app)/reports
/invinsense-frontend:review
```

To silence a deliberate exception, add the marker `invinsense-allow` on that line with a reason in a comment.

### Typical workflows

**Start a new module**

```
/invinsense-frontend:new-project case-manager "ISOC Core" nextjs
cd case-manager && npm install && npm run dev
/invinsense-frontend:new-page cases list
/invinsense-frontend:new-page cases/new form
/invinsense-frontend:review
```

**Bring an existing product onto the guide**

```
/invinsense-frontend:convert ./my-product uemp          # audit report
git add -A && git commit -m "before invinsense conversion"
/invinsense-frontend:convert ./my-product uemp apply    # apply safe fixes
/invinsense-frontend:audit-components ./my-product      # find third-party UI to replace
```

**Track progress:** run `/invinsense-frontend:score` before and after a change. A fresh scaffold scores 100.

**Before every merge:** `/invinsense-frontend:review`, then `npm run build`.

---

## 4. Use it in other agents

Slash commands and the skill are Claude features. The MCP server is standard, so any MCP-capable agent can call the same tools. You only need the bundled server file:

```
<path-to>/infopercept-marketplace/plugins/invinsense-frontend/server/index.mjs
```

Clone the marketplace repo once and use the absolute path to that file below. It runs with plain `node` (18 or later) and needs no install step.

### Register the server

> Config formats follow each vendor's documentation at the time of writing. If a client changes its format, check its MCP docs; the command and arguments stay the same.

**Claude Code without the plugin** (tools only, no slash commands):
```bash
claude mcp add invinsense -- node /abs/path/to/server/index.mjs
```

**Kiro**: `.kiro/settings/mcp.json` in the project, or `~/.kiro/settings/mcp.json` for all projects
```json
{
  "mcpServers": {
    "invinsense": { "command": "node", "args": ["/abs/path/to/server/index.mjs"] }
  }
}
```

**Cursor**: `.cursor/mcp.json` in the project, or `~/.cursor/mcp.json`
```json
{
  "mcpServers": {
    "invinsense": { "command": "node", "args": ["/abs/path/to/server/index.mjs"] }
  }
}
```

**VS Code (GitHub Copilot agent mode)**: `.vscode/mcp.json` (note the `servers` key)
```json
{
  "servers": {
    "invinsense": { "type": "stdio", "command": "node", "args": ["/abs/path/to/server/index.mjs"] }
  }
}
```

**Windsurf**: `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "invinsense": { "command": "node", "args": ["/abs/path/to/server/index.mjs"] }
  }
}
```

**Claude Desktop (chat)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "invinsense": { "command": "node", "args": ["/abs/path/to/server/index.mjs"] }
  }
}
```

**Codex CLI**: `~/.codex/config.toml`
```toml
[mcp_servers.invinsense]
command = "node"
args = ["/abs/path/to/server/index.mjs"]
```

**Gemini CLI**: `~/.gemini/settings.json`
```json
{
  "mcpServers": {
    "invinsense": { "command": "node", "args": ["/abs/path/to/server/index.mjs"] }
  }
}
```

Restart the agent after saving, then ask it to list its MCP tools. You should see 20 tools starting with `list_best_practices`.

### Commands in other agents: just ask

Without slash commands, say what you want and name the tool. The agent calls the same MCP tool, so the result is identical.

| Claude command | Say this in any other agent |
|---|---|
| `new-project case-manager "ISOC Core" nextjs` | "Use `scaffold_invinsense_project` to create `case-manager` for ISOC Core as a Next.js app in `/abs/path/projects`. Dry run first." |
| `new-page reports list` | "Use `add_invinsense_page` to add a `reports` list page to `/abs/path/project`. Dry run first." |
| `convert ./app uemp` | "Use `convert_to_invinsense` to audit `/abs/path/app` for the UEMP family. Do not apply yet." |
| `convert ./app uemp apply` | "Apply the safe fixes with `convert_to_invinsense` (dry run first, then write)." |
| `audit-components ./app full` | "Run `audit_ui_components` on `/abs/path/app` with detail full." |
| `score ./app` | "Run `score_invinsense_compliance` on `/abs/path/app` and tell me the biggest wins." |
| `review src/` | "Run `review_invinsense_ui` on these files and fix every red finding." |

Tips for other agents:
- Pass **absolute paths**. Agents often run tools from a different working directory.
- Tell the agent to show the dry run before writing, as the Claude commands do.
- Some clients also list the server's **prompts** (`new-invinsense-project`, `convert-to-invinsense`, `build-invinsense-module`, `plan-feature`, `review-component`) as commands. Where that exists, they are the closest equivalent to the slash commands.
- To make an agent apply the guide automatically (what the Claude skill does), add one line to that agent's rules file (`AGENTS.md`, `.cursorrules`, `.kiro/steering/*.md`, `.github/copilot-instructions.md`, and so on):

  > For Invinsense module UI, call `get_invinsense_tokens` before writing UI, use `scaffold_invinsense_project` / `add_invinsense_page` instead of hand-writing scaffolds, and run `review_invinsense_ui` after editing UI files.

---

## 5. Tool reference

| Tool | Purpose | Writes files? |
|---|---|---|
| `scaffold_invinsense_project` | Create a new Next.js or static module | Yes (dry run available) |
| `add_invinsense_page` | Add a list, dashboard, detail, form or blank page and a nav link | Yes (dry run default) |
| `convert_to_invinsense` | Audit or convert an existing product | Only in apply mode (dry run default, backups, git-safe) |
| `score_invinsense_compliance` | Compliance score 0 to 100 with grade and biggest wins | No |
| `invinsense_hotspots` | Worst files and findings by rule | No |
| `invinsense_routes` | Route inventory with state coverage | No |
| `invinsense_tokens` | Token usage and health | No |
| `invinsense_report` | Full report with trend | Only with `save` |
| `audit_ui_components` | invin-uix vs local vs third-party report (plus the score) | No |
| `review_invinsense_ui` | Check code against the Module UI Guide | No |
| `get_invinsense_tokens` | Token CSS for a product family | No |
| `invinsense_new_module_checklist` | The 14-step new module checklist | No |
| `review_code` | React and Next.js best-practice review | No |
| `scaffold_component` | Component and test templates | No |
| `suggest_project_structure` | Folder structure for a feature | No |
| `pre_merge_checklist` | Checklist before merging | No |
| `list_best_practices` / `get_best_practice` / `search_best_practices` | Browse and search the practice library (React, Next.js, accessibility, security, performance, testing, Invinsense) | No |

Resources: `bestpractice://all`, `bestpractice://{id}`, `bestpractice://invinsense/guide`.

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| Commands do not appear | Restart the session or run `/reload-plugins`. Confirm the plugin under `/plugin`. |
| `invinsense` server not connected | Run `node --version` (needs 18+). Check `/mcp`. Reinstall the plugin. |
| "Not a Next.js project" from `new-page` | Run it from the project root (the folder with `package.json` that has `next`). Static modules are not supported by `new-page`. |
| "targetDir does not exist" | The parent folder for `new-project` must already exist; the project folder is created inside it. |
| `convert` refuses to write | Your git tree has uncommitted changes. Commit or stash, then retry. |
| Fonts or spacing look wrong in a Next.js module | Keep `import "./uix.css"` before `import "./globals.css"` in `layout.tsx`, and keep the resets in `globals.css` inside `@layer base`. |
| Logo shows a placeholder | Replace `public/assets/mark.svg` with the official mark from the shared Invinsense package. |
| Another agent cannot find the server | Use an absolute path to `server/index.mjs` and restart the agent. |

---

## 7. For maintainers

The server in `server/` is a self-contained bundle built from the `mcp/` source folder in this repository:

```bash
cd mcp && npm install && npm run build:plugin
```

Then bump `version` in `.claude-plugin/plugin.json`, commit and push. Teammates run `claude plugin marketplace update infopercept-tools`.

Test before you publish: `cd mcp && npm test` (source) and `SERVER_ENTRY=/abs/path/to/server/index.mjs node scripts/smoke-test.mjs` (the bundle).
