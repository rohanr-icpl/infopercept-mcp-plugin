// Prints ready-to-paste registration commands with the real absolute path of this install.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "build", "index.js");
if (!fs.existsSync(entry)) {
  console.error("build/index.js is missing. Run: npm install && npm run build");
  process.exit(1);
}
const json = JSON.stringify({ mcpServers: { "react-nextjs-bp": { command: "node", args: [entry] } } }, null, 2);
console.log(`Server entry: ${entry}\n`);
console.log("Claude Code (all projects, recommended):");
console.log(`  claude mcp add --scope user react-nextjs-bp -- node "${entry}"\n`);
console.log("Claude Code (this project only, shared via .mcp.json):");
console.log(`  claude mcp add --scope project react-nextjs-bp -- node "${entry}"\n`);
console.log("Kiro (~/.kiro/settings/mcp.json or .kiro/settings/mcp.json), Cursor (~/.cursor/mcp.json), Claude Desktop:");
console.log(json + "\n");
console.log("Then START A NEW SESSION (MCP servers load when a session starts) and check:");
console.log("  claude mcp list     # react-nextjs-bp should show Connected");
console.log("  /mcp                # inside Claude Code");
