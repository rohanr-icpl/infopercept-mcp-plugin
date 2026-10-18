# React, Next.js & Invinsense UI Best Practices MCP Server

An MCP (Model Context Protocol) server that gives AI assistants a curated, searchable handbook of
**React 19 / Next.js App Router** best practices, plus tools to review code and scaffold components against them.

## What it exposes

| Type | Name | Purpose |
|------|------|---------|
| Tool | `list_best_practices` | List topics (filter by category) |
| Tool | `get_best_practice` | Full do / don't / code guidance for a topic id |
| Tool | `search_best_practices` | Keyword search across all guidance |
| Tool | `review_code` | Heuristic review of a snippet (keys, effects, a11y, RSC boundary, Server Actions, security…) |
| Tool | `scaffold_component` | Accessible typed component + Testing Library test (server or client) |
| Tool | `suggest_project_structure` | Feature folder layout for React / Next.js |
| Tool | `pre_merge_checklist` | Copy-paste PR checklist |
| Tool | `review_invinsense_ui` | Check CSS / HTML / JS / TSX against the Invinsense Module UI Guide v2.0 (hex, tokens, fonts, motion, icons, charts, copy…) |
| Tool | `get_invinsense_tokens` | Paste-ready dark + light OKLCH token CSS for a product family, plus status tones |
| Tool | `invinsense_new_module_checklist` | 14-step checklist for a new module |
| **Command** | `scaffold_invinsense_project` | Create a new project that follows the guide (`nextjs` or launcher `static-module`) |
| **Command** | `add_invinsense_page` | Add a list, dashboard, detail, form or blank page to a Next.js module, with loading and error states and a sidebar link (preview first) |
| **Command** | `score_invinsense_compliance` | Compliance score 0 to 100 with grade and the biggest wins (read-only; also shown by `convert_to_invinsense` and `audit_ui_components`) |
| **Command** | `invinsense_hotspots` | Files ranked by violations, findings by rule with fix hints (read-only) |
| **Command** | `invinsense_routes` | App Router routes with loading, error, empty-state and nav coverage (read-only) |
| **Command** | `invinsense_tokens` | Token usage, hardcoded hex, undefined and unused tokens (read-only) |
| **Command** | `invinsense_report` | Score, trend, hotspots, routes, tokens and component audit in one report; `save` writes `invinsense-report.md` and `.invinsense/history.json` |
| **Command** | `audit_ui_components` | Report which components come from invin-uix, local code and third-party libraries, with replacements (read-only) |
| **Command** | `convert_to_invinsense` | Audit an existing product and apply the safe fixes (preview first, backups, git-safe) |
| Resource | `bestpractice://{id}`, `bestpractice://all`, `bestpractice://invinsense/guide` | Markdown guides / full handbook / Invinsense guide |
| Prompt | `review-component`, `plan-feature`, `build-invinsense-module`, `convert-to-invinsense`, `new-invinsense-project` | Ready-made workflows (slash commands in Claude Code) |

Categories: `invinsense`, `react`, `nextjs`, `typescript`, `performance`, `accessibility`, `security`, `testing`.

## Setup

```bash
cd mcp
npm install
npm run build
npm test          # builds + runs an end-to-end client smoke test
npm run inspect   # open the MCP Inspector UI
```

## Connect to a client

**Claude Code**
```bash
claude mcp add react-nextjs-bp -- node /Users/rohanrajani/Code/Infopercept/mcp/build/index.js
```

**Claude Desktop / Cursor / VS Code** (`mcpServers` config)
```json
{
  "mcpServers": {
    "react-nextjs-bp": {
      "command": "node",
      "args": ["/Users/rohanrajani/Code/Infopercept/mcp/build/index.js"]
    }
  }
}
```

## Project layout

```
src/
  index.ts          # server wiring: tools, resources, prompts (stdio transport)
  reviewer.ts       # React / Next.js review rules (add rules here)
  invinsense-reviewer.ts  # Invinsense UI guide rules
  scaffold.ts       # component / test / structure templates
  content/
    react.ts        # React + TS + a11y + testing + perf guidance
    nextjs.ts       # Next.js App Router guidance
    invinsense.ts   # Invinsense Module UI Guide v2.0: families, tokens, checklist, 21 guides
    types.ts        # Practice schema
scripts/smoke-test.mjs
```

## Extending

- **Add guidance:** append a `Practice` object in `src/content/react.ts` or `nextjs.ts` (unique `id`).
- **Add a review rule:** add an entry to `rules` in `src/reviewer.ts` and reference a `practiceId`.
- Logging goes to **stderr** only — stdout is reserved for the MCP protocol.

> `review_code` is a fast heuristic check, not a replacement for ESLint, `tsc`, and tests.
> Verify version-specific behaviour (e.g. Next.js caching defaults) against the official docs for your version.

## Invinsense Module UI Guide

Encoded from https://launcher-invinsense.netlify.app/module-ui-guide (v2.0, aligned to Invinsense Interface Standard v1).
It covers the shell, branding, family accents, tokens, typography, spacing, themes, icons, navigation, components,
status and toasts, charts, four states, guided tour, login, motion and accessibility, copy, module structure and anti-slop rules.

If the guide changes, edit `src/content/invinsense.ts` (content, tokens, checklist) and `src/invinsense-reviewer.ts` (rules), then `npm test`.
The guide states that code wins if they disagree (reference: datalake-ui), and `npm run slop` in the launcher repo stays the source of truth for conformance.

## Commands

### Create a new project: `scaffold_invinsense_project`

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `name` | required | kebab-case id and folder name (matches the launcher `catalog.js` id) |
| `productName` | required | Display name in the lockup and page titles |
| `family` | required | `isoc-core`, `isoc-extension`, `uemp`, `grc`, `cps-pulse`, `regimentai`, `assentra` |
| `targetDir` | required | Absolute parent folder; the project is created at `<targetDir>/<name>` |
| `type` | `nextjs` | `nextjs` (App Router) or `static-module` (guide section 20 layout) |
| `multiTenant` | `false` | Adds the tenant switcher to the topbar |
| `dryRun` | `false` | List files without writing |
| `overwrite` | `false` | Required to write into a non-empty folder |

Both templates ship the shell (262px sidebar / 76px rail, 58px topbar, fixed control order), OKLCH tokens for dark and light
restored before first paint, Geist, Phosphor Bold, the apps navigator, guided tour, four states, toasts and a login screen.
The Next.js template was verified with `tsc` and `next build`; the static module was exercised in Chromium.

In Claude Code: `/mcp__react-nextjs-bp__new-invinsense-project`.

### Add a page: `add_invinsense_page`

| Parameter | Default | Purpose |
|---|---|---|
| `projectDir` | required | Absolute path of the project root |
| `route` | required | `reports`, `settings/users`, `cases/[id]` (kebab-case, up to 4 segments) |
| `kind` | `list` | `list`, `dashboard`, `detail`, `form`, `blank` |
| `title`, `navLabel`, `navGroup`, `icon` | derived | Page title, sidebar label, group (created if missing) and icon |
| `addToNav` | `true` | Add the link to `src/lib/nav.ts` (skipped for dynamic routes) |
| `dryRun` | `true` | Preview files and the nav change |
| `overwrite` | `false` | Refuses to replace existing files |

### Audit components: `audit_ui_components`

Read-only. Reports JSX usage counts from invin-uix, local components and third-party UI libraries, each third-party package with version, files and the invin-uix replacement, other non-UI packages, local components that duplicate an invin-uix component, and (with `detail: "full"`) invin-uix components that are available but unused.

### Convert an existing product: `convert_to_invinsense`

Run it in three steps. Nothing is written until `dryRun=false`.

1. `mode="audit"` reports the stack, every violation grouped by rule with file:line, and the structural gaps.
2. `mode="apply"` (dry run by default) previews the automatic fixes.
3. `mode="apply", dryRun=false` writes them. It refuses on a dirty git tree unless `force=true`, copies each modified file to `.invinsense-backup/<timestamp>/`, and saves `INVINSENSE_MIGRATION.md`.

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `path` | required | Absolute path of the project |
| `family` | required | Family accent and tokens to adopt |
| `mode` | `audit` | `audit` or `apply` |
| `dryRun` | `true` | In apply mode, preview only |
| `fixes` | all | Subset of `tokens`, `theme-attribute`, `accent-hex`, `color-map`, `transition-all`, `easing`, `font-size-floor`, `font-family`, `reduced-motion` |
| `colorMap` | `{}` | Your colours to tokens, e.g. `{"#1a73e8": "var(--accent)", "#ffffff": "var(--card)"}` |
| `writeReport` | `true` | Save `INVINSENSE_MIGRATION.md` when writing |
| `force` | `false` | Allow writing on a dirty git tree |
| `maxFiles` | `1500` | Scan limit |

Automatic fixes are mechanical only. Shell, navigation, icons, charts, copy, four states and the tour need design work,
so they come back as a prioritised list for the assistant to finish with `get_best_practice`.
In Claude Code: `/mcp__react-nextjs-bp__convert-to-invinsense`.
