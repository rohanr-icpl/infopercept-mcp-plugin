# Infopercept Tools (Claude Code marketplace)

## Install

```
claude plugin marketplace add rohanr-icpl/infopercept-marketplace        # or a local path to this folder
claude plugin install invinsense-frontend@infopercept-tools
```

Then restart Claude Code (or run `/reload-plugins`). Requires Node 18+.

## What you get

| Command | Purpose |
|---|---|
| `/invinsense-frontend:new-project <name> [family] [nextjs\|static-module]` | Create a new module that follows the Invinsense Module UI Guide v2.0 |
| `/invinsense-frontend:convert <path> [family] [apply]` | Audit (dry run) or convert an existing product to the guideline |
| `/invinsense-frontend:new-page <route> [list\|dashboard\|detail\|form\|blank] [title]` | Add a page to a Next.js module: files, four states, sidebar link |
| `/invinsense-frontend:audit-components [path] [full]` | Count components from invin-uix vs local vs third-party, with replacements |
| `/invinsense-frontend:score [path]` | Compliance score 0 to 100 with grade and the biggest wins |
| `/invinsense-frontend:hotspots [path]` | Files ranked by violations, with the fix for each rule |
| `/invinsense-frontend:routes [path]` | Every route with loading, error, empty-state and nav coverage |
| `/invinsense-frontend:tokens [path]` | Token usage, hardcoded colours, undefined and unused tokens |
| `/invinsense-frontend:report [path] [save]` | Everything in one report, plus a score trend over time |
| `/invinsense-frontend:review <file-or-folder>` | Review UI code against the guide and React/Next.js practices |

Plus the `invinsense-ui` skill (auto-applies the guide) and 15 MCP tools (`invinsense` server).

## Maintainers: update the plugin

```
cd mcp && npm install && npm run build:plugin
```

Bump `version` in `plugins/invinsense-frontend/.claude-plugin/plugin.json`, commit, push. Teammates run `claude plugin marketplace update infopercept-tools`.
