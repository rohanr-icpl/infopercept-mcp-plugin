// Bundles the MCP server into a self-contained plugin directory (no node_modules needed at runtime).
// Usage: npm run build:plugin  [-- <pluginDir>]
import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Inside the marketplace repo the source lives at <repo>/mcp, so the plugin is <repo>/plugins/invinsense-frontend.
const inRepo = join(root, "..", "plugins", "invinsense-frontend");
const sibling = join(root, "..", "infopercept-marketplace", "plugins", "invinsense-frontend");
const pluginDir = resolve(process.argv[2] ?? (existsSync(inRepo) ? inRepo : sibling));
const out = join(pluginDir, "server");

try { rmSync(out, { recursive: true, force: true }); } catch { /* read-only delete policy: files are overwritten below */ }
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(root, "src", "index.ts")],
  outfile: join(out, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  minify: false,
  legalComments: "none",
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});

function copyTree(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const a = join(src, e.name), b = join(dst, e.name);
    if (e.isDirectory()) copyTree(a, b);
    else writeFileSync(b, readFileSync(a));
  }
}
copyTree(join(root, "templates"), join(out, "templates"));

// Phosphor Bold icon paths used by the static-module template.
const iconDir = join(root, "node_modules", "@phosphor-icons", "core", "assets", "bold");
if (!existsSync(iconDir)) throw new Error("Run npm install first (phosphor assets missing).");
const icons = {};
for (const f of readdirSync(iconDir)) {
  if (!f.endsWith("-bold.svg")) continue;
  const m = readFileSync(join(iconDir, f), "utf8").match(/<path d="([^"]+)"/);
  if (m) icons[f.replace(/-bold\.svg$/, "")] = m[1];
}
writeFileSync(join(out, "icons.json"), JSON.stringify(icons));
console.log(`Plugin server built -> ${out} (${Object.keys(icons).length} icons)`);
