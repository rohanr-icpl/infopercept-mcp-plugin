import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";

// Skipped at any depth: package caches and tool output that are never your source.
export const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", ".turbo", ".cache", ".vercel", ".netlify", ".svelte-kit", ".nuxt", ".invinsense-backup",
  ".idea", ".vscode", "__pycache__", ".parcel-cache", ".yarn", ".pnpm-store",
]);
// Skipped only at the project root (or a workspace package root), so src/components/build/ or app/out/ are still scanned.
export const ROOT_ONLY_IGNORE = new Set(["dist", "build", "out", "coverage", "vendor", "storybook-static"]);

export const SOURCE_EXT = new Set([".css", ".scss", ".sass", ".less", ".pcss", ".html", ".htm", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts", ".vue", ".svelte", ".astro"]);
export const STYLE_EXT = new Set([".css", ".scss", ".sass", ".less", ".pcss"]);

export interface WalkOptions {
  maxFiles: number;
  maxBytes: number;
}

export interface Coverage {
  scanned: number;
  byExtension: Record<string, number>;
  skippedTests: number;
  skippedMinified: number;
  skippedDeclarations: number;
  skippedOversized: number;
  ignoredFolders: string[]; // folder paths (relative) that were not entered, with the reason
  symlinksFollowed: number;
}

export function walkSources(root: string, opts: WalkOptions): { files: string[]; skipped: number; truncated: boolean; coverage: Coverage } {
  const files: string[] = [];
  let skipped = 0;
  let truncated = false;
  const seen = new Set<string>();
  const cov: Coverage = { scanned: 0, byExtension: {}, skippedTests: 0, skippedMinified: 0, skippedDeclarations: 0, skippedOversized: 0, ignoredFolders: [], symlinksFollowed: 0 };
  const real = (p: string) => {
    try {
      return realpathSync(p);
    } catch {
      return p;
    }
  };
  // A folder is a package root when it holds a package.json (the project itself or a monorepo workspace).
  const visit = (dir: string, isPackageRoot: boolean) => {
    const rp = real(dir);
    if (seen.has(rp)) return; // symlink loop or the same folder reached twice
    seen.add(rp);
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (truncated) return;
      const full = join(dir, e.name);
      let isDir = e.isDirectory();
      let isFile = e.isFile();
      if (e.isSymbolicLink()) {
        try {
          const st = statSync(full);
          isDir = st.isDirectory();
          isFile = st.isFile();
          if (isDir) cov.symlinksFollowed++;
        } catch {
          continue;
        }
      }
      if (isDir) {
        if (IGNORE_DIRS.has(e.name)) {
          cov.ignoredFolders.push(`${rel(root, full)} (tool or cache folder)`);
        } else if (isPackageRoot && ROOT_ONLY_IGNORE.has(e.name)) {
          cov.ignoredFolders.push(`${rel(root, full)} (build output)`);
        } else visit(full, existsSync(join(full, "package.json")));
        continue;
      }
      if (!isFile) continue;
      const dot = e.name.lastIndexOf(".");
      const ext = dot < 0 ? "" : e.name.slice(dot).toLowerCase();
      if (!SOURCE_EXT.has(ext)) continue;
      if (/\.min\./.test(e.name)) { cov.skippedMinified++; continue; }
      if (/\.d\.ts$/.test(e.name)) { cov.skippedDeclarations++; continue; }
      if (/\.(test|spec)\./.test(e.name)) { cov.skippedTests++; continue; }
      let size = 0;
      try {
        size = statSync(full).size;
      } catch {
        continue;
      }
      if (Number.isFinite(opts.maxBytes) && size > opts.maxBytes && opts.maxBytes > 0) {
        skipped++;
        cov.skippedOversized++;
        continue;
      }
      if (files.length >= opts.maxFiles) {
        truncated = true;
        return;
      }
      files.push(full);
      cov.byExtension[ext] = (cov.byExtension[ext] ?? 0) + 1;
    }
  };
  visit(root, true);
  cov.scanned = files.length;
  return { files, skipped, truncated, coverage: cov };
}

export function coverageLine(c: Coverage): string {
  const parts = [`${c.scanned} files scanned`];
  if (c.skippedTests) parts.push(`${c.skippedTests} test/spec file(s) skipped`);
  if (c.skippedMinified + c.skippedDeclarations) parts.push(`${c.skippedMinified + c.skippedDeclarations} minified/.d.ts skipped`);
  if (c.skippedOversized) parts.push(`${c.skippedOversized} oversized skipped`);
  if (c.ignoredFolders.length) parts.push(`${c.ignoredFolders.length} folder(s) not entered`);
  return parts.join(", ");
}

export const rel = (root: string, file: string) => relative(root, file).split(sep).join("/");

export function gitState(dir: string): { isRepo: boolean; dirty: boolean } {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir, stdio: "pipe" });
  } catch {
    return { isRepo: false, dirty: false };
  }
  try {
    const out = execFileSync("git", ["status", "--porcelain"], { cwd: dir, stdio: "pipe" }).toString().trim();
    return { isRepo: true, dirty: out.length > 0 };
  } catch {
    return { isRepo: true, dirty: false };
  }
}

export const isDirNonEmpty = (dir: string) => existsSync(dir) && readdirSync(dir).length > 0;
