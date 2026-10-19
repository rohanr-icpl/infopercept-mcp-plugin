---
description: Score a project 0 to 100 against the Invinsense Module UI Guide, with the biggest wins to fix first
argument-hint: [path] [--json]
---

Score a project with the Invinsense MCP server's `score_invinsense_compliance` tool.

User input: $ARGUMENTS

Steps:
1. Use the given path, or the current project root if none. Pass it as an absolute path.
2. Call `score_invinsense_compliance` and show the result: the total out of 100 with the grade, the three category scores (guide violations 50, structural gaps 30, component adoption 20), and the biggest wins.
3. End with the single next action that gains the most points, and offer to do it. Name the command that does it (`convert` for mechanical fixes, `audit-components` for third-party UI, `new-page` or the scaffold for missing structure).

This is read-only. The score is an internal progress measure, not part of the guide, so say so if the user asks what it means. Do not change any files unless asked.

**`--json`**: if the user input contains `--json`, remove that flag from the path, call `score_invinsense_compliance` with `format: "json"`, and reply with ONLY the raw JSON it returns in one ```json block. No summary, no commentary, no next-step offer.
