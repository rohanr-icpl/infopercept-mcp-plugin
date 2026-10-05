---
description: Create a new Invinsense module project that follows the Module UI Guide v2.0
argument-hint: <project-name> [family] [nextjs|static-module]
---

Create a new Invinsense module project using the Invinsense MCP server's `scaffold_invinsense_project` tool.

User input: $ARGUMENTS

Steps:
1. Parse the input into: project name (kebab-case), product family (one of: ISOC Core, ISOC Extension, UEMP, GRC, CPS Pulse, RegimentAI, Assentra) and type (`nextjs` or `static-module`). If the project name is missing, ask for it. If family or type is missing, ask once with both choices together; default to `nextjs`.
2. Call `scaffold_invinsense_project` with `dryRun: true` and show the file list in a compact form.
3. After the user confirms, call it again with `dryRun: false` in the current working directory.
4. Report the generated folder, the commands to install and run it, and call `invinsense_new_module_checklist` to list the remaining manual steps.
5. Run `review_invinsense_ui` on any file the user then edits.

Do not hand-write the scaffold; always use the MCP tool so the output matches the guideline.
