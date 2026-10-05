# invinsense-frontend

Build Invinsense modules that follow the **Invinsense Module UI Guide v2.0** and React/Next.js best practices. One plugin gives you commands to create a project, add pages, convert an existing product and audit components, plus a review tool and a skill that applies the guide automatically.

- **Version:** 1.1.0
- **Needs:** Node 18 or later. No `npm install` is required to run the plugin.
- **Works in:** Claude Code and the Claude desktop app (commands, skill and MCP tools). Every other MCP-capable agent can use the MCP tools. See [Use it in other agents](#4-use-it-in-other-agents).

---

## 1. What is inside

| Part | What it does |
|---|---|
| **5 slash commands** | `new-project`, `new-page`, `convert`, `audit-components`, `review` |
| **Skill `invinsense-ui`** | Claude applies the guide on its own whenever you build or edit Invinsense UI, no command needed |
| **MCP server `invinsense`** | 14 tools, 46 resources and 5 prompts that do the real work (see [Tool reference](#5-tool-reference)) |

The commands are thin: they tell Claude which MCP tool to call and in what order. The MCP server does the generating, converting and checking, so results are identical in every agent.

---

## 2. Install and update

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

Restart the agent after saving, then ask it to list its MCP tools. You should see 14 tools starting with `list_best_practices`.

### Commands in other agents: just ask

Without slash commands, say what you want and name the tool. The agent calls the same MCP tool, so the result is identical.

| Claude command | Say this in any other agent |
|---|---|
| `new-project case-manager "ISOC Core" nextjs` | "Use `scaffold_invinsense_project` to create `case-manager` for ISOC Core as a Next.js app in `/abs/path/projects`. Dry run first." |
| `new-page reports list` | "Use `add_invinsense_page` to add a `reports` list page to `/abs/path/project`. Dry run first." |
| `convert ./app uemp` | "Use `convert_to_invinsense` to audit `/abs/path/app` for the UEMP family. Do not apply yet." |
| `convert ./app uemp apply` | "Apply the safe fixes with `convert_to_invinsense` (dry run first, then write)." |
| `audit-components ./app full` | "Run `audit_ui_components` on `/abs/path/app` with detail full." |
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
| `audit_ui_components` | invin-uix vs local vs third-party report | No |
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
