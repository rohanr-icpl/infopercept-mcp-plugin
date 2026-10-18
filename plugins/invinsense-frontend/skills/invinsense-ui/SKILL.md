---
name: invinsense-ui
description: Use when building, editing or reviewing frontend UI for an Invinsense product module (ISOC, UEMP, GRC, CPS Pulse, RegimentAI, Assentra) or any React/Next.js code at Infopercept. Applies the Invinsense Module UI Guide v2.0 via the Invinsense MCP tools.
---

# Invinsense UI

When working on Invinsense module UI or React/Next.js code:

1. Before writing UI, call `get_invinsense_tokens` for the product family and use those tokens. Never hardcode colours, fonts or accent hex values.
2. For a new module, use `scaffold_invinsense_project`; for an existing product, use `convert_to_invinsense` (dry run first). Do not rebuild the scaffold by hand.
3. After writing or editing UI code, run `review_invinsense_ui` and fix every 🔴 finding. Use `review_code` for general React/Next.js rules.
4. Follow `invinsense_new_module_checklist` when adding a module, and `pre_merge_checklist` before merge.
5. To add a page or route to a Next.js module, use `add_invinsense_page` (dry run first); never hand-write the page, loading and error files.
6. To see which components come from invin-uix versus third-party libraries, use `audit_ui_components`, and prefer invin-uix components for charts, tables, KPI cards and badges.
7. To measure a project, use `score_invinsense_compliance` (0 to 100 with grade and biggest wins) and report it before and after significant changes.
8. For visibility use `invinsense_hotspots` (worst files), `invinsense_routes` (loading, error, empty and nav coverage per route), `invinsense_tokens` (token health) and `invinsense_report` (everything plus a score trend; save=true only when asked).
8. Use `search_best_practices` / `get_best_practice` to look up a rule instead of guessing.

Key rules: OKLCH tokens with `html[data-theme]` dark/light, Geist fonts, Phosphor Bold icons, 12px minimum text, animate only transform/opacity with ease-out, handle all four states (loading, empty, error, data), and end CSS with a reduced-motion block.
