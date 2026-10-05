import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";

export const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".turbo", ".cache", ".vercel", ".netlify",
  ".invinsense-backup", ".svelte-kit", ".nuxt", "vendor", "__pycache__",
]);

export const SOURCE_EXT = new Set([".css", ".scss", ".less", ".html", ".htm", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"]);
export const STYLE_EXT = new Set([".css", ".scss", ".less"]);

export interface WalkOptions {
  maxFiles: number;
  maxBytes: number;
}

export function walkSources(root: string, opts: WalkOptions): { files: string[]; skipped: number; truncated: boolean } {
  const files: string[] = [];
  let skipped = 0;
  let truncated = false;
  const visit = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (truncated) return;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name) && !e.name.startsWith(".")) visit(full);
        continue;
      }
      if (!e.isFile()) continue;
      const dot = e.name.lastIndexOf(".");
      const ext = dot < 0 ? "" : e.name.slice(dot).toLowerCase();
      if (!SOURCE_EXT.has(ext) || /\.min\.|\.d\.ts$|\.test\.|\.spec\./.test(e.name)) continue;
      let size = 0;
      try {
        size = statSync(full).size;
      } catch {
        continue;
      }
      if (size > opts.maxBytes) {
        skipped++;
        continue;
      }
      if (files.length >= opts.maxFiles) {
        truncated = true;
        return;
      }
      files.push(full);
    }
  };
  visit(root);
  return { files, skipped, truncated };
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
