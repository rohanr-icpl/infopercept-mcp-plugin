---
description: One full Invinsense report with score, trend, hotspots, routes, tokens and component audit
argument-hint: [path] [save]
---

Build the full project report with the Invinsense MCP server's `invinsense_report` tool.

User input: $ARGUMENTS

Steps:
1. Use the given path, or the current project root if none. Pass it as an absolute path.
2. Pass `save: true` only if the user said "save" (or asked to track progress). Otherwise leave it false.
3. Show the report. Lead with the score and trend, then summarise the three biggest problems in plain words.
4. If saved, tell the user the two files written (`invinsense-report.md`, `.invinsense/history.json`) and that the history file is what draws the trend.

Without `save` this is read-only. With `save` it writes only those two files.
