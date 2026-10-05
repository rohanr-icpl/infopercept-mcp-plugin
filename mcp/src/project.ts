import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { families, tokensCss, REDUCED_MOTION_CSS } from "./content/index.js";
import { isDirNonEmpty } from "./fsutil.js";

const here = dirname(fileURLToPath(import.meta.url));
/* Source layout (build/ -> ../templates) and plugin bundle layout (server/index.mjs -> ./templates). */
const templatesRoot = [join(here, "..", "templates"), join(here, "templates")].find((c) => existsSync(c)) ?? join(here, "..", "templates");

export type ProjectType = "nextjs" | "static-module";

export interface ScaffoldOptions {
  name: string;
  productName: string;
  family: string;
  type: ProjectType;
  targetDir: string;
  multiTenant: boolean;
  dryRun: boolean;
  overwrite: boolean;
}

export interface ScaffoldResult {
  projectDir: string;
  files: string[];
  written: boolean;
}

/** Icons used by the static-module template. Paths come from Phosphor Icons (MIT), Bold weight. */
export const STATIC_ICONS = [
  "squares-four", "table", "gear", "lifebuoy", "bell", "sun", "moon", "buildings", "dots-nine", "list-checks",
  "caret-left", "caret-right", "caret-down", "magnifying-glass", "check-circle", "warning", "x", "user",
  "database", "shield-check", "eye", "eye-slash", "arrow-clockwise", "tray", "copy",
];

function phosphorBoldDir(): string {
  const candidates = [
    join(here, "..", "node_modules", "@phosphor-icons", "core", "assets", "bold"),
    join(here, "..", "..", "@phosphor-icons", "core", "assets", "bold"),
  ];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error("Phosphor icon assets not found. Run `npm install` in the mcp folder.");
  return found;
}

export function buildIconsJs(names: string[] = STATIC_ICONS): string {
  const map: Record<string, string> = {};
  const bundled = join(here, "icons.json");
  if (existsSync(bundled)) {
    const all = JSON.parse(readFileSync(bundled, "utf8")) as Record<string, string>;
    for (const n of names) if (all[n]) map[n] = all[n];
  } else {
    const dir = phosphorBoldDir();
    for (const n of names) {
      const file = join(dir, `${n}-bold.svg`);
      if (!existsSync(file)) continue;
      const m = readFileSync(file, "utf8").match(/<path d="([^"]+)"/);
      if (m?.[1]) map[n] = m[1];
    }
  }
  const entries = Object.entries(map).map(([k, v]) => `  "${k}": "${v}"`).join(",\n");
  return `/* Phosphor Icons, Bold weight (MIT). 256x256 viewBox, fill currentColor (Law 11).
   Add more by copying the path from node_modules/@phosphor-icons/core/assets/bold/<name>-bold.svg. */
var ICONS = {
${entries}
};

function icon(name, size, cls) {
  size = size || 16;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : "") + '><path d="' + (ICONS[name] || ICONS["warning"]) + '"/></svg>';
}
`;
}

function listTemplateFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...listTemplateFiles(full, base));
    else if (e.name.endsWith(".tpl")) out.push(full.slice(base.length + 1));
  }
  return out;
}

/** Drops .tpl, maps gitignore to .gitignore and invinsense.json to .invinsense.json */
function outName(tplRel: string): string {
  const parts = tplRel.replace(/\.tpl$/, "").split("/");
  const last = parts[parts.length - 1]!;
  if (last === "gitignore") parts[parts.length - 1] = ".gitignore";
  if (last === "invinsense.json") parts[parts.length - 1] = ".invinsense.json";
  return parts.join("/");
}

export function validateName(name: string): string | null {
  return /^[a-z][a-z0-9-]{1,40}$/.test(name) ? null : "name must be lowercase kebab-case, 2 to 41 characters, starting with a letter";
}

export function buildModuleCss(familyId: string, productName: string): string {
  const tpl = readFileSync(join(templatesRoot, "shared", "module.css.tpl"), "utf8");
  const tokens = tokensCss(familyId, { reducedMotion: false })!;
  return tpl
    .replace("__TOKENS_CSS__", () => tokens)
    .replace("__REDUCED_MOTION_CSS__", () => REDUCED_MOTION_CSS)
    .replace(/__PRODUCT_NAME__/g, productName);
}

export function renderProject(o: ScaffoldOptions): Map<string, string> {
  const fam = families.find((f) => f.id === o.family);
  if (!fam) throw new Error(`Unknown family "${o.family}"`);
  const famJson = JSON.stringify(families.map((f) => ({ id: f.id, name: f.name, products: f.products.split(", ") })), null, 2);
  const subst = (s: string) =>
    s
      .replace(/__PRODUCT_NAME__/g, o.productName)
      .replace(/__ID__/g, o.name)
      .replace(/__FAMILY_ID__/g, fam.id)
      .replace(/__ACCENT__/g, fam.primary)
      .replace(/__FAMILY_NAME__/g, fam.name)
      .replace(/__MULTI_TENANT__/g, String(o.multiTenant))
      .replace(/__FAMILIES_JSON__/g, () => famJson);

  const css = buildModuleCss(o.family, o.productName);
  const dir = join(templatesRoot, o.type);
  const out = new Map<string, string>();
  for (const tplRel of listTemplateFiles(dir)) {
    let content = readFileSync(join(dir, tplRel), "utf8");
    content = content.replace("__MODULE_CSS__", () => css);
    out.set(outName(tplRel), subst(content));
  }
  if (o.type === "static-module") {
    out.set(`css/${o.name}.css`, subst(css));
    out.set("js/icons.js", buildIconsJs());
  }
  return out;
}

export function scaffoldProject(o: ScaffoldOptions): ScaffoldResult {
  const nameErr = validateName(o.name);
  if (nameErr) throw new Error(nameErr);
  if (!isAbsolute(o.targetDir)) throw new Error("targetDir must be an absolute path");
  if (!o.productName.trim() || /[<>"'`\\]/.test(o.productName)) throw new Error("productName is required and must not contain quotes, angle brackets or backslashes");
  const parent = resolve(o.targetDir);
  if (!existsSync(parent) || !statSync(parent).isDirectory()) throw new Error(`targetDir does not exist: ${parent}`);
  const projectDir = join(parent, o.name);
  if (isDirNonEmpty(projectDir) && !o.overwrite) throw new Error(`${projectDir} already exists and is not empty. Pass overwrite=true to write into it, or choose another name.`);

  const files = renderProject(o);
  if (!o.dryRun) {
    for (const [name, content] of files) {
      const target = join(projectDir, name);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content, "utf8");
    }
  }
  return { projectDir, files: [...files.keys()].sort(), written: !o.dryRun };
}
