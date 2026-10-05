---
description: Review UI code against the Invinsense Module UI Guide v2.0 (and React/Next.js best practices)
argument-hint: <file-or-folder>
---

Review the code at: $ARGUMENTS (default: files changed in the current git diff).

For each file, read it and call the Invinsense MCP server's `review_invinsense_ui` tool. For React/Next.js files also call `review_code`. Group findings by severity (🔴 must fix, 🟡 should fix, 🔵 note), cite the guide law for each, and propose the concrete fix. If there are no findings, say so in one line.
