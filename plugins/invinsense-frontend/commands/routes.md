---
description: List every route with its loading, error, empty-state and navigation coverage
argument-hint: [path] [--json]
---

Inventory the pages of a Next.js App Router project with the `invinsense_routes` tool.

User input: $ARGUMENTS

Steps:
1. Use the given path, or the current project root if none. Pass it as an absolute path.
2. Call `invinsense_routes` and show the route table and the "To fix" list.
3. For each gap, name the file to add (loading.tsx, error.tsx, an EmptyState) and offer to do it. Use `new-page` for brand-new routes.

Read-only. Do not change any files unless asked.

**`--json`**: if the user input contains `--json`, remove that flag from the path, call `invinsense_routes` with `format: "json"`, and reply with ONLY the raw JSON it returns in one ```json block. No summary, no commentary, no next-step offer.
