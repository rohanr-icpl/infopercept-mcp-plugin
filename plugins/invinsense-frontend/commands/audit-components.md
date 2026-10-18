---
description: Report which UI components come from invin-uix, local code, or third-party libraries
argument-hint: [path] [full]
---

Audit where the UI components in a project come from using the Invinsense MCP server's `audit_ui_components` tool.

User input: $ARGUMENTS

Steps:
1. Parse the input: project path (default: the current project root, as an absolute path) and whether the user said `full`.
2. Call `audit_ui_components` with `detail: "full"` only if asked, otherwise `"summary"`.
3. Present the result as: (a) the share of component usages from invin-uix vs local vs third-party, (b) every third-party UI package with its version, usage count and the invin-uix replacement, (c) local components that duplicate an invin-uix component.
4. Show the compliance score the tool appends at the end of its report.
5. Finish with a short prioritised plan: which third-party package to replace first and why (largest usage, or icon and chart libraries that break guide laws). Offer to do the first replacement.

This is read-only. Do not change any files unless the user asks.
