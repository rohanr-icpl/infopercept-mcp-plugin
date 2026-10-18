---
description: Audit or convert an existing product to the Invinsense Module UI Guide v2.0
argument-hint: <path> [family] [apply]
---

Convert an existing project to the Invinsense guideline using the Invinsense MCP server's `convert_to_invinsense` tool.

User input: $ARGUMENTS

Steps:
1. Parse the input into: project path (default: current directory), product family (ask if missing), and whether the user said `apply`.
2. Always start with a dry run (`dryRun: true`, which is the default). Show the report, starting with the compliance score (and in apply mode the projected score versus the current one), then the auto-fixable changes, remaining violations and structural gaps.
3. Only if the user asked to apply, or confirms after the report, run again with `dryRun: false`. The tool backs up changed files to `.invinsense-backup/<timestamp>/` and refuses a dirty git tree. Do not pass `force` unless the user explicitly says so.
4. Summarise what changed and the score before and after, then list the remaining violations and structural gaps as a short checklist for the team to fix by hand.
