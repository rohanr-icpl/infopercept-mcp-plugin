---
description: Show design token usage: most used, hardcoded colours, undefined and unused tokens
argument-hint: [path] [--json]
---

Check design token health with the `invinsense_tokens` tool.

User input: $ARGUMENTS

Steps:
1. Use the given path, or the current project root if none. Pass it as an absolute path.
2. Call `invinsense_tokens` and show the result.
3. If there are hardcoded colours, offer `convert`. If tokens are used but undefined, say where and propose the definition. Never invent new token namespaces; only `--accent` differs per family.

Read-only. Do not change any files unless asked.

**`--json`**: if the user input contains `--json`, remove that flag from the path, call `invinsense_tokens` with `format: "json"`, and reply with ONLY the raw JSON it returns in one ```json block. No summary, no commentary, no next-step offer.
