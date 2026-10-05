---
description: Add a new page / route to an Invinsense Next.js project (list, dashboard, detail, form or blank)
argument-hint: <route> [list|dashboard|detail|form|blank] [title]
---

Add a page to the current Invinsense Next.js project using the Invinsense MCP server's `add_invinsense_page` tool.

User input: $ARGUMENTS

Steps:
1. Parse the input into: route (kebab-case, e.g. `reports` or `settings/users`), kind and optional title. Kinds: `list` (searchable table), `dashboard` (KPI cards and charts), `detail` (dynamic `[id]` record page), `form` (validated form with saving, success and error states), `blank`. If the route is missing, ask for it. If the kind is missing, infer it from the route name and say which you chose; ask only if it is genuinely unclear.
2. Use the current project root as `projectDir` (the folder with package.json; resolve it to an absolute path).
3. Call `add_invinsense_page` with `dryRun: true` (the default) and show the files and the sidebar link it will add.
4. After the user confirms, call it again with `dryRun: false`. Never pass `overwrite: true` unless the user explicitly asks.
5. Report what was created, then run `review_invinsense_ui` on the new files and fix any 🔴 findings.
6. Tell the user the one thing to do next: replace the mock data in `data.ts` (or `actions.ts` for forms) with their real data access.

Do not hand-write pages; always use the MCP tool so the page matches the guideline.
