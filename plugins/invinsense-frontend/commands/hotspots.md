---
description: Rank files by Invinsense guide violations so you know what to fix first
argument-hint: [path] [top N] [--json]
---

Show where the violations are with the Invinsense MCP server's `invinsense_hotspots` tool.

User input: $ARGUMENTS

Steps:
1. Use the given path, or the current project root if none. Pass it as an absolute path.
2. Call `invinsense_hotspots` (pass `top` if the user gave a number) and show the worst-files table and the findings-by-rule table.
3. End with the single file to fix first and the command that fixes it: `review` on that file, or `convert` for mechanical rules such as hex colours and font sizes.

Read-only. Do not change any files unless asked.

**`--json`**: if the user input contains `--json`, remove that flag from the path, call `invinsense_hotspots` with `format: "json"`, and reply with ONLY the raw JSON it returns in one ```json block. No summary, no commentary, no next-step offer.
