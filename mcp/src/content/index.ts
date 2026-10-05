import { reactPractices } from "./react.js";
import { nextPractices } from "./nextjs.js";
import { invinsensePractices } from "./invinsense.js";
import type { Practice, Category } from "./types.js";

export type { Practice, Category };
export const practices: Practice[] = [...reactPractices, ...nextPractices, ...invinsensePractices];
export const categories: Category[] = ["invinsense", "react", "nextjs", "typescript", "performance", "accessibility", "security", "testing"];

export function getById(id: string): Practice | undefined {
  return practices.find((p) => p.id === id);
}

export function search(query: string, category?: Category): Practice[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const pool = category ? practices.filter((p) => p.category === category) : practices;
  return pool
    .map((p) => {
      const hay = {
        title: p.title.toLowerCase(),
        tags: p.tags.join(" ").toLowerCase(),
        body: [p.summary, ...p.do, ...p.dont].join(" ").toLowerCase(),
      };
      let score = 0;
      for (const t of terms) {
        if (hay.title.includes(t)) score += 5;
        if (hay.tags.includes(t)) score += 3;
        if (hay.body.includes(t)) score += 1;
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

export function toMarkdown(p: Practice): string {
  const lines = [`## ${p.title}`, `_${p.category} · \`${p.id}\`_`, "", p.summary, "", "**Do**", ...p.do.map((d) => `- ✅ ${d}`), "", "**Don't**", ...p.dont.map((d) => `- ❌ ${d}`)];
  if (p.good) lines.push("", "**Good**", "```tsx", p.good, "```");
  if (p.bad) lines.push("", "**Avoid**", "```tsx", p.bad, "```");
  return lines.join("\n");
}

export * from "./invinsense.js";
