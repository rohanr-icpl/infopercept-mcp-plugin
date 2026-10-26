---
description: Show exactly which files the scanner read and which it skipped, and why
argument-hint: [path] [--list] [--json]
---

Show scan coverage with the Invinsense MCP server's `invinsense_coverage` tool.

User input: $ARGUMENTS

Steps:
1. Use the given path, or the current project root if none. Pass it as an absolute path.
2. Call `invinsense_coverage` (pass `list: true` if the user gave `--list`) and show how many files were read by type, what was skipped and why, and the folders not entered.
3. If the user says a file is missing, check it against the result: wrong file type, a test/spec file, or inside a build-output folder at the project root. Say which.

**`--json`**: if the user input contains `--json`, call the tool with `format: "json"` and reply with ONLY the raw JSON in one ```json block.

Read-only.
